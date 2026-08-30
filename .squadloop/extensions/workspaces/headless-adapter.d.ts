import type { IWorkspaceAdapter, WorkspacePanes } from "./workspace-interface.js";
export declare class HeadlessWorkspaceAdapter implements IWorkspaceAdapter {
    readonly name = "Regular Headless Workspace (No Tmux)";
    isAvailable(): boolean;
    setupLayout(_layout?: "panes" | "windows", _sessionId?: string): WorkspacePanes;
    recoverMissingPanes(currentPanes: WorkspacePanes, _sessionId?: string): WorkspacePanes;
    sendPrompt(targetRole: string, promptText: string): Promise<void>;
    startAppServerWindow(_startCommand?: string): string;
}
