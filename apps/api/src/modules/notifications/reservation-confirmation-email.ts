import { env } from "../../config/env";

const resendEmailsUrl = "https://api.resend.com/emails";
const guestPortalUrl = "https://kuquba.com/stay";

export type ReservationConfirmationEmailInput = {
  arrivalDate: Date;
  currency: string | null;
  departureDate: Date;
  guestEmail: string;
  guestName: string;
  nights: number;
  propertyDestination: string;
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

  return {
    from: env.RESEND_FROM_EMAIL,
    html: `
      <div style="margin:0;background:#f7f3eb;padding:28px 16px;font-family:Arial,Helvetica,sans-serif;color:#0d2233;">
        <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #d9e1e7;border-radius:12px;overflow:hidden;box-shadow:0 22px 70px rgba(13,34,51,0.12);">
          <div style="background:#0d2233;color:#ffffff;padding:30px 32px;">
            <div style="font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#2dd4bf;">KUQUBA</div>
            <h1 style="margin:12px 0 0;font-family:Georgia,Times,serif;font-size:32px;line-height:1.12;font-weight:500;">Tu reserva esta confirmada</h1>
            <p style="margin:12px 0 0;font-size:16px;line-height:1.6;color:#e6f1ef;">Ya puedes revisar los detalles de llegada y preparar tu estancia.</p>
          </div>
          <div style="padding:30px 32px;">
            <p style="margin:0 0 18px;font-size:16px;line-height:1.6;">Hola ${guestName}, confirmamos tu reserva en <strong>${propertyName}</strong>.</p>
            <div style="border:1px solid #d9e1e7;border-radius:10px;overflow:hidden;">
              ${detailRow("Reserva", reservationCode)}
              ${detailRow("Estancia", propertyName)}
              ${detailRow("Unidad", unitName)}
              ${detailRow("Destino", propertyDestination)}
              ${detailRow("Llegada", arrival)}
              ${detailRow("Salida", departure)}
              ${detailRow("Duracion", nightsLabel)}
              ${detailRow("Monto confirmado", total)}
            </div>
            <div style="margin:28px 0 18px;">
              <a href="${guestPortalUrl}" style="display:inline-block;background:#147869;color:#ffffff;text-decoration:none;border-radius:8px;padding:14px 18px;font-weight:700;">Abrir portal de huespedes</a>
            </div>
            <p style="margin:0;font-size:14px;line-height:1.6;color:#435260;">Usa el correo asociado a tu reserva para recibir el codigo de acceso. Si tienes dudas, responde a este correo y el equipo KUQUBA te dara seguimiento.</p>
          </div>
        </div>
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
    <div style="display:flex;gap:18px;padding:14px 16px;border-bottom:1px solid #edf1f4;">
      <div style="width:150px;min-width:150px;font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#147869;">${escapeHtml(label)}</div>
      <div style="font-size:15px;line-height:1.45;color:#0d2233;">${value}</div>
    </div>
  `;
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