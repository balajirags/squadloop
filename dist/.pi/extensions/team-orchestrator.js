import { registerTeamTools } from "./team-tools.js";
import { registerStatusBanner } from "./status-banner.js";
import { WorkspaceFactory } from "./workspaces/workspace-factory.js";
import * as fs from "fs";
import * as path from "path";
function getOrCreateConfig() {
    const configPath = path.join(process.cwd(), ".pi", "team-config.json");
    let config = {
        mode: "loop-hitl",
        layout: "panes",
        panes: { orchestrator: "", ba: "", developer: "", qa: "", reviewer: "" }
    };
    if (fs.existsSync(configPath)) {
        try {
            const loaded = JSON.parse(fs.readFileSync(configPath, "utf-8"));
            config = {
                mode: loaded.mode || "loop-hitl",
                layout: loaded.layout || "panes",
                workspaceMode: loaded.workspaceMode || "tmux",
                destructiveCommandPolicy: loaded.destructiveCommandPolicy || "ask-human",
                customProtectedFiles: loaded.customProtectedFiles || [],
                panes: loaded.panes || config.panes
            };
        }
        catch {
            // Use defaults on parse error
        }
    }
    return config;
}
function saveConfig(config) {
    const configPath = path.join(process.cwd(), ".pi", "team-config.json");
    fs.mkdirSync(path.dirname(configPath), { recursive: true });
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf-8");
}
export default function (pi) {
    registerTeamTools(pi);
    registerStatusBanner(pi);
    // Handler for fresh start
    const handleTeamStart = async (ctx) => {
        const config = getOrCreateConfig();
        let workspace;
        try {
            workspace = WorkspaceFactory.getAdapter(config.workspaceMode);
        }
        catch (err) {
            ctx.ui.notify(err.message, "error");
            console.error(err.message);
            return;
        }
        ctx.ui.notify(`Initializing SquadLoop [--mode=${config.mode}, --layout=${config.layout}, --workspace=${workspace.name}]...`, "info");
        const panes = workspace.setupLayout(config.layout);
        config.panes = panes;
        saveConfig(config);
        // Reset active-task.json to clean idle state
        const activeTaskPath = path.join(process.cwd(), ".pi", "active-task.json");
        fs.mkdirSync(path.dirname(activeTaskPath), { recursive: true });
        fs.writeFileSync(activeTaskPath, JSON.stringify({
            activeIssueId: "",
            status: "awaiting-human-input",
            updatedBy: "system",
            notes: "Fresh team session started. Awaiting human input in Pane 0.",
            timestamp: new Date().toISOString()
        }, null, 2), "utf-8");
        // Initial greeting prompt in Orchestrator: Display welcome menu and STOP
        const welcomePrompt = `==============================================================\n` +
            `🚀 SQUADLOOP ONLINE [--mode=${config.mode}, --layout=${config.layout}]\n` +
            `==============================================================\n` +
            `• BA (Pane 1)       : IDLE & READY\n` +
            `• Developer (Pane 2): IDLE & READY\n` +
            `• QA (Pane 3)       : IDLE & READY\n` +
            `• Reviewer (Pane 4) : IDLE & READY\n` +
            `==============================================================\n` +
            `Print the welcome banner and options (1. Implement BRD/PRD, 2. Pick a specific Story/Issue, 3. Random Implementation, 4. Custom Task/Bug Fix).\n` +
            `DO NOT call send_agent_message or start any work automatically. STOP IMMEDIATELY and wait for the human user in Pane 0 to enter their instruction.`;
        workspace.sendPrompt(panes.orchestrator, welcomePrompt, false);
        ctx.ui.notify(`SquadLoop setup complete via '${workspace.name}' [--mode=${config.mode}, --layout=${config.layout}].`, "info");
    };
    // Handler for session resume
    const handleTeamResume = async (ctx) => {
        const config = getOrCreateConfig();
        let workspace;
        try {
            workspace = WorkspaceFactory.getAdapter(config.workspaceMode);
        }
        catch (err) {
            ctx.ui.notify(err.message, "error");
            console.error(err.message);
            return;
        }
        // Read active-task.json if available
        const activeTaskPath = path.join(process.cwd(), ".pi", "active-task.json");
        let activeIssueId = "";
        let activeStatus = "awaiting-human-input";
        let activeNotes = "";
        if (fs.existsSync(activeTaskPath)) {
            try {
                const taskState = JSON.parse(fs.readFileSync(activeTaskPath, "utf-8"));
                activeIssueId = taskState.activeIssueId || "";
                activeStatus = taskState.status || "awaiting-human-input";
                activeNotes = taskState.notes || "";
            }
            catch {
                // Ignore parse error
            }
        }
        ctx.ui.notify(`Resuming SquadLoop [--mode=${config.mode}, --layout=${config.layout}, activeIssue=#${activeIssueId}]...`, "info");
        const panes = workspace.setupLayout(config.layout);
        config.panes = panes;
        saveConfig(config);
        // Resume prompt in Orchestrator Pane 0
        const resumePrompt = `Master Orchestrator RESUMED [--mode=${config.mode}, --layout=${config.layout}, --workspace=${workspace.name}]! ` +
            `Active task recovered from log: Issue #${activeIssueId || 'None'} (Status: '${activeStatus}'). Notes: '${activeNotes || 'N/A'}'. ` +
            `Print session recovery banner to user, state active task status, and ask the human user in Pane 0 how to proceed or continue.`;
        await workspace.sendPrompt(panes.orchestrator, resumePrompt, false);
        ctx.ui.notify(`SquadLoop session resumed via '${workspace.name}' [Issue #${activeIssueId || 'None'}, Status: ${activeStatus}].`, "info");
    };
    // Command 1: /squadloop-start
    pi.registerCommand("squadloop-start", {
        description: "Start a fresh SquadLoop session in tmux based on .pi/team-config.json",
        handler: async (_args, ctx) => {
            await handleTeamStart(ctx);
        }
    });
    // Command 2: /squadloop-resume
    pi.registerCommand("squadloop-resume", {
        description: "Resume active SquadLoop session from .pi/active-task.json log",
        handler: async (_args, ctx) => {
            await handleTeamResume(ctx);
        }
    });
    // Command 3: /squadloop-recover
    pi.registerCommand("squadloop-recover", {
        description: "Recover any closed agent pane or window in the active SquadLoop workspace",
        handler: async (_args, ctx) => {
            const configPath = path.join(process.cwd(), ".pi", "team-config.json");
            if (!fs.existsSync(configPath)) {
                ctx.ui.notify("Error: team-config.json not found. Run /squadloop-start first.", "error");
                return;
            }
            try {
                const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
                const workspace = WorkspaceFactory.getAdapter(config.workspaceMode);
                const recoveredPanes = workspace.recoverMissingPanes(config.panes);
                config.panes = recoveredPanes;
                saveConfig(config);
                ctx.ui.notify("Pane recovery check complete!", "info");
            }
            catch (err) {
                ctx.ui.notify(`Recovery failed: ${err.message}`, "error");
            }
        }
    });
}
