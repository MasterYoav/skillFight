# Graph Report - /Users/yoavperetz/Developer/skillfight  (2026-06-28)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 261 nodes · 372 edges · 20 communities (17 shown, 3 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 5 edges (avg confidence: 0.92)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `7235f267`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]

## God Nodes (most connected - your core abstractions)
1. `Provider` - 11 edges
2. `compilerOptions` - 11 edges
3. `scripts` - 10 edges
4. `parseSkillSource()` - 8 edges
5. `analyzeSkills()` - 7 edges
6. `loadSkills()` - 7 edges
7. `ProviderPrompt` - 7 edges
8. `AnthropicProvider` - 6 edges
9. `OpenAICompatibleProvider` - 6 edges
10. `Skill` - 6 edges

## Surprising Connections (you probably didn't know these)
- `analyze()` --calls--> `analyzeSources()`  [INFERRED]
  apps/server/src/server.ts → packages/core/src/engine.ts
- `analyze()` --calls--> `createProvider()`  [INFERRED]
  apps/server/src/server.ts → packages/core/src/providers/factory.ts
- `AnthropicProvider` --implements--> `Provider`  [INFERRED]
  packages/core/src/providers/factory.ts → packages/core/src/types.ts
- `OpenAICompatibleProvider` --implements--> `Provider`  [INFERRED]
  packages/core/src/providers/factory.ts → packages/core/src/types.ts
- `Entry` --references--> `SkillSource`  [EXTRACTED]
  apps/web/src/App.tsx → apps/web/src/api.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Provider Implementations** — packages_core_src_providers_AnthropicProvider, packages_core_src_providers_OpenAICompatibleProvider, packages_core_src_types_Provider [INFERRED 0.75]
- **Core Package Components** — packages_core, packages_core_src_providers_factory, packages_core_src_types, packages_core_src_types_Verdict, packages_core_src_types_Skill, packages_core_src_types_Provider, packages_core_src_providers_AnthropicProvider, packages_core_src_providers_OpenAICompatibleProvider [INFERRED 0.75]
- **Web App Components** — apps_web, apps_web_src_main_tsx [INFERRED 0.75]

## Communities (20 total, 3 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.12
Nodes (20): analyze(), listLocalModels(), LocalModel, ProviderChoice, scanLocalSkills(), SkillSource, Entry, seed() (+12 more)

### Community 1 - "Community 1"
Cohesion: 0.16
Nodes (17): CONTRIBUTING, Architecture, Progress, provider, AnthropicProvider, OpenAICompatibleProvider, AnthropicProvider, parseAnthropicResponse() (+9 more)

### Community 2 - "Community 2"
Cohesion: 0.19
Nodes (19): analyzePath(), analyzeSkills(), analyzeSources(), parseVerdict(), SkillSource, skills, findMarkdownFiles(), loadSkills() (+11 more)

### Community 3 - "Community 3"
Cohesion: 0.10
Nodes (21): default, dependencies, @anthropic-ai/sdk, gray-matter, openai, devDependencies, tsx, @types/node (+13 more)

### Community 4 - "Community 4"
Cohesion: 0.10
Nodes (19): dependencies, react, react-dom, @skillfight/core, devDependencies, @types/react, @types/react-dom, typescript (+11 more)

### Community 5 - "Community 5"
Cohesion: 0.10
Nodes (19): bin, skillfight, dependencies, ink, react, @skillfight/core, devDependencies, tsx (+11 more)

### Community 6 - "Community 6"
Cohesion: 0.11
Nodes (17): bin, skillfight-server, dependencies, @skillfight/core, devDependencies, tsx, @types/node, typescript (+9 more)

### Community 7 - "Community 7"
Cohesion: 0.12
Nodes (16): description, license, name, private, scripts, analyze, build, dev (+8 more)

### Community 8 - "Community 8"
Cohesion: 0.18
Nodes (6): App(), FRAMES, Arena(), IMPORTANCE_COLOR, provider, DEMO_VERDICT

### Community 9 - "Community 9"
Cohesion: 0.15
Nodes (12): compilerOptions, declaration, esModuleInterop, forceConsistentCasingInFileNames, lib, module, moduleResolution, skipLibCheck (+4 more)

### Community 10 - "Community 10"
Cohesion: 0.27
Nodes (10): analyze(), json(), LocalModel, localModels(), MIME, readBody(), scanLocalSkills(), server (+2 more)

### Community 11 - "Community 11"
Cohesion: 0.25
Nodes (7): compilerOptions, jsx, lib, noEmit, types, extends, include

### Community 12 - "Community 12"
Cohesion: 0.25
Nodes (7): compilerOptions, outDir, rootDir, types, exclude, extends, include

### Community 13 - "Community 13"
Cohesion: 0.25
Nodes (7): compilerOptions, jsx, outDir, rootDir, types, extends, include

### Community 14 - "Community 14"
Cohesion: 0.29
Nodes (6): compilerOptions, outDir, rootDir, types, extends, include

### Community 15 - "Community 15"
Cohesion: 0.29
Nodes (5): Web App, App(), Core Engine, TUI, README

## Knowledge Gaps
- **127 isolated node(s):** `name`, `version`, `private`, `type`, `skillfight-server` (+122 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `README` connect `Community 15` to `Community 1`?**
  _High betweenness centrality (0.073) - this node is a cross-community bridge._
- **Why does `App()` connect `Community 15` to `Community 0`?**
  _High betweenness centrality (0.064) - this node is a cross-community bridge._
- **Why does `analyze()` connect `Community 10` to `Community 1`, `Community 2`?**
  _High betweenness centrality (0.027) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `Provider` (e.g. with `AnthropicProvider` and `OpenAICompatibleProvider`) actually correct?**
  _`Provider` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `name`, `version`, `private` to the rest of the system?**
  _127 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.11724137931034483 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.09523809523809523 - nodes in this community are weakly interconnected._