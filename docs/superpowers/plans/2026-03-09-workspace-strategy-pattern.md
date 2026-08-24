# Workspace Strategy Pattern Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor workspace management using the Strategy Pattern with an `IWorkspaceAdapter` interface supporting both `TmuxWorkspaceAdapter` (Tmux Mode - default) and `HeadlessWorkspaceAdapter` (Regular Mode for environments without tmux), controlled via `"workspaceMode"` in `.pi/team-config.json`.

**Architecture:** Create `.pi/extensions/workspaces/` containing `IWorkspaceAdapter`, `TmuxWorkspaceAdapter`, `HeadlessWorkspaceAdapter`, and `WorkspaceFactory`. Refactor `team-orchestrator.ts` and `workflow.ts` to use `WorkspaceFactory`.

**Tech Stack:** TypeScript, Node.js Async/Await, Tmux CLI wrapper, Headless Event Bus.

**Spec:** Workspace Strategy Pattern Specification.

## Global Constraints
- **Primary Repository First**: Implement, compile, and verify in `pi-team` FIRST, then sync to `testing-pi-team`.
- **Default Mode**: `"workspaceMode": "tmux"` default. If tmux is not installed, automatically falls back to `"regular"` (headless mode).
- **Interface Contract**: `IWorkspaceAdapter` defines `isAvailable`, `setupLayout`, `recoverMissingPanes`, `sendPrompt`, `startAppServerWindow`.

---

### Task 1: Create `IWorkspaceAdapter` Interface & Adapters

**Files:**
- Create: `.pi/extensions/workspaces/workspace-interface.ts`
- Create: `.pi/extensions/workspaces/tmux-adapter.ts`
- Create: `.pi/extensions/workspaces/headless-adapter.ts`
- Create: `.pi/extensions/workspaces/workspace-factory.ts`

**Interfaces:**
- Consumes: `.pi/team-config.json` `workspaceMode` setting.
- Produces: Extensible workspace strategy layer.

- [ ] **Step 1: Create `workspace-interface.ts`**

```typescript
export interface WorkspacePanes {
  orchestrator: string;
  ba: string;
  developer: string;
  qa: string;
  reviewer: string;
}

export interface IWorkspaceAdapter {
  readonly name: string;
  isAvailable(): boolean;
  setupLayout(layout: "panes" | "windows"): WorkspacePanes;
  recoverMissingPanes(currentPanes: WorkspacePanes): WorkspacePanes;
  sendPrompt(targetPane: string, promptText: string, clear?: boolean): Promise<void>;
  startAppServerWindow(startCommand?: string): string;
}
```

- [ ] **Step 2: Create `tmux-adapter.ts` (`TmuxWorkspaceAdapter`)**

Refactor `TmuxManager` into `TmuxWorkspaceAdapter` implementing `IWorkspaceAdapter`.

- [ ] **Step 3: Create `headless-adapter.ts` (`HeadlessWorkspaceAdapter`)**

Implement `IWorkspaceAdapter` for Regular Mode (headless/single terminal).
- `isAvailable()` returns `true`.
- `setupLayout()` returns virtual role targets (`"orchestrator"`, `"ba"`, `"developer"`, `"qa"`, `"reviewer"`).
- `sendPrompt()` logs events to `.pi/events.jsonl` and emits headless prompts.

- [ ] **Step 4: Create `workspace-factory.ts` (`WorkspaceFactory`)**

Reads `.pi/team-config.json` for `workspaceMode`:
- If `"tmux"`: Checks `tmuxAdapter.isAvailable()`. If available, returns `TmuxWorkspaceAdapter`. If not available, falls back to `HeadlessWorkspaceAdapter` with notice.
- If `"regular"` / `"headless"`: Returns `HeadlessWorkspaceAdapter`.

- [ ] **Step 5: Compile TypeScript extensions in `pi-team`**

Run: `npm run build`
Expected: 0 errors.

- [ ] **Step 6: Commit**

```bash
git add .pi/extensions/workspaces/
git commit -m "feat: implement IWorkspaceAdapter strategy pattern with Tmux and Headless adapters"
```

---

### Task 2: Refactor `team-orchestrator.ts` and `workflow.ts` to Use `WorkspaceFactory`

**Files:**
- Modify: `.pi/extensions/team-orchestrator.ts`
- Modify: `.pi/extensions/workflow.ts`

**Interfaces:**
- Consumes: `WorkspaceFactory`.
- Produces: Workspace-agnostic team startup, recovery, and transition dispatching.

- [ ] **Step 1: Update `TeamConfig` interface in `team-orchestrator.ts`**

Add `workspaceMode?: "tmux" | "regular";` to `TeamConfig`.

- [ ] **Step 2: Update `/team-start`, `/team-resume`, `/team-recover` to use `WorkspaceFactory.getAdapter()`**

- [ ] **Step 3: Update `WorkflowEngine` in `workflow.ts` to use `WorkspaceFactory.getAdapter()` for `sendPrompt`**

- [ ] **Step 4: Compile TypeScript extensions in `pi-team`**

Run: `npm run build`
Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add .pi/extensions/team-orchestrator.ts .pi/extensions/workflow.ts
git commit -m "refactor: integrate WorkspaceFactory across team-orchestrator.ts and workflow.ts"
```

---

### Task 3: Update Documentation & Sync to `../testing-pi-team`

**Files:**
- Modify: `Agent.md`
- Modify: `README.md`
- Modify: `RELEASE.md`
- Modify: `backlog/devsquad-master-brd.md`
- Sync to: `../testing-pi-team`

- [ ] **Step 1: Document `workspaceMode` ("tmux" vs "regular") and auto-fallback behavior in docs**

- [ ] **Step 2: Sync updated files to `../testing-pi-team`**

Run: `cp -r .pi/ Agent.md package.json README.md RELEASE.md backlog/ ../testing-pi-team/`

- [ ] **Step 3: Build `pi-team` and `testing-pi-team`**

Run: `npm run build && cd ../testing-pi-team && npm run build`
Expected: Both builds succeed with 0 errors.

- [ ] **Step 4: Commit in both repositories**
