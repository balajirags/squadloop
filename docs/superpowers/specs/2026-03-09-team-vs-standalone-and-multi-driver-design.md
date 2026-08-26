# Design Spec: SquadLoop — Team vs. Standalone Modes & Multi-Driver Architecture

**Date**: 2026-03-09  
**Status**: Approved / Draft  
**Target Platform**: SquadLoop (`squadloop` CLI, `@earendil-works/pi-coding-agent`, tmux, herdr, iTerm2)

---

## 1. Executive Summary

This design specification details the architecture for refactoring SquadLoop into a dual-mode, multi-terminal software engineering framework.

SquadLoop will support two **Execution Modes**:
1. **Team Mode** (`ex-mode=team`): Multi-agent collaborative grid (Master Orchestrator, BA, Developer, QA, Reviewer) running in split screen (panes) or multiple windows via a terminal multiplexer (`tmux`, `herdr`, or `iTerm2`).
2. **Standalone Mode** (`ex-mode=standalone`): Single-window direct `pi` session in the active terminal interface. Allows hot-swapping agent personas (`/ba`, `/dev`, `/qa`, `/reviewer`, or `/*.agent.md`) while supporting internal subagent dispatching (`Agent(...)`).

It also introduces pluggable **Terminal Drivers**:
- **`TmuxDriver`**: Full tmux pane/window automation with custom border titles and keybindings.
- **`HerdrDriver`**: Herdr CLI session and pane management.
- **`ITerm2Driver`**: macOS iTerm2 AppleScript automation for split panes and tabs.
- **`RegularDriver`**: Headless/CI direct terminal runner.

---

## 2. Architecture & File Structure

```
.pi/extensions/
├── drivers/
│   ├── terminal-driver-interface.ts # ITerminalDriver interface definition
│   ├── driver-factory.ts            # Factory for creating/detecting terminal drivers
│   ├── tmux-driver.ts              # Refactored tmux driver
│   ├── herdr-driver.ts             # Herdr CLI driver
│   ├── iterm2-driver.ts            # iTerm2 AppleScript driver
│   └── regular-driver.ts           # Standalone / Headless driver
├── strategies/
│   ├── execution-strategy.ts       # IExecutionStrategy interface
│   ├── team-strategy.ts            # Multi-agent grid strategy
│   └── standalone-strategy.ts      # Single interface + persona switcher strategy
bin/
└── squadloop.js                    # CLI entrypoint supporting --ex-mode and --driver flags
```

---

## 3. Terminal Driver Layer (`ITerminalDriver`)

### 3.1 Interface Specification
```typescript
export interface WorkspacePanes {
  orchestrator: string;
  ba: string;
  developer: string;
  qa: string;
  reviewer: string;
}

export interface ITerminalDriver {
  readonly id: string;
  readonly name: string;
  
  /** Checks if the underlying binary/application is installed and operational */
  isAvailable(): boolean;
  
  /** Sets up the 5-agent split pane or window layout */
  setupTeamLayout(layout: "panes" | "windows"): WorkspacePanes;
  
  /** Delivers a prompt or command to a specific target pane/window */
  sendPrompt(targetPaneId: string, promptText: string, clear?: boolean): Promise<void>;
  
  /** Attaches the current terminal to the active workspace session */
  attachSession(): void;
  
  /** Checks if an active session is currently running */
  hasActiveSession(): boolean;
  
  /** Recovers missing agent panes if closed accidentally */
  recoverMissingPanes(currentPanes: WorkspacePanes): WorkspacePanes;
}
```

### 3.2 iTerm2 AppleScript Integration (`ITerm2Driver`)
For `ITerm2Driver`, SquadLoop uses `osascript` to drive iTerm2 layout options:
- **`layout: "panes"`**: Creates a new iTerm2 window named `squadloop-workspace` and splits it into 5 panes (Orchestrator, BA, Developer, QA, Reviewer).
- **`layout: "windows"`**: Creates a new iTerm2 window with 5 tabs, one for each agent persona.
- Executes agent start commands (`pi --approve --append-system-prompt .pi/agents/<role>.md`).

### 3.3 Herdr Integration (`HerdrDriver`)
For `HerdrDriver`, SquadLoop executes `herdr` commands:
- **`layout: "panes"`**: Spawns 5 split panes within a single Herdr session window.
- **`layout: "windows"`**: Spawns 5 separate Herdr workspace tabs/windows.

---

## 4. Execution Strategies (`TeamStrategy` vs `StandaloneStrategy`)

### 4.1 `TeamStrategy`
- Resolves the target `ITerminalDriver` based on config or `--driver`.
- Calls `driver.setupTeamLayout(layout)`.
- Populates `active-task.json` with initial team status.
- Dispatches initial Orchestrator banner via `driver.sendPrompt(panes.orchestrator, welcomePrompt)`.
- Triggers `driver.attachSession()`.

### 4.2 `StandaloneStrategy`
- Does **not** require a terminal multiplexer (Option B).
- Launches `pi` directly in the current terminal process.
- Registers persona prompts:
  - Generates slash commands: `/ba`, `/dev`, `/qa`, `/reviewer`, `/orchestrator` or loads any `/*.agent.md`.
  - When the user types e.g. `/ba`, it appends system prompt `.pi/agents/ba.md` or switches active persona system prompt in the single session.
- Subagents remain enabled: The active persona can spawn subagent calls (`Agent(subagent_type="developer", ...)`).

---

## 5. Configuration & CLI Integration

### 5.1 `.pi/team-config.json` Schema Updates
```json
{
  "exMode": "team",
  "driver": "tmux",
  "mode": "loop-hitl",
  "layout": "panes",
  "destructiveCommandPolicy": "ask-human",
  "customProtectedFiles": [],
  "models": {
    "orchestrator": "google/gemini-3.6-flash",
    "ba": "ollama/gemma4:26b",
    "developer": "anthropic/claude-3-7-sonnet-20250219",
    "qa": "ollama/gemma4:26b",
    "reviewer": "google/gemini-3.6-flash"
  }
}
```

### 5.2 CLI Flags (`bin/squadloop.js`)
- `squadloop start [--ex-mode=team|standalone] [--driver=tmux|herdr|iterm2|regular]`
- `squadloop config exMode=standalone driver=iterm2`

---

## 6. Verification & Test Plan

1. **Unit Tests**:
   - `DriverFactory`: verify driver resolution and fallback to `regular`.
   - `Config parsing`: verify `--ex-mode` and `--driver` CLI overrides.
2. **Integration Verification**:
   - Run `squadloop start --ex-mode=team --driver=tmux` and confirm 5 split panes spawn in tmux.
   - Run `squadloop start --ex-mode=standalone` and confirm single terminal `pi` session launches with persona switching capabilities (`/ba`, `/dev`, etc.).
   - Test `squadloop config exMode=standalone driver=iterm2` updates `.pi/team-config.json`.
