# Declarative Workflow Engine & XState State Machine Design Specification

**Date**: 2026-03-09  
**Status**: Draft / Approved  
**Author**: SquadLoop Core Architecture Team  
**Spec Path**: `docs/superpowers/specs/2026-03-09-declarative-workflow-engine-design.md`

---

## 1. Executive Summary & Problem Statement

### 1.1 Problem Statement
In previous iterations of SquadLoop, team workflows relied heavily on long, natural language instructions embedded inside agent persona prompt files (`.squadloop/prompts/*.md` and `.squadloop/agents/*.md`). While flexible, prompt-driven orchestration suffers from key reliability drawbacks:
- LLM reasoning loops can skip intermediate steps, stall, or fail to call status update tools (`team_update_status`, `send_agent_message`).
- Agents can misinterpret transitions or get confused when given ambiguous branch hints or non-imperative phrasing.
- Workflow logic is tightly coupled to individual persona prompt markdown files, making it difficult to create task-specific execution flows (e.g., feature vs. bug-fix vs. hotfix).

### 1.2 Solution
SquadLoop is introducing a **Declarative Workflow Engine** backed by an embedded [XState v5](https://stately.ai/docs/xstate) finite state machine (FSM). 
- **Declarative YAML Configuration**: Users define team workflows and agent step pipelines in simple YAML files inside `.squadloop/workflows/`.
- **Abstracted FSM Engine**: Under the hood, SquadLoop compiles YAML definitions into strongly-typed XState actors at runtime. XState complexity is completely hidden from the user.
- **Two-Level State Machine Architecture**:
  1. **Level 1 (Team Pipeline Machine)**: High-level task transitions across agent roles (`BA -> Dev -> QA -> Reviewer -> Done`).
  2. **Level 2 (Persona Micro-Workflow Machine)**: Deterministic step-by-step micro-steps within an individual agent persona (e.g. `reproduce_bug -> fix_code -> verify_suite -> commit_push`).
- **Micro-Prompt Dispatching**: Instead of sending massive system prompts, the engine sends targeted, single-step action prompts to agent panes, enforcing 100% deterministic, step-by-step execution.

---

## 2. Declarative Workflow Schema Specification (`.squadloop/workflows/*.yaml`)

Each workflow file in `.squadloop/workflows/` defines two sections:
1. `pipeline`: The high-level role pipeline machine.
2. `personas`: The step-by-step micro-workflows for each agent persona participating in the workflow.

### 2.1 YAML Schema Definition

```yaml
version: "1.0"
name: "Feature Development Workflow"
description: "Standard end-to-end agile feature development pipeline"

# -------------------------------------------------------------------
# 1. Team-Level Lifecycle Pipeline (Level 1 FSM)
# -------------------------------------------------------------------
pipeline:
  initial: ba_grooming
  states:
    ba_grooming:
      agent: ba
      on:
        GROOMING_COMPLETE:
          target: dev_implementing

    dev_implementing:
      agent: developer
      on:
        DEV_COMPLETE:
          target: qa_verifying

    qa_verifying:
      agent: qa
      on:
        QA_PASS:
          target: code_reviewing
        QA_FAIL:
          target: dev_implementing
          guard: reworkCount < 3

    code_reviewing:
      agent: reviewer
      on:
        REVIEW_APPROVE:
          target: done
        REVIEW_REJECT:
          target: dev_implementing
          guard: reworkCount < 3

    done:
      type: final

# -------------------------------------------------------------------
# 2. Persona Micro-Workflows (Level 2 FSM)
# -------------------------------------------------------------------
personas:
  ba:
    initial: scan_brd
    steps:
      scan_brd:
        action: "Read source BRD/PRD and project-context.md; evaluate mega-story criteria"
        next: auto_reslice
      auto_reslice:
        action: "Break mega-story into atomic CRUD user stories with Gherkin Acceptance Criteria"
        next: create_tracker_issue
      create_tracker_issue:
        action: "Create GitHub Issues / Jira tickets / local story files with Gherkin ACs"
        on_complete: GROOMING_COMPLETE

  developer:
    initial: git_checkout
    steps:
      git_checkout:
        action: "Checkout latest main, pull origin main, and create feature branch feature/issue-${issueId}"
        next: write_tests
      write_tests:
        action: "Read story ACs and write failing unit/integration test cases"
        next: implement_code
      implement_code:
        action: "Implement application logic in backend/ or frontend/ until tests pass"
        next: build_verify
      build_verify:
        action: "Run local build/test suite and inspect actual JaCoCo/coverage report file against thresholds"
        next: commit_push
      commit_push:
        action: "Stage touched files, commit with feat scope, and push feature branch to origin"
        on_complete: DEV_COMPLETE

  qa:
    initial: health_check
    steps:
      health_check:
        action: "Execute non-blocking health check on http://localhost:<port>; start app in background if offline"
        next: live_http_probes
      live_http_probes:
        action: "Execute live HTTP API probes matching each Gherkin AC scenario and collect payloads"
        next: evaluate_verdict
      evaluate_verdict:
        action: "Compare live response evidence 1:1 against ACs and update tracker story comment"
        on_pass: QA_PASS
        on_fail: QA_FAIL

  reviewer:
    initial: find_branch
    steps:
      find_branch:
        action: "Find active feature branch matching Issue #${issueId} via git branch --list"
        next: inspect_diff
      inspect_diff:
        action: "Inspect git diff main...<branch> for P1 (Security) and P2 (Architecture) violations"
        next: evaluate_review
      evaluate_review:
        action: "If P1/P2 violations found, emit REVIEW_REJECT. If approved, merge branch non-interactively to main"
        on_pass: REVIEW_APPROVE
        on_fail: REVIEW_REJECT
```

---

## 3. Multi-Workflow Catalog & Orchestrator Intent Binding

SquadLoop maintains a catalog of workflow profiles in `.squadloop/workflows/`:
- `feature.yaml`: Full pipeline (`ba -> dev -> qa -> reviewer -> done`).
- `bugfix.yaml`: Lightweight bug-fix pipeline (`dev -> qa -> done`).
- `hotfix.yaml`: Emergency patch pipeline (`dev -> reviewer -> done`).
- `grooming.yaml`: Requirement slicing only (`ba -> done`).

### 3.1 Intent Parsing & Dynamic Selection Matrix
When the human operator submits a request in Pane 0, Master Orchestrator matches the intent to a workflow profile and binds it to the active task state:

| Human Request Pattern | Inferred Intent | Workflow Selected | Pipeline Chain |
|---|---|---|---|
| `"Groom & implement BRD docs/brd/campaigns.md"` | Feature Development | `feature.yaml` | `ba -> dev -> qa -> reviewer` |
| `"Fix NPE in auth controller"` | Bug Fix | `bugfix.yaml` | `dev -> qa` |
| `"Emergency hotfix for payment endpoint"` | Hotfix Patch | `hotfix.yaml` | `dev -> reviewer` |
| `"Slice PRD into user stories"` | Grooming Only | `grooming.yaml` | `ba -> done` |

The selected workflow path is serialized in `.squadloop/sessions/<id>/active-task.json`:
```json
{
  "activeIssueId": "42",
  "activeWorkflow": "bugfix",
  "workflowPath": ".squadloop/workflows/bugfix.yaml",
  "pipelineStage": "dev_implementing",
  "microStep": "reproduce_issue",
  "reworkCount": 0
}
```

---

## 4. FSM Compiler & Runtime Execution Engine

### 4.1 Workflow Compiler (`WorkflowCompiler.ts`)
The `WorkflowCompiler` reads any valid `.squadloop/workflows/*.yaml` file and instantiates an XState v5 root actor at runtime:

1. **Root Machine (Level 1)**: Manages `pipeline.states`. Guards enforce circuit breaker thresholds (`reworkCount <= 3`).
2. **Child Machine (Level 2)**: When the root machine enters a role state (e.g. `dev_implementing`), it spawns a child XState actor configured with `personas.developer.steps`.
3. **Step Advancement**: When an agent calls `team_step_complete`, the child actor advances to the next micro-step.
4. **Pipeline Advancement**: When the final micro-step completes (`on_complete: DEV_COMPLETE`), the child actor emits the event to the root machine, triggering the transition to the next persona stage (`qa_verifying`).

---

## 5. Micro-Prompt Dispatching & Action Enforcers

Instead of loading broad persona prompts into agent panes, SquadLoop's FSM Engine dispatches **Micro-Step Action Cards** directly to tmux panes on each step transition:

### Example Micro-Prompt (Developer Step 1 of 4):
```text
==============================================================
🎯 [SQUADLOOP FSM :: STEP 1/4 - REPRODUCE_ISSUE]
==============================================================
• Issue ID     : #42
• Persona      : Developer (Pane 2)
• Workflow     : bugfix.yaml
• Micro-Step   : 1 of 4 (reproduce_issue)
--------------------------------------------------------------
📋 ACTION REQUIRED:
Write a failing regression test replicating the reported bug in Issue #42.
Run tests to verify the test fails as expected.

🛑 MANDATORY STEP COMPLETION TOOL:
Call tool: team_step_complete(step: "reproduce_issue", notes: "Added failing test in AuthControllerTest.java")
==============================================================
```

---

## 6. Inter-Agent Communication & Structured Handoffs

### 6.1 State-Driven Context Payloads
When a persona completes a stage, it passes a structured JSON payload to `team_update_status` or `team_step_complete`. The FSM Engine stores this payload in the shared XState context and injects it into the next persona's initial step prompt:

- **BA -> Dev**: `{ storyId: "42", specPath: "docs/stories/campaigns/01-create.md", gherkinACs: [...] }`
- **Dev -> QA**: `{ storyId: "42", featureBranch: "feature/issue-42", testCheckpoint: "docs/dev-checkpoints/42.json" }`
- **QA -> Reviewer / Dev**: `{ storyId: "42", verdict: "PASS" | "FAIL", httpProbes: [...], failureReason: "..." }`
- **Reviewer -> Dev Rework**: `{ storyId: "42", verdict: "REQUEST_CHANGES", p1p2Findings: [...] }`

### 6.2 Asynchronous Direct Messaging (`send_agent_message`)
For mid-step clarifications (e.g., Developer asking BA a question), agents use `send_agent_message`. The message is stored in `.squadloop/sessions/<id>/mailbox/<role>.jsonl` and routed to the target pane without breaking or resetting the FSM state.

### 6.3 Orchestrator Telemetry Feed (Pane 0)
On every micro-step or stage transition, the FSM Engine automatically logs a clean status card to Master Orchestrator (Pane 0), giving the human operator full visibility into team progress:
```text
📢 [FSM STATE TRANSITION :: QA -> CODE_REVIEW]
• Task: Issue #42 | Workflow: feature.yaml | Verdict: QA_PASS (3/3 ACs verified)
```

---

## 7. Custom Tool API Specification

### 7.1 `team_step_complete`
Advances the active persona's inner micro-workflow to the next step.
```ts
{
  name: "team_step_complete",
  description: "Signal completion of the current persona micro-workflow step",
  parameters: {
    step: string;     // e.g. "reproduce_issue"
    notes?: string;   // e.g. "Added regression test case"
    payload?: object; // Optional structured outputs (e.g. branch name, test report path)
  }
}
```

### 7.2 `team_update_status`
Emits pipeline-level events (`DEV_COMPLETE`, `QA_PASS`, `QA_FAIL`, `REVIEW_APPROVE`, `REVIEW_REJECT`) to transition the Team Pipeline machine.
```ts
{
  name: "team_update_status",
  description: "Update team pipeline lifecycle status and transition FSM stage",
  parameters: {
    issueId: string;
    newStatus: "ready-for-dev" | "qa-verifying" | "code-review" | "done" | "dev-rework";
    notes?: string;
    payload?: object;
  }
}
```

---

## 8. Session State Persistence & Recovery Schema

The active FSM state snapshot is persisted on every transition to `.squadloop/sessions/<id>/active-task.json`:

```json
{
  "sessionId": "default",
  "activeIssueId": "42",
  "activeWorkflow": "bugfix",
  "workflowPath": ".squadloop/workflows/bugfix.yaml",
  "pipelineState": "dev_implementing",
  "microStep": "fix_code",
  "reworkCount": 0,
  "completedMicroSteps": ["reproduce_issue"],
  "context": {
    "specPath": "docs/stories/campaigns/01-create.md",
    "featureBranch": "feature/issue-42"
  },
  "timestamp": "2026-03-09T10:30:00.000Z"
}
```

When `/squadloop-resume` is executed, the `WorkflowCompiler` restores the XState actor directly from the snapshot state, resuming execution at the exact micro-step.

---

## 9. Verification & Approval Gate

- [x] **Declarative YAML Schema**: Tested and specified in Section 2.
- [x] **Multi-Workflow Catalog & Intent Routing**: Specified in Section 3.
- [x] **FSM Engine Architecture**: Specified in Section 4.
- [x] **Structured Handoff & Inter-Agent Messaging**: Specified in Section 6.
- [x] **Tool API & State Persistence**: Specified in Sections 7 & 8.

---
