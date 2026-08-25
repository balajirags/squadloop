import type { ITrackerAdapter } from "./tracker-interface.js";
export declare class TrackerFactory {
    private static githubAdapter;
    private static jiraAdapter;
    private static markdownAdapter;
    static getAdapter(trackerType?: string): ITrackerAdapter;
}
