import { execSync } from "child_process";
import { ModelResolver } from "../models/model-resolver.js";
import { getSessionName, normalizeSessionId } from "../sessions/session-manager.js";
function cleanModelString(raw) {
    let val = raw.trim();
    if (val.includes("#")) {
        val = val.split("#")[0].trim();
    }
    return val.replace(/^["']|["']$/g, "").trim();
}
function cleanPaneId(raw) {
    const match = String(raw).match(/%[0-9]+/);
    return match ? match[0] : String(raw).trim().split("\n")[0];
}
function resolveRoleModel(role) {
    return ModelResolver.getModel(role);
}
function getSessionNameFor(sessionId) {
    return getSessionName(sessionId || process.env.SQUADLOOP_SESSION_ID || "default");
}
function getAgentCommand(role, sessionId) {
    const model = resolveRoleModel(role);
    const agentFile = `.squadloop/agents/${role}.md`;
    const modelFlag = model ? ` --model "${model}"` : "";
    const agentEnv = `env CONFIG_DIR_NAME=.squadloop PI_CODING_AGENT_DIR="$HOME/.squadloop/agent" SQUADLOOP_SESSION_ID="${normalizeSessionId(sessionId || process.env.SQUADLOOP_SESSION_ID || "default")}"`;
    return `${agentEnv} pi --approve --append-system-prompt "${agentFile}"${modelFlag}; exec bash`;
}
export class TmuxWorkspaceAdapter {
    name = "Tmux Workspace";
    isAvailable() {
        try {
            execSync("tmux -V", { stdio: "ignore" });
            return true;
        }
        catch {
            return false;
        }
    }
    setupLayout(layout = "panes", sessionId) {
        if (layout === "windows") {
            return this.setup5WindowLayout(sessionId);
        }
        return this.setup5PaneLayout(sessionId);
    }
    setup5PaneLayout(sessionId) {
        const sessionName = getSessionNameFor(sessionId);
        try {
            execSync(`tmux kill-session -t ${sessionName} 2>/dev/null`, { stdio: "ignore" });
        }
        catch {
            // Ignore
        }
        const rawOrch = execSync(`tmux new-session -d -s ${sessionName} -n team -P -F "#{pane_id}" "${getAgentCommand("orchestrator", sessionId)}"`).toString();
        const orchestratorPane = cleanPaneId(rawOrch);
        const rawBa = execSync(`tmux split-window -v -t ${orchestratorPane} -P -F "#{pane_id}" "${getAgentCommand("ba", sessionId)}"`).toString();
        const baPane = cleanPaneId(rawBa);
        const rawDev = execSync(`tmux split-window -h -t ${baPane} -P -F "#{pane_id}" "${getAgentCommand("developer", sessionId)}"`).toString();
        const devPane = cleanPaneId(rawDev);
        const rawQa = execSync(`tmux split-window -v -t ${baPane} -P -F "#{pane_id}" "${getAgentCommand("qa", sessionId)}"`).toString();
        const qaPane = cleanPaneId(rawQa);
        const rawRev = execSync(`tmux split-window -v -t ${devPane} -P -F "#{pane_id}" "${getAgentCommand("reviewer", sessionId)}"`).toString();
        const reviewerPane = cleanPaneId(rawRev);
        try {
            execSync(`tmux set-option -w -t ${sessionName} allow-rename off`);
            execSync(`tmux set-window-option -t ${sessionName} automatic-rename off`);
            execSync(`tmux set-window-option -t ${sessionName} pane-border-status top`);
            execSync(`tmux set-window-option -t ${sessionName} pane-border-style "fg=blue"`);
            execSync(`tmux set-window-option -t ${sessionName} pane-active-border-style "fg=green,bold"`);
            execSync(`tmux set-window-option -t ${sessionName} pane-border-format "#[fg=black,bg=cyan,bold] #{@persona} #[default]"`);
            execSync(`tmux set-window-option -g pane-border-status top`);
            execSync(`tmux set-window-option -g pane-border-format "#[fg=black,bg=cyan,bold] #{@persona} #[default]"`);
            execSync(`tmux set-option -p -t ${orchestratorPane} @persona "[ SQUADLOOP :: MASTER ORCHESTRATOR ]"`);
            execSync(`tmux set-option -p -t ${baPane} @persona "[ SQUADLOOP :: BUSINESS ANALYST (BA) ]"`);
            execSync(`tmux set-option -p -t ${devPane} @persona "[ SQUADLOOP :: DEVELOPER (DEV) ]"`);
            execSync(`tmux set-option -p -t ${qaPane} @persona "[ SQUADLOOP :: QUALITY ANALYST (QA) ]"`);
            execSync(`tmux set-option -p -t ${reviewerPane} @persona "[ SQUADLOOP :: CODE REVIEWER (REVIEWER) ]"`);
            execSync(`tmux resize-pane -t ${orchestratorPane} -y 25%`);
            execSync(`tmux set-option -t ${sessionName} status-style "bg=black,fg=cyan"`);
            execSync(`tmux set-option -t ${sessionName} status-left "#[fg=black,bg=green,bold] 🚀 SquadLoop #[default] "`);
            execSync(`tmux set-option -t ${sessionName} status-right "#[fg=cyan,bold] %Y-%m-%d %H:%M #[default]"`);
        }
        catch {
            // Non-fatal
        }
        return {
            orchestrator: orchestratorPane,
            ba: baPane,
            developer: devPane,
            qa: qaPane,
            reviewer: reviewerPane
        };
    }
    setup5WindowLayout(sessionId) {
        const sessionName = getSessionNameFor(sessionId);
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
        try {
            execSync(`tmux select-window -t ${sessionName}:0`);
        }
        catch {
            // Ignore
        }
        return {
            orchestrator: orchestratorPane,
            ba: baPane,
            developer: devPane,
            qa: qaPane,
            reviewer: reviewerPane
        };
    }
    recoverMissingPanes(currentPanes, _sessionId) {
        return currentPanes;
    }
    async sendPrompt(paneTarget, promptText, clear = true) {
        try {
            if (clear) {
                execSync(`tmux send-keys -t ${paneTarget} "/clear" Enter`, { stdio: "ignore" });
                await new Promise(resolve => setTimeout(resolve, 1500));
            }
            const escaped = promptText.replace(/"/g, '\\"');
            execSync(`tmux send-keys -t ${paneTarget} "${escaped}" Enter`, { stdio: "ignore" });
        }
        catch {
            // Ignore if tmux session not attached
        }
    }
    startAppServerWindow(startCommand) {
        const sessionName = getSessionNameFor();
        const windowName = "app-server";
        try {
            const windows = execSync(`tmux list-windows -t ${sessionName} -F "#{window_name}"`).toString();
            if (windows.includes(windowName)) {
                return `${sessionName}:app-server`;
            }
            const cmd = startCommand || "echo '=== APP SERVER WINDOW ==='; exec bash";
            execSync(`tmux new-window -t ${sessionName} -n ${windowName} "${cmd.replace(/"/g, '\\"')}"`);
            return `${sessionName}:${windowName}`;
        }
        catch {
            return `${sessionName}:0`;
        }
    }
}
