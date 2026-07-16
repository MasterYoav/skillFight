import type { Warrior } from "./warrior.js";
import { PixelEgg, PixelFighter } from "./Fighter.js";

/** A skill's avatar — a pixel-art Tekken-style fighter once appraised, an egg
 * until then. Combat/KO/win motion is CSS on `.sprite`; `fighting` is accepted
 * for API parity (the melee animation is driven by the card's `.brawl` class). */
export function Sprite({ w }: { w: Warrior; fighting?: boolean }) {
  if (!w.appraisal) return <PixelEgg color={w.color} />;
  return <PixelFighter archetype={w.appraisal.archetype} color={w.color} status={w.status} />;
}
