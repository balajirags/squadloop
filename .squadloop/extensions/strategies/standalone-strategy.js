import { spawnSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
export class StandaloneExecutionStrategy {
    async executeStart(ctx) {
        console.log("🚀 Starting SquadLoop in Standalone Mode (Single Interface)...");
        console.log("  ℹ️  Use persona slash commands (/ba, /dev, /qa, /reviewer, /orchestrator or /*.agent.md) to switch roles.");
        console.log("  ℹ️  Internal subagents remain fully functional via Agent tool.\n");
        const defaultAgentFile = path.join(process.cwd(), ".squadloop", "agents", "orchestrator.md");
        const agentPrompt = fs.existsSync(defaultAgentFile) ? defaultAgentFile : "";
        const piArgs = ["--approve"];
        if (agentPrompt) {
            piArgs.push("--append-system-prompt", agentPrompt);
        }
        spawnSync("pi", piArgs, {
            stdio: "inherit",
            env: {
                ...process.env,
                CONFIG_DIR_NAME: ".squadloop",
                PI_CODING_AGENT_DIR: path.join(process.env.HOME || "", ".squadloop", "agent")
            }
        });
    }
    async executeResume(ctx) {
        console.log("🔄 Resuming SquadLoop Standalone session...");
        await this.executeStart(ctx);
    }
}
