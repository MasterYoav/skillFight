# Contributing to skillfight

Thanks for helping out. skillfight is a small, deliberately lean codebase — the
goal is one analysis engine and thin renderers over it. Keep changes focused.

## Setup

```bash
pnpm install
pnpm build
pnpm test
```

Requires Node 20+ and pnpm.

## Project shape

- **`packages/core`** — the engine: parser, provider abstraction, prompt, and
  the `Verdict` data model. No UI. Everything else renders a `Verdict`.
- **`packages/tui`** — Ink terminal arena.
- **`apps/web`** — React + Vite web arena.

If you change the `Verdict` type in `packages/core/src/types.ts`, update both
renderers — it's the shared contract.

## Adding a provider

Implement the `Provider` interface (`analyze(prompt) → { text, usage }`) and add
a case to `createProvider` in `packages/core/src/providers/factory.ts`. If the
backend speaks the OpenAI chat API, reuse `OpenAICompatibleProvider` instead of
writing a new class.

## Before you open a PR

```bash
pnpm typecheck   # all packages must pass
pnpm test        # all tests must pass
pnpm build
```

- Add or update a test for any non-trivial logic (parser, prompt, engine,
  providers). Tests are plain `vitest` — no network calls; use a fake `Provider`.
- Keep the diff minimal. Prefer reusing what's there over adding abstractions.
- One logical change per PR.

## Reporting issues

Open an issue with the skill files (or a minimal repro) and what you expected
versus what you got. For analysis-quality issues, include the provider and model
you used.
