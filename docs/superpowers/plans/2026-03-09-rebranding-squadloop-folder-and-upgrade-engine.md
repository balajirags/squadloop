# SquadLoop Rebranded `.squadloop/` Wrapper & Upgrade Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebrand SquadLoop's project directory from `.pi/` to `.squadloop/` using `CONFIG_DIR_NAME=.squadloop` and `PI_CODING_AGENT_DIR=~/.squadloop/agent`, implement auto-migration, and add `squadloop update` and `squadloop doctor` CLI subcommands.

**Architecture:** Update `bin/squadloop.js` and extension path helpers to use `CONFIG_DIR_NAME` (`.squadloop`). Add `migrateLegacyPiDirectory()` on launch. Add `squadloop update` and `squadloop doctor` subcommands to `bin/squadloop.js`.

**Tech Stack:** TypeScript (Node.js ES2022 / NodeNext modules), `@earendil-works/pi-coding-agent`, npm registry API.

**Spec:** `docs/superpowers/specs/2026-03-09-rebranding-squadloop-folder-and-upgrade-engine-design.md`

## Global Constraints
- Rebranded project directory: `.squadloop/`
- Environment variables: `CONFIG_DIR_NAME=.squadloop` and `PI_CODING_AGENT_DIR=~/.squadloop/agent`
- CLI subcommands: `squadloop update`, `squadloop doctor`

---

### Task 1: `.squadloop/` Directory Rebranding & Extension Path Helper Update

**Files:**
- Modify: `.pi/extensions/models/model-resolver.ts`
- Modify: `.pi/extensions/models/prompt-sync.ts`
- Modify: `.pi/extensions/drivers/tmux-driver.ts`
- Modify: `.pi/extensions/drivers/iterm2-driver.ts`
- Modify: `.pi/extensions/strategies/team-strategy.ts`
- Modify: `.pi/extensions/team-tools.ts`
- Modify: `.pi/extensions/workflow.ts`

**Interfaces:**
- Consumes: `process.env.CONFIG_DIR_NAME || ".squadloop"`
- Produces: Dynamic path resolution pointing to `.squadloop/`

- [ ] **Step 1: Replace hardcoded `.pi` path strings with `process.env.CONFIG_DIR_NAME || ".squadloop"`**
- [ ] **Step 2: Verify Build (`npm run build`)**
- [ ] **Step 3: Commit**

---

### Task 2: Legacy `.pi/` Auto-Migration Logic (`bin/squadloop.js`)

**Files:**
- Modify: `bin/squadloop.js`

**Interfaces:**
- Consumes: Existing `.pi/` directory if present
- Produces: Auto-migrated `.squadloop/` directory

- [ ] **Step 1: Implement `migrateLegacyPiDirectory()` in `bin/squadloop.js`**
- [ ] **Step 2: Set `process.env.CONFIG_DIR_NAME = ".squadloop"` in `bin/squadloop.js`**
- [ ] **Step 3: Verify Build & Test Migration**
- [ ] **Step 4: Commit**

---

### Task 3: `squadloop update` & `squadloop doctor` Commands (`bin/squadloop.js`)

**Files:**
- Modify: `bin/squadloop.js`

**Interfaces:**
- Consumes: `squadloop update` and `squadloop doctor` commands
- Produces: Upgrade and diagnostic reports

- [ ] **Step 1: Implement `handleUpdate()` in `bin/squadloop.js`**
- [ ] **Step 2: Implement `handleDoctor()` in `bin/squadloop.js`**
- [ ] **Step 3: Verify Build & Test Commands**
- [ ] **Step 4: Commit**

---

### Task 4: End-to-End Build & Verification

- [ ] **Step 1: Run `npm run build`**
- [ ] **Step 2: Verify `.squadloop/` Initialization & Auto-Migration**
- [ ] **Step 3: Commit Final Updates**
