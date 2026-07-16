import type { Archetype } from "@skillfight/core";
import type { WarriorStatus } from "./warrior.js";

/** Pixel-art fighters, drawn as crisp SVG rects on a shared humanoid grid in a
 * Tekken-style guard stance. Each archetype is a distinct fighter via its
 * headgear; the class color is the body fill. Combat/KO/win motion comes from
 * the CSS animations keyed on `.sprite` (lunge, fall, bob), same as before. */

type Cell = [number, number];

const VB = "0 0 18 26";

function box(x0: number, y0: number, x1: number, y1: number): Cell[] {
  const c: Cell[] = [];
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) c.push([x, y]);
  return c;
}

/** Shared humanoid in a fighting stance: head, torso, both fists up in guard,
 * legs planted wide. */
const BODY: Cell[] = [
  ...box(7, 4, 10, 8), // head
  [8, 9], [9, 9], // neck
  ...box(6, 10, 11, 16), // torso
  // left arm (guard up)
  [5, 10], [4, 7], [4, 8], [4, 9], [4, 10],
  // right arm (guard up)
  [12, 10], [13, 7], [13, 8], [13, 9], [13, 10],
  ...box(6, 17, 11, 17), // hips
  ...box(6, 18, 7, 24), // left leg
  ...box(10, 18, 11, 24), // right leg
  [5, 24], [12, 24], // feet
];

const BELT: Cell[] = box(6, 16, 11, 16); // accent stripe
const SHADE: Cell[] = [[11, 10], [11, 11], [11, 12], [11, 13], [11, 14], [11, 15], [11, 18], [11, 19], [11, 20], [11, 21], [11, 22], [11, 23], [13, 9], [13, 10]];
const LITE: Cell[] = [[6, 10], [6, 11], [6, 12], [7, 4], [8, 4], [4, 7]];

/** Distinct headgear per archetype — the fighter's silhouette signature. */
const GEAR: Record<Archetype, Cell[]> = {
  blade: [[8, 0], [8, 1], [8, 2], [8, 3], [9, 1], [9, 2], [9, 3], [6, 3], [7, 3], [10, 3], [11, 3]], // sword raised over head
  mage: [[8, 0], [9, 0], [7, 1], [8, 1], [9, 1], [10, 1], [6, 2], [7, 2], [8, 2], [9, 2], [10, 2], [11, 2], [6, 3], [11, 3]], // wizard hat
  guardian: [[6, 3], [7, 3], [8, 3], [9, 3], [10, 3], [11, 3], [8, 1], [9, 1], [8, 2], [9, 2]], // crested helmet
  scout: [[6, 3], [7, 3], [8, 3], [9, 3], [10, 3], [11, 3], [12, 3], [13, 3], [7, 2], [8, 2]], // brimmed cap
  engineer: [[7, 2], [8, 2], [9, 2], [10, 2], [7, 3], [8, 3], [9, 3], [10, 3], [8, 0], [8, 1]], // hard hat + antenna
  oracle: [[6, 1], [11, 1], [8, 0], [9, 0], [7, 2], [10, 2]], // floating halo dots
  courier: [[4, 2], [5, 3], [12, 3], [13, 2], [6, 3], [7, 3], [8, 3], [9, 3], [10, 3], [11, 3]], // winged crest
  warden: [[6, 3], [7, 3], [8, 3], [9, 3], [10, 3], [11, 3], [6, 2], [8, 2], [10, 2]], // spiked crown
};

const EYE_COLOR: Partial<Record<WarriorStatus, string>> = {
  lost: "#ff5c6a",
  won: "#e8c84a",
  friends: "#58e06a",
};

function eyes(status: WarriorStatus): { cells: Cell[]; color: string } {
  if (status === "won" || status === "friends") return { cells: [[7, 5], [10, 5]], color: EYE_COLOR[status]! }; // happy, raised
  return { cells: [[7, 6], [10, 6]], color: EYE_COLOR[status] ?? "#ffffff" };
}

function Rects({ cells, fill }: { cells: Cell[]; fill: string }) {
  return (
    <>
      {cells.map(([x, y], i) => (
        <rect key={i} x={x} y={y} width="1" height="1" fill={fill} />
      ))}
    </>
  );
}

export function PixelFighter({
  archetype,
  color,
  status,
  size = 76,
}: {
  archetype: Archetype;
  color: string;
  status: WarriorStatus;
  size?: number;
}) {
  const eye = eyes(status);
  return (
    <svg className={`sprite fighter status-${status}`} viewBox={VB} width={size} height={size} shapeRendering="crispEdges" aria-hidden="true">
      <Rects cells={BODY} fill={color} />
      <Rects cells={GEAR[archetype]} fill={color} />
      <Rects cells={SHADE} fill="rgba(0,0,0,0.32)" />
      <Rects cells={LITE} fill="rgba(255,255,255,0.4)" />
      <Rects cells={BELT} fill="rgba(255,255,255,0.55)" />
      <Rects cells={eye.cells} fill={eye.color} />
    </svg>
  );
}

/** The unappraised egg, in pixels — a filled ovoid awaiting its fighter. */
const EGG: Cell[] = [
  [8, 3], [9, 3],
  ...box(7, 4, 10, 4),
  ...box(6, 5, 11, 15),
  ...box(7, 16, 10, 16),
];
const EGG_LITE: Cell[] = [[7, 5], [8, 5], [7, 6]]; // top-left sheen
const EGG_SHADE: Cell[] = [[11, 6], [11, 7], [11, 8], [11, 9], [11, 10], [11, 11], [11, 12], [11, 13], [11, 14], [11, 15]];
const EGG_MARK: Cell[] = [[8, 8], [9, 8], [9, 9], [9, 10], [8, 11], [8, 13]]; // "?" glyph

export function PixelEgg({ color, size = 76 }: { color: string; size?: number }) {
  return (
    <svg className="sprite egg" viewBox={VB} width={size} height={size} shapeRendering="crispEdges" aria-hidden="true">
      <Rects cells={EGG} fill={color} />
      <Rects cells={EGG_SHADE} fill="rgba(0,0,0,0.3)" />
      <Rects cells={EGG_LITE} fill="rgba(255,255,255,0.45)" />
      <Rects cells={EGG_MARK} fill="rgba(0,0,0,0.5)" />
    </svg>
  );
}

/** The fusion: parent A's head + headgear on parent B's torso + legs, each half
 * in its parent's color — a literal splice of the two merged fighters. */
export function FusionFighter({
  archA,
  archB,
  colorA,
  colorB,
  size = 76,
}: {
  archA: Archetype;
  archB: Archetype;
  colorA: string;
  colorB: string;
  size?: number;
}) {
  const topA = [...GEAR[archA], ...BODY.filter(([, y]) => y <= 9)];
  const bottomB = BODY.filter(([, y]) => y >= 10);
  return (
    <svg className="sprite fighter fusion" viewBox={VB} width={size} height={size} shapeRendering="crispEdges" aria-hidden="true">
      <Rects cells={topA} fill={colorA} />
      <Rects cells={bottomB} fill={colorB} />
      <Rects cells={BELT} fill="rgba(255,255,255,0.55)" />
      <Rects cells={[[7, 6], [10, 6]]} fill="#ffffff" />
    </svg>
  );
}
