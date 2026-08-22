export type AuditResult = "SUCCESS" | "PENDING" | "DENIED" | "FAILED";

export type AuditEventEnvelope = {
  actorUserId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  previousValue?: unknown;
  nextValue?: unknown;
  ipAddress?: string;
  correlationId: string;
  result: AuditResult;
  reason?: string;
  createdAt: string;
};

export function createAuditEventEnvelope(
  input: Omit<AuditEventEnvelope, "createdAt">
): AuditEventEnvelope {
  return {
    ...input,
    createdAt: new Date().toISOString()
  };
}
