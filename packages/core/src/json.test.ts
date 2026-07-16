import { describe, expect, it } from "vitest";
import { coerceArray, describe as describeValue, extractJson } from "./json.js";

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

describe("coerceArray", () => {
  it("passes arrays through unchanged", () => {
    expect(coerceArray([1, 2])).toEqual([1, 2]);
  });
  it("treats null/undefined as empty (nothing to report)", () => {
    expect(coerceArray(null)).toEqual([]);
    expect(coerceArray(undefined)).toEqual([]);
  });
  it("wraps a bare object into a one-element array (a model dropped the [])", () => {
    expect(coerceArray({ a: 1 })).toEqual([{ a: 1 }]);
  });
  it("wraps a bare string into a one-element array", () => {
    expect(coerceArray("only one")).toEqual(["only one"]);
  });
  it("refuses to coerce a number or boolean — that's a genuine shape error", () => {
    expect(coerceArray(5)).toBeUndefined();
    expect(coerceArray(true)).toBeUndefined();
  });
});

describe("describe", () => {
  it("reports type and value for scalars", () => {
    expect(describeValue(5)).toBe("number (5)");
    expect(describeValue(true)).toBe("boolean (true)");
    expect(describeValue(undefined)).toBe("undefined");
  });
});
