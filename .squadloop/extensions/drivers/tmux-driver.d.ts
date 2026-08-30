import type { ITerminalDriver, WorkspacePanes } from "./terminal-driver-interface.js";
export declare class TmuxDriver implements ITerminalDriver {
    readonly id = "tmux";
    readonly name = "Tmux Terminal Driver";
    isAvailable(): boolean;
    hasActiveSession(sessionId?: string): boolean;
    setupTeamLayout(layout?: "panes" | "windows", sessionId?: string): WorkspacePanes;
    private setup5PaneLayout;
    private setup5WindowLayout;
    sendPrompt(paneTarget: string, promptText: string, clear?: boolean): Promise<void>;
    attachSession(sessionId?: string): void;
    stopSession(sessionId?: string): void;
    recoverMissingPanes(currentPanes: WorkspacePanes): WorkspacePanes;
}
