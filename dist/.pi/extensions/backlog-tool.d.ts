import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
export interface ActiveTaskState {
    activeIssueId: string;
    status: "ba-in-progress" | "ready-for-dev" | "dev-in-progress" | "qa-verifying" | "code-review" | "done" | "dev-rework" | "loop-halted";
    updatedBy: string;
    notes?: string;
    timestamp: string;
}
export declare function registerBacklogTool(pi: ExtensionAPI): void;
