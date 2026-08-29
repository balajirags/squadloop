# Workflow Engine Extraction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract the workflow state machine and inter-agent transition logic from `backlog-tool.ts` into a dedicated, race-free, and testable `.pi/extensions/workflow.ts` (`WorkflowEngine`).

**Architecture:** Create `.pi/extensions/workflow.ts` containing `WorkflowEngine` class, update `backlog-tool.ts` to delegate transitions to `WorkflowEngine`, and update project documentation.

**Tech Stack:** TypeScript, Node.js Async/Await, Tmux CLI wrapper.

**Spec:** Workflow Engine Architecture Specification.

## Global Constraints
- **Primary Repository First**: Implement, compile, and verify in `pi-team` FIRST, then sync to `testing-pi-team`.
- **Modes Enforced**: `loop-hitl` (1 story loop then halt), `step-hitl` (halt at every stage), `auto` (full autonomous loop).
- **Prompt Delay**: 1.5s delay buffer after `/clear` to prevent dropped prompts.

---

### Task 1: Create `.pi/extensions/workflow.ts` (`WorkflowEngine`)

**Files:**
- Create: `.pi/extensions/workflow.ts`

**Interfaces:**
- Consumes: Transition status, issue ID, team mode, pane targets, notes, rework count.
- Produces: Atomic state transition handling and prompt dispatching.

- [ ] **Step 1: Create `.pi/extensions/workflow.ts`**

Define `WorkflowStage` type and `WorkflowEngine` class with method:
```typescript
export class WorkflowEngine {
  public static async handleTransition(
    issueId: string,
    newStatus: string,
    mode: "loop-hitl" | "step-hitl" | "auto",
    panes: any,
    notes?: string,
    reworkCount?: number,
    circuitBreakerTripped = false
  ): Promise<void>
}
```

Implement transitions for:
- `ready-for-dev`: Auto-steers to Developer pane (`panes.developer`).
- `qa-verifying`: Auto-steers to QA pane (`panes.qa`).
- `code-review`: Auto-steers to Reviewer pane (`panes.reviewer`).
- `dev-rework`: Auto-steers to Developer pane (`panes.developer`) with rework feedback notes.
- `circuit-breaker-tripped`: Pauses workflow and alerts Master Orchestrator in Pane 0.
- `done`: Sends end-of-story summary card to Pane 0, closes tracker issue, and enforces mode halts (`loop-hitl` halt notice vs `auto` mode next story prompt).

Include async prompt helper `sendPromptAsync(paneTarget, promptText, clear = true)` with 1.5s `/clear` delay buffer.

- [ ] **Step 2: Compile TypeScript extensions in `pi-team`**

Run: `npm run build`
Expected: 0 compilation errors.

- [ ] **Step 3: Commit**

```bash
git add .pi/extensions/workflow.ts
git commit -m "feat: create dedicated WorkflowEngine in .pi/extensions/workflow.ts"
```

---

### Task 2: Refactor `backlog-tool.ts` to Delegate to `WorkflowEngine`

**Files:**
- Modify: `.pi/extensions/backlog-tool.ts`

**Interfaces:**
- Consumes: `WorkflowEngine`.
- Produces: Clean, lightweight tool registration delegating transitions to `WorkflowEngine`.

- [ ] **Step 1: Import and delegate to `WorkflowEngine` in `backlog-tool.ts`**

Replace embedded transition logic in `team_update_status` with:
```typescript
await WorkflowEngine.handleTransition(
  params.issueId,
  params.newStatus,
  mode,
  panes,
  params.notes,
  currentReworkCount,
  circuitBreakerTripped
);
```

- [ ] **Step 2: Compile TypeScript extensions in `pi-team`**

Run: `npm run build`
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add .pi/extensions/backlog-tool.ts
git commit -m "refactor: delegate team_update_status transitions to WorkflowEngine"
```

---

### Task 3: Sync to `../testing-pi-team` and Build Verification

**Files:**
- Sync `.pi/`, `AGENTS.md`, `package.json`, `README.md`, `RELEASE.md`, `backlog/` to `../testing-pi-team/`

- [ ] **Step 1: Copy updated files to `../testing-pi-team`**

Run: `cp -r .pi/ AGENTS.md package.json README.md RELEASE.md backlog/ ../testing-pi-team/`

- [ ] **Step 2: Build `pi-team` and `testing-pi-team`**

Run: `npm run build && cd ../testing-pi-team && npm run build`
Expected: Both builds succeed with 0 compilation errors.

- [ ] **Step 3: Commit in both repositories**
