import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { TrackerFactory } from "./trackers/tracker-factory.js";
import { WorkflowEngine } from "./workflow.js";
import { DriverFactory } from "./drivers/driver-factory.js";
import {
  appendSessionEvent,
  getRuntimeSessionId,
  listSessions,
  readActiveTask,
  readSessionEvents,
  resolveSessionId,
  writeActiveTask,
  type ActiveTaskState
} from "./sessions/session-manager.js";

export interface TokenStats {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
}

function appendEventLog(eventRecord: any): void {
  const sessionId = getRuntimeSessionId();
  appendSessionEvent(sessionId, eventRecord);
}

function loadSessionPanes(sessionId: string) {
  return readActiveTask(sessionId)?.panes;
}

export function registerTeamTools(pi: ExtensionAPI) {
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
      const sessionId = getRuntimeSessionId();
      const existing = readActiveTask(sessionId);

      let previousReworkCount = existing?.activeIssueId === params.issueId ? existing.reworkCount || 0 : 0;
      let promptTokens = params.tokens?.promptTokens || 0;
      let completionTokens = params.tokens?.completionTokens || 0;

      if (existing?.activeIssueId === params.issueId && existing.tokenStats) {
        promptTokens += existing.tokenStats.promptTokens || 0;
        completionTokens += existing.tokenStats.completionTokens || 0;
      }

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
        status: params.newStatus,
        updatedBy: ctx.cwd || "agent",
        notes: params.notes,
        reworkCount: currentReworkCount,
        tokenStats,
        timestamp: new Date().toISOString(),
        driver: existing?.driver || DriverFactory.getDriver().id,
        panes: existing?.panes
      };

      let circuitBreakerTripped = false;
      if (currentReworkCount > 3) {
        state.status = "circuit-breaker-tripped";
        circuitBreakerTripped = true;
      }

      writeActiveTask(sessionId, state);

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
            timestamp: state.timestamp,
            sessionId
          }, null, 2), "utf-8");
        } catch {
          // Ignore checkpoint write error
        }
      }

      const configPath = path.join(process.cwd(), ".squadloop", "config.json");
      if (fs.existsSync(configPath)) {
        try {
          const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
          const rawHitl = config.hitl || config.mode || "loop";
          const hitlMode = (rawHitl === "loop-hitl" ? "loop" : rawHitl === "step-hitl" ? "step" : rawHitl);
          const panes = state.panes || config.panes || {};

          if (panes) {
            if (params.newStatus === "done" && params.issueId) {
              try {
                const trackerAdapter = TrackerFactory.getAdapter();
                await trackerAdapter.closeIssue(params.issueId, "Completed and merged to main by SquadLoop");
              } catch {
                // Non-fatal
              }

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
      const sessionId = getRuntimeSessionId();
      const activeTask = readActiveTask(sessionId);
      if (!activeTask) {
        return {
          content: [{ type: "text", text: "Error: no active session state found. Run squadloop start first." }],
          details: { success: false }
        };
      }

      try {
        const configPath = path.join(process.cwd(), ".squadloop", "config.json");
        if (!fs.existsSync(configPath)) {
          return {
            content: [{ type: "text", text: "Error: config.json not found. Run /team-dev first." }],
            details: { success: false }
          };
        }

        const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
        const driver = DriverFactory.getDriver(config.driver);
        const panes = activeTask.panes || config.panes || {};
        let targetPane = panes?.[params.targetRole] || params.targetRole;
        const shouldClear = params.clearContext === true;

        const formatted = `[DIRECT MESSAGE to ${params.targetRole.toUpperCase()}]: ${params.message}`;
        await driver.sendPrompt(targetPane, formatted, shouldClear);

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

  pi.registerTool({
    name: "get_team_events",
    label: "Get Team Events",
    description: "Read recent status update events and inter-agent messages from the session event log (.squadloop/sessions/<id>/events.jsonl)",
    parameters: Type.Object({
      limit: Type.Optional(Type.Number({ description: "Number of recent events to return (default: 10)" })),
      sessionId: Type.Optional(Type.String({ description: "Optional session id to inspect" }))
    }),
    async execute(toolCallId, params, signal, onUpdate, ctx) {
      const sessionId = resolveSessionId(params.sessionId) || getRuntimeSessionId();
      const events = readSessionEvents(sessionId, params.limit || 10);
      if (events.length === 0) {
        return {
          content: [{ type: "text", text: `No events logged in .squadloop/sessions/${sessionId}/events.jsonl yet.` }],
          details: { events: [] }
        };
      }

      return {
        content: [{ type: "text", text: `Retrieved ${events.length} recent team events:\n` + JSON.stringify(events, null, 2) }],
        details: { events }
      };
    }
  });
}
