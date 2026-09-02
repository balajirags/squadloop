import teamOrchestrator from "./team-orchestrator.js";
import { registerSecurityGuard } from "./security-guard.js";
import { registerTeamTools } from "./team-tools.js";
export default function (pi) {
    registerSecurityGuard(pi);
    registerTeamTools(pi);
    teamOrchestrator(pi);
}
