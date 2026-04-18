export interface PlaybookStepResult {
  step: string;
  ok: boolean;
  detail?: string;
}

export interface PlaybookContext {
  correlationId?: string;
}

export interface PlaybookStep {
  name: string;
  run: (context: PlaybookContext) => Promise<void>;
}

export interface PlaybookRunResult {
  ok: boolean;
  steps: PlaybookStepResult[];
}