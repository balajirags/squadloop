import * as fs from "fs";
import * as path from "path";
import { DriverFactory } from "../drivers/driver-factory.js";
function savePanesToConfig(panes) {
    const configPath = path.join(process.cwd(), ".squadloop", "config.json");
    if (fs.existsSync(configPath)) {
        try {
            const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
            config.panes = panes;
            fs.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf-8");
        }
        catch {
            // Ignore
        }
    }
}
export class TeamExecutionStrategy {
    async executeStart(ctx) {
        const driver = DriverFactory.getDriver(ctx.driver);
        const panes = driver.setupTeamLayout(ctx.layout);
        savePanesToConfig(panes);
        const activeTaskPath = path.join(process.cwd(), ".squadloop", "active-task.json");
        fs.mkdirSync(path.dirname(activeTaskPath), { recursive: true });
        fs.writeFileSync(activeTaskPath, JSON.stringify({
            activeIssueId: "",
            status: "awaiting-human-input",
            updatedBy: "system",
            notes: "Fresh team session started. Awaiting human input.",
            timestamp: new Date().toISOString()
        }, null, 2), "utf-8");
        const welcomePrompt = `==============================================================\n` +
            `🚀 SQUADLOOP ONLINE [--ex-mode=team, --hitl=${ctx.hitl}, --driver=${driver.id}, --layout=${ctx.layout}]\n` +
            `==============================================================\n` +
            `Print the welcome banner and options (1. Implement BRD/PRD, 2. Pick Story, 3. Random, 4. Custom Task).\n` +
            `STOP IMMEDIATELY and wait for human instruction.`;
        await driver.sendPrompt(panes.orchestrator, welcomePrompt, false);
        driver.attachSession();
    }
    async executeResume(ctx) {
        const driver = DriverFactory.getDriver(ctx.driver);
        const panes = driver.setupTeamLayout(ctx.layout);
        savePanesToConfig(panes);
        const resumePrompt = `Master Orchestrator RESUMED [--ex-mode=team, --hitl=${ctx.hitl}, --driver=${driver.id}]! State active task status and wait for human input.`;
        await driver.sendPrompt(panes.orchestrator, resumePrompt, false);
        driver.attachSession();
    }
}
