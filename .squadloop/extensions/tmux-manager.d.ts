export interface TmuxPaneMap {
    orchestrator: string;
    ba: string;
    developer: string;
    qa: string;
    reviewer: string;
}
export declare class TmuxManager {
    private sessionName;
    isTmuxAvailable(): boolean;
    setupLayout(layout?: "panes" | "windows"): TmuxPaneMap;
    setup5PaneLayout(): TmuxPaneMap;
    setup5WindowLayout(): TmuxPaneMap;
    private configureErgonomics;
    startAppServerWindow(startCommand?: string): string;
    recoverMissingPanes(currentPanes: TmuxPaneMap): TmuxPaneMap;
    sendPromptToPane(paneTarget: string, promptText: string): void;
}
