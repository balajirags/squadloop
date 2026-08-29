import { DriverFactory } from "./drivers/driver-factory.js";
import * as fs from "fs";
import * as path from "path";

export type WorkflowStage =
  | "ready-for-dev"
  | "dev-in-progress"
  | "qa-verifying"
  | "code-review"
  | "dev-rework"
  | "done"
  | "loop-halted"
  | "circuit-breaker-tripped";

export class WorkflowEngine {
  private static async sendPromptAsync(paneTarget: string, promptText: string, clear = true): Promise<void> {
    const configPath = path.join(process.cwd(), ".squadloop", "config.json");
    let driverName = "tmux";
    if (fs.existsSync(configPath)) {
      try {
        const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
        driverName = config.driver || "tmux";
      } catch {
        // Ignore
      }
    }
    const driver = DriverFactory.getDriver(driverName);
    await driver.sendPrompt(paneTarget, promptText, clear);
  }

  public static async handleTransition(
    issueId: string,
    newStatus: string,
    hitlMode: "loop" | "step" | "auto" | "loop-hitl" | "step-hitl" | string,
    panes: any,
    notes?: string,
    reworkCount = 0,
    circuitBreakerTripped = false
  ): Promise<void> {
    if (!panes) return;

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
    } else if (newStatus === "qa-verifying" && (isLoop || isAuto)) {
      const prompt = `Issue #${issueId} is ready for QA verification. Checkout feature branch feature/issue-${issueId}, verify app server is running on localhost port, execute live HTTP/UI AC checks, and update status.`;
      await WorkflowEngine.sendPromptAsync(panes.qa, prompt, true);
    } else if (newStatus === "code-review" && (isLoop || isAuto)) {
      const prompt = `Issue #${issueId} is ready for Code Review. Inspect git diff feature/issue-${issueId} vs main, verify P1/P2 standards, merge branch to main, push main, close tracker issue, and update status to 'done'.`;
      await WorkflowEngine.sendPromptAsync(panes.reviewer, prompt, true);
    } else if (newStatus === "dev-rework" && (isLoop || isAuto)) {
      const prompt = `Issue #${issueId} requires rework (attempt ${reworkCount}/3). Read review/QA feedback notes: '${notes || "Check P1/P2 review comments"}', fix issues in backend/ or frontend/, re-run build-verify, commit, push to feature branch feature/issue-${issueId}, and update status to 'code-review' so Code Reviewer can verify the fix.`;
      await WorkflowEngine.sendPromptAsync(panes.developer, prompt, false);
    } else if (newStatus === "done") {
      if (isLoop) {
        const haltPrompt = `🛑 [LOOP-HITL CYCLE COMPLETE & WORKFLOW HALTED]\n` +
          `The 1-cycle task for Issue #${issueId} has completed end-to-end (BA -> Dev -> QA -> Reviewer -> Merged).\n\n` +
          `Master Orchestrator MUST STOP IMMEDIATELY and wait for human operator input.\n` +
          `DO NOT call send_agent_message or pick up new work automatically.\n` +
          `Display the completion message to the human operator in Pane 0 and WAIT for their next command.`;
        await WorkflowEngine.sendPromptAsync(panes.orchestrator, haltPrompt, false);
      } else if (isAuto) {
        const prompt = `Story #${issueId} is COMPLETE & MERGED! [AUTO MODE] Picking up next story from backlog for BA grooming/dev.`;
        await WorkflowEngine.sendPromptAsync(panes.ba, prompt, true);
      }
    }
  }
}
