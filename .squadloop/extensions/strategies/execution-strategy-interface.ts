export interface ExecutionContext {
  exMode: "team" | "standalone";
  driver: string;
  hitl: "loop" | "step" | "auto";
  layout: "panes" | "windows";
  mode?: string;
  sessionId?: string;
}

export interface IExecutionStrategy {
  executeStart(ctx: ExecutionContext): Promise<void>;
  executeResume(ctx: ExecutionContext): Promise<void>;
}
