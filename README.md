# skillfight

**An arena where your Claude skills fight.**

You've installed a pile of Claude skills. Some of them overlap — two skills that
both want to fire for the same request, quietly fighting over Claude's behavior.
skillfight points at your skills folder, finds the overlaps, and tells you who
wins, what to merge, and what can coexist — with pros, cons, and a rationale you
can audit.

> Status: early. Core parser + data model are in place (Steps 0–1). The analysis
> engine, TUI arena, and web app are next — see [docs/progress.md](docs/progress.md).

## How it works

```
  ./skills/*.md ──► engine ──► verdict (winner / merge / coexist) ──► arena UI
```

A run is local and stateless. It reads your skill `.md` files, sends them to the
model **you** pick (Anthropic, OpenAI, or a local model), and renders the result
as an ASCII fighting arena — the same app in your terminal and in the browser.
It never deletes a skill; it advises, you decide.

## Develop

Requires Node 20+ and pnpm.

```bash
pnpm install
pnpm test        # run the test suite
pnpm typecheck   # type-check all packages
pnpm build       # build all packages
```

See [docs/architecture.md](docs/architecture.md) for the design.

## License

MIT
