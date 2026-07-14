/** A skill as read in the browser. Minimal frontmatter parse — enough to summon
 * a warrior instantly. The server re-parses authoritatively (gray-matter) when
 * analyzing, so this only needs name/description/tools for the visuals. */
export interface RawSkill {
  name: string;
  description: string;
  allowedTools?: string[];
  body: string;
}

export function readSkill(filename: string, text: string): RawSkill | null {
  const m = /^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/.exec(text);
  const fm = m?.[1] ?? "";
  const body = (m?.[2] ?? text).trim();

  const scalar = (k: string) => {
    const r = new RegExp(`^${k}\\s*:\\s*(.+)$`, "mi").exec(fm);
    return r?.[1]?.trim().replace(/^["']|["']$/g, "");
  };

  const description = scalar("description");
  if (!description) return null; // not a skill

  let name = scalar("name");
  if (!name) {
    const base = filename.replace(/\.md$/i, "").split("/").pop() ?? filename;
    name = /^skill$/i.test(base) ? filename.split("/").slice(-2)[0] ?? base : base;
  }

  let allowedTools: string[] | undefined;
  const inline = scalar("allowed-tools") ?? scalar("allowedTools");
  if (inline) {
    allowedTools = inline.split(",").map((s) => s.trim()).filter(Boolean);
  } else {
    const list = /allowed-tools\s*:\s*\n((?:[ \t]*-[ \t]*.+\n?)+)/i.exec(fm);
    if (list) allowedTools = list[1].split("\n").map((l) => l.replace(/^[ \t]*-[ \t]*/, "").trim()).filter(Boolean);
  }

  return { name, description, allowedTools, body };
}
