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
    setupTeamLayout(layout: "panes" | "windows", sessionId?: string): WorkspacePanes;
    sendPrompt(targetPaneId: string, promptText: string, clear?: boolean): Promise<void>;
    attachSession(sessionId?: string): void;
    stopSession(sessionId?: string): void;
    hasActiveSession(sessionId?: string): boolean;
    recoverMissingPanes(currentPanes: WorkspacePanes, sessionId?: string): WorkspacePanes;
}
