import type { IExecutionStrategy, ExecutionContext } from "./execution-strategy-interface.js";
export declare class TeamExecutionStrategy implements IExecutionStrategy {
    executeStart(ctx: ExecutionContext): Promise<void>;
    executeResume(ctx: ExecutionContext): Promise<void>;
}
