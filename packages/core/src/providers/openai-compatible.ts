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
  /** OpenAI reasoning_effort (minimal | low | medium | high) — only sent when set. */
  effort?: string;
  /** Output token cap. Real OpenAI models reject anything past their own ceiling
   * (~16K on gpt-4o), so keep that default for "openai"; local runtimes have no
   * such limit and reasoning models (gpt-oss, deepseek-r1, o-series-alikes) can
   * burn tens of thousands of tokens on hidden thinking before answering — give
   * "local" much more room. */
  maxTokens?: number;
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
  private readonly effort?: string;
  private readonly maxTokens: number;

  constructor(opts: OpenAICompatOptions) {
    this.name = opts.name;
    this.model = opts.model;
    this.effort = opts.effort;
    this.maxTokens = opts.maxTokens ?? 16000;
    this.client = new OpenAI({
      baseURL: opts.baseURL,
      // The SDK throws on an empty key at construction; fall back to a placeholder
      // so the real auth failure (401) surfaces at request time with a clear message.
      apiKey: opts.apiKey || process.env.OPENAI_API_KEY || "unset",
    });
  }

  async analyze(prompt: ProviderPrompt): Promise<AnalyzeResult> {
    // Without an explicit cap, many local runtimes (Ollama's OpenAI shim
    // especially) default to a small output length and silently truncate the
    // verdict JSON mid-object. o-series/gpt-5 reject `max_tokens` in favor of
    // `max_completion_tokens` — pick the field the model actually accepts.
    const isReasoningModel = /^(o\d|gpt-5)/.test(this.model);
    const completion = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        { role: "system", content: prompt.system },
        { role: "user", content: prompt.user },
      ],
      ...(isReasoningModel ? { max_completion_tokens: this.maxTokens } : { max_tokens: this.maxTokens }),
      ...(prompt.jsonSchema ? { response_format: { type: "json_object" } } : {}),
      ...(this.effort ? { reasoning_effort: this.effort as "low" | "medium" | "high" } : {}),
    });
    assertNonEmpty(completion, this.name, this.model);
    return parseOpenAIResponse(completion);
  }
}

/** A reasoning model can spend its entire output budget on hidden thinking and
 * never emit a final answer — that's an empty response, not bad JSON. Fail
 * here with the reason so it doesn't surface downstream as a confusing
 * "valid JSON: <nothing>". */
export function assertNonEmpty(
  completion: { choices: Array<{ message?: { content?: string | null }; finish_reason?: string | null }> },
  providerName: string,
  model: string,
): void {
  const choice = completion.choices[0];
  if (choice?.message?.content?.trim()) return;
  const reason = choice?.finish_reason ? ` (finish_reason: ${choice.finish_reason})` : "";
  throw new Error(
    `${providerName} model "${model}" returned an empty response${reason}. ` +
      `Reasoning models can exhaust their output budget on hidden thinking before answering — ` +
      `try a non-reasoning model, or a build/setting with more output headroom.`,
  );
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
