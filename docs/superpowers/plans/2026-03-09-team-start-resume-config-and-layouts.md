# Team Config, Start/Resume Commands, and Dual Layouts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement `.pi/team-config.json` mode/layout configuration, `/team-start` (fresh active-log reset) & `/team-resume` (active-log recovery) commands, and dual layout support (`"panes"` vs `"windows"` inside the same tmux session).

**Architecture:** Extend `TmuxManager` (`.pi/extensions/tmux-manager.ts`) with `setupLayout(layout)`, update `/team-start` and `/team-resume` in `team-orchestrator.ts`, update `backlog-tool.ts` for active-log recovery, and document in `AGENTS.md`.

**Tech Stack:** TypeScript, Markdown, Pi Coding Agent Extension API, tmux CLI.

**Spec:** `docs/superpowers/specs/2026-03-09-orchestrator-control-and-task-delegation-design.md`

## Global Constraints
- **Config File**: `.pi/team-config.json` holds `mode` (`"loop-hitl"`, `"step-hitl"`, `"auto"`) and `layout` (`"panes"`, `"windows"`).
- **Session Name**: `pi-team` (tmux session).
- **Idle Startup**: Child agents start completely idle and silent, loading skills/context without auto-executing work.

---

### Task 1: Update `TmuxManager` for Dual Layouts (`"panes"` vs `"windows"`)

**Files:**
- Modify: `.pi/extensions/tmux-manager.ts`

**Interfaces:**
- Consumes: `TeamConfig` layout setting (`"panes"` | `"windows"`).
- Produces: Tmux layout with 5 split panes in 1 window OR 5 full-screen windows in same session.

- [ ] **Step 1: Implement `setupLayout(layout: "panes" | "windows")` in `TmuxManager`**

```typescript
export interface TeamConfig {
  mode: "step-hitl" | "loop-hitl" | "auto";
  layout: "panes" | "windows";
  panes: {
    orchestrator: string;
    ba: string;
    developer: string;
    qa: string;
    reviewer: string;
  };
}
```

- If `layout === "panes"`: Creates 5 split panes in Window 0 (`team`).
- If `layout === "windows"`: Creates 5 full-screen windows in `pi-team` session:
  - Window 0: `orchestrator` (`pi -a orchestrator; exec bash`)
  - Window 1: `ba` (`pi -a ba; exec bash`)
  - Window 2: `developer` (`pi -a developer; exec bash`)
  - Window 3: `qa` (`pi -a qa; exec bash`)
  - Window 4: `reviewer` (`pi -a reviewer; exec bash`)
- Sets `@persona` options and `pane-border-status top` on windows.

- [ ] **Step 2: Compile TypeScript extensions**

Run: `npm run build`
Expected: 0 compilation errors.

- [ ] **Step 3: Commit**

```bash
git add .pi/extensions/tmux-manager.ts
git commit -m "feat: add dual layout support (panes vs windows) in TmuxManager"
```

---

### Task 2: Implement `/team-start` and `/team-resume` Commands in `team-orchestrator.ts`

**Files:**
- Modify: `.pi/extensions/team-orchestrator.ts`

**Interfaces:**
- Consumes: `.pi/team-config.json` and `.pi/active-task.json`.
- Produces: `/team-start` and `/team-resume` commands.

- [ ] **Step 1: Register `/team-start` command**

- Reads `.pi/team-config.json` (writes default if missing).
- Resets `.pi/active-task.json`:
  `{ activeIssueId: "", status: "awaiting-human-input", notes: "Fresh session started", timestamp: "..." }`
- Calls `tmux.setupLayout(config.layout)`.
- Sends welcome menu prompt to Orchestrator and STOPs to wait for human input.

- [ ] **Step 2: Register `/team-resume` command**

- Reads `.pi/team-config.json`.
- Reads `.pi/active-task.json` to recover `activeIssueId` and `status`.
- Recovers or launches workspace via `tmux.setupLayout(config.layout)`.
- Sends recovery prompt to Orchestrator displaying the active issue ID and status, prompting user/resuming state.

- [ ] **Step 3: Maintain `/team-dev` as an alias to `/team-start`**

- [ ] **Step 4: Compile TypeScript extensions**

Run: `npm run build`
Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add .pi/extensions/team-orchestrator.ts
git commit -m "feat: implement /team-start and /team-resume commands with team-config.json"
```

---

### Task 3: Update `AGENTS.md` and Agent Personas

**Files:**
- Modify: `AGENTS.md`
- Modify: `.pi/agents/orchestrator.md`

**Interfaces:**
- Consumes: Config and command design specs.
- Produces: Updated team documentation for `.pi/team-config.json`, `/team-start`, `/team-resume`, and layout choices.

- [ ] **Step 1: Document `team-config.json`, `/team-start`, `/team-resume`, and layouts in `AGENTS.md`**

- [ ] **Step 2: Update `.pi/agents/orchestrator.md` for session resume handling**

- [ ] **Step 3: Commit**

```bash
git add AGENTS.md .pi/agents/orchestrator.md
git commit -m "docs: update AGENTS.md and orchestrator persona for team-config.json, team-start/resume, and layout choices"
```

---

### Task 4: Sync Files to `../testing-pi-team` and Build Verification

**Files:**
- Sync: `.pi/`, `AGENTS.md` to `../testing-pi-team`

- [ ] **Step 1: Copy files to `../testing-pi-team`**

Run: `cp -r .pi/ ../testing-pi-team/.pi/ && cp AGENTS.md ../testing-pi-team/AGENTS.md`

- [ ] **Step 2: Build `pi-team` and `testing-pi-team`**

Run: `npm run build && cd ../testing-pi-team && npm run build`
Expected: Both builds succeed with 0 errors.

- [ ] **Step 3: Commit in both repositories**
