import { createMachine, createActor } from "xstate";
import type {
  IWorkflowEngine,
  TaskState,
  WorkflowDefinition,
  PersonaWorkflowDefinition
} from "./workflow-engine-interface.js";

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

function createPersonaMachine(role: string, personaDef: PersonaWorkflowDefinition) {
  const statesConfig: Record<string, any> = {};

  for (const [stepKey, stepDef] of Object.entries(personaDef.steps)) {
    const onConfig: Record<string, any> = {};

    if (stepDef.next) {
      onConfig["STEP_COMPLETE"] = { target: stepDef.next };
      onConfig["team_step_complete"] = { target: stepDef.next };
      onConfig["NEXT"] = { target: stepDef.next };
    }

    for (const otherStepKey of Object.keys(personaDef.steps)) {
      if (otherStepKey !== stepKey) {
        onConfig[otherStepKey] = { target: otherStepKey };
      }
    }

    statesConfig[stepKey] = {
      on: onConfig
    };
  }

  const initialStep =
    personaDef.initial && personaDef.steps[personaDef.initial]
      ? personaDef.initial
      : Object.keys(personaDef.steps)[0] || "start";

  if (!statesConfig[initialStep]) {
    statesConfig[initialStep] = {};
  }

  return createMachine({
    id: `persona_${role}`,
    initial: initialStep,
    states: statesConfig
  });
}

export class XStateWorkflowEngine implements IWorkflowEngine {
  public readonly id = "xstate";
  private currentTaskState: TaskState | null = null;
  private workflowDef: WorkflowDefinition | null = null;
  private pipelineActor: ReturnType<typeof createActor> | null = null;
  private personaActor: ReturnType<typeof createActor> | null = null;

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
      const role = initialState.targetRole;
      const personaDef = workflowDef.personas[role];
      if (personaDef) {
        const personaMachine = createPersonaMachine(role, personaDef);
        this.personaActor = createActor(personaMachine);
        this.personaActor.start();
      }
      return this.currentTaskState;
    }

    const initialStageKey = workflowDef.pipeline.initial;
    const initialStageDef = workflowDef.pipeline.states[initialStageKey];
    const initialRole = initialStageDef?.agent || "developer";
    const personaDef = workflowDef.personas[initialRole];
    const initialMicroStep = personaDef?.initial || "start";
    const stepDef = personaDef?.steps?.[initialMicroStep];
    const actionText = stepDef?.action || "Perform step action";

    if (personaDef) {
      const personaMachine = createPersonaMachine(initialRole, personaDef);
      this.personaActor = createActor(personaMachine);
      this.personaActor.start();
    }

    const totalSteps = personaDef?.steps ? Object.keys(personaDef.steps).length : 1;
    const stepIndex = personaDef?.steps ? Object.keys(personaDef.steps).indexOf(initialMicroStep) : 0;
    const stepNum = stepIndex >= 0 ? stepIndex + 1 : 1;

    const promptCard = this.formatPromptCard(
      issueId,
      workflowDef.name,
      initialRole,
      initialMicroStep,
      stepNum,
      totalSteps,
      actionText
    );

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

    const normalizedEvent = event.trim().toUpperCase();
    const isStepCompleteEvent =
      normalizedEvent === "STEP_COMPLETE" ||
      normalizedEvent === "TEAM_STEP_COMPLETE" ||
      event === "team_step_complete" ||
      event === "STEP_COMPLETE";

    const personaDef = this.workflowDef.personas[currentState.targetRole];
    const currentStepDef = personaDef?.steps?.[currentState.microStep];

    let pipelineTriggerEvent: string | null = null;

    if (isStepCompleteEvent && currentStepDef) {
      const verdict = payload?.verdict ? String(payload.verdict).toUpperCase() : null;
      const passBool = payload?.pass === true;
      const failBool = payload?.pass === false;

      if ((verdict === "FAIL" || failBool) && currentStepDef.on_fail) {
        pipelineTriggerEvent = currentStepDef.on_fail;
      } else if ((verdict === "PASS" || passBool) && currentStepDef.on_pass) {
        pipelineTriggerEvent = currentStepDef.on_pass;
      } else if (currentStepDef.on_complete) {
        pipelineTriggerEvent = currentStepDef.on_complete;
      } else if (currentStepDef.next && personaDef.steps[currentStepDef.next]) {
        // Micro-step advancement within current persona
        const nextStepKey = currentStepDef.next;
        if (this.personaActor) {
          this.personaActor.send({ type: "STEP_COMPLETE" });
        }

        currentState.microStep = nextStepKey;
        const nextStepDef = personaDef.steps[nextStepKey];
        const nextAction = nextStepDef?.action || "Perform step action";
        const totalSteps = Object.keys(personaDef.steps).length;
        const stepIndex = Object.keys(personaDef.steps).indexOf(nextStepKey);
        const stepNum = stepIndex >= 0 ? stepIndex + 1 : 1;

        currentState.promptCard = this.formatPromptCard(
          currentState.issueId,
          currentState.workflowName,
          currentState.targetRole,
          nextStepKey,
          stepNum,
          totalSteps,
          nextAction
        );

        this.currentTaskState = currentState;
        return currentState;
      } else if (currentStepDef.on_pass) {
        pipelineTriggerEvent = currentStepDef.on_pass;
      } else if (currentStepDef.on_fail) {
        pipelineTriggerEvent = currentStepDef.on_fail;
      }
    } else if (!isStepCompleteEvent && personaDef?.steps?.[event]) {
      // Direct jump to a specific micro-step within persona
      const nextStepKey = event;
      currentState.microStep = nextStepKey;
      const nextStepDef = personaDef.steps[nextStepKey];
      const nextAction = nextStepDef?.action || "Perform step action";
      const totalSteps = Object.keys(personaDef.steps).length;
      const stepIndex = Object.keys(personaDef.steps).indexOf(nextStepKey);
      const stepNum = stepIndex >= 0 ? stepIndex + 1 : 1;

      currentState.promptCard = this.formatPromptCard(
        currentState.issueId,
        currentState.workflowName,
        currentState.targetRole,
        nextStepKey,
        stepNum,
        totalSteps,
        nextAction
      );

      this.currentTaskState = currentState;
      return currentState;
    } else if (!isStepCompleteEvent) {
      pipelineTriggerEvent = event;
    }

    // Handle pipeline stage transition
    if (pipelineTriggerEvent) {
      return this.handlePipelineTransition(pipelineTriggerEvent, currentState);
    }

    this.currentTaskState = currentState;
    return currentState;
  }

  private handlePipelineTransition(event: string, state: TaskState): TaskState {
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
      // Event not matched on current stage; check all states for matching transition
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

    // Check rework increment: returning to dev_implementing or explicit fail/rework events
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
    const nextPersonaDef = this.workflowDef.personas[nextRole];
    const nextMicroStep = nextPersonaDef?.initial || "start";
    const stepDef = nextPersonaDef?.steps?.[nextMicroStep];
    const actionText = stepDef?.action || "Proceed with task";

    if (nextPersonaDef) {
      const personaMachine = createPersonaMachine(nextRole, nextPersonaDef);
      this.personaActor = createActor(personaMachine);
      this.personaActor.start();
    }

    const totalSteps = nextPersonaDef?.steps ? Object.keys(nextPersonaDef.steps).length : 1;
    const stepIndex = nextPersonaDef?.steps ? Object.keys(nextPersonaDef.steps).indexOf(nextMicroStep) : 0;
    const stepNum = stepIndex >= 0 ? stepIndex + 1 : 1;

    state.pipelineStage = nextStageKey;
    state.targetRole = nextRole;
    state.microStep = nextMicroStep;
    state.promptCard = this.formatPromptCard(
      state.issueId,
      this.workflowDef.name,
      nextRole,
      nextMicroStep,
      stepNum,
      totalSteps,
      actionText
    );

    this.currentTaskState = state;
    return state;
  }

  private formatPromptCard(
    issueId: string,
    workflowName: string,
    role: string,
    step: string,
    stepNum: number,
    totalSteps: number,
    _action?: string
  ): string {
    return (
      `🚀 [SQUADLOOP FSM :: ${role.toUpperCase()} | Step ${stepNum}/${totalSteps}: ${step.toUpperCase()} | Issue #${issueId}]\n` +
      `👉 Tool Required: team_step_complete(step: "${step}", notes: "Summary of completed actions")\n`
    );
  }

  public getState(): TaskState {
    if (!this.currentTaskState) {
      throw new Error("No active state in XStateWorkflowEngine");
    }
    return this.currentTaskState;
  }
}
