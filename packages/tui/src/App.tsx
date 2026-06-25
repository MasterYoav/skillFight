import { useEffect, useState } from "react";
import { Box, Text, useApp } from "ink";
import { analyzePath, createProvider, type ProviderName, type Verdict } from "@skillfight/core";
import { Arena } from "./Arena.js";

const FRAMES = ["◐", "◓", "◑", "◒"];

/** Loads + analyzes a skills path, showing a spinner, then renders the Arena. */
export function App({ path, provider }: { path: string; provider?: ProviderName }) {
  const { exit } = useApp();
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    analyzePath(path, createProvider(provider))
      .then(setVerdict)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, [path, provider]);

  useEffect(() => {
    if (verdict || error) {
      exit();
      return;
    }
    const t = setInterval(() => setFrame((f) => (f + 1) % FRAMES.length), 120);
    return () => clearInterval(t);
  }, [verdict, error, exit]);

  if (error) {
    return (
      <Box paddingX={1}>
        <Text color="red">✗ {error}</Text>
      </Box>
    );
  }
  if (!verdict) {
    return (
      <Box paddingX={1}>
        <Text color="magentaBright">{FRAMES[frame]} </Text>
        <Text>skills are entering the arena…</Text>
      </Box>
    );
  }
  return <Arena verdict={verdict} />;
}
