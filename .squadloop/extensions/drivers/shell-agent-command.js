import * as fs from "fs";
import * as path from "path";
import { ModelResolver } from "../models/model-resolver.js";
import { normalizeSessionId } from "../sessions/session-manager.js";
import { roleTools } from "./role-tools.js";
/**
 * Builds the shell command string used to launch a persona's `pi` process for
 * drivers that hand a plain command string to another program (herdr, iTerm2
 * AppleScript `write text`) rather than an argv array like tmux-driver.ts.
 *
 * Previously duplicated byte-for-byte in both herdr-driver.ts and
 * iterm2-driver.ts, including a gap neither copy had: SQUADLOOP_ROLE was
 * never set, so anything keyed off it (team-tools.ts's role fallback, and
 * the continuous-execution/idle-heartbeat logic in index.ts) was silently
 * inert on these two drivers. Also never appended global-mandate.md, so the
 * shared safety rules never loaded there either — tmux-driver.ts's
 * agentArgs() does both.
 */
export function buildShellAgentCommand(role, sessionId) {
    const model = ModelResolver.getModel(role);
    const agentFile = `.squadloop/agents/${role}.md`;
    const provider = model && model.includes("/") ? model.split("/")[0] : null;
    const providerFlag = provider ? ` --provider "${provider}"` : "";
    const modelFlag = model ? ` --model "${model}"` : "";
    const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "";
    const geminiEnv = geminiKey ? ` GEMINI_API_KEY="${geminiKey}"` : "";
    const normalizedSessionId = normalizeSessionId(sessionId || process.env.SQUADLOOP_SESSION_ID || "default");
    const agentEnv = `env CONFIG_DIR_NAME=.squadloop PI_CODING_AGENT_DIR="$HOME/.squadloop/agent" SQUADLOOP_SESSION_ID="${normalizedSessionId}" SQUADLOOP_ROLE="${role}"${geminiEnv}`;
    const toolsFlag = ` --tools "${(roleTools[role] || roleTools.developer).join(",")}"`;
    // CONFIG_DIR_NAME above does not retarget pi's project-settings discovery to
    // .squadloop/ (it's a package.json-time constant in pi itself, not an env
    // var it reads) — auto-discovery only ever looks at .pi/, which no
    // SquadLoop project has. -e loads the extension by explicit path instead;
    // this is required, not optional, or the persona gets zero custom tools.
    const extension = path.join(process.cwd(), ".squadloop", "extensions", "index.js");
    const extensionFlag = fs.existsSync(extension) ? ` -e "${extension}"` : "";
    // Same discovery gap applies to skills: never previously passed here at all.
    const skills = path.join(process.cwd(), ".squadloop", "skills");
    const skillFlag = fs.existsSync(skills) ? ` --skill "${skills}"` : "";
    const mandate = path.join(process.cwd(), ".squadloop", "prompts", "global-mandate.md");
    const mandateFlag = role !== "orchestrator" && fs.existsSync(mandate) ? ` --append-system-prompt "${mandate}"` : "";
    return `${agentEnv} pi --approve${toolsFlag}${extensionFlag}${skillFlag}${mandateFlag} --append-system-prompt "${agentFile}"${providerFlag}${modelFlag}`;
}
