import type { Prisma } from "@prisma/client";
import type { FastifyPluginAsync, FastifyRequest } from "fastify";

import { prisma } from "../lib/prisma";
import { createAuditEventEnvelope } from "../modules/audit/audit-event";
import {
  authorizeDevPortalSession,
  type AuthorizedDevPortalSession
} from "../modules/identity/dev-session";

const guestPortalPermissions = ["reservation:self:read"];
const monthLabels = [
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Sep",
  "Oct",
  "Nov",
  "Dic"
];

export const registerGuestRoutes: FastifyPluginAsync = async (app) => {
  app.get("/portal", async (request, reply) => {
    const rawSessionToken = request.headers["x-kuquba-dev-session"]?.toString();
    const authorization = await authorizeDevPortalSession({
      audience: "guest",
      rawSessionToken,
      requiredPermissions: guestPortalPermissions
    });

    if (!authorization.ok) {
      await writeGuestAudit({
        action: "guest.portal.read",
        request,
        result: "DENIED",
        reason: authorization.error
      });

      return reply.code(authorization.statusCode).send({
        error: authorization.error,
        correlationId: request.id
      });
    }

    const guest = await loadGuestPortalRecord({
      email: authorization.session.user.email,
      userId: authorization.session.user.id
    });

    if (!guest) {
      await writeGuestAudit({
        action: "guest.portal.read",
        actorUserId: authorization.session.user.id,
        request,
        result: "DENIED",
        reason: "guest_profile_not_found"
      });

      return reply.code(404).send({
        error: "guest_profile_not_found",
        correlationId: request.id
      });
    }

    const now = new Date();
    await expireGuestReservationHolds({ guestIds: guest.guestIds, now });

    const refreshedGuest = await loadGuestPortalRecord({
      email: authorization.session.user.email,
      userId: authorization.session.user.id
    });

    if (!refreshedGuest) {
      return reply.code(404).send({
        error: "guest_profile_not_found",
        correlationId: request.id
      });
    }

    const portal = buildGuestPortal(refreshedGuest, authorization.session, now);

    await writeGuestAudit({
      action: "guest.portal.read",
      actorUserId: authorization.session.user.id,
      entityId: refreshedGuest.id,
      request,
      result: "SUCCESS",
      reason: "guest_portal_loaded",
      nextValue: {
        activeHoldCount:
          portal.metrics.find((metric) => metric.label === "Reservas temporales")?.value ?? "0",
        reservationCount: portal.reservations.length
      }
    });

    return reply.send({
      portal,
      correlationId: request.id
    });
  });
};

async function loadGuestPortalRecord(input: { email: string; userId: string }) {
  const normalizedEmail = input.email.trim().toLowerCase();
  const guests = await prisma.guest.findMany({
    where: {
      OR: [{ userId: input.userId }, { email: normalizedEmail }]
    },
    include: {
      reservations: {
        include: {
          payments: {
            orderBy: {
              createdAt: "desc"
            }
          },
          property: true,
          stayQuote: true,
          unit: true
        },
        orderBy: [{ arrivalDate: "asc" }, { createdAt: "desc" }]
      }
    },
    orderBy: {
      updatedAt: "desc"
    }
  });

  if (guests.length === 0) {
    return null;
  }

  const primaryGuest = guests.find((guest) => guest.userId === input.userId) ?? guests[0]!;
  const reservations = Array.from(
    new Map(
      guests.flatMap((guest) =>
        guest.reservations.map((reservation) => [reservation.id, reservation] as const)
      )
    ).values()
  ).sort(
    (left, right) =>
      left.arrivalDate.getTime() - right.arrivalDate.getTime() ||
      right.createdAt.getTime() - left.createdAt.getTime()
  );

  return {
    id: primaryGuest.id,
    fullName: primaryGuest.fullName,
    guestIds: guests.map((guest) => guest.id),
    reservations
  };
}

type GuestPortalRecord = NonNullable<Awaited<ReturnType<typeof loadGuestPortalRecord>>>;
type GuestReservationRecord = GuestPortalRecord["reservations"][number];

async function expireGuestReservationHolds(input: { guestIds: string[]; now: Date }) {
  await prisma.payment.updateMany({
    data: {
      failedAt: input.now,
      failureReason: "checkout_expired",
      status: "EXPIRED"
    },
    where: {
      expiresAt: {
        lte: input.now
      },
      reservation: {
        guestId: {
          in: input.guestIds
        }
      },
      status: "PENDING"
    }
  });

  await prisma.reservation.updateMany({
    data: {
      status: "EXPIRED"
    },
    where: {
      guestId: {
        in: input.guestIds
      },
      holdExpiresAt: {
        lte: input.now
      },
      status: {
        in: ["HOLD", "PENDING_PAYMENT"]
      }
    }
  });
}

function buildGuestPortal(
  guest: GuestPortalRecord,
  session: AuthorizedDevPortalSession,
  now: Date
) {
  const reservations = guest.reservations.filter(
    (reservation) => reservation.status !== "CANCELLED"
  );
  const activeReservations = reservations.filter((reservation) =>
    isActiveGuestReservation(reservation, now)
  );
  const activeHolds = reservations.filter((reservation) => isActiveGuestHold(reservation, now));
  const pendingPayments = reservations.filter((reservation) =>
    reservation.payments.some(
      (payment) =>
        payment.status === "PENDING" &&
        (!payment.expiresAt || payment.expiresAt.getTime() > now.getTime())
    )
  );
  const paidReservations = reservations.filter((reservation) =>
    reservation.payments.some((payment) => payment.status === "SUCCEEDED")
  );
  const nextStay = reservations.find(
    (reservation) =>
      reservation.status === "CONFIRMED" && reservation.departureDate.getTime() >= now.getTime()
  );

  return {
    guestName: guest.fullName,
    summary: "Consulta tus reservas, pagos, codigos privados y datos de llegada en un solo lugar.",
    metrics: [
      {
        hint: "Confirmadas y reservas temporales vigentes",
        label: "Reservas",
        value: String(activeReservations.length)
      },
      {
        hint: "Apartan inventario por tiempo limitado",
        label: "Reservas temporales",
        value: String(activeHolds.length)
      },
      {
        hint: nextStay ? nextStay.property.name : "Sin reserva confirmada",
        label: "Proxima llegada",
        value: nextStay ? formatDateLabel(nextStay.arrivalDate, false) : "Pendiente"
      },
      {
        hint:
          paidReservations.length > 0
            ? String(paidReservations.length) + " pago(s) confirmado(s)"
            : "Sin pago confirmado",
        label: "Pago",
        value:
          pendingPayments.length > 0
            ? "Pendiente"
            : paidReservations.length > 0
              ? "Confirmado"
              : "Por definir"
      }
    ],
    nextStay: nextStay ? mapGuestReservation(nextStay, now) : null,
    reservations: reservations.map((reservation) => mapGuestReservation(reservation, now)),
    governance: [
      "El portal solo muestra reservas vinculadas al perfil del huesped autenticado.",
      "Las reservas temporales vencidas se retiran de disponibilidad antes de mostrar esta vista.",
      "Lectura auditada para sesion " + session.sessionId.slice(0, 8) + "."
    ]
  };
}

function mapGuestReservation(reservation: GuestReservationRecord, now: Date) {
  const latestPayment = getLatestPayment(reservation);

  return {
    arrivalDate: toDateOnly(reservation.arrivalDate),
    currency: reservation.currency ?? "GTQ",
    departureDate: toDateOnly(reservation.departureDate),
    expiresAt: reservation.holdExpiresAt?.toISOString() ?? null,
    id: reservation.id,
    isActionable: isActiveGuestHold(reservation, now),
    nights: differenceInNights(reservation.arrivalDate, reservation.departureDate),
    payment: latestPayment ? mapGuestPayment(latestPayment) : null,
    propertyDestination: reservation.property.destination,
    propertyName: reservation.property.name,
    reservationCode: reservation.privateCode,
    source: reservation.confirmationSource ?? reservation.stayQuote?.source ?? "manual",
    arrival: buildGuestArrivalInfo(reservation),
    confirmation: buildGuestConfirmationInfo(reservation, latestPayment),
    status: reservation.status,
    statusLabel: reservationStatusLabel(reservation.status),
    statusTone: reservationStatusTone(reservation.status, reservation.holdExpiresAt, now),
    total: reservation.total?.toString() ?? "0.00",
    unitName: reservation.unit.name
  };
}

function buildGuestArrivalInfo(reservation: GuestReservationRecord) {
  const isConfirmed = reservation.status === "CONFIRMED";

  return {
    checkInWindow: isConfirmed ? "15:00 - 20:00" : "Se confirma al completar reserva",
    checkOutTime: "11:00",
    destination: reservation.property.destination,
    instructions: isConfirmed
      ? [
          "El equipo KUQUBA coordinara la llegada antes del check-in.",
          "Ten a mano tu codigo de reserva al llegar.",
          "La ocupacion debe coincidir con la reserva confirmada."
        ]
      : [
          "Completa el pago para confirmar llegada y liberar instrucciones finales.",
          "Mientras la reserva temporal este vigente, las fechas permanecen apartadas."
        ],
    readinessLabel: isConfirmed
      ? "Llegada coordinable"
      : reservation.status === "HOLD"
        ? "Pendiente de pago"
        : "Sin llegada activa"
  };
}

function buildGuestConfirmationInfo(
  reservation: GuestReservationRecord,
  latestPayment: ReturnType<typeof getLatestPayment>
) {
  const isConfirmed = reservation.status === "CONFIRMED";
  const paymentConfirmed = latestPayment?.status === "SUCCEEDED";

  return {
    documentLabel: isConfirmed ? "Confirmacion de reserva" : "Comprobante pendiente",
    documentStatus: isConfirmed ? "Disponible" : "No disponible",
    reference: reservation.privateCode,
    sections: [
      `Reserva ${reservation.privateCode}`,
      `${reservation.property.name} / ${reservation.unit.name}`,
      `${toDateOnly(reservation.arrivalDate)} a ${toDateOnly(reservation.departureDate)}`,
      paymentConfirmed ? "Pago confirmado" : "Pago pendiente o no asociado"
    ],
    shareable: isConfirmed,
    statusLabel: isConfirmed ? "Confirmada para consulta" : "Pendiente de confirmacion"
  };
}
function getLatestPayment(reservation: GuestReservationRecord) {
  return reservation.payments[0] ?? null;
}

function mapGuestPayment(payment: GuestReservationRecord["payments"][number]) {
  return {
    amount: payment.amount.toString(),
    confirmedAt: payment.confirmedAt?.toISOString() ?? null,
    currency: payment.currency,
    expiresAt: payment.expiresAt?.toISOString() ?? null,
    failedAt: payment.failedAt?.toISOString() ?? null,
    failureReason: payment.failureReason,
    id: payment.id,
    provider: payment.provider,
    providerRef: payment.providerRef,
    status: payment.status,
    statusLabel: paymentStatusLabel(payment.status)
  };
}

function paymentStatusLabel(status: string) {
  if (status === "PENDING") {
    return "Pago pendiente";
  }

  if (status === "SUCCEEDED") {
    return "Pago confirmado";
  }

  if (status === "FAILED") {
    return "Pago fallido";
  }

  return "Pago vencido";
}

function isActiveGuestReservation(reservation: GuestReservationRecord, now: Date) {
  if (reservation.status === "CONFIRMED") {
    return true;
  }

  return isActiveGuestHold(reservation, now);
}

function isActiveGuestHold(reservation: GuestReservationRecord, now: Date) {
  if (reservation.status !== "HOLD" && reservation.status !== "PENDING_PAYMENT") {
    return false;
  }

  return !reservation.holdExpiresAt || reservation.holdExpiresAt.getTime() > now.getTime();
}

function reservationStatusLabel(status: string) {
  if (status === "HOLD") {
    return "Reserva temporal";
  }

  if (status === "PENDING_PAYMENT") {
    return "Pendiente de pago";
  }

  if (status === "CONFIRMED") {
    return "Confirmada";
  }

  if (status === "COMPLETED") {
    return "Completada";
  }

  if (status === "EXPIRED") {
    return "Vencida";
  }

  return "Cancelada";
}

function reservationStatusTone(status: string, holdExpiresAt: Date | null, now: Date) {
  if (status === "CONFIRMED" || status === "COMPLETED") {
    return "success";
  }

  if (
    (status === "HOLD" || status === "PENDING_PAYMENT") &&
    (!holdExpiresAt || holdExpiresAt.getTime() > now.getTime())
  ) {
    return "warning";
  }

  if (status === "CANCELLED") {
    return "danger";
  }

  return "neutral";
}

function toDateOnly(date: Date) {
  return date.toISOString().slice(0, 10);
}

function differenceInNights(arrivalDate: Date, departureDate: Date) {
  return Math.round((departureDate.getTime() - arrivalDate.getTime()) / 86_400_000);
}

function formatDateLabel(date: Date, includeYear: boolean) {
  const month = monthLabels[date.getUTCMonth()] ?? "";
  const day = String(date.getUTCDate()).padStart(2, "0");

  return includeYear ? day + " " + month + " " + date.getUTCFullYear() : day + " " + month;
}

async function writeGuestAudit(input: {
  action: string;
  actorUserId?: string;
  entityId?: string;
  nextValue?: Prisma.InputJsonValue;
  reason: string;
  request: Pick<FastifyRequest, "id" | "ip" | "log">;
  result: "SUCCESS" | "PENDING" | "DENIED" | "FAILED";
}) {
  const auditEvent = createAuditEventEnvelope({
    action: input.action,
    actorUserId: input.actorUserId,
    entityId: input.entityId,
    entityType: "GuestPortal",
    ipAddress: input.request.ip,
    correlationId: input.request.id,
    nextValue: input.nextValue,
    result: input.result,
    reason: input.reason
  });

  await prisma.auditEvent.create({
    data: {
      action: auditEvent.action,
      actorUserId: auditEvent.actorUserId,
      entityId: auditEvent.entityId,
      entityType: auditEvent.entityType,
      ipAddress: auditEvent.ipAddress,
      correlationId: auditEvent.correlationId,
      nextValue: auditEvent.nextValue as Prisma.InputJsonValue | undefined,
      result: auditEvent.result,
      reason: auditEvent.reason
    }
  });

  input.request.log.info({ auditEvent }, "audit.event");
}
