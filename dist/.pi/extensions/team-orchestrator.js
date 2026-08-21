import { registerBacklogTool } from "./backlog-tool.js";
import { registerStatusBanner } from "./status-banner.js";
import { TmuxManager } from "./tmux-manager.js";
import * as fs from "fs";
import * as path from "path";
export default function (pi) {
    registerBacklogTool(pi);
    registerStatusBanner(pi);
    const tmux = new TmuxManager();
    pi.registerCommand("team-dev", {
        description: "Launch multi-agent team workflow in tmux (Master Orchestrator, BA, Dev, QA, Reviewer)",
        handler: async (args, ctx) => {
            if (!tmux.isTmuxAvailable()) {
                ctx.ui.notify("Error: tmux is required to run multi-agent team mode.", "error");
                return;
            }
            // Flexible Mode Parsing:
            // Accepts: --loop, --auto, --step
            // Accepts: --team-mode=loop|auto|step, --workflow=loop|auto|step, --mode=loop|auto|step
            // Accepts: loop, auto, step
            let mode = "step-hitl";
            const argStr = args?.toLowerCase() || "";
            if (argStr.includes("auto") || argStr.includes("--auto") || argStr.includes("mode=auto")) {
                mode = "auto";
            }
            else if (argStr.includes("loop") || argStr.includes("--loop") || argStr.includes("mode=loop")) {
                mode = "loop-hitl";
            }
            else if (argStr.includes("step") || argStr.includes("--step") || argStr.includes("mode=step")) {
                mode = "step-hitl";
            }
            ctx.ui.notify(`Initializing Pi Agent Team [Workflow Mode: ${mode}]...`, "info");
            const panes = tmux.setup5PaneLayout();
            // Write team-config.json so backlog tool can auto-steer transitions across panes
            const configPath = path.join(process.cwd(), ".pi", "team-config.json");
            fs.mkdirSync(path.dirname(configPath), { recursive: true });
            const teamConfig = { mode, panes };
            fs.writeFileSync(configPath, JSON.stringify(teamConfig, null, 2), "utf-8");
            // Trigger initial prompt in Orchestrator Pane 0
            tmux.sendPromptToPane(panes.orchestrator, `Start multi-agent team in workflow mode '${mode}'. Inspect project-context.md, verify Delivery Tracker setting, and instruct BA in Pane 1 to begin PRD grooming.`);
            ctx.ui.notify(`Team setup complete in 5-pane tmux session 'pi-team' [Mode: ${mode}]. Attach with: tmux attach -t pi-team`, "info");
        }
    });
}
