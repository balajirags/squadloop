import teamOrchestrator from "./team-orchestrator.js";
import { registerSecurityGuard } from "./security-guard.js";
export default function (pi) {
    registerSecurityGuard(pi);
    teamOrchestrator(pi);
}
