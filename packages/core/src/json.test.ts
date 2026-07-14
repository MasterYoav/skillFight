import { describe, expect, it } from "vitest";
import { extractJson } from "./json.js";

describe("extractJson", () => {
  it("parses plain JSON", () => {
    expect(extractJson('{"a":1}')).toEqual({ a: 1 });
  });

  it("strips ```json fences (local models)", () => {
    expect(extractJson('```json\n{"a":1}\n```')).toEqual({ a: 1 });
  });

  it("strips bare ``` fences", () => {
    expect(extractJson('```\n{"a":1}\n```')).toEqual({ a: 1 });
  });

  it("recovers JSON wrapped in prose", () => {
    expect(extractJson('Sure, here you go:\n{"a":1}\nHope that helps!')).toEqual({ a: 1 });
  });

  it("throws on genuinely non-JSON text", () => {
    expect(() => extractJson("not json at all")).toThrow();
  });
});
