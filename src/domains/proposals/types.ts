export interface AuditContext {
  actorId: number | string;
  ip: string;
  userAgent: string;
}

export interface ProposalOperationResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
