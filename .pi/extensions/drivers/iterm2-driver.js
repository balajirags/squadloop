import { execSync } from "child_process";
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
    hasActiveSession() {
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
        }
        catch {
            return false;
        }
    }
    setupTeamLayout(layout = "panes") {
        const isWindows = layout === "windows";
        const script = `
      tell application "iTerm"
        activate
        set newWindow to (create window with default profile)
        tell newWindow
          set name to "squadloop-workspace"
          ${isWindows ? `
            create tab with default profile
            create tab with default profile
            create tab with default profile
            create tab with default profile
          ` : `
            tell current session of current tab
              split vertically with default profile
              split horizontally with default profile
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
            orchestrator: "iterm-0",
            ba: "iterm-1",
            developer: "iterm-2",
            qa: "iterm-3",
            reviewer: "iterm-4"
        };
    }
    async sendPrompt(paneTarget, promptText, clear = false) {
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
        }
        catch {
            // Ignore
        }
    }
    attachSession() {
        try {
            execSync(`osascript -e 'tell application "iTerm" to activate'`, { stdio: "ignore" });
        }
        catch {
            // Ignore
        }
    }
    recoverMissingPanes(currentPanes) {
        return currentPanes;
    }
}
