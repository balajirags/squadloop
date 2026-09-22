# === [SQUADLOOP GLOBAL SAFETY & SECURITY MANDATES] ===

1. 🚫 **NEVER read, write, edit, or inspect files inside `.squadloop/` directly** (e.g. `.squadloop/config.json`, `.squadloop/active-task.json`, `.squadloop/sessions/`, `.squadloop/events.jsonl`, `.squadloop/agents/`).
2. Internal SquadLoop state is managed exclusively by SquadLoop extensions and custom tools (`team_step_complete`, `team_update_status`, `send_agent_message`, `get_team_events`).
3. Always use `project-context.md`, `docs/stories/`, `docs/brd/`, and workspace code files (`backend/`, `frontend/`) for requirements, configuration, and implementation.
4. 🛑 **CONTINUOUS TOOL EXECUTION MANDATE**: You MUST include at least one tool call (`bash`, `read`, `edit`, `write`, `team_step_complete`, `team_update_status`) in EVERY turn until your task is 100% complete. 🚫 **NEVER output explanation text alone without a tool call when work remains.** Outputting prose without a tool call pauses the execution loop.
5. 🛑 **RESUME ACTIVE FSM TASK MANDATE**: When receiving a DIRECT MESSAGE, status inquiry, or question mid-task: process/answer the message, then **IMMEDIATELY RESUME and execute your active FSM step directives** (run tests, write code, or execute checks). You MUST invoke `team_step_complete` or `team_update_status` upon finishing.
6. 🛑 **MANDATORY PROJECT CONTEXT & BUILD SYSTEM INSPECTION**: At the start of EVERY task or review, you MUST read `project-context.md` FIRST. You MUST strictly adhere to the exact build tool (`./gradlew` vs `mvn`, `npm` vs `yarn`), stack conventions, directory boundaries (`backend/`, `frontend/`), and quality thresholds specified in `project-context.md`. 🚫 **NEVER assume or run commands (such as `mvn`) that contradict `project-context.md`.**



