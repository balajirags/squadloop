# Token Usage, Cost, and Context Telemetry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement cumulative token tracking, estimated cost calculation, and active context window metrics across DevSquad AI, displaying telemetry in end-of-story summary cards, `devsquad status`, and the tmux status ticker.

**Architecture:** Extend `ActiveTaskState` with `tokenStats`, update `team_update_status` and `backlog-tool.ts` to accumulate tokens/costs in `.pi/active-task.json` and `.pi/events.jsonl`, update `bin/devsquad.js`, and format summary cards.

**Tech Stack:** TypeScript, Node.js JSON logging, Cost Estimation Formulas.

**Spec:** Telemetry & Cost Reporting Specification.

## Global Constraints
- **Cost Formula**: Default cost calculation based on standard model pricing (~$0.002 / 1K tokens average).
- **Primary Repositories**: Implement in `pi-team` first, compile/verify, then sync to `testing-pi-team`.

---

### Task 1: Add Token & Cost Tracking to `backlog-tool.ts` & `ActiveTaskState`

**Files:**
- Modify: `.pi/extensions/backlog-tool.ts`

**Interfaces:**
- Consumes: Tool execution parameters and context token estimates.
- Produces: Cumulative token & cost stats stored in `.pi/active-task.json` and `.pi/events.jsonl`.

- [ ] **Step 1: Extend `ActiveTaskState` with `TokenStats` interface**

```typescript
export interface TokenStats {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
}
```

- [ ] **Step 2: Add `tokens` parameter to `team_update_status`**

Accept optional `promptTokens` and `completionTokens` in `team_update_status` parameters.

- [ ] **Step 3: Accumulate tokens and calculate cost in `team_update_status`**

- If token counts passed or estimated, accumulate in `active-task.json`.
- Cost formula: `(promptTokens * 0.0015 / 1000) + (completionTokens * 0.006 / 1000)`.

- [ ] **Step 4: Compile TypeScript extensions**

Run: `npm run build`
Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add .pi/extensions/backlog-tool.ts
git commit -m "feat: add cumulative token usage and estimated cost tracking to backlog-tool.ts"
```

---

### Task 2: Update End-of-Story Summary Card and `devsquad status`

**Files:**
- Modify: `.pi/extensions/backlog-tool.ts`
- Modify: `bin/devsquad.js`

**Interfaces:**
- Consumes: `tokenStats` from `.pi/active-task.json`.
- Produces: Formatted token & cost summary card in Pane 0 and `devsquad status` CLI output.

- [ ] **Step 1: Include token & cost metrics in Pane 0 end-of-story summary card**

Format summary card in `backlog-tool.ts`:
```text
🎉 STORY #<id> COMPLETE & MERGED TO MAIN
• Active Issue: #<id>
• Total Tokens Used: <totalTokens> (Prompt: <promptTokens> | Completion: <completionTokens>)
• Estimated Cost: $<estimatedCostUsd> USD
• Audit Log: docs/dev-checkpoints/<id>.json
```

- [ ] **Step 2: Update `devsquad status` in `bin/devsquad.js`**

Format token and cost output in `devsquad status`.

- [ ] **Step 3: Compile TypeScript extensions**

Run: `npm run build`
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add .pi/extensions/backlog-tool.ts bin/devsquad.js
git commit -m "feat: display token usage and estimated cost in summary cards and devsquad status"
```

---

### Task 3: Update Documentation & Sync to `../testing-pi-team`

**Files:**
- Modify: `Agent.md`
- Modify: `README.md`
- Modify: `RELEASE.md`
- Modify: `backlog/devsquad-master-brd.md`
- Sync to: `../testing-pi-team`

- [ ] **Step 1: Document token usage and cost telemetry in docs**

- [ ] **Step 2: Sync all updated files to `../testing-pi-team`**

Run: `cp -r .pi/ bin/ Agent.md package.json README.md RELEASE.md backlog/ ../testing-pi-team/`

- [ ] **Step 3: Build `pi-team` and `testing-pi-team`**

Run: `npm run build && cd ../testing-pi-team && npm run build`
Expected: Both builds succeed with 0 errors.

- [ ] **Step 4: Commit in both repositories**
