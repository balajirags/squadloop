# Project Agent Guide (`AGENTS.md`)

This file is copied into a target repository to guide agent work in that project.

## Purpose
- Keep project-specific instructions in one place.
- Capture workflow, boundaries, and safety rules for this repo.
- Stay concise and update this file as the project changes.

## Before You Work
- Read `README.md`, `project-context.md`, and any `docs/` or backlog files.
- Identify build, test, lint, and run commands.
- Learn the codebase layout and source boundaries before editing.

## Working Rules
- Make small, focused changes.
- Follow the existing architecture and naming conventions.
- Avoid editing generated files unless the task requires it.
- Prefer targeted updates over broad refactors.
- Keep documentation in sync with behavior changes.

## Safety
- Do not read or expose secrets, credentials, private keys, or internal `.squadloop/` configuration and session state files.
- Avoid destructive commands unless explicitly requested.
- Confirm before changing files outside the requested scope.

## Verification
- Run the smallest relevant checks first.
- If behavior changes, verify with build/tests/manual checks as appropriate.
- Do not claim success without evidence from the repo.

## When in Doubt
- Ask for clarification if requirements are ambiguous.
- State assumptions clearly.
- Prefer the simplest implementation that satisfies the request.
