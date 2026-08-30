import * as fs from "fs";
import * as path from "path";
import type { IExecutionStrategy, ExecutionContext } from "./execution-strategy-interface.js";
import { DriverFactory } from "../drivers/driver-factory.js";
import { getRuntimeSessionId, writeActiveTask } from "../sessions/session-manager.js";

function savePanesToConfig(sessionId: string, panes: any, driverId: string): void {
  const configPath = path.join(process.cwd(), ".squadloop", "config.json");
  if (fs.existsSync(configPath)) {
    try {
      const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      config.panes = panes;
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf-8");
    } catch {
      // Ignore
    }
  }

  writeActiveTask(sessionId, {
    activeIssueId: "",
    status: "awaiting-human-input",
    updatedBy: "system",
    notes: "Fresh team session started. Awaiting human input.",
    timestamp: new Date().toISOString(),
    driver: driverId,
    panes
  });
}

export class TeamExecutionStrategy implements IExecutionStrategy {
  public async executeStart(ctx: ExecutionContext): Promise<void> {
    const sessionId = ctx.sessionId || getRuntimeSessionId();
    const driver = DriverFactory.getDriver(ctx.driver);
    const panes = driver.setupTeamLayout(ctx.layout, sessionId);
    savePanesToConfig(sessionId, panes, driver.id);

    const welcomePrompt =
      `==============================================================\n` +
      `🚀 SQUADLOOP ONLINE [session=${sessionId}, --ex-mode=team, --hitl=${ctx.hitl}, --driver=${driver.id}, --layout=${ctx.layout}]\n` +
      `==============================================================\n` +
      `Print the welcome banner and options (1. Implement BRD/PRD, 2. Pick Story, 3. Random, 4. Custom Task).\n` +
      `STOP IMMEDIATELY and wait for human instruction.`;

    await driver.sendPrompt(panes.orchestrator, welcomePrompt, false);
    driver.attachSession(sessionId);
  }

  public async executeResume(ctx: ExecutionContext): Promise<void> {
    const sessionId = ctx.sessionId || getRuntimeSessionId();
    const driver = DriverFactory.getDriver(ctx.driver);
    const panes = driver.setupTeamLayout(ctx.layout, sessionId);
    savePanesToConfig(sessionId, panes, driver.id);

    const resumePrompt = `Master Orchestrator RESUMED [session=${sessionId}, --ex-mode=team, --hitl=${ctx.hitl}, --driver=${driver.id}]! State active task status and wait for human input.`;
    await driver.sendPrompt(panes.orchestrator, resumePrompt, false);
    driver.attachSession(sessionId);
  }
}
