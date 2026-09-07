import { Type } from "@sinclair/typebox";
import * as fs from "fs";
import * as path from "path";
import * as net from "net";
import * as os from "os";
import { TrackerFactory } from "./trackers/tracker-factory.js";
import { WorkflowEngine } from "./workflow.js";
import { DriverFactory } from "./drivers/driver-factory.js";
function sockRequest(sockPath, payload, timeoutMs = 2000) {
    return new Promise((resolve, reject) => {
        if (!fs.existsSync(sockPath)) {
            reject(new Error(`Socket file ${path.basename(sockPath)} not found`));
            return;
        }
        const conn = net.createConnection(sockPath);
        let buf = "";
        const timer = setTimeout(() => {
            conn.destroy();
            reject(new Error(`Timeout connecting to ${path.basename(sockPath)}`));
        }, timeoutMs);
        conn.on("connect", () => conn.write(JSON.stringify(payload) + "\n"));
        conn.on("data", (d) => {
            buf += d.toString();
            const nl = buf.indexOf("\n");
            if (nl >= 0) {
                clearTimeout(timer);
                conn.end();
                try {
                    resolve(JSON.parse(buf.slice(0, nl)));
                }
                catch (e) {
                    reject(e);
                }
            }
        });
        conn.on("error", (e) => {
            clearTimeout(timer);
            reject(e);
        });
    });
}
function findPeerByRole(targetRole) {
    const regDir = path.join(os.homedir(), ".pi", "agent-comm", "registry");
    if (!fs.existsSync(regDir))
        return null;
    const files = fs.readdirSync(regDir);
    const targetLower = targetRole.toLowerCase();
    for (const file of files) {
        if (!file.endsWith(".json"))
            continue;
        try {
            const content = fs.readFileSync(path.join(regDir, file), "utf8");
            const entry = JSON.parse(content);
            const nameLower = (entry.name || "").toLowerCase();
            if (nameLower.includes(targetLower) || file.toLowerCase().includes(targetLower)) {
                if (entry.socket && fs.existsSync(entry.socket)) {
                    return entry;
                }
            }
        }
        catch {
            // Ignore
        }
    }
    return null;
}
import { appendAgentMailbox, appendSessionEvent, getRuntimeSessionId, readActiveTask, readAgentMailbox, readSessionEvents, resolveSessionId, writeActiveTask } from "./sessions/session-manager.js";
function appendEventLog(eventRecord) {
    const sessionId = getRuntimeSessionId();
    appendSessionEvent(sessionId, eventRecord);
}
function loadSessionPanes(sessionId) {
    return readActiveTask(sessionId)?.panes;
}
export function registerTeamTools(pi) {
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
            let previousReworkCount = existing?.activeIssueId === params.issueId ? existing?.reworkCount || 0 : 0;
            let promptTokens = params.tokens?.promptTokens || 0;
            let completionTokens = params.tokens?.completionTokens || 0;
            if (existing?.activeIssueId === params.issueId && existing?.tokenStats) {
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
            const tokenStats = {
                promptTokens,
                completionTokens,
                totalTokens,
                estimatedCostUsd
            };
            let currentReworkCount = previousReworkCount;
            if (params.newStatus === "dev-rework") {
                currentReworkCount += 1;
            }
            const state = {
                activeIssueId: params.issueId || "",
                status: params.newStatus || "ready-for-dev",
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
                }
                catch {
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
                            }
                            catch {
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
                            }
                            catch {
                                // Ignore
                            }
                        }
                        await WorkflowEngine.handleTransition(params.issueId || "", params.newStatus || "ready-for-dev", hitlMode, panes, params.notes, currentReworkCount, circuitBreakerTripped);
                    }
                }
                catch {
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
            const targetRole = params.targetRole || "developer";
            const senderRole = process.env.SQUADLOOP_ROLE || activeTask?.updatedBy || "agent";
            try {
                const peer = findPeerByRole(targetRole);
                if (peer && peer.socket && fs.existsSync(peer.socket)) {
                    const thread = `thread_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
                    await sockRequest(peer.socket, {
                        type: "ask",
                        from: { id: senderRole, name: senderRole },
                        question: params.message,
                        thread
                    });
                    appendEventLog({
                        eventId: `evt_${Date.now()}`,
                        type: "direct_message",
                        senderRole,
                        targetRole,
                        message: params.message,
                        timestamp: new Date().toISOString()
                    });
                    return {
                        content: [
                            {
                                type: "text",
                                text: `📩 Delivered 1:1 message directly to ${targetRole.toUpperCase()} via pi-agent-comm socket (${path.basename(peer.socket)}) [No Tmux/Driver Buffer used].`
                            }
                        ],
                        details: { success: true, targetRole, senderRole, peerId: peer.id, socket: peer.socket }
                    };
                }
                appendAgentMailbox(sessionId, targetRole, {
                    type: "direct_message",
                    senderRole,
                    message: params.message,
                    timestamp: new Date().toISOString()
                });
                appendEventLog({
                    eventId: `evt_${Date.now()}`,
                    type: "direct_message",
                    senderRole,
                    targetRole,
                    message: params.message,
                    timestamp: new Date().toISOString()
                });
                return {
                    content: [
                        {
                            type: "text",
                            text: `📩 Queued 1:1 message for ${targetRole.toUpperCase()} via pi-agent-comm event stream [No Tmux/Driver Buffer used].`
                        }
                    ],
                    details: { success: true, targetRole, senderRole, message: params.message }
                };
            }
            catch (err) {
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
        description: "Read recent status update events and inter-agent messages from the session event log",
        parameters: Type.Object({
            limit: Type.Optional(Type.Number({ description: "Number of recent events to return (default: 10)" })),
            role: Type.Optional(Type.String({ description: "Optional agent role to read specific mailbox messages for" })),
            sessionId: Type.Optional(Type.String({ description: "Optional session id to inspect" }))
        }),
        async execute(toolCallId, params, signal, onUpdate, ctx) {
            const sessionId = resolveSessionId(params.sessionId) || getRuntimeSessionId();
            const events = readSessionEvents(sessionId, params.limit || 10);
            const mailboxEvents = params.role ? readAgentMailbox(sessionId, params.role, params.limit || 10) : [];
            if (events.length === 0 && mailboxEvents.length === 0) {
                return {
                    content: [{ type: "text", text: `No events logged in session ${sessionId} yet.` }],
                    details: { events: [], mailboxEvents: [] }
                };
            }
            return {
                content: [{ type: "text", text: `Retrieved recent team events:\n` + JSON.stringify({ events, mailboxEvents }, null, 2) }],
                details: { events, mailboxEvents }
            };
        }
    });
}
