import * as fs from "fs";
import * as path from "path";
import { ModelResolver } from "./model-resolver.js";

const ROLES = ["orchestrator", "ba", "developer", "qa", "reviewer"];

export class PromptSyncEngine {
  public static syncAllPrompts(): void {
    const promptsDir = path.join(process.cwd(), ".pi", "prompts");
    fs.mkdirSync(promptsDir, { recursive: true });

    for (const role of ROLES) {
      const model = ModelResolver.getModel(role);
      const agentFile = path.join(process.cwd(), ".pi", "agents", `${role}.md`);
      const targetPromptFile = path.join(promptsDir, `${role}.md`);

      let agentContent = "";
      if (fs.existsSync(agentFile)) {
        const rawContent = fs.readFileSync(agentFile, "utf-8");
        // Strip any leading YAML frontmatter
        agentContent = rawContent.replace(/^---[\s\S]*?---\n?/, "").trim();
      }

      const frontmatterLines = [
        "---",
        `description: Switch to ${role.toUpperCase()} persona`
      ];
      if (model) {
        frontmatterLines.push(`model: ${model}`);
      }
      frontmatterLines.push("---");

      const fileContent = `${frontmatterLines.join("\n")}\n\n${agentContent}\n`;
      fs.writeFileSync(targetPromptFile, fileContent, "utf-8");
    }
  }
}
