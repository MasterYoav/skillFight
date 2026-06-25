import { describe, it, expect } from "vitest";
import { parseOpenAIResponse } from "./openai-compatible.js";
import { createProvider } from "./factory.js";

describe("parseOpenAIResponse", () => {
  it("reads content and maps usage", () => {
    const result = parseOpenAIResponse({
      choices: [{ message: { content: '{"ok":true}' } }],
      usage: { prompt_tokens: 50, completion_tokens: 30 },
    });
    expect(result.text).toBe('{"ok":true}');
    expect(result.usage).toEqual({ inputTokens: 50, outputTokens: 30 });
  });

  it("leaves usage undefined when the server reports none (local models)", () => {
    const result = parseOpenAIResponse({ choices: [{ message: { content: "{}" } }], usage: null });
    expect(result.text).toBe("{}");
    expect(result.usage).toEqual({ inputTokens: undefined, outputTokens: undefined });
  });
});

describe("createProvider", () => {
  it("dispatches by name", () => {
    expect(createProvider("anthropic").name).toBe("anthropic");
    expect(createProvider("openai").name).toBe("openai");
    expect(createProvider("local").name).toBe("local");
  });

  it("throws on an unknown provider", () => {
    // @ts-expect-error — exercising the runtime guard with a bad name
    expect(() => createProvider("gemini")).toThrow(/Unknown provider/);
  });
});
