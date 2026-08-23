# Master Orchestrator Control & Task Delegation Design

## Executive Summary
This spec defines the interactive startup, menu control flow, task allocation matrix, inter-agent messaging, and context loading for `pi-team`. When `pi-team` starts via `/team-dev`, control is immediately anchored in **Pane 0 (Master Orchestrator)**. The human operator can instruct the Orchestrator to:
1. Implement a BRD / PRD
2. Pick a specific Story / Issue
3. Perform a Random Implementation (random story, random BRD, or feature candidate)
4. Handle custom tasks or bug fixes

The Orchestrator then delegates tasks to child agents (**BA**, **Developer**, **QA**, **Reviewer**) in their designated tmux panes via the `send_agent_message` tool and monitors execution through `team_update_status` events.

---

## 1. Interactive Startup & Control Flow

### 1.1 Tmux 5-Pane Layout
When `/team-dev` is executed, a tmux session named `pi-team` is initialized with 5 agent panes:
- **Pane 0**: `ORCHESTRATOR` (`pi -a orchestrator`) - Top pane (25% height)
- **Pane 1**: `BUSINESS ANALYST (BA)` (`pi -a ba`) - Bottom-left
- **Pane 2**: `DEVELOPER (DEV)` (`pi -a developer`) - Bottom-right
- **Pane 3**: `QUALITY ANALYST (QA)` (`pi -a qa`) - Middle-left
- **Pane 4**: `CODE REVIEWER (REVIEWER)` (`pi -a reviewer`) - Middle-right

### 1.2 Startup Welcome & Menu Selection
Upon startup, `team-orchestrator.ts` sends an initial prompt to Pane 0 instructing Master Orchestrator to scan existing files (`docs/brd/`, `docs/stories/`, active GitHub/Jira issues) and present a welcome banner in Pane 0:

```text
==============================================================
🤖 MASTER ORCHESTRATOR ONLINE [--team-mode=loop-hitl]
==============================================================
Please select an option or state your request:

1. 📄 Implement a BRD / PRD (e.g., 'Groom & implement docs/brd/campaigns.md')
2. 📌 Pick a specific Story / Issue (e.g., 'Implement Story #12')
3. 🎲 Random Implementation (e.g., 'Pick a random story / random feature')
4. 🛠️ Custom Task / Bug Fix (e.g., 'Fix NPE in auth controller')
==============================================================
```

Pane 0 serves as the primary Human-in-the-Loop (HITL) command interface.

---

## 2. Task Allocation & Delegation Matrix

| Intent Category | Human Input Example | Orchestrator Action | Target Child Agent |
| :--- | :--- | :--- | :--- |
| **BRD / PRD Implementation** | *"Proceed with docs/brd/campaigns.md"* | Calls `send_agent_message` to BA with instructions to read BRD, run Auto Re-slice, create stories with Gherkin ACs, and mark status `ready-for-dev`. | **BA (Pane 1)** |
| **Specific Story / Issue** | *"Implement Story #42"* | Checks story status. If `ready-for-dev`, calls `send_agent_message` to Developer. If ungroomed, routes to BA first. | **Developer (Pane 2)** / **BA (Pane 1)** |
| **Random Implementation** | *"Pick a random story"* or *"Random feature"* | Scans `docs/stories/`, `docs/brd/`, or GitHub/Jira issues. Picks an uncompleted story/BRD at random. If backlog is empty, synthesizes a feature recommendation based on `project-context.md` and delegates to BA. | **Developer (Pane 2)** or **BA (Pane 1)** |
| **Custom Task / Bugfix** | *"Fix NPE in auth controller"* | Sends direct task requirements to Developer pane. | **Developer (Pane 2)** |
| **QA Verification** | *"QA verify issue #10"* | Sends direct QA instructions to QA pane. | **QA (Pane 3)** |
| **Code Review** | *"Review PR #12"* | Sends direct review instructions to Reviewer pane. | **Reviewer (Pane 4)** |

---

## 3. Tooling & Inter-Agent Communication

### 3.1 Orchestrator Frontmatter Configuration
Update `.pi/agents/orchestrator.md` frontmatter to include `send_agent_message`:
```yaml
tools: read, bash, team_update_status, send_agent_message
```

### 3.2 Inter-Agent Message Execution
The `send_agent_message` tool sends tmux keystrokes to the target pane.
- `send_agent_message(targetRole, message)` formats the prompt and executes `tmux send-keys -t <pane_id> "<message>" Enter`.

### 3.3 Event-Driven Status Lifecycle
Child agents execute their tasks and call `team_update_status`:
- Status transitions: `ba-in-progress` → `ready-for-dev` → `dev-in-progress` → `qa-verifying` → `code-review` → `done` (or `dev-rework`).
- `team_update_status` sends an event notification back to Orchestrator Pane 0 (`EVENT: Task #<id> updated to '<status>'`).
- In `loop-hitl` mode, once a story reaches `done`, the workflow halts at Orchestrator Pane 0 awaiting human instruction to pick or start the next task.
- In `auto` mode, Orchestrator automatically picks and dispatches the next task in the backlog.

---

## 4. Persistent Project Context (`Agent.md`)

A root `Agent.md` file is established at the project root to ensure every agent session loaded in this workspace receives full context on:
1. **Team Architecture**: 5-pane tmux session structure and agent persona roles.
2. **Control Model**: Orchestrator Pane 0 entry point, intent menu, task allocation rules.
3. **Workflow Modes**: Definitions and behaviors for `--team-mode=loop-hitl`, `--team-mode=auto`, and `--team-mode=step-hitl`.
4. **Project Boundaries & Quality Gates**: `backend/` and `frontend/` directory boundaries, JaCoCo coverage verification, live app server QA checks, P1/P2 code reviews, and mandatory PR branch merges before `done`.

---

## 5. Verification & Testing Plan
1. **Tool Accessibility**: Verify Orchestrator agent has access to `send_agent_message` tool.
2. **Startup & Greeting Menu**: Test launching `/team-dev` and verify Pane 0 displays the welcome banner and prompt.
3. **BRD Grooming Flow**: Send a BRD command in Pane 0, verify Orchestrator delegates to BA in Pane 1.
4. **Story Implementation Flow**: Send a specific story command, verify Orchestrator delegates to Dev in Pane 2.
5. **Random Implementation Flow**: Send "random task" command, verify Orchestrator selects an uncompleted task or feature recommendation and delegates appropriately.
6. **Context Alignment**: Verify `Agent.md` is present at the project root and readable by all agent sessions.
