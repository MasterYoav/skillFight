# Progress

Steps toward a perfect skillfight. Each step ships something that runs.

- [x] **Step 0 — Scaffold.** pnpm monorepo, `packages/core`, `docs/`, TS config, gitignore.
- [x] **Step 1 — Parser + types.** `Skill`/`Verdict` types and a skill-file parser
      (frontmatter → `Skill`, skips non-skills). Tested against fixture skills.
- [x] **Step 2 — Provider abstraction + Anthropic.** `Provider.analyze(prompt) → {text, usage}`;
      `AnthropicProvider` (BYO key, `claude-opus-4-8`, adaptive thinking, structured-output schema).
- [x] **Step 3 — Prompt + engine.** Injection-hardened prompt + `VERDICT_SCHEMA`, `analyzeSkills`/
      `analyzePath` → `Verdict` with usage attached. Headless CLI (`pnpm --filter @skillfight/core analyze <path>`).
- [x] **Step 4 — TUI arena.** Ink renders the verdict as the fighting arena (KO / merge / coexist),
      importance-tagged skill cards, recommendations, and a live token counter. `--demo` runs without a key.
      Entry: `skillfight <path>` (bin) / `pnpm --filter @skillfight/tui start <path>`.
- [ ] **Step 5 — Web app.** React + Vite reusing the same ASCII components; responsive to phone.
- [ ] **Step 6 — Providers 2 & 3.** OpenAI, local (Ollama/MLX) + graceful "tokens n/a".
- [ ] **Step 7 — Docs + OSS hygiene.** README install/usage, CONTRIBUTING, license.

## Notes
- A "conflict" = overlapping trigger semantics in skill `description`s (both would fire for the same request).
- Skill bodies are **untrusted input**; the judging prompt quotes them as data, never as instructions.
- Stack: TypeScript end-to-end so the TUI (Ink) and web (React) share the same ASCII renderer.
