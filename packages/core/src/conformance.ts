import { buildPrompt } from "./prompt.js";
import { parseVerdict } from "./engine.js";
import { buildRoutingPrompt, parseRouting } from "./routing.js";
import type { Provider, Skill } from "./types.js";

export interface ConformanceStep {
  name: string;
  ok: boolean;
  /** Short summary on success; the full error message on failure. */
  detail: string;
  ms: number;
}

export interface ConformanceReport {
  provider: string;
  ok: boolean;
  steps: ConformanceStep[];
}

/** Fixed, minimal skill set every check runs against — small enough to be
 * fast and cheap, real enough to exercise archetype/stat classification and
 * conflict detection the same way a real roster would. */
const SAMPLE_SKILLS: Skill[] = [
  {
    name: "git-commit",
    description: "Use this when the user wants to commit staged changes to git.",
    body: "Stage and commit with a clear message. Never force-push.",
    path: "git-commit.md",
  },
  {
    name: "pdf-extract",
    description: "Use this when the user needs to pull text or tables out of a PDF file.",
    body: "Use a PDF library to read pages and extract text or tabular data.",
    path: "pdf-extract.md",
  },
];

const SAMPLE_TASKS = ["commit my staged changes", "extract the tables from this PDF", "book me a flight to Tokyo"];

/**
 * Exercises a Provider against the exact prompts skillfight sends in
 * production — the arena verdict and the trials routing report — end to end:
 * real network call, real JSON parse, real shape check. Point it at any
 * configured provider (including a live local server) to get a concrete
 * pass/fail report instead of a single opaque UI error.
 *
 * Usage: `pnpm --filter @skillfight/core diagnose local llama3.1 http://localhost:11434/v1`
 */
export class ProviderConformanceTest {
  constructor(private readonly provider: Provider) {}

  async run(): Promise<ConformanceReport> {
    const steps: ConformanceStep[] = [
      await this.step("arena: analyze()", () => this.checkAnalyze()),
      await this.step("trials: route()", () => this.checkRoute()),
    ];
    return { provider: this.provider.name, ok: steps.every((s) => s.ok), steps };
  }

  private async step(name: string, fn: () => Promise<string>): Promise<ConformanceStep> {
    const start = Date.now();
    try {
      const detail = await fn();
      return { name, ok: true, detail, ms: Date.now() - start };
    } catch (e) {
      return { name, ok: false, detail: e instanceof Error ? e.message : String(e), ms: Date.now() - start };
    }
  }

  private async checkAnalyze(): Promise<string> {
    const { text, usage } = await this.provider.analyze(buildPrompt(SAMPLE_SKILLS));
    const verdict = parseVerdict(text); // throws loudly if the shape is wrong
    return `${verdict.skills.length} skill(s) scored, ${verdict.conflicts.length} conflict(s) ` +
      `· ${usage.inputTokens ?? "n/a"}↑ ${usage.outputTokens ?? "n/a"}↓ tok`;
  }

  private async checkRoute(): Promise<string> {
    const { text, usage } = await this.provider.analyze(buildRoutingPrompt(SAMPLE_SKILLS, SAMPLE_TASKS));
    const report = parseRouting(text, SAMPLE_TASKS); // throws loudly if the shape is wrong
    return `${report.matches.length} task(s) routed, ${report.gaps.length} gap(s) ` +
      `· ${usage.inputTokens ?? "n/a"}↑ ${usage.outputTokens ?? "n/a"}↓ tok`;
  }
}

/** Render a report the way the CLI and any future UI surface both want:
 * a checkmark/cross per step, timing, and the failure detail inline. */
export function formatReport(report: ConformanceReport): string {
  const lines = [`${report.ok ? "✓" : "✗"} ${report.provider} — ${report.ok ? "all checks passed" : "FAILED"}`];
  for (const s of report.steps) {
    lines.push(`  ${s.ok ? "✓" : "✗"} ${s.name} (${s.ms}ms) — ${s.detail}`);
  }
  return lines.join("\n");
}
