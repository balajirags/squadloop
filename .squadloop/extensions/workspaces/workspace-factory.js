import * as fs from "fs";
import * as path from "path";
import { TmuxWorkspaceAdapter } from "./tmux-adapter.js";
import { HeadlessWorkspaceAdapter } from "./headless-adapter.js";
export class WorkspaceFactory {
    static tmuxAdapter = new TmuxWorkspaceAdapter();
    static headlessAdapter = new HeadlessWorkspaceAdapter();
    static getAdapter(overrideMode) {
        let mode = overrideMode || "tmux";
        if (!overrideMode) {
            const configPath = path.join(process.cwd(), ".squadloop", "config.json");
            if (fs.existsSync(configPath)) {
                try {
                    const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
                    if (config.workspaceMode === "regular" || config.workspaceMode === "headless") {
                        mode = "regular";
                    }
                }
                catch {
                    // Default
                }
            }
        }
        if (mode === "tmux") {
            if (WorkspaceFactory.tmuxAdapter.isAvailable()) {
                return WorkspaceFactory.tmuxAdapter;
            }
            const errorMsg = `❌ ERROR: tmux is required when workspaceMode is set to "tmux", but tmux is not installed on this system.\n\n` +
                `To install tmux:\n` +
                `  • macOS          : brew install tmux\n` +
                `  • Ubuntu/Debian  : sudo apt install tmux\n\n` +
                `Alternatively, to run SquadLoop in Regular Mode (without tmux):\n` +
                `  1. Edit .squadloop/config.json\n` +
                `  2. Set "workspaceMode": "regular"\n` +
                `  3. Run 'squadloop start' again.`;
            throw new Error(errorMsg);
        }
        return WorkspaceFactory.headlessAdapter;
    }
}
