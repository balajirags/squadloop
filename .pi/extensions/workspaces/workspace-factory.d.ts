import type { IWorkspaceAdapter } from "./workspace-interface.js";
export declare class WorkspaceFactory {
    private static tmuxAdapter;
    private static headlessAdapter;
    static getAdapter(overrideMode?: "tmux" | "regular"): IWorkspaceAdapter;
}
