import { spawnSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { ModelResolver } from "../models/model-resolver.js";
export class StandaloneExecutionStrategy {
    async executeStart(ctx) {
        console.log("🚀 Starting SquadLoop in Standalone Mode (Single Interface)...");
        console.log("  ℹ️  Use persona prompts in .squadloop/prompts or /*.agent.md to switch roles.");
        console.log("  ℹ️  Internal subagents remain fully functional via Agent tool.\n");
        const defaultAgentFile = path.join(process.cwd(), ".squadloop", "agents", "orchestrator.md");
        const agentPrompt = fs.existsSync(defaultAgentFile) ? defaultAgentFile : "";
        const piArgs = ["--approve"];
        const orchestratorModel = ModelResolver.getModel("orchestrator");
        if (agentPrompt) {
            piArgs.push("--append-system-prompt", agentPrompt);
        }
        if (orchestratorModel) {
            if (orchestratorModel.includes("/")) {
                piArgs.push("--provider", orchestratorModel.split("/")[0]);
            }
            piArgs.push("--model", orchestratorModel);
        }
        const env = { ...process.env };
        if (env.GOOGLE_API_KEY && !env.GEMINI_API_KEY) {
            env.GEMINI_API_KEY = env.GOOGLE_API_KEY;
        }
        spawnSync("pi", piArgs, {
            stdio: "inherit",
            env: {
                ...env,
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
