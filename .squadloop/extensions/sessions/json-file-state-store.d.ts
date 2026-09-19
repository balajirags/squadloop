import type { IStateStore, SessionEvent } from "./state-store-interface.js";
import type { TaskState } from "../workflow/workflow-engine-interface.js";
export declare class JsonFileStateStore implements IStateStore {
    readonly id = "json-file";
    initialize(): Promise<void>;
    readActiveTask(sessionId: string): Promise<TaskState | null>;
    writeActiveTask(sessionId: string, state: TaskState): Promise<void>;
    appendEvent(sessionId: string, event: SessionEvent): Promise<void>;
    readEvents(sessionId: string, limit?: number): Promise<SessionEvent[]>;
}
