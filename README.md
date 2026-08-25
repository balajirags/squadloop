# SquadLoop — Your Autonomous Software Team (`squadloop`)

**SquadLoop** turns Pi Agent into an AI-native 5-agent software engineering team operating concurrently in a workspace (either 5 split panes in 1 window or 5 full-screen windows in tmux, or in regular mode on any terminal):

1. **🤖 Master Orchestrator (Pane 0 / Window 0)**: Central Human-in-the-Loop (HITL) command room. Displays interactive options (*"Implement BRD"*, *"Pick Story #42"*, *"Random Implementation"*, *"Custom Task"*), delegates tasks to child agents via `send_agent_message`, and manages state transitions.
2. **📋 BA - Business Analyst (Pane 1 / Window 1)**: Auto re-slices PRDs/BRDs into atomic user stories with Gherkin Acceptance Criteria (ACs), creating tickets in GitHub Issues, Jira, or local story files.
3. **💻 Developer - Fullstack (Pane 2 / Window 2)**: Implements code and unit tests following a 12-phase flow with strict directory boundary enforcement (`backend/`, `frontend/`), mandatory JaCoCo XML/HTML coverage report verification, and required git commit & push before handoff.
4. **🧪 QA - Quality Analyst (Pane 3 / Window 3)**: Verifies ACs against a **running live application server** (`http://localhost:8080` or `5173`) using live HTTP requests in a cold-read isolated context.
5. **🔍 Code Reviewer (Pane 4 / Window 4)**: Performs cold-read P1/P2 security & architectural audits on branch diffs, merges approved PRs to `main`, and signals task completion.

Based on the philosophy from [AI-Native Development Specifications](https://aishippingblog.com/p/ai-native-development-specifications).

---

## ⚡ Quickstart Guide

### Step 1: Install SquadLoop
```bash
npm install -g squadloop
# Or link locally from repo:
npm link
```

### Step 2: Initialize in Any Target Repository
Navigate to your project repository and run `squadloop init`:

```bash
cd ~/projects/my-company-app
squadloop init
```
*`squadloop init` automatically bootstraps `.pi/` extensions, `Agent.md`, `project-context.md`, and `docs/` template folders.*

### Step 3: Configure `project-context.md` & `.pi/team-config.json`
Set your build/test commands and source boundaries in `project-context.md`. Set your workflow mode and workspace preference in `.pi/team-config.json`.

### Step 4: Launch & Attach
```bash
squadloop start
squadloop attach
```

---

## ⚙️ Configuration (`.pi/team-config.json`)

Configure team workflow modes, workspace layouts, security policies, and workspace adapters directly in `.pi/team-config.json`:

```json
{
  "mode": "loop-hitl",
  "layout": "panes",
  "workspaceMode": "tmux",
  "destructiveCommandPolicy": "ask-human",
  "customProtectedFiles": []
}
```

### 🎛️ Workflow Modes (`"mode"`)
- **`"loop-hitl"` (Loop Human-In-The-Loop - Default)**:
  Runs a single story end-to-end (BA → Dev → QA → Reviewer → Done), then halts at Master Orchestrator Pane 0 awaiting human instruction before picking up the next story.
- **`"auto"` (Full Autonomous)**:
  Processes all backlog stories sequentially end-to-end without pausing until no uncompleted stories remain.
- **`"step-hitl"` (Step Human-In-The-Loop)**:
  Pauses for human approval at EVERY stage transition (BA → HITL → Dev → HITL → QA → HITL → Reviewer → HITL).

### 🖥️ Workspace Layouts & Modes
- **`"workspaceMode": "tmux"` (Default)**: Runs SquadLoop inside tmux using split panes or full-screen windows.
  - **`"layout": "panes"` (Default)**: 5 split panes within 1 window (`team`) for real-time visual collaboration.
  - **`"layout": "windows"`**: 5 full-screen windows within the same tmux session (`orchestrator`, `ba`, `developer`, `qa`, `reviewer`).
- **`"workspaceMode": "regular"` (No Tmux Required)**:
  Runs SquadLoop in regular headless event-bus mode on any terminal (iTerm2 tabs, VS Code splits, CI/CD).
  *(Note: If `"workspaceMode": "tmux"` is configured but `tmux` is missing from your system, SquadLoop halts and guides you to install `tmux` or switch to `"workspaceMode": "regular"`).*

---

## 🛡️ SquadLoop Security Guard

SquadLoop includes an automated pre-execution security guard extension (`.pi/extensions/security-guard.ts`):

1. **Non-Negotiable Protected Files**:
   - Reading `.env`, `.env.*`, `.bashrc`, `.zshrc`, `~/.ssh/` keys, `~/.aws/credentials`, and any paths listed in `"customProtectedFiles"` is **strictly hard-blocked by default** for all agents.
2. **Destructive Command Interception (`rm` & `git push --force`)**:
   - Governed by `"destructiveCommandPolicy"` in `.pi/team-config.json`:
     - **`"ask-human"` (Default)**: Intercepts `rm`, `git push --force`, or `git reset --hard` and requests human approval in Pane 0 (`yes` / `no`).
     - **`"block"`**: Automatically blocks all destructive commands with a security rejection error.
     - **`"allow"`**: Permits destructive commands without asking.

---

## 🎯 Extensible Delivery Tracker Strategy (`ITrackerAdapter`)

SquadLoop uses the **Strategy Pattern** (`ITrackerAdapter` and `TrackerFactory`) to manage story creation, status updates, and issue closure:

* **`GitHubIssuesAdapter`**: Uses `gh` CLI (`gh issue create`, `gh issue close`, `gh issue list`).
* **`JiraAdapter`**: Uses `jira` CLI or REST API (`jira issue create`, `jira issue move`).
* **`MarkdownStoryAdapter`**: Manages local markdown files in `docs/stories/<epic-slug>/`.

*Auto-Detection*: `TrackerFactory` reads `Delivery Tracker` in `project-context.md` automatically. Anyone can add a new tracker (e.g. Linear, Azure DevOps, Trello) by creating a new adapter in `.pi/extensions/trackers/`.

---

## 🛠️ CLI Commands (`squadloop`)

| Command | Description |
| :--- | :--- |
| `squadloop start` | Starts a fresh SquadLoop session, resets active task log (`status: "awaiting-human-input"`), and opens the workspace. |
| `squadloop resume` | Resumes an active SquadLoop session from `.pi/active-task.json` log. |
| `squadloop init` | Bootstraps `.pi/`, `Agent.md`, `project-context.md`, and template folders into current directory. |
| `squadloop attach` | Attaches directly to the `squadloop-workspace` tmux session. |
| `squadloop status` | Displays active task state, token usage, and estimated cost directly from terminal. |
| `squadloop config` | Displays or updates `.pi/team-config.json` (`mode`, `layout`, `workspaceMode`, `destructiveCommandPolicy`). |
| `squadloop help` | Displays the SquadLoop CLI usage guide and options. |

### Slash Command Aliases (Inside Pi)
- `/squadloop-start` (alias `/team-start`, `/team-dev`)
- `/squadloop-resume` (alias `/team-resume`)
- `/squadloop-recover` (alias `/team-recover`)

---

## 📊 Telemetry, Audit Logs & Context Isolation

- **End-of-Story Summary Card**: Displays an end-to-end verification report in Pane 0 upon story completion (`done`) detailing branch name, PR merge commit ID, JaCoCo coverage %, QA HTTP probe result, total tokens used, and estimated USD cost.
- **Rework Circuit Breaker**: If `reworkCount > 3`, auto-steering halts and emits an alert in Pane 0 for human guidance.
- **JSON Audit Checkpoints**: Writes audit logs for every story at `docs/dev-checkpoints/<story-id>.json`.
- **Targeted Context Clearing (`/clear`)**: Automatically issues `/clear` to target child agent panes ONLY when assigned a new story, preserving QA/Reviewer cold-read isolation without wiping mid-task rework notes.
- **Immune Persona Headers**: Custom `@persona` tmux properties lock titles on top of every pane, immune to terminal OSC title overrides.

---

## 📋 Prerequisites

Before running SquadLoop, ensure you have installed:

- **Node.js**: v20 or later
- **Pi Coding Agent**: Installed globally
  ```bash
  npm install -g @earendil-works/pi-coding-agent
  ```
- **tmux**: Required for multi-pane/window visualization (v3.2+)
  ```bash
  # macOS
  brew install tmux

  # Ubuntu/Debian
  sudo apt install tmux
  ```
- **GitHub CLI (`gh`)** *(Required if using GitHub Issues as Delivery Tracker)*:
  ```bash
  brew install gh
  gh auth login
  ```

---

## 🙏 Acknowledgements & Credits

SquadLoop bundles and integrates open-source agentic process skills and design frameworks. Special thanks and credit to the authors:

| Component / Framework | Author & Canonical Source | Description |
| :--- | :--- | :--- |
| **Superpowers** | [obra/superpowers](https://github.com/obra/superpowers) | Process skills for agentic engineering workflows (brainstorming, TDD, plan writing, subagent execution). |
| **Front-end Design & Taste** | [pbakaus/impeccable](https://github.com/pbakaus/impeccable) | Design systems, visual hierarchy, anti-slop frontend taste skills. |
| **Task Observer** | [rebelytics/one-skill-to-rule-them-all](https://github.com/rebelytics/one-skill-to-rule-them-all) | Continuous skill discovery and task observation engine ("One Skill to Rule Them All"). |
