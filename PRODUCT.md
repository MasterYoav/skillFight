# Product

## Register

product

## Users

Claude power users — developers and AI tinkerers with a pile of installed skills. They live in terminals and dark editors, usually at night. They arrive with a maintenance chore ("is my skill library a mess?") and should leave having had fun. Job to be done: understand which skills overlap, which one fires for a given task, and what to merge or delete.

## Product Purpose

skillfight turns skill-library auditing into an arcade fight: skills are warriors, overlaps are duels, task routing is the Trials. Success = a user runs it on their real `~/.claude/skills`, instantly understands the verdict, and shows it to a friend because it looks like a game. Open-source; the ambition is to be the standard tool for optimizing a Claude skill setup.

## Brand Personality

Arcade, mischievous, precise. The chrome of a 90s fighting game (CRT glow, pixel stamps, K.O. moments) wrapped around a rigorously honest analysis engine. Fun is the hook; the verdict is the product. Emotional goals: delight on first paint, grin at the FIGHT moment, trust in the aftermath.

## Anti-references

- "Basic AI-built tool" — generic dark SaaS dashboard with default cards and gray text (the user's own words for the current state).
- Corporate developer-tool minimalism (plain Linear/Vercel clone chrome).
- Slop arcade: Comic-Sans-grade pixel kitsch, rainbow gradients, bouncing everything. The game feel must be crafted, not costume.

## Design Principles

1. **The game is the interface, not a skin.** Fight/trial mechanics ARE the mental model — status, damage, K.O. map 1:1 to real analysis results. Never decorate without meaning.
2. **Delight at moments, legibility in between.** Pixel display type and effects for the big beats (title, FIGHT, verdicts); calm monospace for descriptions, data, and reasons.
3. **Every state is a scene.** Empty roster, scanning, fighting, aftermath — each gets staging, not a spinner.
4. **Fast to first grin.** Demo data loads instantly; no key or setup needed to feel the game.
5. **Honest verdicts.** The theatrics never obscure the rationale; citations and reasons stay one glance away.

## Accessibility & Inclusion

- `prefers-reduced-motion` fully honored — every animation has a static or crossfade fallback (already wired; keep it).
- Body/data text ≥ 4.5:1 contrast on the dark surface; pixel font reserved for large display sizes (≥18px) where 3:1 applies.
- Status never conveyed by color alone — always paired with a glyph or stamp (K.O. / WINNER / MERGED, ◆/⚔/○).
- Sound (if any) is opt-out with a visible, persisted mute.
