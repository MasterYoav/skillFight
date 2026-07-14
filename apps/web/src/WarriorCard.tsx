import type { Warrior } from "./warrior.js";
import { Sprite } from "./Sprite.js";

const TAG: Record<string, string> = { won: "WINNER", lost: "K.O.", merged: "MERGED" };

export function WarriorCard({ w, onRemove }: { w: Warrior; onRemove?: () => void }) {
  const a = w.appraisal;
  return (
    <div className={`warrior status-${w.status} ${a ? "" : "unappraised"}`} style={{ ["--accent" as string]: w.color }}>
      {onRemove && (
        <button className="wremove" onClick={onRemove} aria-label={`Remove ${w.name}`}>×</button>
      )}
      <Sprite w={w} />
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
      {w.status !== "alive" && <div className={`vtag ${w.status}`}>{TAG[w.status]}</div>}
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
