# Architecture

One engine, two skins. A run is synchronous and stateless: read files → call a
model → emit a verdict. No database, no vector store, no queue — the whole skill
corpus fits in one model context.

```
  ./skills/*.md ──► CORE ENGINE (stateless) ──► verdict.json
                    parse → prompt → provider      + usage log
                          │  same JSON  │
                    ┌─────┘             └─────┐
                  TUI (Ink)             WEB (React)
                  ascii arena           same ascii renderer
```

## Packages
- **`packages/core`** — pure engine. Parser (`parser.ts`), shared types
  (`types.ts`), and (Step 2+) the provider abstraction, prompt, and run
  orchestration. No UI, fully unit-testable.
- **`packages/tui`** *(Step 4)* — Ink renderer. The fighting arena.
- **`apps/web`** *(Step 5)* — React + Vite renderer sharing core's types and the
  ASCII components.

## Key decisions
- **Conflict = description overlap.** Two skills fight when their `description`
  trigger semantics overlap. Detected by one orchestrated LLM call over all
  descriptions — higher quality than embedding cosine, and no index to maintain.
- **Provider abstraction.** One interface `analyze(prompt) → {text, usage}` with
  Anthropic / OpenAI / local impls. Local models may report no token usage; the
  UI degrades to "tokens n/a".
- **Untrusted input.** Skill content is quoted as data in the prompt, never
  followed as instructions (prompt-injection defense).
- **Advisory only.** The tool recommends winner/merge/coexist; it never deletes a
  skill. The human decides.

## Boundaries
- **Stateless / synchronous:** the entire run.
- **Single external dependency / SPOF:** the user's chosen model provider.
- **Trust boundary:** skill file contents (untrusted) → prompt (sanitized/quoted).
