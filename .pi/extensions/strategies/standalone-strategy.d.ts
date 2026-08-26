import type { IExecutionStrategy, ExecutionContext } from "./execution-strategy-interface.js";
export declare class StandaloneExecutionStrategy implements IExecutionStrategy {
    executeStart(ctx: ExecutionContext): Promise<void>;
    executeResume(ctx: ExecutionContext): Promise<void>;
}
