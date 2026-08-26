import { spawnSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import type { IExecutionStrategy, ExecutionContext } from "./execution-strategy-interface.js";

export class StandaloneExecutionStrategy implements IExecutionStrategy {
  public async executeStart(ctx: ExecutionContext): Promise<void> {
    console.log("🚀 Starting SquadLoop in Standalone Mode (Single Interface)...");
    console.log("  ℹ️  Use persona slash commands (/ba, /dev, /qa, /reviewer, /orchestrator or /*.agent.md) to switch roles.");
    console.log("  ℹ️  Internal subagents remain fully functional via Agent tool.\n");

    const defaultAgentFile = path.join(process.cwd(), ".pi", "agents", "orchestrator.md");
    const agentPrompt = fs.existsSync(defaultAgentFile) ? defaultAgentFile : "";

    const piArgs = ["--approve"];
    if (agentPrompt) {
      piArgs.push("--append-system-prompt", agentPrompt);
    }

    spawnSync("pi", piArgs, { stdio: "inherit" });
  }

  public async executeResume(ctx: ExecutionContext): Promise<void> {
    console.log("🔄 Resuming SquadLoop Standalone session...");
    await this.executeStart(ctx);
  }
}
