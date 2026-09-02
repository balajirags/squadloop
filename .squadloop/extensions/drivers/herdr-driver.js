import { execSync, spawnSync } from "child_process";
import { ModelResolver } from "../models/model-resolver.js";
import { getSessionName, normalizeSessionId } from "../sessions/session-manager.js";
function getAgentCommand(role, sessionId) {
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
    setupTeamLayout(layout = "windows", sessionId) {
        const modeFlag = layout === "windows" ? "--tabs" : "--panes";
        const sessionName = resolveSessionName(sessionId);
        const roles = ["orchestrator", "ba", "developer", "qa", "reviewer"];
        const cmdFlags = roles.map(role => `--role-${role}-cmd "${getAgentCommand(role, sessionId)}"`).join(" ");
        try {
            execSync(`herdr spawn ${sessionName} ${modeFlag} --roles ${roles.join(",")} ${cmdFlags}`, { stdio: "ignore" });
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
