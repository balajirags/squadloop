#!/usr/bin/env node

import { spawnSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { ExecutionStrategyFactory } from "../dist/.squadloop/extensions/strategies/execution-factory.js";
import { DriverFactory } from "../dist/.squadloop/extensions/drivers/driver-factory.js";
import { PromptSyncEngine } from "../dist/.squadloop/extensions/models/prompt-sync.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packageRoot = path.resolve(__dirname, "..");
const CONFIG_DIR_NAME = ".squadloop";
const GLOBAL_AGENT_DIR = path.join(process.env.HOME || "", CONFIG_DIR_NAME, "agent");
const PROTECTED_RUNTIME_FILES = new Set(["config.json", "models.json", "active-task.json", "events.jsonl"]);
const SETTINGS_KEYS = ["extensions", "skills", "prompts", "packages"];

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

function projectPath(...segments) {
  return path.join(process.cwd(), CONFIG_DIR_NAME, ...segments);
}

function packagePath(...segments) {
  return path.join(packageRoot, CONFIG_DIR_NAME, ...segments);
}

function ensureProjectDir() {
  fs.mkdirSync(projectPath(), { recursive: true });
}

function copyEntry(sourcePath, targetPath, { overwrite = false, skip = PROTECTED_RUNTIME_FILES } = {}) {
  const stat = fs.statSync(sourcePath);

  if (stat.isDirectory()) {
    fs.mkdirSync(targetPath, { recursive: true });
    for (const entry of fs.readdirSync(sourcePath, { withFileTypes: true })) {
      if (skip.has(entry.name)) continue;
      copyEntry(path.join(sourcePath, entry.name), path.join(targetPath, entry.name), { overwrite, skip });
    }
    return;
  }

  if (!overwrite && fs.existsSync(targetPath)) return;
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.copyFileSync(sourcePath, targetPath);
}

function syncRuntimeAssets({ overwrite = false } = {}) {
  const sourceRoot = path.join(packageRoot, CONFIG_DIR_NAME);
  const targetRoot = path.join(process.cwd(), CONFIG_DIR_NAME);

  if (!fs.existsSync(sourceRoot)) return;

  fs.mkdirSync(targetRoot, { recursive: true });
  for (const entry of fs.readdirSync(sourceRoot, { withFileTypes: true })) {
    if (PROTECTED_RUNTIME_FILES.has(entry.name)) continue;
    copyEntry(path.join(sourceRoot, entry.name), path.join(targetRoot, entry.name), { overwrite });
  }
}

function mergeSettingsArrays(templateValue, existingValue) {
  const merged = new Set();
  for (const value of [...(Array.isArray(templateValue) ? templateValue : []), ...(Array.isArray(existingValue) ? existingValue : [])]) {
    if (typeof value === "string" && value.trim()) merged.add(value.trim());
  }
  return [...merged];
}

function syncProjectSettingsJson() {
  const templatePath = packagePath("settings.json");
  const targetPath = projectPath("settings.json");

  if (!fs.existsSync(templatePath)) return;

  let template = {};
  try {
    template = JSON.parse(fs.readFileSync(templatePath, "utf-8"));
  } catch {
    template = {};
  }

  if (!fs.existsSync(targetPath)) {
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.writeFileSync(targetPath, JSON.stringify(template, null, 2), "utf-8");
    return;
  }

  let existing = {};
  try {
    existing = JSON.parse(fs.readFileSync(targetPath, "utf-8"));
  } catch {
    existing = {};
  }

  const merged = { ...template, ...existing };
  for (const key of SETTINGS_KEYS) {
    merged[key] = mergeSettingsArrays(template[key], existing[key]);
  }

  fs.writeFileSync(targetPath, JSON.stringify(merged, null, 2), "utf-8");
}

function parseCliContext() {
  ensureProjectDir();

  const configPath = projectPath("config.json");
  let config = { exMode: "team", driver: "tmux", hitl: "loop", layout: "panes" };

  if (fs.existsSync(configPath)) {
    try {
      const loaded = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      let rawHitl = loaded.hitl || loaded.mode || "loop";
      if (rawHitl === "loop-hitl") rawHitl = "loop";
      if (rawHitl === "step-hitl") rawHitl = "step";

      config = {
        ...loaded,
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

  const roles = ["orchestrator", "ba", "developer", "qa", "reviewer"];
  for (const role of roles) {
    const roleArg = args.find(a => a.startsWith(`--${role}=`) || a.startsWith(`${role}=`));
    if (roleArg) {
      if (!config.models) {
        config.models = { orchestrator: "", ba: "", developer: "", qa: "", reviewer: "" };
      }
      config.models[role] = roleArg.substring(roleArg.indexOf("=") + 1);
    }
  }

  return config;
}

function saveConfig(config) {
  const configPath = projectPath("config.json");
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf-8");
}

function syncProjectModelsJson() {
  const modelsExamplePath = projectPath("models.example.json");
  const modelsJsonPath = projectPath("models.json");

  if (!fs.existsSync(modelsJsonPath) && fs.existsSync(modelsExamplePath)) {
    try {
      fs.copyFileSync(modelsExamplePath, modelsJsonPath);
    } catch {
      // Ignore
    }
  }

  if (fs.existsSync(modelsJsonPath)) {
    try {
      fs.mkdirSync(GLOBAL_AGENT_DIR, { recursive: true });
      fs.copyFileSync(modelsJsonPath, path.join(GLOBAL_AGENT_DIR, "models.json"));
    } catch {
      // Non-fatal
    }
  }
}

function readPackageMetadata() {
  const packageJsonPath = path.join(packageRoot, "package.json");
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
  return {
    cliVersion: packageJson.version || "unknown",
    engineVersion: packageJson.dependencies?.["@earendil-works/pi-coding-agent"] || "unknown"
  };
}

function getLatestNpmVersion(pkgName) {
  const result = spawnSync("npm", ["view", pkgName, "version", "--json"], { encoding: "utf-8" });
  if (result.status !== 0 || !result.stdout) return null;

  try {
    const parsed = JSON.parse(result.stdout.trim());
    return Array.isArray(parsed) ? parsed.at(-1) ?? null : parsed;
  } catch {
    return result.stdout.trim() || null;
  }
}

function runPiProjectCommand(piArgs) {
  return spawnSync("pi", piArgs, {
    stdio: "inherit",
    env: {
      ...process.env,
      CONFIG_DIR_NAME: ".squadloop",
      PI_CODING_AGENT_DIR: GLOBAL_AGENT_DIR
    }
  });
}

function readProjectSettings() {
  const settingsPath = projectPath("settings.json");
  if (!fs.existsSync(settingsPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(settingsPath, "utf-8"));
  } catch {
    return null;
  }
}

async function handleStart() {
  const ctx = parseCliContext();
  printLogo();
  syncRuntimeAssets({ overwrite: false });
  syncProjectSettingsJson();
  syncProjectModelsJson();
  PromptSyncEngine.syncAllPrompts();
  const strategy = ExecutionStrategyFactory.getStrategy(ctx.exMode);
  await strategy.executeStart(ctx);
}

async function handleResume() {
  const ctx = parseCliContext();
  printLogo();
  syncRuntimeAssets({ overwrite: false });
  syncProjectSettingsJson();
  syncProjectModelsJson();
  PromptSyncEngine.syncAllPrompts();
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
  console.log("📦 Bootstrapping SquadLoop configuration, extensions, and templates into current directory...\n");

  ensureProjectDir();
  syncRuntimeAssets({ overwrite: false });
  syncProjectSettingsJson();

  const cwd = process.cwd();
  const sourceAgent = path.join(packageRoot, CONFIG_DIR_NAME, "templates", "Agent.md");
  const targetAgent = path.join(cwd, "AGENTS.md");
  if (fs.existsSync(sourceAgent) && !fs.existsSync(targetAgent)) {
    fs.copyFileSync(sourceAgent, targetAgent);
    console.log("  ✅ Created AGENTS.md operational mandate.");
  }

  const targetContext = path.join(cwd, "project-context.md");
  if (!fs.existsSync(targetContext)) {
    const sourceTemplate = packagePath("templates", "project-context.template.md");
    if (fs.existsSync(sourceTemplate)) {
      fs.copyFileSync(sourceTemplate, targetContext);
      console.log("  ✅ Created project-context.md template.");
    }
  }

  fs.mkdirSync(path.join(cwd, "docs", "brd"), { recursive: true });
  fs.mkdirSync(path.join(cwd, "docs", "stories"), { recursive: true });
  console.log("  ✅ Created docs/brd/ and docs/stories/ directories.");

  const defaultConfig = {
    exMode: "team",
    driver: "tmux",
    hitl: "loop",
    layout: "panes",
    _modelExamples: {
      anthropic: "anthropic/claude-3-7-sonnet",
      google: "google/gemini-2.5-flash",
      openai: "openai/gpt-4o",
      deepseek: "deepseek/deepseek-reasoner",
      nvidia: "nvidia/nemotron-3-ultra-550b-a55b",
      openrouter: "openrouter/anthropic/claude-3.7-sonnet",
      ollama: "ollama/gemma4"
    },
    models: {
      orchestrator: "",
      ba: "",
      developer: "",
      qa: "",
      reviewer: ""
    }
  };

  const configPath = projectPath("config.json");
  if (!fs.existsSync(configPath)) {
    saveConfig(defaultConfig);
    console.log("  ✅ Created .squadloop/config.json with model hints.");
  }

  syncProjectModelsJson();
  console.log("  ✅ Auto-created and synced .squadloop/models.json from template.");

  PromptSyncEngine.syncAllPrompts();
  console.log("  ✅ Synced .squadloop/prompts/ persona templates.");

  console.log("\n🎉 SquadLoop initialization complete! Run 'squadloop start' to launch your team.");
}

function handleConfig() {
  const ctx = parseCliContext();
  saveConfig(ctx);
  syncRuntimeAssets({ overwrite: false });
  syncProjectSettingsJson();
  syncProjectModelsJson();
  PromptSyncEngine.syncAllPrompts();
  console.log("⚙️  Updated .squadloop/config.json defaults:");
  console.log(JSON.stringify(ctx, null, 2));
}

function handleUpdate() {
  printLogo();
  console.log("🔄 Updating SquadLoop global binaries and refreshing local .squadloop/ runtime assets...\n");

  ensureProjectDir();
  const install = spawnSync("npm", ["install", "-g", "squadloop", "@earendil-works/pi-coding-agent"], {
    stdio: "inherit"
  });

  if (install.status !== 0) {
    console.log("⚠️  Global package refresh failed or was skipped; continuing with local runtime sync.");
  }

  syncRuntimeAssets({ overwrite: true });
  syncProjectSettingsJson();
  syncProjectModelsJson();
  PromptSyncEngine.syncAllPrompts();

  console.log("✅ SquadLoop update complete. Runtime assets refreshed under .squadloop/.");
}

function handleDoctor() {
  const { cliVersion, engineVersion } = readPackageMetadata();
  const latestCliVersion = getLatestNpmVersion("squadloop");
  const latestEngineVersion = getLatestNpmVersion("@earendil-works/pi-coding-agent");
  const configPath = projectPath("config.json");
  const modelsPath = projectPath("models.json");
  const projectDirExists = fs.existsSync(path.join(process.cwd(), CONFIG_DIR_NAME));
  const extensionsSynced = fs.existsSync(projectPath("extensions"));
  const promptsSynced = fs.existsSync(projectPath("prompts"));
  const skillsSynced = fs.existsSync(projectPath("skills"));
  console.log("🚀 SquadLoop Diagnostic Report:");
  console.log(`  • SquadLoop CLI    : v${cliVersion}${latestCliVersion && latestCliVersion !== cliVersion ? ` (latest v${latestCliVersion})` : " (Up to date)"}`);
  console.log(`  • Pi Agent Engine  : v${engineVersion}${latestEngineVersion && latestEngineVersion !== engineVersion ? ` (latest v${latestEngineVersion})` : " (Up to date)"}`);
  console.log(`  • Config Directory : .squadloop/ ${projectDirExists ? "(Verified)" : "(Missing)"}`);
  console.log(`  • Config File      : ${fs.existsSync(configPath) ? "config.json present" : "config.json missing"}`);
  console.log(`  • Models File      : ${fs.existsSync(modelsPath) ? "models.json present" : "models.json missing"}`);
  console.log(`  • Extensions       : ${extensionsSynced && promptsSynced && skillsSynced ? "Synchronized" : "Needs sync"}`);
  console.log(`  • Bundled Packages  : ${fs.existsSync(projectPath("settings.json")) ? "Declared in settings.json" : "Missing"}`);
}

function handleStatus() {
  const activeTaskPath = projectPath("active-task.json");
  const modelsPath = projectPath("models.json");
  const configPath = projectPath("config.json");

  console.log("📊 SquadLoop Status:");
  console.log(`  • Config Directory : ${fs.existsSync(projectPath()) ? "Verified" : "Missing"}`);
  console.log(`  • Config File      : ${fs.existsSync(configPath) ? "config.json present" : "config.json missing"}`);
  console.log(`  • Models File      : ${fs.existsSync(modelsPath) ? "models.json present" : "models.json missing"}`);

  if (fs.existsSync(activeTaskPath)) {
    try {
      const activeTask = JSON.parse(fs.readFileSync(activeTaskPath, "utf-8"));
      console.log(`  • Active Issue     : ${activeTask.activeIssueId || "none"}`);
      console.log(`  • Status           : ${activeTask.status || "unknown"}`);
      console.log(`  • Notes            : ${activeTask.notes || "n/a"}`);
    } catch {
      console.log("  • Active Task      : unreadable");
    }
  } else {
    console.log("  • Active Task      : none");
  }
}

function handlePackages() {
  const subcommand = (args[0] || "list").toLowerCase();
  const target = args[1];

  ensureProjectDir();

  if (subcommand === "install") {
    if (!target) {
      console.log("Usage: squadloop install <npm:package|git:url|./path>");
      return;
    }

    const result = runPiProjectCommand(["install", target, "-l"]);
    if (result.status === 0) {
      syncProjectSettingsJson();
      console.log(`✅ Installed package into .squadloop/settings.json: ${target}`);
    }
    return;
  }

  if (subcommand === "remove" || subcommand === "rm") {
    if (!target) {
      console.log("Usage: squadloop remove <npm:package|git:url|./path>");
      return;
    }

    const result = runPiProjectCommand(["remove", target, "-l"]);
    if (result.status === 0) {
      syncProjectSettingsJson();
      console.log(`✅ Removed package from .squadloop/settings.json: ${target}`);
    }
    return;
  }

  const settings = readProjectSettings();
  const packages = Array.isArray(settings?.packages) ? settings.packages : [];
  console.log("📦 SquadLoop Packages:");
  if (packages.length === 0) {
    console.log("  • No local packages installed.");
    console.log("  • Use: squadloop install npm:pi-web-access");
    return;
  }

  for (const pkg of packages) {
    console.log(`  • ${pkg}`);
  }
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
  case "update":
    handleUpdate();
    break;
  case "doctor":
    handleDoctor();
    break;
  case "status":
    handleStatus();
    break;
  case "install":
  case "remove":
  case "rm":
  case "list":
    handlePackages();
    break;
  default:
    console.log("SquadLoop CLI — Run squadloop start|resume|status|config|attach|init|update|doctor|install|remove|list [--ex-mode=team|standalone] [--driver=tmux|herdr|iterm2|regular]");
    break;
}
