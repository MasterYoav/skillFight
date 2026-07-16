import { loadSkills, parseSkillSource } from "./parser.js";
import { buildJudgePrompt, buildPrompt, buildRecallPrompt } from "./prompt.js";
import { coerceArray, describe, extractJson, toStr } from "./json.js";
import { ARCHETYPES, type Archetype, type Conflict, type MergedSkill, type MissedPair, type Provider, type Skill, type SkillVerdict, type TokenUsage, type Verdict } from "./types.js";

/** A skill uploaded as raw text (browser/API), not read from disk. */
export interface SkillSource {
  name?: string;
  content: string;
}

/** Run one analysis: build the prompt, call the provider, parse the verdict,
 * double-check the high-stakes calls, attach token usage. */
export async function analyzeSkills(skills: Skill[], provider: Provider): Promise<Verdict> {
  if (skills.length === 0) throw new Error("No skills to analyze.");
  const { text, usage } = await provider.analyze(buildPrompt(skills));
  const verdict = parseVerdict(text);
  verdict.conflicts = verifyConflicts(verdict.conflicts, skills);
  const judged = await judgeConflicts(verdict.conflicts, skills, provider);
  verdict.conflicts = judged.conflicts;
  const missedUsage = await recallMissed(verdict, skills, provider);
  verdict.usage = {
    inputTokens: (usage.inputTokens ?? 0) + (judged.usage.inputTokens ?? 0) + (missedUsage.inputTokens ?? 0) || undefined,
    outputTokens: (usage.outputTokens ?? 0) + (judged.usage.outputTokens ?? 0) + (missedUsage.outputTokens ?? 0) || undefined,
  };
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
  const v = raw as Record<string, unknown>;
  // Local models often drift from "always an array" (a bare object instead of
  // a one-element array, `null` for "nothing to report") without getting the
  // field name wrong — coerce those instead of hard-failing on them.
  const skills = coerceArray(v.skills);
  const conflicts = coerceArray(v.conflicts);
  const recommendations = coerceArray(v.recommendations);
  if (!skills || !conflicts || !recommendations) {
    const bad = [
      !skills && `skills (got ${describe(v.skills)})`,
      !conflicts && `conflicts (got ${describe(v.conflicts)})`,
      !recommendations && `recommendations (got ${describe(v.recommendations)})`,
    ].filter(Boolean);
    throw new Error(`Verdict JSON has the wrong shape for: ${bad.join(", ")}. Model reply: ${text.slice(0, 400)}`);
  }
  return {
    skills: skills.map(sanitizeSkillVerdict),
    conflicts: conflicts.map(sanitizeConflict),
    recommendations: recommendations.map((r) => toStr(r)),
  };
}

function sanitizeSkillVerdict(raw: unknown): SkillVerdict {
  const r = (raw ?? {}) as Record<string, unknown>;
  const archetype = ARCHETYPES.includes(r.archetype as Archetype) ? (r.archetype as Archetype) : undefined;
  return {
    name: toStr(r.name),
    problems: (coerceArray(r.problems) ?? []).map((p) => toStr(p)),
    pros: (coerceArray(r.pros) ?? []).map((p) => toStr(p)),
    cons: (coerceArray(r.cons) ?? []).map((p) => toStr(p)),
    importance: Math.max(1, Math.min(5, Math.round(Number(r.importance)) || 3)),
    archetype,
    stats: (coerceArray(r.stats) ?? []).slice(0, 3).map((s) => {
      const so = (s ?? {}) as Record<string, unknown>;
      return { name: toStr(so.name), score: Math.max(0, Math.min(100, Math.round(Number(so.score)) || 0)) };
    }),
  };
}

const VERDICT_KINDS = ["winner", "merge", "coexist"] as const;

function sanitizeConflict(raw: unknown): Conflict {
  const r = (raw ?? {}) as Record<string, unknown>;
  const verdict = (VERDICT_KINDS as readonly string[]).includes(r.verdict as string)
    ? (r.verdict as Conflict["verdict"])
    : "coexist";
  return {
    members: (coerceArray(r.members) ?? []).map((m) => toStr(m)),
    verdict,
    winner: typeof r.winner === "string" ? r.winner : undefined,
    rationale: toStr(r.rationale),
    citations: (coerceArray(r.citations) ?? []).map((c) => toStr(c)),
    merged: sanitizeMerged(r.merged),
  };
}

function sanitizeMerged(raw: unknown): MergedSkill | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const r = raw as Record<string, unknown>;
  if (!r.name || !r.description || !r.body) return undefined; // an incomplete merge isn't installable — drop it
  return { name: toStr(r.name), description: toStr(r.description), body: toStr(r.body) };
}

function normalize(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

/** Deterministic, zero-cost check on the model's conflicts — no extra model
 * call. Flags a citation that doesn't actually appear in the skills it cites
 * (hallucinated evidence). Vocabulary overlap is deliberately NOT checked: a
 * genuine semantic conflict can share no words at all, so a lexical "these
 * barely overlap" heuristic would wrongly flag exactly the conflicts the
 * semantic recall pass exists to find. The blind judge pass confirms whether a
 * conflict is real far better than word-counting could. */
function verifyConflicts(conflicts: Conflict[], skills: Skill[]): Conflict[] {
  const bySkill = new Map(skills.map((s) => [s.name, normalize(`${s.description} ${s.body}`)]));
  return conflicts.map((c) => {
    const sourceText = c.members.map((m) => bySkill.get(m) ?? "").join(" ");
    const flags: string[] = [];
    for (const cit of c.citations) {
      const needle = normalize(cit);
      if (needle.length > 0 && !sourceText.includes(needle)) {
        flags.push(`citation not found in the cited skills' text: "${cit}"`);
      }
    }
    return flags.length > 0 ? { ...c, flags } : c;
  });
}

/** For every "winner"/"merge" call (the ones with a real stake — "coexist"
 * makes no comparative claim to double-check), ask a second, independent pass
 * to re-judge from scratch using only those skills' own text — blind to what
 * the first pass decided. Cheap relative to a full re-analysis: one small
 * two-skill call per flagged conflict, not the whole roster again. When the
 * second opinion disagrees, it wins — it's a focused specialist on exactly
 * this pairwise call, undistracted by the rest of the roster — and if it finds
 * "merge" is the better outcome it writes the merged skill itself, so a
 * verified-better merge actually gets produced instead of just flagged. */
async function judgeConflicts(
  conflicts: Conflict[],
  skills: Skill[],
  provider: Provider,
): Promise<{ conflicts: Conflict[]; usage: TokenUsage }> {
  const bySkill = new Map(skills.map((s) => [s.name, s]));
  let inputTokens = 0;
  let outputTokens = 0;
  const judged = await Promise.all(
    conflicts.map(async (c) => {
      if (c.verdict === "coexist") return c;
      const members = c.members.map((m) => bySkill.get(m)).filter((s): s is Skill => s !== undefined);
      if (members.length < 2) return c;
      let second: Conflict;
      try {
        const { text, usage } = await provider.analyze(buildJudgePrompt(members));
        inputTokens += usage.inputTokens ?? 0;
        outputTokens += usage.outputTokens ?? 0;
        second = sanitizeConflict(extractJson(text));
      } catch {
        return c; // second opinion failed (e.g. a local model hiccup) — keep the first call, unflagged
      }
      if (second.verdict === c.verdict && second.winner === c.winner) return c; // confirmed
      const note = `second opinion (reviewing just these skills, blind to the first verdict) says "${second.verdict}"` +
        `${second.winner ? ` — ${second.winner}` : ""}: ${second.rationale}`;
      return { ...second, members: c.members, flags: [...(c.flags ?? []), note] };
    }),
  );
  return { conflicts: judged, usage: { inputTokens: inputTokens || undefined, outputTokens: outputTokens || undefined } };
}

interface RecallCandidate {
  a: Skill;
  b: Skill;
  confidence: number;
}

/** Parse the recall pass's reply into validated candidate pairs: two real,
 * distinct roster skills, not already grouped, not duplicated, confidence
 * clamped to 0..1. Sorted most-confident first. Tolerates junk — a bad reply
 * yields no candidates rather than throwing. */
function parseRecallPairs(text: string, bySkill: Map<string, Skill>, covered: Set<string>): RecallCandidate[] {
  let raw: unknown;
  try {
    raw = extractJson(text);
  } catch {
    return [];
  }
  const pairs = coerceArray((raw as Record<string, unknown>)?.pairs) ?? [];
  const seen = new Set<string>();
  const out: RecallCandidate[] = [];
  for (const p of pairs) {
    const po = (p ?? {}) as Record<string, unknown>;
    const members = (coerceArray(po.members) ?? []).map((m) => toStr(m));
    const a = bySkill.get(members[0]);
    const b = bySkill.get(members[1]);
    if (!a || !b || a.name === b.name) continue; // must name two real, distinct skills
    const key = [a.name, b.name].sort().join(" ");
    if (covered.has(key) || seen.has(key)) continue; // already grouped, or a duplicate hit
    const confidence = Math.min(1, Math.max(0, Number(po.confidence)));
    if (!Number.isFinite(confidence)) continue;
    seen.add(key);
    out.push({ a, b, confidence });
  }
  return out.sort((x, y) => y.confidence - x.confidence);
}

/** Recall net for what the first pass never grouped. Instead of lexical word
 * overlap, one semantic recall call reasons over every description by MEANING
 * to surface pairs that compete for the same requests even when they share no
 * vocabulary. High-confidence hits are confirmed with a blind per-pair judge
 * call (a "coexist" reply clears the pair; "winner"/"merge" promotes it into
 * `verdict.conflicts` flagged as recall-surfaced); lower-confidence hits are
 * recorded as soft `missed` nudges. One recall call + a capped number of judge
 * calls — the whole roster is reasoned over once, not re-analyzed per pair.
 * Mutates `verdict`; returns the token usage it spent. Best-effort: any failure
 * leaves the verdict as-is. */
async function recallMissed(verdict: Verdict, skills: Skill[], provider: Provider): Promise<TokenUsage> {
  if (skills.length < 2) return {};

  const covered = new Set<string>();
  for (const c of verdict.conflicts) {
    for (let i = 0; i < c.members.length; i++) {
      for (let j = i + 1; j < c.members.length; j++) {
        covered.add([c.members[i], c.members[j]].sort().join(" "));
      }
    }
  }
  const totalPairs = (skills.length * (skills.length - 1)) / 2;
  if (covered.size >= totalPairs) return {}; // every pair already grouped — nothing left to recall

  const bySkill = new Map(skills.map((s) => [s.name, s]));
  let inputTokens = 0;
  let outputTokens = 0;
  let candidates: RecallCandidate[];
  try {
    const grouped = [...covered].map((k) => k.split(" "));
    const { text, usage } = await provider.analyze(buildRecallPrompt(skills, grouped));
    inputTokens += usage.inputTokens ?? 0;
    outputTokens += usage.outputTokens ?? 0;
    candidates = parseRecallPairs(text, bySkill, covered);
  } catch {
    return {}; // a failed recall pass never blocks the verdict
  }

  // ponytail: confidence knobs — HIGH earns a paid judge confirmation, LOW earns
  // a free nudge, MAX_ESCALATIONS caps spend per run.
  const HIGH = 0.5;
  const LOW = 0.3;
  const MAX_ESCALATIONS = 6;

  let escalations = 0;
  const missed: MissedPair[] = [];
  for (const { a, b, confidence } of candidates) {
    if (confidence >= HIGH && escalations < MAX_ESCALATIONS) {
      escalations++;
      try {
        const { text, usage } = await provider.analyze(buildJudgePrompt([a, b]));
        inputTokens += usage.inputTokens ?? 0;
        outputTokens += usage.outputTokens ?? 0;
        const judged = sanitizeConflict(extractJson(text));
        if (judged.verdict === "winner" || judged.verdict === "merge") {
          const flag = `surfaced by recall — the first pass didn't group these; a closer look calls it "${judged.verdict}"`;
          verdict.conflicts.push({ ...judged, members: [a.name, b.name], flags: [flag, ...(judged.flags ?? [])] });
        }
        // "coexist": checked and cleared — drop it, don't nudge.
      } catch {
        // A failed escalation call skips this pair safely.
      }
    } else if (confidence >= LOW) {
      missed.push({ members: [a.name, b.name], overlap: Math.round(confidence * 100) / 100 });
    }
  }
  if (missed.length > 0) verdict.missed = missed;
  return { inputTokens: inputTokens || undefined, outputTokens: outputTokens || undefined };
}
