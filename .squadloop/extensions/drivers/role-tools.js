export const roles = ["orchestrator", "ba", "developer", "qa", "reviewer"];
/**
 * Per-role tool allowlist shared by every terminal driver's agent launch command.
 * Previously duplicated verbatim in tmux-driver.ts, herdr-driver.ts, and
 * iterm2-driver.ts; consolidated here so the three drivers can't drift.
 *
 * BA has no `bash` — grooming (reading a BRD, writing/updating local story
 * markdown under docs/stories/) never needs shell execution, and giving it
 * `bash` anyway is exactly what let a real run improvise `git`/`curl` calls
 * to try to hit an external tracker API that wasn't even the project's
 * configured tracker (project-context.md said "Local Docs"). `grep`/`find`/
 * `ls` cover the read-only exploration BA actually needs (checking existing
 * story numbering, locating the story template) without a shell.
 *
 * developer/qa/reviewer keep `bash` — it's load-bearing for git, build/test
 * commands, and live-server checks, which have no tool-level substitute.
 * They get grep/find/ls too, so simple lookups don't reach for a shell
 * one-liner by default. Destructive/protected-path bash usage across all
 * three is still gated by security-guard.ts, a separate control.
 */
export const roleTools = {
    orchestrator: ["team_start_request", "team_approve", "team_recover", "send_agent_message", "get_team_events"],
    ba: ["read", "write", "edit", "grep", "find", "ls", "team_step_complete", "team_update_status", "send_agent_message", "get_team_events"],
    developer: ["read", "edit", "write", "bash", "grep", "find", "ls", "team_step_complete", "team_update_status", "send_agent_message", "get_team_events"],
    qa: ["read", "bash", "grep", "find", "ls", "team_step_complete", "team_update_status", "send_agent_message", "get_team_events"],
    reviewer: ["read", "bash", "grep", "find", "ls", "team_step_complete", "team_update_status", "send_agent_message", "get_team_events"]
};
