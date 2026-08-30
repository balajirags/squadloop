export interface WorkspacePanes {
  orchestrator: string;
  ba: string;
  developer: string;
  qa: string;
  reviewer: string;
}

export interface IWorkspaceAdapter {
  readonly name: string;
  isAvailable(): boolean;
  setupLayout(layout: "panes" | "windows", sessionId?: string): WorkspacePanes;
  recoverMissingPanes(currentPanes: WorkspacePanes, sessionId?: string): WorkspacePanes;
  sendPrompt(targetPane: string, promptText: string, clear?: boolean): Promise<void>;
  startAppServerWindow(startCommand?: string): string;
}
