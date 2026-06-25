import Anthropic from "@anthropic-ai/sdk";
import type { AnalyzeResult, Provider, ProviderPrompt, TokenUsage } from "../types.js";

const MODEL = "claude-opus-4-8";

/**
 * Anthropic-backed provider. Credentials resolve the SDK's normal way —
 * ANTHROPIC_API_KEY, ANTHROPIC_AUTH_TOKEN, or an `ant auth login` profile —
 * so the user brings their own key with no extra config.
 */
export class AnthropicProvider implements Provider {
  readonly name = "anthropic";
  private readonly client: Anthropic;

  constructor(client = new Anthropic()) {
    this.client = client;
  }

  async analyze(prompt: ProviderPrompt): Promise<AnalyzeResult> {
    const message = await this.client.messages.create({
      model: MODEL,
      // ponytail: 16K keeps us under the SDK's non-streaming HTTP timeout; switch
      // to .stream() if a huge skill corpus pushes the verdict past this.
      max_tokens: 16000,
      thinking: { type: "adaptive" },
      output_config: {
        effort: "high",
        ...(prompt.jsonSchema && { format: { type: "json_schema", schema: prompt.jsonSchema } }),
      },
      system: prompt.system,
      messages: [{ role: "user", content: prompt.user }],
    });
    return parseAnthropicResponse(message);
  }
}

/** Pure mapping from an SDK message to our AnalyzeResult — concatenates text
 * blocks (ignoring thinking) and normalizes usage. Split out so it's unit-testable
 * without hitting the network. */
export function parseAnthropicResponse(message: {
  content: Array<{ type: string; text?: string }>;
  usage?: { input_tokens?: number; output_tokens?: number };
}): AnalyzeResult {
  const text = message.content
    .filter((b) => b.type === "text" && typeof b.text === "string")
    .map((b) => b.text)
    .join("");
  const usage: TokenUsage = {
    inputTokens: message.usage?.input_tokens,
    outputTokens: message.usage?.output_tokens,
  };
  return { text, usage };
}
