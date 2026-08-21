# Pi Agent Multi-Agent Development Team Design Spec

**Date**: 2026-03-09  
**Status**: Approved  
**Target Platform**: Pi Agent (`@earendil-works/pi-coding-agent`) & tmux  

---

## 1. Executive Summary

This spec defines the architecture and design for customising Pi Agent into a **multi-agent development team** packaged as a reusable **Pi Package**. The system models a software development lifecycle with 4 specialized AI agent personas operating concurrently in a 2x2 tmux window grid:

1. **BA (Business Analyst)**: Decomposes PRDs into atomic task specs with explicit Acceptance Criteria (AC).
2. **Developer (Fullstack)**: Implements feature code and unit tests based on task specs and project context.
3. **QA (Quality Analyst)**: Verifies working code and executes test/bash validation suites against ACs.
4. **Code Reviewer**: Audits git diffs, code quality, security, and architectural alignment.

The workflow operates in an automated or human-in-the-loop (HITL) loop until all backlog items in GitHub Issues or Jira are cleared, adhering to the principles outlined in [AI-Native Development Specifications](https://aishippingblog.com/p/ai-native-development-specifications).

---

## 2. Input Context & Package Structure

### 2.1 Pre-fetched Input Context
The system expects three pre-existing input artifacts in the project directory prior to launch:
- **`project-context.md`**: Contains information about the tech stack (frontend/backend), folder structure, key setup/build/test commands, Git repository details, and Jira or GitHub issue links.
- **`prd.md`**: The raw Product Requirements Document to be implemented.
- **Pre-fetched Skills**: Stored in `.pi/skills/` (or installed via Pi package), providing specialized prompt workflows and checklists for subagents.

### 2.2 Reusable Pi Package Layout
The multi-agent team is structured as a shareable Pi Package (`pi-agent-team`) compatible with `pi install`:

```
project-root/
├── package.json               # Package manifest tagged with "keywords": ["pi-package"]
├── project-context.md         # Tech stack, repo guidelines, test commands, issue tracker links
├── prd.md                     # Target Product Requirements Document
├── .pi/
│   ├── active-task.json       # Light JSON cache tracking the currently active issue ID
│   ├── agents/                # Persona markdown definitions
│   │   ├── ba.md              # Business Analyst prompt + frontmatter
│   │   ├── developer.md       # Developer prompt + frontmatter
│   │   ├── qa.md              # QA Analyst prompt + frontmatter
│   │   └── reviewer.md        # Code Reviewer prompt + frontmatter
│   ├── skills/                # Local/Pre-fetched skills
│   │   ├── prd-breakdown/     # Skill for BA issue breakdown
│   │   ├── fullstack-dev/     # Skill for fullstack implementation
│   │   ├── ac-verification/   # Skill for QA automated verification
│   │   └── code-review/       # Skill for Code Reviewer checklist
│   └── extensions/            # TypeScript extension sources
│       ├── team-orchestrator.ts # Core Orchestrator & /team-dev command
│       ├── tmux-manager.ts    # Tmux grid layout launcher & IPC
│       └── backlog-tool.ts    # team_update_status custom tool definition
```

---

## 3. Architecture & Tmux Layout

### 3.1 Tmux Grid Display (Option A)
When `/team-dev` is executed, the orchestrator constructs a 2x2 tmux window split where each pane runs an interactive `pi` instance with full terminal UI capabilities (tool boxes, live text streaming, color output):

```
+------------------------------------+------------------------------------+
| Pane 0: [BA - Business Analyst]   | Pane 1: [DEV - Fullstack Dev]      |
| pi -a ba                           | pi -a developer                    |
+------------------------------------+------------------------------------+
| Pane 2: [QA - Quality Analyst]     | Pane 3: [REVIEWER - Code Review]   |
| pi -a qa                           | pi -a reviewer                     |
+------------------------------------+------------------------------------+
```

### 3.2 Inter-Agent Signaling & Communication Protocol
Communication across panes occurs through a hybrid event model:
1. **Source of Truth**: GitHub Issues (via `gh` CLI) or Jira tickets.
2. **Custom Tool (`team_update_status`)**:
   Every subagent has access to a tool registered by `backlog-tool.ts`:
   ```typescript
   team_update_status({
     issueId: "42",
     newStatus: "qa-verifying", // ba-done, dev-done, qa-passed, qa-failed, review-approved
     notes: "Implemented feature and unit tests in /src/api/auth.ts."
   });
   ```
3. **Orchestrator Reaction**:
   - Calling `team_update_status` transitions the issue state on GitHub/Jira and updates `.pi/active-task.json`.
   - The Orchestrator intercepts this call.
   - **In HITL Mode**: Prompts human operator in master pane or tmux status bar:
     > `[HITL Checkpoint] Issue #42 is ready for QA. Proceed? [Y/n/edit]`
   - **In Auto Mode**: Automatically executes `tmux send-keys` to send the prompt to the target pane (e.g. Pane 2 for QA):
     > `"Issue #42 is ready for verification. Read issue ACs and project-context.md, execute test commands via bash, and update status."`

---

## 4. Workflow State Machine & Lifecycle

### 4.1 State Machine

| Stage | Issue Status | Active Agent | Action / Output |
|-------|--------------|--------------|-----------------|
| **1. Specification** | `ba-in-progress` → `ready-for-dev` | BA | Parses PRD & project context; creates GitHub/Jira issue with AC checklist. |
| **2. Implementation** | `dev-in-progress` → `qa-verifying` | Developer | Checkout `feature/issue-<id>`; implements code & unit tests; confirms local build. |
| **3. Verification** | `qa-verifying` → `code-review` (or `dev-rework`) | QA | Fetches branch; executes tests/bash scripts against ACs; posts report comment. |
| **4. Review** | `code-review` → `done` (or `dev-rework`) | Reviewer | Inspects `git diff main...HEAD`; checks security/quality; approves PR & closes issue. |

### 4.2 Loop Execution
The loop iterates sequentially through all created issues until the backlog is empty. If QA or Code Reviewer rejects a task, status resets to `dev-rework` (with a max rework count of 3 before triggering HITL escalation).

---

## 5. Agent Persona Specifications

### 5.1 BA Persona (`ba.md`)
- **System Prompt Focus**: Require explicit, checkable Acceptance Criteria in Gherkin or bullet form.
- **Tools**: `read`, `write`, `edit`, `bash` (`gh` CLI / Jira API), `team_update_status`.
- **Skills**: `prd-breakdown`.

### 5.2 Developer Persona (`developer.md`)
- **System Prompt Focus**: Follow conventions in `project-context.md`. Always create isolated git feature branches and run tests locally before handing off to QA.
- **Tools**: `read`, `edit`, `write`, `bash`, `team_update_status`.
- **Skills**: `fullstack-dev`, `test-driven-development`.

### 5.3 QA Persona (`qa.md`)
- **System Prompt Focus**: Never accept unverified code. Run bash test scripts, linter, and curl probers. Post exact CLI output on the issue comment.
- **Tools**: `read`, `bash`, `team_update_status`.
- **Skills**: `ac-verification`, `verification-before-completion`.

### 5.4 Code Reviewer Persona (`reviewer.md`)
- **System Prompt Focus**: Perform code audit against `project-context.md` standards, security vulnerabilities, edge cases, and PR cleanliness.
- **Tools**: `read`, `bash` (`git diff`, `gh pr`), `team_update_status`.
- **Skills**: `code-review`.

---

## 6. Verification & Self-Review Checklist

1. **Placeholder Scan**: No TBDs, TODOs, or unassigned state transitions.
2. **Internal Consistency**: Issue Tracker states (`ready-for-dev`, `qa-verifying`, `code-review`, `done`) map 1:1 across agent tools, extension events, and tmux send-keys triggers.
3. **Scope Check**: Single unified package design focusing on tmux orchestration and Pi extension interfaces.
4. **Ambiguity Check**: Clear fallback from GitHub Issues to local JSON cache for offline/standalone execution.
