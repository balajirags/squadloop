import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
export interface TokenStats {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    estimatedCostUsd: number;
}
export declare function registerTeamTools(pi: ExtensionAPI): void;
