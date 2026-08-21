import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
export interface TeamConfig {
    mode: "step-hitl" | "loop-hitl" | "auto";
    panes: {
        orchestrator: string;
        ba: string;
        developer: string;
        qa: string;
        reviewer: string;
    };
}
export default function (pi: ExtensionAPI): void;
