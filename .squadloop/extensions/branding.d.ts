import type { WorkspacePanes } from "./drivers/terminal-driver-interface.js";
import { type ActiveTaskState } from "./sessions/session-manager.js";
export type SquadloopRole = "orchestrator" | "ba" | "developer" | "qa" | "reviewer";
export interface BrandingSnapshot {
    sessionId: string;
    mode: string;
    layout: string;
    driver: string;
    activeIssueId: string;
    status: string;
    reworkCount: number;
    tokenStats?: ActiveTaskState["tokenStats"];
    notes?: string;
}
export interface BrandingContext {
    hasUI?: boolean;
    model?: {
        provider?: string;
        id?: string;
    } | null;
    ui: {
        theme: {
            fg: (color: any, text: string) => string;
            bold: (text: string) => string;
        };
        setTheme: (theme: string) => unknown;
        setWidget: (key: string, content?: string[] | ((tui: unknown, theme: BrandingContext["ui"]["theme"]) => unknown), options?: {
            placement?: "belowEditor";
        }) => unknown;
        setStatus: (key: string, text?: string) => unknown;
    };
    sessionManager?: {
        getSessionFile?: () => string | null;
    };
}
export declare const SQUADLOOP_THEME_NAME = "squadloop";
export declare function isSquadloopRole(value: string | null | undefined): value is SquadloopRole;
export declare function getRoleMeta(role?: SquadloopRole): {
    badge: string;
    label: string;
    tmuxStyle: string;
    tmuxActiveStyle: string;
    terminalLabel: string;
};
export declare function getCurrentRole(): SquadloopRole;
export declare function setCurrentRole(role: string | null | undefined): void;
export declare function setRoleFromSystemPrompt(systemPrompt?: string): void;
export declare function getRoleTitle(role?: SquadloopRole): string;
export declare function getTmuxBorderStyle(role?: SquadloopRole): string;
export declare function getTmuxActiveBorderStyle(role?: SquadloopRole): string;
export declare function getRoleBadge(role?: SquadloopRole): string;
export declare function getRoleLabel(role?: SquadloopRole): string;
export declare function getSessionConfig(sessionId?: string): BrandingSnapshot;
export declare function formatTokenSummary(tokenStats?: ActiveTaskState["tokenStats"]): string;
export declare function formatStatusLabel(status: string): string;
export declare function buildHeaderLines(ctx: any, snapshot?: BrandingSnapshot): string[];
export declare function buildFooterText(ctx: any, snapshot?: BrandingSnapshot): string;
export declare function refreshBrandingUi(ctx: any): void;
export declare function noteTurnStart(): number;
export declare function noteTurnEnd(): number;
export declare function applyTmuxRoleStyling(sessionName: string, panes: WorkspacePanes): void;
