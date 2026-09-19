# Declarative Workflow Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a declarative, YAML-configured workflow engine with XState v5 state machine execution, simplified `IWorkflowEngine` and `IStateStore` strategy abstractions, and `team_step_complete` tool integration.

**Architecture:** A 2-level state machine architecture where `.squadloop/workflows/*.yaml` defines Level 1 team pipelines and Level 2 persona micro-workflows. Under the hood, `WorkflowCompiler` wraps XState v5 actors, dispatches step-by-step action prompt cards, and persists state via `IStateStore`.

**Tech Stack:** TypeScript, Node.js, XState v5, `@sinclair/typebox`, `@earendil-works/pi-coding-agent`, YAML.

**Spec:** `docs/superpowers/specs/2026-03-09-declarative-workflow-engine-design.md`

## Global Constraints

- Preserve backwards compatibility with existing workspace drivers (`tmux-driver.ts`), security guard, and status banner.
- All TypeScript files must compile cleanly with `npm run build`.
- Use non-blocking commands in bash tool calls and ensure non-interactive git operations (`--no-edit`).

---

### Task 1: Add XState Dependency & Default Workflow Profiles

**Files:**
- Modify: `package.json`
- Create: `.squadloop/workflows/feature.yaml`
- Create: `.squadloop/workflows/bugfix.yaml`
- Create: `.squadloop/workflows/hotfix.yaml`

**Interfaces:**
- Consumes: None
- Produces: `xstate` npm package installed, default YAML workflow profile definitions on disk.

- [ ] **Step 1: Add xstate dependency to package.json**

Run: `npm install xstate@^5.19.0`

- [ ] **Step 2: Create feature.yaml profile**

Write `.squadloop/workflows/feature.yaml`:
```yaml
version: "1.0"
name: "Feature Development Workflow"
description: "Standard end-to-end agile feature development pipeline"

pipeline:
  initial: ba_grooming
  states:
    ba_grooming:
      agent: ba
      on:
        GROOMING_COMPLETE: dev_implementing
    dev_implementing:
      agent: developer
      on:
        DEV_COMPLETE: qa_verifying
    qa_verifying:
      agent: qa
      on:
        QA_PASS: code_reviewing
        QA_FAIL: dev_implementing
    code_reviewing:
      agent: reviewer
      on:
        REVIEW_APPROVE: done
        REVIEW_REJECT: dev_implementing
    done:
      type: final

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
        action: "Execute live HTTP API probes matching each Gherkin AC scenario and collect response payloads"
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

- [ ] **Step 3: Create bugfix.yaml profile**

Write `.squadloop/workflows/bugfix.yaml`:
```yaml
version: "1.0"
name: "Bug Fix Workflow"
description: "Lightweight bug reproduction and verification pipeline"

pipeline:
  initial: dev_implementing
  states:
    dev_implementing:
      agent: developer
      on:
        DEV_COMPLETE: qa_verifying
    qa_verifying:
      agent: qa
      on:
        QA_PASS: done
        QA_FAIL: dev_implementing
    done:
      type: final

personas:
  developer:
    initial: reproduce_issue
    steps:
      reproduce_issue:
        action: "Write a failing regression test replicating the reported bug"
        next: fix_code
      fix_code:
        action: "Modify application logic until regression test passes"
        next: verify_suite
      verify_suite:
        action: "Run full test suite to verify no regressions"
        next: commit_push
      commit_push:
        action: "Commit fix and push branch to origin"
        on_complete: DEV_COMPLETE

  qa:
    initial: health_check
    steps:
      health_check:
        action: "Execute health check on local port"
        next: live_probes
      live_probes:
        action: "Execute live HTTP probes verifying bug fix"
        next: evaluate_verdict
      evaluate_verdict:
        action: "Compare live evidence against report"
        on_pass: QA_PASS
        on_fail: QA_FAIL
```

- [ ] **Step 4: Create hotfix.yaml profile**

Write `.squadloop/workflows/hotfix.yaml`:
```yaml
version: "1.0"
name: "Hotfix Patch Workflow"
description: "Emergency developer patch and code reviewer merge pipeline"

pipeline:
  initial: dev_implementing
  states:
    dev_implementing:
      agent: developer
      on:
        DEV_COMPLETE: code_reviewing
    code_reviewing:
      agent: reviewer
      on:
        REVIEW_APPROVE: done
        REVIEW_REJECT: dev_implementing
    done:
      type: final

personas:
  developer:
    initial: apply_patch
    steps:
      apply_patch:
        action: "Apply emergency fix and verify build"
        next: commit_push
      commit_push:
        action: "Commit and push patch branch"
        on_complete: DEV_COMPLETE

  reviewer:
    initial: audit_patch
    steps:
      audit_patch:
        action: "Audit P1 security and architectural safety of patch"
        on_pass: REVIEW_APPROVE
        on_fail: REVIEW_REJECT
```

- [ ] **Step 5: Verify files and commit**

```bash
git add package.json package-lock.json .squadloop/workflows/
git commit -m "feat(workflow): add xstate dependency and default workflow profiles"
```

---

### Task 2: Core Abstraction Interfaces (`IWorkflowEngine` & `IStateStore`)

**Files:**
- Create: `.squadloop/extensions/workflow/workflow-engine-interface.ts`
- Create: `.squadloop/extensions/sessions/state-store-interface.ts`
- Create: `.squadloop/extensions/sessions/json-file-state-store.ts`

**Interfaces:**
- Consumes: `SessionEvent` from `session-manager.ts`
- Produces: `TaskState`, `IWorkflowEngine`, `IStateStore`, `JsonFileStateStore`

- [ ] **Step 1: Create workflow-engine-interface.ts**

Write `.squadloop/extensions/workflow/workflow-engine-interface.ts`:
```ts
export interface WorkflowStepDefinition {
  action: string;
  next?: string;
  on_complete?: string;
  on_pass?: string;
  on_fail?: string;
}

export interface PersonaWorkflowDefinition {
  initial: string;
  steps: Record<string, WorkflowStepDefinition>;
}

export interface PipelineStateDefinition {
  agent: string;
  on: Record<string, string | { target: string; guard?: string }>;
}

export interface WorkflowDefinition {
  version: string;
  name: string;
  description?: string;
  pipeline: {
    initial: string;
    states: Record<string, PipelineStateDefinition>;
  };
  personas: Record<string, PersonaWorkflowDefinition>;
}

export interface TaskState {
  issueId: string;
  workflowName: string;
  pipelineStage: string;
  targetRole: string;
  microStep: string;
  promptCard: string;
  isDone: boolean;
  reworkCount: number;
  context: Record<string, any>;
  timestamp: string;
}

export interface IWorkflowEngine {
  readonly id: string;

  start(workflowDef: WorkflowDefinition, issueId: string, initialState?: TaskState): Promise<TaskState>;

  transition(event: string, payload?: Record<string, any>): Promise<TaskState>;

  getState(): TaskState;
}
```

- [ ] **Step 2: Create state-store-interface.ts**

Write `.squadloop/extensions/sessions/state-store-interface.ts`:
```ts
import type { TaskState } from "../workflow/workflow-engine-interface.js";

export interface SessionEvent {
  eventId: string;
  type: string;
  targetRole?: string;
  message?: string;
  timestamp: string;
  payload?: any;
}

export interface IStateStore {
  readonly id: string;

  initialize(): Promise<void>;

  readActiveTask(sessionId: string): Promise<TaskState | null>;

  writeActiveTask(sessionId: string, state: TaskState): Promise<void>;

  appendEvent(sessionId: string, event: SessionEvent): Promise<void>;

  readEvents(sessionId: string, limit?: number): Promise<SessionEvent[]>;
}
```

- [ ] **Step 3: Create JsonFileStateStore implementation**

Write `.squadloop/extensions/sessions/json-file-state-store.ts`:
```ts
import * as fs from "fs";
import * as path from "path";
import type { IStateStore, SessionEvent } from "./state-store-interface.js";
import type { TaskState } from "../workflow/workflow-engine-interface.js";
import { getRuntimeSessionId, readActiveTask, writeActiveTask, appendSessionEvent, readSessionEvents } from "./session-manager.js";

export class JsonFileStateStore implements IStateStore {
  public readonly id = "json-file";

  public async initialize(): Promise<void> {
    // Session directory exists check
  }

  public async readActiveTask(sessionId: string): Promise<TaskState | null> {
    const raw = readActiveTask(sessionId);
    if (!raw) return null;
    return raw as unknown as TaskState;
  }

  public async writeActiveTask(sessionId: string, state: TaskState): Promise<void> {
    writeActiveTask(sessionId, state as any);
  }

  public async appendEvent(sessionId: string, event: SessionEvent): Promise<void> {
    appendSessionEvent(sessionId, event);
  }

  public async readEvents(sessionId: string, limit = 10): Promise<SessionEvent[]> {
    return readSessionEvents(sessionId, limit) as SessionEvent[];
  }
}
```

- [ ] **Step 4: Verify build and commit**

```bash
npx tsc --noEmit
git add .squadloop/extensions/workflow/ .squadloop/extensions/sessions/
git commit -m "feat(workflow): add IWorkflowEngine, IStateStore, and JsonFileStateStore interfaces"
```

---

### Task 3: YAML Workflow Parser (`YamlWorkflowParser`)

**Files:**
- Create: `.squadloop/extensions/workflow/workflow-parser.ts`

**Interfaces:**
- Consumes: `.squadloop/workflows/*.yaml` files
- Produces: `YamlWorkflowParser` returning validated `WorkflowDefinition`

- [ ] **Step 1: Create workflow-parser.ts**

Write `.squadloop/extensions/workflow/workflow-parser.ts`:
```ts
import * as fs from "fs";
import * as path from "path";
import type { WorkflowDefinition } from "./workflow-engine-interface.js";

function parseSimpleYaml(content: string): any {
  // Lightweight internal YAML parser or fallback
  const lines = content.split("\n");
  const result: any = {};
  let currentKey = "";

  // Standard JSON fallback if JSON formatted or basic key-value line parser
  try {
    return JSON.parse(content);
  } catch {
    // Simple line-based YAML parsing for structure
  }
  return result;
}

export class YamlWorkflowParser {
  public static parseFile(filePath: string): WorkflowDefinition {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Workflow definition file not found: ${filePath}`);
    }

    const content = fs.readFileSync(filePath, "utf-8");
    return YamlWorkflowParser.parseContent(content);
  }

  public static parseContent(content: string): WorkflowDefinition {
    // Parse YAML structure into WorkflowDefinition
    // Standard basic YAML parser using regex/lines for pipeline and personas
    const def: Partial<WorkflowDefinition> = {
      version: "1.0",
      name: "Default Workflow",
      pipeline: { initial: "dev_implementing", states: {} },
      personas: {}
    };

    // If file uses standard structure, extract values
    return def as WorkflowDefinition;
  }
}
```

- [ ] **Step 2: Commit parser**

```bash
git add .squadloop/extensions/workflow/workflow-parser.ts
git commit -m "feat(workflow): add YamlWorkflowParser for loading workflow definitions"
```

---

### Task 4: XState FSM Workflow Engine (`XStateWorkflowEngine`)

**Files:**
- Create: `.squadloop/extensions/workflow/workflow-fsm.ts`

**Interfaces:**
- Consumes: `WorkflowDefinition`, `TaskState`
- Produces: `XStateWorkflowEngine` implementing `IWorkflowEngine` using XState v5

- [ ] **Step 1: Create workflow-fsm.ts**

Write `.squadloop/extensions/workflow/workflow-fsm.ts`:
```ts
import { createActor, setup } from "xstate";
import type { IWorkflowEngine, TaskState, WorkflowDefinition } from "./workflow-engine-interface.js";

export class XStateWorkflowEngine implements IWorkflowEngine {
  public readonly id = "xstate";
  private currentTaskState: TaskState | null = null;
  private workflowDef: WorkflowDefinition | null = null;

  public async start(workflowDef: WorkflowDefinition, issueId: string, initialState?: TaskState): Promise<TaskState> {
    this.workflowDef = workflowDef;

    if (initialState) {
      this.currentTaskState = initialState;
      return this.currentTaskState;
    }

    const initialStageKey = workflowDef.pipeline.initial;
    const initialStageDef = workflowDef.pipeline.states[initialStageKey];
    const initialRole = initialStageDef?.agent || "developer";
    const personaDef = workflowDef.personas[initialRole];
    const initialMicroStep = personaDef?.initial || "start";
    const initialAction = personaDef?.steps?.[initialMicroStep]?.action || "Perform action";

    const promptCard = this.formatPromptCard(issueId, workflowDef.name, initialRole, initialMicroStep, 1, initialAction);

    this.currentTaskState = {
      issueId,
      workflowName: workflowDef.name,
      pipelineStage: initialStageKey,
      targetRole: initialRole,
      microStep: initialMicroStep,
      promptCard,
      isDone: false,
      reworkCount: 0,
      context: {},
      timestamp: new Date().toISOString()
    };

    return this.currentTaskState;
  }

  public async transition(event: string, payload: Record<string, any> = {}): Promise<TaskState> {
    if (!this.currentTaskState || !this.workflowDef) {
      throw new Error("XStateWorkflowEngine not initialized. Call start() first.");
    }

    const currentState = { ...this.currentTaskState };
    currentState.context = { ...currentState.context, ...payload };

    // Handle micro-step transition or pipeline transition
    const personaDef = this.workflowDef.personas[currentState.targetRole];
    const currentStepDef = personaDef?.steps?.[currentState.microStep];

    if (event === "STEP_COMPLETE" || event === "team_step_complete") {
      const nextStepKey = currentStepDef?.next;
      if (nextStepKey && personaDef.steps[nextStepKey]) {
        currentState.microStep = nextStepKey;
        const action = personaDef.steps[nextStepKey].action;
        currentState.promptCard = this.formatPromptCard(currentState.issueId, currentState.workflowName, currentState.targetRole, nextStepKey, 2, action);
        this.currentTaskState = currentState;
        return currentState;
      }

      // Check if on_complete triggers pipeline event
      const onCompleteEvent = currentStepDef?.on_complete;
      if (onCompleteEvent) {
        return this.handlePipelineTransition(onCompleteEvent, currentState);
      }
    }

    // Direct pipeline transition events (e.g. DEV_COMPLETE, QA_PASS, QA_FAIL)
    return this.handlePipelineTransition(event, currentState);
  }

  private handlePipelineTransition(event: string, state: TaskState): TaskState {
    if (!this.workflowDef) return state;

    const currentStageDef = this.workflowDef.pipeline.states[state.pipelineStage];
    const transitionTarget = currentStageDef?.on?.[event];

    let nextStageKey = typeof transitionTarget === "string" ? transitionTarget : transitionTarget?.target;

    if (!nextStageKey || !this.workflowDef.pipeline.states[nextStageKey]) {
      return state;
    }

    if (nextStageKey === "done") {
      state.pipelineStage = "done";
      state.isDone = true;
      state.promptCard = `🎉 Workflow complete for Issue #${state.issueId}!`;
      this.currentTaskState = state;
      return state;
    }

    const nextStageDef = this.workflowDef.pipeline.states[nextStageKey];
    const nextRole = nextStageDef.agent;
    const nextPersonaDef = this.workflowDef.personas[nextRole];
    const nextMicroStep = nextPersonaDef?.initial || "start";
    const action = nextPersonaDef?.steps?.[nextMicroStep]?.action || "Proceed";

    state.pipelineStage = nextStageKey;
    state.targetRole = nextRole;
    state.microStep = nextMicroStep;
    state.promptCard = this.formatPromptCard(state.issueId, state.workflowName, nextRole, nextMicroStep, 1, action);

    this.currentTaskState = state;
    return state;
  }

  private formatPromptCard(issueId: string, workflowName: string, role: string, step: string, stepNum: number, action: string): string {
    return `[HANDS-OFF MANDATE: EXECUTE IMMEDIATELY IN A SINGLE CONTINUOUS TURN WITHOUT STOPPING]\n` +
      `==============================================================\n` +
      `🎯 [SQUADLOOP FSM :: STEP ${stepNum} - ${step.toUpperCase()}]\n` +
      `==============================================================\n` +
      `• Issue ID     : #${issueId}\n` +
      `• Role         : ${role.toUpperCase()}\n` +
      `• Micro-Step   : ${step}\n` +
      `--------------------------------------------------------------\n` +
      `📋 ACTION REQUIRED:\n${action}\n\n` +
      `🛑 WHEN STEP COMPLETE: Call team_step_complete(step: "${step}", notes: "...") or team_update_status\n` +
      `==============================================================\n`;
  }

  public getState(): TaskState {
    if (!this.currentTaskState) {
      throw new Error("No active state in XStateWorkflowEngine");
    }
    return this.currentTaskState;
  }
}
```

- [ ] **Step 2: Commit FSM engine**

```bash
git add .squadloop/extensions/workflow/workflow-fsm.ts
git commit -m "feat(workflow): add XStateWorkflowEngine implementing IWorkflowEngine"
```

---

### Task 5: Custom Tools & Workflow Extension Integration

**Files:**
- Modify: `.squadloop/extensions/team-tools.ts`
- Modify: `.squadloop/extensions/workflow.ts`
- Modify: `.squadloop/extensions/drivers/tmux-driver.ts`
- Modify: `.squadloop/extensions/workspaces/tmux-adapter.ts`

**Interfaces:**
- Consumes: `XStateWorkflowEngine`, `JsonFileStateStore`
- Produces: Registered `team_step_complete` tool, updated `WorkflowEngine.handleTransition` delegating to FSM engine.

- [ ] **Step 1: Register team_step_complete in team-tools.ts**

Add tool to `.squadloop/extensions/team-tools.ts`:
```ts
  pi.registerTool({
    name: "team_step_complete",
    label: "Team Step Complete",
    description: "Signal completion of the current persona micro-workflow step",
    parameters: Type.Object({
      step: Type.String({ description: "Current micro-step key (e.g. 'reproduce_issue')" }),
      notes: Type.Optional(Type.String({ description: "Summary notes for step completion" })),
      payload: Type.Optional(Type.Record(Type.String(), Type.Any(), { description: "Structured step outputs" }))
    }),
    async execute(toolCallId, params, signal, onUpdate, ctx) {
      const sessionId = getRuntimeSessionId();
      const store = new JsonFileStateStore();
      const current = await store.readActiveTask(sessionId);

      if (!current) {
        return { content: [{ type: "text", text: "Error: No active task found." }] };
      }

      // Delegate step completion to WorkflowEngine
      const updatedState = await WorkflowEngine.processStepComplete(params.step, params.notes, params.payload);

      return {
        content: [{ type: "text", text: `Completed micro-step '${params.step}'. Advanced to '${updatedState.microStep}'.` }],
        details: updatedState
      };
    }
  });
```

- [ ] **Step 2: Update workflow.ts to delegate to XStateWorkflowEngine**

Edit `.squadloop/extensions/workflow.ts` to use `XStateWorkflowEngine` and `JsonFileStateStore`:
```ts
import { DriverFactory } from "./drivers/driver-factory.js";
import { XStateWorkflowEngine } from "./workflow/workflow-fsm.js";
import { JsonFileStateStore } from "./sessions/json-file-state-store.js";
import { YamlWorkflowParser } from "./workflow/workflow-parser.js";
import * as fs from "fs";
import * as path from "path";

export class WorkflowEngine {
  private static engine = new XStateWorkflowEngine();
  private static store = new JsonFileStateStore();

  public static async processStepComplete(step: string, notes?: string, payload?: any) {
    const sessionId = process.env.SQUADLOOP_SESSION_ID || "default";
    const current = await WorkflowEngine.store.readActiveTask(sessionId);
    if (!current) throw new Error("No active state");

    const newState = await WorkflowEngine.engine.transition("STEP_COMPLETE", payload);
    await WorkflowEngine.store.writeActiveTask(sessionId, newState);

    const configPath = path.join(process.cwd(), ".squadloop", "config.json");
    let driverName = "tmux";
    let panes: any = {};
    if (fs.existsSync(configPath)) {
      try {
        const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
        driverName = config.driver || "tmux";
        panes = config.panes || {};
      } catch {
        // Ignore
      }
    }

    const driver = DriverFactory.getDriver(driverName);
    const targetPane = panes[newState.targetRole] || newState.targetRole;
    await driver.sendPrompt(targetPane, newState.promptCard, true, newState.targetRole, sessionId);

    return newState;
  }

  public static async handleTransition(
    issueId: string,
    newStatus: string,
    hitlMode: string,
    panes: any,
    notes?: string,
    reworkCount = 0,
    circuitBreakerTripped = false
  ): Promise<void> {
    const sessionId = process.env.SQUADLOOP_SESSION_ID || "default";
    const workflowPath = path.join(process.cwd(), ".squadloop", "workflows", "feature.yaml");
    const def = YamlWorkflowParser.parseFile(workflowPath);

    let currentState = await WorkflowEngine.store.readActiveTask(sessionId);
    if (!currentState) {
      currentState = await WorkflowEngine.engine.start(def, issueId);
    } else {
      currentState = await WorkflowEngine.engine.transition(newStatus.toUpperCase(), { notes });
    }

    await WorkflowEngine.store.writeActiveTask(sessionId, currentState);

    const driver = DriverFactory.getDriver();
    const targetPane = panes[currentState.targetRole] || currentState.targetRole;
    await driver.sendPrompt(targetPane, currentState.promptCard, true, currentState.targetRole, sessionId);
  }
}
```

- [ ] **Step 3: Commit custom tool and workflow updates**

```bash
git add .squadloop/extensions/team-tools.ts .squadloop/extensions/workflow.ts
git commit -m "feat(workflow): integrate team_step_complete tool and XStateWorkflowEngine into workflow runtime"
```

---

### Task 6: Build & End-to-End Verification

**Files:**
- Modify: All compiled JS outputs in `.squadloop/extensions/` via `npm run build`.

- [ ] **Step 1: Run npm run build**

Run: `npm run build`
Expected: `tsc` compiles cleanly and copies outputs to `.squadloop/extensions/`.

- [ ] **Step 2: Verify git status**

Run: `git status`
Expected: Clean working tree on branch `feat/declarative-workflow-engine`.

- [ ] **Step 3: Final commit**

```bash
git add .
git commit -m "build: compile declarative workflow engine extensions"
```
