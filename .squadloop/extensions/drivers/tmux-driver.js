import { execSync, spawnSync } from "child_process";
import { ModelResolver } from "../models/model-resolver.js";
import { getSessionName, normalizeSessionId } from "../sessions/session-manager.js";
function cleanPaneId(raw) {
    const match = String(raw).match(/%[0-9]+/);
    return match ? match[0] : String(raw).trim().split("\n")[0];
}
function getAgentCommand(role, sessionId) {
    const model = ModelResolver.getModel(role);
    const agentFile = `.squadloop/agents/${role}.md`;
    const modelFlag = model ? ` --model "${model}"` : "";
    const agentEnv = `env CONFIG_DIR_NAME=.squadloop PI_CODING_AGENT_DIR="$HOME/.squadloop/agent" SQUADLOOP_SESSION_ID="${normalizeSessionId(sessionId || process.env.SQUADLOOP_SESSION_ID || "default")}"`;
    return `${agentEnv} pi --approve --append-system-prompt "${agentFile}"${modelFlag}; exec bash`;
}
function resolveSessionName(sessionId) {
    return getSessionName(sessionId || process.env.SQUADLOOP_SESSION_ID || "default");
}
export class TmuxDriver {
    id = "tmux";
    name = "Tmux Terminal Driver";
    isAvailable() {
        try {
            execSync("tmux -V", { stdio: "ignore" });
            return true;
        }
        catch {
            return false;
        }
    }
    hasActiveSession(sessionId) {
        const sessionName = resolveSessionName(sessionId);
        return spawnSync("tmux", ["has-session", "-t", sessionName], { stdio: "ignore" }).status === 0;
    }
    setupTeamLayout(layout = "panes", sessionId) {
        if (layout === "windows") {
            return this.setup5WindowLayout(sessionId);
        }
        return this.setup5PaneLayout(sessionId);
    }
    setup5PaneLayout(sessionId) {
        const sessionName = resolveSessionName(sessionId);
        try {
            execSync(`tmux kill-session -t ${sessionName} 2>/dev/null`, { stdio: "ignore" });
        }
        catch {
            // Ignore
        }
        const orchestratorPane = cleanPaneId(execSync(`tmux new-session -d -s ${sessionName} -n team -P -F "#{pane_id}" "${getAgentCommand("orchestrator", sessionId)}"`).toString());
        const baPane = cleanPaneId(execSync(`tmux split-window -v -t ${orchestratorPane} -P -F "#{pane_id}" "${getAgentCommand("ba", sessionId)}"`).toString());
        const devPane = cleanPaneId(execSync(`tmux split-window -h -t ${baPane} -P -F "#{pane_id}" "${getAgentCommand("developer", sessionId)}"`).toString());
        const qaPane = cleanPaneId(execSync(`tmux split-window -v -t ${baPane} -P -F "#{pane_id}" "${getAgentCommand("qa", sessionId)}"`).toString());
        const reviewerPane = cleanPaneId(execSync(`tmux split-window -v -t ${devPane} -P -F "#{pane_id}" "${getAgentCommand("reviewer", sessionId)}"`).toString());
        try {
            execSync(`tmux set-option -p -t ${orchestratorPane} @persona "[ SQUADLOOP :: MASTER ORCHESTRATOR ]"`);
            execSync(`tmux set-option -p -t ${baPane} @persona "[ SQUADLOOP :: BUSINESS ANALYST (BA) ]"`);
            execSync(`tmux set-option -p -t ${devPane} @persona "[ SQUADLOOP :: DEVELOPER (DEV) ]"`);
            execSync(`tmux set-option -p -t ${qaPane} @persona "[ SQUADLOOP :: QUALITY ANALYST (QA) ]"`);
            execSync(`tmux set-option -p -t ${reviewerPane} @persona "[ SQUADLOOP :: CODE REVIEWER (REVIEWER) ]"`);
        }
        catch {
            // Non-fatal
        }
        return { orchestrator: orchestratorPane, ba: baPane, developer: devPane, qa: qaPane, reviewer: reviewerPane };
    }
    setup5WindowLayout(sessionId) {
        const sessionName = resolveSessionName(sessionId);
        try {
            execSync(`tmux kill-session -t ${sessionName} 2>/dev/null`, { stdio: "ignore" });
        }
        catch {
            // Ignore
        }
        const orchestratorPane = cleanPaneId(execSync(`tmux new-session -d -s ${sessionName} -n orchestrator -P -F "#{pane_id}" "${getAgentCommand("orchestrator", sessionId)}"`).toString());
        const baPane = cleanPaneId(execSync(`tmux new-window -t ${sessionName} -n ba -P -F "#{pane_id}" "${getAgentCommand("ba", sessionId)}"`).toString());
        const devPane = cleanPaneId(execSync(`tmux new-window -t ${sessionName} -n developer -P -F "#{pane_id}" "${getAgentCommand("developer", sessionId)}"`).toString());
        const qaPane = cleanPaneId(execSync(`tmux new-window -t ${sessionName} -n qa -P -F "#{pane_id}" "${getAgentCommand("qa", sessionId)}"`).toString());
        const reviewerPane = cleanPaneId(execSync(`tmux new-window -t ${sessionName} -n reviewer -P -F "#{pane_id}" "${getAgentCommand("reviewer", sessionId)}"`).toString());
        return { orchestrator: orchestratorPane, ba: baPane, developer: devPane, qa: qaPane, reviewer: reviewerPane };
    }
    async sendPrompt(paneTarget, promptText, clear = true) {
        try {
            if (clear) {
                spawnSync("tmux", ["send-keys", "-t", paneTarget, "/clear", "Enter"]);
                await new Promise(resolve => setTimeout(resolve, 500));
            }
            spawnSync("tmux", ["send-keys", "-t", paneTarget, promptText, "Enter"]);
        }
        catch {
            // Ignore
        }
    }
    attachSession(sessionId) {
        const sessionName = resolveSessionName(sessionId);
        const inTmux = Boolean(process.env.TMUX) || spawnSync("tmux", ["display-message"], { stdio: "ignore" }).status === 0;
        if (inTmux) {
            try {
                spawnSync("tmux", ["switch-client", "-t", sessionName], { stdio: "inherit" });
                return;
            }
            catch {
                // Fallback
            }
        }
        const env = { ...process.env };
        delete env.TMUX;
        spawnSync("tmux", ["attach", "-t", sessionName], { stdio: "inherit", env });
    }
    stopSession(sessionId) {
        const sessionName = resolveSessionName(sessionId);
        spawnSync("tmux", ["kill-session", "-t", sessionName], { stdio: "inherit" });
    }
    recoverMissingPanes(currentPanes) {
        return currentPanes;
    }
}
