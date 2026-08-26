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
