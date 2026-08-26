export interface ExecutionContext {
  exMode: "team" | "standalone";
  driver: string;
  mode: string;
  layout: "panes" | "windows";
}

export interface IExecutionStrategy {
  executeStart(ctx: ExecutionContext): Promise<void>;
  executeResume(ctx: ExecutionContext): Promise<void>;
}
