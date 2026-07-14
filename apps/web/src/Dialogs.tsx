import { useEffect, useRef, useState, type ReactNode } from "react";

/** Release history, newest first. The top entry is the app version; the update
 * dialog shows everything the user hasn't seen yet. Add a release here with
 * every user-visible change. */
export const RELEASES = [
  {
    version: "0.3.0",
    date: "2026-07-13",
    added: [
      "Skill classes, levels, and stats are now learned from the analysis — a fresh summon is an unhatched egg until the arena appraises it",
      "Stats are named for each skill's own domain (Style for a UI skill, Defence for a security skill) instead of generic HP/ATK/DEF",
      "Every skill type gets its own avatar (8 classes, from mage to warden)",
      "How-to-play welcome, and these patch notes",
      "Every class wears its own color, with fighter-select frames, pixel sword/trophy/scroll art, and a checkered arena floor",
    ],
    fixed: [
      "No more pre-loaded demo skills — your roster starts empty",
      "Stats no longer invented from file size before any analysis ran",
    ],
  },
  {
    version: "0.2.0",
    date: "2026-07-13",
    added: [
      "TRIALS mode — type real requests and see which skill answers each, which are contested, and what nothing covers",
      "Arcade look: pixel type, CRT scanlines, FIGHT! flash, chiptune sound (mutable)",
    ],
    fixed: ["Verdict errors now surface as a readable message instead of failing silently"],
  },
  {
    version: "0.1.0",
    date: "2026-06-26",
    added: ["The arena — drop skills, FIGHT, get winner / merge / coexist verdicts with rationale"],
    fixed: [],
  },
];

export const APP_VERSION = RELEASES[0].version;

/** Native <dialog> wrapper: focus trap, Esc, backdrop for free. */
function ArcadeDialog({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog ref={ref} className="adialog" onClose={onClose} aria-label={title}>
      <h2>{title}</h2>
      {children}
    </dialog>
  );
}

export function Welcome({ onClose }: { onClose: () => void }) {
  const [skip, setSkip] = useState(localStorage.getItem("sf-welcome") === "skip");
  function close() {
    localStorage.setItem("sf-welcome", skip ? "skip" : "show");
    onClose();
  }
  return (
    <ArcadeDialog title="HOW TO PLAY" onClose={close}>
      <ol className="howto">
        <li>
          <strong>Summon your skills.</strong> Drag your skill files (<code>.md</code>) anywhere onto the
          page — or press <em>+ summon</em> to load the skills already installed for Claude on this machine.
        </li>
        <li>
          <strong>FIGHT</strong> <span className="dim">(arena)</span>. Skills that would answer the same
          request battle it out. You'll see who wins, which should merge, and which can live in peace — with
          the reasoning spelled out.
        </li>
        <li>
          <strong>Run the TRIALS.</strong> Type things you'd actually ask, one per line. Each request shows
          which skill answers it, where two skills fight over it, and what nothing covers.
        </li>
        <li>
          <strong>Pick your judge.</strong> The dropdown chooses the AI that referees: anthropic, openai, or
          a local model (local keeps everything on your machine).
        </li>
      </ol>
      <p className="dim safety">skillfight never changes or deletes your skills — it only advises. You decide.</p>
      <div className="dlgrow">
        <label className="dontshow">
          <input type="checkbox" checked={skip} onChange={(e) => setSkip(e.target.checked)} />
          don't show this again
        </label>
        <button className="fight dlgbtn" onClick={close}>START</button>
      </div>
    </ArcadeDialog>
  );
}

export function PatchNotes({ since, onClose }: { since: string | null; onClose: () => void }) {
  const idx = RELEASES.findIndex((r) => r.version === since);
  const unseen = idx > 0 ? RELEASES.slice(0, idx) : RELEASES;
  return (
    <ArcadeDialog title={`PATCH NOTES · v${APP_VERSION}`} onClose={onClose}>
      <div className="notes">
        {unseen.map((r) => (
          <section key={r.version}>
            <h3>
              v{r.version} <span className="dim">· {r.date}</span>
            </h3>
            {r.added.length > 0 && (
              <ul className="new">
                {r.added.map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ul>
            )}
            {r.fixed.length > 0 && (
              <ul className="fixes">
                {r.fixed.map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
      <div className="dlgrow">
        <span />
        <button className="fight dlgbtn" onClick={onClose}>LET'S GO</button>
      </div>
    </ArcadeDialog>
  );
}
