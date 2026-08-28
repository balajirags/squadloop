# SquadLoop Multi-Session Isolation & Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable multiple concurrent SquadLoop team sessions in the same repository by isolating session state (`.pi/sessions/<id>/`), driver session names (`squadloop-<id>`), and providing `squadloop list`, `attach`, and `stop` CLI subcommands.

**Architecture:** Create `.pi/extensions/sessions/session-manager.ts` to manage session state paths. Update `TmuxDriver`, `HerdrDriver`, `ITerm2Driver` to scope session names to `squadloop-<id>`. Update `bin/squadloop.js` CLI to handle `--name=<id>` and implement `squadloop list`, `attach`, `stop`.

**Tech Stack:** TypeScript (Node.js ES2022 / NodeNext modules), `@earendil-works/pi-coding-agent`, tmux/herdr/iTerm2 APIs.

**Spec:** `docs/superpowers/specs/2026-03-09-multi-session-isolation-and-management-design.md`

## Global Constraints
- Default session name: Auto-generated unique session ID (e.g. `session-8b1a`), or explicit `--name=<id>` when provided
- Session state directory: `.pi/sessions/<session-id>/`
- CLI subcommand: `squadloop list`, `squadloop attach [--name=<id>]`, `squadloop stop [--name=<id>]`

---

### Task 1: Session State Manager (`SquadLoopSessionManager`)

**Files:**
- Create: `.pi/extensions/sessions/session-manager.ts`

**Interfaces:**
- Consumes: Session ID string
- Produces: `SquadLoopSessionManager.getSessionDir(id)`, `getActiveTaskPath(id)`, `getEventsPath(id)`

- [ ] **Step 1: Write `.pi/extensions/sessions/session-manager.ts`**
- [ ] **Step 2: Verify Build (`npm run build`)**
- [ ] **Step 3: Commit**

---

### Task 2: Driver Session Scoping (`TmuxDriver`, `HerdrDriver`, `ITerm2Driver`)

**Files:**
- Modify: `.pi/extensions/drivers/tmux-driver.ts`
- Modify: `.pi/extensions/drivers/herdr-driver.ts`
- Modify: `.pi/extensions/drivers/iterm2-driver.ts`

**Interfaces:**
- Consumes: Session ID from context
- Produces: Scoped session names `squadloop-<session-id>`

- [ ] **Step 1: Update `TmuxDriver`**
- [ ] **Step 2: Update `HerdrDriver` & `ITerm2Driver`**
- [ ] **Step 3: Verify Build (`npm run build`)**
- [ ] **Step 4: Commit**

---

### Task 3: CLI Subcommands & Options (`bin/squadloop.js`)

**Files:**
- Modify: `bin/squadloop.js`

**Interfaces:**
- Consumes: `--name=<id>` CLI flag
- Produces: `squadloop list`, `squadloop attach`, `squadloop stop`

- [ ] **Step 1: Update `bin/squadloop.js`**
- [ ] **Step 2: Verify Build & Test CLI Commands**
- [ ] **Step 3: Commit**

---

### Task 4: End-to-End Build & Multi-Session Verification

- [ ] **Step 1: Run `npm run build`**
- [ ] **Step 2: Verify Concurrent Sessions (`sess1` and `sess2`)**
- [ ] **Step 3: Commit Final Updates**
