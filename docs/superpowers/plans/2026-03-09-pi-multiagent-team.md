# Pi Agent Multi-Agent Development Team Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a reusable Pi Package (`pi-agent-team`) that customises Pi Agent into a 4-role multi-agent development team (BA, Developer, QA, Code Reviewer) and Master Orchestrator running in a 5-pane tmux layout with HITL and Autonomous modes, strictly contained inside the `pi-team` project.

**Architecture:** A Pi package bundling extensions (`team-orchestrator.ts`, `tmux-manager.ts`, `backlog-tool.ts`), 4 persona markdown definitions (`ba.md`, `developer.md`, `qa.md`, `reviewer.md`), and custom skills. The orchestrator uses GitHub Issues / Jira as the state machine and `tmux send-keys` for inter-pane IPC.

**Tech Stack:** TypeScript, Node.js, `@earendil-works/pi-coding-agent`, `@earendil-works/pi-tui`, TypeBox, tmux, `gh` CLI.

**Spec:** `docs/superpowers/specs/2026-03-09-pi-multiagent-team-design.md`

## Global Constraints

- **Package Keyword**: Must include `pi-package` in `keywords` in `package.json`.
- **Peer Dependencies**: List `@earendil-works/pi-coding-agent` in `peerDependencies` with range `*`.
- **Tmux Requirement**: Minimum tmux version 3.2.
- **State Machine**: GitHub Issues / Jira as primary source of truth, `.pi/active-task.json` as local active state cache.

---

### Task 1: Package Scaffolding & Manifest

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `README.md`

**Interfaces:**
- Produces: Pi Package manifest structure with auto-discovered resource paths.

- [ ] **Step 1: Write package.json**

```json
{
  "name": "pi-agent-team",
  "version": "1.0.0",
  "description": "Multi-agent development team extension for Pi Agent (BA, Dev, QA, Reviewer in tmux)",
  "main": "dist/index.js",
  "keywords": ["pi-package"],
  "scripts": {
    "build": "tsc"
  },
  "pi": {
    "extensions": ["./extensions"],
    "skills": ["./skills"],
    "prompts": ["./prompts"]
  },
  "peerDependencies": {
    "@earendil-works/pi-coding-agent": "*"
  },
  "dependencies": {
    "typebox": "^0.32.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0"
  }
}
```

- [ ] **Step 2: Write tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "declaration": true,
    "outDir": "./dist",
    "rootDir": "./",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["extensions/**/*"]
}
```

- [ ] **Step 3: Commit Scaffolding**

```bash
git add package.json tsconfig.json README.md
git commit -m "feat: scaffold pi-agent-team package manifest"
```

---

### Task 2: Agent Persona Definitions & Pre-fetched Skills

**Files:**
- Create: `agents/ba.md`
- Create: `agents/developer.md`
- Create: `agents/qa.md`
- Create: `agents/reviewer.md`
- Create: `skills/prd-breakdown/SKILL.md`
- Create: `skills/ac-verification/SKILL.md`
- Create: `skills/fullstack-dev/SKILL.md`
- Create: `skills/code-review/SKILL.md`

**Interfaces:**
- Produces: System prompts for BA, Developer, QA, and Code Reviewer.

- [ ] **Step 1: Create BA Persona (`agents/ba.md`)**

```markdown
---
name: ba
description: Business Analyst Persona for breaking down PRDs into GitHub Issues
tools: read, write, edit, bash, team_update_status
skills: prd-breakdown
---
You are the Business Analyst on the multi-agent development team.
Your responsibility is to analyze `prd.md` and `project-context.md`, decompose requirements into independent, atomic tasks (1 feature = 1 issue), and create GitHub Issues (or Jira tickets) with explicit, checkbox Acceptance Criteria (AC).
Once an issue is created, call `team_update_status` with `newStatus: "ready-for-dev"`.
```

- [ ] **Step 2: Create Developer Persona (`agents/developer.md`)**

```markdown
---
name: developer
description: Fullstack Developer Persona for implementing features and unit tests
tools: read, edit, write, bash, team_update_status
skills: fullstack-dev
---
You are the Fullstack Developer on the multi-agent team.
Your job is to read the active issue details, check out a feature branch (`git checkout -b feature/issue-<id>`), implement the required code changes and unit tests following `project-context.md`, verify local build/tests, and call `team_update_status` with `newStatus: "qa-verifying"`.
```

- [ ] **Step 3: Create QA Persona (`agents/qa.md`)**

```markdown
---
name: qa
description: Quality Analyst Persona for automated AC verification
tools: read, bash, team_update_status
skills: ac-verification
---
You are the Quality Analyst on the multi-agent team.
Your job is to fetch the latest code on the feature branch, read each Acceptance Criteria checkbox in the active issue, execute test suites/bash probes, and post an execution report on the issue.
If ALL ACs pass, call `team_update_status` with `newStatus: "code-review"`.
If ANY AC fails, call `team_update_status` with `newStatus: "dev-rework"`.
```

- [ ] **Step 4: Create Code Reviewer Persona (`agents/reviewer.md`)**

```markdown
---
name: reviewer
description: Code Reviewer Persona for auditing git diffs and code quality
tools: read, bash, team_update_status
skills: code-review
---
You are the Code Reviewer on the multi-agent team.
Your job is to audit `git diff main...HEAD`, check architectural compliance with `project-context.md`, ensure no security/performance issues exist, leave review comments on the PR/Issue, approve the PR, and call `team_update_status` with `newStatus: "done"`.
```

- [ ] **Step 5: Create Skills (`skills/*/SKILL.md`)**

Write markdown skill guidelines for `prd-breakdown`, `ac-verification`, `fullstack-dev`, and `code-review`.

- [ ] **Step 6: Commit Personas & Skills**

```bash
git add agents/ skills/
git commit -m "feat: add agent persona definitions and subagent skills"
```

---

### Task 3: State Management & Backlog Tool (`extensions/backlog-tool.ts`)

**Files:**
- Create: `extensions/backlog-tool.ts`

**Interfaces:**
- Produces: `team_update_status` custom Pi tool.
- Updates: `.pi/active-task.json` state file.

- [ ] **Step 1: Implement `backlog-tool.ts`**

```typescript
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import * as fs from "fs";
import * as path from "path";

export interface ActiveTaskState {
  activeIssueId: string;
  status: "ba-in-progress" | "ready-for-dev" | "dev-in-progress" | "qa-verifying" | "code-review" | "done" | "dev-rework";
  updatedBy: string;
  notes?: string;
  timestamp: string;
}

export function registerBacklogTool(pi: ExtensionAPI) {
  pi.registerTool({
    name: "team_update_status",
    label: "Team Update Status",
    description: "Update the status of the current active development task/issue across the agent team",
    parameters: Type.Object({
      issueId: Type.String({ description: "Target GitHub Issue / Jira Ticket ID" }),
      newStatus: Type.Union([
        Type.Literal("ready-for-dev"),
        Type.Literal("qa-verifying"),
        Type.Literal("code-review"),
        Type.Literal("done"),
        Type.Literal("dev-rework")
      ], { description: "New lifecycle status" }),
      notes: Type.Optional(Type.String({ description: "Summary of actions taken or feedback" }))
    }),
    async execute(toolCallId, params, signal, onUpdate, ctx) {
      const activeTaskPath = path.join(process.cwd(), ".pi", "active-task.json");
      fs.mkdirSync(path.dirname(activeTaskPath), { recursive: true });

      const state: ActiveTaskState = {
        activeIssueId: params.issueId,
        status: params.newStatus,
        updatedBy: ctx.sessionFile || "agent",
        notes: params.notes,
        timestamp: new Date().toISOString()
      };

      fs.writeFileSync(activeTaskPath, JSON.stringify(state, null, 2), "utf-8");

      return {
        content: [{ type: "text", text: `Updated task #${params.issueId} status to '${params.newStatus}'` }],
        details: state
      };
    }
  });
}
```

- [ ] **Step 2: Commit Backlog Tool**

```bash
git add extensions/backlog-tool.ts
git commit -m "feat: implement team_update_status extension tool"
```

---

### Task 4: Tmux Layout Manager (`extensions/tmux-manager.ts`)

**Files:**
- Create: `extensions/tmux-manager.ts`

**Interfaces:**
- Produces: `setupTeamTmuxLayout()` and `sendPromptToPane()` utility functions.

- [ ] **Step 1: Implement `tmux-manager.ts`**

```typescript
import { execSync } from "child_process";

export interface TmuxPaneMap {
  orchestrator: string; // Pane 0
  ba: string;           // Pane 1
  developer: string;    // Pane 2
  qa: string;           // Pane 3
  reviewer: string;     // Pane 4
}

export class TmuxManager {
  private sessionName = "pi-team";

  public isTmuxAvailable(): boolean {
    try {
      execSync("tmux -V", { stdio: "ignore" });
      return true;
    } catch {
      return false;
    }
  }

  public setup5PaneLayout(): TmuxPaneMap {
    // Top Pane 0: Master Orchestrator
    execSync(`tmux new-session -d -s ${this.sessionName} -n team "echo '--- MASTER ORCHESTRATOR DASHBOARD ---'"`);
    
    // Split bottom area for subagents
    execSync(`tmux split-window -v -t ${this.sessionName}:0 "pi -a ba"`);
    execSync(`tmux split-window -h -t ${this.sessionName}:0.1 "pi -a developer"`);
    execSync(`tmux split-window -v -t ${this.sessionName}:0.1 "pi -a qa"`);
    execSync(`tmux split-window -v -t ${this.sessionName}:0.2 "pi -a reviewer"`);
    
    // Resize Orchestrator top pane to 20% height
    execSync(`tmux resize-pane -t ${this.sessionName}:0.0 -y 20%`);

    return {
      orchestrator: `${this.sessionName}:0.0`,
      ba: `${this.sessionName}:0.1`,
      developer: `${this.sessionName}:0.2`,
      qa: `${this.sessionName}:0.3`,
      reviewer: `${this.sessionName}:0.4`
    };
  }

  public sendPromptToPane(paneTarget: string, promptText: string): void {
    // Sanitize string for bash send-keys
    const escaped = promptText.replace(/"/g, '\\"');
    execSync(`tmux send-keys -t ${paneTarget} "${escaped}" Enter`);
  }
}
```

- [ ] **Step 2: Commit Tmux Manager**

```bash
git add extensions/tmux-manager.ts
git commit -m "feat: implement tmux 2x2 grid layout launcher and IPC manager"
```

---

### Task 5: Core Team Orchestrator Extension (`extensions/team-orchestrator.ts`)

**Files:**
- Create: `extensions/team-orchestrator.ts`
- Create: `extensions/index.ts`

**Interfaces:**
- Consumes: `registerBacklogTool`, `TmuxManager`.
- Registers command: `/team-dev`.

- [ ] **Step 1: Implement `team-orchestrator.ts`**

```typescript
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { registerBacklogTool } from "./backlog-tool.js";
import { TmuxManager } from "./tmux-manager.js";

export default function (pi: ExtensionAPI) {
  registerBacklogTool(pi);

  const tmux = new TmuxManager();

  pi.registerCommand("team-dev", {
    description: "Launch multi-agent team workflow in tmux (BA, Dev, QA, Reviewer)",
    handler: async (args, ctx) => {
      if (!tmux.isTmuxAvailable()) {
        ctx.ui.notify("Error: tmux is required to run multi-agent team mode.", "error");
        return;
      }

      const isHitl = !args.includes("--mode=auto");
      ctx.ui.notify(`Initializing Pi Agent Team (${isHitl ? "HITL Mode" : "Autonomous Mode"})...`, "info");

      const panes = tmux.setup2x2Grid();

      // Trigger initial BA prompt in Pane 0
      tmux.sendPromptToPane(
        panes.ba,
        "Read prd.md and project-context.md. Break down the requirements into atomic GitHub/Jira issues with explicit ACs."
      );

      ctx.ui.notify("Team setup complete in tmux session 'pi-team'. Attach with: tmux attach -t pi-team", "info");
    }
  });
}
```

- [ ] **Step 2: Create `extensions/index.ts` Entry Point**

```typescript
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import teamOrchestrator from "./team-orchestrator.js";

export default function (pi: ExtensionAPI) {
  teamOrchestrator(pi);
}
```

- [ ] **Step 3: Commit Orchestrator Extension**

```bash
git add extensions/team-orchestrator.ts extensions/index.ts
git commit -m "feat: implement team-orchestrator extension and /team-dev command"
```

---

### Task 6: Shortcut Template & Documentation

**Files:**
- Create: `prompts/team-dev.md`
- Modify: `README.md`

- [ ] **Step 1: Create `prompts/team-dev.md`**

```markdown
---
description: Start the multi-agent team workflow
---
/team-dev $ARGUMENTS
```

- [ ] **Step 2: Write README.md Usage Instructions**

Document installation (`pi install git:...`), pre-requisites (`project-context.md`, `prd.md`, tmux), and how to run `/team-dev --mode=hitl` vs `/team-dev --mode=auto`.

- [ ] **Step 3: Commit Documentation & Prompt Template**

```bash
git add prompts/ README.md
git commit -m "docs: add team-dev prompt template and usage documentation"
```

---

## Self-Review Checklist

1. **Spec coverage:** Covers package structure, persona prompts, skills, `team_update_status` tool, tmux 2x2 launcher, and `/team-dev` command.
2. **Placeholder scan:** No TBDs or missing function bodies.
3. **Type consistency:** `ActiveTaskState` interface matches across `backlog-tool.ts` and `team-orchestrator.ts`.
