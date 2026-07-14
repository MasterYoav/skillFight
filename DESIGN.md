# Design

## Theme

Arcade CRT. A dark phosphor screen (near-black blue `#0a0c10`) with scanlines, neon glow accents, and pixel display type — a 90s fighting-game cabinet housing a precise analysis tool. Dark is structural: the audience lives in terminals at night, and phosphor glow only works on black.

## Color

| Token | Value | Role |
| --- | --- | --- |
| `--bg` | `#0a0c10` | screen background |
| `--fg` | `#d7dde3` | body text |
| `--dim` | `#8b96a3` | secondary text (≥4.5:1 on bg) |
| `--line` | `#1f2630` | borders |
| `--panel` | `#11151b` | raised surfaces |
| `--magenta` | `#d65cff` | brand / title / active mode |
| `--green` | `#58e06a` | win / hit / HP |
| `--red` | `#ff5c6a` | K.O. / gap / ATK / FIGHT button |
| `--yellow` | `#e8c84a` | merge / contested / stars |
| `--cyan` | `#4ad6e8` | coexist / DEF / info |

**The chip is the key design language** (born from the ARENA|TRIALS toggle): a solid
saturated color block with dark `#0a0c10` pixel-type text and a soft same-color glow.
Anything *decided* wears a chip — active mode tab, class tags (MAGE/GUARDIAN/…),
verdict stamps (K.O./FUSION/TRUCE), the SUMMON action, NO SKILL tags.

**Color carries meaning.** After analysis a warrior wears its class color
(`ARCH_COLORS` in `warrior.ts`): blade red, mage magenta, guardian yellow, scout green,
engineer orange, oracle violet, courier cyan, warden blue. Unappraised cards are
desaturated (~45%) until they hatch. Pre-analysis accents fall back to a name-hash palette.

**Pixel art** lives in `Pixel.tsx` (16×16 SVG rects, `crispEdges`): sword (logo + favicon),
trophy (AFTERMATH), scroll (THE TRIALS). Cards get corner-bracket fighter-select frames;
the world floor is a checkered magenta/cyan pixel strip. Keep all imagery in this system —
no raster assets, no emoji iconography.

## Typography

- **Display (pixel):** Silkscreen — title, mode tabs, FIGHT button, section headings, verdict stamps. Display sizes only (≥14px bold).
- **Body/data:** `ui-monospace` stack — descriptions, reasons, stats, forms. 14px/1.5.
- Pairing axis: pixel display vs. clean monospace (contrast by construction, both terminal-native).

## Motion

- Beats: card spawn (scale-up, expo out), sprite idle bob, FIGHT eruption (screen shake + VS flash), K.O. fall, winner glow pulse, bar fills.
- 150–250ms for state transitions; longer only for the FIGHT sequence (a deliberate moment).
- Exponential ease-out everywhere; no bounce/elastic.
- All of it collapses to crossfades under `prefers-reduced-motion`.

## Components

- **WarriorCard** — fighter-select tile: ASCII sprite, name in accent, archetype + stars, creed, HP/ATK/DEF bars, status stamp overlay.
- **Mode tabs** — arena / trials segmented switch in header.
- **FIGHT button** — the primary action; red, glowing, pixel type.
- **Aftermath** — battle-results list: winner/merge/coexist lines with rationale.
- **Trials rows** — hit ◆ / contested ⚔ / gap ○ verdict rows with expandable score bars.

## Layout

- Single column, max 1080px, monospace rhythm.
- Roster: `repeat(auto-fill, minmax(190px, 1fr))` grid (150px on phones).
- Responsive is structural; type scale is fixed rem.
