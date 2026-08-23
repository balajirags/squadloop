# Orchestrator Control and Task Delegation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish Master Orchestrator (Pane 0) as the primary control center on `pi-team` startup, supporting human requests for BRD implementation, specific story picking, random implementation, or custom bug fixes, delegating to child agents via `send_agent_message`, and creating a root `Agent.md` context file.

**Architecture:** Update Orchestrator's agent definition (`.pi/agents/orchestrator.md`) to include `send_agent_message`, refine `/team-dev` launch prompt in `.pi/extensions/team-orchestrator.ts`, and create root `Agent.md` for workspace context loading across sessions.

**Tech Stack:** TypeScript, Markdown, Pi Coding Agent Extension API, tmux CLI.

**Spec:** `docs/superpowers/specs/2026-03-09-orchestrator-control-and-task-delegation-design.md`

## Global Constraints
- **Agent Roles**: Orchestrator (Pane 0), BA (Pane 1), Developer (Pane 2), QA (Pane 3), Reviewer (Pane 4).
- **Communication Tool**: Inter-agent messaging uses `send_agent_message(targetRole, message)`.
- **Root Files**: `Agent.md` must live at the project root (`/Users/gbalaji/projects/personal/pi-team/Agent.md`).

---

### Task 1: Create Root `Agent.md` Context File

**Files:**
- Create: `Agent.md`

**Interfaces:**
- Consumes: Design spec requirements for workspace context loading.
- Produces: Project-wide context documentation automatically read by agent sessions.

- [ ] **Step 1: Write `Agent.md` with full project context**

Write `Agent.md` at project root containing:
- pi-team overview & 5-pane tmux layout.
- Master Orchestrator (Pane 0) ownership & interactive menu.
- Task allocation rules (BRD, Specific Story, Random Implementation, Custom Task).
- Child agent roles & responsibilities (BA, Dev, QA, Reviewer).
- Workflow control modes (`--team-mode=loop-hitl`, `--team-mode=auto`, `--team-mode=step-hitl`).
- Project boundaries & quality gates (`backend/`, `frontend/`, JaCoCo coverage inspection, live app server QA checks, P1/P2 code reviews, mandatory PR merges before `done`).

- [ ] **Step 2: Verify `Agent.md` exists and is readable**

Run: `ls -la Agent.md`
Expected: `Agent.md` is present at project root.

- [ ] **Step 3: Commit**

```bash
git add Agent.md
git commit -m "feat: add Agent.md project context file"
```

---

### Task 2: Update Master Orchestrator Persona Definition

**Files:**
- Modify: `.pi/agents/orchestrator.md`

**Interfaces:**
- Consumes: `send_agent_message` tool registered in `.pi/extensions/backlog-tool.ts`.
- Produces: Master Orchestrator prompt instructions for parsing user intent and delegating to child agents.

- [ ] **Step 1: Update frontmatter tools list in `.pi/agents/orchestrator.md`**

Update tools line to:
```yaml
tools: read, bash, team_update_status, send_agent_message
```

- [ ] **Step 2: Update Orchestrator prompt instructions for intent parsing & delegation**

Add structured guidance for:
1. **Interactive Greeting Menu**:
   Printing welcome banner with options (1. Implement BRD, 2. Pick Story, 3. Random Implementation, 4. Custom Task).
2. **Task Delegation Matrix**:
   - BRD grooming -> `send_agent_message(targetRole: "ba", message: "...")`
   - Story implementation -> `send_agent_message(targetRole: "developer", message: "...")`
   - QA checks -> `send_agent_message(targetRole: "qa", message: "...")`
   - Code review -> `send_agent_message(targetRole: "reviewer", message: "...")`
3. **Random Implementation Logic**:
   - Scan `docs/stories/`, `docs/brd/`, and GitHub/Jira issues.
   - Pick an uncompleted story or BRD at random.
   - If backlog is empty, generate a relevant feature recommendation from `project-context.md`, announce it in Pane 0, and delegate to BA.
4. **HITL & Mode Enforcement**:
   - Interpret `team_update_status` events and handle stage transitions for `loop-hitl`, `auto`, and `step-hitl`.

- [ ] **Step 3: Verify `.pi/agents/orchestrator.md` edits**

Run: `grep "send_agent_message" .pi/agents/orchestrator.md`
Expected: Line matching `send_agent_message` in frontmatter and body.

- [ ] **Step 4: Commit**

```bash
git add .pi/agents/orchestrator.md
git commit -m "feat: enable send_agent_message and update delegation rules in orchestrator prompt"
```

---

### Task 3: Update `team-orchestrator.ts` Extension Launch Prompt

**Files:**
- Modify: `.pi/extensions/team-orchestrator.ts`

**Interfaces:**
- Consumes: TmuxManager `sendPromptToPane`.
- Produces: Enhanced initial prompt sent to Pane 0 when `/team-dev` starts.

- [ ] **Step 1: Update startup prompt in `team-orchestrator.ts`**

Update the initial prompt sent to Orchestrator Pane 0 to explicitly instruct Orchestrator to:
- Scan `docs/brd/`, `docs/stories/`, and GitHub/Jira issues.
- Print the welcome banner and menu in Pane 0.
- Ask the user which option they would like to select (BRD, Story #, Random Implementation, or Custom Request).

- [ ] **Step 2: Compile TypeScript extensions**

Run: `npm run build` (or `npx tsc`)
Expected: Clean compilation with 0 errors.

- [ ] **Step 3: Commit**

```bash
git add .pi/extensions/team-orchestrator.ts dist/
git commit -m "feat: enhance /team-dev orchestrator launch prompt and menu initialization"
```

---

### Task 4: End-to-End Verification

**Files:**
- Test all modified files against project specifications.

- [ ] **Step 1: Verify TypeScript compilation**

Run: `npm run build`
Expected: `dist/` updated without errors.

- [ ] **Step 2: Verify git working directory status**

Run: `git status`
Expected: Clean working tree.

- [ ] **Step 3: Commit final verification checkpoint**

```bash
git status
```
