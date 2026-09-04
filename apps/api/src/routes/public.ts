import { createHash, randomUUID } from "node:crypto";

import { accessOptions, kuqubaBrand, publicNavigation, trustPillars } from "@kuquba/config";
import { Prisma } from "@prisma/client";
import type { FastifyPluginAsync, FastifyRequest } from "fastify";
import { z } from "zod";

import { prisma } from "../lib/prisma";
import { createAuditEventEnvelope } from "../modules/audit/audit-event";
import { sendReservationConfirmationEmail } from "../modules/notifications/reservation-confirmation-email";

const dateOnlySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const stayProposalRequestSchema = z
  .object({
    arrivalDate: dateOnlySchema.optional(),
    departureDate: dateOnlySchema.optional(),
    destination: z.string().trim().min(2).max(120),
    email: z.string().trim().email().max(160),
    guestName: z.string().trim().min(2).max(120),
    guests: z.coerce.number().int().min(1).max(20),
    message: z.string().trim().max(1000).optional(),
    phone: z.string().trim().max(32).optional(),
    stayId: z.string().trim().min(2).max(80),
    stayName: z.string().trim().min(2).max(160)
  })
  .superRefine((value, context) => {
    if (!value.arrivalDate || !value.departureDate) {
      return;
    }

    if (
      parseDateOnly(value.departureDate).getTime() <= parseDateOnly(value.arrivalDate).getTime()
    ) {
      context.addIssue({
        code: "custom",
        message: "departure_after_arrival_required",
        path: ["departureDate"]
      });
    }
  });

const stayQuoteSchema = z
  .object({
    arrivalDate: dateOnlySchema,
    departureDate: dateOnlySchema,
    guests: z.coerce.number().int().min(1).max(20),
    stayId: z.string().trim().min(2).max(80)
  })
  .superRefine((value, context) => {
    const arrivalDate = parseDateOnly(value.arrivalDate);
    const departureDate = parseDateOnly(value.departureDate);
    const nights = differenceInNights(arrivalDate, departureDate);

    if (nights < 1) {
      context.addIssue({
        code: "custom",
        message: "departure_after_arrival_required",
        path: ["departureDate"]
      });
    }

    if (nights > 45) {
      context.addIssue({
        code: "custom",
        message: "quote_window_too_long",
        path: ["departureDate"]
      });
    }
  });

const stayAvailabilityQuerySchema = z.object({
  days: z.coerce.number().int().min(14).max(120).default(60),
  guests: z.coerce.number().int().min(1).max(20).default(2),
  nights: z.coerce.number().int().min(1).max(45).default(2),
  startDate: dateOnlySchema.optional()
});
const stayHoldSchema = z.object({
  email: z.string().trim().email().max(160),
  guestName: z.string().trim().min(2).max(120),
  phone: z.string().trim().max(32).optional(),
  quoteId: z.string().trim().uuid()
});

const paymentCheckoutSchema = z.object({
  reservationCode: z.string().trim().min(4).max(80),
  reservationId: z.string().trim().uuid()
});

const paymentCheckoutActionSchema = z.object({
  paymentId: z.string().trim().uuid(),
  reservationCode: z.string().trim().min(4).max(80)
});

const paymentCheckoutFailSchema = paymentCheckoutActionSchema.extend({
  failureReason: z.string().trim().max(160).optional()
});
const ownerLeadSchema = z.object({
  email: z.string().trim().email().max(160),
  message: z.string().trim().max(1000).optional(),
  operatingStatus: z.string().trim().min(2).max(80),
  ownerName: z.string().trim().min(2).max(120),
  phone: z.string().trim().max(32).optional(),
  propertyLocation: z.string().trim().min(2).max(160),
  propertyName: z.string().trim().max(160).optional(),
  propertyType: z.string().trim().min(2).max(80)
});

export const registerPublicRoutes: FastifyPluginAsync = async (app) => {
  app.get("/stays", async (request, reply) => {
    const stays = await loadPublicStays();

    await writePublicCatalogAudit({
      action: "public.stays.list",
      count: stays.length,
      request,
      reason: "public_catalog_loaded"
    });

    return reply.send({
      stays,
      correlationId: request.id
    });
  });

  app.get("/stays/:stayId", async (request, reply) => {
    const params = z.object({ stayId: z.string().trim().min(3).max(80) }).parse(request.params);
    const stay = await loadPublicStay(params.stayId);

    if (!stay) {
      return reply.code(404).send({
        error: "stay_not_found",
        correlationId: request.id
      });
    }

    await writePublicCatalogAudit({
      action: "public.stays.read",
      count: 1,
      request,
      reason: "public_catalog_item_loaded",
      stayId: params.stayId
    });

    return reply.send({
      stay,
      correlationId: request.id
    });
  });

  app.get("/stays/:stayId/availability", async (request, reply) => {
    const params = z.object({ stayId: z.string().trim().min(3).max(80) }).parse(request.params);
    const query = stayAvailabilityQuerySchema.parse(request.query);
    const availability = await loadPublicStayAvailability({
      days: query.days,
      guests: query.guests,
      nights: query.nights,
      startDate: query.startDate,
      stayId: params.stayId
    });

    if (!availability) {
      return reply.code(404).send({
        error: "stay_not_found",
        correlationId: request.id
      });
    }

    await writePublicCatalogAudit({
      action: "public.stays.availability.read",
      count: availability.days.length,
      request,
      reason: "public_availability_loaded",
      stayId: params.stayId
    });

    return reply.send({
      availability,
      correlationId: request.id
    });
  });
  app.get("/bootstrap", async () => ({
    brand: kuqubaBrand,
    navigation: publicNavigation,
    accessOptions,
    trustPillars,
    featureFlags: {
      search: "static-shell",
      stayProposalRequests: "registered",
      stayQuotes: "registered",
      ownerLead: "registered",
      ownerPortal: "registered",
      payments: "payment-preparation"
    }
  }));

  app.post("/stay-quotes", async (request, reply) => {
    const body = stayQuoteSchema.parse(request.body);
    const quote = await createPublicStayQuote({ body, request });

    if (!quote) {
      return reply.code(404).send({
        correlationId: request.id,
        error: "stay_not_quoteable"
      });
    }

    return reply.code(201).send({
      quote,
      correlationId: request.id
    });
  });

  app.post("/stay-holds", async (request, reply) => {
    const body = stayHoldSchema.parse(request.body);
    const result = await createPublicReservationHold({ body, request });

    if (!result.ok) {
      return reply.code(result.statusCode).send({
        correlationId: request.id,
        error: result.error
      });
    }

    return reply.code(result.created ? 201 : 200).send({
      hold: result.hold,
      correlationId: request.id,
      notice: "reservation_hold_created_not_confirmed"
    });
  });
  app.post("/payment-checkouts", async (request, reply) => {
    const body = paymentCheckoutSchema.parse(request.body);
    const result = await createPublicPaymentCheckout({ body, request });

    if (!result.ok) {
      return reply.code(result.statusCode).send({
        correlationId: request.id,
        error: result.error
      });
    }

    return reply.code(result.created ? 201 : 200).send({
      checkout: result.checkout,
      reservation: result.reservation,
      correlationId: request.id,
      notice: "dev_payment_checkout_started_not_real_charge"
    });
  });

  app.post("/payment-checkouts/confirm", async (request, reply) => {
    const body = paymentCheckoutActionSchema.parse(request.body);
    const result = await confirmPublicDevPayment({ body, request });

    if (!result.ok) {
      return reply.code(result.statusCode).send({
        correlationId: request.id,
        error: result.error
      });
    }

    return reply.send({
      checkout: result.checkout,
      reservation: result.reservation,
      correlationId: request.id,
      notice: "dev_payment_confirmed_reservation_confirmed"
    });
  });

  app.post("/payment-checkouts/fail", async (request, reply) => {
    const body = paymentCheckoutFailSchema.parse(request.body);
    const result = await failPublicDevPayment({ body, request });

    if (!result.ok) {
      return reply.code(result.statusCode).send({
        correlationId: request.id,
        error: result.error
      });
    }

    return reply.send({
      checkout: result.checkout,
      reservation: result.reservation,
      correlationId: request.id,
      notice: "dev_payment_failed_reservation_not_confirmed"
    });
  });

  app.post("/stay-proposal-requests", async (request, reply) => {
    const body = stayProposalRequestSchema.parse(request.body);
    const proposalRequest = await prisma.stayProposalRequest.create({
      data: {
        arrivalDate: body.arrivalDate ? parseDateOnly(body.arrivalDate) : null,
        correlationId: request.id,
        departureDate: body.departureDate ? parseDateOnly(body.departureDate) : null,
        destination: body.destination,
        email: body.email.toLowerCase(),
        guestName: body.guestName,
        guests: body.guests,
        ipAddress: request.ip,
        message: body.message,
        phone: body.phone,
        stayId: body.stayId,
        stayName: body.stayName
      },
      select: {
        createdAt: true,
        id: true,
        status: true
      }
    });

    await writeProposalAudit({
      entityId: proposalRequest.id,
      nextValue: {
        arrivalDate: body.arrivalDate,
        contactHash: hashContact(body.email),
        departureDate: body.departureDate,
        destination: body.destination,
        guests: body.guests,
        stayId: body.stayId
      },
      request
    });

    return reply.code(201).send({
      proposalRequest: {
        createdAt: proposalRequest.createdAt.toISOString(),
        id: proposalRequest.id,
        status: proposalRequest.status
      },
      correlationId: request.id,
      notice: "proposal_request_received_not_reservation"
    });
  });

  app.post("/owner-leads", async (request, reply) => {
    const body = ownerLeadSchema.parse(request.body);
    const message = normalizeOptionalText(body.message);
    const phone = normalizeOptionalText(body.phone);
    const propertyName = normalizeOptionalText(body.propertyName);

    const ownerLead = await prisma.ownerLead.create({
      data: {
        correlationId: request.id,
        email: body.email.toLowerCase(),
        ipAddress: request.ip,
        message,
        operatingStatus: body.operatingStatus,
        ownerName: body.ownerName,
        phone,
        propertyLocation: body.propertyLocation,
        propertyName,
        propertyType: body.propertyType
      },
      select: {
        createdAt: true,
        id: true,
        status: true
      }
    });

    await writeOwnerLeadAudit({
      entityId: ownerLead.id,
      nextValue: {
        contactHash: hashContact(body.email),
        hasMessage: Boolean(message),
        hasPhone: Boolean(phone),
        hasPropertyName: Boolean(propertyName),
        locationHash: hashValue(body.propertyLocation),
        operatingStatus: body.operatingStatus,
        propertyType: body.propertyType
      },
      request
    });

    return reply.code(201).send({
      ownerLead: {
        createdAt: ownerLead.createdAt.toISOString(),
        id: ownerLead.id,
        status: ownerLead.status
      },
      correlationId: request.id,
      notice: "owner_lead_received_not_commercial_offer"
    });
  });
};

type PublicStayRecord = Awaited<ReturnType<typeof loadPublicStayRecords>>[number];
type PublicCatalogProfile = {
  amenities: Prisma.JsonValue | null;
  bookingNote: string | null;
  houseRules: Prisma.JsonValue | null;
  id: string;
  neighborhood: string | null;
  operations: Prisma.JsonValue | null;
  stayStyle: string | null;
  summary: string | null;
};

async function loadPublicStays() {
  const records = await loadPublicStayRecords();
  const profileMap = await loadPublicCatalogProfileMap(records.map((record) => record.propertyId));
  return records.map((record) => mapPublicStayRecord(record, profileMap.get(record.propertyId)));
}

async function loadPublicStay(stayId: string) {
  const record = await prisma.stayCode.findFirst({
    where: {
      active: true,
      code: stayId,
      property: {
        contracts: { some: { status: "ACTIVE" } },
        images: { some: {} },
        ratePlans: { some: { active: true } },
        visibility: "PUBLIC"
      },
      unit: { isNot: null }
    },
    include: publicStayInclude()
  });

  if (!record) {
    return null;
  }

  const profileMap = await loadPublicCatalogProfileMap([record.propertyId]);
  return mapPublicStayRecord(record, profileMap.get(record.propertyId));
}

function loadPublicStayRecords() {
  return prisma.stayCode.findMany({
    where: {
      active: true,
      property: {
        contracts: { some: { status: "ACTIVE" } },
        images: { some: {} },
        ratePlans: { some: { active: true } },
        visibility: "PUBLIC"
      },
      unit: { isNot: null }
    },
    include: publicStayInclude(),
    orderBy: { createdAt: "asc" }
  });
}

function publicStayInclude() {
  return {
    property: {
      include: {
        images: {
          orderBy: [
            { isCover: "desc" as const },
            { sortOrder: "asc" as const },
            { createdAt: "asc" as const }
          ]
        },
        ratePlans: {
          where: { active: true },
          orderBy: [{ startsOn: "desc" as const }, { createdAt: "desc" as const }]
        }
      }
    },
    unit: true
  };
}

async function loadPublicCatalogProfileMap(propertyIds: string[]) {
  if (propertyIds.length === 0) {
    return new Map<string, PublicCatalogProfile>();
  }

  const rows = await prisma.$queryRaw<PublicCatalogProfile[]>`
    SELECT id, amenities, "bookingNote", "houseRules", neighborhood, operations, "stayStyle", summary
    FROM "Property"
    WHERE id IN (${Prisma.join(propertyIds)})
  `;

  return new Map(rows.map((row) => [row.id, row]));
}

function mapPublicStayRecord(record: PublicStayRecord, catalogProperty?: PublicCatalogProfile) {
  const unit = record.unit;
  const property = record.property;
  const images =
    property.images.length > 0
      ? property.images
      : [{ alt: `Vista de ${property.name}`, url: "/images/hero-villa-atitlan.png" }];
  const coverImage = images[0] ?? {
    alt: `Vista de ${property.name}`,
    url: "/images/hero-villa-atitlan.png"
  };
  const ratePlan =
    property.ratePlans.find((plan) => plan.unitId === unit?.id) ?? property.ratePlans[0] ?? null;
  const minimumRate = ratePlan ? Number(ratePlan.baseNightlyRate.toString()) : null;

  return {
    amenities: parsePublicStringList(
      catalogProperty?.amenities ?? null,
      buildPublicStayAmenities(unit, ratePlan)
    ),
    availability: "available" as const,
    availabilityLabel: "Lista para reservar",
    bathrooms: Number(unit?.bathrooms.toString() ?? "0"),
    bedrooms: unit?.bedrooms ?? 0,
    bookingNote:
      catalogProperty?.bookingNote ??
      "Disponibilidad, tarifa y bloqueo temporal se validan antes de pago.",
    destination: property.destination,
    gallery: images.map((image) => ({
      alt: image.alt ?? `Vista de ${property.name}`,
      src: image.url
    })),
    highlights: buildPublicStayHighlights(unit, minimumRate),
    houseRules: parsePublicStringList(catalogProperty?.houseRules ?? null, [
      "Llegada coordinada",
      "Ocupacion segun reserva",
      "Politicas por propiedad"
    ]),
    id: record.code,
    image: coverImage.url,
    imageAlt: coverImage.alt ?? `Vista de ${property.name}`,
    maxGuests: unit?.maxGuests ?? 0,
    name: property.name,
    neighborhood: catalogProperty?.neighborhood ?? property.destination,
    operations: parsePublicStringList(catalogProperty?.operations ?? null, [
      "Preparacion previa",
      "Soporte local",
      "Revision de salida"
    ]),
    stayStyle: catalogProperty?.stayStyle ?? unit?.name ?? "Estancia KUQUBA",
    summary:
      catalogProperty?.summary ??
      buildPublicStaySummary(property.name, property.destination, unit?.maxGuests ?? 0)
  };
}

function parsePublicStringList(value: Prisma.JsonValue | null, fallback: string[]) {
  if (!Array.isArray(value)) {
    return fallback;
  }

  const list = value.filter(
    (item): item is string => typeof item === "string" && item.trim().length > 0
  );
  return list.length > 0 ? list : fallback;
}
function buildPublicStayAmenities(
  unit: PublicStayRecord["unit"],
  ratePlan: PublicStayRecord["property"]["ratePlans"][number] | null
) {
  return [
    unit ? `${unit.maxGuests} huespedes` : "Capacidad por validar",
    unit ? `${unit.bedrooms} habitaciones` : "Habitaciones por validar",
    ratePlan ? `Minimo ${ratePlan.minNights} noche(s)` : "Tarifa activa",
    "Limpieza coordinada"
  ];
}

function buildPublicStayHighlights(unit: PublicStayRecord["unit"], minimumRate: number | null) {
  return [
    unit ? `${unit.bedrooms} hab.` : "Curada",
    minimumRate ? `Desde ${formatCatalogAmount(minimumRate)}` : "Tarifa visible al cotizar",
    "Reserva directa"
  ];
}

function buildPublicStaySummary(name: string, destination: string, maxGuests: number) {
  const capacity = maxGuests > 0 ? ` para hasta ${maxGuests} huespedes` : "";
  return `${name} en ${destination}${capacity}, administrada por KUQUBA con disponibilidad y tarifa verificadas antes del pago.`;
}

function formatCatalogAmount(value: number) {
  return new Intl.NumberFormat("es-GT", {
    currency: "GTQ",
    maximumFractionDigits: 0,
    style: "currency"
  }).format(value);
}

async function writePublicCatalogAudit(input: {
  action: string;
  count: number;
  reason: string;
  request: Pick<FastifyRequest, "id" | "ip" | "log">;
  stayId?: string;
}) {
  const auditEvent = createAuditEventEnvelope({
    action: input.action,
    entityId: input.stayId ?? "public-catalog",
    entityType: "PublicCatalog",
    ipAddress: input.request.ip,
    correlationId: input.request.id,
    nextValue: {
      count: input.count,
      stayId: input.stayId ?? null
    },
    result: "SUCCESS",
    reason: input.reason
  });

  await prisma.auditEvent.create({
    data: {
      action: auditEvent.action,
      entityId: auditEvent.entityId,
      entityType: auditEvent.entityType,
      ipAddress: auditEvent.ipAddress,
      correlationId: auditEvent.correlationId,
      nextValue: auditEvent.nextValue as Prisma.InputJsonValue,
      result: auditEvent.result,
      reason: auditEvent.reason
    }
  });
}
type PublicStayAvailabilityStatus =
  | "AVAILABLE"
  | "RESERVED"
  | "HOLD"
  | "MAINTENANCE"
  | "OWNER_HOLD"
  | "OPS_HOLD"
  | "RATE_MISSING"
  | "CAPACITY_EXCEEDED";

type PublicStayAvailabilityDay = {
  date: string;
  reason: string | null;
  status: PublicStayAvailabilityStatus;
  statusLabel: string;
};

async function loadPublicStayAvailability(input: {
  days: number;
  guests: number;
  nights: number;
  startDate?: string;
  stayId: string;
}) {
  const record = await prisma.stayCode.findFirst({
    where: {
      active: true,
      code: input.stayId,
      property: {
        contracts: { some: { status: "ACTIVE" } },
        images: { some: {} },
        ratePlans: { some: { active: true } },
        visibility: "PUBLIC"
      },
      unit: { isNot: null }
    },
    include: publicStayInclude()
  });

  if (!record || !record.unit) {
    return null;
  }

  const now = new Date();
  await expireExpiredReservationHolds({ now, unitId: record.unit.id });

  const requestedStartDate = input.startDate ? parseDateOnly(input.startDate) : new Date();
  const startDate = parseDateOnly(toDateOnly(requestedStartDate));
  const ratePlan =
    record.property.ratePlans.find((plan) => plan.unitId === record.unit?.id) ??
    record.property.ratePlans[0] ??
    null;

  const days: PublicStayAvailabilityDay[] = [];

  for (let index = 0; index < input.days; index += 1) {
    const arrivalDate = addUtcDays(startDate, index);
    days.push(
      await buildPublicAvailabilityDay({
        arrivalDate,
        guests: input.guests,
        nights: input.nights,
        now,
        ratePlan,
        unit: record.unit
      })
    );
  }

  return {
    days,
    generatedAt: now.toISOString(),
    nextAvailableRange: findNextPublicAvailableRange(days, input.nights),
    propertyName: record.property.name,
    recommendedNights: input.nights,
    stayId: record.code,
    unitName: record.unit.name
  };
}

async function buildPublicAvailabilityDay(input: {
  arrivalDate: Date;
  guests: number;
  nights: number;
  now: Date;
  ratePlan: PublicStayRecord["property"]["ratePlans"][number] | null;
  unit: NonNullable<PublicStayRecord["unit"]>;
}): Promise<PublicStayAvailabilityDay> {
  const date = toDateOnly(input.arrivalDate);

  if (input.guests > input.unit.maxGuests) {
    return mapPublicAvailabilityDay({
      date,
      reason: "capacity_exceeded",
      status: "CAPACITY_EXCEEDED"
    });
  }

  if (!input.ratePlan) {
    return mapPublicAvailabilityDay({ date, reason: "rate_missing", status: "RATE_MISSING" });
  }

  if (input.nights < input.ratePlan.minNights) {
    return mapPublicAvailabilityDay({
      date,
      reason: "minimum_nights_not_met",
      status: "RATE_MISSING"
    });
  }

  const conflictReason = await findAvailabilityConflict({
    arrivalDate: input.arrivalDate,
    departureDate: addUtcDays(input.arrivalDate, input.nights),
    now: input.now,
    unitId: input.unit.id
  });

  if (conflictReason) {
    const status = mapConflictReasonToAvailabilityStatus(conflictReason);
    return mapPublicAvailabilityDay({ date, reason: conflictReason, status });
  }

  return mapPublicAvailabilityDay({ date, reason: null, status: "AVAILABLE" });
}

function findNextPublicAvailableRange(days: PublicStayAvailabilityDay[], nights: number) {
  for (let index = 0; index <= days.length - nights; index += 1) {
    const slice = days.slice(index, index + nights);
    const arrivalDay = slice[0];
    if (arrivalDay && slice.length === nights && slice.every((day) => day.status === "AVAILABLE")) {
      return {
        arrivalDate: arrivalDay.date,
        departureDate: toDateOnly(addUtcDays(parseDateOnly(arrivalDay.date), nights)),
        nights
      };
    }
  }

  return null;
}

function mapPublicAvailabilityDay(input: {
  date: string;
  reason: string | null;
  status: PublicStayAvailabilityStatus;
}): PublicStayAvailabilityDay {
  return {
    date: input.date,
    reason: input.reason,
    status: input.status,
    statusLabel: getPublicAvailabilityStatusLabel(input.status, input.reason)
  };
}

function mapConflictReasonToAvailabilityStatus(reason: string): PublicStayAvailabilityStatus {
  if (reason === "maintenance_window") {
    return "MAINTENANCE";
  }

  if (reason === "owner_hold") {
    return "OWNER_HOLD";
  }

  if (reason === "ops_hold") {
    return "OPS_HOLD";
  }

  if (reason === "reserved_or_held") {
    return "RESERVED";
  }

  return "HOLD";
}

function getPublicAvailabilityStatusLabel(
  status: PublicStayAvailabilityStatus,
  reason: string | null
) {
  const labels: Record<PublicStayAvailabilityStatus, string> = {
    AVAILABLE: "Disponible",
    CAPACITY_EXCEEDED: "Capacidad insuficiente",
    HOLD: "Reserva temporal",
    MAINTENANCE: "Mantenimiento",
    OPS_HOLD: "Bloqueo operativo",
    OWNER_HOLD: "Bloqueo propietario",
    RATE_MISSING:
      reason === "minimum_nights_not_met" ? "Minimo de noches no cumplido" : "Sin tarifa activa",
    RESERVED: "Reservada"
  };

  return labels[status];
}

type PublicReservationHoldBody = z.infer<typeof stayHoldSchema>;

const publicReservationHoldTtlMinutes = 20;

async function createPublicReservationHold(input: {
  body: PublicReservationHoldBody;
  request: Pick<FastifyRequest, "id" | "ip" | "log">;
}): Promise<
  | { ok: true; created: boolean; hold: ReturnType<typeof mapReservationHold> }
  | { ok: false; error: string; statusCode: 404 | 409 }
> {
  const quote = await prisma.stayQuote.findUnique({
    where: {
      id: input.body.quoteId
    },
    include: {
      property: true,
      reservation: {
        include: {
          property: true,
          unit: true
        }
      },
      unit: true
    }
  });

  if (!quote) {
    return { ok: false, error: "quote_not_found", statusCode: 404 };
  }

  const now = new Date();

  if (quote.status !== "AVAILABLE") {
    return { ok: false, error: "quote_not_available", statusCode: 409 };
  }

  if (quote.expiresAt.getTime() <= now.getTime()) {
    return { ok: false, error: "quote_expired", statusCode: 409 };
  }

  await expireExpiredReservationHolds({ now, unitId: quote.unitId });

  if (quote.reservation && isActiveReservationForInventory(quote.reservation, now)) {
    return {
      ok: true,
      created: false,
      hold: mapReservationHold(quote.reservation)
    };
  }

  const conflictReason = await findAvailabilityConflict({
    arrivalDate: quote.arrivalDate,
    departureDate: quote.departureDate,
    now,
    unitId: quote.unitId
  });

  if (conflictReason) {
    return { ok: false, error: "quote_dates_no_longer_available", statusCode: 409 };
  }

  const guest = await findOrCreatePublicGuest({
    email: input.body.email,
    fullName: input.body.guestName,
    phone: normalizeOptionalText(input.body.phone)
  });
  const holdExpiresAt = new Date(now.getTime() + publicReservationHoldTtlMinutes * 60 * 1000);
  const reservation = await prisma.reservation.create({
    data: {
      arrivalDate: quote.arrivalDate,
      confirmationSource: "public_quote_hold",
      currency: quote.currency,
      departureDate: quote.departureDate,
      guestId: guest.id,
      holdExpiresAt,
      privateCode: buildReservationHoldCode(),
      propertyId: quote.propertyId,
      status: "HOLD",
      stayQuoteId: quote.id,
      total: quote.total,
      unitId: quote.unitId
    },
    include: {
      property: true,
      unit: true
    }
  });

  await writeReservationHoldAudit({
    entityId: reservation.id,
    nextValue: {
      arrivalDate: toDateOnly(reservation.arrivalDate),
      contactHash: hashContact(input.body.email),
      departureDate: toDateOnly(reservation.departureDate),
      expiresAt: reservation.holdExpiresAt?.toISOString() ?? null,
      guests: quote.guests,
      quoteId: quote.id,
      stayId: quote.stayId,
      total: reservation.total?.toString() ?? null
    },
    request: input.request
  });

  return {
    ok: true,
    created: true,
    hold: mapReservationHold(reservation)
  };
}

async function findOrCreatePublicGuest(input: { email: string; fullName: string; phone?: string }) {
  const email = input.email.trim().toLowerCase();
  const existingGuest = await prisma.guest.findFirst({
    where: {
      email
    },
    orderBy: {
      updatedAt: "desc"
    }
  });

  if (existingGuest) {
    return prisma.guest.update({
      data: {
        fullName: input.fullName,
        phone: input.phone ?? existingGuest.phone
      },
      where: {
        id: existingGuest.id
      }
    });
  }

  return prisma.guest.create({
    data: {
      email,
      fullName: input.fullName,
      phone: input.phone
    }
  });
}

async function expireExpiredReservationHolds(input: { now: Date; unitId: string }) {
  await prisma.reservation.updateMany({
    data: {
      status: "EXPIRED"
    },
    where: {
      holdExpiresAt: {
        lte: input.now
      },
      status: {
        in: ["HOLD", "PENDING_PAYMENT"]
      },
      unitId: input.unitId
    }
  });
}

function isActiveReservationForInventory(
  reservation: { holdExpiresAt: Date | null; status: string },
  now: Date
) {
  if (reservation.status === "CONFIRMED") {
    return true;
  }

  if (reservation.status === "HOLD" || reservation.status === "PENDING_PAYMENT") {
    return Boolean(
      reservation.holdExpiresAt && reservation.holdExpiresAt.getTime() > now.getTime()
    );
  }

  return false;
}

function mapReservationHold(reservation: {
  arrivalDate: Date;
  currency: string | null;
  departureDate: Date;
  holdExpiresAt: Date | null;
  id: string;
  privateCode: string;
  property: { name: string };
  status: string;
  total: { toString(): string } | null;
  unit: { name: string };
}) {
  return {
    arrivalDate: toDateOnly(reservation.arrivalDate),
    currency: reservation.currency ?? "GTQ",
    departureDate: toDateOnly(reservation.departureDate),
    expiresAt: reservation.holdExpiresAt?.toISOString() ?? null,
    id: reservation.id,
    nights: differenceInNights(reservation.arrivalDate, reservation.departureDate),
    propertyName: reservation.property.name,
    reservationCode: reservation.privateCode,
    status: reservation.status,
    statusLabel: publicReservationStatusLabel(reservation.status),
    total: reservation.total?.toString() ?? "0.00",
    unitName: reservation.unit.name
  };
}

function buildReservationHoldCode() {
  return "KQB-HOLD-" + randomUUID().slice(0, 8).toUpperCase();
}
type PublicPaymentCheckoutBody = z.infer<typeof paymentCheckoutSchema>;
type PublicPaymentCheckoutActionBody = z.infer<typeof paymentCheckoutActionSchema>;
type PublicPaymentCheckoutFailBody = z.infer<typeof paymentCheckoutFailSchema>;

const publicPaymentCheckoutTtlMinutes = 15;
const devPaymentProvider = "dev_payment_adapter";
const devPaymentLedgerAccountName = "KUQUBA Guest Payments";

async function createPublicPaymentCheckout(input: {
  body: PublicPaymentCheckoutBody;
  request: Pick<FastifyRequest, "id" | "ip" | "log">;
}): Promise<
  | {
      ok: true;
      created: boolean;
      checkout: ReturnType<typeof mapPaymentCheckout>;
      reservation: ReturnType<typeof mapReservationHold>;
    }
  | { ok: false; error: string; statusCode: 404 | 409 }
> {
  const now = new Date();
  const reservation = await loadReservationForPaymentCheckout(input.body);

  if (!reservation) {
    return { ok: false, error: "reservation_not_found", statusCode: 404 };
  }

  await expireExpiredPaymentsForReservation({ now, reservationId: reservation.id });

  const refreshedReservation = await loadReservationForPaymentCheckout(input.body);

  if (!refreshedReservation) {
    return { ok: false, error: "reservation_not_found", statusCode: 404 };
  }

  if (refreshedReservation.status === "CONFIRMED") {
    return { ok: false, error: "reservation_already_confirmed", statusCode: 409 };
  }

  if (!isReservationCheckoutable(refreshedReservation, now)) {
    await expireReservationHoldIfNeeded({ now, reservation: refreshedReservation });
    return { ok: false, error: "reservation_hold_expired_or_not_checkoutable", statusCode: 409 };
  }

  const activePayment = refreshedReservation.payments.find((payment) =>
    isActivePendingPayment(payment, now)
  );

  if (activePayment) {
    return {
      ok: true,
      created: false,
      checkout: mapPaymentCheckout(activePayment),
      reservation: mapReservationHold(refreshedReservation)
    };
  }

  const amount = getCheckoutAmount(refreshedReservation);

  if (!amount) {
    return { ok: false, error: "reservation_amount_missing", statusCode: 409 };
  }

  const paymentId = randomUUID();
  const expiresAt = new Date(now.getTime() + publicPaymentCheckoutTtlMinutes * 60 * 1000);
  const payment = await prisma.$transaction(async (tx) => {
    const createdPayment = await tx.payment.create({
      data: {
        id: paymentId,
        amount,
        checkoutUrl: "dev://kuquba/payment-checkout/" + paymentId,
        currency: refreshedReservation.currency ?? "GTQ",
        expiresAt,
        idempotencyKey: "reservation:" + refreshedReservation.id + ":checkout:" + paymentId,
        provider: devPaymentProvider,
        providerRef: buildDevPaymentProviderRef(),
        reservationId: refreshedReservation.id,
        status: "PENDING"
      }
    });

    const updatedReservation = await tx.reservation.update({
      data: {
        holdExpiresAt: expiresAt,
        status: "PENDING_PAYMENT"
      },
      include: {
        property: true,
        unit: true
      },
      where: {
        id: refreshedReservation.id
      }
    });

    return { payment: createdPayment, reservation: updatedReservation };
  });

  await writePublicPaymentAudit({
    action: "public.payment_checkout.create",
    entityId: payment.payment.id,
    nextValue: {
      amount: payment.payment.amount.toString(),
      currency: payment.payment.currency,
      expiresAt: payment.payment.expiresAt?.toISOString() ?? null,
      provider: payment.payment.provider,
      reservationId: payment.payment.reservationId,
      status: payment.payment.status
    },
    request: input.request,
    reason: "dev_payment_checkout_started"
  });

  return {
    ok: true,
    created: true,
    checkout: mapPaymentCheckout(payment.payment),
    reservation: mapReservationHold(payment.reservation)
  };
}

async function confirmPublicDevPayment(input: {
  body: PublicPaymentCheckoutActionBody;
  request: Pick<FastifyRequest, "id" | "ip" | "log">;
}): Promise<
  | {
      ok: true;
      checkout: ReturnType<typeof mapPaymentCheckout>;
      reservation: ReturnType<typeof mapReservationHold>;
    }
  | { ok: false; error: string; statusCode: 404 | 409 }
> {
  const now = new Date();
  const payment = await loadPaymentForCheckoutAction(input.body);

  if (!payment) {
    return { ok: false, error: "payment_not_found", statusCode: 404 };
  }

  await expireExpiredPaymentsForReservation({ now, reservationId: payment.reservationId });

  const refreshedPayment = await loadPaymentForCheckoutAction(input.body);

  if (!refreshedPayment) {
    return { ok: false, error: "payment_not_found", statusCode: 404 };
  }

  if (refreshedPayment.status === "SUCCEEDED") {
    return {
      ok: true,
      checkout: mapPaymentCheckout(refreshedPayment),
      reservation: mapReservationHold(refreshedPayment.reservation)
    };
  }

  if (refreshedPayment.status === "EXPIRED") {
    return { ok: false, error: "payment_checkout_expired", statusCode: 409 };
  }

  if (refreshedPayment.status !== "PENDING") {
    return { ok: false, error: "payment_not_pending", statusCode: 409 };
  }

  if (!isActivePendingPayment(refreshedPayment, now)) {
    return { ok: false, error: "payment_checkout_expired", statusCode: 409 };
  }

  const result = await prisma.$transaction(async (tx) => {
    const updatedPayment = await tx.payment.update({
      data: {
        confirmedAt: now,
        failedAt: null,
        failureReason: null,
        status: "SUCCEEDED"
      },
      where: {
        id: refreshedPayment.id
      }
    });
    const updatedReservation = await tx.reservation.update({
      data: {
        confirmationSource: devPaymentProvider,
        holdExpiresAt: null,
        status: "CONFIRMED"
      },
      include: {
        guest: true,
        property: true,
        stayQuote: true,
        unit: true
      },
      where: {
        id: refreshedPayment.reservationId
      }
    });
    const ledgerEntryCount = await createReservationLedgerEntries({
      payment: updatedPayment,
      reservation: refreshedPayment.reservation,
      tx
    });

    return { ledgerEntryCount, payment: updatedPayment, reservation: updatedReservation };
  });

  await ensureConfirmedGuestPortalAccess({
    reservation: result.reservation,
    request: input.request
  });

  const confirmationEmail = await deliverReservationConfirmationEmail({
    reservation: result.reservation,
    request: input.request
  });

  await writePublicPaymentAudit({
    action: "public.payment_checkout.confirm",
    entityId: result.payment.id,
    nextValue: {
      amount: result.payment.amount.toString(),
      currency: result.payment.currency,
      ledgerEntryCount: result.ledgerEntryCount,
      provider: result.payment.provider,
      confirmationEmail,
      reservationId: result.payment.reservationId,
      reservationStatus: result.reservation.status,
      status: result.payment.status
    },
    request: input.request,
    reason: "dev_payment_confirmed"
  });

  return {
    ok: true,
    checkout: mapPaymentCheckout(result.payment),
    reservation: mapReservationHold(result.reservation)
  };
}

async function failPublicDevPayment(input: {
  body: PublicPaymentCheckoutFailBody;
  request: Pick<FastifyRequest, "id" | "ip" | "log">;
}): Promise<
  | {
      ok: true;
      checkout: ReturnType<typeof mapPaymentCheckout>;
      reservation: ReturnType<typeof mapReservationHold>;
    }
  | { ok: false; error: string; statusCode: 404 | 409 }
> {
  const now = new Date();
  const payment = await loadPaymentForCheckoutAction(input.body);

  if (!payment) {
    return { ok: false, error: "payment_not_found", statusCode: 404 };
  }

  if (payment.status === "SUCCEEDED") {
    return { ok: false, error: "payment_already_succeeded", statusCode: 409 };
  }

  if (payment.status === "FAILED") {
    return {
      ok: true,
      checkout: mapPaymentCheckout(payment),
      reservation: mapReservationHold(payment.reservation)
    };
  }

  if (payment.status !== "PENDING") {
    return { ok: false, error: "payment_not_pending", statusCode: 409 };
  }

  const nextReservationStatus = isReservationCheckoutable(payment.reservation, now)
    ? "HOLD"
    : "EXPIRED";
  const result = await prisma.$transaction(async (tx) => {
    const updatedPayment = await tx.payment.update({
      data: {
        failedAt: now,
        failureReason: normalizeOptionalText(input.body.failureReason) ?? "dev_payment_failed",
        status: "FAILED"
      },
      where: {
        id: payment.id
      }
    });
    const updatedReservation = await tx.reservation.update({
      data: {
        confirmationSource: "dev_payment_failed",
        status: nextReservationStatus
      },
      include: {
        property: true,
        unit: true
      },
      where: {
        id: payment.reservationId
      }
    });

    return { payment: updatedPayment, reservation: updatedReservation };
  });

  await writePublicPaymentAudit({
    action: "public.payment_checkout.fail",
    entityId: result.payment.id,
    nextValue: {
      failureReason: result.payment.failureReason,
      provider: result.payment.provider,
      reservationId: result.payment.reservationId,
      reservationStatus: result.reservation.status,
      status: result.payment.status
    },
    request: input.request,
    reason: "dev_payment_failed"
  });

  return {
    ok: true,
    checkout: mapPaymentCheckout(result.payment),
    reservation: mapReservationHold(result.reservation)
  };
}

async function loadReservationForPaymentCheckout(input: PublicPaymentCheckoutBody) {
  return prisma.reservation.findFirst({
    where: {
      id: input.reservationId,
      privateCode: input.reservationCode
    },
    include: {
      payments: {
        orderBy: {
          createdAt: "desc"
        }
      },
      property: true,
      stayQuote: true,
      unit: true
    }
  });
}

async function loadPaymentForCheckoutAction(input: PublicPaymentCheckoutActionBody) {
  return prisma.payment.findFirst({
    where: {
      id: input.paymentId,
      reservation: {
        privateCode: input.reservationCode
      }
    },
    include: {
      reservation: {
        include: {
          guest: true,
          property: true,
          stayQuote: true,
          unit: true
        }
      }
    }
  });
}

type ReservationForPaymentCheckout = NonNullable<
  Awaited<ReturnType<typeof loadReservationForPaymentCheckout>>
>;
type PaymentForCheckoutAction = NonNullable<
  Awaited<ReturnType<typeof loadPaymentForCheckoutAction>>
>;

async function expireExpiredPaymentsForReservation(input: { now: Date; reservationId: string }) {
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
      reservationId: input.reservationId,
      status: "PENDING"
    }
  });

  await prisma.reservation.updateMany({
    data: {
      status: "EXPIRED"
    },
    where: {
      holdExpiresAt: {
        lte: input.now
      },
      id: input.reservationId,
      status: "PENDING_PAYMENT"
    }
  });
}

async function expireReservationHoldIfNeeded(input: {
  now: Date;
  reservation: ReservationForPaymentCheckout;
}) {
  if (
    (input.reservation.status === "HOLD" || input.reservation.status === "PENDING_PAYMENT") &&
    input.reservation.holdExpiresAt &&
    input.reservation.holdExpiresAt.getTime() <= input.now.getTime()
  ) {
    await prisma.reservation.update({
      data: {
        status: "EXPIRED"
      },
      where: {
        id: input.reservation.id
      }
    });
  }
}

function isReservationCheckoutable(
  reservation: { holdExpiresAt: Date | null; status: string },
  now: Date
) {
  if (reservation.status !== "HOLD" && reservation.status !== "PENDING_PAYMENT") {
    return false;
  }

  return Boolean(reservation.holdExpiresAt && reservation.holdExpiresAt.getTime() > now.getTime());
}

function isActivePendingPayment(payment: { expiresAt: Date | null; status: string }, now: Date) {
  return (
    payment.status === "PENDING" &&
    (!payment.expiresAt || payment.expiresAt.getTime() > now.getTime())
  );
}

function getCheckoutAmount(reservation: { total: { toString(): string } | null }) {
  const total = reservation.total?.toString();

  if (!total || Number(total) <= 0) {
    return null;
  }

  return total;
}

function mapPaymentCheckout(payment: {
  amount: { toString(): string };
  checkoutUrl: string | null;
  confirmedAt: Date | null;
  currency: string;
  expiresAt: Date | null;
  failedAt: Date | null;
  failureReason: string | null;
  id: string;
  provider: string;
  providerRef: string;
  reservationId: string;
  status: string;
}) {
  return {
    amount: payment.amount.toString(),
    checkoutUrl: payment.checkoutUrl,
    confirmedAt: payment.confirmedAt?.toISOString() ?? null,
    currency: payment.currency,
    expiresAt: payment.expiresAt?.toISOString() ?? null,
    failedAt: payment.failedAt?.toISOString() ?? null,
    failureReason: payment.failureReason,
    id: payment.id,
    provider: payment.provider,
    providerRef: payment.providerRef,
    reservationId: payment.reservationId,
    status: payment.status,
    statusLabel: publicPaymentStatusLabel(payment.status)
  };
}

async function createReservationLedgerEntries(input: {
  payment: { currency: string; providerRef: string };
  reservation: PaymentForCheckoutAction["reservation"];
  tx: Prisma.TransactionClient;
}) {
  const existingEntry = await input.tx.ledgerEntry.findFirst({
    where: {
      reservationId: input.reservation.id
    },
    select: {
      id: true
    }
  });

  if (existingEntry) {
    return 0;
  }

  const account = await findOrCreatePaymentLedgerAccount(input.tx, input.payment.currency);
  const entries = buildLedgerEntriesForReservation(input.reservation, input.payment, account.id);

  if (entries.length === 0) {
    return 0;
  }

  await input.tx.ledgerEntry.createMany({
    data: entries
  });

  return entries.length;
}

async function findOrCreatePaymentLedgerAccount(tx: Prisma.TransactionClient, currency: string) {
  const existingAccount = await tx.ledgerAccount.findFirst({
    where: {
      currency,
      name: devPaymentLedgerAccountName
    },
    orderBy: {
      createdAt: "asc"
    }
  });

  if (existingAccount) {
    return existingAccount;
  }

  return tx.ledgerAccount.create({
    data: {
      currency,
      name: devPaymentLedgerAccountName
    }
  });
}

function buildLedgerEntriesForReservation(
  reservation: PaymentForCheckoutAction["reservation"],
  payment: { currency: string; providerRef: string },
  ledgerAccountId: string
) {
  const memo = "Payment checkout " + payment.providerRef;

  if (!reservation.stayQuote) {
    const amount = getCheckoutAmount(reservation);

    return amount
      ? [
          {
            amount,
            currency: payment.currency,
            ledgerAccountId,
            memo,
            reservationId: reservation.id,
            type: "ACCOMMODATION" as const
          }
        ]
      : [];
  }

  const quote = reservation.stayQuote;
  const entries: Prisma.LedgerEntryCreateManyInput[] = [
    {
      amount: quote.nightlySubtotal.toString(),
      currency: payment.currency,
      ledgerAccountId,
      memo,
      reservationId: reservation.id,
      type: "ACCOMMODATION"
    },
    {
      amount: quote.cleaningFee.toString(),
      currency: payment.currency,
      ledgerAccountId,
      memo,
      reservationId: reservation.id,
      type: "CLEANING"
    },
    {
      amount: quote.serviceFee.toString(),
      currency: payment.currency,
      ledgerAccountId,
      memo,
      reservationId: reservation.id,
      type: "KUQUBA_SERVICE_FEE"
    },
    {
      amount: quote.tax.toString(),
      currency: payment.currency,
      ledgerAccountId,
      memo,
      reservationId: reservation.id,
      type: "TAX"
    }
  ];

  return entries.filter((entry) => Number(entry.amount?.toString() ?? "0") > 0);
}

function buildDevPaymentProviderRef() {
  return "PAY-" + randomUUID().slice(0, 8).toUpperCase();
}

function publicReservationStatusLabel(status: string) {
  if (status === "HOLD") {
    return "Reserva temporal";
  }

  if (status === "PENDING_PAYMENT") {
    return "Pendiente de pago";
  }

  if (status === "CONFIRMED") {
    return "Confirmada";
  }

  if (status === "EXPIRED") {
    return "Vencida";
  }

  if (status === "COMPLETED") {
    return "Completada";
  }

  return "Cancelada";
}

function publicPaymentStatusLabel(status: string) {
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

type PublicStayQuoteBody = z.infer<typeof stayQuoteSchema>;

const unavailableReasonLabels: Record<string, string> = {
  availability_block_maintenance: "No disponible por mantenimiento operativo.",
  availability_block_ops_hold: "No disponible por bloqueo operativo.",
  availability_block_owner_hold: "No disponible por bloqueo del propietario.",
  capacity_exceeded: "La ocupacion solicitada supera la capacidad de la unidad.",
  minimum_nights_required: "La estancia no cumple el minimo de noches configurado.",
  rate_plan_missing: "Tarifa pendiente para estas fechas.",
  reserved_or_held: "Fechas ocupadas o con reserva temporal."
};

async function createPublicStayQuote(input: {
  body: PublicStayQuoteBody;
  request: Pick<FastifyRequest, "id" | "ip" | "log">;
}) {
  const arrivalDate = parseDateOnly(input.body.arrivalDate);
  const departureDate = parseDateOnly(input.body.departureDate);
  const nights = differenceInNights(arrivalDate, departureDate);
  const stayCode = await prisma.stayCode.findUnique({
    where: {
      code: input.body.stayId
    },
    include: {
      property: true,
      unit: true
    }
  });

  if (!stayCode?.active || !stayCode.unit) {
    return null;
  }

  const ratePlan = await findRatePlan({
    arrivalDate,
    departureDate,
    propertyId: stayCode.propertyId,
    unitId: stayCode.unit.id
  });
  const conflictReason = await findAvailabilityConflict({
    arrivalDate,
    departureDate,
    unitId: stayCode.unit.id
  });
  const unavailableReason =
    input.body.guests > stayCode.unit.maxGuests
      ? "capacity_exceeded"
      : (conflictReason ??
        (!ratePlan
          ? "rate_plan_missing"
          : nights < ratePlan.minNights
            ? "minimum_nights_required"
            : null));
  const status = unavailableReason ? "UNAVAILABLE" : "AVAILABLE";
  const amounts =
    status === "AVAILABLE" && ratePlan
      ? calculateQuoteAmounts({
          arrivalDate,
          nights,
          ratePlan
        })
      : buildZeroQuoteAmounts(ratePlan?.currency ?? "GTQ");
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
  const stayQuote = await prisma.stayQuote.create({
    data: {
      arrivalDate,
      cleaningFee: amounts.cleaningFee,
      correlationId: input.request.id,
      currency: amounts.currency,
      departureDate,
      expiresAt,
      guests: input.body.guests,
      ipAddress: input.request.ip,
      nights,
      nightlySubtotal: amounts.nightlySubtotal,
      propertyId: stayCode.propertyId,
      serviceFee: amounts.serviceFee,
      status,
      stayId: input.body.stayId,
      tax: amounts.tax,
      total: amounts.total,
      unavailableReason,
      unitId: stayCode.unit.id
    }
  });

  await writeStayQuoteAudit({
    entityId: stayQuote.id,
    nextValue: {
      arrivalDate: input.body.arrivalDate,
      currency: amounts.currency,
      departureDate: input.body.departureDate,
      guests: input.body.guests,
      nights,
      propertyId: stayCode.propertyId,
      status,
      stayId: input.body.stayId,
      total: status === "AVAILABLE" ? amounts.total : null,
      unavailableReason,
      unitId: stayCode.unit.id
    },
    request: input.request
  });

  return {
    id: stayQuote.id,
    arrivalDate: input.body.arrivalDate,
    available: status === "AVAILABLE",
    currency: amounts.currency,
    departureDate: input.body.departureDate,
    expiresAt: expiresAt.toISOString(),
    guests: input.body.guests,
    lineItems: status === "AVAILABLE" ? buildQuoteLineItems(amounts) : [],
    nights,
    notice: status === "AVAILABLE" ? "quote_available_not_reservation" : "quote_unavailable",
    propertyName: stayCode.property.name,
    status,
    total: amounts.total,
    unitName: stayCode.unit.name,
    unavailableReason,
    unavailableReasonLabel: unavailableReason ? getUnavailableReasonLabel(unavailableReason) : null
  };
}

async function findRatePlan(input: {
  arrivalDate: Date;
  departureDate: Date;
  propertyId: string;
  unitId: string;
}) {
  return prisma.ratePlan.findFirst({
    where: {
      active: true,
      propertyId: input.propertyId,
      unitId: input.unitId,
      AND: [
        {
          OR: [{ startsOn: null }, { startsOn: { lte: input.arrivalDate } }]
        },
        {
          OR: [{ endsOn: null }, { endsOn: { gte: input.departureDate } }]
        }
      ]
    },
    orderBy: [{ startsOn: "desc" }, { createdAt: "desc" }]
  });
}

async function findAvailabilityConflict(input: {
  arrivalDate: Date;
  departureDate: Date;
  now?: Date;
  unitId: string;
}) {
  const now = input.now ?? new Date();
  const overlappingReservation = await prisma.reservation.findFirst({
    where: {
      arrivalDate: { lt: input.departureDate },
      departureDate: { gt: input.arrivalDate },
      OR: [
        { status: "CONFIRMED" },
        {
          status: {
            in: ["HOLD", "PENDING_PAYMENT"]
          },
          holdExpiresAt: { gt: now }
        }
      ],
      unitId: input.unitId
    },
    select: {
      id: true
    }
  });

  if (overlappingReservation) {
    return "reserved_or_held";
  }

  const overlappingBlock = await prisma.availabilityBlock.findFirst({
    where: {
      endsOn: { gt: input.arrivalDate },
      startsOn: { lt: input.departureDate },
      unitId: input.unitId
    },
    select: {
      reason: true
    }
  });

  return overlappingBlock ? "availability_block_" + overlappingBlock.reason.toLowerCase() : null;
}

function calculateQuoteAmounts(input: {
  arrivalDate: Date;
  nights: number;
  ratePlan: NonNullable<Awaited<ReturnType<typeof findRatePlan>>>;
}) {
  let nightlySubtotalCents = 0;
  const baseNightlyRateCents = toCents(input.ratePlan.baseNightlyRate);
  const weekendNightlyRateCents = input.ratePlan.weekendNightlyRate
    ? toCents(input.ratePlan.weekendNightlyRate)
    : baseNightlyRateCents;

  for (let nightIndex = 0; nightIndex < input.nights; nightIndex += 1) {
    const stayNight = addUtcDays(input.arrivalDate, nightIndex);
    nightlySubtotalCents += isWeekendNight(stayNight)
      ? weekendNightlyRateCents
      : baseNightlyRateCents;
  }

  const cleaningFeeCents = toCents(input.ratePlan.cleaningFee);
  const serviceFeeCents = calculateBps(
    nightlySubtotalCents + cleaningFeeCents,
    input.ratePlan.serviceFeeBps
  );
  const taxCents = calculateBps(
    nightlySubtotalCents + cleaningFeeCents + serviceFeeCents,
    input.ratePlan.taxBps
  );

  return {
    cleaningFee: amountFromCents(cleaningFeeCents),
    currency: input.ratePlan.currency,
    nightlySubtotal: amountFromCents(nightlySubtotalCents),
    serviceFee: amountFromCents(serviceFeeCents),
    tax: amountFromCents(taxCents),
    total: amountFromCents(nightlySubtotalCents + cleaningFeeCents + serviceFeeCents + taxCents)
  };
}

function buildZeroQuoteAmounts(currency: string) {
  return {
    cleaningFee: "0.00",
    currency,
    nightlySubtotal: "0.00",
    serviceFee: "0.00",
    tax: "0.00",
    total: "0.00"
  };
}

function buildQuoteLineItems(amounts: ReturnType<typeof buildZeroQuoteAmounts>) {
  return [
    { key: "nightlySubtotal", label: "Noches", amount: amounts.nightlySubtotal },
    { key: "cleaningFee", label: "Limpieza", amount: amounts.cleaningFee },
    { key: "serviceFee", label: "Servicio KUQUBA", amount: amounts.serviceFee },
    { key: "tax", label: "Impuestos estimados", amount: amounts.tax }
  ];
}

function calculateBps(amountCents: number, bps: number) {
  return Math.round((amountCents * bps) / 10000);
}

function toCents(value: Prisma.Decimal | string | number) {
  return Math.round(Number(value.toString()) * 100);
}

function amountFromCents(cents: number) {
  return (cents / 100).toFixed(2);
}

function addUtcDays(date: Date, days: number) {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);

  return result;
}

function isWeekendNight(date: Date) {
  const day = date.getUTCDay();

  return day === 5 || day === 6;
}

function toDateOnly(date: Date) {
  return date.toISOString().slice(0, 10);
}

function differenceInNights(arrivalDate: Date, departureDate: Date) {
  return Math.round((departureDate.getTime() - arrivalDate.getTime()) / 86_400_000);
}

function getUnavailableReasonLabel(reason: string) {
  return unavailableReasonLabels[reason] ?? "No disponible para estas fechas.";
}

async function writeStayQuoteAudit(input: {
  entityId: string;
  nextValue: Prisma.InputJsonValue;
  request: Pick<FastifyRequest, "id" | "ip" | "log">;
}) {
  const auditEvent = createAuditEventEnvelope({
    action: "public.stay_quote.create",
    entityId: input.entityId,
    entityType: "StayQuote",
    ipAddress: input.request.ip,
    correlationId: input.request.id,
    nextValue: input.nextValue,
    result: "SUCCESS",
    reason: "public_quote_calculated"
  });

  await prisma.auditEvent.create({
    data: {
      action: auditEvent.action,
      entityId: auditEvent.entityId,
      entityType: auditEvent.entityType,
      ipAddress: auditEvent.ipAddress,
      correlationId: auditEvent.correlationId,
      nextValue: auditEvent.nextValue as Prisma.InputJsonValue,
      result: auditEvent.result,
      reason: auditEvent.reason
    }
  });

  input.request.log.info({ auditEvent }, "audit.event");
}

async function writeReservationHoldAudit(input: {
  entityId: string;
  nextValue: Prisma.InputJsonValue;
  request: Pick<FastifyRequest, "id" | "ip" | "log">;
}) {
  const auditEvent = createAuditEventEnvelope({
    action: "public.reservation_hold.create",
    entityId: input.entityId,
    entityType: "Reservation",
    ipAddress: input.request.ip,
    correlationId: input.request.id,
    nextValue: input.nextValue,
    result: "SUCCESS",
    reason: "public_hold_created"
  });

  await prisma.auditEvent.create({
    data: {
      action: auditEvent.action,
      entityId: auditEvent.entityId,
      entityType: auditEvent.entityType,
      ipAddress: auditEvent.ipAddress,
      correlationId: auditEvent.correlationId,
      nextValue: auditEvent.nextValue as Prisma.InputJsonValue,
      result: auditEvent.result,
      reason: auditEvent.reason
    }
  });

  input.request.log.info({ auditEvent }, "audit.event");
}

async function ensureConfirmedGuestPortalAccess(input: {
  reservation: PaymentForCheckoutAction["reservation"];
  request: Pick<FastifyRequest, "id" | "ip" | "log">;
}) {
  const email = input.reservation.guest.email.trim().toLowerCase();
  const organization = await findOrCreatePublicOrganization();
  const role = await prisma.role.findUnique({ where: { key: "guest" } });

  if (!role) {
    throw new Error("guest_role_not_configured");
  }

  const existingIdentity = await prisma.identity.findUnique({
    where: {
      provider_subject: {
        provider: "EMAIL_OTP",
        subject: email
      }
    },
    include: { user: true }
  });

  if (existingIdentity?.status === "DISABLED") {
    throw new Error("guest_identity_disabled");
  }

  const user = existingIdentity
    ? await prisma.user.update({
        data: {
          displayName: input.reservation.guest.fullName,
          email
        },
        where: { id: existingIdentity.userId }
      })
    : await prisma.user.upsert({
        where: {
          organizationId_email: {
            organizationId: organization.id,
            email
          }
        },
        create: {
          displayName: input.reservation.guest.fullName,
          email,
          organizationId: organization.id,
          identities: {
            create: {
              provider: "EMAIL_OTP",
              status: "PENDING",
              subject: email
            }
          }
        },
        update: {
          displayName: input.reservation.guest.fullName
        }
      });

  if (!existingIdentity) {
    await prisma.identity.upsert({
      where: {
        provider_subject: {
          provider: "EMAIL_OTP",
          subject: email
        }
      },
      create: {
        provider: "EMAIL_OTP",
        status: "PENDING",
        subject: email,
        userId: user.id
      },
      update: {}
    });
  }

  const existingRole = await prisma.userRole.findFirst({
    where: {
      roleId: role.id,
      scope: "ORGANIZATION",
      userId: user.id
    }
  });

  if (!existingRole) {
    await prisma.userRole.create({
      data: {
        roleId: role.id,
        scope: "ORGANIZATION",
        userId: user.id
      }
    });
  }

  if (input.reservation.guest.userId !== user.id) {
    await prisma.guest.update({
      data: { userId: user.id },
      where: { id: input.reservation.guest.id }
    });
  }

  await writeGuestPortalProvisioningAudit({
    entityId: user.id,
    nextValue: {
      contactHash: hashContact(email),
      guestId: input.reservation.guest.id,
      identityProvider: "EMAIL_OTP",
      reservationId: input.reservation.id,
      roleKey: "guest"
    },
    request: input.request
  });
}

async function findOrCreatePublicOrganization() {
  const existingOrganization = await prisma.organization.findFirst({
    orderBy: { createdAt: "asc" }
  });

  if (existingOrganization) {
    return existingOrganization;
  }

  return prisma.organization.create({ data: { name: "KUQUBA" } });
}

async function writeGuestPortalProvisioningAudit(input: {
  entityId: string;
  nextValue: Prisma.InputJsonValue;
  request: Pick<FastifyRequest, "id" | "ip" | "log">;
}) {
  const auditEvent = createAuditEventEnvelope({
    action: "public.guest_portal.provision",
    entityId: input.entityId,
    entityType: "User",
    ipAddress: input.request.ip,
    correlationId: input.request.id,
    nextValue: input.nextValue,
    result: "SUCCESS",
    reason: "confirmed_reservation_guest_access_provisioned"
  });

  await prisma.auditEvent.create({
    data: {
      action: auditEvent.action,
      entityId: auditEvent.entityId,
      entityType: auditEvent.entityType,
      ipAddress: auditEvent.ipAddress,
      correlationId: auditEvent.correlationId,
      nextValue: auditEvent.nextValue as Prisma.InputJsonValue,
      result: auditEvent.result,
      reason: auditEvent.reason
    }
  });

  input.request.log.info({ auditEvent }, "audit.event");
}
type ReservationConfirmationEmailAudit = {
  error: string | null;
  provider: "resend_email";
  providerMessageId: string | null;
  reason: string | null;
  sentAt: string;
  status: "ACCEPTED" | "FAILED" | "SKIPPED";
};

async function deliverReservationConfirmationEmail(input: {
  request: Pick<FastifyRequest, "id" | "ip" | "log">;
  reservation: PaymentForCheckoutAction["reservation"];
}): Promise<ReservationConfirmationEmailAudit> {
  try {
    const delivery = await sendReservationConfirmationEmail({
      arrivalDate: input.reservation.arrivalDate,
      currency: input.reservation.currency,
      departureDate: input.reservation.departureDate,
      guestEmail: input.reservation.guest.email,
      guestName: input.reservation.guest.fullName,
      nights: differenceInNights(input.reservation.arrivalDate, input.reservation.departureDate),
      propertyDestination: input.reservation.property.destination,
      propertyName: input.reservation.property.name,
      reservationCode: input.reservation.privateCode,
      total: input.reservation.total?.toString() ?? "0.00",
      unitName: input.reservation.unit.name
    });

    const confirmationEmail = {
      error: null,
      provider: delivery.provider,
      providerMessageId: delivery.status === "ACCEPTED" ? delivery.providerMessageId ?? null : null,
      reason: delivery.status === "SKIPPED" ? delivery.reason : null,
      sentAt: delivery.sentAt.toISOString(),
      status: delivery.status
    } satisfies ReservationConfirmationEmailAudit;

    input.request.log.info(
      {
        confirmationEmail,
        reservationId: input.reservation.id
      },
      "reservation.confirmation_email"
    );

    return confirmationEmail;
  } catch (error) {
    const confirmationEmail = {
      error: error instanceof Error ? error.message : "unknown_error",
      provider: "resend_email",
      providerMessageId: null,
      reason: null,
      sentAt: new Date().toISOString(),
      status: "FAILED"
    } satisfies ReservationConfirmationEmailAudit;

    input.request.log.error(
      {
        err: error,
        reservationId: input.reservation.id
      },
      "reservation.confirmation_email_failed"
    );

    return confirmationEmail;
  }
}
async function writePublicPaymentAudit(input: {
  action: string;
  entityId: string;
  nextValue: Prisma.InputJsonValue;
  reason: string;
  request: Pick<FastifyRequest, "id" | "ip" | "log">;
}) {
  const auditEvent = createAuditEventEnvelope({
    action: input.action,
    entityId: input.entityId,
    entityType: "Payment",
    ipAddress: input.request.ip,
    correlationId: input.request.id,
    nextValue: input.nextValue,
    result: "SUCCESS",
    reason: input.reason
  });

  await prisma.auditEvent.create({
    data: {
      action: auditEvent.action,
      entityId: auditEvent.entityId,
      entityType: auditEvent.entityType,
      ipAddress: auditEvent.ipAddress,
      correlationId: auditEvent.correlationId,
      nextValue: auditEvent.nextValue as Prisma.InputJsonValue,
      result: auditEvent.result,
      reason: auditEvent.reason
    }
  });

  input.request.log.info({ auditEvent }, "audit.event");
}
async function writeProposalAudit(input: {
  entityId: string;
  nextValue: Prisma.InputJsonValue;
  request: Pick<FastifyRequest, "id" | "ip" | "log">;
}) {
  const auditEvent = createAuditEventEnvelope({
    action: "public.stay_proposal_request.create",
    entityId: input.entityId,
    entityType: "StayProposalRequest",
    ipAddress: input.request.ip,
    correlationId: input.request.id,
    nextValue: input.nextValue,
    result: "SUCCESS",
    reason: "public_request_received"
  });

  await prisma.auditEvent.create({
    data: {
      action: auditEvent.action,
      entityId: auditEvent.entityId,
      entityType: auditEvent.entityType,
      ipAddress: auditEvent.ipAddress,
      correlationId: auditEvent.correlationId,
      nextValue: auditEvent.nextValue as Prisma.InputJsonValue,
      result: auditEvent.result,
      reason: auditEvent.reason
    }
  });

  input.request.log.info({ auditEvent }, "audit.event");
}

async function writeOwnerLeadAudit(input: {
  entityId: string;
  nextValue: Prisma.InputJsonValue;
  request: Pick<FastifyRequest, "id" | "ip" | "log">;
}) {
  const auditEvent = createAuditEventEnvelope({
    action: "public.owner_lead.create",
    entityId: input.entityId,
    entityType: "OwnerLead",
    ipAddress: input.request.ip,
    correlationId: input.request.id,
    nextValue: input.nextValue,
    result: "SUCCESS",
    reason: "public_owner_lead_received"
  });

  await prisma.auditEvent.create({
    data: {
      action: auditEvent.action,
      entityId: auditEvent.entityId,
      entityType: auditEvent.entityType,
      ipAddress: auditEvent.ipAddress,
      correlationId: auditEvent.correlationId,
      nextValue: auditEvent.nextValue as Prisma.InputJsonValue,
      result: auditEvent.result,
      reason: auditEvent.reason
    }
  });

  input.request.log.info({ auditEvent }, "audit.event");
}

function hashContact(email: string) {
  return hashValue(email.trim().toLowerCase());
}

function hashValue(value: string) {
  return createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

function normalizeOptionalText(value: string | undefined) {
  return value && value.length > 0 ? value : undefined;
}

function parseDateOnly(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}
