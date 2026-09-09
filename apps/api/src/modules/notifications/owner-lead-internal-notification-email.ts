import { env } from "../../config/env";

const resendEmailsUrl = "https://api.resend.com/emails";
const publicSiteUrl = "https://kuquba.com";
const opsOwnerLeadsUrl = publicSiteUrl + "/ops";

export type OwnerLeadInternalNotificationEmailInput = {
  createdAt: Date;
  email: string;
  leadId: string;
  message: string | null;
  operatingStatus: string;
  ownerName: string;
  phone: string | null;
  propertyLocation: string;
  propertyName: string | null;
  propertyType: string;
};

export type OwnerLeadInternalNotificationEmailDelivery =
  | {
      provider: "resend_email";
      providerMessageId?: string;
      sentAt: Date;
      status: "ACCEPTED";
    }
  | {
      provider: "resend_email";
      reason: "resend_not_configured";
      sentAt: Date;
      status: "SKIPPED";
    };

export async function sendOwnerLeadInternalNotificationEmail(
  input: OwnerLeadInternalNotificationEmailInput
): Promise<OwnerLeadInternalNotificationEmailDelivery> {
  if (!env.RESEND_API_KEY || !env.RESEND_FROM_EMAIL) {
    return {
      provider: "resend_email",
      reason: "resend_not_configured",
      sentAt: new Date(),
      status: "SKIPPED"
    };
  }

  const sentAt = new Date();
  const response = await fetch(resendEmailsUrl, {
    body: JSON.stringify(buildOwnerLeadInternalNotificationEmailBody(input)),
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `owner-lead-internal-notification:${input.leadId}`,
      "User-Agent": "kuquba-api/0.1"
    },
    method: "POST"
  });

  const payload = (await response.json().catch(() => ({}))) as {
    id?: string;
    message?: string;
    name?: string;
  };

  if (!response.ok) {
    throw new Error(
      payload.message ??
        `Resend rejected owner lead internal notification email with status ${response.status}.`
    );
  }

  return {
    provider: "resend_email",
    providerMessageId: payload.id,
    sentAt,
    status: "ACCEPTED"
  };
}

function buildOwnerLeadInternalNotificationEmailBody(
  input: OwnerLeadInternalNotificationEmailInput
) {
  const reference = input.leadId.slice(0, 8).toUpperCase();
  const ownerName = escapeHtml(input.ownerName);
  const email = escapeHtml(input.email);
  const propertyName = escapeHtml(input.propertyName || "Propiedad por nombrar");
  const propertyType = escapeHtml(input.propertyType);
  const propertyLocation = escapeHtml(input.propertyLocation);
  const operatingStatus = escapeHtml(input.operatingStatus);
  const phone = escapeHtml(input.phone || "No indicado");
  const createdAt = formatDateTime(input.createdAt);
  const message = input.message ? escapeHtml(input.message) : null;

  return {
    from: env.RESEND_FROM_EMAIL,
    html: `
      <div style="margin:0;background:#f6f2ea;padding:28px 16px;font-family:Arial,Helvetica,sans-serif;color:#0d2233;">
        <div style="display:none;max-height:0;overflow:hidden;color:#f6f2ea;opacity:0;">Nueva solicitud de propietario recibida en KUQUBA.</div>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:680px;margin:0 auto;background:#ffffff;border:1px solid #d9e1e7;border-radius:14px;overflow:hidden;box-shadow:0 26px 80px rgba(13,34,51,0.14);">
          <tr>
            <td style="background:#0d2233;padding:24px 30px;">
              <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#45d1bf;">Propietarios | Referencia ${reference}</p>
              <h1 style="margin:0;font-family:Georgia,Times,serif;font-size:30px;line-height:1.14;font-weight:500;color:#ffffff;">Nueva solicitud de propietario.</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 32px 8px;">
              <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#435260;">${ownerName} compartio una propiedad para evaluacion. Responder desde este correo usara la direccion del propietario como destinatario.</p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #d9e1e7;border-radius:12px;overflow:hidden;">
                ${detailRow("Propietario", ownerName)}
                ${detailRow("Correo", email)}
                ${detailRow("Telefono", phone)}
                ${detailRow("Propiedad", propertyName)}
                ${detailRow("Tipo", propertyType)}
                ${detailRow("Ubicacion", propertyLocation)}
                ${detailRow("Estado operativo", operatingStatus)}
                ${detailRow("Recibido", createdAt)}
                ${message ? detailRow("Contexto compartido", message) : ""}
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:22px 32px 30px;">
              <a href="${opsOwnerLeadsUrl}" style="display:block;background:#147869;color:#ffffff;text-align:center;text-decoration:none;border-radius:9px;padding:15px 18px;font-weight:700;font-size:15px;">Abrir Operaciones</a>
            </td>
          </tr>
        </table>
      </div>
    `,
    reply_to: input.email,
    subject: `Nueva solicitud de propietario | ${input.propertyName || input.propertyType}`,
    text: [
      `Nueva solicitud de propietario | Referencia ${reference}`,
      "",
      `Propietario: ${input.ownerName}`,
      `Correo: ${input.email}`,
      `Telefono: ${input.phone || "No indicado"}`,
      `Propiedad: ${input.propertyName || "Propiedad por nombrar"}`,
      `Tipo: ${input.propertyType}`,
      `Ubicacion: ${input.propertyLocation}`,
      `Estado operativo: ${input.operatingStatus}`,
      `Recibido: ${createdAt}`,
      input.message ? `Contexto compartido: ${input.message}` : null,
      "",
      `Operaciones: ${opsOwnerLeadsUrl}`
    ]
      .filter((line): line is string => Boolean(line))
      .join("\n"),
    to: [env.KUQUBA_OWNER_INTAKE_EMAIL]
  };
}

function detailRow(label: string, value: string) {
  return `
    <tr>
      <td style="width:38%;padding:14px 16px;border-bottom:1px solid #edf1f4;background:#fbfaf6;font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#147869;vertical-align:top;">${escapeHtml(label)}</td>
      <td style="padding:14px 16px;border-bottom:1px solid #edf1f4;font-size:15px;line-height:1.45;color:#0d2233;font-weight:700;vertical-align:top;">${value}</td>
    </tr>
  `;
}

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("es-GT", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Guatemala"
  }).format(date);
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
