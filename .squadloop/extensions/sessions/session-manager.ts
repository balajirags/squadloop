import * as fs from "fs";
import * as path from "path";
import { randomBytes } from "crypto";

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

function getProjectRoot(): string {
  return process.cwd();
}

export function normalizeSessionId(raw?: string | null): string {
  const value = String(raw || "").trim();
  if (!value) return "default";
  return value
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^[-_.]+|[-_.]+$/g, "")
    .toLowerCase() || "default";
}

export function createSessionId(prefix = "session"): string {
  return `${normalizeSessionId(prefix)}-${randomBytes(2).toString("hex")}`;
}

export function getSessionRoot(): string {
  return path.join(getProjectRoot(), ".squadloop", "sessions");
}

export function getSessionDir(sessionId = "default"): string {
  const dir = path.join(getSessionRoot(), normalizeSessionId(sessionId));
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function getActiveTaskPath(sessionId = "default"): string {
  return path.join(getSessionDir(sessionId), "active-task.json");
}

export function getEventsPath(sessionId = "default"): string {
  return path.join(getSessionDir(sessionId), "events.jsonl");
}

export function getMailboxPath(sessionId = "default", role = "all"): string {
  return path.join(getSessionDir(sessionId), "mailbox", `${normalizeSessionId(role)}.jsonl`);
}

export function getSessionName(sessionId = "default"): string {
  return `squadloop-${normalizeSessionId(sessionId)}`;
}

export function getRuntimeSessionId(fallback = "default"): string {
  return normalizeSessionId(process.env.SQUADLOOP_SESSION_ID || process.env.SQUADLOOP_SESSION_NAME || fallback);
}

function readJson<T>(filePath: string): T | null {
  try {
    if (!fs.existsSync(filePath)) return null;
    return JSON.parse(fs.readFileSync(filePath, "utf-8")) as T;
  } catch {
    return null;
  }
}

function writeJson(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2), "utf-8");
}

export function readActiveTask(sessionId = getRuntimeSessionId()): ActiveTaskState | null {
  return readJson<ActiveTaskState>(getActiveTaskPath(sessionId));
}

export function writeActiveTask(sessionId: string, state: ActiveTaskState): ActiveTaskState {
  const normalizedSessionId = normalizeSessionId(sessionId);
  const payload: ActiveTaskState = {
    ...state,
    sessionId: normalizedSessionId,
    sessionName: getSessionName(normalizedSessionId),
    timestamp: state.timestamp || new Date().toISOString()
  };
  writeJson(getActiveTaskPath(normalizedSessionId), payload);
  return payload;
}

export function appendSessionEvent(sessionId: string, eventRecord: Record<string, unknown>): void {
  const eventsPath = getEventsPath(sessionId);
  fs.mkdirSync(path.dirname(eventsPath), { recursive: true });

  let lines: string[] = [];
  if (fs.existsSync(eventsPath)) {
    const raw = fs.readFileSync(eventsPath, "utf-8").trim();
    if (raw) {
      lines = raw.split("\n").filter(Boolean);
    }
  }

  lines.push(JSON.stringify({
    ...eventRecord,
    sessionId: normalizeSessionId(sessionId),
    sessionName: getSessionName(sessionId)
  }));

  if (lines.length > 1000) {
    lines = lines.slice(-1000);
  }

  fs.writeFileSync(eventsPath, lines.join("\n") + "\n", "utf-8");
}

export function readSessionEvents(sessionId: string, limit = 10): Record<string, unknown>[] {
  const eventsPath = getEventsPath(sessionId);
  if (!fs.existsSync(eventsPath)) return [];
  const raw = fs.readFileSync(eventsPath, "utf-8").trim();
  if (!raw) return [];
  const lines = raw.split("\n").filter(Boolean).slice(-Math.max(1, limit));
  return lines.map((line) => {
    try {
      return JSON.parse(line) as Record<string, unknown>;
    } catch {
      return { raw: line };
    }
  });
}

export function appendAgentMailbox(sessionId: string, role: string, messageRecord: Record<string, unknown>): void {
  const mbPath = getMailboxPath(sessionId, role);
  fs.mkdirSync(path.dirname(mbPath), { recursive: true });

  let lines: string[] = [];
  if (fs.existsSync(mbPath)) {
    const raw = fs.readFileSync(mbPath, "utf-8").trim();
    if (raw) {
      lines = raw.split("\n").filter(Boolean);
    }
  }

  lines.push(JSON.stringify({
    ...messageRecord,
    targetRole: role,
    sessionId: normalizeSessionId(sessionId),
    timestamp: messageRecord.timestamp || new Date().toISOString()
  }));

  if (lines.length > 500) {
    lines = lines.slice(-500);
  }

  fs.writeFileSync(mbPath, lines.join("\n") + "\n", "utf-8");
}

export function readAgentMailbox(sessionId: string, role: string, limit = 10): Record<string, unknown>[] {
  const mbPath = getMailboxPath(sessionId, role);
  if (!fs.existsSync(mbPath)) return [];
  const raw = fs.readFileSync(mbPath, "utf-8").trim();
  if (!raw) return [];
  const lines = raw.split("\n").filter(Boolean).slice(-Math.max(1, limit));
  return lines.map((line) => {
    try {
      return JSON.parse(line) as Record<string, unknown>;
    } catch {
      return { raw: line };
    }
  });
}

export function listSessions(): SessionSummary[] {
  const root = getSessionRoot();
  if (!fs.existsSync(root)) return [];

  const sessions: SessionSummary[] = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const sessionId = normalizeSessionId(entry.name);
    const activeTaskPath = path.join(root, entry.name, "active-task.json");
    const eventsPath = path.join(root, entry.name, "events.jsonl");
    const activeTask = readJson<ActiveTaskState>(activeTaskPath);
    const stat = fs.existsSync(activeTaskPath) ? fs.statSync(activeTaskPath) : fs.existsSync(eventsPath) ? fs.statSync(eventsPath) : fs.statSync(path.join(root, entry.name));

    sessions.push({
      sessionId,
      sessionName: activeTask?.sessionName || getSessionName(sessionId),
      driver: activeTask?.driver || "unknown",
      status: activeTask?.status || "unknown",
      activeIssueId: activeTask?.activeIssueId || "",
      notes: activeTask?.notes,
      timestamp: activeTask?.timestamp || stat.mtime.toISOString(),
      updatedAt: stat.mtimeMs,
      activeTaskPath,
      eventsPath
    });
  }

  return sessions.sort((a, b) => b.updatedAt - a.updatedAt);
}

export function resolveSessionId(sessionId?: string | null): string | null {
  if (sessionId) {
    return normalizeSessionId(sessionId);
  }

  const runtime = normalizeSessionId(process.env.SQUADLOOP_SESSION_ID || process.env.SQUADLOOP_SESSION_NAME || "");
  if (runtime && runtime !== "default") return runtime;

  const sessions = listSessions();
  return sessions[0]?.sessionId || null;
}

export function resolveLastActiveSession(): SessionSummary | null {
  return listSessions()[0] || null;
}

export function ensureSessionState(sessionId: string, defaults: Partial<ActiveTaskState> = {}): ActiveTaskState {
  const existing = readActiveTask(sessionId);
  if (existing) return existing;
  const now = new Date().toISOString();
  return writeActiveTask(sessionId, {
    activeIssueId: "",
    status: "awaiting-human-input",
    updatedBy: "system",
    notes: "Fresh SquadLoop session started.",
    timestamp: now,
    ...defaults
  });
}
