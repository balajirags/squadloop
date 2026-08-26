import { execSync, spawnSync } from "child_process";
function cleanPaneId(raw) {
    const match = String(raw).match(/%[0-9]+/);
    return match ? match[0] : String(raw).trim().split("\n")[0];
}
function getAgentCommand(role) {
    const agentFile = `.pi/agents/${role}.md`;
    return `pi --approve --append-system-prompt "${agentFile}"; exec bash`;
}
export class TmuxDriver {
    id = "tmux";
    name = "Tmux Terminal Driver";
    sessionName = "squadloop-workspace";
    isAvailable() {
        try {
            execSync("tmux -V", { stdio: "ignore" });
            return true;
        }
        catch {
            return false;
        }
    }
    hasActiveSession() {
        return spawnSync("tmux", ["has-session", "-t", this.sessionName], { stdio: "ignore" }).status === 0;
    }
    setupTeamLayout(layout = "panes") {
        if (layout === "windows") {
            return this.setup5WindowLayout();
        }
        return this.setup5PaneLayout();
    }
    setup5PaneLayout() {
        try {
            execSync(`tmux kill-session -t ${this.sessionName} 2>/dev/null`, { stdio: "ignore" });
        }
        catch {
            // Ignore
        }
        const orchestratorPane = cleanPaneId(execSync(`tmux new-session -d -s ${this.sessionName} -n team -P -F "#{pane_id}" "${getAgentCommand("orchestrator")}"`).toString());
        const baPane = cleanPaneId(execSync(`tmux split-window -v -t ${orchestratorPane} -P -F "#{pane_id}" "${getAgentCommand("ba")}"`).toString());
        const devPane = cleanPaneId(execSync(`tmux split-window -h -t ${baPane} -P -F "#{pane_id}" "${getAgentCommand("developer")}"`).toString());
        const qaPane = cleanPaneId(execSync(`tmux split-window -v -t ${baPane} -P -F "#{pane_id}" "${getAgentCommand("qa")}"`).toString());
        const reviewerPane = cleanPaneId(execSync(`tmux split-window -v -t ${devPane} -P -F "#{pane_id}" "${getAgentCommand("reviewer")}"`).toString());
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
    setup5WindowLayout() {
        try {
            execSync(`tmux kill-session -t ${this.sessionName} 2>/dev/null`, { stdio: "ignore" });
        }
        catch {
            // Ignore
        }
        const orchestratorPane = cleanPaneId(execSync(`tmux new-session -d -s ${this.sessionName} -n orchestrator -P -F "#{pane_id}" "${getAgentCommand("orchestrator")}"`).toString());
        const baPane = cleanPaneId(execSync(`tmux new-window -t ${this.sessionName} -n ba -P -F "#{pane_id}" "${getAgentCommand("ba")}"`).toString());
        const devPane = cleanPaneId(execSync(`tmux new-window -t ${this.sessionName} -n developer -P -F "#{pane_id}" "${getAgentCommand("developer")}"`).toString());
        const qaPane = cleanPaneId(execSync(`tmux new-window -t ${this.sessionName} -n qa -P -F "#{pane_id}" "${getAgentCommand("qa")}"`).toString());
        const reviewerPane = cleanPaneId(execSync(`tmux new-window -t ${this.sessionName} -n reviewer -P -F "#{pane_id}" "${getAgentCommand("reviewer")}"`).toString());
        return { orchestrator: orchestratorPane, ba: baPane, developer: devPane, qa: qaPane, reviewer: reviewerPane };
    }
    async sendPrompt(paneTarget, promptText, clear = true) {
        try {
            if (clear) {
                execSync(`tmux send-keys -t ${paneTarget} "/clear" Enter`, { stdio: "ignore" });
                await new Promise(resolve => setTimeout(resolve, 500));
            }
            const escaped = promptText.replace(/"/g, '\\"');
            execSync(`tmux send-keys -t ${paneTarget} "${escaped}" Enter`, { stdio: "ignore" });
        }
        catch {
            // Ignore
        }
    }
    attachSession() {
        const inTmux = Boolean(process.env.TMUX) || spawnSync("tmux", ["display-message"], { stdio: "ignore" }).status === 0;
        if (inTmux) {
            try {
                spawnSync("tmux", ["switch-client", "-t", this.sessionName], { stdio: "inherit" });
                return;
            }
            catch {
                // Fallback
            }
        }
        const env = { ...process.env };
        delete env.TMUX;
        spawnSync("tmux", ["attach", "-t", this.sessionName], { stdio: "inherit", env });
    }
    recoverMissingPanes(currentPanes) {
        return currentPanes;
    }
}
