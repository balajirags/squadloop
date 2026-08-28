# Design Spec: SquadLoop — Branding, Custom TUI Theme & Status Banner

**Date**: 2026-03-09  
**Status**: Draft / Pending Approval  
**Target Platform**: SquadLoop (`squadloop` CLI, `@earendil-works/pi-coding-agent`, tmux, herdr, iTerm2)

---

## 1. Executive Summary

This design specification details the custom visual branding and TUI enhancements for SquadLoop.

SquadLoop will establish a distinctive AI-native software engineering team identity through:
1. **Custom Theme (`.pi/themes/squadloop.json`)**: Cyber neon color palette (`#00e5ff` cyan, `#00ff9d` emerald, `#ffb700` gold) with custom tool boxes, editor borders, and thinking level gradients.
2. **Top Header Widget Banner (`ctx.ui.setWidget`)**: Boxed header banner above prompt editor in `.pi/extensions/status-banner.ts`.
3. **Bottom TUI Status Ticker (`ctx.ui.setStatus`)**: Live real-time footer status bar.
4. **Multiplexer Border Colorization**: Role-specific pane border colors in `TmuxDriver`.

---

## 2. Architecture & File Structure

```
.pi/
├── themes/
│   └── squadloop.json          # Custom SquadLoop theme definition
├── extensions/
│   └── status-banner.ts        # Top widget banner & bottom status ticker extension
├── settings.json               # Configures "theme": "squadloop"
```

---

## 3. Theme Specification (`.pi/themes/squadloop.json`)

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

---

## 4. Status Banner Extension (`.pi/extensions/status-banner.ts`)

### 4.1 Widget & Status Implementation
```typescript
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import * as fs from "fs";
import * as path from "path";

export default function (pi: ExtensionAPI) {
  function updateBanner(ctx: any) {
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
      } catch {}
    }

    if (fs.existsSync(activeTaskPath)) {
      try {
        const task = JSON.parse(fs.readFileSync(activeTaskPath, "utf-8"));
        activeIssue = task.activeIssueId ? `#${task.activeIssueId}` : "None";
        status = task.status || "idle";
      } catch {}
    }

    const currentModel = ctx.model ? `${ctx.model.provider}/${ctx.model.id}` : "default";

    // 1. Set top widget header banner
    ctx.ui.setWidget("squadloop-header", [
      `🚀 SQUADLOOP :: Autonomous Software Team`,
      `Mode: ${exMode.toUpperCase()} (${hitl.toUpperCase()}) | Driver: ${driver.toUpperCase()} | Model: ${currentModel}`,
      `Active Task: ${activeIssue} [Status: ${status}]`
    ]);

    // 2. Set bottom status ticker
    ctx.ui.setStatus("squadloop-footer", `[ 🚀 SquadLoop ] Task ${activeIssue} :: ${status.toUpperCase()} :: ${currentModel}`);
  }

  pi.on("session_start", async (_event, ctx) => {
    ctx.ui.setTheme("squadloop");
    updateBanner(ctx);
  });

  pi.on("model_select", async (_event, ctx) => {
    updateBanner(ctx);
  });
}
```

---

## 5. Verification Plan

1. **Build & Type Check**:
   - `npm run build` succeeds cleanly.
2. **Visual Verification**:
   - Verify `.pi/themes/squadloop.json` loads in Pi Agent.
   - Verify top widget banner renders 3-line header above prompt editor.
   - Verify bottom status ticker displays live model and task ID.
   - Verify tmux pane borders display role-specific colors.
