/** Best-effort JSON extraction from a model reply. Cloud providers with a JSON
 * schema return raw JSON; many local models (Ollama, LM Studio) ignore
 * `response_format` and wrap the object in ```json fences or add prose before/
 * after it. Strip fences, then fall back to the outermost {...} span. */
export function extractJson(text: string): unknown {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    // fall through to fence/brace recovery
  }

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenced) {
    try {
      return JSON.parse(fenced[1]);
    } catch {
      // fall through
    }
  }

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start !== -1 && end > start) {
    return JSON.parse(trimmed.slice(start, end + 1)); // throws if still malformed
  }

  throw new SyntaxError("no JSON object found");
}

/** Local models frequently drift from a strict "always an array" schema even
 * when they get the field name right: a single skill/conflict as a bare
 * object instead of a one-element array, `null`/omitted for "nothing here"
 * instead of `[]`. Coerce those near-misses instead of hard-failing on them;
 * return `undefined` only when the value genuinely isn't array-shaped (e.g. a
 * number or a boolean), so the caller can still report a real error. */
export function coerceArray(value: unknown): unknown[] | undefined {
  if (Array.isArray(value)) return value;
  if (value == null) return [];
  if (typeof value === "object" || typeof value === "string") return [value];
  return undefined;
}

/** A short, human-readable description of a value for error messages —
 * "number (42)", "boolean (true)", not a raw JSON dump. */
export function describe(value: unknown): string {
  if (value === undefined) return "undefined";
  const type = typeof value;
  if (type === "object" || type === "string") return type; // already handled by coerceArray; shouldn't reach here
  return `${type} (${JSON.stringify(value)})`;
}

/** Force a value that's supposed to be display text into an actual string.
 * Model output is untrusted: a schema field typed as `string` can arrive as
 * an object, a number, or `null` when a weaker/unconstrained local model
 * drifts from the schema. React throws — and blanks the whole page, since
 * there's no error boundary — if a non-string ever reaches a JSX child, so
 * every leaf field the UI renders directly must be coerced here before it
 * leaves core, not trusted at the type level. */
export function toStr(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value;
  if (value == null) return fallback;
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}
