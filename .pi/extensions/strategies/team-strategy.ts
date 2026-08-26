import * as fs from "fs";
import * as path from "path";
import type { IExecutionStrategy, ExecutionContext } from "./execution-strategy-interface.js";
import { DriverFactory } from "../drivers/driver-factory.js";

export class TeamExecutionStrategy implements IExecutionStrategy {
  public async executeStart(ctx: ExecutionContext): Promise<void> {
    const driver = DriverFactory.getDriver(ctx.driver);
    const panes = driver.setupTeamLayout(ctx.layout);

    const activeTaskPath = path.join(process.cwd(), ".pi", "active-task.json");
    fs.mkdirSync(path.dirname(activeTaskPath), { recursive: true });
    fs.writeFileSync(activeTaskPath, JSON.stringify({
      activeIssueId: "",
      status: "awaiting-human-input",
      updatedBy: "system",
      notes: "Fresh team session started. Awaiting human input.",
      timestamp: new Date().toISOString()
    }, null, 2), "utf-8");

    const welcomePrompt =
      `==============================================================\n` +
      `🚀 SQUADLOOP ONLINE [--ex-mode=team, --hitl=${ctx.hitl}, --driver=${driver.id}, --layout=${ctx.layout}]\n` +
      `==============================================================\n` +
      `Print the welcome banner and options (1. Implement BRD/PRD, 2. Pick Story, 3. Random, 4. Custom Task).\n` +
      `STOP IMMEDIATELY and wait for human instruction.`;

    await driver.sendPrompt(panes.orchestrator, welcomePrompt, false);
    driver.attachSession();
  }

  public async executeResume(ctx: ExecutionContext): Promise<void> {
    const driver = DriverFactory.getDriver(ctx.driver);
    const panes = driver.setupTeamLayout(ctx.layout);

    const resumePrompt = `Master Orchestrator RESUMED [--ex-mode=team, --hitl=${ctx.hitl}, --driver=${driver.id}]! State active task status and wait for human input.`;
    await driver.sendPrompt(panes.orchestrator, resumePrompt, false);
    driver.attachSession();
  }
}
