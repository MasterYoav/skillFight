import type { Archetype, SkillStat, SkillVerdict, Verdict } from "@skillfight/core";
import type { RawSkill } from "./readSkill.js";

export type WarriorStatus = "alive" | "won" | "lost" | "merged";

/** A warrior on the roster. Class, level, and stats are UNKNOWN until the model
 * has analyzed the skill — a fresh summon is an unhatched egg; the arena fight
 * appraises it. Only the color is pre-assigned (visual identity, not a metric). */
export interface Warrior {
  name: string;
  color: string;
  creed: string;
  tools: number;
  status: WarriorStatus;
  /** Present only after analysis. */
  appraisal?: {
    archetype: Archetype;
    weapon: string;
    level: number; // importance 1–5
    /** Domain-fitting traits the model named and scored (0–100), e.g.
     * Style for a UI skill, Defence for a security skill. */
    stats: SkillStat[];
  };
}

export const WEAPONS: Record<Archetype, string> = {
  blade: "⚔",
  mage: "✦",
  guardian: "▣",
  scout: "➹",
  engineer: "⚙",
  oracle: "☾",
  courier: "➶",
  warden: "♆",
};

/** One color per class — after the analysis, a warrior wears its class color,
 * so color carries meaning (two guardians look like guardians). */
export const ARCH_COLORS: Record<Archetype, string> = {
  blade: "#ff5c6a",
  mage: "#d65cff",
  guardian: "#e8c84a",
  scout: "#58e06a",
  engineer: "#ff9f43",
  oracle: "#a78bfa",
  courier: "#4ad6e8",
  warden: "#7c9eff",
};

const PALETTES = ["#58e06a", "#4ad6e8", "#d65cff", "#e8c84a", "#ff7a59", "#7c8cff", "#ff5c8a", "#5ce8c8"];

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Build a warrior from a skill. Stats exist only when the analysis provided
 * them — everything is derived from the model's appraisal, nothing is faked. */
export function makeWarrior(raw: RawSkill, sv?: SkillVerdict, status: WarriorStatus = "alive"): Warrior {
  const tools = raw.allowedTools?.length ?? 0;
  const w: Warrior = {
    name: raw.name,
    color: PALETTES[hash(raw.name + "|" + raw.description) % PALETTES.length],
    creed: raw.description,
    tools,
    status,
  };
  if (sv) {
    const archetype: Archetype = sv.archetype && sv.archetype in WEAPONS ? sv.archetype : "blade";
    w.color = ARCH_COLORS[archetype];
    w.appraisal = {
      archetype,
      weapon: WEAPONS[archetype],
      level: Math.max(1, Math.min(5, sv.importance)),
      stats: (sv.stats ?? [])
        .slice(0, 3)
        .map((s) => ({ name: s.name, score: Math.max(0, Math.min(100, Math.round(s.score))) })),
    };
  }
  return w;
}

/** Where did this skill end up in the fight? */
export function statusFor(name: string, verdict: Verdict | null): WarriorStatus {
  if (!verdict) return "alive";
  for (const c of verdict.conflicts) {
    if (!c.members.includes(name)) continue;
    if (c.verdict === "merge") return "merged";
    if (c.verdict === "winner") return c.winner === name ? "won" : "lost";
  }
  return "alive"; // coexist or unconflicted
}
