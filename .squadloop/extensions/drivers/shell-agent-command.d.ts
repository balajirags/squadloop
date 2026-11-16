/**
 * Builds the shell command string used to launch a persona's `pi` process for
 * drivers that hand a plain command string to another program (herdr, iTerm2
 * AppleScript `write text`) rather than an argv array like tmux-driver.ts.
 *
 * Previously duplicated byte-for-byte in both herdr-driver.ts and
 * iterm2-driver.ts, including a gap neither copy had: SQUADLOOP_ROLE was
 * never set, so anything keyed off it (team-tools.ts's role fallback, and
 * the continuous-execution/idle-heartbeat logic in index.ts) was silently
 * inert on these two drivers. Also never appended global-mandate.md, so the
 * shared safety rules never loaded there either — tmux-driver.ts's
 * agentArgs() does both.
 */
export declare function buildShellAgentCommand(role: string, sessionId?: string): string;
