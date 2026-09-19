import { readActiveTask, writeActiveTask, appendSessionEvent, readSessionEvents } from "./session-manager.js";
export class JsonFileStateStore {
    id = "json-file";
    async initialize() {
        // Session directory check/initialization if needed
    }
    async readActiveTask(sessionId) {
        const raw = readActiveTask(sessionId);
        if (!raw)
            return null;
        if (raw.issueId && raw.microStep) {
            return raw;
        }
        return {
            issueId: raw.activeIssueId || "",
            workflowName: raw.workflowName || "Feature Development Workflow",
            pipelineStage: raw.pipelineStage || raw.status || "dev_implementing",
            targetRole: raw.targetRole || "developer",
            microStep: raw.microStep || "start",
            promptCard: raw.promptCard || "",
            isDone: raw.status === "done",
            reworkCount: raw.reworkCount || 0,
            context: raw.context || {},
            timestamp: raw.timestamp || new Date().toISOString()
        };
    }
    async writeActiveTask(sessionId, state) {
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
        writeActiveTask(sessionId, merged);
    }
    async appendEvent(sessionId, event) {
        appendSessionEvent(sessionId, event);
    }
    async readEvents(sessionId, limit = 10) {
        return readSessionEvents(sessionId, limit);
    }
}
