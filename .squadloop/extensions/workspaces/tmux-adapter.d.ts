import type { IWorkspaceAdapter, WorkspacePanes } from "./workspace-interface.js";
export declare class TmuxWorkspaceAdapter implements IWorkspaceAdapter {
    readonly name = "Tmux Workspace";
    isAvailable(): boolean;
    setupLayout(layout?: "panes" | "windows", sessionId?: string): WorkspacePanes;
    private setup5PaneLayout;
    private setup5WindowLayout;
    recoverMissingPanes(currentPanes: WorkspacePanes, _sessionId?: string): WorkspacePanes;
    sendPrompt(paneTarget: string, promptText: string, clear?: boolean): Promise<void>;
    startAppServerWindow(startCommand?: string): string;
}
