import * as fs from "fs";
import * as path from "path";
function cleanModelString(raw) {
    let val = raw.trim();
    if (val.includes("#")) {
        val = val.split("#")[0].trim();
    }
    return val.replace(/^["']|["']$/g, "").trim();
}
function resolveRoleModel(role) {
    const configPath = path.join(process.cwd(), ".pi", "team-config.json");
    if (fs.existsSync(configPath)) {
        try {
            const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
            if (config.models?.[role]) {
                const cleaned = cleanModelString(config.models[role]);
                if (cleaned)
                    return cleaned;
            }
        }
        catch {
            // Ignore
        }
    }
    const agentPath = path.join(process.cwd(), ".pi", "agents", `${role}.md`);
    if (fs.existsSync(agentPath)) {
        try {
            const content = fs.readFileSync(agentPath, "utf-8");
            const match = content.match(/^(?!\s*#)\s*model:\s*(.+)$/m);
            if (match && match[1]) {
                const cleaned = cleanModelString(match[1]);
                if (cleaned)
                    return cleaned;
            }
        }
        catch {
            // Ignore
        }
    }
    return null;
}
export class HeadlessWorkspaceAdapter {
    name = "Regular Headless Workspace (No Tmux)";
    isAvailable() {
        return true; // Always available on any terminal / OS
    }
    setupLayout(_layout = "panes") {
        console.log("ℹ️  Running in Regular Headless Mode (no tmux required).");
        return {
            orchestrator: "orchestrator",
            ba: "ba",
            developer: "developer",
            qa: "qa",
            reviewer: "reviewer"
        };
    }
    recoverMissingPanes(currentPanes) {
        return currentPanes;
    }
    async sendPrompt(targetRole, promptText) {
        // Append headless event to .pi/events.jsonl with resolved model
        try {
            const eventsPath = path.join(process.cwd(), ".pi", "events.jsonl");
            fs.mkdirSync(path.dirname(eventsPath), { recursive: true });
            const model = resolveRoleModel(targetRole);
            const eventRecord = {
                eventId: `evt_${Date.now()}`,
                type: "headless_prompt",
                targetRole,
                model: model || "default",
                prompt: promptText,
                timestamp: new Date().toISOString()
            };
            let lines = [];
            if (fs.existsSync(eventsPath)) {
                lines = fs.readFileSync(eventsPath, "utf-8").trim().split("\n").filter(Boolean);
            }
            lines.push(JSON.stringify(eventRecord));
            if (lines.length > 1000)
                lines = lines.slice(-1000);
            fs.writeFileSync(eventsPath, lines.join("\n") + "\n", "utf-8");
            console.log(`[HEADLESS DISPATCH -> ${targetRole.toUpperCase()}${model ? ` (${model})` : ""}] : ${promptText.slice(0, 100)}...`);
        }
        catch {
            // Non-fatal
        }
    }
    startAppServerWindow(_startCommand) {
        return "headless-app-server";
    }
}
