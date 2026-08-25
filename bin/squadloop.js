#!/usr/bin/env node

import { execSync, spawnSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { WorkspaceFactory } from "../dist/.pi/extensions/workspaces/workspace-factory.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packageRoot = path.resolve(__dirname, "..");

const args = process.argv.slice(2);
const command = args[0]?.toLowerCase() || "help";

function printLogo() {
  console.log(`
  ██████╗  ██████╗ ██╗   ██╗ █████╗ ██████╗ ██╗      ██████╗  ██████╗ ██████╗ 
 ██╔════╝ ██╔═══██╗██║   ██║██╔══██╗██╔══██╗██║     ██╔═══██╗██╔═══██╗██╔══██╗
 ███████╗ ██║   ██║██║   ██║███████║██║  ██║██║     ██║   ██║██║   ██║██████╔╝
 ╚════██║ ██║▄▄ ██║██║   ██║██╔══██║██║  ██║██║     ██║   ██║██║   ██║██╔═══╝ 
 ███████║ ╚██████╔╝╚██████╔╝██║  ██║██████╔╝███████╗╚██████╔╝╚██████╔╝██║     
 ╚══════╝  ╚══▀▀═╝  ╚═════╝ ╚═╝  ╚═╝╚═════╝ ╚══════╝ ╚═════╝  ╚═════╝ ╚═╝     
 🚀 SquadLoop v1.0.0 — Your autonomous software team.
 ===================================================================
  `);
}

function showHelp() {
  printLogo();
  console.log(`
Usage: squadloop <command> [options]

Commands:
  start     Start a fresh SquadLoop session (resets active task log)
  resume    Resume active SquadLoop session from active task log
  init      Bootstrap SquadLoop context and templates into current directory
  attach    Attach to the active SquadLoop tmux workspace
  status    Display current active task status
  config    Display or edit .pi/team-config.json
  help      Display this help guide

Examples:
  squadloop start
  squadloop resume
  squadloop init
  squadloop attach
  squadloop config mode=loop layout=panes
  `);
}

function getConfig() {
  const configPath = path.join(process.cwd(), ".pi", "team-config.json");
  let config = {
    mode: "loop-hitl",
    layout: "panes",
    workspaceMode: "tmux",
    destructiveCommandPolicy: "ask-human",
    customProtectedFiles: [],
    panes: { orchestrator: "", ba: "", developer: "", qa: "", reviewer: "" }
  };

  if (fs.existsSync(configPath)) {
    try {
      const loaded = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      config = {
        mode: loaded.mode || "loop-hitl",
        layout: loaded.layout || "panes",
        workspaceMode: loaded.workspaceMode || "tmux",
        destructiveCommandPolicy: loaded.destructiveCommandPolicy || "ask-human",
        customProtectedFiles: loaded.customProtectedFiles || [],
        panes: loaded.panes || config.panes
      };
    } catch {
      // Default
    }
  }

  return config;
}

function saveConfig(config) {
  const configPath = path.join(process.cwd(), ".pi", "team-config.json");
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf-8");
}

function handleInit() {
  printLogo();
  console.log("📦 Bootstrapping SquadLoop files into current directory...");

  const cwd = process.cwd();

  // Copy .pi directory
  const sourcePi = path.join(packageRoot, ".pi");
  const targetPi = path.join(cwd, ".pi");
  if (fs.existsSync(sourcePi)) {
    fs.cpSync(sourcePi, targetPi, { recursive: true });
    console.log("  ✅ Created .pi/ configuration, extensions, agent personas, and models.example.json");
  }

  // Copy Agent.md
  const sourceAgent = path.join(packageRoot, "Agent.md");
  const targetAgent = path.join(cwd, "Agent.md");
  if (fs.existsSync(sourceAgent)) {
    fs.copyFileSync(sourceAgent, targetAgent);
    console.log("  ✅ Created Agent.md operational mandate");
  }

  // Copy project-context template if project-context.md doesn't exist
  const targetContext = path.join(cwd, "project-context.md");
  if (!fs.existsSync(targetContext)) {
    const sourceTemplate = path.join(packageRoot, ".pi", "templates", "project-context.template.md");
    if (fs.existsSync(sourceTemplate)) {
      fs.copyFileSync(sourceTemplate, targetContext);
      console.log("  ✅ Created project-context.md template");
    }
  }

  // Create docs directories
  fs.mkdirSync(path.join(cwd, "docs", "brd"), { recursive: true });
  fs.mkdirSync(path.join(cwd, "docs", "stories"), { recursive: true });
  console.log("  ✅ Created docs/brd/ and docs/stories/ template directories");

  console.log("\n🎉 SquadLoop initialization complete! Run 'squadloop start' to launch your team.");
  syncProjectModelsJson();
}

function checkPiInstalled() {
  try {
    execSync("pi --version", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function ensurePiInstalled() {
  if (!checkPiInstalled()) {
    printLogo();
    console.error(`
❌ ERROR: Pi Coding Agent ('pi') is not installed on this system.

SquadLoop is built on top of Pi Coding Agent and requires the 'pi' CLI executable.

To install Pi Coding Agent globally, run:
  npm install -g @earendil-works/pi-coding-agent

After installation, run 'squadloop ${command}' again.
    `);
    process.exit(1);
  }
}

function syncProjectModelsJson() {
  const projectModelsPath = path.join(process.cwd(), ".pi", "models.json");
  if (fs.existsSync(projectModelsPath)) {
    try {
      const globalPiDir = process.env.PI_CODING_AGENT_DIR || path.join(process.env.HOME || "", ".pi", "agent");
      fs.mkdirSync(globalPiDir, { recursive: true });
      const globalModelsPath = path.join(globalPiDir, "models.json");
      fs.copyFileSync(projectModelsPath, globalModelsPath);
    } catch {
      // Non-fatal
    }
  }
}

async function handleStart() {
  ensurePiInstalled();
  syncProjectModelsJson();
  printLogo();
  console.log("🚀 Launching SquadLoop workspace...");

  const config = getConfig();
  let workspace;
  try {
    workspace = WorkspaceFactory.getAdapter(config.workspaceMode);
  } catch (err) {
    console.error(`\n${err.message}\n`);
    process.exit(1);
  }

  // Setup layout locally in 0.3s without network/LLM API delays
  const panes = workspace.setupLayout(config.layout);
  config.panes = panes;
  saveConfig(config);

  // Reset active-task.json to clean idle state
  const activeTaskPath = path.join(process.cwd(), ".pi", "active-task.json");
  fs.mkdirSync(path.dirname(activeTaskPath), { recursive: true });
  fs.writeFileSync(activeTaskPath, JSON.stringify({
    activeIssueId: "",
    status: "awaiting-human-input",
    updatedBy: "system",
    notes: "Fresh team session started. Awaiting human input in Pane 0.",
    timestamp: new Date().toISOString()
  }, null, 2), "utf-8");

  // Send initial welcome prompt to Orchestrator Pane 0
  const welcomePrompt =
    `==============================================================\n` +
    `🚀 SQUADLOOP ONLINE [--mode=${config.mode}, --layout=${config.layout}]\n` +
    `==============================================================\n` +
    `• BA (Pane 1)       : IDLE & READY\n` +
    `• Developer (Pane 2): IDLE & READY\n` +
    `• QA (Pane 3)       : IDLE & READY\n` +
    `• Reviewer (Pane 4) : IDLE & READY\n` +
    `==============================================================\n` +
    `Print the welcome banner and options (1. Implement BRD/PRD, 2. Pick a specific Story/Issue, 3. Random Implementation, 4. Custom Task/Bug Fix).\n` +
    `DO NOT call send_agent_message or start any work automatically. STOP IMMEDIATELY and wait for the human user in Pane 0 to enter their instruction.`;

  await workspace.sendPrompt(panes.orchestrator, welcomePrompt, false);

  handleAttach();
}

async function handleResume() {
  ensurePiInstalled();
  syncProjectModelsJson();
  printLogo();
  console.log("🔄 Resuming SquadLoop workspace...");

  const config = getConfig();
  let workspace;
  try {
    workspace = WorkspaceFactory.getAdapter(config.workspaceMode);
  } catch (err) {
    console.error(`\n${err.message}\n`);
    process.exit(1);
  }

  // Read active-task.json if available
  const activeTaskPath = path.join(process.cwd(), ".pi", "active-task.json");
  let activeIssueId = "";
  let activeStatus = "awaiting-human-input";
  let activeNotes = "";

  if (fs.existsSync(activeTaskPath)) {
    try {
      const taskState = JSON.parse(fs.readFileSync(activeTaskPath, "utf-8"));
      activeIssueId = taskState.activeIssueId || "";
      activeStatus = taskState.status || "awaiting-human-input";
      activeNotes = taskState.notes || "";
    } catch {
      // Ignore
    }
  }

  const panes = workspace.setupLayout(config.layout);
  config.panes = panes;
  saveConfig(config);

  const resumePrompt = `Master Orchestrator RESUMED [--mode=${config.mode}, --layout=${config.layout}]! ` +
    `Active task recovered from log: Issue #${activeIssueId || 'None'} (Status: '${activeStatus}'). Notes: '${activeNotes || 'N/A'}'. ` +
    `Print session recovery banner to user, state active task status, and ask the human user in Pane 0 how to proceed or continue.`;

  await workspace.sendPrompt(panes.orchestrator, resumePrompt, false);

  handleAttach();
}

function handleAttach() {
  console.log("🔌 Attaching to SquadLoop tmux workspace...");
  const targetSession = "squadloop-workspace";

  const hasSession = spawnSync("tmux", ["has-session", "-t", targetSession], { stdio: "ignore" }).status === 0;
  if (!hasSession) {
    console.error(`❌ Session '${targetSession}' not found. Run 'squadloop start' first.`);
    return;
  }

  // Check if current terminal process is running inside an active tmux session
  const inTmux = Boolean(process.env.TMUX) || spawnSync("tmux", ["display-message"], { stdio: "ignore" }).status === 0;

  if (inTmux) {
    try {
      const res = spawnSync("tmux", ["switch-client", "-t", targetSession], { stdio: "inherit" });
      if (res.status === 0) return;
    } catch {
      // Fallback to attach
    }
  }

  try {
    const env = { ...process.env };
    delete env.TMUX;
    spawnSync("tmux", ["attach", "-t", targetSession], { stdio: "inherit", env });
  } catch {
    console.error(`❌ Failed to attach to '${targetSession}' tmux workspace.`);
  }
}

function handleStatus() {
  printLogo();
  const activeTaskPath = path.join(process.cwd(), ".pi", "active-task.json");
  if (fs.existsSync(activeTaskPath)) {
    try {
      const state = JSON.parse(fs.readFileSync(activeTaskPath, "utf-8"));
      console.log("📋 Current Active Task State:");
      console.log(`   Active Issue ID : #${state.activeIssueId || "None"}`);
      console.log(`   Status          : ${state.status}`);
      console.log(`   Updated By      : ${state.updatedBy}`);
      console.log(`   Notes           : ${state.notes || "N/A"}`);
      if (state.tokenStats) {
        console.log(`   Total Tokens    : ${state.tokenStats.totalTokens.toLocaleString()} tokens`);
        console.log(`   Estimated Cost  : $${state.tokenStats.estimatedCostUsd} USD`);
      }
      console.log(`   Timestamp       : ${state.timestamp}`);
      return;
    } catch {
      // Parse error
    }
  }
  console.log("ℹ️  No active task state found in .pi/active-task.json");
}

function handleConfig() {
  printLogo();
  const configPath = path.join(process.cwd(), ".pi", "team-config.json");
  let config = { mode: "loop-hitl", layout: "panes" };

  if (fs.existsSync(configPath)) {
    try {
      config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    } catch {
      // Default
    }
  }

  // Check if args passed to update config
  const modeArg = args.find(a => a.startsWith("mode="));
  const layoutArg = args.find(a => a.startsWith("layout="));

  if (modeArg || layoutArg) {
    if (modeArg) config.mode = modeArg.split("=")[1];
    if (layoutArg) config.layout = layoutArg.split("=")[1];
    fs.mkdirSync(path.dirname(configPath), { recursive: true });
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf-8");
    console.log("✅ Updated .pi/team-config.json:");
  } else {
    console.log("⚙️ Current .pi/team-config.json Configuration:");
  }

  console.log(JSON.stringify(config, null, 2));
}

switch (command) {
  case "start":
    handleStart();
    break;
  case "resume":
    handleResume();
    break;
  case "init":
    handleInit();
    break;
  case "attach":
    handleAttach();
    break;
  case "status":
    handleStatus();
    break;
  case "config":
    handleConfig();
    break;
  case "help":
  case "--help":
  case "-h":
  default:
    showHelp();
    break;
}
