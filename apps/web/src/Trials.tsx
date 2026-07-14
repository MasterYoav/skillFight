import { useState } from "react";
import type { RoutingReport, TaskMatch } from "@skillfight/core";
import { route, type ProviderChoice, type SkillSource } from "./api.js";
import { sfx } from "./sound.js";
import { PixelScroll } from "./Pixel.js";

const SAMPLE_TASKS = [
  "commit my staged changes and push",
  "merge these two PDF files into one",
  "why is this React component re-rendering twice",
  "book me a flight to Tokyo next week",
].join("\n");

interface Props {
  sources: SkillSource[];
  provider: ProviderChoice;
  model?: string;
  baseURL?: string;
  effort?: string;
  keyMissing: boolean;
}

/** The Trials: throw real tasks at the roster and see which skill each one
 * summons. Answers "what's the best skill for this task?" — and exposes the
 * tasks nothing covers (gaps) and the ones two skills fight over (contested). */
export function Trials({ sources, provider, model, baseURL, effort, keyMissing }: Props) {
  const [tasksText, setTasksText] = useState(SAMPLE_TASKS);
  const [report, setReport] = useState<RoutingReport | null>(null);
  const [phase, setPhase] = useState<"idle" | "running">("idle");
  const [error, setError] = useState<string | null>(null);

  const tasks = tasksText.split("\n").map((t) => t.trim()).filter(Boolean);
  const ready = sources.length > 0 && tasks.length > 0 && phase === "idle" && !keyMissing;

  async function run() {
    if (!ready) return;
    sfx.fight();
    setPhase("running");
    setError(null);
    setReport(null);
    try {
      const r = await route(sources, tasks, provider, model, baseURL, effort);
      setReport(r);
      sfx.verdict();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      sfx.error();
    } finally {
      setPhase("idle");
    }
  }

  const u = report?.usage ?? {};

  return (
    <div className="trials">
      <h2 className="theading">
        <PixelScroll size={20} />
        THE TRIALS
      </h2>
      <p className="lede">
        The Trials test whether your skills actually <em>fire</em> for real requests. Drop one task per line —
        each task summons the skill whose description best fits. Nothing answers? That's a gap. Two skills answer?
        They're fighting over the same trigger.
      </p>

      <textarea
        className="tasks"
        rows={Math.max(4, tasks.length + 1)}
        value={tasksText}
        onChange={(e) => setTasksText(e.target.value)}
        placeholder="one task per line…"
        spellCheck={false}
      />

      <div className="controls">
        <button className="fight" disabled={!ready} onClick={run}>
          {phase === "running" ? "⚔ THE TRIALS BEGIN…" : "⚔ RUN TRIALS"}
        </button>
        <span className="hint">
          {keyMissing
            ? `set ${provider === "anthropic" ? "ANTHROPIC_API_KEY" : "OPENAI_API_KEY"} where the skillfight server runs`
            : sources.length === 0
            ? "summon at least 1 skill first"
            : tasks.length === 0
            ? "add at least one task"
            : `${tasks.length} ${tasks.length === 1 ? "task" : "tasks"} · ${sources.length} skills · via ${provider}${model ? ` · ${model}` : ""}`}
          {report && ` · ${u.inputTokens ?? "—"}↑ ${u.outputTokens ?? "—"}↓ tok`}
        </span>
      </div>

      {error && <p className="err">✗ {error}</p>}

      {report && (
        <section className="verdicts">
          {report.gaps.length > 0 && (
            <p className="gapline">
              <strong className="gapcount">{report.gaps.length}</strong> {report.gaps.length === 1 ? "task" : "tasks"} no
              skill covers — coverage gaps in your library.
            </p>
          )}
          {report.matches.map((m, i) => (
            <TaskRow key={i} m={m} />
          ))}
        </section>
      )}
    </div>
  );
}

function TaskRow({ m }: { m: TaskMatch }) {
  const [open, setOpen] = useState(false);
  const state = m.best === null ? "gap" : m.contested ? "contested" : "hit";
  const top = m.candidates[0];

  return (
    <div className={`trow ${state}`}>
      <button className="thead" onClick={() => { if (m.candidates.length > 0) { sfx.tick(); setOpen((o) => !o); } }}>
        <span className="tstate">{state === "gap" ? "○" : state === "contested" ? "⚔" : "◆"}</span>
        <span className="ttask">{m.task}</span>
        <span className="tresult">
          {m.best === null ? (
            <span className="gaptag">NO SKILL</span>
          ) : m.contested ? (
            <span className="contag">CONTESTED · {m.best} {top && `${top.score}`}</span>
          ) : (
            <span className="hittag">{m.best} · {top?.score}</span>
          )}
        </span>
      </button>
      {open && m.candidates.length > 0 && (
        <ul className="cands">
          {m.candidates.map((c, j) => (
            <li key={j}>
              <span className="cscorebar" style={{ ["--pct" as string]: `${c.score}%` }}>
                <span className="cscore">{c.score}</span>
              </span>
              <span className="cskill">{c.skill}</span>
              <span className="creason dim">{c.reason}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
