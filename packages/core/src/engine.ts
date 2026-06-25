import { loadSkills } from "./parser.js";
import { buildPrompt } from "./prompt.js";
import type { Provider, Skill, Verdict } from "./types.js";

/** Run one analysis: build the prompt, call the provider, parse the verdict,
 * attach the provider's token usage. */
export async function analyzeSkills(skills: Skill[], provider: Provider): Promise<Verdict> {
  if (skills.length === 0) throw new Error("No skills to analyze.");
  const { text, usage } = await provider.analyze(buildPrompt(skills));
  const verdict = parseVerdict(text);
  verdict.usage = usage;
  return verdict;
}

/** Load skills from a path and analyze them in one call. */
export async function analyzePath(path: string, provider: Provider): Promise<Verdict> {
  const skills = loadSkills(path);
  if (skills.length === 0) throw new Error(`No skills found at ${path}.`);
  return analyzeSkills(skills, provider);
}

/** Parse the model's JSON reply into a Verdict, with a shape check so a malformed
 * reply fails loudly here rather than corrupting the UI downstream. */
export function parseVerdict(text: string): Verdict {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error(`Provider did not return valid JSON: ${text.slice(0, 200)}`);
  }
  const v = raw as Partial<Verdict>;
  if (!Array.isArray(v.skills) || !Array.isArray(v.conflicts) || !Array.isArray(v.recommendations)) {
    throw new Error("Verdict JSON is missing required arrays (skills, conflicts, recommendations).");
  }
  return { skills: v.skills, conflicts: v.conflicts, recommendations: v.recommendations };
}
