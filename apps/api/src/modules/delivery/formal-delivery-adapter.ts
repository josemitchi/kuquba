import { randomUUID } from "node:crypto";

export type FormalDeliveryAdapterMessage = {
  body: string[];
  channel: "EMAIL" | "WHATSAPP";
  recipient: string;
  recipientName: string;
  subject: string;
  templateKey: string;
  templateVersion: number;
};

export type FormalDeliveryAdapterResult = {
  deliveredAt: Date | null;
  errorCode: string | null;
  errorMessage: string | null;
  failedAt: Date | null;
  ok: boolean;
  provider: string;
  providerMessageId: string | null;
  sentAt: Date | null;
  status: "SENT" | "DELIVERED" | "FAILED";
};

const provider = "dev_transactional_log";

export async function sendFormalTransactionalMessage(
  message: FormalDeliveryAdapterMessage
): Promise<FormalDeliveryAdapterResult> {
  const sentAt = new Date();
  const messageFingerprint = `${message.templateKey}:${message.templateVersion}:${message.channel}:${message.subject}`;

  return {
    deliveredAt: sentAt,
    errorCode: null,
    errorMessage: null,
    failedAt: null,
    ok: true,
    provider,
    providerMessageId: `dev_${randomUUID()}_${messageFingerprint.length}`,
    sentAt,
    status: "DELIVERED"
  };
}
