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
 * Default provider is SKILLFIGHT_PROVIDER, else "anthropic".
 */
export function createProvider(
  name: ProviderName = (process.env.SKILLFIGHT_PROVIDER as ProviderName) || "anthropic",
): Provider {
  switch (name) {
    case "anthropic":
      return new AnthropicProvider();
    case "openai":
      return new OpenAICompatibleProvider({ name: "openai", model: process.env.OPENAI_MODEL || "gpt-4o" });
    case "local": {
      const host = process.env.OLLAMA_HOST || "http://localhost:11434";
      return new OpenAICompatibleProvider({
        name: "local",
        model: process.env.OLLAMA_MODEL || "llama3.1",
        baseURL: `${host}/v1`,
        apiKey: "ollama", // local servers ignore the value but the SDK requires one
      });
    }
    default:
      throw new Error(`Unknown provider: ${name}. Use anthropic | openai | local.`);
  }
}
