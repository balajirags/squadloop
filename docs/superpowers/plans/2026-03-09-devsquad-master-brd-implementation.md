# DevSquad Master BRD Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the complete DevSquad AI Master Specification: standalone CLI binary (`devsquad`), distribution initialization (`devsquad init`), rebranded tmux workspace UI, rework circuit breakers, JSON checkpoint audit trails, tmux status bar ticker, instant `Alt` navigation shortcuts, and end-of-story verification summary cards.

**Architecture:** Create executable `bin/devsquad.js`, update `tmux-manager.ts` with rebranded session/pane titles & keybindings, update `backlog-tool.ts` with circuit breakers & JSON checkpoints & telemetry summary, update `team-orchestrator.ts` for Slash commands & config.

**Tech Stack:** Node.js CLI, TypeScript, Markdown, Pi Coding Agent Extension API, tmux CLI.

**Spec:** `backlog/devsquad-master-brd.md`

## Global Constraints
- **Executable**: `bin/devsquad.js` must be executable (`chmod +x`).
- **Session Name**: `devsquad-workspace`.
- **Rework Threshold**: `reworkCount > 3` trips the circuit breaker.
- **Audit Checkpoint**: `docs/dev-checkpoints/<story-id>.json`.

---

### Task 1: Standalone CLI Executable (`bin/devsquad.js` & `package.json`)

**Files:**
- Create: `bin/devsquad.js`
- Modify: `package.json`

**Interfaces:**
- Consumes: User command line arguments (`start`, `resume`, `init`, `attach`, `status`, `config`, `help`).
- Produces: CLI entry point executable.

- [ ] **Step 1: Update `package.json` with `"bin"` entry**

Add `"bin": { "devsquad": "./bin/devsquad.js" }` to `package.json`.

- [ ] **Step 2: Create `bin/devsquad.js` script**

Create `bin/devsquad.js` supporting:
- `devsquad start [--mode=...] [--layout=...]` -> Runs `pi "/devsquad-start"`.
- `devsquad resume` -> Runs `pi "/devsquad-resume"`.
- `devsquad init` -> Bootstraps `.pi/`, `Agent.md`, `project-context.md`, and template folders into current directory.
- `devsquad attach` -> Executes `tmux attach -t devsquad-workspace`.
- `devsquad status` -> Reads `.pi/active-task.json` and prints current state.
- `devsquad config` -> Reads/updates `.pi/team-config.json`.
- `devsquad help` / `--help` -> Prints ASCII logo and CLI usage guide.

- [ ] **Step 3: Make `bin/devsquad.js` executable**

Run: `chmod +x bin/devsquad.js`

- [ ] **Step 4: Commit**

```bash
git add package.json bin/devsquad.js
git commit -m "feat: add bin/devsquad.js executable script and package.json bin entry"
```

---

### Task 2: Workspace Rebranding & Slash Commands

**Files:**
- Modify: `.pi/extensions/tmux-manager.ts`
- Modify: `.pi/extensions/team-orchestrator.ts`
- Modify: `.pi/agents/orchestrator.md`

**Interfaces:**
- Consumes: DevSquad AI branding specification.
- Produces: Rebranded session name `devsquad-workspace`, pane titles, and `/devsquad-start` / `/devsquad-recover` commands.

- [ ] **Step 1: Update session name and pane titles in `tmux-manager.ts`**

- Session name: `devsquad-workspace`.
- Pane titles:
  - `[ DEVSQUAD :: MASTER ORCHESTRATOR ]`
  - `[ DEVSQUAD :: BUSINESS ANALYST (BA) ]`
  - `[ DEVSQUAD :: DEVELOPER (DEV) ]`
  - `[ DEVSQUAD :: QUALITY ANALYST (QA) ]`
  - `[ DEVSQUAD :: CODE REVIEWER (REVIEWER) ]`

- [ ] **Step 2: Register `/devsquad-start` and `/devsquad-recover` in `team-orchestrator.ts`**

- [ ] **Step 3: Update welcome banner header in `.pi/agents/orchestrator.md`**

- [ ] **Step 4: Compile TypeScript extensions**

Run: `npm run build`
Expected: 0 compilation errors.

- [ ] **Step 5: Commit**

```bash
git add .pi/extensions/tmux-manager.ts .pi/extensions/team-orchestrator.ts .pi/agents/orchestrator.md
git commit -m "feat: rebrand tmux session to devsquad-workspace and register /devsquad commands"
```

---

### Task 3: Rework Circuit Breaker & Structured JSON Checkpoints

**Files:**
- Modify: `.pi/extensions/backlog-tool.ts`

**Interfaces:**
- Consumes: `team_update_status` parameters.
- Produces: `reworkCount` tracking, circuit breaker event, and `docs/dev-checkpoints/<story-id>.json`.

- [ ] **Step 1: Implement `reworkCount` tracking and circuit breaker in `backlog-tool.ts`**

- When `params.newStatus === "dev-rework"`: Increment `reworkCount` in `state`.
- If `reworkCount > 3`: Set status to `"circuit-breaker-tripped"` and notify Orchestrator in Pane 0 (`REWORK_CIRCUIT_BREAKER_TRIPPED: Issue #<id> exceeded 3 rework attempts. Pausing workflow.`).

- [ ] **Step 2: Implement structured JSON checkpoint creation in `docs/dev-checkpoints/<story-id>.json`**

- Write checkpoint JSON with fields: `storyId`, `status`, `updatedBy`, `timestamp`, `reworkCount`, `notes`.

- [ ] **Step 3: Compile TypeScript extensions**

Run: `npm run build`
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add .pi/extensions/backlog-tool.ts
git commit -m "feat: add rework loop circuit breaker and docs/dev-checkpoints JSON audit trail"
```

---

### Task 4: Tmux Status Bar Ticker & Instant `Alt` Navigation Shortcuts

**Files:**
- Modify: `.pi/extensions/tmux-manager.ts`

**Interfaces:**
- Consumes: Tmux options and keybindings.
- Produces: Live status bar ticker and `Alt` shortcuts.

- [ ] **Step 1: Add tmux status bar ticker styling in `tmux-manager.ts`**

```bash
tmux set-option -t devsquad-workspace status-left "[ DEVSQUAD AI ] "
tmux set-option -t devsquad-workspace status-right "| Mode: #{@mode} | Layout: #{@layout} "
```

- [ ] **Step 2: Add instant `Alt` navigation shortcuts in `tmux-manager.ts`**

```bash
# Alt + Arrow keys for pane navigation
tmux bind-key -n M-Up select-pane -U
tmux bind-key -n M-Down select-pane -D
tmux bind-key -n M-Left select-pane -L
tmux bind-key -n M-Right select-pane -R

# Alt + 0..4 for direct pane jump
tmux bind-key -n M-0 select-pane -t :.0
tmux bind-key -n M-1 select-pane -t :.1
tmux bind-key -n M-2 select-pane -t :.2
tmux bind-key -n M-3 select-pane -t :.3
tmux bind-key -n M-4 select-pane -t :.4

# Alt + z for full-screen zoom toggle
tmux bind-key -n M-z resize-pane -Z
```

- [ ] **Step 3: Compile TypeScript extensions**

Run: `npm run build`
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add .pi/extensions/tmux-manager.ts
git commit -m "feat: add tmux status bar ticker and instant Alt navigation shortcuts"
```

---

### Task 5: End-of-Story Verification Summary Card & Telemetry

**Files:**
- Modify: `.pi/extensions/backlog-tool.ts`

**Interfaces:**
- Consumes: `team_update_status` when `newStatus === "done"`.
- Produces: Formatted end-of-story verification summary card prompt sent to Orchestrator Pane 0.

- [ ] **Step 1: Implement end-of-story summary card trigger in `backlog-tool.ts`**

When `params.newStatus === "done"`:
Send formatted summary banner prompt to Master Orchestrator in Pane 0:
```text
🎉 STORY #<id> COMPLETE & MERGED TO MAIN
• Active Issue: #<id>
• Status: done
• Notes: <notes>
• Checkpoint Log: docs/dev-checkpoints/<id>.json
```

- [ ] **Step 2: Compile TypeScript extensions**

Run: `npm run build`
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add .pi/extensions/backlog-tool.ts
git commit -m "feat: add end-of-story verification summary card trigger"
```

---

### Task 6: Sync to `../testing-pi-team` and Build Verification

**Files:**
- Sync `.pi/`, `bin/`, `Agent.md`, `package.json` to `../testing-pi-team/`.

- [ ] **Step 1: Sync files to `../testing-pi-team`**

Run: `cp -r .pi/ bin/ Agent.md package.json ../testing-pi-team/`

- [ ] **Step 2: Build `pi-team` and `testing-pi-team`**

Run: `npm run build && cd ../testing-pi-team && npm run build`
Expected: Both builds succeed with 0 compilation errors.

- [ ] **Step 3: Commit in both repositories**
