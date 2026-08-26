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
