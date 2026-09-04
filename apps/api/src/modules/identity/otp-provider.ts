import { createHmac, randomInt, timingSafeEqual } from "node:crypto";

import { env } from "../../config/env";

const resendEmailsUrl = "https://api.resend.com/emails";
const developmentOtpSigningSecret = "kuquba-development-otp-signing-secret-v1";

type Audience = "guest" | "owner" | "ops";
type Channel = "email" | "phone";

export class OtpDeliveryError extends Error {
  code: string;
  statusCode: number;

  constructor(code: string, message: string, statusCode = 502) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
  }
}

export type OtpDeliveryInput = {
  audience: Audience;
  challengeId: string;
  channel: Channel;
  code: string;
  correlationId: string;
  destination: string;
  expiresAt: Date;
};

export type OtpDeliveryResult = {
  provider: string;
  providerMessageId?: string;
  sentAt: Date;
  status: "ACCEPTED" | "DELIVERED";
};

export function generateOtpCode() {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

export function hashOtpCode(input: {
  challengeId: string;
  code: string;
  destinationHash: string;
  purpose: string;
}) {
  return createHmac("sha256", getOtpSigningSecret())
    .update(input.challengeId)
    .update(":")
    .update(input.destinationHash)
    .update(":")
    .update(input.purpose)
    .update(":")
    .update(normalizeOtpCode(input.code))
    .digest("hex");
}

export function verifyOtpCode(input: {
  challengeId: string;
  code: string;
  destinationHash: string;
  expectedHash: string;
  purpose: string;
}) {
  const actual = Buffer.from(hashOtpCode(input), "hex");
  const expected = Buffer.from(input.expectedHash, "hex");

  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export async function deliverOtp(input: OtpDeliveryInput): Promise<OtpDeliveryResult> {
  if (env.OTP_PROVIDER === "dev") {
    return {
      provider: "dev_otp_log",
      providerMessageId: `dev_${input.challengeId}`,
      sentAt: new Date(),
      status: "DELIVERED"
    };
  }

  if (input.channel !== "email") {
    throw new OtpDeliveryError("phone_otp_not_configured", "Phone OTP delivery is not configured.", 501);
  }

  return sendResendOtpEmail(input);
}

async function sendResendOtpEmail(input: OtpDeliveryInput): Promise<OtpDeliveryResult> {
  if (!env.RESEND_API_KEY || !env.RESEND_FROM_EMAIL) {
    throw new OtpDeliveryError("provider_adapter_required", "Resend OTP provider is missing required configuration.", 501);
  }

  const sentAt = new Date();
  const body = buildResendEmailBody(input);
  const headers: Record<string, string> = {
    Accept: "application/json",
    Authorization: `Bearer ${env.RESEND_API_KEY}`,
    "Content-Type": "application/json",
    "Idempotency-Key": `identity-otp:${input.challengeId}`,
    "User-Agent": "kuquba-api/0.1"
  };

  const response = await fetch(resendEmailsUrl, {
    body: JSON.stringify(body),
    headers,
    method: "POST"
  });
  const payload = (await response.json().catch(() => ({}))) as {
    id?: string;
    message?: string;
    name?: string;
  };

  if (!response.ok) {
    throw new OtpDeliveryError(
      "otp_delivery_failed",
      payload.message ?? `Resend rejected OTP email with status ${response.status}.`,
      response.status >= 500 ? 502 : 400
    );
  }

  return {
    provider: "resend_email",
    providerMessageId: payload.id,
    sentAt,
    status: "ACCEPTED"
  };
}

function buildResendEmailBody(input: OtpDeliveryInput) {
  const ttlMinutes = Math.max(1, Math.ceil((input.expiresAt.getTime() - Date.now()) / 60000));
  const subject = "Codigo de acceso KUQUBA";
  const text = [
    `Tu codigo de acceso KUQUBA es ${input.code}.`,
    `Vence en ${ttlMinutes} minutos.`,
    "Si no solicitaste este acceso, puedes ignorar este correo."
  ].join("\n");

  return {
    from: env.RESEND_FROM_EMAIL,
    html: buildOtpHtml(input.code, ttlMinutes),
    reply_to: env.RESEND_REPLY_TO,
    subject,
    text,
    to: [input.destination]
  };
}

function buildOtpHtml(code: string, ttlMinutes: number) {
  const escapedCode = escapeHtml(code);

  return `
    <div style="font-family: Arial, sans-serif; color: #101828; line-height: 1.5; max-width: 560px; margin: 0 auto; padding: 24px;">
      <p style="font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; color: #0F766E; font-weight: 700;">KUQUBA</p>
      <h1 style="font-size: 24px; margin: 8px 0 16px;">Codigo de acceso</h1>
      <p>Usa este codigo para entrar de forma segura a tu portal.</p>
      <div style="font-size: 32px; font-weight: 700; letter-spacing: 0.16em; background: #F7F3EB; border: 1px solid #D9E1E7; border-radius: 8px; padding: 18px 20px; text-align: center; margin: 24px 0;">${escapedCode}</div>
      <p style="font-size: 14px; color: #475467;">Este codigo vence en ${ttlMinutes} minutos. Si no solicitaste este acceso, puedes ignorar este correo.</p>
    </div>
  `;
}

function normalizeOtpCode(code: string) {
  return code.trim();
}

function getOtpSigningSecret() {
  return env.OTP_SIGNING_SECRET ?? developmentOtpSigningSecret;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}