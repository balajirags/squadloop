import type { TaskState } from "../workflow/workflow-engine-interface.js";

export interface SessionEvent {
  eventId: string;
  type: string;
  targetRole?: string;
  message?: string;
  timestamp: string;
  payload?: any;
}

export interface IStateStore {
  readonly id: string;

  initialize(): Promise<void>;

  readActiveTask(sessionId: string): Promise<TaskState | null>;

  writeActiveTask(sessionId: string, state: TaskState): Promise<void>;

  appendEvent(sessionId: string, event: SessionEvent): Promise<void>;

  readEvents(sessionId: string, limit?: number): Promise<SessionEvent[]>;
}
