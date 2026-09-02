import * as fs from "fs";
import * as path from "path";
import { createJiti } from "jiti";
const jiti = createJiti(import.meta.url);
function isPlainObject(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function mergeConfigs(base, override) {
    const merged = { ...base };
    for (const [key, value] of Object.entries(override)) {
        const existing = merged[key];
        merged[key] = isPlainObject(existing) && isPlainObject(value)
            ? mergeConfigs(existing, value)
            : value;
    }
    return merged;
}
function loadJsonConfig(configPath) {
    try {
        const raw = fs.readFileSync(configPath, "utf-8");
        return JSON.parse(raw.replace(/\\"|"(?:\\"|[^"])*"|(\/\/.*|\/\*[\s\S]*?\*\/)/g, (m, g) => (g ? "" : m)));
    }
    catch {
        return null;
    }
}
function loadJsConfig(configPath) {
    try {
        const loaded = jiti(configPath);
        const candidate = loaded && typeof loaded === "object" && "default" in loaded ? loaded.default : loaded;
        return isPlainObject(candidate) ? candidate : null;
    }
    catch {
        return null;
    }
}
export function loadProjectConfig() {
    const cwd = process.cwd();
    const configJsonPath = path.join(cwd, ".squadloop", "config.json");
    const configJsPath = path.join(cwd, ".squadloop", "config.js");
    const hasJson = fs.existsSync(configJsonPath);
    const hasJs = fs.existsSync(configJsPath);
    if (!hasJson && !hasJs)
        return null;
    let config = {};
    if (hasJson) {
        const jsonConfig = loadJsonConfig(configJsonPath);
        if (jsonConfig)
            config = mergeConfigs(config, jsonConfig);
    }
    if (hasJs) {
        const jsConfig = loadJsConfig(configJsPath);
        if (jsConfig)
            config = mergeConfigs(config, jsConfig);
    }
    return config;
}
