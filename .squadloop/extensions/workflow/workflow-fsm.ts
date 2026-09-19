import { createMachine, createActor } from "xstate";
import * as fs from "fs";
import * as path from "path";
import type {
  IWorkflowEngine,
  TaskState,
  WorkflowDefinition
} from "./workflow-engine-interface.js";

function resolveStoryFilePath(issueId: string): string | null {
  if (!issueId) return null;

  if (fs.existsSync(issueId)) {
    return issueId;
  }

  const storiesDir = path.join(process.cwd(), "docs", "stories");
  if (!fs.existsSync(storiesDir)) return null;

  const searchDir = (dir: string): string | null => {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          const found = searchDir(fullPath);
          if (found) return found;
        } else if (entry.isFile() && entry.name.endsWith(".md")) {
          const cleanIssue = issueId.toUpperCase().replace(/^#/, "");
          const cleanName = entry.name.toUpperCase();
          if (cleanName.includes(cleanIssue)) {
            return path.relative(process.cwd(), fullPath);
          }
        }
      }
    } catch {
      // Non-fatal
    }
    return null;
  };

  return searchDir(storiesDir);
}

function createPipelineMachine(workflowDef: WorkflowDefinition) {
  const statesConfig: Record<string, any> = {};

  for (const [stateKey, stateDef] of Object.entries(workflowDef.pipeline.states)) {
    if (stateDef.type === "final" || stateKey === "done") {
      statesConfig[stateKey] = { type: "final" };
    } else {
      const onConfig: Record<string, any> = {};
      if (stateDef.on) {
        for (const [eventKey, targetVal] of Object.entries(stateDef.on)) {
          if (typeof targetVal === "string") {
            onConfig[eventKey] = { target: targetVal };
          } else if (typeof targetVal === "object" && targetVal !== null) {
            onConfig[eventKey] = { target: targetVal.target };
          }
        }
      }
      statesConfig[stateKey] = {
        on: onConfig
      };
    }
  }

  return createMachine({
    id: `${workflowDef.name.replace(/\s+/g, "_")}_pipeline`,
    initial: workflowDef.pipeline.initial,
    states: statesConfig
  });
}

export class XStateWorkflowEngine implements IWorkflowEngine {
  public readonly id = "xstate";
  private currentTaskState: TaskState | null = null;
  private workflowDef: WorkflowDefinition | null = null;
  private pipelineActor: ReturnType<typeof createActor> | null = null;

  public async start(
    workflowDef: WorkflowDefinition,
    issueId: string,
    initialState?: TaskState
  ): Promise<TaskState> {
    this.workflowDef = workflowDef;

    const pipelineMachine = createPipelineMachine(workflowDef);
    this.pipelineActor = createActor(pipelineMachine);
    this.pipelineActor.start();

    if (initialState) {
      this.currentTaskState = { ...initialState };
      return this.currentTaskState;
    }

    const initialStageKey = workflowDef.pipeline.initial;
    const initialStageDef = workflowDef.pipeline.states[initialStageKey];
    const initialRole = initialStageDef?.agent || "developer";

    const promptCard = this.formatTaskPrompt(issueId, workflowDef.name, initialStageKey, initialRole);

    this.currentTaskState = {
      issueId,
      workflowName: workflowDef.name,
      pipelineStage: initialStageKey,
      targetRole: initialRole,
      microStep: "active",
      promptCard,
      isDone: false,
      reworkCount: 0,
      context: {},
      timestamp: new Date().toISOString()
    };

    return this.currentTaskState;
  }

  public async transition(
    event: string,
    payload: Record<string, any> = {}
  ): Promise<TaskState> {
    if (!this.currentTaskState || !this.workflowDef) {
      throw new Error("XStateWorkflowEngine not initialized. Call start() first.");
    }

    const currentState: TaskState = {
      ...this.currentTaskState,
      context: { ...this.currentTaskState.context, ...payload },
      timestamp: new Date().toISOString()
    };

    return this.handlePipelineTransition(event, currentState, payload?.notes);
  }

  private handlePipelineTransition(event: string, state: TaskState, notes?: string): TaskState {
    if (!this.workflowDef) return state;

    const currentStageDef = this.workflowDef.pipeline.states[state.pipelineStage];
    const transitionTarget = currentStageDef?.on?.[event];

    let nextStageKey: string | undefined;
    if (typeof transitionTarget === "string") {
      nextStageKey = transitionTarget;
    } else if (typeof transitionTarget === "object" && transitionTarget !== null) {
      nextStageKey = transitionTarget.target;
    }

    if (!nextStageKey || !this.workflowDef.pipeline.states[nextStageKey]) {
      for (const [stKey, stDef] of Object.entries(this.workflowDef.pipeline.states)) {
        if (stDef.on?.[event]) {
          const targetVal = stDef.on[event];
          nextStageKey = typeof targetVal === "string" ? targetVal : targetVal.target;
          break;
        }
      }
    }

    if (!nextStageKey || !this.workflowDef.pipeline.states[nextStageKey]) {
      return state;
    }

    if (this.pipelineActor) {
      this.pipelineActor.send({ type: event });
    }

    const previousStage = state.pipelineStage;

    if (nextStageKey === "done" || this.workflowDef.pipeline.states[nextStageKey]?.type === "final") {
      state.pipelineStage = nextStageKey;
      state.isDone = true;
      state.promptCard = `🎉 Workflow complete for Issue #${state.issueId}!`;
      this.currentTaskState = state;
      return state;
    }

    const upperEvent = event.toUpperCase();
    if (
      upperEvent === "QA_FAIL" ||
      upperEvent === "REVIEW_REJECT" ||
      upperEvent.includes("FAIL") ||
      upperEvent.includes("REJECT") ||
      (nextStageKey === "dev_implementing" && previousStage !== "ba_grooming")
    ) {
      state.reworkCount += 1;
    }

    const nextStageDef = this.workflowDef.pipeline.states[nextStageKey];
    const nextRole = nextStageDef.agent || "developer";

    state.pipelineStage = nextStageKey;
    state.targetRole = nextRole;
    state.microStep = "active";
    state.promptCard = this.formatTaskPrompt(state.issueId, this.workflowDef.name, nextStageKey, nextRole, notes);

    this.currentTaskState = state;
    return state;
  }

  private formatTaskPrompt(
    issueId: string,
    workflowName: string,
    stage: string,
    role: string,
    notes?: string
  ): string {
    const roleUpper = role.toUpperCase();
    let actionInstruction = "";
    const storyFile = resolveStoryFilePath(issueId);

    switch (role) {
      case "ba":
        actionInstruction = `Groom BRD/PRD or Story for Issue #${issueId}. Follow ba.md rules (Scan -> Auto Re-Slice mega-stories into 4 outcome stories -> Gherkin AC scenario tables). Call team_update_status with 'ready-for-dev' when complete.`;
        break;
      case "developer": {
        const fileInstruction = storyFile
          ? `\n📖 Story File: ${storyFile}\nRead '${storyFile}' and project-context.md FIRST.`
          : "";
        const notesInstruction = notes ? `\n📝 Grooming/Rework Notes: ${notes}` : "";
        actionInstruction =
          `Implement Issue #${issueId}.${fileInstruction}${notesInstruction}\n` +
          `🛑 STRICT SINGLE-STORY ISOLATION: Implement ONLY Issue #${issueId}. DO NOT read, implement, or batch any other stories in this run.\n` +
          `Follow developer.md rules (Recon -> Plan checkpoint in docs/dev-checkpoints/${issueId}.json -> Feature branch -> TDD tests -> Code implementation -> JaCoCo build-verify -> Commit & Push).\n` +
          `Call team_update_status with 'qa-verifying' when complete.`;
        break;
      }
      case "qa": {
        const fileInstruction = storyFile ? `\n📖 Story File: ${storyFile}\nRead '${storyFile}' for Acceptance Criteria.` : "";
        actionInstruction = `Verify Issue #${issueId}.${fileInstruction}\nFollow qa.md rules (Health check -> Non-blocking app startup -> Live HTTP API probes -> 1:1 AC evidence mapping). Call team_update_status with 'code-review' (if PASS) or 'dev-rework' (if FAIL).`;
        break;
      }
      case "reviewer": {
        const fileInstruction = storyFile ? `\n📖 Story File: ${storyFile}` : "";
        actionInstruction = `Review Issue #${issueId}.${fileInstruction}${notes ? ` (Notes: ${notes})` : ""}\nFollow reviewer.md rules (Find branch -> Inspect git diff vs main -> P1 Security & P2 Spec/AC drift audit -> Non-interactive PR merge). Call team_update_status with 'done' (if APPROVE) or 'dev-rework' (if REQUEST_CHANGES).`;
        break;
      }
      default:
        actionInstruction = `Execute task for Issue #${issueId}. Follow persona instructions and update team status when complete.`;
    }

    return (
      `🚀 [SQUADLOOP FSM :: ${roleUpper} | Stage: ${stage.toUpperCase()} | Issue #${issueId}]\n` +
      `==============================================================\n` +
      `📋 TASK HANDOFF:\n${actionInstruction}\n` +
      `==============================================================\n`
    );
  }

  public getState(): TaskState {
    if (!this.currentTaskState) {
      throw new Error("No active state in XStateWorkflowEngine");
    }
    return this.currentTaskState;
  }
}
