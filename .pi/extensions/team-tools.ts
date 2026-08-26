import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { TrackerFactory } from "./trackers/tracker-factory.js";
import { WorkflowEngine } from "./workflow.js";
import { WorkspaceFactory } from "./workspaces/workspace-factory.js";
import { DriverFactory } from "./drivers/driver-factory.js";

export interface TokenStats {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
}

export interface ActiveTaskState {
  activeIssueId: string;
  status: "ba-in-progress" | "ready-for-dev" | "dev-in-progress" | "qa-verifying" | "code-review" | "done" | "dev-rework" | "loop-halted" | "circuit-breaker-tripped";
  updatedBy: string;
  notes?: string;
  reworkCount?: number;
  tokenStats?: TokenStats;
  timestamp: string;
}

function appendEventLog(eventRecord: any): void {
  try {
    const eventsPath = path.join(process.cwd(), ".pi", "events.jsonl");
    fs.mkdirSync(path.dirname(eventsPath), { recursive: true });

    let lines: string[] = [];
    if (fs.existsSync(eventsPath)) {
      lines = fs.readFileSync(eventsPath, "utf-8").trim().split("\n").filter(Boolean);
    }

    lines.push(JSON.stringify(eventRecord));

    // Cap at 1000 events max (auto-truncation log rotation) to prevent file bloat
    if (lines.length > 1000) {
      lines = lines.slice(-1000);
    }

    fs.writeFileSync(eventsPath, lines.join("\n") + "\n", "utf-8");
  } catch {
    // Ignore log write error
  }
}

export function registerTeamTools(pi: ExtensionAPI) {
  // Tool 1: team_update_status
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
      notes: Type.Optional(Type.String({ description: "Summary of actions taken or feedback" })),
      tokens: Type.Optional(Type.Object({
        promptTokens: Type.Optional(Type.Number({ description: "Prompt input tokens" })),
        completionTokens: Type.Optional(Type.Number({ description: "Completion output tokens" }))
      }))
    }),
    async execute(toolCallId, params, signal, onUpdate, ctx) {
      const activeTaskPath = path.join(process.cwd(), ".pi", "active-task.json");
      fs.mkdirSync(path.dirname(activeTaskPath), { recursive: true });

      // Read previous active-task state to track reworkCount and cumulative tokens
      let previousReworkCount = 0;
      let promptTokens = params.tokens?.promptTokens || 0;
      let completionTokens = params.tokens?.completionTokens || 0;

      if (fs.existsSync(activeTaskPath)) {
        try {
          const prevState: ActiveTaskState = JSON.parse(fs.readFileSync(activeTaskPath, "utf-8"));
          if (prevState.activeIssueId === params.issueId) {
            previousReworkCount = prevState.reworkCount || 0;
            if (prevState.tokenStats) {
              promptTokens += prevState.tokenStats.promptTokens || 0;
              completionTokens += prevState.tokenStats.completionTokens || 0;
            }
          }
        } catch {
          // Ignore
        }
      }

      // Estimate tokens if not provided (based on payload / prompt heuristic)
      if (promptTokens === 0 && completionTokens === 0) {
        const payloadLength = (params.notes?.length || 100) + (params.issueId?.length || 10);
        promptTokens = Math.ceil(payloadLength / 4) + 1800;
        completionTokens = Math.ceil(payloadLength / 4) + 400;
      }

      const totalTokens = promptTokens + completionTokens;
      const estimatedCostUsd = Number(((promptTokens * 0.0015 / 1000) + (completionTokens * 0.006 / 1000)).toFixed(4));

      const tokenStats: TokenStats = {
        promptTokens,
        completionTokens,
        totalTokens,
        estimatedCostUsd
      };

      let currentReworkCount = previousReworkCount;
      if (params.newStatus === "dev-rework") {
        currentReworkCount += 1;
      }

      const state: ActiveTaskState = {
        activeIssueId: params.issueId,
        status: params.newStatus as ActiveTaskState["status"],
        updatedBy: ctx.cwd || "agent",
        notes: params.notes,
        reworkCount: currentReworkCount,
        tokenStats,
        timestamp: new Date().toISOString()
      };

      // Check circuit breaker
      let circuitBreakerTripped = false;
      if (currentReworkCount > 3) {
        state.status = "circuit-breaker-tripped";
        circuitBreakerTripped = true;
      }

      fs.writeFileSync(activeTaskPath, JSON.stringify(state, null, 2), "utf-8");

      // Write structured JSON audit checkpoint
      if (params.issueId) {
        try {
          const checkpointDir = path.join(process.cwd(), "docs", "dev-checkpoints");
          fs.mkdirSync(checkpointDir, { recursive: true });
          const checkpointPath = path.join(checkpointDir, `${params.issueId}.json`);
          fs.writeFileSync(checkpointPath, JSON.stringify({
            storyId: params.issueId,
            status: state.status,
            updatedBy: state.updatedBy,
            notes: params.notes || "",
            reworkCount: currentReworkCount,
            timestamp: state.timestamp
          }, null, 2), "utf-8");
        } catch {
          // Ignore checkpoint write error
        }
      }

      // Read team-config.json if available
      const configPath = path.join(process.cwd(), ".pi", "team-config.json");
      if (fs.existsSync(configPath)) {
        try {
          const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
          const rawHitl = config.hitl || config.mode || "loop";
          const hitlMode = (rawHitl === "loop-hitl" ? "loop" : rawHitl === "step-hitl" ? "step" : rawHitl);
          const panes = config.panes;

          if (panes) {
            // Strategy-driven tracker closure using TrackerFactory when done
            if (params.newStatus === "done" && params.issueId) {
              try {
                const trackerAdapter = TrackerFactory.getAdapter();
                await trackerAdapter.closeIssue(params.issueId, "Completed and merged to main by SquadLoop");
              } catch {
                // Non-fatal if tracker close fails
              }

              // Send end-of-story summary card to Pane 0
              const summaryCard = `\n==============================================================\n` +
                `🎉 STORY #${params.issueId} COMPLETE & MERGED TO MAIN\n` +
                `==============================================================\n` +
                `• Active Issue      : #${params.issueId}\n` +
                `• Status            : done\n` +
                `• Notes             : ${params.notes || "PR merged successfully"}\n` +
                `• Total Tokens Used : ${tokenStats.totalTokens.toLocaleString()} tokens (Prompt: ${tokenStats.promptTokens.toLocaleString()} | Completion: ${tokenStats.completionTokens.toLocaleString()})\n` +
                `• Estimated Cost    : $${tokenStats.estimatedCostUsd} USD\n` +
                `• Audit Log         : docs/dev-checkpoints/${params.issueId}.json\n` +
                `==============================================================\n`;

              try {
                const driver = DriverFactory.getDriver(config.driver);
                await driver.sendPrompt(panes.orchestrator, summaryCard, false);
              } catch {
                // Ignore
              }
            }

            // Delegate workflow transition steering to dedicated WorkflowEngine
            await WorkflowEngine.handleTransition(
              params.issueId,
              params.newStatus,
              hitlMode,
              panes,
              params.notes,
              currentReworkCount,
              circuitBreakerTripped
            );
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

  // Tool 2: send_agent_message (Direct Inter-Agent Messaging)
  pi.registerTool({
    name: "send_agent_message",
    label: "Send Agent Message",
    description: "Send a direct message or feedback to another agent persona pane in tmux (ba, developer, qa, reviewer, orchestrator)",
    parameters: Type.Object({
      targetRole: Type.Union([
        Type.Literal("ba"),
        Type.Literal("developer"),
        Type.Literal("qa"),
        Type.Literal("reviewer"),
        Type.Literal("orchestrator")
      ], { description: "Target agent persona role" }),
      message: Type.String({ description: "Direct feedback, question, or instruction message to send" }),
      clearContext: Type.Optional(Type.Boolean({ description: "Whether to clear target agent conversation context before sending message (default: false)" }))
    }),
    async execute(toolCallId, params, signal, onUpdate, ctx) {
      const configPath = path.join(process.cwd(), ".pi", "team-config.json");
      if (!fs.existsSync(configPath)) {
        return {
          content: [{ type: "text", text: "Error: team-config.json not found. Run /team-dev first." }],
          details: { success: false }
        };
      }

      try {
        const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
        const driver = DriverFactory.getDriver(config.driver);
        let targetPane = config.panes?.[params.targetRole] || params.targetRole;
        const shouldClear = params.clearContext === true;

        const formatted = `[DIRECT MESSAGE to ${params.targetRole.toUpperCase()}]: ${params.message}`;
        await driver.sendPrompt(targetPane, formatted, shouldClear);

        // Log direct message to .pi/events.jsonl with auto-truncation cap
        appendEventLog({
          eventId: `evt_${Date.now()}`,
          type: "direct_message",
          targetRole: params.targetRole,
          message: params.message,
          timestamp: new Date().toISOString()
        });

        return {
          content: [{ type: "text", text: `Sent direct message to ${params.targetRole.toUpperCase()} (${targetPane})${shouldClear ? " [context cleared]" : ""}.` }],
          details: { success: true, targetPane, message: params.message, clearedContext: shouldClear }
        };
      } catch (err: any) {
        return {
          content: [{ type: "text", text: `Error sending message: ${err.message}` }],
          details: { success: false, error: err.message }
        };
      }
    }
  });

  // Tool 3: get_team_events (Persistent Event Bus Inspection)
  pi.registerTool({
    name: "get_team_events",
    label: "Get Team Events",
    description: "Read recent status update events and inter-agent messages from the persistent event log (.pi/events.jsonl)",
    parameters: Type.Object({
      limit: Type.Optional(Type.Number({ description: "Number of recent events to return (default: 10)" }))
    }),
    async execute(toolCallId, params, signal, onUpdate, ctx) {
      const eventsPath = path.join(process.cwd(), ".pi", "events.jsonl");
      if (!fs.existsSync(eventsPath)) {
        return {
          content: [{ type: "text", text: "No events logged in .pi/events.jsonl yet." }],
          details: { events: [] }
        };
      }

      try {
        const lines = fs.readFileSync(eventsPath, "utf-8").trim().split("\n").filter(Boolean);
        const limit = params.limit || 10;
        const recentLines = lines.slice(-limit);
        const events = recentLines.map(line => {
          try {
            return JSON.parse(line);
          } catch {
            return { raw: line };
          }
        });

        return {
          content: [{ type: "text", text: `Retrieved ${events.length} recent team events:\n` + JSON.stringify(events, null, 2) }],
          details: { events }
        };
      } catch (err: any) {
        return {
          content: [{ type: "text", text: `Error reading events: ${err.message}` }],
          details: { events: [], error: err.message }
        };
      }
    }
  });
}
