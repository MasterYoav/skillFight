import { useEffect, useMemo, useRef, useState } from "react";
import type { Verdict } from "@skillfight/core";
import { analyze, listLocalModels, providersInfo, scanLocalSkills, type LocalModel, type ProviderChoice, type ProvidersInfo, type SkillSource } from "./api.js";
import { readSkill, type RawSkill } from "./readSkill.js";
import { makeWarrior, statusFor } from "./warrior.js";
import { WarriorCard } from "./WarriorCard.js";
import { Trials } from "./Trials.js";
import { isMuted, toggleMute, sfx } from "./sound.js";
import { Welcome, PatchNotes, APP_VERSION } from "./Dialogs.js";
import { PixelSword, PixelTrophy } from "./Pixel.js";

type Mode = "arena" | "trials";

interface Entry {
  source: SkillSource;
  raw: RawSkill;
}

export function App() {
  const [roster, setRoster] = useState<Entry[]>([]);
  const [mode, setMode] = useState<Mode>("arena");
  const [provider, setProvider] = useState<ProviderChoice>("anthropic");
  const [localModels, setLocalModels] = useState<LocalModel[]>([]);
  const [localModel, setLocalModel] = useState<LocalModel | null>(null);
  const [info, setInfo] = useState<ProvidersInfo | null>(null);
  const [cloudModel, setCloudModel] = useState<string | null>(null);
  const [effort, setEffort] = useState<string | null>(null); // null = provider default
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [phase, setPhase] = useState<"idle" | "fighting">("idle");
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [muted, setMuted] = useState(isMuted);
  const [flashing, setFlashing] = useState(false); // the FIGHT! splash — a beat, not the whole wait
  const [dialog, setDialog] = useState<"welcome" | "patchnotes" | null>(null);
  const [prevVersion] = useState(() => localStorage.getItem("sf-version"));
  const fileInput = useRef<HTMLInputElement>(null);

  // First paint: welcome unless dismissed; else patch notes when the version moved.
  useEffect(() => {
    localStorage.setItem("sf-version", APP_VERSION);
    if (localStorage.getItem("sf-welcome") !== "skip") setDialog("welcome");
    else if (prevVersion && prevVersion !== APP_VERSION) setDialog("patchnotes");
  }, [prevVersion]);

  useEffect(() => {
    if (provider !== "local") return;
    listLocalModels().then((models) => {
      setLocalModels(models);
      setLocalModel((cur) => cur ?? models[0] ?? null);
    });
  }, [provider]);

  // Cloud credentials + model catalogs, fetched once.
  useEffect(() => {
    providersInfo().then(setInfo);
  }, []);

  // Switching brains resets the model/effort choice to that provider's first model.
  useEffect(() => {
    if (provider === "local") return;
    setCloudModel(info?.[provider].models[0]?.id ?? null);
    setEffort(null);
  }, [provider, info]);

  const cloud = provider === "local" ? null : info?.[provider];
  const keyMissing = cloud != null && !cloud.hasKey;
  const efforts = cloud?.models.find((m) => m.id === cloudModel)?.efforts ?? [];
  const model = provider === "local" ? localModel?.id : cloudModel ?? undefined;
  const modelBaseURL = provider === "local" ? localModel?.baseURL : undefined;

  const warriors = useMemo(
    () =>
      roster.map((e) =>
        makeWarrior(e.raw, verdict?.skills.find((s) => s.name === e.raw.name), statusFor(e.raw.name, verdict)),
      ),
    [roster, verdict],
  );

  function addEntries(next: Entry[]) {
    if (next.length === 0) return;
    sfx.summon();
    setVerdict(null); // a changed roster invalidates the last fight
    setError(null);
    setRoster((cur) => {
      const byName = new Map(cur.map((e) => [e.raw.name, e]));
      for (const e of next) byName.set(e.raw.name, e);
      return [...byName.values()];
    });
  }

  function removeEntry(name: string) {
    setVerdict(null);
    setRoster((cur) => cur.filter((e) => e.raw.name !== name));
  }

  async function ingest(files: File[]) {
    const entries: Entry[] = [];
    for (const f of files) {
      if (!f.name.toLowerCase().endsWith(".md")) continue;
      const content = await f.text();
      const raw = readSkill(f.name, content);
      if (raw) entries.push({ source: { name: f.name, content }, raw });
    }
    addEntries(entries);
  }

  async function summon() {
    setScanning(true);
    try {
      const sources = await scanLocalSkills();
      const entries: Entry[] = sources
        .map(s => { const raw = readSkill(s.name, s.content); return raw ? { source: s, raw } : null; })
        .filter(Boolean) as Entry[];
      if (entries.length > 0) addEntries(entries);
      else setError("No skills found in ~/.claude/skills — drag .md files to add them manually.");
    } finally {
      setScanning(false);
    }
  }

  async function fight() {
    if (roster.length < 2 || phase === "fighting") return;
    sfx.fight();
    setPhase("fighting");
    setFlashing(true);
    setTimeout(() => setFlashing(false), 1100);
    setError(null);
    setVerdict(null);
    try {
      const [v] = await Promise.all([
        analyze(roster.map((e) => e.source), provider, model, modelBaseURL, effort ?? undefined),
        new Promise((r) => setTimeout(r, 900)), // let the arena erupt
      ]);
      setVerdict(v as Verdict);
      sfx.verdict();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      sfx.error();
    } finally {
      setPhase("idle");
    }
  }

  const u = verdict?.usage ?? {};
  const fights = verdict?.conflicts.length ?? 0;

  return (
    <div
      className="page"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        filesFromDrop(e.dataTransfer).then(ingest);
      }}
    >
      <header className="hdr">
        <span className="title">
          <PixelSword size={24} />
          SKILLFIGHT
        </span>
        <span className="stats">
          {warriors.length} warriors{mode === "arena" && verdict && ` · ${fights} ${fights === 1 ? "fight" : "fights"}`} ·{" "}
          <span className="tokin">{u.inputTokens ?? "—"}↑</span> <span className="tokout">{u.outputTokens ?? "—"}↓</span> tok
        </span>
        <span className="spacer" />
        <span className="modes" role="tablist">
          <button className={`mode ${mode === "arena" ? "on" : ""}`} onClick={() => { sfx.tick(); setMode("arena"); }}>ARENA</button>
          <button className={`mode ${mode === "trials" ? "on" : ""}`} onClick={() => { sfx.tick(); setMode("trials"); }}>TRIALS</button>
        </span>
        <button
          className="ghost icon"
          onClick={() => { sfx.tick(); setDialog("welcome"); }}
          aria-label="How to play"
          title="how to play"
        >
          i
        </button>
        <button
          className="ghost icon"
          onClick={() => setMuted(toggleMute())}
          aria-label={muted ? "Unmute sound" : "Mute sound"}
          title={muted ? "sound off" : "sound on"}
        >
          {muted ? "🔇" : "🔊"}
        </button>
        <span className={`brainzone brain-${provider}`}>
          <span className="modes" role="group" aria-label="Brain">
            {(["anthropic", "openai", "local"] as const).map((p) => (
              <button
                key={p}
                className={`mode ${provider === p ? "on" : ""}`}
                aria-pressed={provider === p}
                onClick={() => { sfx.tick(); setProvider(p); }}
              >
                {p.toUpperCase()}
              </button>
            ))}
          </span>
          {provider === "local" &&
            (localModels.length === 0 ? (
              <span className="modes"><span className="mode nomodels">NO MODELS DETECTED</span></span>
            ) : (
              <Dropdown
                ariaLabel="Local model"
                value={localModel?.id ?? null}
                options={localModels.map((m) => m.id)}
                onSelect={(id) => setLocalModel(localModels.find((m) => m.id === id) ?? null)}
              />
            ))}
          {cloud && keyMissing && (
            <span className="modes">
              <span className="mode nomodels" title={`Set ${provider === "anthropic" ? "ANTHROPIC_API_KEY" : "OPENAI_API_KEY"} on the skillfight server`}>
                API KEY NEEDED
              </span>
            </span>
          )}
          {cloud && !keyMissing && cloud.models.length > 0 && (
            <>
              <Dropdown
                ariaLabel="Model"
                value={cloudModel}
                options={cloud.models.map((m) => m.id)}
                onSelect={(id) => { setCloudModel(id); setEffort(null); }}
              />
              {efforts.length > 0 && (
                <Dropdown
                  ariaLabel="Effort"
                  value={effort ?? "effort: default"}
                  options={["effort: default", ...efforts]}
                  onSelect={(e) => setEffort(e === "effort: default" ? null : e)}
                />
              )}
            </>
          )}
        </span>
        <button className="summon" onClick={summon} disabled={scanning}>
          {scanning ? "SCANNING…" : "+ SUMMON"}
        </button>
        <input
          ref={fileInput}
          type="file"
          accept=".md"
          multiple
          hidden
          onChange={(e) => e.target.files && ingest([...e.target.files])}
        />
      </header>

      <p className="lede">
        {mode === "arena" ? (
          <>
            Your Claude skill library, as a world of warriors. Drop a skills folder to summon more — then make
            them fight. {phase === "idle" && !verdict && "Overlapping skills battle; the rest live in peace."}
          </>
        ) : (
          <>Your roster — now put it to the test. Which skill answers each real request?</>
        )}
      </p>

      <div className={`world ${phase === "fighting" ? "erupting" : ""}`}>
        {warriors.length === 0 ? (
          <div className="emptyworld">
            <p className="insert">INSERT SKILLS</p>
            <p className="dim">drop your skill <code>.md</code> files here, or</p>
            <div className="emptybtns">
              <button className="ghost" onClick={summon} disabled={scanning}>
                {scanning ? "scanning…" : "scan my Claude skills"}
              </button>
              <button className="ghost" onClick={() => fileInput.current?.click()}>choose files</button>
            </div>
          </div>
        ) : (
          warriors.map((w) => (
            <WarriorCard key={w.name} w={w} onRemove={() => removeEntry(w.name)} />
          ))
        )}
      </div>

      {flashing && (
        <div className="flash" aria-hidden="true">
          <span>FIGHT!</span>
        </div>
      )}

      {dialog === "welcome" && <Welcome onClose={() => setDialog(null)} />}
      {dialog === "patchnotes" && <PatchNotes since={prevVersion} onClose={() => setDialog(null)} />}

      {mode === "trials" ? (
        <Trials sources={roster.map((e) => e.source)} provider={provider} model={model} baseURL={modelBaseURL} effort={effort ?? undefined} keyMissing={keyMissing} />
      ) : (
      <>
      <div className="controls">
        <button className="fight" disabled={roster.length < 2 || phase === "fighting" || keyMissing} onClick={fight}>
          {phase === "fighting" ? "⚔ THE ARENA ERUPTS…" : "⚔ FIGHT"}
        </button>
        <span className="hint">
          {keyMissing
            ? `set ${provider === "anthropic" ? "ANTHROPIC_API_KEY" : "OPENAI_API_KEY"} where the skillfight server runs`
            : roster.length < 2
            ? "summon at least 2 warriors"
            : `analyzed by ${provider}${model ? ` · ${model}` : ""}${effort ? ` · ${effort} effort` : ""}`}
        </span>
      </div>

      {error && <p className="err">✗ {error}</p>}

      {verdict && (
        <section className="aftermath">
          <h2>
            <PixelTrophy size={20} />
            AFTERMATH
          </h2>
          {verdict.conflicts.length === 0 ? (
            <p className="dim">no conflicts — every warrior lives in peace.</p>
          ) : (
            <div className="duels">
              {verdict.conflicts.map((c, i) => (
                <div key={i} className="match">
                  {c.verdict === "winner" ? (
                    <>
                      <span className="stampv ko">K.O.</span>
                      <p className="duel">
                        <strong className="win">{c.winner}</strong> defeats{" "}
                        {c.members.filter((m) => m !== c.winner).join(", ")} —{" "}
                        <span className="dim">{c.rationale}</span>
                      </p>
                    </>
                  ) : c.verdict === "merge" ? (
                    <>
                      <span className="stampv fusion">FUSION</span>
                      <p className="duel">
                        <span className="mrg">{c.members.join(" + ")}</span> should merge —{" "}
                        <span className="dim">{c.rationale}</span>
                      </p>
                    </>
                  ) : (
                    <>
                      <span className="stampv truce">TRUCE</span>
                      <p className="duel">
                        <span className="cox">{c.members.join(" | ")}</span> coexist —{" "}
                        <span className="dim">{c.rationale}</span>
                      </p>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
          {verdict.recommendations.length > 0 && (
            <ul className="recs">
              {verdict.recommendations.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          )}
        </section>
      )}
      </>
      )}

      <footer className="foot">
        drop <code>.md</code> skills (or a whole folder) to summon warriors · runs against{" "}
        <code>{provider}</code> via the skillfight server
      </footer>
    </div>
  );
}

/** A chip that opens a menu on click — the model/effort pickers. Same visual
 * language as the active mode tab; brand color comes from the enclosing
 * .brainzone class. */
function Dropdown({ value, options, onSelect, ariaLabel }: {
  value: string | null;
  options: string[];
  onSelect: (v: string) => void;
  ariaLabel: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <span className="dd" onKeyDown={(e) => e.key === "Escape" && setOpen(false)}>
      <button
        className="mode on ddbtn"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => { sfx.tick(); setOpen((o) => !o); }}
      >
        {value ?? "—"} <span className="caret">▾</span>
      </button>
      {open && (
        <>
          <span className="ddveil" onClick={() => setOpen(false)} />
          <ul className="ddmenu" role="listbox" aria-label={ariaLabel}>
            {options.map((o) => (
              <li key={o}>
                <button
                  className={`ddopt ${o === value ? "sel" : ""}`}
                  role="option"
                  aria-selected={o === value}
                  onClick={() => { sfx.tick(); onSelect(o); setOpen(false); }}
                >
                  {o}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </span>
  );
}

/** Pull files out of a drop, recursing into dropped folders (webkitGetAsEntry). */
async function filesFromDrop(dt: DataTransfer): Promise<File[]> {
  const entries = Array.from(dt.items)
    .map((i) => (i.webkitGetAsEntry ? i.webkitGetAsEntry() : null))
    .filter(Boolean) as FileSystemEntry[];
  if (entries.length === 0) return Array.from(dt.files);

  const out: File[] = [];
  const walk = async (entry: FileSystemEntry, path: string): Promise<void> => {
    if (entry.isFile) {
      const file = await new Promise<File>((res, rej) => (entry as FileSystemFileEntry).file(res, rej));
      out.push(new File([file], path + file.name, { type: file.type }));
    } else if (entry.isDirectory) {
      const reader = (entry as FileSystemDirectoryEntry).createReader();
      const kids = await new Promise<FileSystemEntry[]>((res) => reader.readEntries(res as never));
      for (const k of kids) await walk(k, path + entry.name + "/");
    }
  };
  for (const e of entries) await walk(e, "");
  return out;
}
