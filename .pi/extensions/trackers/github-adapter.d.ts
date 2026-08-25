import type { ITrackerAdapter, TrackerIssue } from "./tracker-interface.js";
export declare class GitHubIssuesAdapter implements ITrackerAdapter {
    readonly name = "GitHub Issues";
    private extractNumericId;
    createIssue(title: string, body: string): Promise<TrackerIssue>;
    updateStatus(issueId: string, status: string, notes?: string): Promise<void>;
    closeIssue(issueId: string, comment?: string): Promise<void>;
    getIssue(issueId: string): Promise<TrackerIssue | null>;
    listUncompletedIssues(): Promise<TrackerIssue[]>;
}
