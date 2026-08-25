import type { ITrackerAdapter, TrackerIssue } from "./tracker-interface.js";
export declare class JiraAdapter implements ITrackerAdapter {
    readonly name = "Jira";
    createIssue(title: string, body: string, options?: any): Promise<TrackerIssue>;
    updateStatus(issueId: string, status: string, notes?: string): Promise<void>;
    closeIssue(issueId: string, comment?: string): Promise<void>;
    getIssue(issueId: string): Promise<TrackerIssue | null>;
    listUncompletedIssues(): Promise<TrackerIssue[]>;
}
