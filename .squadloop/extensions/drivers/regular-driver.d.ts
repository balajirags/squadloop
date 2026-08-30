import type { ITerminalDriver, WorkspacePanes } from "./terminal-driver-interface.js";
export declare class RegularDriver implements ITerminalDriver {
    readonly id = "regular";
    readonly name = "Regular Standalone Terminal Driver";
    isAvailable(): boolean;
    hasActiveSession(_sessionId?: string): boolean;
    setupTeamLayout(layout?: "panes" | "windows", _sessionId?: string): WorkspacePanes;
    sendPrompt(paneTarget: string, promptText: string, clear?: boolean): Promise<void>;
    attachSession(_sessionId?: string): void;
    stopSession(_sessionId?: string): void;
    recoverMissingPanes(currentPanes: WorkspacePanes): WorkspacePanes;
}
