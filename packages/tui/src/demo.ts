import type { Verdict } from "@skillfight/core";

/** Sample verdict for `--demo` — lets you see the arena without a key or API call. */
export const DEMO_VERDICT: Verdict = {
  skills: [
    { name: "git-helper", problems: ["git commit/branch workflows"], importance: 4,
      pros: ["clear trigger description", "branches before committing on main"],
      cons: ["overlaps git-commit"] },
    { name: "git-commit", problems: ["making git commits"], importance: 2,
      pros: ["simple"], cons: ["narrow", "subsumed by git-helper"] },
    { name: "pdf-extract", problems: ["pull text from PDFs"], importance: 5,
      pros: ["no overlap with anything", "well-scoped"], cons: [] },
  ],
  conflicts: [
    { members: ["git-helper", "git-commit"], verdict: "winner", winner: "git-helper",
      rationale: "git-helper covers committing plus branching; git-commit is a strict subset.",
      citations: ["git-helper: 'stage, commit, branch'", "git-commit: 'making git commits'"] },
  ],
  recommendations: [
    "Remove git-commit — git-helper already covers it.",
    "Keep pdf-extract; it solves a distinct problem with no rivals.",
  ],
  usage: { inputTokens: 1420, outputTokens: 890 },
};
