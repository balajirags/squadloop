import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
export interface TeamConfig {
    mode: "step-hitl" | "loop-hitl" | "auto";
    layout: "panes" | "windows";
    workspaceMode?: "tmux" | "regular";
    destructiveCommandPolicy?: "ask-human" | "block" | "allow";
    customProtectedFiles?: string[];
    panes: {
        orchestrator: string;
        ba: string;
        developer: string;
        qa: string;
        reviewer: string;
    };
}
export default function (pi: ExtensionAPI): void;
