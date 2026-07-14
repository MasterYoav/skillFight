import type { Verdict, RoutingReport } from "@skillfight/core";

export type ProviderChoice = "anthropic" | "openai" | "local";

export interface SkillSource {
  name: string;
  content: string;
}

export interface LocalModel {
  id: string;
  baseURL: string; // full OpenAI-compatible base, e.g. http://127.0.0.1:8000/v1
}

export interface CloudModel {
  id: string;
  /** Effort levels this model supports; empty = no effort picker. */
  efforts: string[];
}

export interface CloudProviderInfo {
  hasKey: boolean;
  models: CloudModel[];
}

export interface ProvidersInfo {
  anthropic: CloudProviderInfo;
  openai: CloudProviderInfo;
}

/** What cloud credentials the server holds and which models/efforts they unlock. */
export async function providersInfo(): Promise<ProvidersInfo> {
  const empty = { hasKey: false, models: [] };
  const res = await fetch("/api/providers");
  if (!res.ok) return { anthropic: empty, openai: empty };
  return (await res.json().catch(() => ({ anthropic: empty, openai: empty }))) as ProvidersInfo;
}

/** POST the raw skill sources to the server, which parses + analyzes them with
 * the chosen provider (the API key lives on the server, never in the browser). */
export async function analyze(sources: SkillSource[], provider: ProviderChoice, model?: string, baseURL?: string, effort?: string): Promise<Verdict> {
  const res = await fetch("/api/analyze", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ skills: sources, provider, model, baseURL, effort }),
  });
  const data = await res.json().catch(() => ({ error: `Server error ${res.status}` }));
  if (!res.ok) throw new Error(data.error || `Server error ${res.status}`);
  return data as Verdict;
}

/** Route a set of tasks against the skill roster: which skill fires for each,
 * where the gaps and contested triggers are. Same provider plumbing as analyze. */
export async function route(sources: SkillSource[], tasks: string[], provider: ProviderChoice, model?: string, baseURL?: string, effort?: string): Promise<RoutingReport> {
  const res = await fetch("/api/route", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ skills: sources, tasks, provider, model, baseURL, effort }),
  });
  const data = await res.json().catch(() => ({ error: `Server error ${res.status}` }));
  if (!res.ok) throw new Error(data.error || `Server error ${res.status}`);
  return data as RoutingReport;
}

/** Fetch locally-loaded models from all detected local runtimes (Ollama, LM Studio, oMLX). */
export async function listLocalModels(): Promise<LocalModel[]> {
  const res = await fetch("/api/local/models");
  if (!res.ok) return [];
  const data = await res.json().catch(() => ({})) as { models?: LocalModel[] };
  return data.models ?? [];
}

/** Scan ~/.claude/skills on the server machine for skill .md files. */
export async function scanLocalSkills(): Promise<SkillSource[]> {
  const res = await fetch("/api/skills/local");
  if (!res.ok) return [];
  const data = await res.json().catch(() => ({})) as { skills?: SkillSource[] };
  return data.skills ?? [];
}
