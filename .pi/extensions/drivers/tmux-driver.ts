import { execSync, spawnSync } from "child_process";
import type { ITerminalDriver, WorkspacePanes } from "./terminal-driver-interface.js";
import { ModelResolver } from "../models/model-resolver.js";

function cleanPaneId(raw: string): string {
  const match = String(raw).match(/%[0-9]+/);
  return match ? match[0] : String(raw).trim().split("\n")[0];
}

function getAgentCommand(role: string): string {
  const model = ModelResolver.getModel(role);
  const agentFile = `.pi/agents/${role}.md`;
  const modelFlag = model ? ` --model "${model}"` : "";
  return `pi --approve --append-system-prompt "${agentFile}"${modelFlag}; exec bash`;
}

export class TmuxDriver implements ITerminalDriver {
  public readonly id = "tmux";
  public readonly name = "Tmux Terminal Driver";
  private sessionName = "squadloop-workspace";

  public isAvailable(): boolean {
    try {
      execSync("tmux -V", { stdio: "ignore" });
      return true;
    } catch {
      return false;
    }
  }

  public hasActiveSession(): boolean {
    return spawnSync("tmux", ["has-session", "-t", this.sessionName], { stdio: "ignore" }).status === 0;
  }

  public setupTeamLayout(layout: "panes" | "windows" = "panes"): WorkspacePanes {
    if (layout === "windows") {
      return this.setup5WindowLayout();
    }
    return this.setup5PaneLayout();
  }

  private setup5PaneLayout(): WorkspacePanes {
    try {
      execSync(`tmux kill-session -t ${this.sessionName} 2>/dev/null`, { stdio: "ignore" });
    } catch {
      // Ignore
    }

    const orchestratorPane = cleanPaneId(execSync(
      `tmux new-session -d -s ${this.sessionName} -n team -P -F "#{pane_id}" "${getAgentCommand("orchestrator")}"`
    ).toString());

    const baPane = cleanPaneId(execSync(
      `tmux split-window -v -t ${orchestratorPane} -P -F "#{pane_id}" "${getAgentCommand("ba")}"`
    ).toString());

    const devPane = cleanPaneId(execSync(
      `tmux split-window -h -t ${baPane} -P -F "#{pane_id}" "${getAgentCommand("developer")}"`
    ).toString());

    const qaPane = cleanPaneId(execSync(
      `tmux split-window -v -t ${baPane} -P -F "#{pane_id}" "${getAgentCommand("qa")}"`
    ).toString());

    const reviewerPane = cleanPaneId(execSync(
      `tmux split-window -v -t ${devPane} -P -F "#{pane_id}" "${getAgentCommand("reviewer")}"`
    ).toString());

    try {
      execSync(`tmux set-option -p -t ${orchestratorPane} @persona "[ SQUADLOOP :: MASTER ORCHESTRATOR ]"`);
      execSync(`tmux set-option -p -t ${baPane} @persona "[ SQUADLOOP :: BUSINESS ANALYST (BA) ]"`);
      execSync(`tmux set-option -p -t ${devPane} @persona "[ SQUADLOOP :: DEVELOPER (DEV) ]"`);
      execSync(`tmux set-option -p -t ${qaPane} @persona "[ SQUADLOOP :: QUALITY ANALYST (QA) ]"`);
      execSync(`tmux set-option -p -t ${reviewerPane} @persona "[ SQUADLOOP :: CODE REVIEWER (REVIEWER) ]"`);
    } catch {
      // Non-fatal
    }

    return { orchestrator: orchestratorPane, ba: baPane, developer: devPane, qa: qaPane, reviewer: reviewerPane };
  }

  private setup5WindowLayout(): WorkspacePanes {
    try {
      execSync(`tmux kill-session -t ${this.sessionName} 2>/dev/null`, { stdio: "ignore" });
    } catch {
      // Ignore
    }

    const orchestratorPane = cleanPaneId(execSync(
      `tmux new-session -d -s ${this.sessionName} -n orchestrator -P -F "#{pane_id}" "${getAgentCommand("orchestrator")}"`
    ).toString());

    const baPane = cleanPaneId(execSync(
      `tmux new-window -t ${this.sessionName} -n ba -P -F "#{pane_id}" "${getAgentCommand("ba")}"`
    ).toString());

    const devPane = cleanPaneId(execSync(
      `tmux new-window -t ${this.sessionName} -n developer -P -F "#{pane_id}" "${getAgentCommand("developer")}"`
    ).toString());

    const qaPane = cleanPaneId(execSync(
      `tmux new-window -t ${this.sessionName} -n qa -P -F "#{pane_id}" "${getAgentCommand("qa")}"`
    ).toString());

    const reviewerPane = cleanPaneId(execSync(
      `tmux new-window -t ${this.sessionName} -n reviewer -P -F "#{pane_id}" "${getAgentCommand("reviewer")}"`
    ).toString());

    return { orchestrator: orchestratorPane, ba: baPane, developer: devPane, qa: qaPane, reviewer: reviewerPane };
  }

  public async sendPrompt(paneTarget: string, promptText: string, clear = true): Promise<void> {
    try {
      if (clear) {
        spawnSync("tmux", ["send-keys", "-t", paneTarget, "/clear", "Enter"]);
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      spawnSync("tmux", ["send-keys", "-t", paneTarget, promptText, "Enter"]);
    } catch {
      // Ignore
    }
  }

  public attachSession(): void {
    const inTmux = Boolean(process.env.TMUX) || spawnSync("tmux", ["display-message"], { stdio: "ignore" }).status === 0;
    if (inTmux) {
      try {
        spawnSync("tmux", ["switch-client", "-t", this.sessionName], { stdio: "inherit" });
        return;
      } catch {
        // Fallback
      }
    }
    const env = { ...process.env };
    delete env.TMUX;
    spawnSync("tmux", ["attach", "-t", this.sessionName], { stdio: "inherit", env });
  }

  public recoverMissingPanes(currentPanes: WorkspacePanes): WorkspacePanes {
    return currentPanes;
  }
}
