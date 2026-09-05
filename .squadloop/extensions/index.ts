import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import teamOrchestrator from "./team-orchestrator.js";
import { registerSecurityGuard } from "./security-guard.js";
import { registerTeamTools } from "./team-tools.js";
import { getRuntimeSessionId } from "./sessions/session-manager.js";
import { JsonFileStateStore } from "./sessions/json-file-state-store.js";

export default function (pi: ExtensionAPI) {
  registerSecurityGuard(pi);
  registerTeamTools(pi);
  teamOrchestrator(pi);

  if (typeof (pi as any).on === "function") {
    (pi as any).on("turn_end", async (_event: any, ctx: any) => {
      try {
        const sessionId = getRuntimeSessionId();
        const store = new JsonFileStateStore();
        const current = await store.readActiveTask(sessionId);

        if (
          current &&
          !current.isDone &&
          current.microStep &&
          current.targetRole &&
          current.targetRole !== "orchestrator"
        ) {
          // Keep active FSM turn moving automatically if agent completed a file edit or bash command
        }
      } catch {
        // Non-fatal
      }
    });
  }
}
