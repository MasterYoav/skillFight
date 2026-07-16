import type { MergedSkill } from "@skillfight/core";
import type { Warrior } from "./warrior.js";
import { FusionFighter } from "./Fighter.js";

/** The newborn skill a "merge" verdict produces: a hybrid character built from
 * its parents (A's head, B's body, both colors), plus the model-written skill
 * file ready to download and install in place of the members. */
export function FusionCard({ merged, parents }: { merged: MergedSkill; parents: Warrior[] }) {
  const [pa, pb] = parents;
  const archA = pa?.appraisal?.archetype ?? "blade";
  const archB = pb?.appraisal?.archetype ?? "mage";
  const colorA = pa?.color ?? "#d65cff";
  const colorB = pb?.color ?? "#4ad6e8";

  function download() {
    // JSON.stringify keeps the YAML frontmatter safe for quotes/colons.
    const md = `---\nname: ${JSON.stringify(merged.name)}\ndescription: ${JSON.stringify(merged.description)}\n---\n\n${merged.body}\n`;
    const url = URL.createObjectURL(new Blob([md], { type: "text/markdown" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${merged.name}.md`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div
      className="warrior fusionborn"
      style={{ ["--accent" as string]: colorA, ["--accent2" as string]: colorB }}
    >
      <FusionFighter archA={archA} archB={archB} colorA={colorA} colorB={colorB} />
      <div className="wname">{merged.name}</div>
      <div className="wmeta">
        <span className="archchip fusionchip">FUSION</span>
      </div>
      <p className="creed" title={merged.description}>
        {merged.description}
      </p>
      <button className="download" onClick={download}>
        ↓ DOWNLOAD {merged.name}.md
      </button>
      <p className="unhatched">born of {parents.map((p) => p.name).join(" + ")} — install &amp; re-summon to appraise</p>
    </div>
  );
}
