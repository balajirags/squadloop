# Pi Agent Multi-Agent Development Team (`pi-agent-team`)

`pi-agent-team` turns Pi Agent into an AI-native 5-agent software development team operating concurrently in a 5-pane tmux window:

1. **Master Orchestrator (Pane 0)**: Pi Agent session that greets the user, parses intent (*"Proceed with BRD"*, *"Implement Story #42"*, or custom requests), manages state transitions across subagents, and provides interactive workflow control.
2. **BA - Business Analyst (Pane 1)**: Auto re-slices PRDs into atomic stories with Gherkin Acceptance Criteria (AC), respecting GitHub Issues / Jira / Local tracker settings.
3. **Developer - Fullstack (Pane 2)**: Implements code and unit tests following a 12-phase flow with strict directory boundary enforcement (`backend/`, `frontend/`), mandatory JaCoCo/HTML coverage report verification, and required git commit & push before handoff.
4. **QA - Quality Analyst (Pane 3)**: Verifies ACs against a **running application server** (`http://localhost:8080`) using live HTTP requests in an isolated context.
5. **Code Reviewer (Pane 4)**: Performs cold-read P1/P2 security & architecture audits with a 2-cycle circuit breaker.

Based on the philosophy from [AI-Native Development Specifications](https://aishippingblog.com/p/ai-native-development-specifications).

---

## 🤖 Intent-Based Orchestration

When you launch `/team-dev`, Pane 0 (Master Orchestrator) greets you, lists available BRDs/PRDs, and **waits for your instruction**:

- **Proceed with BRD**: *"Proceed with docs/brd/campaigns-management.md"* → Orchestrator instructs BA (Pane 1) to start Auto Re-slicing and story creation.
- **Specific Story / Issue**: *"Implement Story #42"* → Orchestrator instructs Developer (Pane 2) to pick up Story #42 directly.
- **Custom Request**: *"Fix NPE in auth controller"* or *"QA verify branch feature/auth"* → Orchestrator routes task to the right subagent.
- **General Start**: *"Go"* / *"Start"* → Orchestrator picks up the first uncompleted BRD and instructs BA.

---

## 🎛 Workflow Modes (`--team-mode`)

Specify the workflow control mode using the `--team-mode` flag:

- **`--team-mode=loop` (Loop Human-In-The-Loop - Default)**:
  Runs a single story automatically through BA → Dev → QA → Reviewer → Done, then pauses at the Master Orchestrator for human review/approval before picking up the next story.
- **`--team-mode=auto` (Full Autonomous)**:
  Processes all stories sequentially in the backlog end-to-end without any HITL pause points.
- **`--team-mode=step` (Step Human-In-The-Loop)**:
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
Copy the `.pi/` folder and `docs/templates/` into your project root:

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
Launch Pi with the `--team-mode` flag:

```bash
# From bash:
pi "/team-dev --team-mode=loop"

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
| Pane 0: [MASTER ORCHESTRATOR] Intent-Based Router & Interactive Control|
+------------------------------------+-----------------------------------+
| Pane 1: [BA - Business Analyst]    | Pane 2: [DEV - Fullstack Dev]     |
| pi -a ba                           | pi -a developer                   |
+------------------------------------+-----------------------------------+
| Pane 3: [QA - Quality Analyst]     | Pane 4: [REVIEWER - Code Review]  |
| pi -a qa                           | pi -a reviewer                    |
+------------------------------------+-----------------------------------+
```
