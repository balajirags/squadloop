export type WorkflowStage = "ready-for-dev" | "dev-in-progress" | "qa-verifying" | "code-review" | "dev-rework" | "done" | "loop-halted" | "circuit-breaker-tripped";
export declare class WorkflowEngine {
    private static sendPromptAsync;
    static handleTransition(issueId: string, newStatus: string, hitlMode: "loop" | "step" | "auto" | "loop-hitl" | "step-hitl" | string, panes: any, notes?: string, reworkCount?: number, circuitBreakerTripped?: boolean): Promise<void>;
}
