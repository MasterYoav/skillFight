import { describe, it, expect } from "vitest";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { loadSkills, parseSkillFile, parseSkillSource } from "./parser.js";

const fixtures = join(dirname(fileURLToPath(import.meta.url)), "../test/fixtures");

describe("parseSkillFile", () => {
  it("parses frontmatter, body, and normalizes tools", () => {
    const skill = parseSkillFile(join(fixtures, "git-helper/SKILL.md"));
    expect(skill).not.toBeNull();
    expect(skill!.name).toBe("git-helper");
    expect(skill!.description).toMatch(/stage, commit, branch/);
    expect(skill!.allowedTools).toEqual(["Bash", "Read"]);
    expect(skill!.body).toContain("Always branch before committing");
  });

  it("returns null for a markdown file without a description", () => {
    expect(parseSkillFile(join(fixtures, "notes.md"))).toBeNull();
  });
});

describe("parseSkillSource", () => {
  it("parses a skill from a raw string and derives name from the path", () => {
    const raw = "---\ndescription: do a thing\nallowed-tools: Bash, Read\n---\n\nbody here";
    const skill = parseSkillSource(raw, "my-skill/SKILL.md");
    expect(skill!.name).toBe("my-skill");
    expect(skill!.description).toBe("do a thing");
    expect(skill!.allowedTools).toEqual(["Bash", "Read"]);
  });

  it("returns null without a description", () => {
    expect(parseSkillSource("# just a doc")).toBeNull();
  });
});

describe("loadSkills", () => {
  it("recurses a directory and skips non-skill markdown", () => {
    const skills = loadSkills(fixtures);
    expect(skills.map((s) => s.name)).toEqual(["git-helper"]);
  });
});
