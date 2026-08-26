import { execSync } from "child_process";
import type { ITerminalDriver, WorkspacePanes } from "./terminal-driver-interface.js";

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
            end tell
            create tab with default profile
            tell current tab
              set name to "ba"
            end tell
            create tab with default profile
            tell current tab
              set name to "developer"
            end tell
            create tab with default profile
            tell current tab
              set name to "qa"
            end tell
            create tab with default profile
            tell current tab
              set name to "reviewer"
            end tell
          ` : `
            tell current tab
              set orchSession to current session
              tell orchSession
                set baSession to (split horizontally with default profile)
              end tell
              tell baSession
                set devSession to (split vertically with default profile)
              end tell
              tell baSession
                set qaSession to (split horizontally with default profile)
              end tell
              tell devSession
                set revSession to (split horizontally with default profile)
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
      orchestrator: "iterm-0",
      ba: "iterm-1",
      developer: "iterm-2",
      qa: "iterm-3",
      reviewer: "iterm-4"
    };
  }

  public async sendPrompt(paneTarget: string, promptText: string, clear = false): Promise<void> {
    const escaped = promptText.replace(/"/g, '\\"');
    const script = `
      tell application "iTerm"
        tell current window
          tell current session
            write text "${escaped}"
          end tell
        end tell
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
