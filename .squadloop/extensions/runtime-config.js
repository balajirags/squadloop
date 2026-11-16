import * as fs from "fs";
import * as path from "path";
export function normalizeRuntimeConfig(raw = {}, overrides = {}) {
    const select = (key, alias) => overrides[key] ?? (alias ? overrides[alias] : undefined)
        ?? raw[key] ?? (alias ? raw[alias] : undefined);
    const hitlValue = select("hitl", "mode") ?? "loop";
    const hitl = { "loop-hitl": "loop", "step-hitl": "step" }[String(hitlValue)] || hitlValue;
    const driverValue = select("driver", "workspaceMode") ?? "tmux";
    const driver = { headless: "regular", iterm: "iterm2" }[String(driverValue)] || driverValue;
    const layout = select("layout") ?? "windows";
    const exMode = select("exMode", "executionMode") ?? "team";
    if (!["loop", "step", "auto"].includes(String(hitl)))
        throw new Error(`Invalid HITL mode: ${hitlValue}`);
    if (!["tmux", "herdr", "iterm2", "regular"].includes(String(driver)))
        throw new Error(`Invalid terminal driver: ${driverValue}`);
    if (!["panes", "windows"].includes(String(layout)))
        throw new Error(`Invalid layout: ${layout}`);
    if (!["team", "standalone"].includes(String(exMode)))
        throw new Error(`Invalid execution mode: ${exMode}`);
    return {
        exMode: exMode, driver: String(driver),
        hitl: hitl, layout: layout,
        mode: hitl === "auto" ? "auto" : `${hitl}-hitl`,
        ...(select("sessionId") ? { sessionId: String(select("sessionId")) } : {}),
        ...(select("attach") !== undefined ? { attach: Boolean(select("attach")) } : {})
    };
}
export function loadRuntimeConfig(overrides = {}, projectRoot = process.cwd()) {
    const filename = path.join(projectRoot, ".squadloop", "config.json");
    let raw = {};
    if (fs.existsSync(filename)) {
        try {
            raw = JSON.parse(fs.readFileSync(filename, "utf-8"));
            if (!raw || typeof raw !== "object" || Array.isArray(raw))
                throw new Error("expected a JSON object");
        }
        catch (error) {
            throw new Error(`Cannot read SquadLoop configuration ${filename}: ${error.message}`);
        }
    }
    return normalizeRuntimeConfig(raw, overrides);
}
