export interface SessionPanes {
    orchestrator: string;
    ba: string;
    developer: string;
    qa: string;
    reviewer: string;
}
export interface ActiveTaskState {
    activeIssueId: string;
    status: string;
    updatedBy: string;
    notes?: string;
    reworkCount?: number;
    tokenStats?: {
        promptTokens?: number;
        completionTokens?: number;
        totalTokens?: number;
        estimatedCostUsd?: number;
    };
    timestamp: string;
    sessionId?: string;
    sessionName?: string;
    driver?: string;
    panes?: SessionPanes;
}
export interface SessionSummary {
    sessionId: string;
    sessionName: string;
    driver: string;
    status: string;
    activeIssueId: string;
    notes?: string;
    timestamp: string;
    updatedAt: number;
    activeTaskPath: string;
    eventsPath: string;
}
export declare function normalizeSessionId(raw?: string | null): string;
export declare function createSessionId(prefix?: string): string;
export declare function getSessionRoot(): string;
export declare function getSessionDir(sessionId?: string): string;
export declare function getActiveTaskPath(sessionId?: string): string;
export declare function getEventsPath(sessionId?: string): string;
export declare function getSessionName(sessionId?: string): string;
export declare function getRuntimeSessionId(fallback?: string): string;
export declare function readActiveTask(sessionId?: string): ActiveTaskState | null;
export declare function writeActiveTask(sessionId: string, state: ActiveTaskState): ActiveTaskState;
export declare function appendSessionEvent(sessionId: string, eventRecord: Record<string, unknown>): void;
export declare function readSessionEvents(sessionId: string, limit?: number): Record<string, unknown>[];
export declare function listSessions(): SessionSummary[];
export declare function resolveSessionId(sessionId?: string | null): string | null;
export declare function resolveLastActiveSession(): SessionSummary | null;
export declare function ensureSessionState(sessionId: string, defaults?: Partial<ActiveTaskState>): ActiveTaskState;
