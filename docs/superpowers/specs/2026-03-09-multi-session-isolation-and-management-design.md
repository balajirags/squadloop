# Design Spec: SquadLoop — Multi-Session Isolation & Session Management

**Date**: 2026-03-09  
**Status**: Draft / Pending Approval  
**Target Platform**: SquadLoop (`squadloop` CLI, `@earendil-works/pi-coding-agent`)

---

## 1. Executive Summary

This design specification details the multi-session isolation framework for SquadLoop.

SquadLoop will support multiple concurrent team sessions per repository through:
1. Auto-Generated Unique Session IDs (e.g. `squadloop-session-8b1a`) by default, with optional `--name=<label>` overrides.
2. Per-Session State Isolation (`.pi/sessions/<id>/active-task.json` and `events.jsonl`).
3. Driver Session Scope Isolation (`squadloop-<session-id>`).
4. Session Management CLI (`squadloop list`, `squadloop attach`, `squadloop stop`).

---

## 2. Architecture & File Structure

```
.pi/
└── sessions/
    ├── default/
    │   ├── active-task.json
    │   └── events.jsonl
    └── <session-id>/
        ├── active-task.json
        └── events.jsonl
```

---

## 3. Session Resolution Engine (`.pi/extensions/sessions/session-manager.ts`)

```typescript
import * as fs from "fs";
import * as path from "path";

export class SquadLoopSessionManager {
  public static generateSessionId(): string {
    const randomHex = Math.random().toString(36).substring(2, 6);
    return `session-${randomHex}`;
  }

  public static getSessionDir(sessionId = "default"): string {
    const dir = path.join(process.cwd(), ".pi", "sessions", sessionId);
    fs.mkdirSync(dir, { recursive: true });
    return dir;
  }

  public static getActiveTaskPath(sessionId = "default"): string {
    return path.join(this.getSessionDir(sessionId), "active-task.json");
  }

  public static getEventsPath(sessionId = "default"): string {
    return path.join(this.getSessionDir(sessionId), "events.jsonl");
  }
}
```

---

## 4. Terminal Driver Session Scoping

In `TmuxDriver`, `HerdrDriver`, and `ITerm2Driver`:
```typescript
public getSessionName(sessionId = "default"): string {
  return `squadloop-${sessionId}`;
}
```

---

## 5. Verification & Testing

1. **Isolation Test**:
   - Run `squadloop start --name=sess1` in Terminal 1.
   - Run `squadloop start --name=sess2` in Terminal 2.
   - Confirm two distinct tmux sessions (`squadloop-sess1` and `squadloop-sess2`) and two state folders (`.pi/sessions/sess1/` and `.pi/sessions/sess2/`) are created without interference.
2. **CLI Test**:
   - Verify `squadloop list` outputs both active sessions.
   - Verify `squadloop attach --name=sess1` attaches to `squadloop-sess1`.
   - Verify `squadloop stop --name=sess1` closes `squadloop-sess1` cleanly.
