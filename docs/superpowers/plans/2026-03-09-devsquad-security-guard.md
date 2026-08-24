# DevSquad Security Guard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the DevSquad Security Guard extension to hard-block reading protected files (`.env`, `.bashrc`, `.zshrc`, SSH/AWS credentials, plus configurable `customProtectedFiles`) and enforce `destructiveCommandPolicy` (`"ask-human"` | `"block"` | `"allow"`) for `rm` and `git push --force` commands.

**Architecture:** Create `.pi/extensions/security-guard.ts`, register in `.pi/extensions/index.ts`, update `.pi/team-config.json` schema, and update `Agent.md` and `README.md`.

**Tech Stack:** TypeScript, Node.js Regex, Pi Extension Tool Hooks.

**Spec:** Security Guard Design (Non-negotiable protected files + Human approval for destructive commands).

## Global Constraints
- **Protected Files**: `.env`, `.env.*`, `.bashrc`, `.zshrc`, `.ssh/`, `.aws/`, `id_rsa`, `id_ed25519` + `customProtectedFiles` are ALWAYS hard-blocked from being read. Users CANNOT unblock default protected files.
- **Destructive Commands**: `rm`, `rm -rf`, `git push --force`, `git reset --hard` follow `destructiveCommandPolicy` (`"ask-human"` default, `"block"`, `"allow"`).

---

### Task 1: Security Guard Extension (`.pi/extensions/security-guard.ts`)

**Files:**
- Create: `.pi/extensions/security-guard.ts`
- Modify: `.pi/extensions/index.ts`

**Interfaces:**
- Consumes: Pi `ExtensionAPI` tool call hooks.
- Produces: Security Guard pre-execution interceptor.

- [ ] **Step 1: Create `.pi/extensions/security-guard.ts`**

Implement tool execution interceptor:
- Hardcoded default protected files:
  `[/\.env($|\..*)/i, /\.bashrc/i, /\.zshrc/i, /\.bash_profile/i, /\.zprofile/i, /id_rsa/i, /id_ed25519/i, /\.aws\/credentials/i, /\.ssh\//i]`
- Reads `customProtectedFiles` from `.pi/team-config.json` and combines with defaults.
- Inspects `read` tool path parameter and `bash` tool command string.
- If protected file read attempt detected:
  - Rejects execution with error:
    `"🛑 ACCESS DENIED: Reading sensitive environment files or system credentials (.env, .bashrc, .ssh) is strictly prohibited by DevSquad Security Guard."`
  - Logs `EVENT: SECURITY_BLOCKED` to `.pi/events.jsonl` and notifies Orchestrator in Pane 0.
- Inspects `bash` command for destructive patterns (`rm\s+`, `git\s+push\s+.*--force`, `git\s+reset\s+--hard`):
  - If `destructiveCommandPolicy === "block"`: Rejects command.
  - If `destructiveCommandPolicy === "ask-human"` (default): Intercepts command, logs event, and sends human approval request prompt to Pane 0.
  - If `destructiveCommandPolicy === "allow"`: Permits execution.

- [ ] **Step 2: Register `securityGuard` in `.pi/extensions/index.ts`**

Read `.pi/extensions/index.ts` and export `securityGuard(pi)`.

- [ ] **Step 3: Compile TypeScript extensions**

Run: `npm run build`
Expected: 0 compilation errors.

- [ ] **Step 4: Commit**

```bash
git add .pi/extensions/security-guard.ts .pi/extensions/index.ts
git commit -m "feat: implement DevSquad Security Guard for protected files and destructive commands"
```

---

### Task 2: Config Schema & Master BRD Updates

**Files:**
- Modify: `.pi/extensions/team-orchestrator.ts`
- Modify: `backlog/devsquad-master-brd.md`
- Modify: `Agent.md`
- Modify: `README.md`
- Modify: `RELEASE.md`

**Interfaces:**
- Consumes: Security Guard design specifications.
- Produces: Updated `TeamConfig` interface, documentation, and BRD.

- [ ] **Step 1: Update `TeamConfig` interface in `team-orchestrator.ts`**

Add:
```typescript
export interface TeamConfig {
  mode: "step-hitl" | "loop-hitl" | "auto";
  layout: "panes" | "windows";
  destructiveCommandPolicy?: "ask-human" | "block" | "allow";
  customProtectedFiles?: string[];
  panes: { ... };
}
```

- [ ] **Step 2: Update `backlog/devsquad-master-brd.md`, `Agent.md`, `README.md`, and `RELEASE.md`**

Document Security Guard, non-negotiable protected files, `customProtectedFiles`, and `destructiveCommandPolicy`.

- [ ] **Step 3: Compile TypeScript extensions**

Run: `npm run build`
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add .pi/extensions/team-orchestrator.ts backlog/devsquad-master-brd.md Agent.md README.md RELEASE.md
git commit -m "docs: update Security Guard configuration schema and master documentation"
```

---

### Task 3: Sync to `../testing-pi-team` and Build Verification

**Files:**
- Sync `.pi/`, `Agent.md`, `package.json`, `README.md`, `RELEASE.md`, `backlog/` to `../testing-pi-team/`

- [ ] **Step 1: Copy updated files to `../testing-pi-team`**

Run: `cp -r .pi/ Agent.md package.json README.md RELEASE.md backlog/ ../testing-pi-team/`

- [ ] **Step 2: Build `pi-team` and `testing-pi-team`**

Run: `npm run build && cd ../testing-pi-team && npm run build`
Expected: Both builds succeed with 0 compilation errors.

- [ ] **Step 3: Commit in both repositories**
