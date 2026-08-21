import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

export interface ActiveTaskState {
  activeIssueId: string;
  status: "ba-in-progress" | "ready-for-dev" | "dev-in-progress" | "qa-verifying" | "code-review" | "done" | "dev-rework";
  updatedBy: string;
  notes?: string;
  timestamp: string;
}

export function registerBacklogTool(pi: ExtensionAPI) {
  pi.registerTool({
    name: "team_update_status",
    label: "Team Update Status",
    description: "Update the status of the current active development task/issue across the agent team",
    parameters: Type.Object({
      issueId: Type.String({ description: "Target GitHub Issue / Jira Ticket ID / Story path" }),
      newStatus: Type.Union([
        Type.Literal("ready-for-dev"),
        Type.Literal("qa-verifying"),
        Type.Literal("code-review"),
        Type.Literal("done"),
        Type.Literal("dev-rework")
      ], { description: "New lifecycle status" }),
      notes: Type.Optional(Type.String({ description: "Summary of actions taken or feedback" }))
    }),
    async execute(toolCallId, params, signal, onUpdate, ctx) {
      const activeTaskPath = path.join(process.cwd(), ".pi", "active-task.json");
      fs.mkdirSync(path.dirname(activeTaskPath), { recursive: true });

      const state: ActiveTaskState = {
        activeIssueId: params.issueId,
        status: params.newStatus as ActiveTaskState["status"],
        updatedBy: ctx.cwd || "agent",
        notes: params.notes,
        timestamp: new Date().toISOString()
      };

      fs.writeFileSync(activeTaskPath, JSON.stringify(state, null, 2), "utf-8");

      // Read team-config.json if available
      const configPath = path.join(process.cwd(), ".pi", "team-config.json");
      if (fs.existsSync(configPath)) {
        try {
          const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
          const mode = config.mode || "step-hitl";
          const panes = config.panes;

          if (panes) {
            // Send event notification to Master Orchestrator (Pane 0)
            const notifyMsg = `EVENT: Task #${params.issueId} updated to '${params.newStatus}' by ${params.notes ? params.notes : "subagent"}.`;
            try {
              execSync(`tmux send-keys -t ${panes.orchestrator} "${notifyMsg.replace(/"/g, '\\"')}" Enter`, { stdio: "ignore" });
            } catch {
              // Ignore if tmux session not attached
            }

            // Auto-steer next subagent pane if in loop-hitl or auto mode
            if (mode === "loop-hitl" || mode === "auto") {
              if (params.newStatus === "ready-for-dev") {
                const prompt = `Issue #${params.issueId} is ready for development. Read project-context.md, checkout branch feature/issue-${params.issueId}, implement code inside backend/ or frontend/, run tests & verify coverage, commit, push, and update status to 'qa-verifying'.`;
                execSync(`tmux send-keys -t ${panes.developer} "${prompt.replace(/"/g, '\\"')}" Enter`, { stdio: "ignore" });
              } else if (params.newStatus === "qa-verifying") {
                const prompt = `Issue #${params.issueId} is ready for QA verification. Checkout feature branch, start running the backend/frontend app locally on its port, execute live HTTP/UI AC checks, and update status.`;
                execSync(`tmux send-keys -t ${panes.qa} "${prompt.replace(/"/g, '\\"')}" Enter`, { stdio: "ignore" });
              } else if (params.newStatus === "code-review") {
                const prompt = `Issue #${params.issueId} is ready for Code Review. Inspect git diff vs main, verify P1/P2 standards, and update status.`;
                execSync(`tmux send-keys -t ${panes.reviewer} "${prompt.replace(/"/g, '\\"')}" Enter`, { stdio: "ignore" });
              } else if (params.newStatus === "dev-rework") {
                const prompt = `Issue #${params.issueId} requires rework. Read feedback notes, fix issues in backend/ or frontend/, re-run build-verify, commit, push, and update status to 'qa-verifying'.`;
                execSync(`tmux send-keys -t ${panes.developer} "${prompt.replace(/"/g, '\\"')}" Enter`, { stdio: "ignore" });
              } else if (params.newStatus === "done") {
                if (mode === "loop-hitl") {
                  const prompt = `Story #${params.issueId} is COMPLETE! [LOOP-HITL Checkpoint] Press Enter or type 'next' to start grooming/developing the next story in the backlog.`;
                  execSync(`tmux send-keys -t ${panes.orchestrator} "${prompt.replace(/"/g, '\\"')}" Enter`, { stdio: "ignore" });
                } else if (mode === "auto") {
                  const prompt = `Story #${params.issueId} is COMPLETE! Auto-picking next story from backlog for BA grooming.`;
                  execSync(`tmux send-keys -t ${panes.ba} "${prompt.replace(/"/g, '\\"')}" Enter`, { stdio: "ignore" });
                }
              }
            }
          }
        } catch {
          // Ignore parse errors
        }
      }

      return {
        content: [{ type: "text", text: `Updated task #${params.issueId} status to '${params.newStatus}'` }],
        details: state
      };
    }
  });
}
