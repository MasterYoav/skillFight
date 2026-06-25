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

/** Per-skill analysis. */
export interface SkillVerdict {
  name: string;
  /** Problem(s) the skill is trying to solve. */
  problems: string[];
  pros: string[];
  cons: string[];
  /** 1 (nice-to-have) .. 5 (critical) — importance to solving its problem. */
  importance: number;
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
