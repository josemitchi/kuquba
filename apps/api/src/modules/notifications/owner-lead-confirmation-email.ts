import { env } from "../../config/env";

const resendEmailsUrl = "https://api.resend.com/emails";
const publicSiteUrl = "https://kuquba.com";
const ownerEvaluateUrl = publicSiteUrl + "/owner/evaluate";
const contactUrl = publicSiteUrl + "/contact";
const brandLogoUrl = publicSiteUrl + "/brand/kuquba-logo.svg";
const ownerHeroImageUrl = publicSiteUrl + "/images/pacific-paredon-beach-house.png";

export type OwnerLeadConfirmationEmailInput = {
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

export type OwnerLeadConfirmationEmailDelivery =
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

export async function sendOwnerLeadConfirmationEmail(
  input: OwnerLeadConfirmationEmailInput
): Promise<OwnerLeadConfirmationEmailDelivery> {
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
    body: JSON.stringify(buildOwnerLeadConfirmationEmailBody(input)),
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `owner-lead-confirmation:${input.leadId}`,
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
    throw new Error(payload.message ?? `Resend rejected owner lead confirmation email with status ${response.status}.`);
  }

  return {
    provider: "resend_email",
    providerMessageId: payload.id,
    sentAt,
    status: "ACCEPTED"
  };
}

function buildOwnerLeadConfirmationEmailBody(input: OwnerLeadConfirmationEmailInput) {
  const reference = input.leadId.slice(0, 8).toUpperCase();
  const ownerName = escapeHtml(input.ownerName);
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
        <div style="display:none;max-height:0;overflow:hidden;color:#f6f2ea;opacity:0;">Recibimos tu solicitud de evaluación de propiedad KUQUBA.</div>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:680px;margin:0 auto;background:#ffffff;border:1px solid #d9e1e7;border-radius:14px;overflow:hidden;box-shadow:0 26px 80px rgba(13,34,51,0.14);">
          <tr>
            <td style="background:#0d2233;padding:22px 28px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="vertical-align:middle;">
                    <img src="${brandLogoUrl}" width="166" alt="KUQUBA" style="display:block;max-width:166px;height:auto;border:0;" />
                  </td>
                  <td align="right" style="vertical-align:middle;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#45d1bf;">Solicitud recibida</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td>
              <img src="${ownerHeroImageUrl}" width="680" alt="Propiedad de playa en evaluación KUQUBA" style="display:block;width:100%;max-height:250px;object-fit:cover;border:0;" />
            </td>
          </tr>
          <tr>
            <td style="padding:30px 32px 10px;">
              <p style="margin:0 0 10px;font-size:12px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#147869;">Referencia ${reference}</p>
              <h1 style="margin:0;font-family:Georgia,Times,serif;font-size:34px;line-height:1.12;font-weight:500;color:#0d2233;">Recibimos tu propiedad para evaluación.</h1>
              <p style="margin:16px 0 0;font-size:16px;line-height:1.65;color:#435260;">Hola ${ownerName}, gracias por compartir la información inicial. El equipo KUQUBA revisará si <strong style="color:#0d2233;">${propertyName}</strong> encaja con nuestra cobertura y operación actual antes de avanzar.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px 0;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #d9e1e7;border-radius:12px;overflow:hidden;">
                ${detailRow("Propiedad", propertyName)}
                ${detailRow("Tipo", propertyType)}
                ${detailRow("Ubicación", propertyLocation)}
                ${detailRow("Estado operativo", operatingStatus)}
                ${detailRow("Teléfono", phone)}
                ${detailRow("Recibido", createdAt)}
                ${message ? detailRow("Contexto compartido", message) : ""}
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 32px 0;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  ${processCard("1", "Revisión inicial", "Validamos cobertura, tipo de propiedad y estado operativo compartido.")}
                  ${processCard("2", "Siguiente contacto", "Si la propiedad encaja, coordinaremos datos adicionales y próximos pasos.")}
                  ${processCard("3", "Alta operativa", "Antes de publicar se definen reglas, disponibilidad, responsabilidades y condiciones.")}
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 32px 8px;">
              <a href="${contactUrl}" style="display:block;background:#147869;color:#ffffff;text-align:center;text-decoration:none;border-radius:9px;padding:15px 18px;font-weight:700;font-size:15px;">Contactar a KUQUBA</a>
            </td>
          </tr>
          <tr>
            <td style="padding:12px 32px 32px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f2ea;border-radius:10px;">
                <tr>
                  <td style="padding:16px 18px;font-size:14px;line-height:1.6;color:#435260;">Esta confirmación no crea contrato, no publica la propiedad y no establece condiciones comerciales finales. Evita enviar documentos sensibles hasta que el equipo KUQUBA los solicite por un canal confirmado.<div style="margin-top:12px;padding-top:12px;border-top:1px solid #d9e1e7;color:#435260;">Puedes iniciar una nueva solicitud desde <a href="${ownerEvaluateUrl}" style="color:#147869;font-weight:700;text-decoration:none;">evaluación de propiedad</a>.</div></td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </div>
    `,
    reply_to: env.RESEND_REPLY_TO,
    subject: `Solicitud recibida | Evaluación de propiedad KUQUBA`,
    text: [
      `Hola ${input.ownerName},`,
      "",
      `Recibimos tu solicitud de evaluación de propiedad. Referencia ${reference}.`,
      `Propiedad: ${input.propertyName || "Propiedad por nombrar"}`,
      `Tipo: ${input.propertyType}`,
      `Ubicación: ${input.propertyLocation}`,
      `Estado operativo: ${input.operatingStatus}`,
      `Teléfono: ${input.phone || "No indicado"}`,
      `Recibido: ${createdAt}`,
      input.message ? `Contexto compartido: ${input.message}` : null,
      "",
      "Próximos pasos:",
      "1. Revisión inicial de cobertura, tipo de propiedad y estado operativo.",
      "2. Siguiente contacto si la propiedad encaja con la operación actual.",
      "3. Alta operativa solo después de definir reglas, disponibilidad, responsabilidades y condiciones.",
      "",
      "Esta confirmación no crea contrato, no publica la propiedad y no establece condiciones comerciales finales.",
      `Contacto: ${contactUrl}`,
      "",
      "KUQUBA"
    ]
      .filter((line): line is string => Boolean(line))
      .join("\n"),
    to: [input.email]
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

function processCard(index: string, title: string, body: string) {
  return `
    <td width="33.333%" style="padding-right:10px;vertical-align:top;">
      <div style="border:1px solid #d9e1e7;border-radius:10px;padding:14px 14px 16px;min-height:116px;">
        <div style="display:inline-block;background:#147869;color:#ffffff;border-radius:8px;padding:6px 10px;font-size:12px;font-weight:700;">${escapeHtml(index)}</div>
        <p style="margin:12px 0 6px;font-size:14px;font-weight:700;color:#0d2233;">${escapeHtml(title)}</p>
        <p style="margin:0;font-size:13px;line-height:1.5;color:#435260;">${escapeHtml(body)}</p>
      </div>
    </td>
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