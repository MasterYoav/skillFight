#!/usr/bin/env node
import { createProvider, type ProviderName } from "./providers/factory.js";
import { ProviderConformanceTest, formatReport } from "./conformance.js";

// ponytail: a real end-to-end health check for whatever provider is actually
// configured — run it against your own local server before filing a bug.
const name = (process.argv[2] as ProviderName) || "anthropic";
const model = process.argv[3];
const baseURL = process.argv[4];
const effort = process.argv[5];

console.log(`Diagnosing ${name}${model ? ` (${model})` : ""}${baseURL ? ` @ ${baseURL}` : ""}...\n`);

const provider = createProvider(name, model, baseURL, effort);
const report = await new ProviderConformanceTest(provider).run();
console.log(formatReport(report));
process.exit(report.ok ? 0 : 1);
