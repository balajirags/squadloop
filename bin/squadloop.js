#!/usr/bin/env node

import { execSync, spawnSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { ExecutionStrategyFactory } from "../dist/.pi/extensions/strategies/execution-factory.js";
import { DriverFactory } from "../dist/.pi/extensions/drivers/driver-factory.js";

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
  `);
}

function parseCliContext() {
  const configPath = path.join(process.cwd(), ".pi", "team-config.json");
  let config = { exMode: "team", driver: "tmux", hitl: "loop", layout: "panes" };

  if (fs.existsSync(configPath)) {
    try {
      const loaded = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      let rawHitl = loaded.hitl || loaded.mode || "loop";
      if (rawHitl === "loop-hitl") rawHitl = "loop";
      if (rawHitl === "step-hitl") rawHitl = "step";

      config = {
        exMode: loaded.exMode || loaded.executionMode || "team",
        driver: loaded.driver || loaded.workspaceMode || "tmux",
        hitl: rawHitl,
        layout: loaded.layout || "panes"
      };
    } catch {
      // Default
    }
  }

  const exModeArg = args.find(a => a.startsWith("--ex-mode=") || a.startsWith("exMode="));
  const driverArg = args.find(a => a.startsWith("--driver=") || a.startsWith("driver="));
  const layoutArg = args.find(a => a.startsWith("--layout=") || a.startsWith("layout="));
  const hitlArg = args.find(a => a.startsWith("--hitl=") || a.startsWith("hitl="));
  const modeArg = args.find(a => a.startsWith("--mode=") || a.startsWith("mode="));

  if (exModeArg) config.exMode = exModeArg.split("=")[1];
  if (driverArg) config.driver = driverArg.split("=")[1];
  if (layoutArg) config.layout = layoutArg.split("=")[1];
  if (hitlArg) {
    let val = hitlArg.split("=")[1];
    if (val === "loop-hitl") val = "loop";
    if (val === "step-hitl") val = "step";
    config.hitl = val;
  } else if (modeArg) {
    let val = modeArg.split("=")[1];
    if (val === "loop-hitl") val = "loop";
    if (val === "step-hitl") val = "step";
    config.hitl = val;
  }

  return config;
}

function saveConfig(config) {
  const configPath = path.join(process.cwd(), ".pi", "team-config.json");
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf-8");
}

async function handleStart() {
  const ctx = parseCliContext();
  printLogo();
  const strategy = ExecutionStrategyFactory.getStrategy(ctx.exMode);
  await strategy.executeStart(ctx);
}

async function handleResume() {
  const ctx = parseCliContext();
  printLogo();
  const strategy = ExecutionStrategyFactory.getStrategy(ctx.exMode);
  await strategy.executeResume(ctx);
}

function handleAttach() {
  const ctx = parseCliContext();
  const driver = DriverFactory.getDriver(ctx.driver);
  driver.attachSession();
}

function handleInit() {
  printLogo();
  console.log("📦 Bootstrapping SquadLoop configuration and template files...");
  const defaultConfig = {
    exMode: "team",
    driver: "tmux",
    hitl: "loop",
    layout: "panes"
  };
  const configPath = path.join(process.cwd(), ".pi", "team-config.json");
  if (!fs.existsSync(configPath)) {
    saveConfig(defaultConfig);
    console.log("  ✅ Created .pi/team-config.json defaults.");
  } else {
    console.log("  ℹ️  .pi/team-config.json already exists.");
  }
  console.log("🎉 SquadLoop initialization complete!");
}

function handleConfig() {
  const ctx = parseCliContext();
  saveConfig(ctx);
  console.log("⚙️  Updated .pi/team-config.json defaults:");
  console.log(JSON.stringify(ctx, null, 2));
}

switch (command) {
  case "start":
    handleStart();
    break;
  case "resume":
    handleResume();
    break;
  case "attach":
    handleAttach();
    break;
  case "init":
    handleInit();
    break;
  case "config":
    handleConfig();
    break;
  default:
    console.log("SquadLoop CLI — Run squadloop start [--ex-mode=team|standalone] [--driver=tmux|herdr|iterm2|regular]");
    break;
}
