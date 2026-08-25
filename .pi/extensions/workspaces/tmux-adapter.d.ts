import type { IWorkspaceAdapter, WorkspacePanes } from "./workspace-interface.js";
export declare class TmuxWorkspaceAdapter implements IWorkspaceAdapter {
    readonly name = "Tmux Workspace";
    private sessionName;
    isAvailable(): boolean;
    setupLayout(layout?: "panes" | "windows"): WorkspacePanes;
    private setup5PaneLayout;
    private setup5WindowLayout;
    sendPrompt(paneTarget: string, promptText: string, clear?: boolean): Promise<void>;
    startAppServerWindow(startCommand?: string): string;
    recoverMissingPanes(currentPanes: WorkspacePanes): WorkspacePanes;
}
