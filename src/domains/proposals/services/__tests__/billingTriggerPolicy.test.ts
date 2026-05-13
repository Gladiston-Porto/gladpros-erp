import { getUnsupportedBillingTrigger, unsupportedBillingTriggerMessage } from '../billingTriggerPolicy';

describe('proposal billing trigger policy', () => {
  it('allows the only production-enabled billing trigger', () => {
    expect(getUnsupportedBillingTrigger('NA_APROVACAO')).toBeNull();
    expect(getUnsupportedBillingTrigger(undefined)).toBeNull();
  });

  it.each(['POR_MARCOS', 'NA_ENTREGA', 'CUSTOMIZADO'])(
    'blocks unsupported billing trigger %s instead of silently storing it',
    (trigger) => {
      expect(getUnsupportedBillingTrigger(trigger)).toBe(trigger);
      expect(unsupportedBillingTriggerMessage(trigger as never)).toContain('ainda não está habilitado em produção');
    }
  );
});
