import { env } from "../../config/env";

const resendEmailsUrl = "https://api.resend.com/emails";
const publicSiteUrl = "https://kuquba.com";
const guestPortalUrl = publicSiteUrl + "/stay";
const brandLogoUrl = publicSiteUrl + "/brand/kuquba-logo.svg";
const defaultPropertyImageUrl = publicSiteUrl + "/images/hero-villa-atitlan.png";

export type ReservationConfirmationEmailInput = {
  arrivalDate: Date;
  currency: string | null;
  departureDate: Date;
  guestEmail: string;
  guestName: string;
  nights: number;
  propertyDestination: string;
  propertyImageAlt: string;
  propertyImageUrl: string;
  propertyName: string;
  reservationCode: string;
  total: string;
  unitName: string;
};

export type ReservationConfirmationEmailDelivery =
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

export async function sendReservationConfirmationEmail(
  input: ReservationConfirmationEmailInput
): Promise<ReservationConfirmationEmailDelivery> {
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
    body: JSON.stringify(buildReservationConfirmationEmailBody(input)),
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `reservation-confirmation:${input.reservationCode}`,
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
    throw new Error(payload.message ?? `Resend rejected reservation confirmation email with status ${response.status}.`);
  }

  return {
    provider: "resend_email",
    providerMessageId: payload.id,
    sentAt,
    status: "ACCEPTED"
  };
}

function buildReservationConfirmationEmailBody(input: ReservationConfirmationEmailInput) {
  const currency = input.currency ?? "GTQ";
  const total = formatCurrency(input.total, currency);
  const arrival = formatDate(input.arrivalDate);
  const departure = formatDate(input.departureDate);
  const nightsLabel = input.nights === 1 ? "1 noche" : `${input.nights} noches`;
  const guestName = escapeHtml(input.guestName);
  const propertyName = escapeHtml(input.propertyName);
  const unitName = escapeHtml(input.unitName);
  const propertyDestination = escapeHtml(input.propertyDestination);
  const reservationCode = escapeHtml(input.reservationCode);
  const propertyImageUrl = escapeHtml(toPublicAssetUrl(input.propertyImageUrl));
  const propertyImageAlt = escapeHtml(input.propertyImageAlt || `Vista de ${input.propertyName}`);

  return {
    from: env.RESEND_FROM_EMAIL,
    html: `
      <div style="margin:0;background:#f6f2ea;padding:28px 16px;font-family:Arial,Helvetica,sans-serif;color:#0d2233;">
        <div style="display:none;max-height:0;overflow:hidden;color:#f6f2ea;opacity:0;">Reserva confirmada: ${propertyName}, ${arrival} a ${departure}.</div>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:680px;margin:0 auto;background:#ffffff;border:1px solid #d9e1e7;border-radius:14px;overflow:hidden;box-shadow:0 26px 80px rgba(13,34,51,0.14);">
          <tr>
            <td style="background:#0d2233;padding:22px 28px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="vertical-align:middle;">
                    <img src="${brandLogoUrl}" width="166" alt="KUQUBA" style="display:block;max-width:166px;height:auto;border:0;" />
                  </td>
                  <td align="right" style="vertical-align:middle;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#45d1bf;">Reserva confirmada</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td>
              <img src="${propertyImageUrl}" width="680" alt="${propertyImageAlt}" style="display:block;width:100%;max-height:280px;object-fit:cover;border:0;" />
            </td>
          </tr>
          <tr>
            <td style="padding:30px 32px 10px;">
              <p style="margin:0 0 10px;font-size:12px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#147869;">${reservationCode}</p>
              <h1 style="margin:0;font-family:Georgia,Times,serif;font-size:34px;line-height:1.12;font-weight:500;color:#0d2233;">Tu estancia esta confirmada.</h1>
              <p style="margin:16px 0 0;font-size:16px;line-height:1.65;color:#435260;">Hola ${guestName}, ya confirmamos tu reserva en <strong style="color:#0d2233;">${propertyName}</strong>. Estos son los datos principales para preparar tu llegada.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px 0;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #d9e1e7;border-radius:12px;overflow:hidden;">
                ${detailRow("Estancia", propertyName)}
                ${detailRow("Unidad", unitName)}
                ${detailRow("Destino", propertyDestination)}
                ${detailRow("Llegada", arrival)}
                ${detailRow("Salida", departure)}
                ${detailRow("Duracion", nightsLabel)}
                ${detailRow("Monto confirmado", total)}
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 32px 8px;">
              <a href="${guestPortalUrl}" style="display:block;background:#147869;color:#ffffff;text-align:center;text-decoration:none;border-radius:9px;padding:15px 18px;font-weight:700;font-size:15px;">Abrir portal de huespedes</a>
            </td>
          </tr>
          <tr>
            <td style="padding:12px 32px 32px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f2ea;border-radius:10px;">
                <tr>
                  <td style="padding:16px 18px;font-size:14px;line-height:1.6;color:#435260;">Usa el correo asociado a tu reserva para recibir el codigo de acceso. Si necesitas coordinar algo antes de llegar, responde a este correo y Operaciones KUQUBA te dara seguimiento.</td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </div>
    `,
    reply_to: env.RESEND_REPLY_TO,
    subject: `Reserva confirmada | ${input.propertyName}`,
    text: [
      `Hola ${input.guestName},`,
      "",
      `Tu reserva ${input.reservationCode} esta confirmada.`,
      `Estancia: ${input.propertyName}`,
      `Unidad: ${input.unitName}`,
      `Destino: ${input.propertyDestination}`,
      `Llegada: ${arrival}`,
      `Salida: ${departure}`,
      `Duracion: ${nightsLabel}`,
      `Monto confirmado: ${total}`,
      "",
      `Portal de huespedes: ${guestPortalUrl}`,
      "",
      "KUQUBA"
    ].join("\n"),
    to: [input.guestEmail]
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

function toPublicAssetUrl(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return defaultPropertyImageUrl;
  }

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }

  if (trimmed.startsWith("/")) {
    return publicSiteUrl + trimmed;
  }

  return trimmed;
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("es-GT", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
    year: "numeric"
  }).format(date);
}

function formatCurrency(value: string, currency: string) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) {
    return `${currency} ${value}`;
  }

  return new Intl.NumberFormat("es-GT", {
    currency,
    style: "currency"
  }).format(amount);
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}