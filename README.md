# Pi Agent Multi-Agent Development Team (`pi-agent-team`)

`pi-agent-team` turns Pi Agent into an AI-native 5-agent software development team that operates concurrently in a 5-pane tmux window:

1. **Master Orchestrator (Pane 0)**: Pi Agent session that manages state transitions across subagents, displays live progress, and provides interactive workflow control.
2. **BA - Business Analyst (Pane 1)**: Auto re-slices PRDs into atomic stories with Gherkin Acceptance Criteria (AC), respecting GitHub Issues / Jira / Local tracker settings.
3. **Developer - Fullstack (Pane 2)**: Implements code and unit tests following a 12-phase flow with strict directory boundary enforcement (`backend/`, `frontend/`), mandatory JaCoCo/HTML coverage report verification, and required git commit & push before handoff.
4. **QA - Quality Analyst (Pane 3)**: Verifies ACs against a **running application server** (`http://localhost:8080`) using live HTTP requests in an isolated context.
5. **Code Reviewer (Pane 4)**: Performs cold-read P1/P2 security & architecture audits with a 2-cycle circuit breaker.

Based on the philosophy from [AI-Native Development Specifications](https://aishippingblog.com/p/ai-native-development-specifications).

---

## 🎛 Workflow Modes (`--team-mode`)

Specify the workflow control mode using the `--team-mode` flag:

- **`--team-mode=loop` (Loop Human-In-The-Loop - Recommended)**:
  Runs a single story automatically and hands-off through BA → Dev → QA → Reviewer → Done, then pauses at the Master Orchestrator for human review/approval before picking up the next story in the backlog.
- **`--team-mode=auto` (Full Autonomous)**:
  Processes all stories sequentially in the backlog end-to-end without any HITL pause points.
- **`--team-mode=step` (Step Human-In-The-Loop - Default)**:
  Pauses for human approval at EVERY agent transition (BA → HITL → Dev → HITL → QA → HITL → Reviewer → HITL).

---

## 📋 Prerequisites

Before running the team, ensure you have the following installed:

- **Node.js**: v20 or later
- **Pi Coding Agent**: Installed globally
  ```bash
  npm install -g @earendil-works/pi-coding-agent
  ```
- **tmux**: Required for multi-pane visualization (v3.2+)
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

## 🚀 How to Run in a Repo

### Step 1: Copy `.pi` Directory & Templates
Copy the `.pi/` folder and `docs/templates/` into your target repository's root:

```bash
# Inside your project root:
cp -r /path/to/pi-team/.pi .
cp -r /path/to/pi-team/docs/templates docs/templates
```

### Step 2: Configure `project-context.md`
Copy the template and configure your repository boundaries, build/test commands, and delivery tracker:

```bash
cp docs/templates/project-context.template.md project-context.md
```

Edit `project-context.md` to set:
- **Repository**: GitHub URL and commit message format.
- **Source Layout**: Specify `Backend root` (e.g., `backend/`) and `Frontend root` (e.g., `frontend/`). Agents will strictly enforce these directory boundaries.
- **Delivery Tracker**: Set to `GitHub Issues`, `Jira`, or `Local docs`.
- **Commands**: Build, test, lint, and run commands.
- **Quality Thresholds**: Minimum line/branch test coverage percentages.

### Step 3: Add Your PRD or BRD
Place your requirement document in `prd.md` or `docs/brd/my-feature.md`.

### Step 4: Launch the Agent Team
Launch Pi with the `--team-mode` flag:

```bash
# From terminal / bash:
pi "/team-dev --team-mode=loop"
pi "/team-dev --team-mode=auto"
pi "/team-dev --team-mode=step"

# Or inside an interactive Pi session:
/team-dev --team-mode=loop
```

### Step 5: Attach to the 5-Pane Tmux Workspace
Open a separate terminal window and attach to the tmux session:

```bash
tmux attach -t pi-team
```

#### Tmux 5-Pane Workspace Layout:
```
+------------------------------------------------------------------------+
| Pane 0: [MASTER ORCHESTRATOR] Pi Agent Session (Interactive Control)   |
+------------------------------------+-----------------------------------+
| Pane 1: [BA - Business Analyst]    | Pane 2: [DEV - Fullstack Dev]     |
| pi -a ba                           | pi -a developer                   |
+------------------------------------+-----------------------------------+
| Pane 3: [QA - Quality Analyst]     | Pane 4: [REVIEWER - Code Review]  |
| pi -a qa                           | pi -a reviewer                    |
+------------------------------------+-----------------------------------+
```

---

## 💡 Interacting with the Team

- **Interact with Orchestrator (Pane 0)**: Type questions or commands directly to the Orchestrator (e.g., `"what is the status?"`, `"pause"`, `"skip issue #2"`, `"switch to auto"`).
- **Interact with Subagents (Panes 1–4)**: Click or switch focus to any subagent pane in tmux (`Ctrl+B` then arrow keys) to view raw tool calls, provide additional instructions, or inspect live logs.

---

## 🔧 Troubleshooting

- **Restarting Session**: To clean up and restart a team run from scratch:
  ```bash
  tmux kill-session -t pi-team
  ```
- **Rebuilding Extensions**: If you edit `.pi/extensions/*.ts`, rebuild the package:
  ```bash
  npm run build
  ```
