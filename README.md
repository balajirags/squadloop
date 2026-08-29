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
*`squadloop init` automatically bootstraps `.squadloop/` extensions, `AGENTS.md`, `project-context.md`, and `docs/brd` + `docs/stories` directories.*

In the SquadLoop repo itself, the local guide lives in `AGENTS.md`. The shipped template lives at `.squadloop/templates/Agent.md` and is copied into target repositories as `AGENTS.md`.

### Step 3: Configure `project-context.md` & `.squadloop/config.json`
Set your build/test commands and source boundaries in `project-context.md`. Set your workflow mode and workspace preference in `.squadloop/config.json`.


### Step 4: Launch & Attach
```bash
squadloop start
squadloop attach
```

### Step 5: Manage Packages
```bash
squadloop install npm:pi-web-access
squadloop remove npm:pi-web-access
squadloop list
```

---

## ⚙️ Configuration (`.squadloop/config.json`)

Configure execution modes, human-in-the-loop steering, terminal drivers, and workspace layouts in `.squadloop/config.json` or via CLI flags:

```json
{
  "exMode": "team",
  "hitl": "loop",
  "driver": "tmux",
  "layout": "panes",
  "destructiveCommandPolicy": "ask-human",
  "customProtectedFiles": [],
  "_modelExamples": {
    "anthropic": "anthropic/claude-3-7-sonnet",
    "google": "google/gemini-2.5-flash",
    "openai": "openai/gpt-4o",
    "deepseek": "deepseek/deepseek-reasoner",
    "openrouter": "openrouter/anthropic/claude-3.7-sonnet",
    "ollama": "ollama/gemma4"
  },
  "models": {
    "orchestrator": "",
    "ba": "",
    "developer": "",
    "qa": "",
    "reviewer": ""
  }
}
```

### 🚀 Execution Modes (`--ex-mode=team|standalone`)
- **`"exMode": "team"` (Default)**: Spawns 5 predefined agents (Orchestrator, BA, Developer, QA, Reviewer) across split screens (panes) or multiple windows/tabs.
- **`"exMode": "standalone"`**: Starts a single `pi` session directly in the active terminal window. Hot-swap agent personas dynamically via `/ba`, `/dev`, `/qa`, `/reviewer`, or `/*.agent.md` while leveraging internal subagents (`Agent(...)`).

### 🎛️ Human-In-The-Loop Steering (`--hitl=loop|step|auto`)
- **`"hitl": "loop"` (Default)**: Runs a story end-to-end (BA → Dev → QA → Reviewer → Done), then halts at Master Orchestrator awaiting human instruction before picking up the next story.
- **`"hitl": "step"`**: Pauses for human approval at EVERY stage transition (BA → HITL → Dev → HITL → QA → HITL → Reviewer → HITL).
- **`"hitl": "auto"`**: Processes all backlog stories sequentially end-to-end without pausing until no uncompleted stories remain.

### 🖥️ Terminal Drivers (`--driver=tmux|herdr|iterm2|regular`) & Layouts (`--layout=panes|windows`)
- **`"driver": "tmux"` (Default)**: Multi-pane split screen or 5-window tmux workspace.
- **`"driver": "herdr"`**: Herdr CLI multi-process session manager.
- **`"driver": "iterm2"`**: Native macOS iTerm2 split panes or tabbed window management via AppleScript.
- **`"driver": "regular"`**: Standalone or CI/CD direct terminal runner.

### 🤖 Per-Agent Model Customization & Local Providers

You can customize models per agent role directly in `.squadloop/config.json` or connect local/custom LLM providers:
1. **Per-Agent Model Overrides (`.squadloop/config.json`)**: Configure explicit model IDs per role under `"models"` (e.g. `"developer": "anthropic/claude-3-7-sonnet"`). If left empty (`""`), agents fall back to the active environment default model. Refer to `"_modelExamples"` in `.squadloop/config.json` for copy-paste model format examples across major providers.
2. **Standard Cloud Providers (Zero-Copy)**: Standard cloud providers (Anthropic, OpenAI, Google Gemini, DeepSeek, OpenRouter) work out of the box with zero additional setup when standard API keys (e.g. `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`) are present in your environment.
3. **Local & Custom Providers (`.squadloop/models.json`)**:
   Copy `.squadloop/models.example.json` to `.squadloop/models.json` (or `~/.squadloop/agent/models.json`) to configure local Ollama, vLLM, LM Studio, or custom proxies. SquadLoop automatically syncs project `.squadloop/models.json` to the global Pi Agent provider table on launch.
4. **Bundled Pi Packages (`.squadloop/settings.json`)**:
   SquadLoop ships a curated `packages` list (for example `pi-subagents` and `pi-web-access`) so Pi auto-installs them on trusted project startup. Users do not install packages manually.

### 🔌 Package Commands
- `squadloop install <source>` installs a Pi package into the current project with `pi install <source> -l`.
- `squadloop remove <source>` removes a project-local package with `pi remove <source> -l`.
- `squadloop list` lists the packages declared in `.squadloop/settings.json`.
- Packages install into the current project’s `.squadloop/settings.json` and are loaded on the next `squadloop start`.

---

## 🛡️ SquadLoop Security Guard

SquadLoop includes an automated pre-execution security guard extension (`.squadloop/extensions/security-guard.ts`):

1. **Non-Negotiable Protected Files**:
   - Reading `.env`, `.env.*`, `.bashrc`, `.zshrc`, `~/.ssh/` keys, `~/.aws/credentials`, and any paths listed in `"customProtectedFiles"` is **strictly hard-blocked by default** for all agents.
2. **Destructive Command Interception (`rm` & `git push --force`)**:
   - Governed by `"destructiveCommandPolicy"` in `.squadloop/config.json`:
     - **`"ask-human"` (Default)**: Intercepts `rm`, `git push --force`, or `git reset --hard` and requests human approval in Pane 0 (`yes` / `no`).
     - **`"block"`**: Automatically blocks all destructive commands with a security rejection error.
     - **`"allow"`**: Permits destructive commands without asking.

---

## 🎯 Extensible Delivery Tracker Strategy (`ITrackerAdapter`)

SquadLoop uses the **Strategy Pattern** (`ITrackerAdapter` and `TrackerFactory`) to manage story creation, status updates, and issue closure:

* **`GitHubIssuesAdapter`**: Uses `gh` CLI (`gh issue create`, `gh issue close`, `gh issue list`).
* **`JiraAdapter`**: Uses `jira` CLI or REST API (`jira issue create`, `jira issue move`).
* **`MarkdownStoryAdapter`**: Manages local markdown files in `docs/stories/<epic-slug>/`.

*Auto-Detection*: `TrackerFactory` reads `Delivery Tracker` in `project-context.md` automatically. Anyone can add a new tracker (e.g. Linear, Azure DevOps, Trello) by creating a new adapter in `.squadloop/extensions/trackers/` (see `.squadloop/extensions/trackers/README.md`).

---

## 🛠️ CLI Commands (`squadloop`)

```bash
squadloop start [--ex-mode=team|standalone] [--hitl=loop|step|auto] [--driver=tmux|herdr|iterm2|regular] [--layout=panes|windows]
squadloop resume [--ex-mode=team|standalone] [--hitl=loop|step|auto] [--driver=tmux|herdr|iterm2|regular] [--layout=panes|windows]
squadloop config [ex-mode=team|standalone] [hitl=loop|step|auto] [driver=tmux|herdr|iterm2|regular] [layout=panes|windows]
squadloop attach
squadloop status
squadloop init
squadloop update
squadloop doctor
```

| Command | Description |
| :--- | :--- |
| `squadloop start` | Launches a SquadLoop workspace session using config defaults or CLI flag overrides. |
| `squadloop resume` | Resumes an active SquadLoop session from `.squadloop/active-task.json` log. |
| `squadloop config` | Displays or updates persistent defaults in `.squadloop/config.json` (`exMode`, `hitl`, `driver`, `layout`). |
| `squadloop attach` | Attaches directly to the active workspace session in the configured terminal driver (`tmux`, `herdr`, `iterm2`). |
| `squadloop status` | Displays active task state, token usage, and estimated cost directly from terminal. |
| `squadloop init` | Bootstraps `.squadloop/` config defaults (`config.json`), `AGENTS.md`, `project-context.md`, and docs/story directories into current directory. |
| `squadloop install` / `remove` / `list` | Adds/removes/lists project-local Pi packages in `.squadloop/settings.json`. |
| `squadloop help` | Displays the SquadLoop CLI usage guide and flag options. |

### Slash Commands (Inside Pi)
- `/squadloop-start` — Fresh session launch
- `/squadloop-resume` — Session recovery from log
- `/squadloop-recover` — Recovery for closed/crashed agent panes or windows

---

## 📊 Telemetry, Audit Logs & Event Bus

- **0.9s Instant Workspace Launch**: Workspace creation is constructed locally in Node.js without network/LLM API delays.
- **100% Reliable Event Bus (`.squadloop/events.jsonl`)**: Persistent append-only event log with automatic 1,000-event log rotation cap.
- **`get_team_events` Tool**: Allows Master Orchestrator in Pane 0 to query recent event log entries at any time.
- **End-of-Story Summary Card**: Displays an end-to-end verification report in Pane 0 upon story completion (`done`) detailing branch name, PR merge commit ID, JaCoCo coverage %, QA HTTP probe result, total tokens used, and estimated USD cost.
- **Rework Circuit Breaker**: If `reworkCount > 3`, auto-steering halts and emits an alert in Pane 0 for human guidance.
- **JSON Audit Checkpoints**: Writes audit logs for every story at `docs/dev-checkpoints/<story-id>.json`.
- **Targeted Context Clearing (`/clear`)**: Automatically issues `/clear` (with a 1.5s delay buffer) to target child agent panes ONLY when assigned a new story.
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

SquadLoop is built on top of Pi Coding Agent and integrates open-source agentic process skills and design frameworks. Special thanks and credit to the authors:

| Component / Framework | Author & Canonical Source | Description |
| :--- | :--- | :--- |
| **Pi Coding Agent** | [@earendil-works/pi-coding-agent](https://github.com/earendil-works/pi-coding-agent) | The core AI coding agent harness and extension engine powering SquadLoop. |
| **Superpowers** | [obra/superpowers](https://github.com/obra/superpowers) | Process skills for agentic engineering workflows (brainstorming, TDD, plan writing, subagent execution). |
| **Front-end Design & Taste** | [pbakaus/impeccable](https://github.com/pbakaus/impeccable) | Design systems, visual hierarchy, anti-slop frontend taste skills. |
| **Task Observer** | [rebelytics/one-skill-to-rule-them-all](https://github.com/rebelytics/one-skill-to-rule-them-all) | Continuous skill discovery and task observation engine ("One Skill to Rule Them All"). |
