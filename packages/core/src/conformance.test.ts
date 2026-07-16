import { describe, expect, it } from "vitest";
import { ProviderConformanceTest, formatReport } from "./conformance.js";
import type { AnalyzeResult, Provider, ProviderPrompt } from "./types.js";

const VALID_VERDICT = JSON.stringify({
  skills: [
    { name: "git-commit", problems: ["commits"], pros: ["focused"], cons: [], importance: 3, archetype: "engineer", stats: [{ name: "Precision", score: 80 }] },
    { name: "pdf-extract", problems: ["pdf text"], pros: ["unique"], cons: [], importance: 4, archetype: "warden", stats: [{ name: "Coverage", score: 90 }] },
  ],
  conflicts: [],
  recommendations: [],
});

const VALID_ROUTING = JSON.stringify({
  matches: [
    { task: "commit my staged changes", candidates: [{ skill: "git-commit", score: 92, reason: "exact match" }] },
    { task: "extract the tables from this PDF", candidates: [{ skill: "pdf-extract", score: 88, reason: "exact match" }] },
    { task: "book me a flight to Tokyo", candidates: [] },
  ],
});

/** Fakes a provider by inspecting which prompt it was asked to fulfil —
 * `buildPrompt` mentions "Analyze these skills", `buildRoutingPrompt` mentions
 * "score the skills" — so one stub can drive both conformance steps. */
function fakeProvider(overrides: Partial<Record<"analyze" | "route", () => AnalyzeResult>> = {}): Provider {
  return {
    name: "fake",
    async analyze(prompt: ProviderPrompt): Promise<AnalyzeResult> {
      const isRouting = prompt.user.includes("score the skills");
      const fn = isRouting ? overrides.route : overrides.analyze;
      if (fn) return fn();
      return { text: isRouting ? VALID_ROUTING : VALID_VERDICT, usage: { inputTokens: 100, outputTokens: 50 } };
    },
  };
}

describe("ProviderConformanceTest", () => {
  it("passes both steps against a well-behaved provider", async () => {
    const report = await new ProviderConformanceTest(fakeProvider()).run();
    expect(report.ok).toBe(true);
    expect(report.provider).toBe("fake");
    expect(report.steps).toHaveLength(2);
    expect(report.steps.every((s) => s.ok)).toBe(true);
    expect(report.steps[0].detail).toMatch(/2 skill\(s\) scored/);
    expect(report.steps[1].detail).toMatch(/3 task\(s\) routed, 1 gap/);
  });

  it("fails the arena step and reports why, without aborting the route step", async () => {
    const report = await new ProviderConformanceTest(
      fakeProvider({ analyze: () => ({ text: "not json", usage: {} }) }),
    ).run();
    expect(report.ok).toBe(false);
    expect(report.steps[0].ok).toBe(false);
    expect(report.steps[0].detail).toMatch(/valid JSON/);
    expect(report.steps[1].ok).toBe(true); // route step still runs independently
  });

  it("surfaces the exact empty-response error a broken local provider throws", async () => {
    const report = await new ProviderConformanceTest({
      name: "local",
      async analyze(): Promise<AnalyzeResult> {
        throw new Error('local model "gpt-oss-20b" returned an empty response (finish_reason: stop).');
      },
    }).run();
    expect(report.ok).toBe(false);
    expect(report.steps[0].detail).toMatch(/empty response/);
  });
});

describe("formatReport", () => {
  it("renders a checkmark per passing step and a cross for the whole report on failure", () => {
    const out = formatReport({
      provider: "local",
      ok: false,
      steps: [
        { name: "arena: analyze()", ok: false, detail: "boom", ms: 12 },
        { name: "trials: route()", ok: true, detail: "fine", ms: 8 },
      ],
    });
    expect(out).toContain("✗ local — FAILED");
    expect(out).toContain("✗ arena: analyze() (12ms) — boom");
    expect(out).toContain("✓ trials: route() (8ms) — fine");
  });
});
