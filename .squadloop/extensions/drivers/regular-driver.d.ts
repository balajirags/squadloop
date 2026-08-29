import type { ITerminalDriver, WorkspacePanes } from "./terminal-driver-interface.js";
export declare class RegularDriver implements ITerminalDriver {
    readonly id = "regular";
    readonly name = "Regular Standalone Terminal Driver";
    isAvailable(): boolean;
    hasActiveSession(): boolean;
    setupTeamLayout(layout?: "panes" | "windows"): WorkspacePanes;
    sendPrompt(paneTarget: string, promptText: string, clear?: boolean): Promise<void>;
    attachSession(): void;
    recoverMissingPanes(currentPanes: WorkspacePanes): WorkspacePanes;
}
