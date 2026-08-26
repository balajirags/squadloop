export interface WorkspacePanes {
    orchestrator: string;
    ba: string;
    developer: string;
    qa: string;
    reviewer: string;
}
export interface ITerminalDriver {
    readonly id: string;
    readonly name: string;
    isAvailable(): boolean;
    setupTeamLayout(layout: "panes" | "windows"): WorkspacePanes;
    sendPrompt(targetPaneId: string, promptText: string, clear?: boolean): Promise<void>;
    attachSession(): void;
    hasActiveSession(): boolean;
    recoverMissingPanes(currentPanes: WorkspacePanes): WorkspacePanes;
}
