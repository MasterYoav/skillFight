import { useEffect, useState } from "react";
import type { Archetype } from "@skillfight/core";
import type { Warrior } from "./warrior.js";

/** Per-archetype ASCII bodies. `E` = eye, `M` = mouth. An unappraised skill is
 * an egg — its class hatches after the arena analyzes it. */
const BODY: Record<Archetype, string> = {
  blade: " ▄▄▄▄▄\n│E   E│\n│  M  │\n╰─┬─┬─╯",
  mage: "   ▲\n ╭───╮\n │E E│\n │ M │\n ╰┬─┬╯",
  guardian: "▛▀▀▀▀▀▜\n▌E   E▐\n▌  M  ▐\n▙▄▄┬▄▄▟",
  scout: " ╭◠◠◠╮\n ⟨E E⟩\n │ M │\n ╰┬─┬╯",
  engineer: " ┌─╥─┐\n │E E│\n │ M │\n └┬─┬┘",
  oracle: " ✧ ◉ ✧\n╭─────╮\n│E   E│\n│  M  │\n╰──┬──╯",
  courier: "≪╭───╮≫\n │E E│\n │ M │\n ╰┬─┬╯",
  warden: " ╔═══╗\n ║E E║\n ║ M ║\n ╚╦═╦╝",
};

const EGG = "  ╭─╮\n ╱   ╲\n│  ?  │\n ╲───╱";

/** A skill's avatar. Body matches its analyzed archetype; eyes/mouth react to
 * status; living warriors blink at random so the world feels inhabited. */
export function Sprite({ w }: { w: Warrior }) {
  const [blink, setBlink] = useState(false);
  const lively = w.appraisal != null && (w.status === "alive" || w.status === "won");

  useEffect(() => {
    if (!lively) return;
    let on: ReturnType<typeof setTimeout>;
    let off: ReturnType<typeof setTimeout>;
    const loop = () => {
      on = setTimeout(() => {
        setBlink(true);
        off = setTimeout(() => {
          setBlink(false);
          loop();
        }, 130);
      }, 1800 + Math.random() * 3200);
    };
    loop();
    return () => {
      clearTimeout(on);
      clearTimeout(off);
    };
  }, [lively]);

  if (!w.appraisal) {
    return (
      <pre className="sprite egg" style={{ color: w.color }} aria-hidden="true">
        {EGG}
      </pre>
    );
  }

  const eye = w.status === "lost" ? "✕" : w.status === "won" ? "★" : blink ? "–" : "⊙";
  const mouth = w.status === "lost" ? "︵" : w.status === "won" ? "◡" : "▾";
  const body = BODY[w.appraisal.archetype].replaceAll("E", eye).replaceAll("M", mouth);

  return (
    <pre className={`sprite status-${w.status}`} style={{ color: w.color }} aria-hidden="true">
      {body}
      {"\n   "}
      <span className="weapon">{w.appraisal.weapon}</span>
    </pre>
  );
}
