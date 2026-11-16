import type { ExecutionContext } from "./strategies/execution-strategy-interface.js";
type ConfigInput = Record<string, unknown>;
export declare function normalizeRuntimeConfig(raw?: ConfigInput, overrides?: ConfigInput): ExecutionContext;
export declare function loadRuntimeConfig(overrides?: ConfigInput, projectRoot?: string): ExecutionContext;
export {};
