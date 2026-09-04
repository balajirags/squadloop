import { execSync, spawnSync } from "child_process";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import type { ITerminalDriver, WorkspacePanes } from "./terminal-driver-interface.js";
import { ModelResolver } from "../models/model-resolver.js";
import { getRuntimeSessionId, getSessionName, normalizeSessionId, readActiveTask } from "../sessions/session-manager.js";

function cleanPaneId(raw: string): string {
  const match = String(raw).match(/%[0-9]+/);
  return match ? match[0] : String(raw).trim().split("\n")[0];
}

function getSkillFlagsForRole(role: string): string {
  const agentFile = path.join(process.cwd(), ".squadloop", "agents", `${role}.md`);
  const skillsDir = path.join(process.cwd(), ".squadloop", "skills");
  let flags = fs.existsSync(skillsDir) ? ` --skill "${skillsDir}"` : "";

  if (fs.existsSync(agentFile)) {
    try {
      const content = fs.readFileSync(agentFile, "utf-8");
      const match = content.match(/^skills:\s*(.+)$/m);
      if (match && match[1]) {
        const skillList = match[1].split(",").map(s => s.trim()).filter(Boolean);
        for (const skill of skillList) {
          const specificPath = path.join(skillsDir, skill);
          if (fs.existsSync(specificPath)) {
            flags += ` --skill "${specificPath}"`;
          }
        }
      }
    } catch {
      // Non-fatal
    }
  }

  return flags;
}

function getAgentCommand(role: string, sessionId?: string): string {
  const model = ModelResolver.getModel(role);
  const agentFile = `.squadloop/agents/${role}.md`;

  let targetPromptPath = agentFile;
  if (fs.existsSync(agentFile)) {
    try {
      const rawContent = fs.readFileSync(agentFile, "utf-8");
      const stripped = rawContent.replace(/^\s*---[\s\S]*?---\s*/, "");
      const cleanFile = path.join(os.tmpdir(), `squadloop-system-prompt-${role}.md`);
      fs.writeFileSync(cleanFile, stripped, "utf-8");
      targetPromptPath = cleanFile;
    } catch {
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
    "PI_QUIET_STARTUP=1",
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
  const skillsFlag = getSkillFlagsForRole(role);
  return `${agentEnv} pi -e .squadloop/extensions/index.js --approve${skillsFlag}${globalMandateFlag} --append-system-prompt "${targetPromptPath}"${providerFlag}${modelFlag}; exec bash`;
}

function resolvePaneTarget(target: string, targetRole?: string, sessionId?: string): string {
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
  if (role && activeTask?.panes?.[role as keyof typeof activeTask.panes]) {
    const paneId = activeTask.panes[role as keyof typeof activeTask.panes];
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
    const roleIndices: Record<string, number> = { orchestrator: 0, ba: 1, qa: 2, developer: 3, reviewer: 4 };
    if (role in roleIndices) {
      const idx = roleIndices[role];
      return `${expectedSessionName}:team.${idx}`;
    }
  }

  return target;
}

function resolveSessionName(sessionId?: string): string {
  return getSessionName(sessionId || process.env.SQUADLOOP_SESSION_ID || "default");
}

export class TmuxDriver implements ITerminalDriver {
  public readonly id = "tmux";
  public readonly name = "Tmux Terminal Driver";

  public isAvailable(): boolean {
    try {
      execSync("tmux -V", { stdio: "ignore" });
      return true;
    } catch {
      return false;
    }
  }

  public hasActiveSession(sessionId?: string): boolean {
    const sessionName = resolveSessionName(sessionId);
    return spawnSync("tmux", ["has-session", "-t", sessionName], { stdio: "ignore" }).status === 0;
  }

  public setupTeamLayout(layout: "panes" | "windows" = "windows", sessionId?: string): WorkspacePanes {
    if (layout === "windows") {
      return this.setup5WindowLayout(sessionId);
    }
    return this.setup5PaneLayout(sessionId);
  }

  private setup5PaneLayout(sessionId?: string): WorkspacePanes {
    const sessionName = resolveSessionName(sessionId);
    try {
      execSync(`tmux kill-session -t ${sessionName} 2>/dev/null`, { stdio: "ignore" });
    } catch {
      // Ignore
    }

    const orchestratorPane = cleanPaneId(execSync(
      `tmux new-session -d -s ${sessionName} -n team -P -F "#{pane_id}" "${getAgentCommand("orchestrator", sessionId)}"`
    ).toString());

    const baPane = cleanPaneId(execSync(
      `tmux split-window -v -t ${orchestratorPane} -P -F "#{pane_id}" "${getAgentCommand("ba", sessionId)}"`
    ).toString());

    const devPane = cleanPaneId(execSync(
      `tmux split-window -h -t ${baPane} -P -F "#{pane_id}" "${getAgentCommand("developer", sessionId)}"`
    ).toString());

    const qaPane = cleanPaneId(execSync(
      `tmux split-window -v -t ${baPane} -P -F "#{pane_id}" "${getAgentCommand("qa", sessionId)}"`
    ).toString());

    const reviewerPane = cleanPaneId(execSync(
      `tmux split-window -v -t ${devPane} -P -F "#{pane_id}" "${getAgentCommand("reviewer", sessionId)}"`
    ).toString());

    try {
      execSync(`tmux set-option -p -t ${orchestratorPane} @persona "[ SQUADLOOP :: MASTER ORCHESTRATOR ]"`);
      execSync(`tmux set-option -p -t ${baPane} @persona "[ SQUADLOOP :: BUSINESS ANALYST (BA) ]"`);
      execSync(`tmux set-option -p -t ${devPane} @persona "[ SQUADLOOP :: DEVELOPER (DEV) ]"`);
      execSync(`tmux set-option -p -t ${qaPane} @persona "[ SQUADLOOP :: QUALITY ANALYST (QA) ]"`);
      execSync(`tmux set-option -p -t ${reviewerPane} @persona "[ SQUADLOOP :: CODE REVIEWER (REVIEWER) ]"`);
    } catch {
      // Non-fatal
    }

    return { orchestrator: orchestratorPane, ba: baPane, developer: devPane, qa: qaPane, reviewer: reviewerPane };
  }

  private setup5WindowLayout(sessionId?: string): WorkspacePanes {
    const sessionName = resolveSessionName(sessionId);
    try {
      execSync(`tmux kill-session -t ${sessionName} 2>/dev/null`, { stdio: "ignore" });
    } catch {
      // Ignore
    }

    const orchestratorPane = cleanPaneId(execSync(
      `tmux new-session -d -s ${sessionName} -n orchestrator -P -F "#{pane_id}" "${getAgentCommand("orchestrator", sessionId)}"`
    ).toString());

    const baPane = cleanPaneId(execSync(
      `tmux new-window -t ${sessionName} -n ba -P -F "#{pane_id}" "${getAgentCommand("ba", sessionId)}"`
    ).toString());

    const devPane = cleanPaneId(execSync(
      `tmux new-window -t ${sessionName} -n developer -P -F "#{pane_id}" "${getAgentCommand("developer", sessionId)}"`
    ).toString());

    const qaPane = cleanPaneId(execSync(
      `tmux new-window -t ${sessionName} -n qa -P -F "#{pane_id}" "${getAgentCommand("qa", sessionId)}"`
    ).toString());

    const reviewerPane = cleanPaneId(execSync(
      `tmux new-window -t ${sessionName} -n reviewer -P -F "#{pane_id}" "${getAgentCommand("reviewer", sessionId)}"`
    ).toString());

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
    } catch {
      // Non-fatal
    }

    return { orchestrator: orchestratorPane, ba: baPane, developer: devPane, qa: qaPane, reviewer: reviewerPane };
  }

  public async sendPrompt(paneTarget: string, promptText: string, clear = true, targetRole?: string, sessionId?: string): Promise<void> {
    try {
      const resolved = resolvePaneTarget(paneTarget, targetRole, sessionId);
      if (!resolved) return;

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
      } catch {
        // Non-fatal
      }
    } catch {
      // Ignore
    }
  }

  public attachSession(sessionId?: string): void {
    const sessionName = resolveSessionName(sessionId);
    try {
      if (spawnSync("tmux", ["has-session", "-t", `${sessionName}:orchestrator`], { stdio: "ignore" }).status === 0) {
        spawnSync("tmux", ["select-window", "-t", `${sessionName}:orchestrator`]);
      } else {
        spawnSync("tmux", ["select-window", "-t", `${sessionName}:1`]);
      }
    } catch {
      // Non-fatal
    }

    const inTmux = Boolean(process.env.TMUX) || spawnSync("tmux", ["display-message"], { stdio: "ignore" }).status === 0;
    if (inTmux) {
      try {
        spawnSync("tmux", ["switch-client", "-t", `${sessionName}:orchestrator`], { stdio: "inherit" });
        return;
      } catch {
        try {
          spawnSync("tmux", ["switch-client", "-t", sessionName], { stdio: "inherit" });
          return;
        } catch {
          // Fallback
        }
      }
    }
    const env = { ...process.env };
    delete env.TMUX;
    spawnSync("tmux", ["attach", "-t", `${sessionName}:orchestrator`], { stdio: "inherit", env });
  }

  public stopSession(sessionId?: string): void {
    const sessionName = resolveSessionName(sessionId);
    spawnSync("tmux", ["kill-session", "-t", sessionName], { stdio: "inherit" });
  }

  public recoverMissingPanes(currentPanes: WorkspacePanes): WorkspacePanes {
    return currentPanes;
  }
}
