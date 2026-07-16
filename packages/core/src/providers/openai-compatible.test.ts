import { describe, it, expect, vi } from "vitest";
import type OpenAI from "openai";
import { assertNonEmpty, parseOpenAIResponse, OpenAICompatibleProvider } from "./openai-compatible.js";
import { createProvider } from "./factory.js";
import type { ProviderPrompt } from "../types.js";

const PROMPT: ProviderPrompt = { system: "sys", user: "user", jsonSchema: { type: "object" } };

/** A fake OpenAI client whose chat.completions.create is scripted call-by-call,
 * so the retry-without-json-mode path can be driven deterministically without
 * a network call. */
function fakeClient(...responses: Array<{ content: string | null; finish_reason?: string }>): OpenAI {
  const create = vi.fn();
  for (const r of responses) {
    create.mockResolvedValueOnce({
      choices: [{ message: { content: r.content }, finish_reason: r.finish_reason ?? "stop" }],
      usage: { prompt_tokens: 10, completion_tokens: 5 },
    });
  }
  return { chat: { completions: { create } } } as unknown as OpenAI;
}

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

  it("falls back to reasoning_content when content is empty (DeepSeek-style local servers)", () => {
    const result = parseOpenAIResponse({
      choices: [{ message: { content: "", reasoning_content: '{"ok":true}' } }],
    });
    expect(result.text).toBe('{"ok":true}');
  });

  it("falls back to reasoning when content and reasoning_content are both empty (LM Studio/gpt-oss)", () => {
    const result = parseOpenAIResponse({
      choices: [{ message: { content: null, reasoning: '{"ok":true}' } }],
    });
    expect(result.text).toBe('{"ok":true}');
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

  it("passes when only reasoning_content has text", () => {
    expect(() =>
      assertNonEmpty({ choices: [{ message: { content: "", reasoning_content: '{"a":1}' } }] }, "local", "x"),
    ).not.toThrow();
  });

  it("gives a distinct message for finish_reason stop with truly nothing anywhere (gpt-oss on LM Studio)", () => {
    expect(() =>
      assertNonEmpty(
        { choices: [{ message: { content: "" }, finish_reason: "stop" }] },
        "local",
        "gpt-oss-20b-MXFP4-Q8",
      ),
    ).toThrow(/finish_reason: stop.*reasoning_content, and reasoning/s);
  });
});

describe("OpenAICompatibleProvider retry-without-json-mode", () => {
  it("retries without response_format when the first call comes back empty, and succeeds on the second", async () => {
    const client = fakeClient(
      { content: "", finish_reason: "stop" }, // json-mode attempt: nothing (the exact gpt-oss/LM Studio bug)
      { content: '{"skills":[],"conflicts":[],"recommendations":[]}' }, // plain-text retry: succeeds
    );
    const provider = new OpenAICompatibleProvider({ name: "local", model: "gpt-oss-20b-MXFP4-Q8" }, client);
    const result = await provider.analyze(PROMPT);
    expect(result.text).toBe('{"skills":[],"conflicts":[],"recommendations":[]}');

    const create = client.chat.completions.create as unknown as ReturnType<typeof vi.fn>;
    expect(create).toHaveBeenCalledTimes(2);
    expect(create.mock.calls[0][0].response_format).toEqual({ type: "json_object" });
    expect(create.mock.calls[1][0].response_format).toBeUndefined();
  });

  it("does not retry when the first call already returned content", async () => {
    const client = fakeClient({ content: '{"ok":true}' });
    const provider = new OpenAICompatibleProvider({ name: "local", model: "llama3.1" }, client);
    await provider.analyze(PROMPT);
    expect(client.chat.completions.create).toHaveBeenCalledTimes(1);
  });

  it("throws the real bug-report error when both the json-mode and plain-text attempts come back empty", async () => {
    const client = fakeClient(
      { content: "", finish_reason: "stop" },
      { content: "", finish_reason: "stop" },
    );
    const provider = new OpenAICompatibleProvider({ name: "local", model: "gpt-oss-20b-MXFP4-Q8" }, client);
    await expect(provider.analyze(PROMPT)).rejects.toThrow(/finish_reason: stop.*even after retrying without JSON mode/s);
    expect(client.chat.completions.create).toHaveBeenCalledTimes(2);
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
