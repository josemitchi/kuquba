import { randomUUID } from "node:crypto";

import { env } from "../../config/env";

export type FormalDeliveryAdapterStatus = "SENT" | "DELIVERED" | "FAILED";

export type FormalDeliveryAdapterMessage = {
  body: string[];
  channel: "EMAIL" | "WHATSAPP";
  idempotencyKey: string;
  recipient: string;
  recipientName: string;
  subject: string;
  templateKey: string;
  templateVersion: number;
};

export type FormalDeliveryAdapterResult = {
  acceptedAt: Date | null;
  deliveredAt: Date | null;
  errorCode: string | null;
  errorMessage: string | null;
  failedAt: Date | null;
  ok: boolean;
  provider: string;
  providerMessageId: string | null;
  retryable: boolean;
  sentAt: Date | null;
  status: FormalDeliveryAdapterStatus;
};

export type FormalDeliveryWebhookRequest = {
  body: {
    channel: FormalDeliveryAdapterMessage["channel"];
    idempotencyKey: string;
    message: {
      body: string[];
      subject: string;
    };
    metadata: {
      contractVersion: 1;
      source: "kuquba_ops_formal_delivery";
    };
    recipient: {
      address: string;
      name: string;
    };
    template: {
      key: string;
      version: number;
    };
  };
  headers: Record<string, string>;
  method: "POST";
};

export type FormalDeliveryWebhookResponseBody = {
  acceptedAt?: string | null;
  deliveredAt?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  id?: string | null;
  messageId?: string | null;
  providerMessageId?: string | null;
  retryable?: boolean | null;
  sentAt?: string | null;
  status?: string | null;
};

const providerLabels = {
  dev: "dev_transactional_log",
  webhook: "webhook_transactional"
} as const;

export function getFormalDeliveryProviderName() {
  return providerLabels[env.FORMAL_DELIVERY_PROVIDER];
}

export function buildFormalDeliveryWebhookRequest(
  message: FormalDeliveryAdapterMessage
): FormalDeliveryWebhookRequest {
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
    "Idempotency-Key": message.idempotencyKey,
    "X-KUQUBA-Delivery-Channel": message.channel,
    "X-KUQUBA-Template-Key": message.templateKey,
    "X-KUQUBA-Template-Version": String(message.templateVersion)
  };

  if (env.FORMAL_DELIVERY_API_KEY) {
    headers.Authorization = "Bearer <configured>";
  }

  return {
    body: {
      channel: message.channel,
      idempotencyKey: message.idempotencyKey,
      message: {
        body: message.body,
        subject: message.subject
      },
      metadata: {
        contractVersion: 1,
        source: "kuquba_ops_formal_delivery"
      },
      recipient: {
        address: message.recipient,
        name: message.recipientName
      },
      template: {
        key: message.templateKey,
        version: message.templateVersion
      }
    },
    headers,
    method: "POST"
  };
}

export function normalizeFormalDeliveryWebhookResponse(
  responseBody: FormalDeliveryWebhookResponseBody,
  receivedAt = new Date()
): FormalDeliveryAdapterResult {
  const status = normalizeWebhookStatus(responseBody.status);
  const provider = getFormalDeliveryProviderName();
  const providerMessageId = pickWebhookMessageId(responseBody);

  if (status === "FAILED") {
    return buildFailedResult({
      errorCode: normalizeNullableString(responseBody.errorCode) ?? "webhook_provider_failed",
      errorMessage:
        normalizeNullableString(responseBody.errorMessage) ??
        "External formal delivery provider returned a failed delivery status.",
      provider,
      providerMessageId,
      retryable: responseBody.retryable === true
    });
  }

  const acceptedAt = parseWebhookDate(responseBody.acceptedAt) ?? receivedAt;
  const sentAt = parseWebhookDate(responseBody.sentAt) ?? acceptedAt;
  const deliveredAt =
    status === "DELIVERED"
      ? parseWebhookDate(responseBody.deliveredAt) ?? sentAt
      : parseWebhookDate(responseBody.deliveredAt);

  return {
    acceptedAt,
    deliveredAt,
    errorCode: null,
    errorMessage: null,
    failedAt: null,
    ok: true,
    provider,
    providerMessageId,
    retryable: false,
    sentAt,
    status
  };
}

export async function sendFormalTransactionalMessage(
  message: FormalDeliveryAdapterMessage
): Promise<FormalDeliveryAdapterResult> {
  if (env.FORMAL_DELIVERY_PROVIDER === "webhook") {
    const contract = buildFormalDeliveryWebhookRequest(message);

    return buildFailedResult({
      errorCode: "webhook_provider_disabled",
      errorMessage: `Generic webhook contract ${contract.body.metadata.contractVersion} is defined, but external formal delivery remains disabled until a provider and destination are approved.`,
      provider: getFormalDeliveryProviderName(),
      retryable: false
    });
  }

  const sentAt = new Date();
  const messageFingerprint = `${message.templateKey}:${message.templateVersion}:${message.channel}:${message.subject}`;

  return {
    acceptedAt: sentAt,
    deliveredAt: sentAt,
    errorCode: null,
    errorMessage: null,
    failedAt: null,
    ok: true,
    provider: getFormalDeliveryProviderName(),
    providerMessageId: `dev_${randomUUID()}_${messageFingerprint.length}`,
    retryable: false,
    sentAt,
    status: "DELIVERED"
  };
}

function normalizeWebhookStatus(status: string | null | undefined): FormalDeliveryAdapterStatus {
  const normalized = status?.trim().toUpperCase();

  if (normalized === "DELIVERED") {
    return "DELIVERED";
  }

  if (normalized === "FAILED") {
    return "FAILED";
  }

  return "SENT";
}

function pickWebhookMessageId(responseBody: FormalDeliveryWebhookResponseBody) {
  return (
    normalizeNullableString(responseBody.providerMessageId) ??
    normalizeNullableString(responseBody.messageId) ??
    normalizeNullableString(responseBody.id)
  );
}

function normalizeNullableString(value: string | null | undefined) {
  const normalized = value?.trim();

  return normalized ? normalized.slice(0, 500) : null;
}

function parseWebhookDate(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);

  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function buildFailedResult(input: {
  errorCode: string;
  errorMessage: string;
  provider: string;
  providerMessageId?: string | null;
  retryable: boolean;
}): FormalDeliveryAdapterResult {
  return {
    acceptedAt: null,
    deliveredAt: null,
    errorCode: input.errorCode,
    errorMessage: input.errorMessage,
    failedAt: new Date(),
    ok: false,
    provider: input.provider,
    providerMessageId: input.providerMessageId ?? null,
    retryable: input.retryable,
    sentAt: null,
    status: "FAILED"
  };
}
