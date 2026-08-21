import { execSync } from "child_process";

export interface TmuxPaneMap {
  orchestrator: string; // Top Pane
  ba: string;           // Bottom Left Top
  developer: string;    // Bottom Right Top
  qa: string;           // Bottom Left Bottom
  reviewer: string;     // Bottom Right Bottom
}

export class TmuxManager {
  private sessionName = "pi-team";

  public isTmuxAvailable(): boolean {
    try {
      execSync("tmux -V", { stdio: "ignore" });
      return true;
    } catch {
      return false;
    }
  }

  public setup5PaneLayout(): TmuxPaneMap {
    // Kill existing session if present
    try {
      execSync(`tmux kill-session -t ${this.sessionName} 2>/dev/null`, { stdio: "ignore" });
    } catch {
      // Ignore if session didn't exist
    }

    // 1. Create session with Pane 0: Master Orchestrator Dashboard
    const orchestratorPane = execSync(
      `tmux new-session -d -s ${this.sessionName} -n team -P -F "#{pane_id}" "echo '=== MASTER ORCHESTRATOR DASHBOARD ==='; tail -f /dev/null"`
    ).toString().trim();

    // 2. Split bottom area for BA
    const baPane = execSync(
      `tmux split-window -v -t ${orchestratorPane} -P -F "#{pane_id}" "pi -a ba; exec bash"`
    ).toString().trim();

    // 3. Split bottom area horizontally for DEV
    const devPane = execSync(
      `tmux split-window -h -t ${baPane} -P -F "#{pane_id}" "pi -a developer; exec bash"`
    ).toString().trim();

    // 4. Split Left column vertically for QA
    const qaPane = execSync(
      `tmux split-window -v -t ${baPane} -P -F "#{pane_id}" "pi -a qa; exec bash"`
    ).toString().trim();

    // 5. Split Right column vertically for REVIEWER
    const reviewerPane = execSync(
      `tmux split-window -v -t ${devPane} -P -F "#{pane_id}" "pi -a reviewer; exec bash"`
    ).toString().trim();

    // 6. Resize Orchestrator top pane to 20% height
    execSync(`tmux resize-pane -t ${orchestratorPane} -y 20%`);

    return {
      orchestrator: orchestratorPane,
      ba: baPane,
      developer: devPane,
      qa: qaPane,
      reviewer: reviewerPane
    };
  }

  public sendPromptToPane(paneTarget: string, promptText: string): void {
    const escaped = promptText.replace(/"/g, '\\"');
    execSync(`tmux send-keys -t ${paneTarget} "${escaped}" Enter`);
  }
}
