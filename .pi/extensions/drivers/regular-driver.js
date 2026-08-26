export class RegularDriver {
    id = "regular";
    name = "Regular Standalone Terminal Driver";
    isAvailable() {
        return true;
    }
    hasActiveSession() {
        return true;
    }
    setupTeamLayout(layout = "panes") {
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
    attachSession() {
        // Direct terminal session, no attachment required
    }
    recoverMissingPanes(currentPanes) {
        return currentPanes;
    }
}
