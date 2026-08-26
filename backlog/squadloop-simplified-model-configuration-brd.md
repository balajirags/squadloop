# BRD: SquadLoop — Simplified Per-Agent Model Configuration & Auto-Sync Engine

**Status**: Draft / Pending Approval  
**Date**: 2026-03-09  

## Executive Summary
This specification defines the product and technical requirements for simplifying model configuration across SquadLoop.

Model lookups for all 5 agent roles (`orchestrator`, `ba`, `developer`, `qa`, `reviewer`) will be centralized 100% inside `.pi/team-config.json` under a `"models"` section.

Users no longer need to copy or edit `.pi/models.json` for standard cloud providers (Anthropic, Google Gemini, OpenAI, DeepSeek, OpenRouter). `squadloop init` automatically copies `.pi/models.example.json` to `.pi/models.json` out-of-the-box for local providers (Ollama, LM Studio).

---

## 1. Unified Configuration Schema (`.pi/team-config.json`)

### 1.1 Schema Definition
`.pi/team-config.json` will contain a dedicated `models` map and an `_examples` hint block:

```json
{
  "exMode": "team",
  "hitl": "loop",
  "driver": "tmux",
  "layout": "panes",
  "_modelExamples": {
    "anthropic": "anthropic/claude-3-7-sonnet",
    "google": "google/gemini-2.5-flash",
    "openai": "openai/gpt-4o",
    "deepseek": "deepseek/deepseek-reasoner",
    "openrouter": "openrouter/anthropic/claude-3.7-sonnet",
    "ollama": "ollama/gemma4"
  },
  "models": {
    "orchestrator": "",
    "ba": "",
    "developer": "",
    "qa": "",
    "reviewer": ""
  }
}
```

### 1.2 `provider/model` Naming Convention
Model strings must consistently follow the `provider/model` pattern:
- `anthropic/claude-3-7-sonnet`
- `google/gemini-2.5-flash`
- `openai/gpt-4o`
- `deepseek/deepseek-reasoner`
- `openrouter/anthropic/claude-3.7-sonnet`
- `ollama/gemma4`

### 1.3 Fault Tolerance & Missing Key Safety
- The default value for every role in `"models"` is `""` (empty string).
- If the `"models"` object is completely omitted from `.pi/team-config.json`, or if specific role keys (e.g. `"developer"`) are removed by the user, SquadLoop safely falls back to `""` (empty string) without crashing or throwing undefined errors.
- If a role model is `""` (empty string), SquadLoop omits the `--model` flag, allowing Pi Agent to use its global/session default model.

---

## 2. Execution Mode Integration

### 2.1 Team Mode (`--ex-mode=team`)
- `TmuxDriver`, `HerdrDriver`, `ITerm2Driver`, and `RegularDriver` resolve model strings from `ModelResolver.getModel(role)`.
- If a model is specified (e.g. `"developer": "anthropic/claude-3-7-sonnet"`), the agent command is spawned with `--model "anthropic/claude-3-7-sonnet"`.

### 2.2 Standalone Mode (`--ex-mode=standalone`)
- `PromptSyncEngine` syncs prompt templates in `.pi/prompts/` (`orchestrator.md`, `ba.md`, `dev.md`, `qa.md`, `reviewer.md`).
- If a role model is specified in `.pi/team-config.json`, the frontmatter in `.pi/prompts/<role>.md` is automatically set with `model: <provider/model>`.
- When the user types `/ba`, `/dev`, `/qa`, `/reviewer`, or `/orchestrator` inside Pi, Pi Agent automatically switches the system prompt persona AND sets the active model to the configured provider/model string.

---

## 3. Simplified `squadloop init` Bootstrapping

`squadloop init` will:
1. Bootstrap `.pi/team-config.json` with the `_modelExamples` hint block and empty `"models"` mappings.
2. Automatically copy `.pi/models.example.json` to `.pi/models.json` if `.pi/models.json` does not exist.
3. Clean up legacy commented `model:` frontmatter lines in `.pi/agents/*.md` prompt files.
4. Auto-generate `.pi/prompts/*.md` slash command templates for Standalone Mode.
