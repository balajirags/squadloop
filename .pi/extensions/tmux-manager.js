import { execSync } from "child_process";
export class TmuxManager {
    sessionName = "squadloop-workspace";
    isTmuxAvailable() {
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
        // Kill existing session if present
        try {
            execSync(`tmux kill-session -t ${this.sessionName} 2>/dev/null`, { stdio: "ignore" });
        }
        catch {
            // Ignore if session didn't exist
        }
        // 1. Create Window 0 (team) with Pane 0: Master Orchestrator Pi Agent
        const orchestratorPane = execSync(`tmux new-session -d -s ${this.sessionName} -n team -P -F "#{pane_id}" "pi -a orchestrator; exec bash"`).toString().trim();
        // 2. Split bottom area for BA
        const baPane = execSync(`tmux split-window -v -t ${orchestratorPane} -P -F "#{pane_id}" "pi -a ba; exec bash"`).toString().trim();
        // 3. Split bottom area horizontally for DEV
        const devPane = execSync(`tmux split-window -h -t ${baPane} -P -F "#{pane_id}" "pi -a developer; exec bash"`).toString().trim();
        // 4. Split Left column vertically for QA
        const qaPane = execSync(`tmux split-window -v -t ${baPane} -P -F "#{pane_id}" "pi -a qa; exec bash"`).toString().trim();
        // 5. Split Right column vertically for REVIEWER
        const reviewerPane = execSync(`tmux split-window -v -t ${devPane} -P -F "#{pane_id}" "pi -a reviewer; exec bash"`).toString().trim();
        // Configure Pane Persona Titles & Border Styling
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
            // Resize Orchestrator top pane to 25% height
            execSync(`tmux resize-pane -t ${orchestratorPane} -y 25%`);
            // Bind instant Alt navigation shortcuts and status bar ticker
            this.configureErgonomics();
        }
        catch {
            // Non-fatal if styling fails
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
        // Kill existing session if present
        try {
            execSync(`tmux kill-session -t ${this.sessionName} 2>/dev/null`, { stdio: "ignore" });
        }
        catch {
            // Ignore
        }
        // Window 0: orchestrator
        const orchestratorPane = execSync(`tmux new-session -d -s ${this.sessionName} -n orchestrator -P -F "#{pane_id}" "pi -a orchestrator; exec bash"`).toString().trim();
        // Window 1: ba
        const baPane = execSync(`tmux new-window -t ${this.sessionName} -n ba -P -F "#{pane_id}" "pi -a ba; exec bash"`).toString().trim();
        // Window 2: developer
        const devPane = execSync(`tmux new-window -t ${this.sessionName} -n developer -P -F "#{pane_id}" "pi -a developer; exec bash"`).toString().trim();
        // Window 3: qa
        const qaPane = execSync(`tmux new-window -t ${this.sessionName} -n qa -P -F "#{pane_id}" "pi -a qa; exec bash"`).toString().trim();
        // Window 4: reviewer
        const reviewerPane = execSync(`tmux new-window -t ${this.sessionName} -n reviewer -P -F "#{pane_id}" "pi -a reviewer; exec bash"`).toString().trim();
        // Select window 0 (orchestrator)
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
    configureErgonomics() {
        try {
            // Bottom Status Ticker Bar (Scoped 100% to squadloop-workspace session)
            execSync(`tmux set-option -t ${this.sessionName} status-style "bg=black,fg=cyan"`);
            execSync(`tmux set-option -t ${this.sessionName} status-left "#[fg=black,bg=green,bold] 🚀 SquadLoop #[default] "`);
            execSync(`tmux set-option -t ${this.sessionName} status-right "#[fg=cyan,bold] %Y-%m-%d %H:%M #[default]"`);
        }
        catch {
            // Non-fatal
        }
    }
    // Create Window 1 for running the Application Server isolated
    startAppServerWindow(startCommand) {
        const windowName = "app-server";
        try {
            // Check if window already exists
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
    // Verify and recover any closed pane
    recoverMissingPanes(currentPanes) {
        try {
            const livePanes = execSync(`tmux list-panes -a -t ${this.sessionName} -F "#{pane_id}"`).toString();
            const updated = { ...currentPanes };
            if (!livePanes.includes(currentPanes.ba)) {
                updated.ba = execSync(`tmux split-window -v -t ${currentPanes.orchestrator} -P -F "#{pane_id}" "pi -a ba; exec bash"`).toString().trim();
                execSync(`tmux set-option -p -t ${updated.ba} @persona "[ SQUADLOOP :: BUSINESS ANALYST (BA) ]"`);
            }
            if (!livePanes.includes(currentPanes.developer)) {
                updated.developer = execSync(`tmux split-window -h -t ${updated.ba} -P -F "#{pane_id}" "pi -a developer; exec bash"`).toString().trim();
                execSync(`tmux set-option -p -t ${updated.developer} @persona "[ SQUADLOOP :: DEVELOPER (DEV) ]"`);
            }
            if (!livePanes.includes(currentPanes.qa)) {
                updated.qa = execSync(`tmux split-window -v -t ${updated.ba} -P -F "#{pane_id}" "pi -a qa; exec bash"`).toString().trim();
                execSync(`tmux set-option -p -t ${updated.qa} @persona "[ SQUADLOOP :: QUALITY ANALYST (QA) ]"`);
            }
            if (!livePanes.includes(currentPanes.reviewer)) {
                updated.reviewer = execSync(`tmux split-window -v -t ${updated.developer} -P -F "#{pane_id}" "pi -a reviewer; exec bash"`).toString().trim();
                execSync(`tmux set-option -p -t ${updated.reviewer} @persona "[ SQUADLOOP :: CODE REVIEWER (REVIEWER) ]"`);
            }
            return updated;
        }
        catch {
            return currentPanes;
        }
    }
    sendPromptToPane(paneTarget, promptText) {
        const escaped = promptText.replace(/"/g, '\\"');
        execSync(`tmux send-keys -t ${paneTarget} "${escaped}" Enter`);
    }
}
