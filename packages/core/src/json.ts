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
