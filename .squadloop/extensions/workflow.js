import { DriverFactory } from "./drivers/driver-factory.js";
import * as fs from "fs";
import * as path from "path";
export class WorkflowEngine {
    static async sendPromptAsync(paneTarget, promptText, clear = true) {
        const configPath = path.join(process.cwd(), ".squadloop", "config.json");
        let driverName = "tmux";
        if (fs.existsSync(configPath)) {
            try {
                const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
                driverName = config.driver || "tmux";
            }
            catch {
                // Ignore
            }
        }
        const driver = DriverFactory.getDriver(driverName);
        await driver.sendPrompt(paneTarget, promptText, clear);
    }
    static async handleTransition(issueId, newStatus, hitlMode, panes, notes, reworkCount = 0, circuitBreakerTripped = false) {
        if (!panes)
            return;
        const isLoop = hitlMode === "loop" || hitlMode === "loop-hitl";
        const isAuto = hitlMode === "auto";
        // Send system event notification to Master Orchestrator (Pane 0)
        const notifyMsg = `[SYSTEM EVENT]: Task #${issueId} status updated to '${newStatus}' (Notes: ${notes ? notes : "subagent update"}).`;
        await WorkflowEngine.sendPromptAsync(panes.orchestrator, notifyMsg, false);
        // Handle circuit breaker alert
        if (circuitBreakerTripped) {
            const alertMsg = `⚠️ ALERT: Issue #${issueId} has exceeded 3 rework attempts! REWORK_CIRCUIT_BREAKER_TRIPPED. Workflow is PAUSED. Please intervene in Pane 0 to guide Developer or review changes.`;
            await WorkflowEngine.sendPromptAsync(panes.orchestrator, alertMsg, false);
            return;
        }
        // Auto-steer transitions according to workflow mode
        if (newStatus === "ready-for-dev" && (isLoop || isAuto)) {
            const prompt = `Issue #${issueId} is ready for development. Read project-context.md, checkout main, pull latest main, checkout branch feature/issue-${issueId}, implement code inside backend/ or frontend/, run tests & verify coverage, commit, push, and update status to 'qa-verifying'.`;
            await WorkflowEngine.sendPromptAsync(panes.developer, prompt, true);
        }
        else if (newStatus === "qa-verifying" && (isLoop || isAuto)) {
            const prompt = `Issue #${issueId} is ready for QA verification.\n` +
                `1. Read project-context.md and story ACs for Issue #${issueId}.\n` +
                `2. Checkout feature branch feature/issue-${issueId}.\n` +
                `3. Verify app server health (e.g. curl -s --connect-timeout 2 http://localhost:<port>/health). If offline, start server in background non-blockingly (e.g. nohup ./gradlew bootRun > /tmp/backend-qa.log 2>&1 &).\n` +
                `4. Execute live HTTP API probes for each Gherkin AC scenario.\n` +
                `5. Call team_update_status with 'code-review' (if ALL pass) or 'dev-rework' (if ANY fail).\n` +
                `6. Call send_agent_message targeting 'orchestrator' with your QA verdict summary and HTTP evidence.`;
            await WorkflowEngine.sendPromptAsync(panes.qa, prompt, true);
        }
        else if (newStatus === "code-review" && (isLoop || isAuto)) {
            const prompt = `Issue #${issueId} is ready for Code Review.\n` +
                `1. Inspect git diff feature/issue-${issueId} vs main for P1/P2 issues.\n` +
                `2. If P1/P2 findings found, call team_update_status with 'dev-rework' and send_agent_message to orchestrator.\n` +
                `3. If approved, merge branch feature/issue-${issueId} to main, push main, update delivery tracker SOT, call team_update_status with 'done', and call send_agent_message targeting 'orchestrator' with completion summary.`;
            await WorkflowEngine.sendPromptAsync(panes.reviewer, prompt, true);
        }
        else if (newStatus === "dev-rework" && (isLoop || isAuto)) {
            const prompt = `Issue #${issueId} requires rework (attempt ${reworkCount}/3). Read review/QA feedback notes: '${notes || "Check P1/P2 review comments"}', fix issues in backend/ or frontend/, re-run build-verify, commit, push to feature branch feature/issue-${issueId}, and update status to 'code-review' so Code Reviewer can verify the fix.`;
            await WorkflowEngine.sendPromptAsync(panes.developer, prompt, false);
        }
        else if (newStatus === "done") {
            if (isLoop) {
                const haltPrompt = `🛑 [LOOP-HITL CYCLE COMPLETE & WORKFLOW HALTED]\n` +
                    `The 1-cycle task for Issue #${issueId} has completed end-to-end (BA -> Dev -> QA -> Reviewer -> Merged).\n\n` +
                    `Master Orchestrator MUST STOP IMMEDIATELY and wait for human operator input.\n` +
                    `DO NOT call send_agent_message or pick up new work automatically.\n` +
                    `Display the completion message to the human operator in Pane 0 and WAIT for their next command.`;
                await WorkflowEngine.sendPromptAsync(panes.orchestrator, haltPrompt, false);
            }
            else if (isAuto) {
                const prompt = `Story #${issueId} is COMPLETE & MERGED! [AUTO MODE] Picking up next story from backlog for BA grooming/dev.`;
                await WorkflowEngine.sendPromptAsync(panes.ba, prompt, true);
            }
        }
    }
}
