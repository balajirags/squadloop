import { DriverFactory } from "./drivers/driver-factory.js";
import { XStateWorkflowEngine } from "./workflow/workflow-fsm.js";
import { JsonFileStateStore } from "./sessions/json-file-state-store.js";
import { YamlWorkflowParser } from "./workflow/workflow-parser.js";
import { getRuntimeSessionId } from "./sessions/session-manager.js";
import * as fs from "fs";
import * as path from "path";
function mapStatusToEvent(status) {
    const norm = status.trim().toLowerCase();
    switch (norm) {
        case "ready-for-dev":
            return "GROOMING_COMPLETE";
        case "qa-verifying":
            return "DEV_COMPLETE";
        case "code-review":
            return "QA_PASS";
        case "dev-rework":
            return "QA_FAIL";
        case "done":
            return "REVIEW_APPROVE";
        default:
            return status.toUpperCase();
    }
}
function discoverStoryQueue() {
    const storiesDir = path.join(process.cwd(), "docs", "stories");
    if (!fs.existsSync(storiesDir))
        return [];
    const stories = [];
    const search = (d) => {
        try {
            const entries = fs.readdirSync(d, { withFileTypes: true });
            for (const entry of entries) {
                const full = path.join(d, entry.name);
                if (entry.isDirectory()) {
                    search(full);
                }
                else if (entry.isFile() && entry.name.endsWith(".md") && !entry.name.startsWith("index")) {
                    const match = entry.name.match(/^(STORY-[0-9]+)/i) || entry.name.match(/^([A-Z0-9]+-[0-9]+)/i);
                    if (match) {
                        stories.push(match[1].toUpperCase());
                    }
                    else {
                        stories.push(entry.name.replace(/\.md$/, ""));
                    }
                }
            }
        }
        catch {
            // Ignore
        }
    };
    search(storiesDir);
    return Array.from(new Set(stories)).sort();
}
export class WorkflowEngine {
    static engine = new XStateWorkflowEngine();
    static store = new JsonFileStateStore();
    static loadWorkflowDefinition() {
        const configPath = path.join(process.cwd(), ".squadloop", "config.json");
        let profile = "feature";
        if (fs.existsSync(configPath)) {
            try {
                const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
                if (config.workflowProfile)
                    profile = config.workflowProfile;
            }
            catch {
                // Fallback
            }
        }
        const profilePath = path.join(process.cwd(), ".squadloop", "workflows", `${profile}.yaml`);
        const fallbackPath = path.join(process.cwd(), ".squadloop", "workflows", "feature.yaml");
        const targetPath = fs.existsSync(profilePath) ? profilePath : fallbackPath;
        if (!fs.existsSync(targetPath)) {
            return {
                version: "1.0",
                name: "Feature Development Workflow",
                pipeline: {
                    initial: "ba_grooming",
                    states: {
                        ba_grooming: { agent: "ba", on: { GROOMING_COMPLETE: "dev_implementing" } },
                        dev_implementing: { agent: "developer", on: { DEV_COMPLETE: "qa_verifying" } },
                        qa_verifying: { agent: "qa", on: { QA_PASS: "code_reviewing", QA_FAIL: "dev_implementing" } },
                        code_reviewing: { agent: "reviewer", on: { REVIEW_APPROVE: "done", REVIEW_REJECT: "dev_implementing" } },
                        done: { type: "final" }
                    }
                },
                personas: {
                    ba: { initial: "scan_brd", steps: { scan_brd: { action: "Scan BRD", next: "auto_reslice" }, auto_reslice: { action: "Reslice", on_complete: "GROOMING_COMPLETE" } } },
                    developer: { initial: "git_checkout", steps: { git_checkout: { action: "Checkout branch", next: "implement_code" }, implement_code: { action: "Implement code", on_complete: "DEV_COMPLETE" } } },
                    qa: { initial: "health_check", steps: { health_check: { action: "Check health", on_pass: "QA_PASS", on_fail: "QA_FAIL" } } },
                    reviewer: { initial: "find_branch", steps: { find_branch: { action: "Review diff", on_pass: "REVIEW_APPROVE", on_fail: "REVIEW_REJECT" } } }
                }
            };
        }
        return YamlWorkflowParser.parseFile(targetPath);
    }
    static async processStepComplete(step, notes, payload) {
        const sessionId = getRuntimeSessionId() || process.env.SQUADLOOP_SESSION_ID || "default";
        const def = WorkflowEngine.loadWorkflowDefinition();
        let currentState = await WorkflowEngine.store.readActiveTask(sessionId);
        if (!currentState) {
            currentState = await WorkflowEngine.engine.start(def, "active");
        }
        else {
            await WorkflowEngine.engine.start(def, currentState.issueId, currentState);
        }
        const updatedState = await WorkflowEngine.engine.transition("STEP_COMPLETE", {
            step,
            notes,
            ...(payload || {})
        });
        await WorkflowEngine.store.writeActiveTask(sessionId, updatedState);
        const configPath = path.join(process.cwd(), ".squadloop", "config.json");
        let driverName = "tmux";
        let panes = {};
        if (fs.existsSync(configPath)) {
            try {
                const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
                driverName = config.driver || "tmux";
                panes = config.panes || {};
            }
            catch {
                // Fallback
            }
        }
        const driver = DriverFactory.getDriver(driverName);
        if (panes?.orchestrator) {
            const progressMsg = `[FSM PROGRESS :: ${updatedState.targetRole.toUpperCase()}] Completed '${step}' -> Active: '${updatedState.microStep}' (Issue #${updatedState.issueId}).`;
            await driver.sendPrompt(panes.orchestrator, progressMsg, false, "orchestrator", sessionId);
        }
        const targetPane = panes[updatedState.targetRole] || updatedState.targetRole;
        if (targetPane && updatedState.promptCard && !updatedState.isDone) {
            await driver.sendPrompt(targetPane, updatedState.promptCard, false, updatedState.targetRole, sessionId);
        }
        return updatedState;
    }
    static async handleTransition(issueId, newStatus, hitlMode, panes, notes, reworkCount = 0, circuitBreakerTripped = false) {
        const sessionId = getRuntimeSessionId() || process.env.SQUADLOOP_SESSION_ID || "default";
        const def = WorkflowEngine.loadWorkflowDefinition();
        let currentState = await WorkflowEngine.store.readActiveTask(sessionId);
        if (!currentState || currentState.issueId !== issueId) {
            currentState = await WorkflowEngine.engine.start(def, issueId);
            if (newStatus) {
                const event = mapStatusToEvent(newStatus);
                currentState = await WorkflowEngine.engine.transition(event, { notes, reworkCount });
            }
        }
        else {
            await WorkflowEngine.engine.start(def, issueId, currentState);
            const event = mapStatusToEvent(newStatus);
            currentState = await WorkflowEngine.engine.transition(event, { notes, reworkCount });
        }
        if (reworkCount > 0) {
            currentState.reworkCount = reworkCount;
        }
        // Auto-discover story queue if grooming BRD
        const discoveredQueue = discoverStoryQueue();
        if (discoveredQueue.length > 0) {
            currentState.storyQueue = discoveredQueue;
            if (!currentState.scope) {
                currentState.scope = discoveredQueue.length > 1 ? "brd" : "story";
            }
            const idx = discoveredQueue.indexOf(issueId);
            currentState.currentStoryIndex = idx >= 0 ? idx : 0;
        }
        await WorkflowEngine.store.writeActiveTask(sessionId, currentState);
        const configPath = path.join(process.cwd(), ".squadloop", "config.json");
        let driverName = "tmux";
        if (fs.existsSync(configPath)) {
            try {
                const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
                driverName = config.driver || "tmux";
            }
            catch {
                // Fallback
            }
        }
        const driver = DriverFactory.getDriver(driverName);
        if (panes?.orchestrator) {
            const notifyMsg = `[SYSTEM EVENT]: Task #${issueId} status updated to '${newStatus}' (Notes: ${notes ? notes : "subagent update"}).`;
            await driver.sendPrompt(panes.orchestrator, notifyMsg, false, "orchestrator", sessionId);
        }
        if (circuitBreakerTripped || currentState.reworkCount > 3) {
            if (panes?.orchestrator) {
                const alertMsg = `⚠️ ALERT: Issue #${issueId} has exceeded 3 rework attempts! REWORK_CIRCUIT_BREAKER_TRIPPED. Workflow is PAUSED. Please intervene in Pane 0 to guide Developer or review changes.`;
                await driver.sendPrompt(panes.orchestrator, alertMsg, false, "orchestrator", sessionId);
            }
            return;
        }
        const isLoop = hitlMode === "loop" || hitlMode === "loop-hitl";
        if (currentState.isDone || newStatus === "done" || currentState.pipelineStage === "done") {
            const queue = currentState.storyQueue || [];
            const currIdx = currentState.currentStoryIndex ?? (queue.indexOf(issueId) >= 0 ? queue.indexOf(issueId) : 0);
            const isBrdScope = currentState.scope === "brd" || (queue.length > 1 && currIdx < queue.length - 1);
            if (isBrdScope && queue.length > 0 && currIdx < queue.length - 1) {
                const nextIdx = currIdx + 1;
                const nextIssueId = queue[nextIdx];
                let nextState = await WorkflowEngine.engine.start(def, nextIssueId);
                nextState = await WorkflowEngine.engine.transition("GROOMING_COMPLETE", {
                    notes: `Auto-advancing to BRD story ${nextIdx + 1}/${queue.length}: ${nextIssueId}`
                });
                nextState.scope = "brd";
                nextState.storyQueue = queue;
                nextState.currentStoryIndex = nextIdx;
                await WorkflowEngine.store.writeActiveTask(sessionId, nextState);
                if (panes?.orchestrator) {
                    const progressMsg = `🔄 [BRD LOOP PROGRESS]: Story #${issueId} completed & merged to main!\n` +
                        `Automatically advancing to next BRD story #${nextIssueId} (${nextIdx + 1}/${queue.length} stories).`;
                    await driver.sendPrompt(panes.orchestrator, progressMsg, false, "orchestrator", sessionId);
                }
                const devPane = (panes && panes[nextState.targetRole]) || nextState.targetRole;
                if (devPane && nextState.promptCard) {
                    await driver.sendPrompt(devPane, nextState.promptCard, false, nextState.targetRole, sessionId);
                }
                return;
            }
            if (isLoop && panes?.orchestrator) {
                const totalStoriesText = currentState.scope === "brd" && queue.length > 0 ? `All ${queue.length} BRD stories completed` : `Issue #${issueId} completed`;
                const haltPrompt = `🛑 [LOOP-HITL CYCLE COMPLETE & WORKFLOW HALTED]\n` +
                    `${totalStoriesText} end-to-end (BA -> Dev -> QA -> Reviewer -> Merged).\n\n` +
                    `Master Orchestrator MUST STOP IMMEDIATELY and wait for human operator input.\n` +
                    `DO NOT call send_agent_message or pick up new work automatically.\n` +
                    `Display the completion message to the human operator in Pane 0 and WAIT for their next command.`;
                await driver.sendPrompt(panes.orchestrator, haltPrompt, false, "orchestrator", sessionId);
            }
            return;
        }
        const targetPane = (panes && panes[currentState.targetRole]) || currentState.targetRole;
        if (targetPane && currentState.promptCard) {
            await driver.sendPrompt(targetPane, currentState.promptCard, false, currentState.targetRole, sessionId);
        }
    }
}
