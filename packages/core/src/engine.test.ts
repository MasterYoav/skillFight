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

/** Fake provider: first `analyze()` call (the main roster pass) returns
 * `verdict`; every later call (the per-conflict judge pass) returns
 * `judgeReplies` in order, defaulting to an empty confirming reply so tests
 * that don't care about the judge pass don't have to stub it. */
function fakeProvider(verdict: Verdict, judgeReplies: unknown[] = [], usage = {}): Provider {
  let call = 0;
  return {
    name: "fake",
    async analyze() {
      call++;
      if (call === 1) return { text: JSON.stringify(verdict), usage };
      const reply = judgeReplies[call - 2] ?? { verdict: "coexist", rationale: "", citations: [] };
      return { text: JSON.stringify(reply), usage: {} };
    },
  };
}

describe("analyzeSkills", () => {
  it("calls the provider and attaches usage to the parsed verdict", async () => {
    const verdict: Verdict = {
      skills: [{ name: "git-a", problems: ["commit"], pros: [], cons: [], importance: 3 }],
      conflicts: [{ members: ["git-a", "git-b"], verdict: "merge", rationale: "same job", citations: ["git"] }],
      recommendations: ["merge them"],
    };
    // Judge agrees, so the verdict passes through untouched.
    const fake = fakeProvider(verdict, [{ verdict: "merge", rationale: "same job", citations: ["git"] }], { inputTokens: 10, outputTokens: 20 });
    const result = await analyzeSkills(skills, fake);
    expect(result.conflicts[0].verdict).toBe("merge");
    expect(result.usage).toEqual({ inputTokens: 10, outputTokens: 20 });
  });

  it("throws on empty skill list", async () => {
    const fake: Provider = { name: "fake", async analyze() { return { text: "{}", usage: {} }; } };
    await expect(analyzeSkills([], fake)).rejects.toThrow(/No skills/);
  });

  // Deterministic, zero-cost sanity pass — catches hallucinated evidence
  // without another model call.
  it("flags a citation that doesn't appear anywhere in the cited skills' text", async () => {
    const verdict: Verdict = {
      skills: [],
      conflicts: [{ members: ["git-a", "git-b"], verdict: "merge", rationale: "same job", citations: ["deletes your database"] }],
      recommendations: [],
    };
    const fake = fakeProvider(verdict, [{ verdict: "merge", rationale: "same job", citations: ["deletes your database"] }]);
    const result = await analyzeSkills(skills, fake);
    expect(result.conflicts[0].flags).toContain('citation not found in the cited skills\' text: "deletes your database"');
  });

  it("leaves a well-grounded, judge-confirmed conflict unflagged", async () => {
    const verdict: Verdict = {
      skills: [],
      conflicts: [{ members: ["git-a", "git-b"], verdict: "merge", rationale: "same job", citations: ["git"] }],
      recommendations: [],
    };
    const fake = fakeProvider(verdict, [{ verdict: "merge", rationale: "same job", citations: ["git"] }]);
    const result = await analyzeSkills(skills, fake);
    expect(result.conflicts[0].flags).toBeUndefined();
  });

  it("doesn't flag low overlap for coexist verdicts, and doesn't send them to the judge", async () => {
    const unrelated: Skill[] = [
      { name: "git-a", description: "commit with git", body: "use git", path: "/a" },
      { name: "pdf-tool", description: "merge PDF files together", body: "reads pages", path: "/b" },
    ];
    const verdict: Verdict = {
      skills: [],
      conflicts: [{ members: ["git-a", "pdf-tool"], verdict: "coexist", rationale: "different domains", citations: [] }],
      recommendations: [],
    };
    let calls = 0;
    const fake: Provider = { name: "fake", async analyze() { calls++; return { text: JSON.stringify(verdict), usage: {} }; } };
    const result = await analyzeSkills(unrelated, fake);
    expect(result.conflicts[0].flags).toBeUndefined();
    expect(calls).toBe(1); // no judge call for a verdict with no comparative claim
  });

  // The core ask: a second, blind pass double-checks winner/merge calls, and
  // wins on disagreement — including writing the merged skill itself when the
  // second opinion is "actually these should merge".
  it("adopts the second opinion when it disagrees, and installs its merged skill", async () => {
    const verdict: Verdict = {
      skills: [],
      conflicts: [{ members: ["git-a", "git-b"], verdict: "winner", winner: "git-a", rationale: "a is better", citations: ["git"] }],
      recommendations: [],
    };
    const secondOpinion = {
      verdict: "merge",
      rationale: "they cover the same trigger and neither is a strict superset",
      citations: ["git"],
      merged: { name: "git-merged", description: "commit with git", body: "use git" },
    };
    const fake = fakeProvider(verdict, [secondOpinion]);
    const result = await analyzeSkills(skills, fake);
    expect(result.conflicts[0].verdict).toBe("merge");
    expect(result.conflicts[0].merged?.name).toBe("git-merged");
    expect(result.conflicts[0].flags?.[0]).toMatch(/second opinion.*says "merge"/);
  });

  // Semantic recall net: one recall pass reasons over all descriptions by
  // MEANING to surface pairs the first analysis never grouped — even pairs that
  // share no vocabulary. Mid-confidence hits become free nudges; high-confidence
  // hits get a blind judge call and, if confirmed, are promoted.
  const semanticPair: Skill[] = [
    { name: "sx", description: "commit my changes to git", body: "", path: "/x" },
    { name: "sy", description: "save my work to version control", body: "", path: "/y" }, // no shared words, same intent
  ];

  it("surfaces a mid-confidence recalled pair as a soft missed nudge, with no judge call", async () => {
    const verdict: Verdict = { skills: [], conflicts: [], recommendations: [] };
    let calls = 0;
    const fake: Provider = {
      name: "fake",
      async analyze() {
        calls++;
        if (calls === 1) return { text: JSON.stringify(verdict), usage: {} };
        return { text: JSON.stringify({ pairs: [{ members: ["sx", "sy"], confidence: 0.4, why: "both save code" }] }), usage: {} };
      },
    };
    const result = await analyzeSkills(semanticPair, fake);
    expect(calls).toBe(2); // main + one recall pass; 0.4 is below the escalation bar, so no paid judge call
    expect(result.missed).toEqual([{ members: ["sx", "sy"], overlap: 0.4 }]);
    expect(result.conflicts).toHaveLength(0);
  });

  it("escalates a high-confidence recalled pair and promotes a judge 'merge', flagged as recall-surfaced", async () => {
    const verdict: Verdict = { skills: [], conflicts: [], recommendations: [] };
    // call 1: main analysis. call 2: recall pass. call 3: per-pair judge.
    const fake = fakeProvider(verdict, [
      { pairs: [{ members: ["sx", "sy"], confidence: 0.9, why: "same intent" }] },
      { verdict: "merge", rationale: "same job", citations: [], merged: { name: "m", description: "d", body: "b" } },
    ]);
    const result = await analyzeSkills(semanticPair, fake);
    expect(result.conflicts).toHaveLength(1);
    expect(result.conflicts[0].verdict).toBe("merge");
    expect(result.conflicts[0].members).toEqual(["sx", "sy"]);
    expect(result.conflicts[0].flags?.[0]).toMatch(/^surfaced by recall/);
    expect(result.missed).toBeUndefined();
  });

  it("drops a high-confidence recalled pair the judge clears as coexist — not in conflicts, not in missed", async () => {
    const verdict: Verdict = { skills: [], conflicts: [], recommendations: [] };
    const fake = fakeProvider(verdict, [
      { pairs: [{ members: ["sx", "sy"], confidence: 0.9, why: "looks similar" }] },
      { verdict: "coexist", rationale: "actually different triggers", citations: [] },
    ]);
    const result = await analyzeSkills(semanticPair, fake);
    expect(result.conflicts).toHaveLength(0);
    expect(result.missed).toBeUndefined();
  });

  it("skips the recall call entirely when every pair is already grouped", async () => {
    const verdict: Verdict = {
      skills: [],
      conflicts: [{ members: ["sx", "sy"], verdict: "coexist", rationale: "x", citations: [] }],
      recommendations: [],
    };
    let calls = 0;
    const fake: Provider = { name: "fake", async analyze() { calls++; return { text: JSON.stringify(verdict), usage: {} }; } };
    const result = await analyzeSkills(semanticPair, fake);
    expect(calls).toBe(1); // the only pair is grouped → no recall pass, no judge call
    expect(result.missed).toBeUndefined();
  });

  it("ignores recalled pairs that name skills not on the roster", async () => {
    const verdict: Verdict = { skills: [], conflicts: [], recommendations: [] };
    const fake = fakeProvider(verdict, [
      { pairs: [{ members: ["sx", "ghost"], confidence: 0.9, why: "hallucinated a skill" }] },
    ]);
    const result = await analyzeSkills(semanticPair, fake);
    expect(result.conflicts).toHaveLength(0);
    expect(result.missed).toBeUndefined();
  });

  it("survives a failed recall pass, leaving the verdict intact", async () => {
    const verdict: Verdict = { skills: [], conflicts: [], recommendations: [] };
    let call = 0;
    const fake: Provider = {
      name: "fake",
      async analyze() {
        call++;
        if (call === 1) return { text: JSON.stringify(verdict), usage: {} };
        throw new Error("recall model timed out");
      },
    };
    const result = await analyzeSkills(semanticPair, fake);
    expect(result.conflicts).toHaveLength(0);
    expect(result.missed).toBeUndefined();
  });

  it("keeps the first verdict when the judge call fails", async () => {
    const verdict: Verdict = {
      skills: [],
      conflicts: [{ members: ["git-a", "git-b"], verdict: "merge", rationale: "same job", citations: ["git"] }],
      recommendations: [],
    };
    let call = 0;
    const fake: Provider = {
      name: "fake",
      async analyze() {
        call++;
        if (call === 1) return { text: JSON.stringify(verdict), usage: {} };
        throw new Error("local model timed out");
      },
    };
    const result = await analyzeSkills(skills, fake);
    expect(result.conflicts[0].verdict).toBe("merge");
    expect(result.conflicts[0].flags).toBeUndefined();
  });
});

describe("parseVerdict", () => {
  it("rejects non-JSON", () => {
    expect(() => parseVerdict("not json")).toThrow(/valid JSON/);
  });

  it("rejects a field with a genuinely wrong type, naming which one", () => {
    expect(() => parseVerdict('{"skills":5,"conflicts":[],"recommendations":[]}')).toThrow(
      /skills \(got number \(5\)\)/,
    );
  });

  it("defaults missing optional arrays to empty instead of hard-failing", () => {
    const v = parseVerdict('{"skills":[]}');
    expect(v).toEqual({ skills: [], conflicts: [], recommendations: [] });
  });

  it("wraps a single conflict object into a one-element array (local models often drop the wrapping [])", () => {
    const v = parseVerdict(
      '{"skills":[],"conflicts":{"members":["a","b"],"verdict":"coexist","rationale":"fine","citations":[]},"recommendations":[]}',
    );
    expect(v.conflicts).toHaveLength(1);
    expect(v.conflicts[0].verdict).toBe("coexist");
  });

  it("wraps a single recommendation string into a one-element array", () => {
    const v = parseVerdict('{"skills":[],"conflicts":[],"recommendations":"merge the git skills"}');
    expect(v.recommendations).toEqual(["merge the git skills"]);
  });

  // Regression: a local model that returns an object instead of a string for a
  // "string" field used to crash the whole page — React throws when a raw
  // object reaches a JSX child, and there's no error boundary. Every field the
  // UI renders directly must always come back as a real string.
  it("coerces a non-string recommendation entry to text instead of leaking an object into the UI", () => {
    const v = parseVerdict('{"skills":[],"conflicts":[],"recommendations":[{"note":"do this"}]}');
    expect(typeof v.recommendations[0]).toBe("string");
  });

  it("coerces a non-string rationale/citation to text", () => {
    const v = parseVerdict(
      '{"skills":[],"conflicts":[{"members":["a"],"verdict":"coexist","rationale":{"why":"x"},"citations":[42]}],"recommendations":[]}',
    );
    expect(typeof v.conflicts[0].rationale).toBe("string");
    expect(typeof v.conflicts[0].citations[0]).toBe("string");
  });

  it("drops an unrecognized archetype instead of passing a bogus value through", () => {
    const v = parseVerdict(
      '{"skills":[{"name":"x","problems":[],"pros":[],"cons":[],"importance":3,"archetype":"specialist","stats":[]}],"conflicts":[],"recommendations":[]}',
    );
    expect(v.skills[0].archetype).toBeUndefined();
  });

  it("falls back an unrecognized conflict verdict kind to coexist instead of passing it through raw", () => {
    const v = parseVerdict(
      '{"skills":[],"conflicts":[{"members":["a","b"],"verdict":"draw","rationale":"x","citations":[]}],"recommendations":[]}',
    );
    expect(v.conflicts[0].verdict).toBe("coexist");
  });

  it("drops an incomplete merged skill (missing body) rather than shipping a broken download", () => {
    const v = parseVerdict(
      '{"skills":[],"conflicts":[{"members":["a","b"],"verdict":"merge","rationale":"x","citations":[],"merged":{"name":"y"}}],"recommendations":[]}',
    );
    expect(v.conflicts[0].merged).toBeUndefined();
  });
});
