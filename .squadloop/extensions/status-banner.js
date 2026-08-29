export function registerStatusBanner(pi) {
    pi.on("session_start", async (_event, ctx) => {
        // Show notification status bar banner
        if (ctx.ui?.notify) {
            ctx.ui.notify("PI MULTI-AGENT TEAM SESSION ACTIVE", "info");
        }
    });
}
