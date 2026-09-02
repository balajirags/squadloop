import { execSync, spawnSync } from "child_process";
import type { ITerminalDriver, WorkspacePanes } from "./terminal-driver-interface.js";
import { ModelResolver } from "../models/model-resolver.js";
import { getSessionName, normalizeSessionId } from "../sessions/session-manager.js";

function getAgentCommand(role: string, sessionId?: string): string {
  const model = ModelResolver.getModel(role);
  const agentFile = `.squadloop/agents/${role}.md`;
  const provider = model && model.includes("/") ? model.split("/")[0] : null;
  const providerFlag = provider ? ` --provider "${provider}"` : "";
  const modelFlag = model ? ` --model "${model}"` : "";
  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "";
  const geminiEnv = geminiKey ? ` GEMINI_API_KEY="${geminiKey}"` : "";
  const agentEnv = `env CONFIG_DIR_NAME=.squadloop PI_CODING_AGENT_DIR="$HOME/.squadloop/agent" SQUADLOOP_SESSION_ID="${normalizeSessionId(sessionId || process.env.SQUADLOOP_SESSION_ID || "default")}"${geminiEnv}`;
  return `${agentEnv} pi --approve --append-system-prompt "${agentFile}"${providerFlag}${modelFlag}`;
}

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

  public setupTeamLayout(layout: "panes" | "windows" = "windows", sessionId?: string): WorkspacePanes {
    const modeFlag = layout === "windows" ? "--tabs" : "--panes";
    const sessionName = resolveSessionName(sessionId);
    const roles = ["orchestrator", "ba", "developer", "qa", "reviewer"];
    const cmdFlags = roles.map(role => `--role-${role}-cmd "${getAgentCommand(role, sessionId)}"`).join(" ");
    try {
      execSync(`herdr spawn ${sessionName} ${modeFlag} --roles ${roles.join(",")} ${cmdFlags}`, { stdio: "ignore" });
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
