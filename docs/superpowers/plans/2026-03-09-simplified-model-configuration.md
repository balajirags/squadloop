# Simplified Per-Agent Model Configuration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Centralize 100% of per-agent model lookups inside `.pi/team-config.json` under `"models"`, sync Standalone Mode prompt templates, auto-bootstrap `.pi/models.json` on `init`, and clean up legacy frontmatter comments.

**Architecture:** Implement `ModelResolver` to parse `.pi/team-config.json` with comment-stripping parser and graceful fault tolerance. Implement `PromptSyncEngine` to auto-generate `.pi/prompts/<role>.md` templates with model frontmatter for Standalone Mode. Update drivers (`TmuxDriver`, `HerdrDriver`, `ITerm2Driver`, `HeadlessAdapter`) to use `ModelResolver`. Update `squadloop init` and README documentation.

**Tech Stack:** TypeScript (Node.js ES2022 / NodeNext modules), `@earendil-works/pi-coding-agent`.

**Spec:** `docs/superpowers/specs/2026-03-09-simplified-model-configuration-design.md`

## Global Constraints
- Single source of truth for agent models is `.pi/team-config.json` → `"models"`
- Model strings follow `provider/model` pattern (e.g. `anthropic/claude-3-7-sonnet`, `google/gemini-2.5-flash`, `ollama/gemma4`)
- Default value is `""` (empty string)
- Fault tolerant: missing keys or missing `"models"` section default safely to `""` without errors
- `squadloop init` auto-copies `.pi/models.example.json` to `.pi/models.json` if not present

---

### Task 1: `ModelResolver` & JSON Comment Stripping Utility

**Files:**
- Create: `.pi/extensions/models/model-resolver.ts`
- Test: `.pi/extensions/models/model-resolver.ts` (inline / compilation check)

**Interfaces:**
- Consumes: `.pi/team-config.json`
- Produces: `ModelResolver.getModel(role: string): string | null`

- [ ] **Step 1: Write `model-resolver.ts`**

Create `.pi/extensions/models/model-resolver.ts`:
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
      // Graceful fallback to null on parse error or missing section
    }

    return null;
  }
}
```

- [ ] **Step 2: Verify Build**

Run: `npm run build`
Expected: PASS with 0 errors.

- [ ] **Step 3: Commit**

```bash
git add .pi/extensions/models/model-resolver.ts
git commit -m "feat: add ModelResolver for centralized model configuration lookup"
```

---

### Task 2: `PromptSyncEngine` & Standalone Mode Sync

**Files:**
- Create: `.pi/extensions/models/prompt-sync.ts`

**Interfaces:**
- Consumes: `ModelResolver`, `.pi/agents/*.md`
- Produces: `PromptSyncEngine.syncAllPrompts(): void`

- [ ] **Step 1: Write `prompt-sync.ts`**

Create `.pi/extensions/models/prompt-sync.ts`:
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
        const rawContent = fs.readFileSync(agentFile, "utf-8");
        // Strip any leading YAML frontmatter
        agentContent = rawContent.replace(/^---[\s\S]*?---\n?/, "").trim();
      }

      const frontmatterLines = [
        "---",
        `description: Switch to ${role.toUpperCase()} persona`
      ];
      if (model) {
        frontmatterLines.push(`model: ${model}`);
      }
      frontmatterLines.push("---");

      const fileContent = `${frontmatterLines.join("\n")}\n\n${agentContent}\n`;
      fs.writeFileSync(targetPromptFile, fileContent, "utf-8");
    }
  }
}
```

- [ ] **Step 2: Verify Build**

Run: `npm run build`
Expected: PASS with 0 errors.

- [ ] **Step 3: Commit**

```bash
git add .pi/extensions/models/prompt-sync.ts
git commit -m "feat: add PromptSyncEngine to sync Standalone Mode prompt templates"
```

---

### Task 3: Refactor Terminal Drivers to Use `ModelResolver`

**Files:**
- Modify: `.pi/extensions/drivers/tmux-driver.ts`
- Modify: `.pi/extensions/drivers/iterm2-driver.ts`
- Modify: `.pi/extensions/workspaces/headless-adapter.ts`

**Interfaces:**
- Consumes: `ModelResolver`
- Produces: Drivers using `ModelResolver.getModel(role)`

- [ ] **Step 1: Update `TmuxDriver` in `tmux-driver.ts`**

Update `getAgentCommand(role: string)` in `.pi/extensions/drivers/tmux-driver.ts`:
```typescript
import { ModelResolver } from "./model-resolver.js"; // or from ../models/model-resolver.js

function getAgentCommand(role: string): string {
  const model = ModelResolver.getModel(role);
  const agentFile = `.pi/agents/${role}.md`;
  const modelFlag = model ? ` --model "${model}"` : "";
  return `pi --approve --append-system-prompt "${agentFile}"${modelFlag}; exec bash`;
}
```

- [ ] **Step 2: Update `ITerm2Driver` in `iterm2-driver.ts`**

Update `getAgentCommand(role: string)` in `.pi/extensions/drivers/iterm2-driver.ts`:
```typescript
import { ModelResolver } from "../models/model-resolver.js";

function getAgentCommand(role: string): string {
  const model = ModelResolver.getModel(role);
  const agentFile = `.pi/agents/${role}.md`;
  const modelFlag = model ? ` --model "${model}"` : "";
  return `pi --approve --append-system-prompt "${agentFile}"${modelFlag}`;
}
```

- [ ] **Step 3: Update `HeadlessAdapter` in `headless-adapter.ts`**

Update `resolveRoleModel(role: string)` in `.pi/extensions/workspaces/headless-adapter.ts`:
```typescript
import { ModelResolver } from "../models/model-resolver.js";

function resolveRoleModel(role: string): string | null {
  return ModelResolver.getModel(role);
}
```

- [ ] **Step 4: Verify Build**

Run: `npm run build`
Expected: PASS with 0 errors.

- [ ] **Step 5: Commit**

```bash
git add .pi/extensions/drivers/tmux-driver.ts .pi/extensions/drivers/iterm2-driver.ts .pi/extensions/workspaces/headless-adapter.ts
git commit -m "refactor: update drivers to use ModelResolver for per-agent model lookup"
```

---

### Task 4: `squadloop init` & `bin/squadloop.js` Integration

**Files:**
- Modify: `bin/squadloop.js`

**Interfaces:**
- Consumes: `PromptSyncEngine`
- Produces: Updated `squadloop init`, `squadloop start`, `squadloop config` auto-syncing prompts and auto-creating `models.json`

- [ ] **Step 1: Update `bin/squadloop.js`**

Modify `bin/squadloop.js`:
1. Call `PromptSyncEngine.syncAllPrompts()` in `handleStart()`, `handleResume()`, and `handleConfig()`.
2. In `handleInit()`:
   - Create `.pi/team-config.json` with `_modelExamples` hints and empty `models` map if missing.
   - Automatically copy `.pi/models.example.json` to `.pi/models.json` if `.pi/models.json` does not exist.
   - Call `PromptSyncEngine.syncAllPrompts()`.

Code block:
```javascript
import { PromptSyncEngine } from "../dist/.pi/extensions/models/prompt-sync.js";

function handleInit() {
  printLogo();
  console.log("📦 Bootstrapping SquadLoop configuration and template files...");
  const defaultConfig = {
    exMode: "team",
    driver: "tmux",
    hitl: "loop",
    layout: "panes",
    _modelExamples: {
      anthropic: "anthropic/claude-3-7-sonnet",
      google: "google/gemini-2.5-flash",
      openai: "openai/gpt-4o",
      deepseek: "deepseek/deepseek-reasoner",
      openrouter: "openrouter/anthropic/claude-3.7-sonnet",
      ollama: "ollama/gemma4"
    },
    models: {
      orchestrator: "",
      ba: "",
      developer: "",
      qa: "",
      reviewer: ""
    }
  };

  const configPath = path.join(process.cwd(), ".pi", "team-config.json");
  if (!fs.existsSync(configPath)) {
    saveConfig(defaultConfig);
    console.log("  ✅ Created .pi/team-config.json with model hints.");
  } else {
    console.log("  ℹ️  .pi/team-config.json already exists.");
  }

  // Auto-copy models.example.json to models.json if missing
  const modelsExamplePath = path.join(process.cwd(), ".pi", "models.example.json");
  const modelsJsonPath = path.join(process.cwd(), ".pi", "models.json");
  if (fs.existsSync(modelsExamplePath) && !fs.existsSync(modelsJsonPath)) {
    fs.copyFileSync(modelsExamplePath, modelsJsonPath);
    console.log("  ✅ Auto-created .pi/models.json from template.");
  }

  PromptSyncEngine.syncAllPrompts();
  console.log("  ✅ Synced .pi/prompts/ persona templates.");
  console.log("🎉 SquadLoop initialization complete!");
}
```

- [ ] **Step 2: Verify Build & Run `squadloop config`**

Run: `npm run build && ./bin/squadloop.js config`
Expected: Output displays JSON with `_modelExamples` and `"models"`.

- [ ] **Step 3: Commit**

```bash
git add bin/squadloop.js
git commit -m "feat: integrate PromptSyncEngine and auto-create models.json in squadloop init"
```

---

### Task 5: Clean Up Legacy `.pi/agents/*.md` Comments & Update `README.md`

**Files:**
- Modify: `.pi/agents/orchestrator.md`, `ba.md`, `developer.md`, `qa.md`, `reviewer.md`
- Modify: `README.md`

- [ ] **Step 1: Clean `.pi/agents/*.md`**

Remove any `# model: ...` comments from frontmatter in `.pi/agents/orchestrator.md`, `ba.md`, `developer.md`, `qa.md`, `reviewer.md`.

- [ ] **Step 2: Update `README.md`**

Update Configuration section in `README.md` to reflect the new `_modelExamples` and `"models"` configuration under `.pi/team-config.json`.

- [ ] **Step 3: Verify Build**

Run: `npm run build`
Expected: PASS with 0 errors.

- [ ] **Step 4: Commit**

```bash
git add .pi/agents/*.md README.md
git commit -m "docs: clean legacy agent frontmatter comments and update README configuration guide"
```

---

### Task 6: End-to-End Verification

- [ ] **Step 1: Run `npm run build`**
Expected: PASS with 0 errors.

- [ ] **Step 2: Test Fault Tolerance (Missing role key)**
Edit `.pi/team-config.json` to remove `"developer"` key from `"models"`. Run `npm run build` and `./bin/squadloop.js config`.
Expected: `ModelResolver.getModel("developer")` returns `null` safely without error.

- [ ] **Step 3: Test Model Assignment & Prompt Sync**
Set `"developer": "anthropic/claude-3-7-sonnet"` in `.pi/team-config.json`.
Run `./bin/squadloop.js config`. Check `.pi/prompts/dev.md`.
Expected: `.pi/prompts/dev.md` includes `model: anthropic/claude-3-7-sonnet` in frontmatter.

- [ ] **Step 4: Commit Final Updates**

```bash
git add .
git commit -m "chore: complete simplified per-agent model configuration implementation"
```
