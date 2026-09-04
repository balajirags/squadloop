import { execSync, spawnSync } from "child_process";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { ModelResolver } from "../models/model-resolver.js";
import { getRuntimeSessionId, getSessionName, normalizeSessionId, readActiveTask } from "../sessions/session-manager.js";
function cleanModelString(raw) {
    let val = raw.trim();
    if (val.includes("#")) {
        val = val.split("#")[0].trim();
    }
    return val.replace(/^["']|["']$/g, "").trim();
}
function cleanPaneId(raw) {
    const match = String(raw).match(/%[0-9]+/);
    return match ? match[0] : String(raw).trim().split("\n")[0];
}
function resolvePaneTarget(target, targetRole, sessionId) {
    const currentRuntimeSession = getRuntimeSessionId();
    const effectiveSessionId = sessionId || currentRuntimeSession;
    const expectedSessionName = getSessionName(effectiveSessionId);
    // 0. If target is an explicit session-prefixed target (e.g. session:window or session:window.pane), verify directly
    if (target && (target.includes(":") || target.includes("."))) {
        const check = spawnSync("tmux", ["display-message", "-p", "-t", target, "#{pane_id}"], { encoding: "utf-8" });
        if (check.status === 0 && check.stdout && check.stdout.trim()) {
            return target;
        }
    }
    // 1. If target is %paneId, check directly if pane exists in tmux
    if (target && target.startsWith("%")) {
        const check = spawnSync("tmux", ["display-message", "-p", "-t", target, "#{pane_id}"], { encoding: "utf-8" });
        if (check.status === 0 && check.stdout && check.stdout.trim() === target) {
            return target;
        }
    }
    // 2. Check activeTask mapped panes for targetRole or target string
    const role = (targetRole || (target && !target.startsWith("%") ? target : "")).toLowerCase();
    const activeTask = readActiveTask(effectiveSessionId);
    if (role && activeTask?.panes?.[role]) {
        const paneId = activeTask.panes[role];
        if (paneId) {
            const check = spawnSync("tmux", ["display-message", "-p", "-t", paneId, "#{pane_id}"], { encoding: "utf-8" });
            if (check.status === 0 && check.stdout && check.stdout.trim() === paneId) {
                return paneId;
            }
        }
    }
    // 3. Fallback to session:window target (for windows mode)
    if (role) {
        if (spawnSync("tmux", ["has-session", "-t", `${expectedSessionName}:${role}`], { stdio: "ignore" }).status === 0) {
            return `${expectedSessionName}:${role}`;
        }
        const roleIndices = { orchestrator: 0, ba: 1, qa: 2, developer: 3, reviewer: 4 };
        if (role in roleIndices) {
            const idx = roleIndices[role];
            return `${expectedSessionName}:team.${idx}`;
        }
    }
    return target;
}
function resolveRoleModel(role) {
    return ModelResolver.getModel(role);
}
function getSessionNameFor(sessionId) {
    return getSessionName(sessionId || process.env.SQUADLOOP_SESSION_ID || "default");
}
function getAgentCommand(role, sessionId) {
    const model = resolveRoleModel(role);
    const agentFile = `.squadloop/agents/${role}.md`;
    let targetPromptPath = agentFile;
    if (fs.existsSync(agentFile)) {
        try {
            const rawContent = fs.readFileSync(agentFile, "utf-8");
            const stripped = rawContent.replace(/^\s*---[\s\S]*?---\s*/, "");
            const cleanFile = path.join(os.tmpdir(), `squadloop-system-prompt-${role}.md`);
            fs.writeFileSync(cleanFile, stripped, "utf-8");
            targetPromptPath = cleanFile;
        }
        catch {
            // Fallback
        }
    }
    const provider = model && model.includes("/") ? model.split("/")[0] : null;
    const providerFlag = provider ? ` --provider "${provider}"` : "";
    const modelFlag = model ? ` --model "${model}"` : "";
    const apiKeys = [
        "GEMINI_API_KEY",
        "GOOGLE_API_KEY",
        "GOOGLE_GENERATIVE_AI_API_KEY",
        "ANTHROPIC_API_KEY",
        "OPENAI_API_KEY",
        "DEEPSEEK_API_KEY",
        "OPENROUTER_API_KEY",
        "MISTRAL_API_KEY",
        "GROQ_API_KEY"
    ];
    const envVars = [
        "CONFIG_DIR_NAME=.squadloop",
        `PI_CODING_AGENT_DIR="$HOME/.squadloop/agent"`,
        `SQUADLOOP_SESSION_ID="${normalizeSessionId(sessionId || process.env.SQUADLOOP_SESSION_ID || "default")}"`
    ];
    for (const k of apiKeys) {
        if (process.env[k]) {
            envVars.push(`${k}="${process.env[k]}"`);
        }
    }
    const agentEnv = `env ${envVars.join(" ")}`;
    const globalMandateFile = path.join(process.cwd(), ".squadloop", "prompts", "global-mandate.md");
    const globalMandateFlag = fs.existsSync(globalMandateFile) ? ` --append-system-prompt "${globalMandateFile}"` : "";
    return `${agentEnv} pi -e .squadloop/extensions/index.js --approve${globalMandateFlag} --append-system-prompt "${targetPromptPath}"${providerFlag}${modelFlag}; exec bash`;
}
export class TmuxWorkspaceAdapter {
    name = "Tmux Workspace";
    isAvailable() {
        try {
            execSync("tmux -V", { stdio: "ignore" });
            return true;
        }
        catch {
            return false;
        }
    }
    setupLayout(layout = "windows", sessionId) {
        if (layout === "windows") {
            return this.setup5WindowLayout(sessionId);
        }
        return this.setup5PaneLayout(sessionId);
    }
    setup5PaneLayout(sessionId) {
        const sessionName = getSessionNameFor(sessionId);
        try {
            execSync(`tmux kill-session -t ${sessionName} 2>/dev/null`, { stdio: "ignore" });
        }
        catch {
            // Ignore
        }
        const rawOrch = execSync(`tmux new-session -d -s ${sessionName} -n team -P -F "#{pane_id}" "${getAgentCommand("orchestrator", sessionId)}"`).toString();
        const orchestratorPane = cleanPaneId(rawOrch);
        const rawBa = execSync(`tmux split-window -v -t ${orchestratorPane} -P -F "#{pane_id}" "${getAgentCommand("ba", sessionId)}"`).toString();
        const baPane = cleanPaneId(rawBa);
        const rawDev = execSync(`tmux split-window -h -t ${baPane} -P -F "#{pane_id}" "${getAgentCommand("developer", sessionId)}"`).toString();
        const devPane = cleanPaneId(rawDev);
        const rawQa = execSync(`tmux split-window -v -t ${baPane} -P -F "#{pane_id}" "${getAgentCommand("qa", sessionId)}"`).toString();
        const qaPane = cleanPaneId(rawQa);
        const rawRev = execSync(`tmux split-window -v -t ${devPane} -P -F "#{pane_id}" "${getAgentCommand("reviewer", sessionId)}"`).toString();
        const reviewerPane = cleanPaneId(rawRev);
        try {
            execSync(`tmux set-option -w -t ${sessionName} allow-rename off`);
            execSync(`tmux set-window-option -t ${sessionName} automatic-rename off`);
            execSync(`tmux set-window-option -t ${sessionName} pane-border-status top`);
            execSync(`tmux set-window-option -t ${sessionName} pane-border-style "fg=blue"`);
            execSync(`tmux set-window-option -t ${sessionName} pane-active-border-style "fg=green,bold"`);
            execSync(`tmux set-window-option -t ${sessionName} pane-border-format "#[fg=black,bg=cyan,bold] #{@persona} #[default]"`);
            execSync(`tmux set-window-option -g pane-border-status top`);
            execSync(`tmux set-window-option -g pane-border-format "#[fg=black,bg=cyan,bold] #{@persona} #[default]"`);
            execSync(`tmux set-option -p -t ${orchestratorPane} @persona "[ SQUADLOOP :: MASTER ORCHESTRATOR ]"`);
            execSync(`tmux set-option -p -t ${baPane} @persona "[ SQUADLOOP :: BUSINESS ANALYST (BA) ]"`);
            execSync(`tmux set-option -p -t ${devPane} @persona "[ SQUADLOOP :: DEVELOPER (DEV) ]"`);
            execSync(`tmux set-option -p -t ${qaPane} @persona "[ SQUADLOOP :: QUALITY ANALYST (QA) ]"`);
            execSync(`tmux set-option -p -t ${reviewerPane} @persona "[ SQUADLOOP :: CODE REVIEWER (REVIEWER) ]"`);
            execSync(`tmux resize-pane -t ${orchestratorPane} -y 25%`);
            execSync(`tmux set-option -t ${sessionName} status-style "bg=black,fg=cyan"`);
            execSync(`tmux set-option -t ${sessionName} status-left "#[fg=black,bg=green,bold] 🚀 SquadLoop #[default] "`);
            execSync(`tmux set-option -t ${sessionName} status-right "#[fg=cyan,bold] %Y-%m-%d %H:%M #[default]"`);
        }
        catch {
            // Non-fatal
        }
        return {
            orchestrator: orchestratorPane,
            ba: baPane,
            developer: devPane,
            qa: qaPane,
            reviewer: reviewerPane
        };
    }
    setup5WindowLayout(sessionId) {
        const sessionName = getSessionNameFor(sessionId);
        try {
            execSync(`tmux kill-session -t ${sessionName} 2>/dev/null`, { stdio: "ignore" });
        }
        catch {
            // Ignore
        }
        const orchestratorPane = cleanPaneId(execSync(`tmux new-session -d -s ${sessionName} -n orchestrator -P -F "#{pane_id}" "${getAgentCommand("orchestrator", sessionId)}"`).toString());
        const baPane = cleanPaneId(execSync(`tmux new-window -t ${sessionName} -n ba -P -F "#{pane_id}" "${getAgentCommand("ba", sessionId)}"`).toString());
        const devPane = cleanPaneId(execSync(`tmux new-window -t ${sessionName} -n developer -P -F "#{pane_id}" "${getAgentCommand("developer", sessionId)}"`).toString());
        const qaPane = cleanPaneId(execSync(`tmux new-window -t ${sessionName} -n qa -P -F "#{pane_id}" "${getAgentCommand("qa", sessionId)}"`).toString());
        const reviewerPane = cleanPaneId(execSync(`tmux new-window -t ${sessionName} -n reviewer -P -F "#{pane_id}" "${getAgentCommand("reviewer", sessionId)}"`).toString());
        try {
            execSync(`tmux set-option -t ${sessionName} allow-rename off`);
            execSync(`tmux set-window-option -t ${sessionName} automatic-rename off`);
            execSync(`tmux select-window -t ${sessionName}:orchestrator`);
            execSync(`tmux set-option -t ${sessionName} status-style "bg=black,fg=cyan"`);
            execSync(`tmux set-option -t ${sessionName} status-left "#[fg=black,bg=green,bold] 🚀 SquadLoop #[default] "`);
            execSync(`tmux set-option -t ${sessionName} status-right "#[fg=cyan,bold] %Y-%m-%d %H:%M #[default]"`);
            execSync(`tmux set-window-option -t ${sessionName} window-status-style "fg=colour245,bg=black"`);
            execSync(`tmux set-window-option -t ${sessionName} window-status-format " #[fg=colour245]#I: #[fg=white,bold]#W #[default]"`);
            execSync(`tmux set-window-option -t ${sessionName} window-status-current-style "fg=black,bg=yellow,bold"`);
            execSync(`tmux set-window-option -t ${sessionName} window-status-current-format "#[fg=black,bg=yellow,bold] #I: #W* #[default]"`);
            execSync(`tmux set-window-option -t ${sessionName} window-status-activity-style "fg=black,bg=magenta,bold"`);
            execSync(`tmux set-option -t ${sessionName} monitor-activity on`);
        }
        catch {
            // Ignore
        }
        return {
            orchestrator: orchestratorPane,
            ba: baPane,
            developer: devPane,
            qa: qaPane,
            reviewer: reviewerPane
        };
    }
    recoverMissingPanes(currentPanes, _sessionId) {
        return currentPanes;
    }
    async sendPrompt(paneTarget, promptText, clear = true, targetRole, sessionId) {
        try {
            const resolved = resolvePaneTarget(paneTarget, targetRole, sessionId);
            if (!resolved)
                return;
            if (clear) {
                spawnSync("tmux", ["send-keys", "-t", resolved, "/clear", "Enter"]);
                await new Promise(r => setTimeout(r, 600));
            }
            const tmpFile = path.join(os.tmpdir(), `squadloop-prompt-${Date.now()}-${Math.random().toString(36).slice(2)}.txt`);
            fs.writeFileSync(tmpFile, promptText, "utf-8");
            spawnSync("tmux", ["load-buffer", tmpFile]);
            spawnSync("tmux", ["paste-buffer", "-t", resolved]);
            await new Promise(r => setTimeout(r, 150));
            spawnSync("tmux", ["send-keys", "-t", resolved, "Enter"]);
            try {
                fs.unlinkSync(tmpFile);
            }
            catch {
                // Non-fatal
            }
        }
        catch {
            // Ignore if tmux session not attached
        }
    }
    startAppServerWindow(startCommand) {
        const sessionName = getSessionNameFor();
        const windowName = "app-server";
        try {
            const windows = execSync(`tmux list-windows -t ${sessionName} -F "#{window_name}"`).toString();
            if (windows.includes(windowName)) {
                return `${sessionName}:app-server`;
            }
            const cmd = startCommand || "echo '=== APP SERVER WINDOW ==='; exec bash";
            execSync(`tmux new-window -t ${sessionName} -n ${windowName} "${cmd.replace(/"/g, '\\"')}"`);
            return `${sessionName}:${windowName}`;
        }
        catch {
            return `${sessionName}:0`;
        }
    }
}
