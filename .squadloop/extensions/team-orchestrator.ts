import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { registerTeamTools } from "./team-tools.js";
import { registerStatusBanner } from "./status-banner.js";
import { WorkspaceFactory } from "./workspaces/workspace-factory.js";
import * as fs from "fs";
import * as path from "path";
import { getRuntimeSessionId, readActiveTask, writeActiveTask } from "./sessions/session-manager.js";

export interface TeamConfig {
  mode: "step-hitl" | "loop-hitl" | "auto";
  layout: "panes" | "windows";
  workspaceMode?: "tmux" | "regular";
  destructiveCommandPolicy?: "ask-human" | "block" | "allow";
  customProtectedFiles?: string[];
  panes: {
    orchestrator: string;
    ba: string;
    developer: string;
    qa: string;
    reviewer: string;
  };
}

function getOrCreateConfig(): TeamConfig {
  const configPath = path.join(process.cwd(), ".squadloop", "config.json");
  let config: TeamConfig = {
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
    } catch {
      // Use defaults on parse error
    }
  }

  return config;
}

function saveConfig(config: TeamConfig): void {
  const configPath = path.join(process.cwd(), ".squadloop", "config.json");
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf-8");
}

function syncSessionConfig(sessionId: string, panes: TeamConfig["panes"]): void {
  const activeTask = readActiveTask(sessionId);
  if (!activeTask) return;
  writeActiveTask(sessionId, {
    ...activeTask,
    panes,
    timestamp: new Date().toISOString()
  });
}

export default function (pi: ExtensionAPI) {
  registerTeamTools(pi);
  registerStatusBanner(pi);

  const handleTeamStart = async (ctx: any) => {
    const config = getOrCreateConfig();
    const sessionId = getRuntimeSessionId();
    let workspace;
    try {
      workspace = WorkspaceFactory.getAdapter(config.workspaceMode);
    } catch (err: any) {
      ctx.ui.notify(err.message, "error");
      console.error(err.message);
      return;
    }

    ctx.ui.notify(`Initializing SquadLoop [session=${sessionId}, --mode=${config.mode}, --layout=${config.layout}, --workspace=${workspace.name}]...`, "info");

    const panes = workspace.setupLayout(config.layout, sessionId);
    config.panes = panes;
    saveConfig(config);

    writeActiveTask(sessionId, {
      activeIssueId: "",
      status: "awaiting-human-input",
      updatedBy: "system",
      notes: "Fresh team session started. Awaiting human input in Pane 0.",
      timestamp: new Date().toISOString(),
      driver: config.workspaceMode || "tmux",
      panes
    });

    const welcomePrompt =
      `==============================================================\n` +
      `🚀 SQUADLOOP ONLINE [session=${sessionId}, --mode=${config.mode}, --layout=${config.layout}]\n` +
      `==============================================================\n` +
      `• BA (Pane 1)       : IDLE & READY\n` +
      `• Developer (Pane 2): IDLE & READY\n` +
      `• QA (Pane 3)       : IDLE & READY\n` +
      `• Reviewer (Pane 4) : IDLE & READY\n` +
      `==============================================================\n` +
      `Print the welcome banner and options (1. Implement BRD/PRD, 2. Pick a specific Story/Issue, 3. Random Implementation, 4. Custom Task/Bug Fix).\n` +
      `DO NOT call send_agent_message or start any work automatically. STOP IMMEDIATELY and wait for the human user in Pane 0 to enter their instruction.`;

    await workspace.sendPrompt(panes.orchestrator, welcomePrompt, false);
    syncSessionConfig(sessionId, panes);

    ctx.ui.notify(`SquadLoop setup complete via '${workspace.name}' [session=${sessionId}, --mode=${config.mode}, --layout=${config.layout}].`, "info");
  };

  const handleTeamResume = async (ctx: any) => {
    const config = getOrCreateConfig();
    const sessionId = getRuntimeSessionId();
    let workspace;
    try {
      workspace = WorkspaceFactory.getAdapter(config.workspaceMode);
    } catch (err: any) {
      ctx.ui.notify(err.message, "error");
      console.error(err.message);
      return;
    }

    const taskState = readActiveTask(sessionId);
    const activeIssueId = taskState?.activeIssueId || "";
    const activeStatus = taskState?.status || "awaiting-human-input";
    const activeNotes = taskState?.notes || "";

    ctx.ui.notify(`Resuming SquadLoop [session=${sessionId}, --mode=${config.mode}, --layout=${config.layout}, activeIssue=#${activeIssueId}]...`, "info");

    const panes = workspace.setupLayout(config.layout, sessionId);
    config.panes = panes;
    saveConfig(config);

    if (taskState) {
      writeActiveTask(sessionId, {
        ...taskState,
        panes,
        timestamp: new Date().toISOString()
      });
    } else {
      writeActiveTask(sessionId, {
        activeIssueId: "",
        status: "awaiting-human-input",
        updatedBy: "system",
        notes: "Resumed team session.",
        timestamp: new Date().toISOString(),
        driver: config.workspaceMode || "tmux",
        panes
      });
    }

    const resumePrompt = `Master Orchestrator RESUMED [session=${sessionId}, --mode=${config.mode}, --layout=${config.layout}, --workspace=${workspace.name}]! ` +
      `Active task recovered from log: Issue #${activeIssueId || 'None'} (Status: '${activeStatus}'). Notes: '${activeNotes || 'N/A'}'. ` +
      `Print session recovery banner to user, state active task status, and ask the human user in Pane 0 how to proceed or continue.`;

    await workspace.sendPrompt(panes.orchestrator, resumePrompt, false);

    ctx.ui.notify(`SquadLoop session resumed via '${workspace.name}' [session=${sessionId}, Issue #${activeIssueId || 'None'}, Status: ${activeStatus}].`, "info");
  };

  pi.registerCommand("squadloop-start", {
    description: "Start a fresh SquadLoop session in tmux based on .squadloop/config.json",
    handler: async (_args, ctx) => {
      await handleTeamStart(ctx);
    }
  });

  pi.registerCommand("squadloop-resume", {
    description: "Resume active SquadLoop session from .squadloop/active-task.json log",
    handler: async (_args, ctx) => {
      await handleTeamResume(ctx);
    }
  });

  pi.registerCommand("squadloop-recover", {
    description: "Recover any closed agent pane or window in the active SquadLoop workspace",
    handler: async (_args, ctx) => {
      const configPath = path.join(process.cwd(), ".squadloop", "config.json");
      if (!fs.existsSync(configPath)) {
        ctx.ui.notify("Error: config.json not found. Run /squadloop-start first.", "error");
        return;
      }

      try {
        const config: TeamConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
        const sessionId = getRuntimeSessionId();
        const workspace = WorkspaceFactory.getAdapter(config.workspaceMode);
        const recoveredPanes = workspace.recoverMissingPanes(config.panes, sessionId);
        config.panes = recoveredPanes;
        saveConfig(config);
        syncSessionConfig(sessionId, recoveredPanes);
        ctx.ui.notify("Pane recovery check complete!", "info");
      } catch (err: any) {
        ctx.ui.notify(`Recovery failed: ${err.message}`, "error");
      }
    }
  });
}
