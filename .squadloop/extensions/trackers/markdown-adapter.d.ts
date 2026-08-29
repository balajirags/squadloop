import type { ITrackerAdapter, TrackerIssue } from "./tracker-interface.js";
export declare class MarkdownStoryAdapter implements ITrackerAdapter {
    readonly name = "Markdown Local Stories";
    private getStoriesDir;
    private findStoryFiles;
    createIssue(title: string, body: string, options?: any): Promise<TrackerIssue>;
    updateStatus(issueId: string, status: string, notes?: string): Promise<void>;
    closeIssue(issueId: string, comment?: string): Promise<void>;
    getIssue(issueId: string): Promise<TrackerIssue | null>;
    listUncompletedIssues(): Promise<TrackerIssue[]>;
}
