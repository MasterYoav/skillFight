import { Box, Text } from "ink";
import type { Conflict, SkillVerdict, Verdict } from "@skillfight/core";

/** Pure presentation of a Verdict as the ASCII fighting arena. Same shape the
 * web app (Step 5) will render. */
export function Arena({ verdict }: { verdict: Verdict }) {
  const fights = verdict.conflicts.length;
  const u = verdict.usage ?? {};
  return (
    <Box flexDirection="column" paddingX={1}>
      <Box marginBottom={1}>
        <Text bold color="magentaBright">
          ⚔ SKILLFIGHT
        </Text>
        <Text dimColor>
          {"   "}
          {verdict.skills.length} skills · {fights} {fights === 1 ? "fight" : "fights"} ·{" "}
          {u.inputTokens ?? "n/a"}↑ {u.outputTokens ?? "n/a"}↓ tok
        </Text>
      </Box>

      <Box borderStyle="round" borderColor="gray" flexDirection="column" paddingX={1}>
        <Text bold>ARENA</Text>
        {fights === 0 ? (
          <Text dimColor>no conflicts — every skill lives in peace</Text>
        ) : (
          verdict.conflicts.map((c, i) => <Fight key={i} conflict={c} />)
        )}
      </Box>

      <Box marginTop={1} flexDirection="column">
        <Text bold>SKILLS</Text>
        {verdict.skills.map((s) => (
          <SkillCard key={s.name} skill={s} />
        ))}
      </Box>

      {verdict.recommendations.length > 0 && (
        <Box marginTop={1} flexDirection="column">
          <Text bold>RECOMMENDATIONS</Text>
          {verdict.recommendations.map((r, i) => (
            <Text key={i}>
              <Text color="cyan">• </Text>
              {r}
            </Text>
          ))}
        </Box>
      )}
    </Box>
  );
}

function Fight({ conflict }: { conflict: Conflict }) {
  const members = conflict.members;
  if (conflict.verdict === "winner") {
    const winner = conflict.winner;
    return (
      <Box flexDirection="column" marginTop={1}>
        <Text>
          {members.map((m, i) => (
            <Text key={m}>
              {i > 0 && <Text color="redBright"> ⚔ </Text>}
              <Text color={m === winner ? "greenBright" : "red"} strikethrough={m !== winner} bold={m === winner}>
                {m}
              </Text>
            </Text>
          ))}
          <Text color="greenBright"> → KO, {winner} wins</Text>
        </Text>
        <Text dimColor>  {conflict.rationale}</Text>
      </Box>
    );
  }
  const tag = conflict.verdict === "merge"
    ? { sep: " + ", color: "yellow" as const, note: "→ merge into one" }
    : { sep: " | ", color: "cyan" as const, note: "→ coexist in peace" };
  return (
    <Box flexDirection="column" marginTop={1}>
      <Text>
        <Text color={tag.color}>{members.join(tag.sep)}</Text>
        <Text color={tag.color}> {tag.note}</Text>
      </Text>
      <Text dimColor>  {conflict.rationale}</Text>
    </Box>
  );
}

const IMPORTANCE_COLOR = ["gray", "gray", "white", "yellow", "redBright"] as const;

function SkillCard({ skill }: { skill: SkillVerdict }) {
  const color = IMPORTANCE_COLOR[Math.min(4, Math.max(0, skill.importance - 1))];
  return (
    <Box flexDirection="column" marginTop={1}>
      <Text>
        <Text color={color} bold>
          [{skill.importance}]
        </Text>{" "}
        <Text bold>{skill.name}</Text>
        {skill.problems.length > 0 && <Text dimColor>  solves: {skill.problems.join(", ")}</Text>}
      </Text>
      {skill.pros.map((p, i) => (
        <Text key={`p${i}`}>
          <Text color="green">  + </Text>
          {p}
        </Text>
      ))}
      {skill.cons.map((c, i) => (
        <Text key={`c${i}`}>
          <Text color="red">  - </Text>
          {c}
        </Text>
      ))}
    </Box>
  );
}
