import { execSync, spawnSync } from "child_process";
export class HerdrDriver {
    id = "herdr";
    name = "Herdr Terminal Driver";
    isAvailable() {
        try {
            execSync("herdr --version", { stdio: "ignore" });
            return true;
        }
        catch {
            return false;
        }
    }
    hasActiveSession() {
        try {
            const res = execSync("herdr status 2>/dev/null").toString();
            return res.includes("squadloop");
        }
        catch {
            return false;
        }
    }
    setupTeamLayout(layout = "panes") {
        const modeFlag = layout === "windows" ? "--tabs" : "--panes";
        try {
            execSync(`herdr spawn squadloop ${modeFlag} --roles orchestrator,ba,developer,qa,reviewer`, { stdio: "ignore" });
        }
        catch {
            // Fallback log
        }
        return {
            orchestrator: "herdr-orch",
            ba: "herdr-ba",
            developer: "herdr-dev",
            qa: "herdr-qa",
            reviewer: "herdr-rev"
        };
    }
    async sendPrompt(paneTarget, promptText, clear = false) {
        try {
            const escaped = promptText.replace(/"/g, '\\"');
            execSync(`herdr send --target ${paneTarget} "${escaped}"`, { stdio: "ignore" });
        }
        catch {
            // Ignore
        }
    }
    attachSession() {
        spawnSync("herdr", ["attach", "squadloop"], { stdio: "inherit" });
    }
    recoverMissingPanes(currentPanes) {
        return currentPanes;
    }
}
