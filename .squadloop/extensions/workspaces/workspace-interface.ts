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
  setupLayout(layout: "panes" | "windows"): WorkspacePanes;
  recoverMissingPanes(currentPanes: WorkspacePanes): WorkspacePanes;
  sendPrompt(targetPane: string, promptText: string, clear?: boolean): Promise<void>;
  startAppServerWindow(startCommand?: string): string;
}
