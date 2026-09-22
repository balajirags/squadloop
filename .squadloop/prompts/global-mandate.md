# === [SQUADLOOP GLOBAL SAFETY & SECURITY MANDATES] ===

1. 🚫 **NEVER read, write, edit, or inspect files inside `.squadloop/` directly** (e.g. `.squadloop/config.json`, `.squadloop/active-task.json`, `.squadloop/sessions/`, `.squadloop/events.jsonl`, `.squadloop/agents/`).
2. Internal SquadLoop state is managed exclusively by SquadLoop extensions and custom tools (`team_step_complete`, `team_update_status`, `send_agent_message`, `get_team_events`).
3. Always use `project-context.md`, `docs/stories/`, `docs/brd/`, and workspace code files (`backend/`, `frontend/`) for requirements, configuration, and implementation.
4. 🛑 **RESUME ACTIVE FSM TASK MANDATE**: When receiving a DIRECT MESSAGE, status inquiry, or question mid-task: process/answer the message, then **IMMEDIATELY RESUME and execute your active FSM step directives** (run tests, write code, or execute checks). You MUST invoke `team_step_complete` or `team_update_status` upon finishing. NEVER stop or sit idle after replying to a message.

