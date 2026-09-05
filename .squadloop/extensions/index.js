import teamOrchestrator from "./team-orchestrator.js";
import { registerSecurityGuard } from "./security-guard.js";
import { registerTeamTools } from "./team-tools.js";
import { getRuntimeSessionId } from "./sessions/session-manager.js";
import { JsonFileStateStore } from "./sessions/json-file-state-store.js";
export default function (pi) {
    registerSecurityGuard(pi);
    registerTeamTools(pi);
    teamOrchestrator(pi);
    if (typeof pi.on === "function") {
        pi.on("turn_end", async (_event, ctx) => {
            try {
                const sessionId = getRuntimeSessionId();
                const store = new JsonFileStateStore();
                const current = await store.readActiveTask(sessionId);
                if (current &&
                    !current.isDone &&
                    current.microStep &&
                    current.targetRole &&
                    current.targetRole !== "orchestrator") {
                    // Keep active FSM turn moving automatically if agent completed a file edit or bash command
                }
            }
            catch {
                // Non-fatal
            }
        });
    }
}
