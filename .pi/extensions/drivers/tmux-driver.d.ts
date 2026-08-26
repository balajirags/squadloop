import type { ITerminalDriver, WorkspacePanes } from "./terminal-driver-interface.js";
export declare class TmuxDriver implements ITerminalDriver {
    readonly id = "tmux";
    readonly name = "Tmux Terminal Driver";
    private sessionName;
    isAvailable(): boolean;
    hasActiveSession(): boolean;
    setupTeamLayout(layout?: "panes" | "windows"): WorkspacePanes;
    private setup5PaneLayout;
    private setup5WindowLayout;
    sendPrompt(paneTarget: string, promptText: string, clear?: boolean): Promise<void>;
    attachSession(): void;
    recoverMissingPanes(currentPanes: WorkspacePanes): WorkspacePanes;
}
