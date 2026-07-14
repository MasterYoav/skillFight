import { loadSkills, parseSkillSource } from "./parser.js";
import { buildPrompt } from "./prompt.js";
import { extractJson } from "./json.js";
import type { Provider, Skill, Verdict } from "./types.js";

/** A skill uploaded as raw text (browser/API), not read from disk. */
export interface SkillSource {
  name?: string;
  content: string;
}

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

/** Parse raw uploaded sources into skills and analyze them. Skips sources whose
 * content isn't a skill (no frontmatter description). */
export async function analyzeSources(sources: SkillSource[], provider: Provider): Promise<Verdict> {
  const skills: Skill[] = [];
  for (const s of sources) {
    const skill = parseSkillSource(s.content, s.name ?? "skill.md");
    if (skill) skills.push(skill);
  }
  if (skills.length === 0) throw new Error("No valid skills in the upload (need frontmatter `description`).");
  return analyzeSkills(skills, provider);
}

/** Parse the model's JSON reply into a Verdict, with a shape check so a malformed
 * reply fails loudly here rather than corrupting the UI downstream. */
export function parseVerdict(text: string): Verdict {
  let raw: unknown;
  try {
    raw = extractJson(text);
  } catch {
    throw new Error(`Provider did not return valid JSON: ${text.slice(0, 200)}`);
  }
  const v = raw as Partial<Verdict>;
  if (!Array.isArray(v.skills) || !Array.isArray(v.conflicts) || !Array.isArray(v.recommendations)) {
    throw new Error("Verdict JSON is missing required arrays (skills, conflicts, recommendations).");
  }
  return { skills: v.skills, conflicts: v.conflicts, recommendations: v.recommendations };
}
