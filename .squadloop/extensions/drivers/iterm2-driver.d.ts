import type { ITerminalDriver, WorkspacePanes } from "./terminal-driver-interface.js";
export declare class ITerm2Driver implements ITerminalDriver {
    readonly id = "iterm2";
    readonly name = "iTerm2 Terminal Driver";
    isAvailable(): boolean;
    hasActiveSession(sessionId?: string): boolean;
    setupTeamLayout(layout?: "panes" | "windows", sessionId?: string): WorkspacePanes;
    sendPrompt(paneTarget: string, promptText: string, clear?: boolean): Promise<void>;
    attachSession(sessionId?: string): void;
    stopSession(sessionId?: string): void;
    recoverMissingPanes(currentPanes: WorkspacePanes): WorkspacePanes;
}
