import { describe, it, expect } from "vitest";
import { assertNonEmpty, parseOpenAIResponse } from "./openai-compatible.js";
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

describe("assertNonEmpty", () => {
  it("passes through non-empty content", () => {
    expect(() =>
      assertNonEmpty({ choices: [{ message: { content: "{}" } }] }, "local", "llama3.1"),
    ).not.toThrow();
  });

  it("throws with the finish_reason when a reasoning model burns its budget on thinking", () => {
    expect(() =>
      assertNonEmpty(
        { choices: [{ message: { content: "" }, finish_reason: "length" }] },
        "local",
        "gpt-oss-20b-MXFP4",
      ),
    ).toThrow(/finish_reason: length/);
  });

  it("throws on a missing message entirely", () => {
    expect(() => assertNonEmpty({ choices: [] }, "local", "llama3.1")).toThrow(/empty response/);
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
