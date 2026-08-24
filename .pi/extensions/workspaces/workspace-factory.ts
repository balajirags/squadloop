import * as fs from "fs";
import * as path from "path";
import type { IWorkspaceAdapter } from "./workspace-interface.js";
import { TmuxWorkspaceAdapter } from "./tmux-adapter.js";
import { HeadlessWorkspaceAdapter } from "./headless-adapter.js";

export class WorkspaceFactory {
  private static tmuxAdapter = new TmuxWorkspaceAdapter();
  private static headlessAdapter = new HeadlessWorkspaceAdapter();

  public static getAdapter(overrideMode?: "tmux" | "regular"): IWorkspaceAdapter {
    let mode: "tmux" | "regular" = overrideMode || "tmux";

    if (!overrideMode) {
      const configPath = path.join(process.cwd(), ".pi", "team-config.json");
      if (fs.existsSync(configPath)) {
        try {
          const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
          if (config.workspaceMode === "regular" || config.workspaceMode === "headless") {
            mode = "regular";
          }
        } catch {
          // Default
        }
      }
    }

    if (mode === "tmux") {
      if (WorkspaceFactory.tmuxAdapter.isAvailable()) {
        return WorkspaceFactory.tmuxAdapter;
      }
      console.log("⚠️ tmux is not installed on this system. Falling back to Regular Headless Mode.");
      return WorkspaceFactory.headlessAdapter;
    }

    return WorkspaceFactory.headlessAdapter;
  }
}
