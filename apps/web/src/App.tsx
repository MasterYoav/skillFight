import { useState } from "react";
import type { Verdict } from "@skillfight/core";
import { Arena } from "./Arena.js";
import { DEMO_VERDICT } from "./demo.js";

export function App() {
  const [verdict, setVerdict] = useState<Verdict>(DEMO_VERDICT);
  const [isDemo, setIsDemo] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadFile(file: File) {
    try {
      const data = JSON.parse(await file.text());
      if (!Array.isArray(data.skills) || !Array.isArray(data.conflicts)) {
        throw new Error("Not a verdict.json (missing skills/conflicts arrays).");
      }
      setVerdict(data);
      setIsDemo(false);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <div
      className="page"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (file) loadFile(file);
      }}
    >
      <Arena verdict={verdict} />

      <footer className="foot">
        {error && <span className="con">✗ {error} </span>}
        {isDemo ? (
          <>
            viewing demo —{" "}
            <label className="link">
              drop or open a <code>verdict.json</code>
              <input
                type="file"
                accept="application/json,.json"
                hidden
                onChange={(e) => e.target.files?.[0] && loadFile(e.target.files[0])}
              />
            </label>{" "}
            from the <code>skillfight</code> CLI to view yours
          </>
        ) : (
          <>viewing your verdict.json</>
        )}
      </footer>
    </div>
  );
}
