import { execSync, spawnSync } from "child_process";
import { getSessionName } from "../sessions/session-manager.js";
function resolveSessionName(sessionId) {
    return getSessionName(sessionId || process.env.SQUADLOOP_SESSION_ID || "default");
}
export class HerdrDriver {
    id = "herdr";
    name = "Herdr Terminal Driver";
    isAvailable() {
        try {
            execSync("herdr --version", { stdio: "ignore" });
            return true;
        }
        catch {
            return false;
        }
    }
    hasActiveSession(sessionId) {
        try {
            const res = execSync("herdr status 2>/dev/null").toString();
            return res.includes(resolveSessionName(sessionId));
        }
        catch {
            return false;
        }
    }
    setupTeamLayout(layout = "panes", sessionId) {
        const modeFlag = layout === "windows" ? "--tabs" : "--panes";
        const sessionName = resolveSessionName(sessionId);
        try {
            execSync(`herdr spawn ${sessionName} ${modeFlag} --roles orchestrator,ba,developer,qa,reviewer`, { stdio: "ignore" });
        }
        catch {
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
    async sendPrompt(paneTarget, promptText, clear = false) {
        try {
            const escaped = promptText.replace(/"/g, '\\"');
            execSync(`herdr send --target ${paneTarget} "${escaped}"`, { stdio: "ignore" });
        }
        catch {
            // Ignore
        }
    }
    attachSession(sessionId) {
        spawnSync("herdr", ["attach", resolveSessionName(sessionId)], { stdio: "inherit" });
    }
    stopSession(sessionId) {
        spawnSync("herdr", ["stop", resolveSessionName(sessionId)], { stdio: "inherit" });
    }
    recoverMissingPanes(currentPanes) {
        return currentPanes;
    }
}
