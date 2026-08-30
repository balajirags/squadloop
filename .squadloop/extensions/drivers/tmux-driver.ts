import { execSync, spawnSync } from "child_process";
import type { ITerminalDriver, WorkspacePanes } from "./terminal-driver-interface.js";
import { ModelResolver } from "../models/model-resolver.js";
import { getSessionName, normalizeSessionId } from "../sessions/session-manager.js";

function cleanPaneId(raw: string): string {
  const match = String(raw).match(/%[0-9]+/);
  return match ? match[0] : String(raw).trim().split("\n")[0];
}

function getAgentCommand(role: string, sessionId?: string): string {
  const model = ModelResolver.getModel(role);
  const agentFile = `.squadloop/agents/${role}.md`;
  const modelFlag = model ? ` --model "${model}"` : "";
  const agentEnv = `env CONFIG_DIR_NAME=.squadloop PI_CODING_AGENT_DIR="$HOME/.squadloop/agent" SQUADLOOP_SESSION_ID="${normalizeSessionId(sessionId || process.env.SQUADLOOP_SESSION_ID || "default")}"`;
  return `${agentEnv} pi --approve --append-system-prompt "${agentFile}"${modelFlag}; exec bash`;
}

function resolveSessionName(sessionId?: string): string {
  return getSessionName(sessionId || process.env.SQUADLOOP_SESSION_ID || "default");
}

export class TmuxDriver implements ITerminalDriver {
  public readonly id = "tmux";
  public readonly name = "Tmux Terminal Driver";

  public isAvailable(): boolean {
    try {
      execSync("tmux -V", { stdio: "ignore" });
      return true;
    } catch {
      return false;
    }
  }

  public hasActiveSession(sessionId?: string): boolean {
    const sessionName = resolveSessionName(sessionId);
    return spawnSync("tmux", ["has-session", "-t", sessionName], { stdio: "ignore" }).status === 0;
  }

  public setupTeamLayout(layout: "panes" | "windows" = "panes", sessionId?: string): WorkspacePanes {
    if (layout === "windows") {
      return this.setup5WindowLayout(sessionId);
    }
    return this.setup5PaneLayout(sessionId);
  }

  private setup5PaneLayout(sessionId?: string): WorkspacePanes {
    const sessionName = resolveSessionName(sessionId);
    try {
      execSync(`tmux kill-session -t ${sessionName} 2>/dev/null`, { stdio: "ignore" });
    } catch {
      // Ignore
    }

    const orchestratorPane = cleanPaneId(execSync(
      `tmux new-session -d -s ${sessionName} -n team -P -F "#{pane_id}" "${getAgentCommand("orchestrator", sessionId)}"`
    ).toString());

    const baPane = cleanPaneId(execSync(
      `tmux split-window -v -t ${orchestratorPane} -P -F "#{pane_id}" "${getAgentCommand("ba", sessionId)}"`
    ).toString());

    const devPane = cleanPaneId(execSync(
      `tmux split-window -h -t ${baPane} -P -F "#{pane_id}" "${getAgentCommand("developer", sessionId)}"`
    ).toString());

    const qaPane = cleanPaneId(execSync(
      `tmux split-window -v -t ${baPane} -P -F "#{pane_id}" "${getAgentCommand("qa", sessionId)}"`
    ).toString());

    const reviewerPane = cleanPaneId(execSync(
      `tmux split-window -v -t ${devPane} -P -F "#{pane_id}" "${getAgentCommand("reviewer", sessionId)}"`
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

  private setup5WindowLayout(sessionId?: string): WorkspacePanes {
    const sessionName = resolveSessionName(sessionId);
    try {
      execSync(`tmux kill-session -t ${sessionName} 2>/dev/null`, { stdio: "ignore" });
    } catch {
      // Ignore
    }

    const orchestratorPane = cleanPaneId(execSync(
      `tmux new-session -d -s ${sessionName} -n orchestrator -P -F "#{pane_id}" "${getAgentCommand("orchestrator", sessionId)}"`
    ).toString());

    const baPane = cleanPaneId(execSync(
      `tmux new-window -t ${sessionName} -n ba -P -F "#{pane_id}" "${getAgentCommand("ba", sessionId)}"`
    ).toString());

    const devPane = cleanPaneId(execSync(
      `tmux new-window -t ${sessionName} -n developer -P -F "#{pane_id}" "${getAgentCommand("developer", sessionId)}"`
    ).toString());

    const qaPane = cleanPaneId(execSync(
      `tmux new-window -t ${sessionName} -n qa -P -F "#{pane_id}" "${getAgentCommand("qa", sessionId)}"`
    ).toString());

    const reviewerPane = cleanPaneId(execSync(
      `tmux new-window -t ${sessionName} -n reviewer -P -F "#{pane_id}" "${getAgentCommand("reviewer", sessionId)}"`
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

  public attachSession(sessionId?: string): void {
    const sessionName = resolveSessionName(sessionId);
    const inTmux = Boolean(process.env.TMUX) || spawnSync("tmux", ["display-message"], { stdio: "ignore" }).status === 0;
    if (inTmux) {
      try {
        spawnSync("tmux", ["switch-client", "-t", sessionName], { stdio: "inherit" });
        return;
      } catch {
        // Fallback
      }
    }
    const env = { ...process.env };
    delete env.TMUX;
    spawnSync("tmux", ["attach", "-t", sessionName], { stdio: "inherit", env });
  }

  public stopSession(sessionId?: string): void {
    const sessionName = resolveSessionName(sessionId);
    spawnSync("tmux", ["kill-session", "-t", sessionName], { stdio: "inherit" });
  }

  public recoverMissingPanes(currentPanes: WorkspacePanes): WorkspacePanes {
    return currentPanes;
  }
}
