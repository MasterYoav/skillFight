/** Hand-placed pixel art, rendered as crisp SVG rects on a 16×16 grid.
 * The palette matches the CSS tokens; keep these the only "images" in the app
 * so everything stays self-contained and theme-consistent. */

type Cell = [x: number, y: number, color: string];

function Pix({ cells, size = 22, label }: { cells: Cell[]; size?: number; label?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      width={size}
      height={size}
      shapeRendering="crispEdges"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {cells.map(([x, y, c], i) => (
        <rect key={i} x={x} y={y} width="1" height="1" fill={c} />
      ))}
    </svg>
  );
}

const BLADE_L = "#eef2f5"; // lit edge
const BLADE_R = "#9fb3c8"; // shaded edge
const GOLD = "#e8c84a";
const GOLD_D = "#b89a2e";
const MAGENTA = "#d65cff";

const SWORD: Cell[] = [
  // tip
  [7, 0, BLADE_L], [8, 0, BLADE_R],
  // blade, two-tone
  ...Array.from({ length: 8 }, (_, i): Cell[] => [
    [7, i + 1, BLADE_L],
    [8, i + 1, BLADE_R],
  ]).flat(),
  // crossguard
  [4, 9, GOLD], [5, 9, GOLD], [6, 9, GOLD], [7, 9, GOLD], [8, 9, GOLD], [9, 9, GOLD], [10, 9, GOLD], [11, 9, GOLD],
  [4, 10, GOLD_D], [11, 10, GOLD_D],
  // grip
  [7, 10, MAGENTA], [8, 10, MAGENTA],
  [7, 11, MAGENTA], [8, 11, MAGENTA],
  [7, 12, MAGENTA], [8, 12, MAGENTA],
  // pommel
  [6, 13, GOLD], [7, 13, GOLD_D], [8, 13, GOLD_D], [9, 13, GOLD],
];

const TROPHY: Cell[] = [
  // rim
  [3, 1, GOLD], [4, 1, GOLD], [5, 1, GOLD], [6, 1, GOLD], [7, 1, GOLD], [8, 1, GOLD], [9, 1, GOLD], [10, 1, GOLD], [11, 1, GOLD], [12, 1, GOLD],
  // handles
  [1, 2, GOLD_D], [14, 2, GOLD_D],
  [1, 3, GOLD_D], [14, 3, GOLD_D],
  [2, 4, GOLD_D], [13, 4, GOLD_D],
  // bowl
  [3, 2, GOLD], [4, 2, GOLD], [5, 2, GOLD], [6, 2, GOLD], [7, 2, "#fff6c9"], [8, 2, "#fff6c9"], [9, 2, GOLD], [10, 2, GOLD], [11, 2, GOLD], [12, 2, GOLD],
  [3, 3, GOLD], [4, 3, GOLD], [5, 3, GOLD], [6, 3, GOLD], [7, 3, GOLD], [8, 3, GOLD], [9, 3, GOLD], [10, 3, GOLD], [11, 3, GOLD], [12, 3, GOLD],
  [4, 4, GOLD], [5, 4, GOLD], [6, 4, GOLD], [7, 4, GOLD], [8, 4, GOLD], [9, 4, GOLD], [10, 4, GOLD], [11, 4, GOLD],
  [5, 5, GOLD_D], [6, 5, GOLD], [7, 5, GOLD], [8, 5, GOLD], [9, 5, GOLD], [10, 5, GOLD_D],
  [6, 6, GOLD_D], [7, 6, GOLD], [8, 6, GOLD], [9, 6, GOLD_D],
  // stem
  [7, 7, GOLD_D], [8, 7, GOLD_D],
  [7, 8, GOLD_D], [8, 8, GOLD_D],
  // base
  [5, 9, GOLD], [6, 9, GOLD], [7, 9, GOLD], [8, 9, GOLD], [9, 9, GOLD], [10, 9, GOLD],
  [4, 10, GOLD_D], [5, 10, GOLD_D], [6, 10, GOLD_D], [7, 10, GOLD_D], [8, 10, GOLD_D], [9, 10, GOLD_D], [10, 10, GOLD_D], [11, 10, GOLD_D],
];

const SCROLL: Cell[] = [
  // rolled top
  [3, 2, "#4ad6e8"], [4, 2, "#4ad6e8"], [5, 2, "#4ad6e8"], [6, 2, "#4ad6e8"], [7, 2, "#4ad6e8"], [8, 2, "#4ad6e8"], [9, 2, "#4ad6e8"], [10, 2, "#4ad6e8"], [11, 2, "#4ad6e8"], [12, 2, "#4ad6e8"],
  [2, 3, "#2e97a6"], [13, 3, "#2e97a6"],
  // sheet
  [3, 3, "#d7dde3"], [4, 3, "#d7dde3"], [5, 3, "#d7dde3"], [6, 3, "#d7dde3"], [7, 3, "#d7dde3"], [8, 3, "#d7dde3"], [9, 3, "#d7dde3"], [10, 3, "#d7dde3"], [11, 3, "#d7dde3"], [12, 3, "#d7dde3"],
  ...Array.from({ length: 7 }, (_, r): Cell[] => {
    const y = r + 4;
    const row: Cell[] = [];
    for (let x = 3; x <= 12; x++) row.push([x, y, "#d7dde3"]);
    return row;
  }).flat(),
  // "writing" lines
  [5, 5, "#2e97a6"], [6, 5, "#2e97a6"], [7, 5, "#2e97a6"], [8, 5, "#2e97a6"], [9, 5, "#2e97a6"],
  [5, 7, "#2e97a6"], [6, 7, "#2e97a6"], [7, 7, "#2e97a6"], [8, 7, "#2e97a6"], [9, 7, "#2e97a6"], [10, 7, "#2e97a6"],
  [5, 9, "#2e97a6"], [6, 9, "#2e97a6"], [7, 9, "#2e97a6"],
  // rolled bottom
  [3, 11, "#4ad6e8"], [4, 11, "#4ad6e8"], [5, 11, "#4ad6e8"], [6, 11, "#4ad6e8"], [7, 11, "#4ad6e8"], [8, 11, "#4ad6e8"], [9, 11, "#4ad6e8"], [10, 11, "#4ad6e8"], [11, 11, "#4ad6e8"], [12, 11, "#4ad6e8"],
  [2, 11, "#2e97a6"], [13, 11, "#2e97a6"],
];

export const PixelSword = (p: { size?: number }) => <Pix cells={SWORD} size={p.size} />;
export const PixelTrophy = (p: { size?: number }) => <Pix cells={TROPHY} size={p.size} />;
export const PixelScroll = (p: { size?: number }) => <Pix cells={SCROLL} size={p.size} />;
