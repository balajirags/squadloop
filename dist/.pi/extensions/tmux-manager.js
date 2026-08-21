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
        // Kill existing session if present
        try {
            execSync(`tmux kill-session -t ${this.sessionName} 2>/dev/null`, { stdio: "ignore" });
        }
        catch {
            // Ignore if session didn't exist
        }
        // 1. Create session with Pane 0: Master Orchestrator Pi Agent
        const orchestratorPane = execSync(`tmux new-session -d -s ${this.sessionName} -n team -P -F "#{pane_id}" "pi -a orchestrator; exec bash"`).toString().trim();
        // 2. Split bottom area for BA
        const baPane = execSync(`tmux split-window -v -t ${orchestratorPane} -P -F "#{pane_id}" "pi -a ba; exec bash"`).toString().trim();
        // 3. Split bottom area horizontally for DEV
        const devPane = execSync(`tmux split-window -h -t ${baPane} -P -F "#{pane_id}" "pi -a developer; exec bash"`).toString().trim();
        // 4. Split Left column vertically for QA
        const qaPane = execSync(`tmux split-window -v -t ${baPane} -P -F "#{pane_id}" "pi -a qa; exec bash"`).toString().trim();
        // 5. Split Right column vertically for REVIEWER
        const reviewerPane = execSync(`tmux split-window -v -t ${devPane} -P -F "#{pane_id}" "pi -a reviewer; exec bash"`).toString().trim();
        // 6. Resize Orchestrator top pane to 25% height
        execSync(`tmux resize-pane -t ${orchestratorPane} -y 25%`);
        return {
            orchestrator: orchestratorPane,
            ba: baPane,
            developer: devPane,
            qa: qaPane,
            reviewer: reviewerPane
        };
    }
    sendPromptToPane(paneTarget, promptText) {
        const escaped = promptText.replace(/"/g, '\\"');
        execSync(`tmux send-keys -t ${paneTarget} "${escaped}" Enter`);
    }
}
