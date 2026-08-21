# Pi Agent Multi-Agent Development Team (`pi-agent-team`)

`pi-agent-team` turns Pi Agent into an AI-native 5-agent software development team that operates concurrently in a 5-pane tmux window:

1. **Master Orchestrator**: Pi Agent session running in Pane 0 that manages state transitions, tracks backlog progress, and provides interactive control.
2. **BA (Business Analyst)**: Auto re-slices PRDs into atomic stories with Gherkin Acceptance Criteria (AC), respecting GitHub Issues / Jira / Local tracker settings.
3. **Developer (Fullstack)**: Implements code and unit tests following a 12-phase flow with strict directory boundary enforcement (`backend/`, `frontend/`), mandatory JaCoCo/HTML coverage report verification, and required git commit & push before handoff.
4. **QA (Quality Analyst)**: Verifies ACs on a running application in an isolated context with noise-free subagent execution.
5. **Code Reviewer**: Performs cold-read P1/P2 security & architecture audits with a 2-cycle circuit breaker.

Based on [AI-Native Development Specifications](https://aishippingblog.com/p/ai-native-development-specifications).

---

## 🎛 Supported Flags & Workflow Modes

You can specify the workflow mode using any of these clean flags:

- **Loop HITL (`--loop` / `--workflow=loop` / `--team-mode=loop` / `loop`)**:
  Runs a single story automatically through BA → Dev → QA → Reviewer → Done, then pauses at the Orchestrator for human approval before picking up the next story.
- **Full Auto (`--auto` / `--workflow=auto` / `--team-mode=auto` / `auto`)**:
  Processes all stories sequentially in the backlog without any HITL pause points.
- **Step HITL (`--step` / `--workflow=step` / `--team-mode=step` / `step`)**:
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
Copy `.pi/` and `docs/templates/` into your project root:

```bash
cp -r /path/to/pi-team/.pi .
cp -r /path/to/pi-team/docs/templates docs/templates
```

### Step 2: Configure `project-context.md`
Copy template and set your repository boundaries, build/test commands, and delivery tracker:

```bash
cp docs/templates/project-context.template.md project-context.md
```

### Step 3: Add Your PRD or BRD
Place your requirement document in `prd.md` or `docs/brd/my-feature.md`.

### Step 4: Launch the Agent Team
Launch Pi with your preferred flag:

```bash
# In Interactive Pi Mode:
/team-dev --loop
/team-dev --auto
/team-dev --step

# Or from bash:
pi "/team-dev --loop"
pi "/team-dev --auto"
pi "/team-dev --step"
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
