import { PlaybookContext, PlaybookRunResult, PlaybookStep } from './types';

export class PlaybookRunner {
  async run(steps: PlaybookStep[], context: PlaybookContext = {}): Promise<PlaybookRunResult> {
    const results: PlaybookRunResult['steps'] = [];

    for (const step of steps) {
      try {
        await step.run(context);
        results.push({ step: step.name, ok: true });
      } catch (error) {
        results.push({
          step: step.name,
          ok: false,
          detail: error instanceof Error ? error.message : 'Erro desconhecido',
        });

        return { ok: false, steps: results };
      }
    }

    return { ok: true, steps: results };
  }
}