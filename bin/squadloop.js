#!/usr/bin/env node

import { execSync, spawnSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

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

function handleStart() {
  ensurePiInstalled();
  printLogo();
  console.log("🚀 Launching SquadLoop workspace...");
  // Run setup headlessly (-p) so pi initializes the workspace without leaving an extra interactive session behind
  spawnSync("pi", ["-p", "/squadloop-start"], { stdio: "ignore" });
  handleAttach();
}

function handleResume() {
  ensurePiInstalled();
  printLogo();
  console.log("🔄 Resuming SquadLoop workspace...");
  spawnSync("pi", ["-p", "/squadloop-resume"], { stdio: "ignore" });
  handleAttach();
}

function handleAttach() {
  console.log("🔌 Attaching to SquadLoop tmux workspace...");
  if (process.env.TMUX) {
    try {
      const res = spawnSync("tmux", ["switch-client", "-t", "squadloop-workspace"], { stdio: "inherit" });
      if (res.status === 0) return;
    } catch {
      // Fallback to attach
    }
  }

  try {
    const res = spawnSync("tmux", ["attach", "-t", "squadloop-workspace"], { stdio: "inherit" });
    if (res.status !== 0) {
      spawnSync("tmux", ["attach", "-t", "pi-team"], { stdio: "inherit" });
    }
  } catch {
    console.error("❌ Failed to attach: no active SquadLoop tmux workspace found.");
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
