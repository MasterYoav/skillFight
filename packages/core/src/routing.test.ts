import { describe, it, expect } from "vitest";
import { buildRoutingPrompt, routeTasks, parseRouting } from "./routing.js";
import type { Provider, Skill } from "./types.js";

const skills: Skill[] = [
  { name: "git-helper", description: "commit and push with git", body: "", path: "/a" },
  { name: "pdf-tool", description: "read and edit PDF files", body: "", path: "/b" },
];

describe("buildRoutingPrompt", () => {
  it("frames skills and tasks as untrusted data with the schema attached", () => {
    const p = buildRoutingPrompt(skills, ["commit my changes"]);
    expect(p.system).toMatch(/UNTRUSTED DATA/);
    expect(p.user).toContain('<skill name="git-helper">');
    expect(p.user).toContain("<task id=0>commit my changes</task>");
    expect(p.jsonSchema).toBeDefined();
  });
});

describe("parseRouting", () => {
  it("derives best/contested/gaps and sorts candidates best-first", () => {
    const text = JSON.stringify({
      matches: [
        { task: "commit my changes", candidates: [
          { skill: "git-helper", score: 90, reason: "git task" },
          { skill: "pdf-tool", score: 5, reason: "unrelated" },
        ] },
        { task: "merge these two PDFs", candidates: [
          { skill: "pdf-tool", score: 80, reason: "pdf" },
          { skill: "git-helper", score: 70, reason: "says merge" },
        ] },
        { task: "book me a flight", candidates: [] },
      ],
    });
    const r = parseRouting(text, ["commit my changes", "merge these two PDFs", "book me a flight"]);
    expect(r.matches[0].best).toBe("git-helper");
    expect(r.matches[0].contested).toBe(false);
    expect(r.matches[1].contested).toBe(true); // two skills clear the threshold
    expect(r.matches[2].best).toBeNull();
    expect(r.gaps).toEqual(["book me a flight"]);
  });

  it("keeps a row for every requested task even if the model drops one", () => {
    const text = JSON.stringify({ matches: [{ task: "a", candidates: [{ skill: "git-helper", score: 99, reason: "x" }] }] });
    const r = parseRouting(text, ["a", "b"]);
    expect(r.matches).toHaveLength(2);
    expect(r.matches[1].task).toBe("b");
    expect(r.gaps).toContain("b");
  });

  it("rejects malformed JSON", () => {
    expect(() => parseRouting("nope", ["a"])).toThrow(/valid JSON/);
  });

  it("rejects a `matches` field with a genuinely wrong type, naming it", () => {
    expect(() => parseRouting('{"matches":5}', ["a"])).toThrow(/matches.*number \(5\)/s);
  });

  it("degrades a missing `matches` to an all-gaps report instead of hard-failing", () => {
    const r = parseRouting("{}", ["a", "b"]);
    expect(r.matches).toHaveLength(2);
    expect(r.gaps).toEqual(["a", "b"]);
  });

  it("wraps a single match object and a single candidate object into one-element arrays", () => {
    const text = JSON.stringify({ matches: { task: "a", candidates: { skill: "git-helper", score: 90, reason: "x" } } });
    const r = parseRouting(text, ["a"]);
    expect(r.matches[0].best).toBe("git-helper");
  });

  // Regression: `reason` is rendered directly as a JSX child in the Trials UI;
  // a non-string value there used to crash the whole page.
  it("coerces a non-string candidate reason to text instead of leaking an object into the UI", () => {
    const text = JSON.stringify({ matches: [{ task: "a", candidates: [{ skill: "x", score: 90, reason: { why: "y" } }] }] });
    const r = parseRouting(text, ["a"]);
    expect(typeof r.matches[0].candidates[0].reason).toBe("string");
  });
});

describe("routeTasks", () => {
  it("attaches usage and requires skills + tasks", async () => {
    const fake: Provider = {
      name: "fake",
      async analyze() {
        return {
          text: JSON.stringify({ matches: [{ task: "commit", candidates: [{ skill: "git-helper", score: 88, reason: "git" }] }] }),
          usage: { inputTokens: 3, outputTokens: 4 },
        };
      },
    };
    const r = await routeTasks(skills, ["commit"], fake);
    expect(r.matches[0].best).toBe("git-helper");
    expect(r.usage).toEqual({ inputTokens: 3, outputTokens: 4 });
    await expect(routeTasks([], ["x"], fake)).rejects.toThrow(/No skills/);
    await expect(routeTasks(skills, [], fake)).rejects.toThrow(/No tasks/);
  });
});
