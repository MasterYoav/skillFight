/**
 * The shared data model. The engine produces a `Verdict`; the TUI and web app
 * are thin renderers over it. Keep this file the single source of truth — both
 * skins import these types.
 */

/** A parsed Claude skill. The `description` is the conflict surface: two skills
 * "fight" when their trigger semantics overlap. */
export interface Skill {
  /** Skill name, from frontmatter `name` or derived from the file/folder. */
  name: string;
  /** Frontmatter `description` — what tells Claude when to fire the skill. */
  description: string;
  /** Frontmatter `allowed-tools`, normalized to a list if present. */
  allowedTools?: string[];
  /** Markdown body below the frontmatter. Untrusted input. */
  body: string;
  /** Absolute path the skill was loaded from. */
  path: string;
}

/** What kind of work a skill does — the model classifies each skill into one of
 * these during analysis. Drives the avatar/class in the UIs. */
export const ARCHETYPES = [
  "blade", // direct action / execution
  "mage", // content generation / creative
  "guardian", // review / safety / validation
  "scout", // search / research / discovery
  "engineer", // build / code / tooling
  "oracle", // data / analysis / insight
  "courier", // communication / integration
  "warden", // files / documents / organization
] as const;
export type Archetype = (typeof ARCHETYPES)[number];

/** Per-skill analysis. */
export interface SkillVerdict {
  name: string;
  /** Problem(s) the skill is trying to solve. */
  problems: string[];
  pros: string[];
  cons: string[];
  /** 1 (nice-to-have) .. 5 (critical) — importance to solving its problem. */
  importance: number;
  /** The skill's classified kind. Optional so verdicts from older runs still load. */
  archetype?: Archetype;
  /** Three domain-fitting stats the model names and scores 0–100 — e.g. a UI
   * skill might get Style/Clarity, a security skill Defence/Coverage. Optional
   * so verdicts from older runs still load. */
  stats?: SkillStat[];
}

/** One named, scored trait of a skill. */
export interface SkillStat {
  /** Short name fitting the skill's domain, e.g. "Style", "Defence". */
  name: string;
  /** 0 (absent) .. 100 (exceptional). */
  score: number;
}

/** A cluster of overlapping skills and the recommended resolution. */
export interface Conflict {
  /** Names of the skills in this cluster (>= 2). */
  members: string[];
  /** "winner": one dominates; "merge": fold into one; "coexist": no real conflict. */
  verdict: "winner" | "merge" | "coexist";
  /** Set when verdict === "winner": the surviving skill's name. */
  winner?: string;
  rationale: string;
  /** Quotes from the skills' descriptions/bodies backing the rationale. */
  citations: string[];
  /** Set when verdict === "merge": the model-written replacement skill,
   * ready to be saved as a .md file in place of the members. */
  merged?: MergedSkill;
  /** Deterministic, zero-cost sanity checks run after parsing (no model call):
   * a citation that doesn't appear in the skills it cites, or a "winner"/"merge"
   * call between skills whose descriptions share almost no vocabulary. Absent
   * when nothing looked off. */
  flags?: string[];
}

/** The fusion of two or more merged skills — a complete skill the user can
 * download and install as a replacement. */
export interface MergedSkill {
  /** kebab-case skill name. */
  name: string;
  /** Trigger description covering all members' triggers. */
  description: string;
  /** Markdown body combining the members' instructions. */
  body: string;
}

/** A skill pair the semantic recall pass judged to compete for the same
 * requests, that the first analysis never grouped into a conflict. */
export interface MissedPair {
  /** The two skill names the recall pass paired. */
  members: string[];
  /** 0..1 confidence the pair truly overlaps in meaning — hint strength. */
  overlap: number;
}

/** Token usage for a run. Fields are optional — local models may report none. */
export interface TokenUsage {
  inputTokens?: number;
  outputTokens?: number;
}

/** The complete output of one analysis run. */
export interface Verdict {
  skills: SkillVerdict[];
  conflicts: Conflict[];
  recommendations: string[];
  /** Skill pairs a semantic recall pass judged to compete for the same requests
   * but the model's first analysis never placed in any conflict — a soft "did
   * it miss this?" nudge. High-confidence pairs are escalated to a judge call
   * and, if confirmed, promoted into `conflicts` instead of appearing here. */
  missed?: MissedPair[];
  usage?: TokenUsage;
}

/** How well one skill matches one task. `score` is the model's 0–100 confidence
 * that this skill should fire for the task. */
export interface TaskCandidate {
  skill: string;
  score: number;
  reason: string;
}

/** One task routed against the skill roster: which skills would fire, and how
 * confidently. `best`/`contested` are derived by the engine from `candidates`. */
export interface TaskMatch {
  task: string;
  /** Candidates the model scored, sorted best-first. */
  candidates: TaskCandidate[];
  /** Top skill above the fire threshold, or null when nothing matches (a gap). */
  best: string | null;
  /** true when 2+ skills clear the threshold — an ambiguous trigger (a fight). */
  contested: boolean;
}

/** The output of one routing run: does each task reach the right skill? */
export interface RoutingReport {
  matches: TaskMatch[];
  /** Tasks no skill covered — coverage gaps in the library. */
  gaps: string[];
  usage?: TokenUsage;
}

/** What the engine hands a provider: a system instruction, the user payload,
 * and an optional JSON schema the output must conform to. */
export interface ProviderPrompt {
  system: string;
  user: string;
  /** When set, the provider constrains output to this JSON schema. */
  jsonSchema?: Record<string, unknown>;
}

/** A provider's reply: raw text plus whatever usage it reported. */
export interface AnalyzeResult {
  text: string;
  usage: TokenUsage;
}

/** A model backend. One method: run the prompt, return text + usage.
 * Anthropic / OpenAI / local each implement this. */
export interface Provider {
  /** Stable id for logs and the UI, e.g. "anthropic". */
  readonly name: string;
  analyze(prompt: ProviderPrompt): Promise<AnalyzeResult>;
}
