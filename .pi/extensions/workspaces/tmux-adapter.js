import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
function cleanModelString(raw) {
    let val = raw.trim();
    if (val.includes("#")) {
        val = val.split("#")[0].trim();
    }
    return val.replace(/^["']|["']$/g, "").trim();
}
function resolveRoleModel(role) {
    // 1. Check .pi/team-config.json models
    const configPath = path.join(process.cwd(), ".pi", "team-config.json");
    if (fs.existsSync(configPath)) {
        try {
            const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
            if (config.models?.[role]) {
                const cleaned = cleanModelString(config.models[role]);
                if (cleaned)
                    return cleaned;
            }
        }
        catch {
            // Ignore
        }
    }
    // 2. Check .pi/models.json
    const modelsJsonPath = path.join(process.cwd(), ".pi", "models.json");
    if (fs.existsSync(modelsJsonPath)) {
        try {
            const modelsData = JSON.parse(fs.readFileSync(modelsJsonPath, "utf-8"));
            const rawModel = modelsData.models?.[role] || modelsData[role];
            if (rawModel && typeof rawModel === "string") {
                const cleaned = cleanModelString(rawModel);
                if (cleaned)
                    return cleaned;
            }
        }
        catch {
            // Ignore
        }
    }
    // 3. Check .pi/agents/<role>.md frontmatter for model:
    const agentPath = path.join(process.cwd(), ".pi", "agents", `${role}.md`);
    if (fs.existsSync(agentPath)) {
        try {
            const content = fs.readFileSync(agentPath, "utf-8");
            const match = content.match(/^(?!\s*#)\s*model:\s*(.+)$/m);
            if (match && match[1]) {
                const cleaned = cleanModelString(match[1]);
                if (cleaned)
                    return cleaned;
            }
        }
        catch {
            // Ignore
        }
    }
    return null;
}
function getAgentCommand(role) {
    const model = resolveRoleModel(role);
    if (model) {
        return `pi -a ${role} --model "${model}"; exec bash`;
    }
    return `pi -a ${role}; exec bash`;
}
export class TmuxWorkspaceAdapter {
    name = "Tmux Workspace";
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
    setupLayout(layout = "panes") {
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
        const orchestratorPane = execSync(`tmux new-session -d -s ${this.sessionName} -n team -P -F "#{pane_id}" "${getAgentCommand("orchestrator")}"`).toString().trim();
        const baPane = execSync(`tmux split-window -v -t ${orchestratorPane} -P -F "#{pane_id}" "${getAgentCommand("ba")}"`).toString().trim();
        const devPane = execSync(`tmux split-window -h -t ${baPane} -P -F "#{pane_id}" "${getAgentCommand("developer")}"`).toString().trim();
        const qaPane = execSync(`tmux split-window -v -t ${baPane} -P -F "#{pane_id}" "${getAgentCommand("qa")}"`).toString().trim();
        const reviewerPane = execSync(`tmux split-window -v -t ${devPane} -P -F "#{pane_id}" "${getAgentCommand("reviewer")}"`).toString().trim();
        try {
            execSync(`tmux set-option -w -t ${this.sessionName} allow-rename off`);
            execSync(`tmux set-window-option -t ${this.sessionName} automatic-rename off`);
            execSync(`tmux set-window-option -t ${this.sessionName} pane-border-status top`);
            execSync(`tmux set-window-option -t ${this.sessionName} pane-border-style "fg=blue"`);
            execSync(`tmux set-window-option -t ${this.sessionName} pane-active-border-style "fg=green,bold"`);
            execSync(`tmux set-window-option -t ${this.sessionName} pane-border-format "#[fg=black,bg=cyan,bold] #{@persona} #[default]"`);
            execSync(`tmux set-window-option -g pane-border-status top`);
            execSync(`tmux set-window-option -g pane-border-format "#[fg=black,bg=cyan,bold] #{@persona} #[default]"`);
            execSync(`tmux set-option -p -t ${orchestratorPane} @persona "[ SQUADLOOP :: MASTER ORCHESTRATOR ]"`);
            execSync(`tmux set-option -p -t ${baPane} @persona "[ SQUADLOOP :: BUSINESS ANALYST (BA) ]"`);
            execSync(`tmux set-option -p -t ${devPane} @persona "[ SQUADLOOP :: DEVELOPER (DEV) ]"`);
            execSync(`tmux set-option -p -t ${qaPane} @persona "[ SQUADLOOP :: QUALITY ANALYST (QA) ]"`);
            execSync(`tmux set-option -p -t ${reviewerPane} @persona "[ SQUADLOOP :: CODE REVIEWER (REVIEWER) ]"`);
            execSync(`tmux resize-pane -t ${orchestratorPane} -y 25%`);
            execSync(`tmux set-option -t ${this.sessionName} status-style "bg=black,fg=cyan"`);
            execSync(`tmux set-option -t ${this.sessionName} status-left "#[fg=black,bg=green,bold] 🚀 SquadLoop #[default] "`);
            execSync(`tmux set-option -t ${this.sessionName} status-right "#[fg=cyan,bold] %Y-%m-%d %H:%M #[default]"`);
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
    setup5WindowLayout() {
        try {
            execSync(`tmux kill-session -t ${this.sessionName} 2>/dev/null`, { stdio: "ignore" });
        }
        catch {
            // Ignore
        }
        const orchestratorPane = execSync(`tmux new-session -d -s ${this.sessionName} -n orchestrator -P -F "#{pane_id}" "${getAgentCommand("orchestrator")}"`).toString().trim();
        const baPane = execSync(`tmux new-window -t ${this.sessionName} -n ba -P -F "#{pane_id}" "${getAgentCommand("ba")}"`).toString().trim();
        const devPane = execSync(`tmux new-window -t ${this.sessionName} -n developer -P -F "#{pane_id}" "${getAgentCommand("developer")}"`).toString().trim();
        const qaPane = execSync(`tmux new-window -t ${this.sessionName} -n qa -P -F "#{pane_id}" "${getAgentCommand("qa")}"`).toString().trim();
        const reviewerPane = execSync(`tmux new-window -t ${this.sessionName} -n reviewer -P -F "#{pane_id}" "${getAgentCommand("reviewer")}"`).toString().trim();
        try {
            execSync(`tmux select-window -t ${this.sessionName}:0`);
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
        const windowName = "app-server";
        try {
            const windows = execSync(`tmux list-windows -t ${this.sessionName} -F "#{window_name}"`).toString();
            if (windows.includes(windowName)) {
                return `${this.sessionName}:app-server`;
            }
            const cmd = startCommand || "echo '=== APP SERVER WINDOW ==='; exec bash";
            execSync(`tmux new-window -t ${this.sessionName} -n ${windowName} "${cmd.replace(/"/g, '\\"')}"`);
            return `${this.sessionName}:${windowName}`;
        }
        catch {
            return `${this.sessionName}:0`;
        }
    }
    recoverMissingPanes(currentPanes) {
        try {
            const livePanes = execSync(`tmux list-panes -a -t ${this.sessionName} -F "#{pane_id}"`).toString();
            const updated = { ...currentPanes };
            if (!livePanes.includes(currentPanes.ba)) {
                updated.ba = execSync(`tmux split-window -v -t ${currentPanes.orchestrator} -P -F "#{pane_id}" "${getAgentCommand("ba")}"`).toString().trim();
                execSync(`tmux set-option -p -t ${updated.ba} @persona "[ SQUADLOOP :: BUSINESS ANALYST (BA) ]"`);
            }
            if (!livePanes.includes(currentPanes.developer)) {
                updated.developer = execSync(`tmux split-window -h -t ${updated.ba} -P -F "#{pane_id}" "${getAgentCommand("developer")}"`).toString().trim();
                execSync(`tmux set-option -p -t ${updated.developer} @persona "[ SQUADLOOP :: DEVELOPER (DEV) ]"`);
            }
            if (!livePanes.includes(currentPanes.qa)) {
                updated.qa = execSync(`tmux split-window -v -t ${updated.ba} -P -F "#{pane_id}" "${getAgentCommand("qa")}"`).toString().trim();
                execSync(`tmux set-option -p -t ${updated.qa} @persona "[ SQUADLOOP :: QUALITY ANALYST (QA) ]"`);
            }
            if (!livePanes.includes(currentPanes.reviewer)) {
                updated.reviewer = execSync(`tmux split-window -v -t ${updated.developer} -P -F "#{pane_id}" "${getAgentCommand("reviewer")}"`).toString().trim();
                execSync(`tmux set-option -p -t ${updated.reviewer} @persona "[ SQUADLOOP :: CODE REVIEWER (REVIEWER) ]"`);
            }
            return updated;
        }
        catch {
            return currentPanes;
        }
    }
}
