export interface WorkflowStepDefinition {
  action: string;
  next?: string;
  on_complete?: string;
  on_pass?: string;
  on_fail?: string;
}

export interface PersonaWorkflowDefinition {
  initial: string;
  steps: Record<string, WorkflowStepDefinition>;
}

export interface PipelineStateDefinition {
  agent?: string;
  persona_workflow?: string;
  type?: string;
  on?: Record<string, string | { target: string; guard?: string }>;
}

export interface WorkflowDefinition {
  version: string;
  name: string;
  description?: string;
  pipeline: {
    initial: string;
    states: Record<string, PipelineStateDefinition>;
  };
  personas: Record<string, PersonaWorkflowDefinition>;
}

export interface TaskState {
  issueId: string;
  workflowName: string;
  pipelineStage: string;
  targetRole: string;
  microStep: string;
  promptCard: string;
  isDone: boolean;
  reworkCount: number;
  context: Record<string, any>;
  timestamp: string;
}

export interface IWorkflowEngine {
  readonly id: string;

  start(workflowDef: WorkflowDefinition, issueId: string, initialState?: TaskState): Promise<TaskState>;

  transition(event: string, payload?: Record<string, any>): Promise<TaskState>;

  getState(): TaskState;
}
