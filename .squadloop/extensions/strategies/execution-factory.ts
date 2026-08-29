import type { IExecutionStrategy } from "./execution-strategy-interface.js";
import { TeamExecutionStrategy } from "./team-strategy.js";
import { StandaloneExecutionStrategy } from "./standalone-strategy.js";

export class ExecutionStrategyFactory {
  private static teamStrategy = new TeamExecutionStrategy();
  private static standaloneStrategy = new StandaloneExecutionStrategy();

  public static getStrategy(exMode: "team" | "standalone"): IExecutionStrategy {
    if (exMode === "standalone") {
      return this.standaloneStrategy;
    }
    return this.teamStrategy;
  }
}
