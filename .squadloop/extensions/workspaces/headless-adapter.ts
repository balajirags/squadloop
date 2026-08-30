import * as fs from "fs";
import * as path from "path";
import type { IWorkspaceAdapter, WorkspacePanes } from "./workspace-interface.js";
import { ModelResolver } from "../models/model-resolver.js";
import { appendSessionEvent, getRuntimeSessionId } from "../sessions/session-manager.js";

function resolveRoleModel(role: string): string | null {
  return ModelResolver.getModel(role);
}

export class HeadlessWorkspaceAdapter implements IWorkspaceAdapter {
  public readonly name = "Regular Headless Workspace (No Tmux)";

  public isAvailable(): boolean {
    return true;
  }

  public setupLayout(_layout: "panes" | "windows" = "panes", _sessionId?: string): WorkspacePanes {
    console.log("ℹ️  Running in Regular Headless Mode (no tmux required).");
    return {
      orchestrator: "orchestrator",
      ba: "ba",
      developer: "developer",
      qa: "qa",
      reviewer: "reviewer"
    };
  }

  public recoverMissingPanes(currentPanes: WorkspacePanes, _sessionId?: string): WorkspacePanes {
    return currentPanes;
  }

  public async sendPrompt(targetRole: string, promptText: string): Promise<void> {
    try {
      const sessionId = getRuntimeSessionId();
      const model = resolveRoleModel(targetRole);

      appendSessionEvent(sessionId, {
        eventId: `evt_${Date.now()}`,
        type: "headless_prompt",
        targetRole,
        model: model || "default",
        prompt: promptText,
        timestamp: new Date().toISOString()
      });

      const eventsPath = path.join(process.cwd(), ".squadloop", "events.jsonl");
      fs.mkdirSync(path.dirname(eventsPath), { recursive: true });
      console.log(`[HEADLESS DISPATCH -> ${targetRole.toUpperCase()}${model ? ` (${model})` : ""}] : ${promptText.slice(0, 100)}...`);
    } catch {
      // Non-fatal
    }
  }

  public startAppServerWindow(_startCommand?: string): string {
    return "headless-app-server";
  }
}
