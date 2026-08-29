import type { IExecutionStrategy } from "./execution-strategy-interface.js";
export declare class ExecutionStrategyFactory {
    private static teamStrategy;
    private static standaloneStrategy;
    static getStrategy(exMode: "team" | "standalone"): IExecutionStrategy;
}
