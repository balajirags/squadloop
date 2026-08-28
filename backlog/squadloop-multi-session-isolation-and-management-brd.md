# BRD: SquadLoop — Multi-Session Isolation & Session Management Architecture

**Status**: Draft / Pending Approval  
**Date**: 2026-03-09  

## Executive Summary
This specification defines product and technical requirements for supporting multiple concurrent SquadLoop sessions in the same repository or across git worktrees.

SquadLoop will isolate terminal multiplexer sessions, active task states, event logs, and token telemetry per session instance, allowing developers to run multiple concurrent team sessions (e.g. feature development, bug fixes, code reviews) side-by-side without state collisions.

---

## 1. Multi-Session Isolation Architecture

### 1.1 Named Sessions (`--name=<id>` / `--session=<id>`)
- **CLI Flag**: `squadloop start [--name=<session-id>]` (or `--session=<session-id>`).
- **Default Session Name**: `default` (multiplexer session `squadloop-default`).
- **Examples**:
  - Terminal 1: `squadloop start --name=feature-auth`
  - Terminal 2: `squadloop start --name=bugfix-npe`

### 1.2 Driver Session Naming Isolation
All terminal drivers (`TmuxDriver`, `HerdrDriver`, `ITerm2Driver`) will scope their session names to `squadloop-<session-id>`:
- `TmuxDriver`: Creates session `squadloop-feature-auth`.
- `HerdrDriver`: Creates session `squadloop-feature-auth`.
- `ITerm2Driver`: Creates window `squadloop-workspace-feature-auth`.

### 1.3 State & Log Isolation (`.pi/sessions/<session-id>/`)
Session state will be isolated per session directory:

```
.pi/
└── sessions/
    ├── feature-auth/
    │   ├── active-task.json
    │   └── events.jsonl
    └── bugfix-npe/
        ├── active-task.json
        └── events.jsonl
```

---

## 2. Session Management CLI Commands

### 2.1 `squadloop list`
Displays a terminal table listing all active and saved SquadLoop sessions:
```text
┌──────────────────┬──────────────────────┬─────────────┬───────────────────────────┐
│ Session Name     │ Driver               │ Active Task │ Status                    │
├──────────────────┼──────────────────────┼─────────────┼───────────────────────────┤
│ feature-auth     │ tmux                 │ Issue #42   │ DEV in progress           │
│ bugfix-npe       │ tmux                 │ Issue #18   │ QA verifying              │
└──────────────────┴──────────────────────┴─────────────┴───────────────────────────┘
```

### 2.2 `squadloop attach [--name=<id>]`
Attaches directly to the target session (defaults to most recently active session or `default`).

### 2.3 `squadloop stop [--name=<id>]`
Gracefully halts agent processes and closes target multiplexer session.

---

## 3. User Stories & Implementation Breakdown

| Story ID | Title | Description |
|---|---|---|
| **SL-SESS-01** | Session Directory Isolation | Implement `.pi/sessions/<id>/` state storage (`active-task.json`, `events.jsonl`). |
| **SL-SESS-02** | Driver Session Isolation | Update `TmuxDriver`, `HerdrDriver`, `ITerm2Driver` to isolate session names (`squadloop-<id>`). |
| **SL-SESS-03** | Session CLI Subcommands | Implement `squadloop list`, `squadloop attach --name=<id>`, `squadloop stop --name=<id>`. |
