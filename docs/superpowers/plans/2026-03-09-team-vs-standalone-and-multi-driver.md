# Team vs Standalone Modes and Multi-Driver Architecture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor SquadLoop to support Team Mode vs Standalone Mode (`--ex-mode=team|standalone`) and pluggable terminal multiplexer drivers (`--driver=tmux|herdr|iterm2|regular`) for both split panes and multi-window layouts.

**Architecture:** Create an `ITerminalDriver` interface abstraction with drivers (`TmuxDriver`, `HerdrDriver`, `ITerm2Driver`, `RegularDriver`) managed by `DriverFactory`. Implement an `IExecutionStrategy` pattern with `TeamExecutionStrategy` (5-agent grid) and `StandaloneExecutionStrategy` (single terminal `pi` session with dynamic `/ba`, `/dev`, `/qa`, `/reviewer` persona slash commands and subagent capability). Update `bin/squadloop.js` CLI flags and configuration schemas.

**Tech Stack:** TypeScript (Node.js ES2022 / NodeNext), AppleScript (`osascript`), `tmux` CLI, `herdr` CLI, `@earendil-works/pi-coding-agent`.

**Spec:** `docs/superpowers/specs/2026-03-09-team-vs-standalone-and-multi-driver-design.md`

## Global Constraints
- Target platform: Node.js 20+, TypeScript 5+ (ES2022 / NodeNext modules)
- Default execution mode: `team`
- Default driver: `tmux`
- Both modes must support layout preferences (`panes` vs `windows`) across all drivers
- Preserves backwards compatibility for `.pi/team-config.json` while adding `"exMode"` and `"driver"` fields

---

### Task 1: Terminal Driver Abstraction (`ITerminalDriver`, `TmuxDriver`, `RegularDriver`)

**Files:**
- Create: `.pi/extensions/drivers/terminal-driver-interface.ts`
- Create: `.pi/extensions/drivers/tmux-driver.ts`
- Create: `.pi/extensions/drivers/regular-driver.ts`

**Interfaces:**
- Consumes: `.pi/agents/*.md`, `.pi/team-config.json`
- Produces: `ITerminalDriver` interface, `TmuxDriver`, `RegularDriver`

- [ ] **Step 1: Write `terminal-driver-interface.ts` interface**

Create `.pi/extensions/drivers/terminal-driver-interface.ts`:
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
  isAvailable(): boolean;
  setupTeamLayout(layout: "panes" | "windows"): WorkspacePanes;
  sendPrompt(targetPaneId: string, promptText: string, clear?: boolean): Promise<void>;
  attachSession(): void;
  hasActiveSession(): boolean;
  recoverMissingPanes(currentPanes: WorkspacePanes): WorkspacePanes;
}
```

- [ ] **Step 2: Write `tmux-driver.ts` implementation**

Create `.pi/extensions/drivers/tmux-driver.ts`:
```typescript
import { execSync, spawnSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import type { ITerminalDriver, WorkspacePanes } from "./terminal-driver-interface.js";

function cleanPaneId(raw: string): string {
  const match = String(raw).match(/%[0-9]+/);
  return match ? match[0] : String(raw).trim().split("\n")[0];
}

function getAgentCommand(role: string): string {
  const agentFile = `.pi/agents/${role}.md`;
  return `pi --approve --append-system-prompt "${agentFile}"; exec bash`;
}

export class TmuxDriver implements ITerminalDriver {
  public readonly id = "tmux";
  public readonly name = "Tmux Terminal Driver";
  private sessionName = "squadloop-workspace";

  public isAvailable(): boolean {
    try {
      execSync("tmux -V", { stdio: "ignore" });
      return true;
    } catch {
      return false;
    }
  }

  public hasActiveSession(): boolean {
    return spawnSync("tmux", ["has-session", "-t", this.sessionName], { stdio: "ignore" }).status === 0;
  }

  public setupTeamLayout(layout: "panes" | "windows" = "panes"): WorkspacePanes {
    if (layout === "windows") {
      return this.setup5WindowLayout();
    }
    return this.setup5PaneLayout();
  }

  private setup5PaneLayout(): WorkspacePanes {
    try {
      execSync(`tmux kill-session -t ${this.sessionName} 2>/dev/null`, { stdio: "ignore" });
    } catch {
      // Ignore
    }

    const orchestratorPane = cleanPaneId(execSync(
      `tmux new-session -d -s ${this.sessionName} -n team -P -F "#{pane_id}" "${getAgentCommand("orchestrator")}"`
    ).toString());

    const baPane = cleanPaneId(execSync(
      `tmux split-window -v -t ${orchestratorPane} -P -F "#{pane_id}" "${getAgentCommand("ba")}"`
    ).toString());

    const devPane = cleanPaneId(execSync(
      `tmux split-window -h -t ${baPane} -P -F "#{pane_id}" "${getAgentCommand("developer")}"`
    ).toString());

    const qaPane = cleanPaneId(execSync(
      `tmux split-window -v -t ${baPane} -P -F "#{pane_id}" "${getAgentCommand("qa")}"`
    ).toString());

    const reviewerPane = cleanPaneId(execSync(
      `tmux split-window -v -t ${devPane} -P -F "#{pane_id}" "${getAgentCommand("reviewer")}"`
    ).toString());

    try {
      execSync(`tmux set-option -p -t ${orchestratorPane} @persona "[ SQUADLOOP :: MASTER ORCHESTRATOR ]"`);
      execSync(`tmux set-option -p -t ${baPane} @persona "[ SQUADLOOP :: BUSINESS ANALYST (BA) ]"`);
      execSync(`tmux set-option -p -t ${devPane} @persona "[ SQUADLOOP :: DEVELOPER (DEV) ]"`);
      execSync(`tmux set-option -p -t ${qaPane} @persona "[ SQUADLOOP :: QUALITY ANALYST (QA) ]"`);
      execSync(`tmux set-option -p -t ${reviewerPane} @persona "[ SQUADLOOP :: CODE REVIEWER (REVIEWER) ]"`);
    } catch {
      // Non-fatal
    }

    return { orchestrator: orchestratorPane, ba: baPane, developer: devPane, qa: qaPane, reviewer: reviewerPane };
  }

  private setup5WindowLayout(): WorkspacePanes {
    try {
      execSync(`tmux kill-session -t ${this.sessionName} 2>/dev/null`, { stdio: "ignore" });
    } catch {
      // Ignore
    }

    const orchestratorPane = cleanPaneId(execSync(
      `tmux new-session -d -s ${this.sessionName} -n orchestrator -P -F "#{pane_id}" "${getAgentCommand("orchestrator")}"`
    ).toString());

    const baPane = cleanPaneId(execSync(
      `tmux new-window -t ${this.sessionName} -n ba -P -F "#{pane_id}" "${getAgentCommand("ba")}"`
    ).toString());

    const devPane = cleanPaneId(execSync(
      `tmux new-window -t ${this.sessionName} -n developer -P -F "#{pane_id}" "${getAgentCommand("developer")}"`
    ).toString());

    const qaPane = cleanPaneId(execSync(
      `tmux new-window -t ${this.sessionName} -n qa -P -F "#{pane_id}" "${getAgentCommand("qa")}"`
    ).toString());

    const reviewerPane = cleanPaneId(execSync(
      `tmux new-window -t ${this.sessionName} -n reviewer -P -F "#{pane_id}" "${getAgentCommand("reviewer")}"`
    ).toString());

    return { orchestrator: orchestratorPane, ba: baPane, developer: devPane, qa: qaPane, reviewer: reviewerPane };
  }

  public async sendPrompt(paneTarget: string, promptText: string, clear = true): Promise<void> {
    try {
      if (clear) {
        execSync(`tmux send-keys -t ${paneTarget} "/clear" Enter`, { stdio: "ignore" });
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      const escaped = promptText.replace(/"/g, '\\"');
      execSync(`tmux send-keys -t ${paneTarget} "${escaped}" Enter`, { stdio: "ignore" });
    } catch {
      // Ignore
    }
  }

  public attachSession(): void {
    const inTmux = Boolean(process.env.TMUX) || spawnSync("tmux", ["display-message"], { stdio: "ignore" }).status === 0;
    if (inTmux) {
      try {
        spawnSync("tmux", ["switch-client", "-t", this.sessionName], { stdio: "inherit" });
        return;
      } catch {
        // Fallback
      }
    }
    const env = { ...process.env };
    delete env.TMUX;
    spawnSync("tmux", ["attach", "-t", this.sessionName], { stdio: "inherit", env });
  }

  public recoverMissingPanes(currentPanes: WorkspacePanes): WorkspacePanes {
    return currentPanes;
  }
}
```

- [ ] **Step 3: Write `regular-driver.ts` implementation**

Create `.pi/extensions/drivers/regular-driver.ts`:
```typescript
import type { ITerminalDriver, WorkspacePanes } from "./terminal-driver-interface.js";

export class RegularDriver implements ITerminalDriver {
  public readonly id = "regular";
  public readonly name = "Regular Standalone Terminal Driver";

  public isAvailable(): boolean {
    return true;
  }

  public hasActiveSession(): boolean {
    return true;
  }

  public setupTeamLayout(layout: "panes" | "windows" = "panes"): WorkspacePanes {
    return {
      orchestrator: "orchestrator",
      ba: "ba",
      developer: "developer",
      qa: "qa",
      reviewer: "reviewer"
    };
  }

  public async sendPrompt(paneTarget: string, promptText: string, clear = false): Promise<void> {
    console.log(`[${paneTarget.toUpperCase()}] ${promptText}`);
  }

  public attachSession(): void {
    // Direct terminal session, no attachment required
  }

  public recoverMissingPanes(currentPanes: WorkspacePanes): WorkspacePanes {
    return currentPanes;
  }
}
```

- [ ] **Step 4: Verify Compilation**

Run: `npm run build`
Expected: Clean TypeScript compilation without errors.

- [ ] **Step 5: Commit**

```bash
git add .pi/extensions/drivers/terminal-driver-interface.ts .pi/extensions/drivers/tmux-driver.ts .pi/extensions/drivers/regular-driver.ts
git commit -m "feat: add ITerminalDriver interface, TmuxDriver, and RegularDriver"
```

---

### Task 2: `HerdrDriver` & `ITerm2Driver` Implementations

**Files:**
- Create: `.pi/extensions/drivers/herdr-driver.ts`
- Create: `.pi/extensions/drivers/iterm2-driver.ts`

**Interfaces:**
- Consumes: `ITerminalDriver`, `WorkspacePanes`
- Produces: `HerdrDriver`, `ITerm2Driver`

- [ ] **Step 1: Write `herdr-driver.ts` implementation**

Create `.pi/extensions/drivers/herdr-driver.ts`:
```typescript
import { execSync, spawnSync } from "child_process";
import type { ITerminalDriver, WorkspacePanes } from "./terminal-driver-interface.js";

export class HerdrDriver implements ITerminalDriver {
  public readonly id = "herdr";
  public readonly name = "Herdr Terminal Driver";

  public isAvailable(): boolean {
    try {
      execSync("herdr --version", { stdio: "ignore" });
      return true;
    } catch {
      return false;
    }
  }

  public hasActiveSession(): boolean {
    try {
      const res = execSync("herdr status 2>/dev/null").toString();
      return res.includes("squadloop");
    } catch {
      return false;
    }
  }

  public setupTeamLayout(layout: "panes" | "windows" = "panes"): WorkspacePanes {
    const modeFlag = layout === "windows" ? "--tabs" : "--panes";
    try {
      execSync(`herdr spawn squadloop ${modeFlag} --roles orchestrator,ba,developer,qa,reviewer`, { stdio: "ignore" });
    } catch {
      // Fallback log
    }
    return {
      orchestrator: "herdr-orch",
      ba: "herdr-ba",
      developer: "herdr-dev",
      qa: "herdr-qa",
      reviewer: "herdr-rev"
    };
  }

  public async sendPrompt(paneTarget: string, promptText: string, clear = false): Promise<void> {
    try {
      const escaped = promptText.replace(/"/g, '\\"');
      execSync(`herdr send --target ${paneTarget} "${escaped}"`, { stdio: "ignore" });
    } catch {
      // Ignore
    }
  }

  public attachSession(): void {
    spawnSync("herdr", ["attach", "squadloop"], { stdio: "inherit" });
  }

  public recoverMissingPanes(currentPanes: WorkspacePanes): WorkspacePanes {
    return currentPanes;
  }
}
```

- [ ] **Step 2: Write `iterm2-driver.ts` implementation**

Create `.pi/extensions/drivers/iterm2-driver.ts`:
```typescript
import { execSync } from "child_process";
import type { ITerminalDriver, WorkspacePanes } from "./terminal-driver-interface.js";

export class ITerm2Driver implements ITerminalDriver {
  public readonly id = "iterm2";
  public readonly name = "iTerm2 Terminal Driver";

  public isAvailable(): boolean {
    if (process.platform !== "darwin") return false;
    try {
      execSync("osascript -e 'id of application \"iTerm\"'", { stdio: "ignore" });
      return true;
    } catch {
      return false;
    }
  }

  public hasActiveSession(): boolean {
    try {
      const script = `
        tell application "iTerm"
          repeat with w in windows
            if name of w contains "squadloop" then return true
          end repeat
        end tell
        return false
      `;
      const out = execSync(`osascript -e '${script}'`).toString().trim();
      return out === "true";
    } catch {
      return false;
    }
  }

  public setupTeamLayout(layout: "panes" | "windows" = "panes"): WorkspacePanes {
    const isWindows = layout === "windows";
    const script = `
      tell application "iTerm"
        activate
        set newWindow to (create window with default profile)
        tell newWindow
          set name to "squadloop-workspace"
          ${isWindows ? `
            create tab with default profile
            create tab with default profile
            create tab with default profile
            create tab with default profile
          ` : `
            tell current session of current tab
              split vertically with default profile
              split horizontally with default profile
            end tell
          `}
        end tell
      end tell
    `;

    try {
      execSync(`osascript -e '${script}'`, { stdio: "ignore" });
    } catch {
      // Ignore
    }

    return {
      orchestrator: "iterm-0",
      ba: "iterm-1",
      developer: "iterm-2",
      qa: "iterm-3",
      reviewer: "iterm-4"
    };
  }

  public async sendPrompt(paneTarget: string, promptText: string, clear = false): Promise<void> {
    const escaped = promptText.replace(/"/g, '\\"');
    const script = `
      tell application "iTerm"
        tell current window
          tell current session
            write text "${escaped}"
          end tell
        end tell
      end tell
    `;
    try {
      execSync(`osascript -e '${script}'`, { stdio: "ignore" });
    } catch {
      // Ignore
    }
  }

  public attachSession(): void {
    try {
      execSync(`osascript -e 'tell application "iTerm" to activate'`, { stdio: "ignore" });
    } catch {
      // Ignore
    }
  }

  public recoverMissingPanes(currentPanes: WorkspacePanes): WorkspacePanes {
    return currentPanes;
  }
}
```

- [ ] **Step 3: Verify Compilation**

Run: `npm run build`
Expected: Clean compilation.

- [ ] **Step 4: Commit**

```bash
git add .pi/extensions/drivers/herdr-driver.ts .pi/extensions/drivers/iterm2-driver.ts
git commit -m "feat: add HerdrDriver and ITerm2Driver implementations"
```

---

### Task 3: Driver Factory (`DriverFactory`)

**Files:**
- Create: `.pi/extensions/drivers/driver-factory.ts`

**Interfaces:**
- Consumes: `ITerminalDriver`, `TmuxDriver`, `HerdrDriver`, `ITerm2Driver`, `RegularDriver`
- Produces: `DriverFactory.getDriver(driverId)`

- [ ] **Step 1: Write `driver-factory.ts` implementation**

Create `.pi/extensions/drivers/driver-factory.ts`:
```typescript
import * as fs from "fs";
import * as path from "path";
import type { ITerminalDriver } from "./terminal-driver-interface.js";
import { TmuxDriver } from "./tmux-driver.js";
import { HerdrDriver } from "./herdr-driver.js";
import { ITerm2Driver } from "./iterm2-driver.js";
import { RegularDriver } from "./regular-driver.js";

export class DriverFactory {
  private static tmuxDriver = new TmuxDriver();
  private static herdrDriver = new HerdrDriver();
  private static iterm2Driver = new ITerm2Driver();
  private static regularDriver = new RegularDriver();

  public static getDriver(overrideDriver?: string): ITerminalDriver {
    let target = overrideDriver;

    if (!target) {
      const configPath = path.join(process.cwd(), ".pi", "team-config.json");
      if (fs.existsSync(configPath)) {
        try {
          const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
          target = config.driver || config.workspaceMode;
        } catch {
          // Default
        }
      }
    }

    const driverId = (target || "tmux").toLowerCase();

    if (driverId === "herdr") {
      if (this.herdrDriver.isAvailable()) return this.herdrDriver;
    }
    if (driverId === "iterm2" || driverId === "iterm") {
      if (this.iterm2Driver.isAvailable()) return this.iterm2Driver;
    }
    if (driverId === "tmux") {
      if (this.tmuxDriver.isAvailable()) return this.tmuxDriver;
    }
    if (driverId === "regular" || driverId === "headless") {
      return this.regularDriver;
    }

    // Fallback to tmux if available, otherwise regular
    if (this.tmuxDriver.isAvailable()) return this.tmuxDriver;
    return this.regularDriver;
  }
}
```

- [ ] **Step 2: Verify Compilation**

Run: `npm run build`
Expected: Clean compilation.

- [ ] **Step 3: Commit**

```bash
git add .pi/extensions/drivers/driver-factory.ts
git commit -m "feat: add DriverFactory for resolving terminal drivers"
```

---

### Task 4: Execution Strategy Layer (`IExecutionStrategy`, `TeamExecutionStrategy`, `StandaloneExecutionStrategy`, `ExecutionStrategyFactory`)

**Files:**
- Create: `.pi/extensions/strategies/execution-strategy-interface.ts`
- Create: `.pi/extensions/strategies/team-strategy.ts`
- Create: `.pi/extensions/strategies/standalone-strategy.ts`
- Create: `.pi/extensions/strategies/execution-factory.ts`

**Interfaces:**
- Consumes: `DriverFactory`, `ITerminalDriver`
- Produces: `IExecutionStrategy`, `TeamExecutionStrategy`, `StandaloneExecutionStrategy`, `ExecutionStrategyFactory`

- [ ] **Step 1: Write `execution-strategy-interface.ts`**

Create `.pi/extensions/strategies/execution-strategy-interface.ts`:
```typescript
export interface ExecutionContext {
  exMode: "team" | "standalone";
  driver: string;
  mode: string;
  layout: "panes" | "windows";
}

export interface IExecutionStrategy {
  executeStart(ctx: ExecutionContext): Promise<void>;
  executeResume(ctx: ExecutionContext): Promise<void>;
}
```

- [ ] **Step 2: Write `team-strategy.ts`**

Create `.pi/extensions/strategies/team-strategy.ts`:
```typescript
import * as fs from "fs";
import * as path from "path";
import type { IExecutionStrategy, ExecutionContext } from "./execution-strategy-interface.js";
import { DriverFactory } from "../drivers/driver-factory.js";

export class TeamExecutionStrategy implements IExecutionStrategy {
  public async executeStart(ctx: ExecutionContext): Promise<void> {
    const driver = DriverFactory.getDriver(ctx.driver);
    const panes = driver.setupTeamLayout(ctx.layout);

    const activeTaskPath = path.join(process.cwd(), ".pi", "active-task.json");
    fs.mkdirSync(path.dirname(activeTaskPath), { recursive: true });
    fs.writeFileSync(activeTaskPath, JSON.stringify({
      activeIssueId: "",
      status: "awaiting-human-input",
      updatedBy: "system",
      notes: "Fresh team session started. Awaiting human input.",
      timestamp: new Date().toISOString()
    }, null, 2), "utf-8");

    const welcomePrompt =
      `==============================================================\n` +
      `🚀 SQUADLOOP ONLINE [--ex-mode=team, --driver=${driver.id}, --layout=${ctx.layout}]\n` +
      `==============================================================\n` +
      `Print the welcome banner and options (1. Implement BRD/PRD, 2. Pick Story, 3. Random, 4. Custom Task).\n` +
      `STOP IMMEDIATELY and wait for human instruction.`;

    await driver.sendPrompt(panes.orchestrator, welcomePrompt, false);
    driver.attachSession();
  }

  public async executeResume(ctx: ExecutionContext): Promise<void> {
    const driver = DriverFactory.getDriver(ctx.driver);
    const panes = driver.setupTeamLayout(ctx.layout);

    const resumePrompt = `Master Orchestrator RESUMED [--ex-mode=team, --driver=${driver.id}]! State active task status and wait for human input.`;
    await driver.sendPrompt(panes.orchestrator, resumePrompt, false);
    driver.attachSession();
  }
}
```

- [ ] **Step 3: Write `standalone-strategy.ts`**

Create `.pi/extensions/strategies/standalone-strategy.ts`:
```typescript
import { spawnSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import type { IExecutionStrategy, ExecutionContext } from "./execution-strategy-interface.js";

export class StandaloneExecutionStrategy implements IExecutionStrategy {
  public async executeStart(ctx: ExecutionContext): Promise<void> {
    console.log("🚀 Starting SquadLoop in Standalone Mode (Single Interface)...");
    console.log("  ℹ️  Use persona slash commands (/ba, /dev, /qa, /reviewer, /orchestrator or /*.agent.md) to switch roles.");
    console.log("  ℹ️  Internal subagents remain fully functional via Agent tool.\n");

    const defaultAgentFile = path.join(process.cwd(), ".pi", "agents", "orchestrator.md");
    const agentPrompt = fs.existsSync(defaultAgentFile) ? defaultAgentFile : "";

    const piArgs = ["--approve"];
    if (agentPrompt) {
      piArgs.push("--append-system-prompt", agentPrompt);
    }

    spawnSync("pi", piArgs, { stdio: "inherit" });
  }

  public async executeResume(ctx: ExecutionContext): Promise<void> {
    console.log("🔄 Resuming SquadLoop Standalone session...");
    await this.executeStart(ctx);
  }
}
```

- [ ] **Step 4: Write `execution-factory.ts`**

Create `.pi/extensions/strategies/execution-factory.ts`:
```typescript
import type { IExecutionStrategy } from "./execution-strategy-interface.js";
import { TeamExecutionStrategy } from "./team-strategy.js";
import { StandaloneExecutionStrategy } from "./standalone-strategy.js";

export class ExecutionStrategyFactory {
  private static teamStrategy = new TeamExecutionStrategy();
  private static standaloneStrategy = new StandaloneExecutionStrategy();

  public static getStrategy(exMode: "team" | "standalone"): IExecutionStrategy {
    if (exMode === "standalone") {
      return this.standaloneStrategy;
    }
    return this.teamStrategy;
  }
}
```

- [ ] **Step 5: Verify Compilation**

Run: `npm run build`
Expected: Clean compilation.

- [ ] **Step 6: Commit**

```bash
git add .pi/extensions/strategies/
git commit -m "feat: add ExecutionStrategy layer (Team vs Standalone strategies)"
```

---

### Task 5: CLI & Config Layer Refactor (`bin/squadloop.js`)

**Files:**
- Modify: `bin/squadloop.js`

**Interfaces:**
- Consumes: `ExecutionStrategyFactory`, `DriverFactory`, `ExecutionContext`
- Produces: Updated CLI handling `--ex-mode` and `--driver` flags

- [ ] **Step 1: Update `bin/squadloop.js`**

Modify `bin/squadloop.js` to parse `--ex-mode` / `exMode=` and `--driver` / `driver=`:

```javascript
#!/usr/bin/env node

import { execSync, spawnSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { ExecutionStrategyFactory } from "../dist/.pi/extensions/strategies/execution-factory.js";
import { DriverFactory } from "../dist/.pi/extensions/drivers/driver-factory.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packageRoot = path.resolve(__dirname, "..");

const args = process.argv.slice(2);
const command = args[0]?.toLowerCase() || "help";

function printLogo() {
  console.log(`
  ██████╗  ██████╗ ██╗   ██╗ █████╗ ██████╗ ██╗      ██████╗  ██████╗ ██████╗ 
 ██╔════╝ ██╔═══██╗██║   ██║██╔══██╗██╔══██╗██║     ██╔═══██╗██╔═══██╗██╔══██╗
 ███████╗ ██║   ██║██║   ██║███████║██║  ██║██║     ██║   ██║██║   ██║██████╔╝
 ╚════██║ ██║▄▄ ██║██║   ██║██╔══██║██║  ██║██║     ██║   ██║██║   ██║██╔═══╝ 
 ███████║ ╚██████╔╝╚██████╔╝██║  ██║██████╔╝███████╗╚██████╔╝╚██████╔╝██║     
 ╚══════╝  ╚══▀▀═╝  ╚═════╝ ╚═╝  ╚═╝╚═════╝ ╚══════╝ ╚═════╝  ╚═════╝ ╚═╝     
 🚀 SquadLoop v1.0.0 — Your autonomous software team.
  `);
}

function parseCliContext() {
  const configPath = path.join(process.cwd(), ".pi", "team-config.json");
  let config = { exMode: "team", driver: "tmux", mode: "loop-hitl", layout: "panes" };

  if (fs.existsSync(configPath)) {
    try {
      const loaded = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      config = {
        exMode: loaded.exMode || loaded.executionMode || "team",
        driver: loaded.driver || loaded.workspaceMode || "tmux",
        mode: loaded.mode || "loop-hitl",
        layout: loaded.layout || "panes"
      };
    } catch {
      // Default
    }
  }

  const exModeArg = args.find(a => a.startsWith("--ex-mode=") || a.startsWith("exMode="));
  const driverArg = args.find(a => a.startsWith("--driver=") || a.startsWith("driver="));
  const layoutArg = args.find(a => a.startsWith("--layout=") || a.startsWith("layout="));

  if (exModeArg) config.exMode = exModeArg.split("=")[1];
  if (driverArg) config.driver = driverArg.split("=")[1];
  if (layoutArg) config.layout = layoutArg.split("=")[1];

  return config;
}

function saveConfig(config) {
  const configPath = path.join(process.cwd(), ".pi", "team-config.json");
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf-8");
}

async function handleStart() {
  const ctx = parseCliContext();
  saveConfig(ctx);
  printLogo();
  const strategy = ExecutionStrategyFactory.getStrategy(ctx.exMode);
  await strategy.executeStart(ctx);
}

async function handleResume() {
  const ctx = parseCliContext();
  printLogo();
  const strategy = ExecutionStrategyFactory.getStrategy(ctx.exMode);
  await strategy.executeResume(ctx);
}

function handleAttach() {
  const ctx = parseCliContext();
  const driver = DriverFactory.getDriver(ctx.driver);
  driver.attachSession();
}

function handleConfig() {
  const ctx = parseCliContext();
  saveConfig(ctx);
  console.log("⚙️  Updated .pi/team-config.json:");
  console.log(JSON.stringify(ctx, null, 2));
}

switch (command) {
  case "start":
    handleStart();
    break;
  case "resume":
    handleResume();
    break;
  case "attach":
    handleAttach();
    break;
  case "config":
    handleConfig();
    break;
  default:
    console.log("SquadLoop CLI — Run squadloop start [--ex-mode=team|standalone] [--driver=tmux|herdr|iterm2|regular]");
    break;
}
```

- [ ] **Step 2: Verify Build & Run `squadloop config`**

Run: `npm run build && ./bin/squadloop.js config exMode=standalone driver=iterm2`
Expected: Outputs config JSON with `"exMode": "standalone"` and `"driver": "iterm2"`.

- [ ] **Step 3: Commit**

```bash
git add bin/squadloop.js
git commit -m "feat: refactor bin/squadloop.js CLI to support --ex-mode and --driver"
```

---

### Task 6: End-to-End Build & Integration Verification

- [ ] **Step 1: Build the package**

Run: `npm run build`
Expected: PASS with 0 errors.

- [ ] **Step 2: Test `squadloop config` resets and overrides**

Run: `./bin/squadloop.js config exMode=team driver=tmux layout=panes`
Expected: Displays `.pi/team-config.json` configured for team mode, tmux driver, and panes layout.

- [ ] **Step 3: Commit final updates**

```bash
git add .
git commit -m "chore: complete team vs standalone and multi-driver refactoring"
```
