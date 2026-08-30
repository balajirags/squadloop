import type { ITerminalDriver, WorkspacePanes } from "./terminal-driver-interface.js";

export class RegularDriver implements ITerminalDriver {
  public readonly id = "regular";
  public readonly name = "Regular Standalone Terminal Driver";

  public isAvailable(): boolean {
    return true;
  }

  public hasActiveSession(_sessionId?: string): boolean {
    return true;
  }

  public setupTeamLayout(layout: "panes" | "windows" = "panes", _sessionId?: string): WorkspacePanes {
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

  public attachSession(_sessionId?: string): void {
    // Direct terminal session, no attachment required
  }

  public stopSession(_sessionId?: string): void {
    // No-op in standalone mode
  }

  public recoverMissingPanes(currentPanes: WorkspacePanes): WorkspacePanes {
    return currentPanes;
  }
}
