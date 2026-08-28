# SquadLoop Branding, Custom Theme & Status Banner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give SquadLoop a custom visual identity using a custom Pi TUI theme (`.pi/themes/squadloop.json`), boxed top widget header banner, bottom status ticker, and role-colorized tmux pane borders.

**Architecture:** Create a custom 51-color token theme file (`squadloop.json`) in `.pi/themes/`. Enhance `.pi/extensions/status-banner.ts` to call `ctx.ui.setTheme("squadloop")`, render `ctx.ui.setWidget("squadloop-header", ...)`, and update `ctx.ui.setStatus("squadloop-footer", ...)`. Update `TmuxDriver` to color-code pane borders per agent role. Update `squadloop init` to bootstrap theme files.

**Tech Stack:** TypeScript (Node.js ES2022 / NodeNext modules), `@earendil-works/pi-coding-agent`, tmux styling.

**Spec:** `docs/superpowers/specs/2026-03-09-branding-theme-and-tui-enhancements-design.md`

## Global Constraints
- Custom theme name: `"squadloop"` in `.pi/themes/squadloop.json`
- Top widget banner: `ctx.ui.setWidget("squadloop-header", ...)`
- Bottom status ticker: `ctx.ui.setStatus("squadloop-footer", ...)`
- Role border colors in tmux: Emerald (Orchestrator), Gold (BA), Blue (Developer), Magenta (QA), Cyan (Reviewer)

---

### Task 1: Custom SquadLoop Theme (`.pi/themes/squadloop.json`) & Settings Configuration

**Files:**
- Create: `.pi/themes/squadloop.json`
- Modify: `.pi/settings.json`

**Interfaces:**
- Consumes: Pi Theme Schema
- Produces: Theme file `.pi/themes/squadloop.json`

- [ ] **Step 1: Create `.pi/themes/squadloop.json`**

Create `.pi/themes/squadloop.json`:
```json
{
  "$schema": "https://raw.githubusercontent.com/earendil-works/pi/main/packages/coding-agent/src/modes/interactive/theme/theme-schema.json",
  "name": "squadloop",
  "vars": {
    "cyan": "#00e5ff",
    "emerald": "#00ff9d",
    "gold": "#ffb700",
    "crimson": "#ff0055",
    "blue": "#3b82f6",
    "purple": "#d946ef",
    "bgDark": "#1e1e2e",
    "bgSelected": "#2a2a3e"
  },
  "colors": {
    "accent": "cyan",
    "border": "cyan",
    "borderAccent": "emerald",
    "borderMuted": "bgSelected",
    "success": "emerald",
    "error": "crimson",
    "warning": "gold",
    "muted": "#8888aa",
    "dim": "#555577",
    "text": "",
    "thinkingText": "muted",
    "selectedBg": "bgSelected",
    "scrollbarThumb": "#444466",
    "userMessageBg": "bgDark",
    "userMessageText": "",
    "customMessageBg": "bgDark",
    "customMessageText": "",
    "customMessageLabel": "cyan",
    "toolPendingBg": "#1a233a",
    "toolSuccessBg": "#1a3a2a",
    "toolErrorBg": "#3a1a2a",
    "toolTitle": "cyan",
    "toolOutput": "",
    "mdHeading": "gold",
    "mdLink": "cyan",
    "mdLinkUrl": "muted",
    "mdCode": "emerald",
    "mdCodeBlock": "",
    "mdCodeBlockBorder": "muted",
    "mdQuote": "muted",
    "mdQuoteBorder": "muted",
    "mdHr": "muted",
    "mdListBullet": "cyan",
    "toolDiffAdded": "emerald",
    "toolDiffRemoved": "crimson",
    "toolDiffContext": "muted",
    "syntaxComment": "muted",
    "syntaxKeyword": "cyan",
    "syntaxFunction": "blue",
    "syntaxVariable": "gold",
    "syntaxString": "emerald",
    "syntaxNumber": "purple",
    "syntaxType": "cyan",
    "syntaxOperator": "cyan",
    "syntaxPunctuation": "muted",
    "thinkingOff": "muted",
    "thinkingMinimal": "blue",
    "thinkingLow": "cyan",
    "thinkingMedium": "emerald",
    "thinkingHigh": "gold",
    "thinkingXhigh": "crimson",
    "thinkingMax": "purple",
    "bashMode": "gold"
  }
}
```

- [ ] **Step 2: Update `.pi/settings.json`**

Update `.pi/settings.json`:
```json
{
  "theme": "squadloop"
}
```

- [ ] **Step 3: Commit**

```bash
git add .pi/themes/squadloop.json .pi/settings.json
git commit -m "feat: add custom SquadLoop theme and set default theme in settings.json"
```

---

### Task 2: Enhanced Status Banner Extension (`.pi/extensions/status-banner.ts`)

**Files:**
- Modify: `.pi/extensions/status-banner.ts`

**Interfaces:**
- Consumes: `ExtensionAPI`, `ctx.ui.setWidget`, `ctx.ui.setStatus`, `ctx.ui.setTheme`
- Produces: Persistent top widget banner and bottom status ticker

- [ ] **Step 1: Write `.pi/extensions/status-banner.ts`**

Update `.pi/extensions/status-banner.ts`:
```typescript
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import * as fs from "fs";
import * as path from "path";

export default function (pi: ExtensionAPI) {
  function updateBanner(ctx: any) {
    if (!ctx.hasUI) return;

    const configPath = path.join(process.cwd(), ".pi", "team-config.json");
    const activeTaskPath = path.join(process.cwd(), ".pi", "active-task.json");

    let exMode = "team";
    let driver = "tmux";
    let hitl = "loop";
    let activeIssue = "None";
    let status = "idle";

    if (fs.existsSync(configPath)) {
      try {
        const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
        exMode = config.exMode || "team";
        driver = config.driver || "tmux";
        hitl = config.hitl || "loop";
      } catch {
        // Ignore
      }
    }

    if (fs.existsSync(activeTaskPath)) {
      try {
        const task = JSON.parse(fs.readFileSync(activeTaskPath, "utf-8"));
        activeIssue = task.activeIssueId ? `#${task.activeIssueId}` : "None";
        status = task.status || "idle";
      } catch {
        // Ignore
      }
    }

    const currentModel = ctx.model ? `${ctx.model.provider}/${ctx.model.id}` : "default";

    // 1. Top widget header banner above prompt editor
    ctx.ui.setWidget("squadloop-header", [
      `🚀 SQUADLOOP :: Autonomous Software Team`,
      `Mode: ${exMode.toUpperCase()} (${hitl.toUpperCase()}) | Driver: ${driver.toUpperCase()} | Model: ${currentModel}`,
      `Active Task: ${activeIssue} [Status: ${status}]`
    ]);

    // 2. Bottom TUI status ticker
    ctx.ui.setStatus("squadloop-footer", `[ 🚀 SquadLoop ] Task ${activeIssue} :: ${status.toUpperCase()} :: ${currentModel}`);
  }

  pi.on("session_start", async (_event, ctx) => {
    try {
      ctx.ui.setTheme("squadloop");
    } catch {
      // Non-fatal
    }
    updateBanner(ctx);
  });

  pi.on("model_select", async (_event, ctx) => {
    updateBanner(ctx);
  });
}
```

- [ ] **Step 2: Verify Build**

Run: `npm run build`
Expected: PASS with 0 errors.

- [ ] **Step 3: Commit**

```bash
git add .pi/extensions/status-banner.ts
git commit -m "feat: enhance status banner extension with top widget header and bottom status ticker"
```

---

### Task 3: Role-based Multiplexer Pane Border Colorization (`tmux-driver.ts`)

**Files:**
- Modify: `.pi/extensions/drivers/tmux-driver.ts`

**Interfaces:**
- Consumes: `TmuxDriver.setup5PaneLayout()`
- Produces: Colorized pane borders per agent persona role in tmux

- [ ] **Step 1: Update `.pi/extensions/drivers/tmux-driver.ts`**

Update `setup5PaneLayout()` in `.pi/extensions/drivers/tmux-driver.ts`:
```typescript
    try {
      execSync(`tmux set-option -w -t ${this.sessionName} allow-rename off`);
      execSync(`tmux set-window-option -t ${this.sessionName} automatic-rename off`);
      execSync(`tmux set-window-option -t ${this.sessionName} pane-border-status top`);
      execSync(`tmux set-window-option -t ${this.sessionName} pane-border-style "fg=cyan"`);
      execSync(`tmux set-window-option -t ${this.sessionName} pane-active-border-style "fg=brightcyan,bold"`);
      execSync(`tmux set-window-option -t ${this.sessionName} pane-border-format "#[fg=black,bg=cyan,bold] #{@persona} #[default]"`);

      execSync(`tmux set-option -p -t ${orchestratorPane} @persona "[ SQUADLOOP :: MASTER ORCHESTRATOR ]"`);
      execSync(`tmux set-option -p -t ${orchestratorPane} pane-border-style "fg=green"`);

      execSync(`tmux set-option -p -t ${baPane} @persona "[ SQUADLOOP :: BUSINESS ANALYST (BA) ]"`);
      execSync(`tmux set-option -p -t ${baPane} pane-border-style "fg=yellow"`);

      execSync(`tmux set-option -p -t ${devPane} @persona "[ SQUADLOOP :: DEVELOPER (DEV) ]"`);
      execSync(`tmux set-option -p -t ${devPane} pane-border-style "fg=blue"`);

      execSync(`tmux set-option -p -t ${qaPane} @persona "[ SQUADLOOP :: QUALITY ANALYST (QA) ]"`);
      execSync(`tmux set-option -p -t ${qaPane} pane-border-style "fg=magenta"`);

      execSync(`tmux set-option -p -t ${reviewerPane} @persona "[ SQUADLOOP :: CODE REVIEWER (REVIEWER) ]"`);
      execSync(`tmux set-option -p -t ${reviewerPane} pane-border-style "fg=cyan"`);

      execSync(`tmux set-option -t ${this.sessionName} status-style "bg=black,fg=cyan"`);
      execSync(`tmux set-option -t ${this.sessionName} status-left "#[fg=black,bg=green,bold] 🚀 SquadLoop #[default] "`);
      execSync(`tmux set-option -t ${this.sessionName} status-right "#[fg=cyan,bold] %Y-%m-%d %H:%M #[default]"`);
    } catch {
      // Non-fatal
    }
```

- [ ] **Step 2: Verify Build**

Run: `npm run build`
Expected: PASS with 0 errors.

- [ ] **Step 3: Commit**

```bash
git add .pi/extensions/drivers/tmux-driver.ts
git commit -m "feat: add role-based tmux pane border colorization"
```

---

### Task 4: `squadloop init` & `bin/squadloop.js` Integration

**Files:**
- Modify: `bin/squadloop.js`

**Interfaces:**
- Consumes: `squadloop init`
- Produces: `.pi/themes/squadloop.json` bootstrapped on init

- [ ] **Step 1: Update `handleInit()` in `bin/squadloop.js`**

Ensure `handleInit()` in `bin/squadloop.js` copies `.pi/themes/` from `packageRoot` when bootstrapping a new directory.

- [ ] **Step 2: Verify Build**

Run: `npm run build`
Expected: PASS with 0 errors.

- [ ] **Step 3: Commit**

```bash
git add bin/squadloop.js
git commit -m "feat: ensure themes directory is bootstrapped during squadloop init"
```

---

### Task 5: End-to-End Build & Visual Verification

- [ ] **Step 1: Run `npm run build`**
Expected: PASS with 0 errors.

- [ ] **Step 2: Test `squadloop start --ex-mode=team --driver=tmux`**
Verify top widget header banner renders, bottom status ticker appears, and tmux pane borders display role colors.

- [ ] **Step 3: Commit Final Updates**

```bash
git add .
git commit -m "chore: complete SquadLoop branding, custom theme, and status banner implementation"
```
