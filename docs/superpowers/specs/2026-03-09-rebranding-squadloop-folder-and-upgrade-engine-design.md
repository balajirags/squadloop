# Design Spec: SquadLoop — Rebranded `.squadloop/` Wrapper & Upgrade Engine

**Date**: 2026-03-09  
**Status**: Draft / Pending Approval  
**Target Platform**: SquadLoop (`squadloop` CLI, `@earendil-works/pi-coding-agent`)

---

## 1. Executive Summary

This design specification details the white-labeled `.squadloop/` wrapper and upgrade engine architecture for SquadLoop.

SquadLoop will rebrand from `.pi/` to `.squadloop/` as its primary project directory using Pi Agent's `CONFIG_DIR_NAME=.squadloop` and `PI_CODING_AGENT_DIR=~/.squadloop/agent` environment variables.

It also introduces `squadloop update` and `squadloop doctor` commands to keep the underlying Pi Agent engine in sync with SquadLoop extension updates while safely preserving user settings.

---

## 2. Architecture & File Structure

```
target-repository/
├── .squadloop/                     # Rebranded project directory
│   ├── config.json                 # squadloop team configuration
│   ├── models.json                 # local/custom model provider definitions
│   ├── settings.json               # pi settings
│   ├── agents/                     # agent persona specifications
│   ├── prompts/                    # persona slash command templates (/dev, /ba, etc.)
│   ├── extensions/                 # squadloop drivers, strategies, tools
│   └── sessions/                   # isolated session state
├── project-context.md              # build/test boundaries
└── AGENTS.md                        # squadloop operational mandate
```

---

## 3. Environment Variable Injection & Legacy Migration

### 3.1 Environment Variables
When launching Pi Agent sub-processes or running extensions:
```typescript
process.env.CONFIG_DIR_NAME = ".squadloop";
process.env.PI_CODING_AGENT_DIR = path.join(process.env.HOME || "", ".squadloop", "agent");
```

### 3.2 Legacy `.pi/` Auto-Migration Logic
In `bin/squadloop.js`:
```typescript
function migrateLegacyPiDirectory(): void {
  const cwd = process.cwd();
  const oldPi = path.join(cwd, ".pi");
  const newSquadLoop = path.join(cwd, ".squadloop");

  if (fs.existsSync(oldPi) && !fs.existsSync(newSquadLoop)) {
    fs.renameSync(oldPi, newSquadLoop);
    console.log("📦 Automatically migrated legacy .pi/ configuration to .squadloop/\n");
  }
}
```

---

## 4. `squadloop update` and `squadloop doctor` Commands

### 4.1 `squadloop update`
- Checks npm registry for updates to `@earendil-works/pi-coding-agent` and `squadloop`.
- Refreshes runtime logic in `.squadloop/extensions/`, `.squadloop/prompts/`, and `.squadloop/skills/`.
- Preserves `.squadloop/config.json`, `.squadloop/models.json`, `project-context.md`, and session history in `.squadloop/sessions/`.

### 4.2 `squadloop doctor`
- Checks CLI version, Pi Agent engine version, `.squadloop/config.json` validity, and driver availability (`tmux`, `herdr`, `iterm2`).

---

## 5. Verification & Testing

1. **Migration Test**:
   - Create a directory with legacy `.pi/`.
   - Run `squadloop start`. Verify `.pi/` is renamed to `.squadloop/` and session starts cleanly.
2. **Upgrade Test**:
   - Run `squadloop update`. Verify `.squadloop/extensions/` refreshes while `.squadloop/config.json` is preserved.
3. **Diagnostic Test**:
   - Run `squadloop doctor`. Verify version numbers and diagnostic report output.
