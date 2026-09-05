const ROLES = ["orchestrator", "ba", "developer", "qa", "reviewer"];
export class PromptSyncEngine {
    static syncAllPrompts() {
        // Single source of truth is .squadloop/agents/*.md
        // Model configuration is resolved directly via ModelResolver and passed via --model flag on agent launch.
    }
}
