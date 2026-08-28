# BRD: SquadLoop — Branding, Custom TUI Theme & Header Status Bar Enhancements

**Status**: Draft / Pending Approval  
**Date**: 2026-03-09  

## Executive Summary
This specification defines product and visual design requirements for giving SquadLoop a distinctive, cohesive, AI-native software engineering team branding.

SquadLoop will customize Pi Agent's TUI surfaces (custom theme, top widget banner, bottom status bar ticker) and terminal multiplexer environments (`tmux`, `herdr`, `iTerm2`) to display real-time team state, role badges, active task status, and token usage telemetry.

---

## 1. Custom SquadLoop TUI Theme (`.pi/themes/squadloop.json`)

### 1.1 Color Palette & Theme Tokens
SquadLoop will ship a custom Pi theme (`squadloop`) with high-contrast cyber neon aesthetics:
- **`accent`**: Cyber Neon Cyan (`#00e5ff`)
- **`success`**: Emerald Green (`#00ff9d`)
- **`warning`**: Amber Gold (`#ffb700`)
- **`error`**: Crimson Red (`#ff0055`)
- **`borderAccent`**: Cyber Cyan (`#00e5ff`)
- **`userMessageBg` / `selectedBg`**: Deep Slate (`#1e1e2e`)
- **Thinking Level Gradients**: `#00e5ff` → `#00ff9d` → `#ffb700` → `#ff0055`

### 1.2 Theme Auto-Selection
`squadloop init` and `status-banner.ts` will configure `"theme": "squadloop"` in `.pi/settings.json` so the theme loads automatically on launch.

---

## 2. Top Widget Banner (`ctx.ui.setWidget`)

### 2.1 Visual Design
`.pi/extensions/status-banner.ts` will use `ctx.ui.setWidget("squadloop-header", ...)` to render a persistent boxed banner above the prompt editor in every agent pane:

```text
┌────────────────────────────────────────────────────────────────────────┐
│ 🚀 SQUADLOOP :: Autonomous Software Team                               │
│ Role: DEVELOPER │ Model: anthropic/claude-3-7-sonnet │ Mode: LOOP       │
│ Active Task: #42 [DEV in progress] │ Tokens: 18.2k ($0.04)              │
└────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Dynamic Content
The widget banner will dynamically update on:
- Session start / resume (`session_start`)
- Model selection (`model_select`)
- Task status changes (`team_update_status`)

---

## 3. Bottom TUI Status Bar (`ctx.ui.setStatus`)

### 3.1 Real-Time Footer Ticker
`.pi/extensions/status-banner.ts` will use `ctx.ui.setStatus("squadloop-footer", ...)` to display a real-time status ticker in the Pi TUI footer:

```text
[ 🚀 SquadLoop ] Story #42 :: DEV Phase 4/12 :: 18.2k tokens ($0.04)
```

---

## 4. Color-Coded Multiplexer Pane Borders

### 4.1 Role Colorization
In `TmuxDriver`, `HerdrDriver`, and `ITerm2Driver`, pane border colors and titles will be distinctly color-coded per agent persona:
- **Orchestrator**: Emerald Green (`fg=green,bold`)
- **BA**: Amber Gold (`fg=yellow,bold`)
- **Developer**: Blue (`fg=blue,bold`)
- **QA**: Magenta (`fg=magenta,bold`)
- **Reviewer**: Cyan (`fg=cyan,bold`)

---

## 5. User Stories & Implementation Breakdown

| Story ID | Title | Description |
|---|---|---|
| **SL-BRAND-01** | Custom SquadLoop Theme (`squadloop.json`) | Create `.pi/themes/squadloop.json` and set default theme in `settings.json`. |
| **SL-BRAND-02** | Top Header Widget Banner (`status-banner.ts`) | Implement `ctx.ui.setWidget("squadloop-header", ...)` displaying role, model, task ID, and status. |
| **SL-BRAND-03** | Bottom TUI Status Bar & Telemetry | Implement `ctx.ui.setStatus("squadloop-footer", ...)` displaying live task stage and token usage. |
| **SL-BRAND-04** | Role-based Multiplexer Pane Colorization | Update `TmuxDriver` and driver adapters to color-code pane borders per agent role. |
