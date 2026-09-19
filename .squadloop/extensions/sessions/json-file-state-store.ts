import type { IStateStore, SessionEvent } from "./state-store-interface.js";
import type { TaskState } from "../workflow/workflow-engine-interface.js";
import { readActiveTask, writeActiveTask, appendSessionEvent, readSessionEvents, type ActiveTaskState } from "./session-manager.js";

export class JsonFileStateStore implements IStateStore {
  public readonly id = "json-file";

  public async initialize(): Promise<void> {
    // Session directory check/initialization if needed
  }

  public async readActiveTask(sessionId: string): Promise<TaskState | null> {
    const raw = readActiveTask(sessionId);
    if (!raw) return null;
    if ((raw as any).issueId && (raw as any).microStep) {
      return raw as unknown as TaskState;
    }
    return {
      issueId: raw.activeIssueId || "",
      workflowName: (raw as any).workflowName || "Feature Development Workflow",
      pipelineStage: (raw as any).pipelineStage || raw.status || "dev_implementing",
      targetRole: (raw as any).targetRole || "developer",
      microStep: (raw as any).microStep || "start",
      promptCard: (raw as any).promptCard || "",
      isDone: raw.status === "done",
      reworkCount: raw.reworkCount || 0,
      context: (raw as any).context || {},
      timestamp: raw.timestamp || new Date().toISOString()
    };
  }

  public async writeActiveTask(sessionId: string, state: TaskState): Promise<void> {
    const existing = readActiveTask(sessionId);
    const merged = {
      ...existing,
      ...state,
      activeIssueId: state.issueId || existing?.activeIssueId || "",
      status: state.pipelineStage || existing?.status || "ready-for-dev",
      updatedBy: state.targetRole || existing?.updatedBy || "agent",
      reworkCount: state.reworkCount ?? existing?.reworkCount ?? 0,
      timestamp: state.timestamp || new Date().toISOString()
    };
    writeActiveTask(sessionId, merged as unknown as ActiveTaskState);
  }

  public async appendEvent(sessionId: string, event: SessionEvent): Promise<void> {
    appendSessionEvent(sessionId, event as unknown as Record<string, unknown>);
  }

  public async readEvents(sessionId: string, limit = 10): Promise<SessionEvent[]> {
    return readSessionEvents(sessionId, limit) as unknown as SessionEvent[];
  }
}
