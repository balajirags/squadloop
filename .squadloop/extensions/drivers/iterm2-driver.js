import { execSync } from "child_process";
import { ModelResolver } from "../models/model-resolver.js";
import { getSessionName, normalizeSessionId } from "../sessions/session-manager.js";
function getAgentCommand(role, sessionId) {
    const model = ModelResolver.getModel(role);
    const agentFile = `.squadloop/agents/${role}.md`;
    const modelFlag = model ? ` --model "${model}"` : "";
    const agentEnv = `env CONFIG_DIR_NAME=.squadloop PI_CODING_AGENT_DIR="$HOME/.squadloop/agent" SQUADLOOP_SESSION_ID="${normalizeSessionId(sessionId || process.env.SQUADLOOP_SESSION_ID || "default")}"`;
    return `${agentEnv} pi --approve --append-system-prompt "${agentFile}"${modelFlag}`;
}
function resolveSessionName(sessionId) {
    return getSessionName(sessionId || process.env.SQUADLOOP_SESSION_ID || "default");
}
export class ITerm2Driver {
    id = "iterm2";
    name = "iTerm2 Terminal Driver";
    isAvailable() {
        if (process.platform !== "darwin")
            return false;
        try {
            execSync("osascript -e 'id of application \"iTerm\"'", { stdio: "ignore" });
            return true;
        }
        catch {
            return false;
        }
    }
    hasActiveSession(sessionId) {
        const sessionName = resolveSessionName(sessionId);
        try {
            const script = `
        tell application "iTerm"
          repeat with w in windows
            if name of w contains "${sessionName}" then return true
          end repeat
        end tell
        return false
      `;
            const out = execSync(`osascript -e '${script}'`).toString().trim();
            return out === "true";
        }
        catch {
            return false;
        }
    }
    setupTeamLayout(layout = "panes", sessionId) {
        const isWindows = layout === "windows";
        const sessionName = resolveSessionName(sessionId);
        const script = `
      tell application "iTerm"
        activate
        set newWindow to (create window with default profile)
        tell newWindow
          set name to "${sessionName}"
          ${isWindows ? `
            tell current tab
              set name to "orchestrator"
              tell current session
                set name to "orchestrator"
                write text "${getAgentCommand("orchestrator", sessionId)}"
              end tell
            end tell

            set baTab to (create tab with default profile)
            tell baTab
              set name to "ba"
              tell current session
                set name to "ba"
                write text "${getAgentCommand("ba", sessionId)}"
              end tell
            end tell

            set devTab to (create tab with default profile)
            tell devTab
              set name to "developer"
              tell current session
                set name to "developer"
                write text "${getAgentCommand("developer", sessionId)}"
              end tell
            end tell

            set qaTab to (create tab with default profile)
            tell qaTab
              set name to "qa"
              tell current session
                set name to "qa"
                write text "${getAgentCommand("qa", sessionId)}"
              end tell
            end tell

            set revTab to (create tab with default profile)
            tell revTab
              set name to "reviewer"
              tell current session
                set name to "reviewer"
                write text "${getAgentCommand("reviewer", sessionId)}"
              end tell
            end tell
          ` : `
            tell current tab
              set orchSession to current session
              tell orchSession
                set name to "orchestrator"
                write text "${getAgentCommand("orchestrator", sessionId)}"
                set baSession to (split horizontally with default profile)
              end tell
              tell baSession
                set name to "ba"
                write text "${getAgentCommand("ba", sessionId)}"
                set devSession to (split vertically with default profile)
              end tell
              tell baSession
                set qaSession to (split horizontally with default profile)
              end tell
              tell devSession
                set name to "developer"
                write text "${getAgentCommand("developer", sessionId)}"
                set revSession to (split horizontally with default profile)
              end tell
              tell qaSession
                set name to "qa"
                write text "${getAgentCommand("qa", sessionId)}"
              end tell
              tell revSession
                set name to "reviewer"
                write text "${getAgentCommand("reviewer", sessionId)}"
              end tell
            end tell
          `}
        end tell
      end tell
    `;
        try {
            execSync(`osascript -e '${script}'`, { stdio: "ignore" });
        }
        catch {
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
    async sendPrompt(paneTarget, promptText, clear = false) {
        const escaped = promptText.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
        const target = paneTarget.toLowerCase();
        const script = `
      tell application "iTerm"
        repeat with w in windows
          if name of w contains "${resolveSessionName()}" then
            tell w
              repeat with t in tabs
                repeat with s in sessions of t
                  if name of s contains "${target}" or name of t contains "${target}" then
                    tell s to write text "${escaped}"
                  end if
                end repeat
              end tell
            end tell
          end if
        end repeat
      end tell
    `;
        try {
            execSync(`osascript -e '${script}'`, { stdio: "ignore" });
        }
        catch {
            // Ignore
        }
    }
    attachSession(sessionId) {
        try {
            execSync(`osascript -e 'tell application "iTerm" to activate'`, { stdio: "ignore" });
        }
        catch {
            // Ignore
        }
    }
    stopSession(sessionId) {
        try {
            const script = `
        tell application "iTerm"
          repeat with w in windows
            if name of w contains "${resolveSessionName(sessionId)}" then close w
          end repeat
        end tell
      `;
            execSync(`osascript -e '${script}'`, { stdio: "ignore" });
        }
        catch {
            // Ignore
        }
    }
    recoverMissingPanes(currentPanes) {
        return currentPanes;
    }
}
