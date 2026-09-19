import type { TaskState } from "./workflow/workflow-engine-interface.js";
export type WorkflowStage = "ready-for-dev" | "dev-in-progress" | "qa-verifying" | "code-review" | "dev-rework" | "done" | "loop-halted" | "circuit-breaker-tripped";
export declare class WorkflowEngine {
    private static engine;
    private static store;
    private static loadWorkflowDefinition;
    static processStepComplete(step: string, notes?: string, payload?: any): Promise<TaskState>;
    static handleTransition(issueId: string, newStatus: string, hitlMode: "loop" | "step" | "auto" | "loop-hitl" | "step-hitl" | string, panes: any, notes?: string, reworkCount?: number, circuitBreakerTripped?: boolean): Promise<void>;
}
