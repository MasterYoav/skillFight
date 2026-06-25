import { readFileSync, readdirSync, statSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import matter from "gray-matter";
import type { Skill } from "./types.js";

/**
 * Load all skills under a path. Accepts a single `.md` file or a directory
 * (recursed). A `.md` file is treated as a skill only if its frontmatter has a
 * `description` — that's what makes it a skill rather than a plain doc. Files
 * without one (READMEs, notes) are silently skipped.
 */
export function loadSkills(path: string): Skill[] {
  const skills: Skill[] = [];
  for (const file of findMarkdownFiles(resolve(path))) {
    const skill = parseSkillFile(file);
    if (skill) skills.push(skill);
  }
  return skills;
}

/** Parse one markdown file into a Skill, or null if it isn't a skill. */
export function parseSkillFile(file: string): Skill | null {
  const raw = readFileSync(file, "utf8");
  const { data, content } = matter(raw);

  const description = typeof data.description === "string" ? data.description.trim() : "";
  if (!description) return null; // not a skill

  return {
    name: skillName(data.name, file),
    description,
    allowedTools: normalizeTools(data["allowed-tools"] ?? data.allowedTools),
    body: content.trim(),
    path: file,
  };
}

/** Frontmatter `name`, else the SKILL.md folder name, else the file basename. */
function skillName(name: unknown, file: string): string {
  if (typeof name === "string" && name.trim()) return name.trim();
  const base = basename(file, ".md");
  return base.toUpperCase() === "SKILL" ? basename(dirname(file)) : base;
}

/** allowed-tools may be a YAML list or a comma-separated string. Normalize. */
function normalizeTools(tools: unknown): string[] | undefined {
  if (Array.isArray(tools)) return tools.map(String).map((t) => t.trim()).filter(Boolean);
  if (typeof tools === "string") return tools.split(",").map((t) => t.trim()).filter(Boolean);
  return undefined;
}

function findMarkdownFiles(path: string): string[] {
  const stat = statSync(path);
  if (stat.isFile()) return path.endsWith(".md") ? [path] : [];

  const out: string[] = [];
  for (const entry of readdirSync(path, { withFileTypes: true })) {
    if (entry.name.startsWith(".") || entry.name === "node_modules") continue;
    const full = join(path, entry.name);
    if (entry.isDirectory()) out.push(...findMarkdownFiles(full));
    else if (entry.isFile() && entry.name.endsWith(".md")) out.push(full);
  }
  return out;
}
