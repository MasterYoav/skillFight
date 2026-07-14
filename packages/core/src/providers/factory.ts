import type { Provider } from "../types.js";
import { AnthropicProvider } from "./anthropic.js";
import { OpenAICompatibleProvider } from "./openai-compatible.js";

export type ProviderName = "anthropic" | "openai" | "local";

/**
 * Build a provider by name. Model and connection details come from env so the
 * user runs against their own setup:
 *   anthropic — ANTHROPIC_API_KEY / `ant auth login`
 *   openai    — OPENAI_API_KEY, OPENAI_MODEL (default gpt-4o)
 *   local     — OLLAMA_HOST (default http://localhost:11434), OLLAMA_MODEL (default llama3.1)
 *              Pass baseURL to target a specific local runtime (oMLX, LM Studio, Ollama).
 * Default provider is SKILLFIGHT_PROVIDER, else "anthropic".
 */
export function createProvider(
  name: ProviderName = (process.env.SKILLFIGHT_PROVIDER as ProviderName) || "anthropic",
  model?: string,
  baseURL?: string, // full OpenAI-compatible base, e.g. http://127.0.0.1:8000/v1
  effort?: string, // anthropic: low..max via output_config; openai: reasoning_effort
): Provider {
  switch (name) {
    case "anthropic":
      return new AnthropicProvider({ model, effort });
    case "openai":
      return new OpenAICompatibleProvider({ name: "openai", model: model || process.env.OPENAI_MODEL || "gpt-4o", effort });
    case "local": {
      const url = baseURL || `${process.env.OLLAMA_HOST || "http://localhost:11434"}/v1`;
      // LOCAL_API_KEY: set this for servers that validate the key (oMLX, secured LM Studio).
      // Ollama ignores any value, so this is safe to set globally.
      const apiKey = process.env.LOCAL_API_KEY || "ollama";
      return new OpenAICompatibleProvider({
        name: "local",
        model: model || process.env.OLLAMA_MODEL || "llama3.1",
        baseURL: url,
        apiKey,
        // local reasoning models (gpt-oss, deepseek-r1, ...) can burn tens of
        // thousands of tokens on hidden thinking before answering
        maxTokens: 48000,
      });
    }
    default:
      throw new Error(`Unknown provider: ${name}. Use anthropic | openai | local.`);
  }
}
