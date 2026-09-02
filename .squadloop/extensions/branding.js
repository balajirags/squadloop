import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { getRuntimeSessionId, readActiveTask } from "./sessions/session-manager.js";
const ROLE_META = {
    orchestrator: {
        badge: "🟢",
        label: "MASTER ORCHESTRATOR",
        tmuxStyle: "fg=green",
        tmuxActiveStyle: "fg=green,bold",
        terminalLabel: "🟢 MASTER ORCHESTRATOR"
    },
    ba: {
        badge: "🟡",
        label: "BUSINESS ANALYST",
        tmuxStyle: "fg=yellow",
        tmuxActiveStyle: "fg=yellow,bold",
        terminalLabel: "🟡 BUSINESS ANALYST"
    },
    developer: {
        badge: "🔵",
        label: "DEVELOPER",
        tmuxStyle: "fg=blue",
        tmuxActiveStyle: "fg=blue,bold",
        terminalLabel: "🔵 DEVELOPER"
    },
    qa: {
        badge: "🟣",
        label: "QUALITY ANALYST",
        tmuxStyle: "fg=magenta",
        tmuxActiveStyle: "fg=magenta,bold",
        terminalLabel: "🟣 QUALITY ANALYST"
    },
    reviewer: {
        badge: "🟦",
        label: "CODE REVIEWER",
        tmuxStyle: "fg=cyan",
        tmuxActiveStyle: "fg=cyan,bold",
        terminalLabel: "🟦 CODE REVIEWER"
    }
};
let currentRole = "orchestrator";
let currentTurn = 0;
export const SQUADLOOP_THEME_NAME = "squadloop";
export function isSquadloopRole(value) {
    return value === "orchestrator" || value === "ba" || value === "developer" || value === "qa" || value === "reviewer";
}
export function getRoleMeta(role = currentRole) {
    return ROLE_META[role];
}
export function getCurrentRole() {
    return currentRole;
}
export function setCurrentRole(role) {
    if (isSquadloopRole(role))
        currentRole = role;
}
export function setRoleFromSystemPrompt(systemPrompt) {
    if (!systemPrompt)
        return;
    const match = systemPrompt.match(/\.squadloop[\\/]+agents[\\/]+([a-z-]+)\.md/i);
    if (match && isSquadloopRole(match[1]?.toLowerCase())) {
        currentRole = match[1].toLowerCase();
    }
}
export function getRoleTitle(role = currentRole) {
    return ROLE_META[role].terminalLabel;
}
export function getTmuxBorderStyle(role = currentRole) {
    return ROLE_META[role].tmuxStyle;
}
export function getTmuxActiveBorderStyle(role = currentRole) {
    return ROLE_META[role].tmuxActiveStyle;
}
export function getRoleBadge(role = currentRole) {
    return ROLE_META[role].badge;
}
export function getRoleLabel(role = currentRole) {
    return ROLE_META[role].label;
}
export function getSessionConfig(sessionId = getRuntimeSessionId()) {
    const configPath = path.join(process.cwd(), ".squadloop", "config.json");
    let mode = "loop-hitl";
    let layout = "panes";
    let driver = "tmux";
    if (fs.existsSync(configPath)) {
        try {
            const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
            mode = config.mode || config.hitl || "loop-hitl";
            layout = config.layout || "panes";
            driver = config.driver || config.workspaceMode || "tmux";
        }
        catch {
            // Ignore
        }
    }
    const activeTask = readActiveTask(sessionId);
    return {
        sessionId,
        mode,
        layout,
        driver,
        activeIssueId: activeTask?.activeIssueId || "",
        status: activeTask?.status || "awaiting-human-input",
        reworkCount: activeTask?.reworkCount || 0,
        tokenStats: activeTask?.tokenStats,
        notes: activeTask?.notes
    };
}
export function formatTokenSummary(tokenStats) {
    if (!tokenStats)
        return "0 tokens ($0.00)";
    const total = Number(tokenStats.totalTokens || 0);
    const cost = Number(tokenStats.estimatedCostUsd || 0);
    const tokens = total >= 1000 ? `${(total / 1000).toFixed(1)}k` : total.toLocaleString();
    return `${tokens} tokens ($${cost.toFixed(2)})`;
}
export function formatStatusLabel(status) {
    return status.replace(/[-_]+/g, " ").trim() || "idle";
}
export function buildHeaderLines(ctx, snapshot = getSessionConfig()) {
    const theme = ctx.ui.theme;
    const role = getCurrentRole();
    const meta = getRoleMeta(role);
    const model = ctx.model ? `${ctx.model.provider || "model"}/${ctx.model.id || "unknown"}` : "no model selected";
    const issue = snapshot.activeIssueId ? `#${snapshot.activeIssueId}` : "none";
    const status = formatStatusLabel(snapshot.status).toUpperCase();
    const tokens = formatTokenSummary(snapshot.tokenStats);
    const mode = snapshot.mode.toUpperCase();
    const driver = snapshot.driver.toUpperCase();
    return [
        theme.fg("accent", `${meta.badge} SQUADLOOP :: Autonomous Software Team`),
        `${theme.fg("borderAccent", "Role:")} ${theme.bold(meta.label)} | ${theme.fg("muted", `Model: ${model}`)}`,
        `${theme.fg("warning", `Task: ${issue}`)} ${theme.fg("dim", `[${status}]`)} | ${theme.fg("muted", `Mode: ${mode}`)} | ${theme.fg("muted", `Driver: ${driver}`)} | ${theme.fg("success", `Tokens: ${tokens}`)}`
    ];
}
export function buildFooterText(ctx, snapshot = getSessionConfig()) {
    const theme = ctx.ui.theme;
    const role = getCurrentRole();
    const meta = getRoleMeta(role);
    const model = ctx.model ? `${ctx.model.provider || "model"}/${ctx.model.id || "unknown"}` : "no-model";
    const issue = snapshot.activeIssueId ? `#${snapshot.activeIssueId}` : "idle";
    const status = formatStatusLabel(snapshot.status).toUpperCase();
    const tokens = formatTokenSummary(snapshot.tokenStats);
    const turn = currentTurn > 0 ? ` · turn ${currentTurn}` : "";
    return `${theme.fg("accent", `${meta.badge} SquadLoop`)} | ${theme.fg("borderAccent", meta.label)} | ${theme.fg("warning", issue)} :: ${theme.fg("dim", status)} :: ${theme.fg("success", tokens)} :: ${theme.fg("muted", model)}${turn}`;
}
export function refreshBrandingUi(ctx) {
    if (!ctx.hasUI)
        return;
    try {
        ctx.ui.setHeader((_tui, theme) => ({
            render() {
                return buildHeaderLines({ ...ctx, ui: { ...ctx.ui, theme } });
            },
            invalidate() { }
        }));
        ctx.ui.setWidget("squadloop-header", buildHeaderLines(ctx));
        ctx.ui.setStatus("squadloop-footer", buildFooterText(ctx));
    }
    catch {
        // Non-fatal
    }
}
export function noteTurnStart() {
    currentTurn += 1;
    return currentTurn;
}
export function noteTurnEnd() {
    return currentTurn;
}
export function applyTmuxRoleStyling(sessionName, panes) {
    try {
        execSync(`tmux set-option -w -t ${sessionName} allow-rename off`);
        execSync(`tmux set-window-option -t ${sessionName} automatic-rename off`);
        execSync(`tmux set-window-option -t ${sessionName} pane-border-status top`);
        execSync(`tmux set-window-option -t ${sessionName} pane-border-format "#[fg=black,bg=cyan,bold] #{@persona} #[default]"`);
        execSync(`tmux set-window-option -t ${sessionName} pane-border-style "fg=cyan"`);
        execSync(`tmux set-window-option -t ${sessionName} pane-active-border-style "fg=cyan,bold"`);
        const roleMap = {
            orchestrator: "orchestrator",
            ba: "ba",
            developer: "developer",
            qa: "qa",
            reviewer: "reviewer"
        };
        for (const [key, pane] of Object.entries(panes)) {
            const role = roleMap[key];
            const meta = getRoleMeta(role);
            execSync(`tmux set-option -p -t ${pane} @persona "${meta.terminalLabel}"`);
            execSync(`tmux set-option -p -t ${pane} pane-border-style "${meta.tmuxStyle}"`);
            execSync(`tmux set-option -p -t ${pane} pane-active-border-style "${meta.tmuxActiveStyle}"`);
        }
        execSync(`tmux set-option -t ${sessionName} status-style "bg=black,fg=cyan"`);
        execSync(`tmux set-option -t ${sessionName} status-left "#[fg=black,bg=green,bold] 🚀 SquadLoop #[default] "`);
        execSync(`tmux set-option -t ${sessionName} status-right "#[fg=cyan,bold] %Y-%m-%d %H:%M #[default]"`);
    }
    catch {
        // Non-fatal
    }
}
