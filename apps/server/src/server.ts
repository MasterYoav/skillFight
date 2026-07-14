import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFile, readdir } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";
import { analyzeSources, routeSources, createProvider, type ProviderName, type SkillSource } from "@skillfight/core";

const PORT = Number(process.env.PORT) || 8787;
// Static root: the built web app, if present. `pnpm --filter @skillfight/web build`.
const WEB_DIR = fileURLToPath(new URL("../../web/dist", import.meta.url));

const MIME: Record<string, string> = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

const server = createServer(async (req, res) => {
  // ponytail: permissive CORS so the Vite dev server (5173) can call the API in
  // dev. Same-origin in prod (server serves the built app), so this is harmless.
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "content-type");
  if (req.method === "OPTIONS") return void res.writeHead(204).end();

  if (req.method === "POST" && req.url === "/api/analyze") return analyze(req, res);
  if (req.method === "POST" && req.url === "/api/route") return route(req, res);
  if (req.method === "GET" && req.url === "/api/local/models") return localModels(res);
  if (req.method === "GET" && req.url === "/api/providers") return providersInfo(res);
  if (req.method === "GET" && req.url === "/api/skills/local") return scanLocalSkills(res);
  if (req.method === "GET") return serveStatic(req.url ?? "/", res);
  res.writeHead(405).end();
});

async function analyze(req: IncomingMessage, res: ServerResponse) {
  try {
    const body = await readBody(req);
    const { skills, provider, model, baseURL, effort } = JSON.parse(body) as { skills?: SkillSource[]; provider?: ProviderName; model?: string; baseURL?: string; effort?: string };
    if (!Array.isArray(skills) || skills.length === 0) return json(res, 400, { error: "Send { skills: [{ name, content }] }." });
    const verdict = await analyzeSources(skills, createProvider(provider, model, baseURL, effort));
    json(res, 200, verdict);
  } catch (e) {
    json(res, 500, { error: e instanceof Error ? e.message : String(e) });
  }
}

async function route(req: IncomingMessage, res: ServerResponse) {
  try {
    const body = await readBody(req);
    const { skills, tasks, provider, model, baseURL, effort } = JSON.parse(body) as { skills?: SkillSource[]; tasks?: string[]; provider?: ProviderName; model?: string; baseURL?: string; effort?: string };
    if (!Array.isArray(skills) || skills.length === 0) return json(res, 400, { error: "Send { skills: [{ name, content }], tasks: [\"…\"] }." });
    const cleanTasks = (tasks ?? []).map((t) => String(t).trim()).filter(Boolean);
    if (cleanTasks.length === 0) return json(res, 400, { error: "Send at least one task string." });
    const report = await routeSources(skills, cleanTasks, createProvider(provider, model, baseURL, effort));
    json(res, 200, report);
  } catch (e) {
    json(res, 500, { error: e instanceof Error ? e.message : String(e) });
  }
}

interface LocalModel { id: string; baseURL: string; }

async function localModels(res: ServerResponse) {
  // Probe all three common local runtimes in parallel.
  const ollamaHost = process.env.OLLAMA_HOST || "http://localhost:11434";
  const lmHost    = process.env.LM_STUDIO_HOST || "http://localhost:1234";
  const omlxHost  = process.env.OMLX_HOST      || "http://127.0.0.1:8000";

  const probeOpenAI = async (base: string): Promise<LocalModel[]> => {
    // Try standard OpenAI /v1/models (works for LM Studio — no auth required).
    try {
      const r = await fetch(`${base}/v1/models`);
      if (r.ok) {
        const d = await r.json() as { data?: { id: string }[] };
        return (d.data ?? []).map(m => ({ id: m.id, baseURL: `${base}/v1` }));
      }
    } catch {}
    // Fallback: oMLX /health is public and exposes the loaded model without auth.
    try {
      const r = await fetch(`${base}/health`);
      if (r.ok) {
        const d = await r.json() as { default_model?: string };
        return d.default_model ? [{ id: d.default_model, baseURL: `${base}/v1` }] : [];
      }
    } catch {}
    return [];
  };

  const probeOllama = async (base: string): Promise<LocalModel[]> => {
    try {
      const r = await fetch(`${base}/api/tags`);
      if (!r.ok) return [];
      const d = await r.json() as { models?: { name: string }[] };
      return (d.models ?? []).map(m => ({ id: m.name, baseURL: `${base}/v1` }));
    } catch { return []; }
  };

  const all = (await Promise.all([
    probeOllama(ollamaHost),
    probeOpenAI(lmHost),
    probeOpenAI(omlxHost),
  ])).flat();

  // Deduplicate by id, first occurrence wins.
  const seen = new Set<string>();
  const models = all.filter(m => seen.has(m.id) ? false : (seen.add(m.id), true));
  json(res, 200, { models });
}

interface CloudModel { id: string; efforts: string[]; }
interface CloudProviderInfo { hasKey: boolean; models: CloudModel[]; }

/** Which cloud providers have credentials, and what models/efforts they offer.
 * ponytail: env-var keys only — `ant auth login` profiles aren't detected; add
 * profile probing if users ask for it. Model lists are the providers' first page. */
async function providersInfo(res: ServerResponse) {
  const [anthropic, openai] = await Promise.all([anthropicInfo(), openaiInfo()]);
  json(res, 200, { anthropic, openai });
}

async function anthropicInfo(): Promise<CloudProviderInfo> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return { hasKey: false, models: [] };
  try {
    const r = await fetch("https://api.anthropic.com/v1/models", {
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01" },
    });
    if (!r.ok) return { hasKey: true, models: [] };
    const d = await r.json() as { data?: { id: string; capabilities?: { effort?: Record<string, { supported?: boolean }> } }[] };
    const models = (d.data ?? []).map((m) => ({
      id: m.id,
      // the Models API reports per-level effort support; keep only supported levels
      efforts: ["low", "medium", "high", "xhigh", "max"].filter((l) => m.capabilities?.effort?.[l]?.supported),
    }));
    return { hasKey: true, models };
  } catch {
    return { hasKey: true, models: [] };
  }
}

async function openaiInfo(): Promise<CloudProviderInfo> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return { hasKey: false, models: [] };
  try {
    const r = await fetch("https://api.openai.com/v1/models", {
      headers: { authorization: `Bearer ${key}` },
    });
    if (!r.ok) return { hasKey: true, models: [] };
    const d = await r.json() as { data?: { id: string }[] };
    const chatty = (d.data ?? [])
      .map((m) => m.id)
      .filter((id) => /^(gpt-[45]|o[134])/.test(id) && !/audio|realtime|tts|transcribe|image|embed|moderation|search|dall-e/.test(id))
      .sort();
    // ponytail: OpenAI's list API carries no capability info — effort support is
    // inferred from the model family (gpt-5* adds "minimal"; o-series are reasoning).
    const models = chatty.map((id) => ({
      id,
      efforts: id.startsWith("gpt-5") ? ["minimal", "low", "medium", "high"] : /^o\d/.test(id) ? ["low", "medium", "high"] : [],
    }));
    return { hasKey: true, models };
  } catch {
    return { hasKey: true, models: [] };
  }
}

async function scanLocalSkills(res: ServerResponse) {
  const dir = process.env.CLAUDE_SKILLS_PATH || join(homedir(), ".claude", "skills");
  try {
    const files = (await readdir(dir, { recursive: true }) as string[]).filter(f => f.endsWith(".md"));
    const skills = await Promise.all(
      files.map(async (rel) => ({ name: rel, content: await readFile(join(dir, rel), "utf-8") })),
    );
    json(res, 200, { skills });
  } catch {
    json(res, 200, { skills: [] });
  }
}

async function serveStatic(url: string, res: ServerResponse) {
  // Strip query, prevent path traversal, default to index.html (SPA).
  const clean = normalize(decodeURIComponent(url.split("?")[0])).replace(/^(\.\.[/\\])+/, "");
  const rel = clean === "/" ? "index.html" : clean.replace(/^\//, "");
  const file = join(WEB_DIR, rel);
  try {
    const data = await readFile(file);
    res.writeHead(200, { "content-type": MIME[extname(file)] ?? "application/octet-stream" }).end(data);
  } catch {
    // SPA fallback / no build present.
    try {
      res.writeHead(200, { "content-type": "text/html" }).end(await readFile(join(WEB_DIR, "index.html")));
    } catch {
      json(res, 404, { error: "Web app not built. Run `pnpm --filter @skillfight/web build`, or use the Vite dev server." });
    }
  }
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (c) => {
      data += c;
      if (data.length > 5_000_000) reject(new Error("Payload too large.")); // ponytail: 5MB cap
    });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

function json(res: ServerResponse, status: number, obj: unknown) {
  res.writeHead(status, { "content-type": "application/json" }).end(JSON.stringify(obj));
}

server.listen(PORT, () => console.log(`skillfight server on http://localhost:${PORT}`));
