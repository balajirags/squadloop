import type { IWorkflowEngine, TaskState, WorkflowDefinition } from "./workflow-engine-interface.js";
export declare class XStateWorkflowEngine implements IWorkflowEngine {
    readonly id = "xstate";
    private currentTaskState;
    private workflowDef;
    private pipelineActor;
    private personaActor;
    start(workflowDef: WorkflowDefinition, issueId: string, initialState?: TaskState): Promise<TaskState>;
    transition(event: string, payload?: Record<string, any>): Promise<TaskState>;
    private handlePipelineTransition;
    private formatPromptCard;
    getState(): TaskState;
}
