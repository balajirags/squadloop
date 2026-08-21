import { execSync } from "child_process";
export class TmuxManager {
    sessionName = "pi-team";
    isTmuxAvailable() {
        try {
            execSync("tmux -V", { stdio: "ignore" });
            return true;
        }
        catch {
            return false;
        }
    }
    setup5PaneLayout() {
        // Top Pane 0: Master Orchestrator Dashboard
        execSync(`tmux new-session -d -s ${this.sessionName} -n team "echo '--- MASTER ORCHESTRATOR DASHBOARD ---'"`);
        // Split bottom area for subagents
        execSync(`tmux split-window -v -t ${this.sessionName}:0 "pi -a ba"`);
        execSync(`tmux split-window -h -t ${this.sessionName}:0.1 "pi -a developer"`);
        execSync(`tmux split-window -v -t ${this.sessionName}:0.1 "pi -a qa"`);
        execSync(`tmux split-window -v -t ${this.sessionName}:0.2 "pi -a reviewer"`);
        // Resize Orchestrator top pane to 20% height
        execSync(`tmux resize-pane -t ${this.sessionName}:0.0 -y 20%`);
        return {
            orchestrator: `${this.sessionName}:0.0`,
            ba: `${this.sessionName}:0.1`,
            developer: `${this.sessionName}:0.2`,
            qa: `${this.sessionName}:0.3`,
            reviewer: `${this.sessionName}:0.4`
        };
    }
    sendPromptToPane(paneTarget, promptText) {
        const escaped = promptText.replace(/"/g, '\\"');
        execSync(`tmux send-keys -t ${paneTarget} "${escaped}" Enter`);
    }
}
