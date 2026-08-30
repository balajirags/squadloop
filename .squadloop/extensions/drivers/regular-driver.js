export class RegularDriver {
    id = "regular";
    name = "Regular Standalone Terminal Driver";
    isAvailable() {
        return true;
    }
    hasActiveSession(_sessionId) {
        return true;
    }
    setupTeamLayout(layout = "panes", _sessionId) {
        return {
            orchestrator: "orchestrator",
            ba: "ba",
            developer: "developer",
            qa: "qa",
            reviewer: "reviewer"
        };
    }
    async sendPrompt(paneTarget, promptText, clear = false) {
        console.log(`[${paneTarget.toUpperCase()}] ${promptText}`);
    }
    attachSession(_sessionId) {
        // Direct terminal session, no attachment required
    }
    stopSession(_sessionId) {
        // No-op in standalone mode
    }
    recoverMissingPanes(currentPanes) {
        return currentPanes;
    }
}
