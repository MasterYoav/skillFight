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
- [x] **Step 5 — Web app.** React + Vite renders the same arena in an HTML/CSS monospace skin,
      responsive to phone. Loads a `verdict.json` (drag-drop / file picker) or the bundled demo.
      Type-only `Verdict` import keeps core's Node code out of the browser bundle.
- [x] **Step 6 — Providers 2 & 3.** `OpenAICompatibleProvider` covers OpenAI and local
      (Ollama/LM Studio/MLX) over one impl; usage degrades to "n/a" when the server reports none.
      `createProvider(anthropic|openai|local)` factory wired into the CLI and TUI (env-configured).
- [x] **Step 7 — Docs + OSS hygiene.** Full README (install/use/providers/library/layout),
      CONTRIBUTING, MIT LICENSE, and top-level scripts (`analyze`, `tui`, `tui:demo`, `web`).
- [x] **Step 8 — Server + web app.** `apps/server` exposes the engine over HTTP (`/api/analyze`),
      scans `~/.claude/skills`, and detects running local models. The web arena talks to it, so the
      API key stays server-side and never touches the browser.
- [x] **Step 9 — Trials (task routing).** A second capability alongside conflict detection: given a
      set of real tasks, score which skill *fires* for each. `routeTasks`/`routeSources` (one LLM call)
      → `RoutingReport` deriving **hit** (one skill answers), **contested** (2+ clear the fire
      threshold — a trigger fight), and **gap** (nothing covers the task). Served at `/api/route`,
      rendered as the "trials" mode in the web app. This is the "best skill for what task" view.

- [x] **Step 10 — Learned warriors + onboarding.** No pre-loaded demo skills; the roster starts
      empty with an attract screen. Class/level/stats are no longer derived from file hashes — the
      model classifies each skill's `archetype` (8 kinds, in `VERDICT_SCHEMA`) during analysis, and
      a fresh summon is an unhatched egg until the arena appraises it. Each archetype gets its own
      ASCII avatar. Welcome ("HOW TO PLAY") dialog on first run with a persisted don't-show
      checkbox + header `i` button; versioned patch-notes dialog (`Dialogs.tsx` `RELEASES`) shows
      what's new/fixed since the last version the user saw.

## Notes
- Two lenses on the same roster: **Arena** (which skills *overlap* — static description conflict) and
  **Trials** (which skill *fires* for a given task — routing against real requests). Conflict answers
  "do these two collide?"; routing answers "for this task, who wins, and what does nothing cover?".
- A "conflict" = overlapping trigger semantics in skill `description`s (both would fire for the same request).
- Skill bodies are **untrusted input**; the judging prompt quotes them as data, never as instructions.
- Stack: TypeScript end-to-end so the TUI (Ink) and web (React) share the same ASCII renderer.
