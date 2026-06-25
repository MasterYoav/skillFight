#!/usr/bin/env node
import { writeFileSync } from "node:fs";
import { analyzePath } from "./engine.js";
import { AnthropicProvider } from "./providers/anthropic.js";

// ponytail: minimal headless runner to verify the engine end-to-end. The TUI
// (Step 4) becomes the real entry point; this stays useful for scripting/CI.
const path = process.argv[2];
if (!path) {
  console.error("usage: skillfight <path-to-skills>  (writes verdict.json)");
  process.exit(1);
}

const verdict = await analyzePath(path, new AnthropicProvider());
writeFileSync("verdict.json", JSON.stringify(verdict, null, 2));
const { inputTokens, outputTokens } = verdict.usage ?? {};
console.log(
  `Analyzed ${verdict.skills.length} skill(s), ${verdict.conflicts.length} conflict(s). ` +
    `Tokens: ${inputTokens ?? "n/a"} in / ${outputTokens ?? "n/a"} out. → verdict.json`,
);
