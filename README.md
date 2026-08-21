# Pi Agent Multi-Agent Development Team (`pi-agent-team`)

`pi-agent-team` turns Pi Agent into an AI-native 5-agent software development team that operates concurrently in a 5-pane tmux window:

1. **Master Orchestrator**: Coordinates workflow transitions and HITL (Human-In-The-Loop) checkpoints.
2. **BA (Business Analyst)**: Auto re-slices PRDs into atomic stories with Gherkin Acceptance Criteria (AC).
3. **Developer (Fullstack)**: Implements code and unit tests following a 12-phase flow with a mandatory Build-Verify gate.
4. **QA (Quality Analyst)**: Verifies ACs on a running application in an isolated context.
5. **Code Reviewer**: Performs cold-read P1/P2 security & architecture audits with a 2-cycle circuit breaker.

Based on [AI-Native Development Specifications](https://aishippingblog.com/p/ai-native-development-specifications).

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
- **GitHub CLI (`gh`)** *(Optional, if using GitHub Issues as Delivery Tracker)*:
  ```bash
  brew install gh
  gh auth login
  ```

---

## 🚀 How to Run in a New Repo

Follow these steps to equip any new or existing code repository with the Pi Agent Multi-Agent Development Team:

### Step 1: Copy the `.pi` Directory & Templates to Your Repo
Copy the `.pi/` folder and `docs/templates/` from this repo into your new project's root:

```bash
# From inside your new project repository root:
cp -r /path/to/pi-team/.pi .
cp -r /path/to/pi-team/docs/templates docs/templates
```

### Step 2: Create `project-context.md`
Copy the template and configure your tech stack, test commands, and delivery tracker:

```bash
cp docs/templates/project-context.template.md project-context.md
```

Edit `project-context.md` to fill in:
- **Repository**: GitHub URL and commit message format.
- **Tech Stack**: Frontend & backend frameworks, databases, test frameworks.
- **Delivery Tracker**: Set to `Local docs` (default), `GitHub Issues`, or `Jira`.
- **Commands**: Standard commands for setup, compilation, linting, unit tests, and full build.
- **Quality Thresholds**: Minimum line/branch test coverage percentages.

### Step 3: Add Your PRD or BRD
Create a `prd.md` file in the project root (or place a BRD in `docs/brd/my-feature.md`):

```bash
cp docs/templates/prd.template.md prd.md
# Edit prd.md with your feature requirements
```

### Step 4: Launch the Agent Team
Run Pi in interactive mode and issue the `/team-dev` command:

```bash
# Launch in Human-in-the-Loop mode (default - requires approval at stage boundaries)
pi /team-dev --mode=hitl

# Or launch in fully Autonomous mode
pi /team-dev --mode=auto
```

### Step 5: Attach to the 5-Pane Tmux Workspace
The orchestrator creates a 5-pane tmux session named `pi-team`. Open a separate terminal window or pane and attach to watch all 5 agents work live:

```bash
tmux attach -t pi-team
```

#### Tmux 5-Pane Layout:
```
+------------------------------------------------------------------------+
| Pane 0: [MASTER ORCHESTRATOR] Status Panel & Event Bus                 |
+------------------------------------+-----------------------------------+
| Pane 1: [BA - Business Analyst]    | Pane 2: [DEV - Fullstack Dev]     |
| pi -a ba                           | pi -a developer                   |
+------------------------------------+-----------------------------------+
| Pane 3: [QA - Quality Analyst]     | Pane 4: [REVIEWER - Code Review]  |
| pi -a qa                           | pi -a reviewer                    |
+------------------------------------+-----------------------------------+
```

---

## 📦 Option 2: Share via Pi Package Install

You can also share this entire agent team package with other teams via Git:

```bash
# In any target repository:
pi install git:github.com/your-org/pi-team
```

Once installed, simply run `pi /team-dev` in any repo containing a `project-context.md` and `prd.md`!

---

## 🛠 Directory Structure Reference

```
project-root/
├── project-context.md         # Stack, build/test commands, quality thresholds
├── prd.md                     # Product Requirements Document
├── .pi/
│   ├── active-task.json       # Live task lifecycle state
│   ├── agents/                # Persona prompts (ba.md, developer.md, qa.md, reviewer.md)
│   ├── skills/                # 14 engineering skills (clean-code, unit-testing, etc.)
│   ├── extensions/            # Tmux manager, backlog tool, and team orchestrator
│   └── templates/             # Templates for stories, BRDs, specs, and project context
└── README.md
```
