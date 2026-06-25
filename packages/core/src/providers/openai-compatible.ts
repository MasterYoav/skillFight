import OpenAI from "openai";
import type { AnalyzeResult, Provider, ProviderPrompt, TokenUsage } from "../types.js";

export interface OpenAICompatOptions {
  /** Provider id for logs/UI, e.g. "openai" or "local". */
  name: string;
  /** Model id to request. */
  model: string;
  /** Override base URL — point at Ollama (http://localhost:11434/v1) etc. */
  baseURL?: string;
  /** API key; defaults to OPENAI_API_KEY. Local servers accept any non-empty value. */
  apiKey?: string;
}

/**
 * One provider for every OpenAI-compatible chat endpoint — OpenAI itself and
 * local servers (Ollama, LM Studio, MLX with an OpenAI shim). The schema is
 * carried in the prompt prose; we only ask for `json_object` here so it works
 * across servers that don't implement strict json_schema. Local servers may
 * report no usage — those fields stay undefined and the UI shows "n/a".
 */
export class OpenAICompatibleProvider implements Provider {
  readonly name: string;
  private readonly client: OpenAI;
  private readonly model: string;

  constructor(opts: OpenAICompatOptions) {
    this.name = opts.name;
    this.model = opts.model;
    this.client = new OpenAI({
      baseURL: opts.baseURL,
      // The SDK throws on an empty key at construction; fall back to a placeholder
      // so the real auth failure (401) surfaces at request time with a clear message.
      apiKey: opts.apiKey || process.env.OPENAI_API_KEY || "unset",
    });
  }

  async analyze(prompt: ProviderPrompt): Promise<AnalyzeResult> {
    const completion = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        { role: "system", content: prompt.system },
        { role: "user", content: prompt.user },
      ],
      ...(prompt.jsonSchema ? { response_format: { type: "json_object" } } : {}),
    });
    return parseOpenAIResponse(completion);
  }
}

/** Pure mapping from a chat completion to AnalyzeResult. Usage fields are left
 * undefined when the server doesn't report them (common for local models). */
export function parseOpenAIResponse(completion: {
  choices: Array<{ message?: { content?: string | null } }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number } | null;
}): AnalyzeResult {
  const text = completion.choices[0]?.message?.content ?? "";
  const usage: TokenUsage = {
    inputTokens: completion.usage?.prompt_tokens,
    outputTokens: completion.usage?.completion_tokens,
  };
  return { text, usage };
}
