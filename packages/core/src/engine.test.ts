import { describe, it, expect } from "vitest";
import { buildPrompt } from "./prompt.js";
import { analyzeSkills, parseVerdict } from "./engine.js";
import type { Provider, Skill, Verdict } from "./types.js";

const skills: Skill[] = [
  { name: "git-a", description: "commit with git", body: "use git", path: "/a", allowedTools: ["Bash"] },
  { name: "git-b", description: "commit using git", body: "git commit", path: "/b" },
];

describe("buildPrompt", () => {
  it("wraps each skill as delimited untrusted data and attaches the schema", () => {
    const prompt = buildPrompt(skills);
    expect(prompt.system).toMatch(/UNTRUSTED DATA/);
    expect(prompt.user).toContain('<skill name="git-a">');
    expect(prompt.user).toContain("<description>commit with git</description>");
    expect(prompt.user).toContain("<allowed-tools>Bash</allowed-tools>");
    expect(prompt.jsonSchema).toBeDefined();
  });
});

describe("analyzeSkills", () => {
  it("calls the provider and attaches usage to the parsed verdict", async () => {
    const verdict: Verdict = {
      skills: [{ name: "git-a", problems: ["commit"], pros: [], cons: [], importance: 3 }],
      conflicts: [{ members: ["git-a", "git-b"], verdict: "merge", rationale: "same job", citations: ["git"] }],
      recommendations: ["merge them"],
    };
    const fake: Provider = {
      name: "fake",
      async analyze() {
        return { text: JSON.stringify(verdict), usage: { inputTokens: 10, outputTokens: 20 } };
      },
    };
    const result = await analyzeSkills(skills, fake);
    expect(result.conflicts[0].verdict).toBe("merge");
    expect(result.usage).toEqual({ inputTokens: 10, outputTokens: 20 });
  });

  it("throws on empty skill list", async () => {
    const fake: Provider = { name: "fake", async analyze() { return { text: "{}", usage: {} }; } };
    await expect(analyzeSkills([], fake)).rejects.toThrow(/No skills/);
  });
});

describe("parseVerdict", () => {
  it("rejects non-JSON", () => {
    expect(() => parseVerdict("not json")).toThrow(/valid JSON/);
  });
  it("rejects JSON missing required arrays", () => {
    expect(() => parseVerdict('{"skills":[]}')).toThrow(/missing required arrays/);
  });
});
