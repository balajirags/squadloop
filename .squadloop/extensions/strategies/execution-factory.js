import { TeamExecutionStrategy } from "./team-strategy.js";
import { StandaloneExecutionStrategy } from "./standalone-strategy.js";
export class ExecutionStrategyFactory {
    static teamStrategy = new TeamExecutionStrategy();
    static standaloneStrategy = new StandaloneExecutionStrategy();
    static getStrategy(exMode) {
        if (exMode === "standalone") {
            return this.standaloneStrategy;
        }
        return this.teamStrategy;
    }
}
