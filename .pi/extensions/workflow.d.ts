export type WorkflowStage = "ready-for-dev" | "dev-in-progress" | "qa-verifying" | "code-review" | "dev-rework" | "done" | "loop-halted" | "circuit-breaker-tripped";
export declare class WorkflowEngine {
    private static sendPromptAsync;
    static handleTransition(issueId: string, newStatus: string, mode: "loop-hitl" | "step-hitl" | "auto", panes: any, notes?: string, reworkCount?: number, circuitBreakerTripped?: boolean): Promise<void>;
}
