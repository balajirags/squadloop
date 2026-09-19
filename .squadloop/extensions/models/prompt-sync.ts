import * as fs from "fs";
import * as path from "path";
import { ModelResolver } from "./model-resolver.js";

const ROLES = ["orchestrator", "ba", "developer", "qa", "reviewer"];

export class PromptSyncEngine {
  public static syncAllPrompts(): void {
    // Single source of truth is .squadloop/agents/*.md
    // Model configuration is resolved directly via ModelResolver and passed via --model flag on agent launch.
  }
}
