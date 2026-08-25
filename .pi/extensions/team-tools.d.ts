import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
export interface TokenStats {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    estimatedCostUsd: number;
}
export interface ActiveTaskState {
    activeIssueId: string;
    status: "ba-in-progress" | "ready-for-dev" | "dev-in-progress" | "qa-verifying" | "code-review" | "done" | "dev-rework" | "loop-halted" | "circuit-breaker-tripped";
    updatedBy: string;
    notes?: string;
    reworkCount?: number;
    tokenStats?: TokenStats;
    timestamp: string;
}
export declare function registerTeamTools(pi: ExtensionAPI): void;
