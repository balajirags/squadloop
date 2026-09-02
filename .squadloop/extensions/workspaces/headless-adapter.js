import * as fs from "fs";
import * as path from "path";
import { ModelResolver } from "../models/model-resolver.js";
import { appendSessionEvent, getRuntimeSessionId } from "../sessions/session-manager.js";
function resolveRoleModel(role) {
    return ModelResolver.getModel(role);
}
export class HeadlessWorkspaceAdapter {
    name = "Regular Headless Workspace (No Tmux)";
    isAvailable() {
        return true;
    }
    setupLayout(_layout = "windows", _sessionId) {
        console.log("ℹ️  Running in Regular Headless Mode (no tmux required).");
        return {
            orchestrator: "orchestrator",
            ba: "ba",
            developer: "developer",
            qa: "qa",
            reviewer: "reviewer"
        };
    }
    recoverMissingPanes(currentPanes, _sessionId) {
        return currentPanes;
    }
    async sendPrompt(targetRole, promptText) {
        try {
            const sessionId = getRuntimeSessionId();
            const model = resolveRoleModel(targetRole);
            appendSessionEvent(sessionId, {
                eventId: `evt_${Date.now()}`,
                type: "headless_prompt",
                targetRole,
                model: model || "default",
                prompt: promptText,
                timestamp: new Date().toISOString()
            });
            const eventsPath = path.join(process.cwd(), ".squadloop", "events.jsonl");
            fs.mkdirSync(path.dirname(eventsPath), { recursive: true });
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
