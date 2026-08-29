import { execSync } from "child_process";
import type { ITerminalDriver, WorkspacePanes } from "./terminal-driver-interface.js";
import { ModelResolver } from "../models/model-resolver.js";

function getAgentCommand(role: string): string {
  const model = ModelResolver.getModel(role);
  const agentFile = `.squadloop/agents/${role}.md`;
  const modelFlag = model ? ` --model "${model}"` : "";
  const agentEnv = `env CONFIG_DIR_NAME=.squadloop PI_CODING_AGENT_DIR="$HOME/.squadloop/agent"`;
  return `${agentEnv} pi --approve --append-system-prompt "${agentFile}"${modelFlag}`;
}

export class ITerm2Driver implements ITerminalDriver {
  public readonly id = "iterm2";
  public readonly name = "iTerm2 Terminal Driver";

  public isAvailable(): boolean {
    if (process.platform !== "darwin") return false;
    try {
      execSync("osascript -e 'id of application \"iTerm\"'", { stdio: "ignore" });
      return true;
    } catch {
      return false;
    }
  }

  public hasActiveSession(): boolean {
    try {
      const script = `
        tell application "iTerm"
          repeat with w in windows
            if name of w contains "squadloop" then return true
          end repeat
        end tell
        return false
      `;
      const out = execSync(`osascript -e '${script}'`).toString().trim();
      return out === "true";
    } catch {
      return false;
    }
  }

  public setupTeamLayout(layout: "panes" | "windows" = "panes"): WorkspacePanes {
    const isWindows = layout === "windows";
    const script = `
      tell application "iTerm"
        activate
        set newWindow to (create window with default profile)
        tell newWindow
          set name to "squadloop-workspace"
          ${isWindows ? `
            tell current tab
              set name to "orchestrator"
              tell current session
                set name to "orchestrator"
                write text "${getAgentCommand("orchestrator")}"
              end tell
            end tell
            
            set baTab to (create tab with default profile)
            tell baTab
              set name to "ba"
              tell current session
                set name to "ba"
                write text "${getAgentCommand("ba")}"
              end tell
            end tell
            
            set devTab to (create tab with default profile)
            tell devTab
              set name to "developer"
              tell current session
                set name to "developer"
                write text "${getAgentCommand("developer")}"
              end tell
            end tell
            
            set qaTab to (create tab with default profile)
            tell qaTab
              set name to "qa"
              tell current session
                set name to "qa"
                write text "${getAgentCommand("qa")}"
              end tell
            end tell
            
            set revTab to (create tab with default profile)
            tell revTab
              set name to "reviewer"
              tell current session
                set name to "reviewer"
                write text "${getAgentCommand("reviewer")}"
              end tell
            end tell
          ` : `
            tell current tab
              set orchSession to current session
              tell orchSession
                set name to "orchestrator"
                write text "${getAgentCommand("orchestrator")}"
                set baSession to (split horizontally with default profile)
              end tell
              tell baSession
                set name to "ba"
                write text "${getAgentCommand("ba")}"
                set devSession to (split vertically with default profile)
              end tell
              tell baSession
                set qaSession to (split horizontally with default profile)
              end tell
              tell devSession
                set name to "developer"
                write text "${getAgentCommand("developer")}"
                set revSession to (split horizontally with default profile)
              end tell
              tell qaSession
                set name to "qa"
                write text "${getAgentCommand("qa")}"
              end tell
              tell revSession
                set name to "reviewer"
                write text "${getAgentCommand("reviewer")}"
              end tell
            end tell
          `}
        end tell
      end tell
    `;

    try {
      execSync(`osascript -e '${script}'`, { stdio: "ignore" });
    } catch {
      // Ignore
    }

    return {
      orchestrator: "orchestrator",
      ba: "ba",
      developer: "developer",
      qa: "qa",
      reviewer: "reviewer"
    };
  }

  public async sendPrompt(paneTarget: string, promptText: string, clear = false): Promise<void> {
    const escaped = promptText.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    const target = paneTarget.toLowerCase();
    const script = `
      tell application "iTerm"
        repeat with w in windows
          if name of w contains "squadloop-workspace" then
            tell w
              repeat with t in tabs
                repeat with s in sessions of t
                  if name of s contains "${target}" or name of t contains "${target}" then
                    tell s to write text "${escaped}"
                  end if
                end repeat
              end repeat
            end tell
          end if
        end repeat
      end tell
    `;
    try {
      execSync(`osascript -e '${script}'`, { stdio: "ignore" });
    } catch {
      // Ignore
    }
  }

  public attachSession(): void {
    try {
      execSync(`osascript -e 'tell application "iTerm" to activate'`, { stdio: "ignore" });
    } catch {
      // Ignore
    }
  }

  public recoverMissingPanes(currentPanes: WorkspacePanes): WorkspacePanes {
    return currentPanes;
  }
}
