#!/usr/bin/env node
import { useEffect } from "react";
import { render, useApp } from "ink";
import type { ProviderName } from "@skillfight/core";
import { App } from "./App.js";
import { Arena } from "./Arena.js";
import { DEMO_VERDICT } from "./demo.js";

const arg = process.argv[2];
const provider = process.argv[3] as ProviderName | undefined;

/** Render the final frame, then exit — so the static output stays in scrollback
 * like a normal CLI instead of holding the terminal open. */
function Demo() {
  const { exit } = useApp();
  useEffect(() => exit(), [exit]);
  return <Arena verdict={DEMO_VERDICT} />;
}

if (arg === "--demo") {
  render(<Demo />);
} else if (!arg) {
  console.error("usage: skillfight <path-to-skills> [anthropic|openai|local]   (or --demo)");
  process.exit(1);
} else {
  render(<App path={arg} provider={provider} />);
}
