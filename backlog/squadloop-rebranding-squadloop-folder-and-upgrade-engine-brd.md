# BRD: SquadLoop — Rebranded `.squadloop/` Wrapper & Upgrade Engine Architecture

**Status**: Draft / Pending Approval  
**Date**: 2026-03-09  

## Executive Summary
This specification defines the product and technical requirements for transforming SquadLoop into a first-class, white-labeled wrapper on top of Pi Coding Agent (`@earendil-works/pi-coding-agent`).

SquadLoop will migrate all project configuration, extensions, prompts, skills, and session state from `.pi/` to `.squadloop/`, using Pi Agent's native environment variables (`CONFIG_DIR_NAME=.squadloop` and `PI_CODING_AGENT_DIR=~/.squadloop/agent`).

Additionally, it establishes an **Upgrade Engine** (`squadloop update` and `squadloop doctor`) that keeps the underlying Pi Agent engine in sync with SquadLoop extension updates while safely preserving user configuration settings (`.squadloop/config.json` and `.squadloop/models.json`).

---

## 1. Rebranded `.squadloop/` Directory Architecture

### 1.1 Directory Structure
All project-local SquadLoop resources will live inside `.squadloop/`:

```text
target-repository/
├── .squadloop/                     # Rebranded project directory
│   ├── config.json                 # Team configuration (exMode, hitl, driver, layout, models)
│   ├── models.json                 # Local & custom model provider definitions
│   ├── settings.json               # Pi settings
│   ├── agents/                     # Agent persona specifications (ba, dev, qa, reviewer, orchestrator)
│   ├── prompts/                    # Persona slash command templates (/dev, /ba, etc.)
│   ├── extensions/                 # SquadLoop drivers, strategies, tools
│   ├── skills/                     # Agentic workflow skills
│   └── sessions/                   # Isolated multi-session state
│       └── <session-id>/
│           ├── active-task.json
│           └── events.jsonl
├── project-context.md              # Target application build/test boundaries
└── Agent.md                        # SquadLoop operational mandate
```

### 1.2 Environment Variable Overrides
When invoking Pi Agent processes or running extensions, SquadLoop will inject environment variables:
- `CONFIG_DIR_NAME=.squadloop`
- `PI_CODING_AGENT_DIR=~/.squadloop/agent`

### 1.3 Automatic Legacy Migration (`.pi/` → `.squadloop/`)
When `squadloop start`, `squadloop init`, or `squadloop config` runs:
- If a legacy `.pi/` directory exists in the repository and `.squadloop/` does not exist, SquadLoop automatically renames `.pi` to `.squadloop` and prints a migration notice:
  `📦 Automatically migrated legacy .pi/ configuration to .squadloop/`

---

## 2. SquadLoop Upgrade & Sync Engine

### 2.1 Layered Architecture
SquadLoop operates in two distinct decoupled layers:
1. **Pi Agent Engine (`@earendil-works/pi-coding-agent`)**: Core LLM streaming, token counting, tool execution protocol, file editing, and TUI rendering.
2. **SquadLoop Extension Layer (`.squadloop/extensions/`)**: Multi-agent orchestration, BA/Dev/QA/Reviewer role logic, drivers (tmux, herdr, iTerm2), and security guard.

### 2.2 `squadloop update` CLI Command
Reforces one-command maintenance:
- Checks npm registry for updates to `@earendil-works/pi-coding-agent` and `squadloop`.
- Upgrades global binaries.
- Refreshes runtime logic in `.squadloop/extensions/`, `.squadloop/prompts/`, and `.squadloop/skills/` in target project repositories.
- **Safe Preservation Guarantee**: Never overwrites user preferences in `.squadloop/config.json`, `.squadloop/models.json`, `project-context.md`, or session history in `.squadloop/sessions/`.

### 2.3 `squadloop doctor` Diagnostic Command
Displays runtime health and version synchronization:
```text
🚀 SquadLoop Diagnostic Report:
  • SquadLoop CLI    : v1.0.0 (Up to date)
  • Pi Agent Engine  : v1.0.0 (Up to date)
  • Config Directory : .squadloop/ (Verified)
  • Extensions       : Synchronized
```

---

## 3. User Stories & Implementation Breakdown

| Story ID | Title | Description |
|---|---|---|
| **SL-WRAP-01** | `.squadloop/` Directory Rebranding | Rebrand `.pi/` to `.squadloop/` using `CONFIG_DIR_NAME=.squadloop` and `PI_CODING_AGENT_DIR=~/.squadloop/agent`. |
| **SL-WRAP-02** | Legacy `.pi/` Auto-Migration | Implement auto-migration from legacy `.pi/` to `.squadloop/` on `init`/`start`. |
| **SL-WRAP-03** | `squadloop update` CLI Command | Implement `squadloop update` to sync Pi Agent engine & SquadLoop extensions while preserving user configs. |
| **SL-WRAP-04** | `squadloop doctor` Diagnostic Tool | Implement `squadloop doctor` command displaying version health and path verification. |
