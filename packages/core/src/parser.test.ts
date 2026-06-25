import { describe, it, expect } from "vitest";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { loadSkills, parseSkillFile } from "./parser.js";

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

describe("loadSkills", () => {
  it("recurses a directory and skips non-skill markdown", () => {
    const skills = loadSkills(fixtures);
    expect(skills.map((s) => s.name)).toEqual(["git-helper"]);
  });
});
