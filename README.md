# Pi Agent Multi-Agent Development Team (`pi-agent-team`)

A Pi Agent package that turns Pi into an AI-native multi-agent engineering team (BA, Developer, QA, Code Reviewer) coordinated by a Master Orchestrator in a 5-pane tmux window.

Based on [AI-Native Development Specifications](https://aishippingblog.com/p/ai-native-development-specifications).

---

## Features

- **5-Pane Tmux Workspace**:
  - **Pane 0**: Master Orchestrator Status Panel
  - **Pane 1**: BA (Business Analyst - Auto Re-slicing & Gherkin ACs)
  - **Pane 2**: Fullstack Developer (12-phase flow + Build-verify hard gate)
  - **Pane 3**: QA Analyst (Isolated context AC verification on running app)
  - **Pane 4**: Code Reviewer (Cold-read P1/P2 audit & circuit breaker)
- **Strict Local Isolation**: All agents (`.pi/agents/`), skills (`.pi/skills/`), extensions (`.pi/extensions/`), and templates (`.pi/templates/`) live within the project directory.
- **Configurable Control**: Supports Human-in-the-Loop (`--mode=hitl`) and Autonomous Mode (`--mode=auto`).

---

## Quick Start

1. Copy `docs/templates/project-context.template.md` to `project-context.md` and fill in your stack, commands, and tracker settings.
2. Place your PRD or BRD in `prd.md` or `docs/brd/`.
3. Launch the agent team:
   ```bash
   pi /team-dev --mode=hitl
   ```
4. Attach to the tmux session in another terminal window if needed:
   ```bash
   tmux attach -t pi-team
   ```
