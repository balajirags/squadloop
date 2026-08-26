# Design Spec: SquadLoop — Simplified Model Configuration & Auto-Sync Engine

**Date**: 2026-03-09  
**Status**: Implemented  
**Target Platform**: SquadLoop (`squadloop` CLI, `@earendil-works/pi-coding-agent`)

---

## 1. Executive Summary

This design specification details the simplified model configuration architecture for SquadLoop.

Model lookups for all 5 agent roles (`orchestrator`, `ba`, `developer`, `qa`, `reviewer`) are centralized 100% inside `.pi/team-config.json` under `"models"`.

Key Improvements:
1. **Single Source of Truth**: Configured directly in `.pi/team-config.json` under `"models"`. Legacy frontmatter in `.pi/agents/*.md` is removed.
2. **Comment/Hint Friendly**: `.pi/team-config.json` includes `_modelExamples` hints and JSON comment-stripping parser.
3. **Graceful Fault Tolerance**: Defaults to `""` if keys/sections are missing. Missing keys do not crash the system.
4. **Standalone Mode Sync**: Typing `/dev`, `/ba`, etc. switches active model via auto-synced `.pi/prompts/<role>.md` frontmatter.
5. **Zero-Copy Cloud Models**: Standard cloud providers (`anthropic/`, `google/`, `openai/`, `deepseek/`, `openrouter/`) read API keys from environment variables. `models.json` is auto-created during `squadloop init` for local providers (`ollama/`, `llmstudio/`).

---

## 2. Architecture & Components

```
                     ┌──────────────────────────┐
                     │   .pi/team-config.json   │
                     └─────────────┬────────────┘
                                   │
                           ┌───────┴────────┐
                           ▼                ▼
                 ┌──────────────────┐  ┌──────────────────┐
                 │  ModelResolver   │  │ PromptSyncEngine │
                 └─────────┬────────┘  └────────┬─────────┘
                           │                    │
            ┌──────────────┴───────┐            │ Syncs frontmatter
            ▼                      ▼            ▼
   ┌─────────────────┐    ┌─────────────────┐ ┌──────────────────┐
   │   TeamStrategy  │    │ StandaloneStrat │ │ .pi/prompts/*.md │
   │ (--model flag)  │    │ (Direct shell)  │ │ (/dev, /ba, etc.)│
   └─────────────────┘    └─────────────────┘ └──────────────────┘
```

### 2.1 File Map
- `.pi/extensions/models/model-resolver.ts`: Reads `.pi/team-config.json` and resolves model string per role.
- `.pi/extensions/models/prompt-sync.ts`: Syncs `.pi/prompts/<role>.md` files with model frontmatter.
- `.pi/extensions/drivers/tmux-driver.ts` & others: Obtains role model from `ModelResolver`.
- `bin/squadloop.js`: Calls `PromptSyncEngine.sync()` on start/config/init.

---

## 3. Detailed Component Design

### 3.1 `ModelResolver` (`.pi/extensions/models/model-resolver.ts`)
```typescript
import * as fs from "fs";
import * as path from "path";

function stripJsonComments(jsonString: string): string {
  return jsonString.replace(/\\"|"(?:\\"|[^"])*"|(\/\/.*|\/\*[\s\S]*?\*\/)/g, (m, g) => (g ? "" : m));
}

export class ModelResolver {
  public static getModel(role: string): string | null {
    const configPath = path.join(process.cwd(), ".pi", "team-config.json");
    if (!fs.existsSync(configPath)) return null;

    try {
      const raw = fs.readFileSync(configPath, "utf-8");
      const cleaned = stripJsonComments(raw);
      const config = JSON.parse(cleaned);

      const modelVal = config.models?.[role];
      if (typeof modelVal === "string" && modelVal.trim() !== "") {
        return modelVal.trim();
      }
    } catch {
      // Return null on missing file or parse error
    }

    return null;
  }
}
```

### 3.2 `PromptSyncEngine` (`.pi/extensions/models/prompt-sync.ts`)
```typescript
import * as fs from "fs";
import * as path from "path";
import { ModelResolver } from "./model-resolver.js";

const ROLES = ["orchestrator", "ba", "developer", "qa", "reviewer"];

export class PromptSyncEngine {
  public static syncAllPrompts(): void {
    const promptsDir = path.join(process.cwd(), ".pi", "prompts");
    fs.mkdirSync(promptsDir, { recursive: true });

    for (const role of ROLES) {
      const model = ModelResolver.getModel(role);
      const agentFile = path.join(process.cwd(), ".pi", "agents", `${role}.md`);
      const targetPromptFile = path.join(promptsDir, `${role}.md`);

      let agentContent = "";
      if (fs.existsSync(agentFile)) {
        agentContent = fs.readFileSync(agentFile, "utf-8").replace(/^---[\s\S]*?---\n?/, "");
      }

      const frontmatter = [
        "---",
        `description: Switch to ${role.toUpperCase()} persona`,
        model ? `model: ${model}` : null,
        "---",
        ""
      ].filter(Boolean).join("\n");

      fs.writeFileSync(targetPromptFile, `${frontmatter}\n${agentContent}`, "utf-8");
    }
  }
}
```

---

## 4. Verification & Testing

1. **Unit & Integration Verification**:
   - `ModelResolver.getModel("developer")`: Returns `"anthropic/claude-3-7-sonnet"` when configured, and `null` when `""` or missing.
   - Fault Tolerance Test: Delete `"developer"` key from `"models"` in `.pi/team-config.json` → returns `null` without error.
   - `PromptSyncEngine.syncAllPrompts()`: Verifies `.pi/prompts/dev.md` gets `model: anthropic/claude-3-7-sonnet` when configured.
   - `squadloop init`: Confirms `.pi/models.json` is created from `models.example.json`.
