# BRD: SquadLoop — Team vs. Standalone Modes & Multi-Driver Terminal Multiplexing Architecture

## Executive Summary
This specification defines the product and technical requirements for refactoring SquadLoop's execution model and terminal multiplexing architecture. 

SquadLoop will support two distinct **Execution Modes** (`--ex-mode`):
1. **Team Mode** (Default): Spawns 5 predefined agent instances (Master Orchestrator, Business Analyst, Fullstack Developer, Quality Analyst, Code Reviewer) across split screens (panes) or multiple windows using a terminal multiplexer.
2. **Standalone Mode**: Launches a single, direct `pi` agent instance in the active terminal window. The user can dynamically switch active agent personas via slash commands or agent prompt templates (`/ba`, `/dev`, `/qa`, `/reviewer` or `/*.agent.md`) while retaining the ability to spawn internal subagents (`Agent(...)`) for automated sub-tasks.

Furthermore, SquadLoop will support four **Terminal Drivers** (`--driver`):
- **`tmux`**: Terminal multiplexing via tmux split panes and windows.
- **`herdr`**: Multi-agent session management via herdr CLI.
- **`iterm2`**: Native macOS iTerm2 split panes and tabs via AppleScript automation.
- **`regular`**: Standalone / headless execution directly in any standard terminal or CI/CD environment.

---

## 1. Execution Modes (`ex-mode`)

### 1.1 Configuration & Selection
- **Default Execution Mode**: `team`.
- **Configuration Property**: `.pi/team-config.json` -> `"exMode": "team" | "standalone"`.
- **CLI Flag Override**: `--ex-mode=team` or `--ex-mode=standalone`.

### 1.2 Team Mode Specifications
- Spawns predefined agent personas in a multi-pane grid (1 window with 5 split panes) or a multi-window layout (5 separate windows/tabs within the session) using the selected terminal driver (`tmux`, `herdr`, or `iTerm2`).
- Supports `"layout": "panes" | "windows"` seamlessly across `tmux` (split panes vs windows), `herdr` (split panes vs tabs/sessions), and `iTerm2` (split panes vs tabs/windows).
- Configures persona titles, status banners, and inter-agent message routing (`send_agent_message`, `team_update_status`).
- Managed by `TeamExecutionStrategy`.

### 1.3 Standalone Mode Specifications
- Runs directly in the user's active terminal (no multiplexer wrapper needed).
- Single interactive UI session.
- **Persona Switching (`/*.agent.md` & Slash Commands)**:
  - Supports `/orchestrator`, `/ba`, `/dev`, `/qa`, `/reviewer`, or custom `/agents/<name>.agent.md` commands to re-bind system prompts dynamically.
- **Subagent Execution Engine**:
  - The active persona can spawn background Pi subagents (`Agent(subagent_type=..., prompt=...)`) to execute multi-step delegated tasks without cluttering the main UI.
- Managed by `StandaloneExecutionStrategy`.

---

## 2. Terminal Driver Architecture (`driver`)

### 2.1 Configuration & Selection
- **Default Driver**: `tmux` (falling back to `regular` if `tmux` is not available or when in Standalone mode).
- **Configuration Property**: `.pi/team-config.json` -> `"driver": "tmux" | "herdr" | "iterm2" | "regular"`.
- **CLI Flag Override**: `--driver=tmux`, `--driver=herdr`, `--driver=iterm2`, `--driver=regular`.

### 2.2 Terminal Driver Interface (`ITerminalDriver`)
All terminal multiplexer drivers must implement a unified interface:

```typescript
export interface ITerminalDriver {
  readonly id: string;
  readonly name: string;
  isAvailable(): boolean;
  setupTeamLayout(layout: "panes" | "windows"): WorkspacePanes;
  sendPrompt(paneTarget: string, promptText: string, clear?: boolean): Promise<void>;
  attachSession(): void;
  hasActiveSession(): boolean;
  recoverMissingPanes(currentPanes: WorkspacePanes): WorkspacePanes;
}
```

### 2.3 Driver Implementations
1. **`TmuxDriver`**: Uses native `tmux` commands to create either split panes within 1 window (`layout: "panes"`) or 5 full-screen windows (`layout: "windows"`).
2. **`HerdrDriver`**: Uses `herdr` CLI commands to create either split panes in 1 window/workspace (`layout: "panes"`) or separate tabs/windows (`layout: "windows"`).
3. **`ITerm2Driver`**: Uses AppleScript (`osascript`) to create either split panes within 1 window (`layout: "panes"`) or 5 separate tabs/windows (`layout: "windows"`) in macOS iTerm2.
4. **`RegularDriver`**: Direct standard output/input stream runner without layout management.

---

## 3. CLI Command Extensions (`bin/squadloop.js`)

- `squadloop start [--ex-mode=team|standalone] [--driver=tmux|herdr|iterm2|regular]`
- `squadloop resume` (recovers active session in team or standalone mode)
- `squadloop attach` (forwards attach request to the active terminal driver)
- `squadloop config exMode=standalone driver=iterm2` (persists settings in `.pi/team-config.json`)

---

## 4. User Stories & Implementation Breakdown

| Story ID | Title | Description |
|---|---|---|
| **SL-01** | `ITerminalDriver` Abstraction & `TmuxDriver` Refactor | Define `ITerminalDriver` interface and refactor `tmux-adapter.ts` into `TmuxDriver`. |
| **SL-02** | `HerdrDriver` & `ITerm2Driver` Implementations | Add `HerdrDriver` and `ITerm2Driver` AppleScript automation adapters. |
| **SL-03** | Execution Strategy Engine (`Team` vs `Standalone`) | Create `ExecutionStrategyFactory` supporting `TeamStrategy` and `StandaloneStrategy`. |
| **SL-04** | Standalone Mode Persona Switcher & Subagents | Implement slash commands (`/ba`, `/dev`, `/qa`, `/reviewer`, `/*.agent.md`) and subagent tool binding in standalone mode. |
| **SL-05** | CLI & Configuration Updates | Update `bin/squadloop.js` and `.pi/team-config.json` schema to support `exMode` and `driver` flags/configs. |
