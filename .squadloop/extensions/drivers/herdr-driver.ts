import { execSync, spawnSync } from "child_process";
import type { ITerminalDriver, WorkspacePanes } from "./terminal-driver-interface.js";
import { getSessionName } from "../sessions/session-manager.js";

function resolveSessionName(sessionId?: string): string {
  return getSessionName(sessionId || process.env.SQUADLOOP_SESSION_ID || "default");
}

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

  public hasActiveSession(sessionId?: string): boolean {
    try {
      const res = execSync("herdr status 2>/dev/null").toString();
      return res.includes(resolveSessionName(sessionId));
    } catch {
      return false;
    }
  }

  public setupTeamLayout(layout: "panes" | "windows" = "panes", sessionId?: string): WorkspacePanes {
    const modeFlag = layout === "windows" ? "--tabs" : "--panes";
    const sessionName = resolveSessionName(sessionId);
    try {
      execSync(`herdr spawn ${sessionName} ${modeFlag} --roles orchestrator,ba,developer,qa,reviewer`, { stdio: "ignore" });
    } catch {
      // Fallback log
    }
    return {
      orchestrator: `${sessionName}-orch`,
      ba: `${sessionName}-ba`,
      developer: `${sessionName}-dev`,
      qa: `${sessionName}-qa`,
      reviewer: `${sessionName}-rev`
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

  public attachSession(sessionId?: string): void {
    spawnSync("herdr", ["attach", resolveSessionName(sessionId)], { stdio: "inherit" });
  }

  public stopSession(sessionId?: string): void {
    spawnSync("herdr", ["stop", resolveSessionName(sessionId)], { stdio: "inherit" });
  }

  public recoverMissingPanes(currentPanes: WorkspacePanes): WorkspacePanes {
    return currentPanes;
  }
}
