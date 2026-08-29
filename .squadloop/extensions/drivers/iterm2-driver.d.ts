import type { ITerminalDriver, WorkspacePanes } from "./terminal-driver-interface.js";
export declare class ITerm2Driver implements ITerminalDriver {
    readonly id = "iterm2";
    readonly name = "iTerm2 Terminal Driver";
    isAvailable(): boolean;
    hasActiveSession(): boolean;
    setupTeamLayout(layout?: "panes" | "windows"): WorkspacePanes;
    sendPrompt(paneTarget: string, promptText: string, clear?: boolean): Promise<void>;
    attachSession(): void;
    recoverMissingPanes(currentPanes: WorkspacePanes): WorkspacePanes;
}
