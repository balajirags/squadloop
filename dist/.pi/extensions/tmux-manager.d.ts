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
    setup5PaneLayout(): TmuxPaneMap;
    sendPromptToPane(paneTarget: string, promptText: string): void;
}
