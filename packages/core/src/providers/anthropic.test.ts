import { describe, it, expect } from "vitest";
import { parseAnthropicResponse } from "./anthropic.js";

describe("parseAnthropicResponse", () => {
  it("joins text blocks, skips thinking, and maps usage", () => {
    const result = parseAnthropicResponse({
      content: [
        { type: "thinking", text: "internal reasoning" },
        { type: "text", text: '{"ok":' },
        { type: "text", text: "true}" },
      ],
      usage: { input_tokens: 120, output_tokens: 45 },
    });
    expect(result.text).toBe('{"ok":true}');
    expect(result.usage).toEqual({ inputTokens: 120, outputTokens: 45 });
  });

  it("tolerates missing usage", () => {
    const result = parseAnthropicResponse({ content: [{ type: "text", text: "hi" }] });
    expect(result.text).toBe("hi");
    expect(result.usage).toEqual({ inputTokens: undefined, outputTokens: undefined });
  });
});
