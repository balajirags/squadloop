import type { IWorkspaceAdapter, WorkspacePanes } from "./workspace-interface.js";
export declare class HeadlessWorkspaceAdapter implements IWorkspaceAdapter {
    readonly name = "Regular Headless Workspace (No Tmux)";
    isAvailable(): boolean;
    setupLayout(_layout?: "panes" | "windows"): WorkspacePanes;
    recoverMissingPanes(currentPanes: WorkspacePanes): WorkspacePanes;
    sendPrompt(targetRole: string, promptText: string): Promise<void>;
    startAppServerWindow(_startCommand?: string): string;
}
