# SquadLoop — Your Autonomous Software Team (`AGENTS.md`)

This repository is powered by an AI-native 5-agent team operating concurrently in a 5-pane tmux workspace. Every agent session initialized in this directory must adhere to the rules, context, and operational parameters below.

---

## 🏛️ Team Architecture & Pane Layout

```
+------------------------------------------------------------------------+
| Pane 0: [MASTER ORCHESTRATOR] Intent-Based Router & Interactive Control|
| Command: pi -a orchestrator                                            |
+------------------------------------+-----------------------------------+
| Pane 1: [BUSINESS ANALYST (BA)]    | Pane 2: [DEVELOPER (DEV)]         |
| Command: pi -a ba                  | Command: pi -a developer          |
+------------------------------------+-----------------------------------+
| Pane 3: [QUALITY ANALYST (QA)]     | Pane 4: [CODE REVIEWER (REVIEWER)]|
| Command: pi -a qa                  | Command: pi -a reviewer           |
+------------------------------------+-----------------------------------+
```

- **Pane 0: Master Orchestrator** (`orchestrator`): Central Human-in-the-Loop command room. Parses intent, allocates tasks to subagents via `send_agent_message`, and controls state transitions.
- **Pane 1: Business Analyst** (`ba`): Re-slices PRDs/BRDs into atomic user stories with Gherkin Acceptance Criteria and tracks them in the configured delivery system.
- **Pane 2: Fullstack Developer** (`developer`): Implements code and unit tests within the repo’s source boundaries.
- **Pane 3: Quality Analyst** (`qa`): Validates story ACs against a running live system using HTTP probes and records evidence.
- **Pane 4: Code Reviewer** (`reviewer`): Performs cold-read P1/P2 security and architectural audits on branch diffs.

---

## 🤖 Orchestrator Control & Task Allocation

Master Orchestrator (Pane 0) is the single entry point for human instructions.
🚫 **STRICT DELEGATION RULE**: Orchestrator delegates requirement grooming and story creation to the **BA agent (`ba`)** in Pane 1 via `send_agent_message`.

Typical flows:
1. **Implement a BRD / PRD**: Orchestrator sends the BRD/PRD to BA, which creates atomic stories with ACs and updates them to `ready-for-dev`.
2. **Pick a Specific Story / Issue**: Orchestrator checks status and dispatches Developer if the story is ready.
3. **Random Implementation**: Orchestrator scans the backlog and delegates an uncompleted item.
4. **Custom Task / Bug Fix**: Orchestrator sends the request directly to Developer.

---

## ⚙️ Configuration & Team Commands (`.squadloop/config.json`)

The SquadLoop team configuration is managed directly via `.squadloop/config.json`:

```json
{
  "mode": "loop-hitl",
  "layout": "panes",
  "workspaceMode": "tmux",
  "destructiveCommandPolicy": "ask-human",
  "customProtectedFiles": []
}
```

- **`mode`**: `loop-hitl` (default), `step-hitl`, or `auto`.
- **`layout`**: `panes` (default split) or `windows`.
- **`workspaceMode`**: `tmux` (default) or `regular`.
- **`destructiveCommandPolicy`**: `ask-human` (default), `block`, or `allow`.
- **`customProtectedFiles`**: Additional sensitive file patterns to hard-block from reading.

### 🚀 CLI & Slash Commands
- **`squadloop start`**: Starts a fresh team session and attaches directly.
- **`squadloop resume`**: Resumes an active session.
- **`squadloop init`**: Bootstraps `.squadloop/` extensions, `AGENTS.md`, `project-context.md`, `docs/brd` + `docs/stories`, and bundled packages into any target repository.
- **`squadloop attach`**: Attaches directly to the workspace session.
- **`squadloop status`**: Displays active task state, token usage, and estimated cost.
- **`/squadloop-recover`**: Recovers a closed or crashed agent pane or window.

---

## 🛡️ SquadLoop Security Guard

- **Non-Negotiable Protected Files**: Reading `.env`, `.env.*`, `.bashrc`, `.zshrc`, `~/.ssh/` keys, `~/.aws/credentials`, and any files in `customProtectedFiles` is strictly prohibited by default.
- **Destructive Command Interception**: Commands matching `rm`, `git push --force`, or `git reset --hard` trigger human approval requests when `destructiveCommandPolicy` is `ask-human`.

---

## 🎛️ Workflow Modes & Automated Context Clearing

- **`loop-hitl`**: Runs a story end-to-end (BA → Dev → QA → Reviewer → Done), then pauses for human approval.
- **`auto`**: Processes backlog stories sequentially without pausing.
- **`step-hitl`**: Pauses for human approval at every stage transition.

### 🧹 Automatic Context Clearing (`/clear`)
When a task or message is assigned, target panes should be cleared before reuse:
- **Developer Pane**: before `ready-for-dev` / `dev-rework`
- **QA Pane**: before `qa-verifying`
- **Reviewer Pane**: before `code-review`
- **BA Pane**: before new story/BRD grooming assignment

---

## 🎯 Delivery Tracker Strategy Pattern (`ITrackerAdapter`)

SquadLoop uses `ITrackerAdapter` and `TrackerFactory` to interact with the configured delivery tracker from `project-context.md`:

- **`GitHubIssuesAdapter`**: Uses `gh` CLI.
- **`JiraAdapter`**: Uses `jira` CLI / REST API.
- **`MarkdownStoryAdapter`**: Uses local markdown files in `docs/stories/<epic>/<story>.md`.

The delivery tracker is the source of truth for story requirements, ACs, and lifecycle state. `.squadloop/active-task.json` is only an ephemeral pointer for live session steering.

---

## 📐 Project Boundaries & Quality Thresholds

1. **Source Layout Boundaries**:
   - Backend code, Gradle configuration, and tests MUST live in `backend/`.
   - Frontend React/Vite code and config MUST live in `frontend/`.
   - Root level is reserved for team configuration, documentation, and extension files.
2. **Coverage Inspection Gate**:
   - Developer MUST inspect actual coverage report files before claiming coverage thresholds are satisfied.
3. **Live App Verification Gate**:
   - QA MUST test against a reachable live application server before issuing a pass verdict.
4. **Code Review & Branch Merge Gate**:
   - Reviewer performs P1/P2 audit and approved code MUST be merged before status is set to `done`.


## Intent
- `AGENTS.md` = local repo rules for maintaining SquadLoop.
- `.squadloop/templates/Agent.md` = template copied into target repositories by `squadloop init` as `AGENTS.md`.
- `AGENTS.md` keeps the local guide separate from the shipped `Agent.md` template.

## Local Rules
- Keep the local `.squadloop/` bootstrap aligned with what `squadloop init` writes.
- Preserve the project-local package workflow: `squadloop install|remove|list` maps to Pi project-local packages.
- Keep bundled packages in `.squadloop/settings.json` and treat them as part of the product experience.
- When changing bootstrap behavior, verify `squadloop init`, `start`, `status`, and `doctor` still work.
- Run `npm run build` before claiming changes are done.

## Editing Expectations
- Prefer small, focused changes.
- Keep target-repo guidance in `.squadloop/templates/Agent.md`; do not move local repo rules there unless they are meant to be shipped.
- Update README if the local-vs-target distinction changes.
