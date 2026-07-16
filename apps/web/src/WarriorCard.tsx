import type { Warrior } from "./warrior.js";
import { Sprite } from "./Sprite.js";

const TAG: Record<string, string> = { won: "WINNER", lost: "K.O.", merged: "FUSED", friends: "ALLIES" };

export function WarriorCard({
  w,
  onRemove,
  fighting = false,
  flip = false,
}: {
  w: Warrior;
  onRemove?: () => void;
  /** True while the arena verdict is being computed — the roster brawls. */
  fighting?: boolean;
  /** Alternates lunge direction so adjacent cards trade blows. */
  flip?: boolean;
}) {
  const a = w.appraisal;
  const cls = [
    "warrior",
    `status-${w.status}`,
    a ? "" : "unappraised",
    fighting ? "brawl" : "",
    flip ? "flip" : "",
  ].filter(Boolean).join(" ");
  return (
    <div className={cls} style={{ ["--accent" as string]: w.color }}>
      {onRemove && (
        <button className="wremove" onClick={onRemove} aria-label={`Remove ${w.name}`}>×</button>
      )}
      {w.status === "lost" && <span className="dizzy" aria-hidden="true">★ ☆ ★</span>}
      <Sprite w={w} fighting={fighting} />
      <div className="wname">{w.name}</div>
      {a ? (
        <div className="wmeta">
          <span className="archchip">{a.archetype.toUpperCase()}</span>
          <span className="stars">
            {"★".repeat(a.level)}
            <span className="dim">{"·".repeat(5 - a.level)}</span>
          </span>
        </div>
      ) : (
        <div className="wmeta">
          <span className="arch dim">CLASS UNKNOWN</span>
        </div>
      )}
      <p className="creed" title={w.creed}>
        {w.creed}
      </p>
      {a ? (
        <div className="bars">
          {a.stats.map((s, i) => (
            <Bar key={s.name} label={s.name} score={s.score} cls={BAR_COLORS[i % BAR_COLORS.length]} />
          ))}
        </div>
      ) : (
        <p className="unhatched">unhatched — FIGHT to appraise</p>
      )}
      {w.status !== "alive" && !fighting && <div className={`vtag ${w.status}`}>{TAG[w.status]}</div>}
    </div>
  );
}

const BAR_COLORS = ["hp", "atk", "def"]; // reused fill palette: green / red / cyan

function Bar({ label, score, cls }: { label: string; score: number; cls: string }) {
  const pct = Math.max(4, score);
  return (
    <div className="bar" title={`${label}: ${score}/100`}>
      <span className="blabel">{label}</span>
      <span className="btrack">
        <span className={`bfill ${cls}`} style={{ width: `${pct}%` }} />
      </span>
    </div>
  );
}
