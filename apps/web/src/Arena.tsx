import type { Conflict, SkillVerdict, Verdict } from "@skillfight/core";

/** The arena, in HTML — same structure and fight semantics as the TUI's Ink
 * version, rendered in a monospace ASCII skin. */
export function Arena({ verdict }: { verdict: Verdict }) {
  const fights = verdict.conflicts.length;
  const u = verdict.usage ?? {};
  return (
    <div className="arena">
      <header className="hdr">
        <span className="title">⚔ SKILLFIGHT</span>
        <span className="stats">
          {verdict.skills.length} skills · {fights} {fights === 1 ? "fight" : "fights"} ·{" "}
          {u.inputTokens ?? "n/a"}↑ {u.outputTokens ?? "n/a"}↓ tok
        </span>
      </header>

      <section className="panel">
        <h2>ARENA</h2>
        {fights === 0 ? (
          <p className="dim">no conflicts — every skill lives in peace</p>
        ) : (
          verdict.conflicts.map((c, i) => <Fight key={i} conflict={c} />)
        )}
      </section>

      <section className="block">
        <h2>SKILLS</h2>
        {verdict.skills.map((s) => (
          <SkillCard key={s.name} skill={s} />
        ))}
      </section>

      {verdict.recommendations.length > 0 && (
        <section className="block">
          <h2>RECOMMENDATIONS</h2>
          {verdict.recommendations.map((r, i) => (
            <p key={i}>
              <span className="bullet">• </span>
              {r}
            </p>
          ))}
        </section>
      )}
    </div>
  );
}

function Fight({ conflict }: { conflict: Conflict }) {
  if (conflict.verdict === "winner") {
    return (
      <div className="fight">
        <p>
          {conflict.members.map((m, i) => (
            <span key={m}>
              {i > 0 && <span className="swords"> ⚔ </span>}
              <span className={m === conflict.winner ? "winner" : "loser"}>{m}</span>
            </span>
          ))}
          <span className="winner"> → KO, {conflict.winner} wins</span>
        </p>
        <p className="dim rationale">{conflict.rationale}</p>
      </div>
    );
  }
  const merge = conflict.verdict === "merge";
  return (
    <div className="fight">
      <p className={merge ? "merge" : "coexist"}>
        {conflict.members.join(merge ? " + " : " | ")} {merge ? "→ merge into one" : "→ coexist in peace"}
      </p>
      <p className="dim rationale">{conflict.rationale}</p>
    </div>
  );
}

function SkillCard({ skill }: { skill: SkillVerdict }) {
  const level = Math.min(5, Math.max(1, skill.importance));
  return (
    <div className="card">
      <p className="cardhead">
        <span className={`imp imp-${level}`}>[{skill.importance}]</span> <strong>{skill.name}</strong>
        {skill.problems.length > 0 && <span className="dim"> solves: {skill.problems.join(", ")}</span>}
      </p>
      {skill.pros.map((p, i) => (
        <p key={`p${i}`}>
          <span className="pro">+ </span>
          {p}
        </p>
      ))}
      {skill.cons.map((c, i) => (
        <p key={`c${i}`}>
          <span className="con">- </span>
          {c}
        </p>
      ))}
    </div>
  );
}
