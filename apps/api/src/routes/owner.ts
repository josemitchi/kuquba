import { createHash, randomUUID } from "node:crypto";

import type { Prisma } from "@prisma/client";
import type { FastifyPluginAsync, FastifyRequest } from "fastify";
import { z } from "zod";

import { prisma } from "../lib/prisma";
import { createAuditEventEnvelope } from "../modules/audit/audit-event";
import {
  authorizeDevPortalSession,
  type AuthorizedDevPortalSession
} from "../modules/identity/dev-session";

const ownerPortalPermissions = ["property:assigned:read", "owner:settlement:read"];
const ownerContractSignPermissions = ["property:assigned:read", "contract:self:sign"];
const ownerContractParamsSchema = z.object({
  contractId: z.string().uuid()
});
const ownerAvailabilityBlockSchema = z
  .object({
    endsOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    note: z.string().trim().max(500).optional(),
    propertyId: z.string().uuid(),
    startsOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    unitId: z.string().uuid()
  })
  .superRefine((value, context) => {
    if (parseDateOnly(value.endsOn).getTime() <= parseDateOnly(value.startsOn).getTime()) {
      context.addIssue({ code: "custom", message: "ends_after_starts_required", path: ["endsOn"] });
    }
  });
const ownerContractSignatureProvider = "dev_owner_acceptance";
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

export const registerOwnerRoutes: FastifyPluginAsync = async (app) => {
  app.get("/portal", async (request, reply) => {
    const rawSessionToken = request.headers["x-kuquba-dev-session"]?.toString();
    const authorization = await authorizeDevPortalSession({
      audience: "owner",
      rawSessionToken,
      requiredPermissions: ownerPortalPermissions
    });

    if (!authorization.ok) {
      await writeOwnerAudit({
        action: "owner.portal.read",
        request,
        result: "DENIED",
        reason: authorization.error
      });

      return reply.code(authorization.statusCode).send({
        error: authorization.error,
        correlationId: request.id
      });
    }

    const owner = await loadOwnerPortalRecord(authorization.session.user.id);

    if (!owner) {
      await writeOwnerAudit({
        action: "owner.portal.read",
        actorUserId: authorization.session.user.id,
        request,
        result: "DENIED",
        reason: "owner_profile_not_found"
      });

      return reply.code(404).send({
        error: "owner_profile_not_found",
        correlationId: request.id
      });
    }

    const portal = buildOwnerPortal(owner, authorization.session);

    await writeOwnerAudit({
      action: "owner.portal.read",
      actorUserId: authorization.session.user.id,
      entityId: owner.id,
      request,
      result: "SUCCESS",
      reason: "owner_portal_loaded",
      nextValue: {
        documentCount: portal.settlementItems.length,
        propertyCount: portal.properties.length,
        taskCount: portal.tasks.length
      }
    });

    return reply.send({
      portal,
      correlationId: request.id
    });
  });

  app.post("/availability-blocks", async (request, reply) => {
    const rawSessionToken = request.headers["x-kuquba-dev-session"]?.toString();
    const authorization = await authorizeDevPortalSession({
      audience: "owner",
      rawSessionToken,
      requiredPermissions: ownerPortalPermissions
    });

    if (!authorization.ok) {
      await writeOwnerAudit({
        action: "owner.availability_block.request",
        request,
        result: "DENIED",
        reason: authorization.error
      });

      return reply.code(authorization.statusCode).send({
        error: authorization.error,
        correlationId: request.id
      });
    }

    const body = ownerAvailabilityBlockSchema.parse(request.body);
    const owner = await loadOwnerByUserId(authorization.session.user.id);

    if (!owner) {
      await writeOwnerAudit({
        action: "owner.availability_block.request",
        actorUserId: authorization.session.user.id,
        request,
        result: "DENIED",
        reason: "owner_profile_not_found"
      });

      return reply.code(404).send({
        error: "owner_profile_not_found",
        correlationId: request.id
      });
    }

    const blockResult = await requestOwnerAvailabilityBlock({
      actor: authorization.session,
      body,
      owner,
      request
    });

    if (!blockResult.ok) {
      return reply.code(blockResult.statusCode).send({
        error: blockResult.error,
        correlationId: request.id
      });
    }

    const refreshedOwner = await loadOwnerPortalRecord(authorization.session.user.id);

    if (!refreshedOwner) {
      return reply.code(404).send({
        error: "owner_profile_not_found",
        correlationId: request.id
      });
    }

    return reply.code(201).send({
      block: blockResult.block,
      portal: buildOwnerPortal(refreshedOwner, authorization.session),
      correlationId: request.id
    });
  });
  app.post("/contracts/:contractId/accept-dev", async (request, reply) => {
    const rawSessionToken = request.headers["x-kuquba-dev-session"]?.toString();
    const authorization = await authorizeDevPortalSession({
      audience: "owner",
      rawSessionToken,
      requiredPermissions: ownerContractSignPermissions
    });

    if (!authorization.ok) {
      await writeOwnerAudit({
        action: "owner.contract.accept_dev",
        request,
        result: "DENIED",
        reason: authorization.error
      });

      return reply.code(authorization.statusCode).send({
        error: authorization.error,
        correlationId: request.id
      });
    }

    const params = ownerContractParamsSchema.parse(request.params);
    const owner = await loadOwnerByUserId(authorization.session.user.id);

    if (!owner) {
      await writeOwnerAudit({
        action: "owner.contract.accept_dev",
        actorUserId: authorization.session.user.id,
        request,
        result: "DENIED",
        reason: "owner_profile_not_found"
      });

      return reply.code(404).send({
        error: "owner_profile_not_found",
        correlationId: request.id
      });
    }

    const acceptResult = await acceptOwnerContractDev({
      actor: authorization.session,
      contractId: params.contractId,
      owner,
      request
    });

    if (!acceptResult.ok) {
      return reply.code(acceptResult.statusCode).send({
        error: acceptResult.error,
        correlationId: request.id
      });
    }

    const refreshedOwner = await loadOwnerPortalRecord(authorization.session.user.id);

    if (!refreshedOwner) {
      return reply.code(404).send({
        error: "owner_profile_not_found",
        correlationId: request.id
      });
    }

    return reply.send({
      contract: acceptResult.contract,
      portal: buildOwnerPortal(refreshedOwner, authorization.session),
      correlationId: request.id
    });
  });
};

async function loadOwnerByUserId(userId: string) {
  return prisma.owner.findUnique({
    where: {
      userId
    }
  });
}

async function loadOwnerPortalRecord(userId: string) {
  return prisma.owner.findUnique({
    where: {
      userId
    },
    include: {
      contracts: {
        include: {
          property: {
            include: {
              availabilityBlocks: {
                orderBy: { startsOn: "asc" },
                where: { endsOn: { gte: new Date() } }
              },
              reservations: {
                include: {
                  guest: true,
                  payments: { orderBy: { createdAt: "desc" }, take: 1 },
                  unit: true
                },
                orderBy: {
                  arrivalDate: "asc"
                }
              },
              units: {
                orderBy: {
                  createdAt: "asc"
                }
              }
            }
          },
          versions: {
            orderBy: {
              version: "desc"
            }
          }
        },
        orderBy: {
          startsOn: "asc"
        }
      },
      documents: {
        include: {
          property: true
        },
        orderBy: [
          {
            sortOrder: "asc"
          },
          {
            createdAt: "asc"
          }
        ]
      },
      settlements: {
        include: {
          lines: {
            include: {
              reservation: true
            },
            orderBy: [
              {
                occurredAt: "asc"
              },
              {
                createdAt: "asc"
              }
            ]
          },
          property: true
        },
        orderBy: [
          {
            periodEnd: "desc"
          },
          {
            createdAt: "desc"
          }
        ]
      },
      tasks: {
        include: {
          property: true
        },
        orderBy: [
          {
            sortOrder: "asc"
          },
          {
            createdAt: "asc"
          }
        ],
        where: {
          status: "OPEN"
        }
      }
    }
  });
}

type OwnerPortalRecord = NonNullable<Awaited<ReturnType<typeof loadOwnerPortalRecord>>>;
type OwnerContractRecord = OwnerPortalRecord["contracts"][number];
type OwnerPropertyRecord = OwnerContractRecord["property"];
type OwnerReservationRecord = OwnerPropertyRecord["reservations"][number];
type OwnerAvailabilityBlockRecord = OwnerPropertyRecord["availabilityBlocks"][number];
type ReservationWithProperty = OwnerReservationRecord & { property: OwnerPropertyRecord };
type OwnerSettlementRecord = OwnerPortalRecord["settlements"][number];
type OwnerAccessRecord = NonNullable<Awaited<ReturnType<typeof loadOwnerByUserId>>>;
type OwnerContractForSignature = NonNullable<Awaited<ReturnType<typeof loadContractForOwner>>>;

function buildOwnerPortal(owner: OwnerPortalRecord, session: AuthorizedDevPortalSession) {
  const contracts = uniqueContractsByProperty(owner.contracts);
  const reservations = getReservationsWithProperty(contracts)
    .filter((reservation) => reservation.status !== "CANCELLED")
    .sort((left, right) => left.arrivalDate.getTime() - right.arrivalDate.getTime());
  const properties = contracts.map((contract) => buildPropertySummary(contract, owner.tasks));
  const activeCount = properties.filter((property) => property.status === "active").length;
  const activationCount = properties.filter((property) => property.status === "onboarding").length;
  const ownerActionCount = owner.tasks.filter((task) => task.ownerAction).length;
  const pendingContractCount = contracts.filter(isOwnerContractPending).length;
  const activeContractCount = contracts.filter((contract) => contract.status === "ACTIVE").length;
  const financeSummary = buildOwnerFinanceSummary(owner.settlements);
  const reservationSummaries = reservations.slice(0, 20).map(mapOwnerReservation);

  return {
    ownerName: owner.displayName,
    periodLabel: formatMonthYear(new Date()),
    summary:
      "Vista para revisar propiedades asignadas, estancias proximas, pendientes operativos, contratos y cierre documental sin exponer reglas financieras definitivas.",
    metrics: [
      {
        hint: `${activeCount} operativa(s), ${activationCount} en activacion`,
        label: "Propiedades",
        value: `${properties.length}`
      },
      {
        hint: "Coordinadas por operacion",
        label: "Llegadas proximas",
        value: `${reservations.length}`
      },
      {
        hint: `${ownerActionCount} requieren accion del propietario`,
        label: "Pendientes",
        value: `${owner.tasks.length}`
      },
      {
        hint: `${activeContractCount} firmado(s), ${pendingContractCount} pendiente(s)`,
        label: "Contratos",
        value: pendingContractCount > 0 ? `${pendingContractCount} pendiente(s)` : "Firmados"
      },
      {
        hint: `${financeSummary.statusLabel} - ${financeSummary.periodLabel}`,
        label: "Saldo propietario",
        value: financeSummary.ownerPayoutLabel
      }
    ],
    financeSummary,
    properties,
    reservations: reservationSummaries,
    upcomingStays: reservations.slice(0, 6).map((reservation) => ({
      date: formatDateLabel(reservation.arrivalDate),
      property: reservation.property.name,
      status: reservationStatusLabel(reservation.status),
      traveler: reservation.guest.fullName
    })),
    tasks: owner.tasks.map((task) => ({
      due: task.dueLabel,
      id: task.id,
      ownerAction: task.ownerAction,
      priority: normalizePriority(task.priority),
      property: task.property?.name ?? "Cuenta propietario",
      title: task.title
    })),
    settlementItems: owner.documents.map((document) => ({
      detail: document.detail,
      label: document.label,
      status: document.statusLabel
    })),
    settlements: owner.settlements.map(mapOwnerSettlement),
    governance: [
      "El portal respeta permisos de propietario y no muestra propiedades no asignadas.",
      "Contratos y aceptaciones quedan versionados y auditados antes de habilitar firma externa.",
      "Finanzas del propietario se leen desde liquidaciones y lineas contables registradas; pagos externos siguen deshabilitados.",
      `Lectura auditada para sesion ${session.sessionId.slice(0, 8)}.`
    ]
  };
}

function uniqueContractsByProperty(contracts: OwnerPortalRecord["contracts"]) {
  const contractsByProperty = new Map<string, OwnerContractRecord>();

  for (const contract of contracts) {
    const previous = contractsByProperty.get(contract.propertyId);

    if (!previous || contract.startsOn.getTime() > previous.startsOn.getTime()) {
      contractsByProperty.set(contract.propertyId, contract);
    }
  }

  return [...contractsByProperty.values()];
}

function getReservationsWithProperty(contracts: OwnerContractRecord[]) {
  const reservations: ReservationWithProperty[] = [];

  for (const contract of contracts) {
    for (const reservation of contract.property.reservations) {
      reservations.push({
        ...reservation,
        property: contract.property
      });
    }
  }

  return reservations;
}

function buildPropertySummary(contract: OwnerContractRecord, tasks: OwnerPortalRecord["tasks"]) {
  const property = contract.property;
  const firstUnit = property.units[0];
  const propertyTasks = tasks.filter((task) => task.propertyId === property.id);
  const activeReservations = property.reservations.filter(
    (reservation) => reservation.status !== "CANCELLED"
  );
  const nextReservation = activeReservations[0];
  const status = buildOwnerPropertyStatus(contract, property.visibility);
  const maxGuests = firstUnit?.maxGuests ?? 0;
  const bedrooms = firstUnit?.bedrooms ?? 0;

  return {
    contract: mapOwnerContract(contract),
    contractStage: buildOwnerContractStage(contract),
    highlights: [
      maxGuests > 0 ? `${maxGuests} huespedes` : "Capacidad por validar",
      bedrooms > 0 ? `${bedrooms} habitaciones` : "Habitaciones por validar",
      status === "active" ? "Visibilidad publica" : "Inventario privado"
    ],
    id: property.id,
    image: property.destination.toLowerCase().includes("atitlan")
      ? "/images/hero-villa-atitlan.png"
      : "/images/owner-dashboard.png",
    imageAlt: `Vista operativa de ${property.name}`,
    location: property.destination,
    name: property.name,
    estimatedRevenue: buildOwnerPropertyRevenue(activeReservations),
    nextArrival: nextReservation
      ? formatDateLabel(nextReservation.arrivalDate, true)
      : "Pendiente de publicacion",
    occupancySignal: property.reservations.length > 0 ? "Demanda activa" : "Preparando inventario",
    openItems: propertyTasks.length,
    reservations: activeReservations.slice(0, 8).map(mapOwnerReservation),
    requestedBlocks: property.availabilityBlocks.map(mapOwnerAvailabilityBlock),
    units: property.units.map((unit) => ({ id: unit.id, name: unit.name })),
    operations: [
      {
        label: "Calendario",
        state: nextReservation
          ? `${property.reservations.length} estancia(s) en agenda`
          : "Bloqueado para carga"
      },
      {
        label: "Housekeeping",
        state: status === "active" ? "Equipo asignado" : "Proveedor por confirmar"
      },
      {
        label: "Mantenimiento",
        state: propertyTasks.some((task) => task.title.toLowerCase().includes("mantenimiento"))
          ? "Preventivo pendiente"
          : "Sin incidencias criticas"
      }
    ],
    reviewLabel: status === "active" ? "Revision semanal completa" : "Revision inicial abierta",
    serviceLevel: status === "active" ? "Operacion completa" : "Activacion operativa",
    status,
    statusLabel:
      status === "active" ? "Operativa" : status === "onboarding" ? "Activacion" : "Atencion"
  };
}

function mapOwnerReservation(reservation: ReservationWithProperty | OwnerReservationRecord) {
  const latestPayment = reservation.payments[0] ?? null;

  return {
    arrivalDate: toDateOnly(reservation.arrivalDate),
    currency: reservation.currency ?? latestPayment?.currency ?? "GTQ",
    departureDate: toDateOnly(reservation.departureDate),
    guestName: reservation.guest.fullName,
    id: reservation.id,
    nights: differenceInNights(reservation.arrivalDate, reservation.departureDate),
    paymentStatus: latestPayment?.status ?? "NO_PAYMENT",
    paymentStatusLabel: latestPayment ? paymentStatusLabel(latestPayment.status) : "Sin pago",
    propertyName: "property" in reservation ? reservation.property.name : "Propiedad asignada",
    reservationCode: reservation.privateCode,
    status: reservation.status,
    statusLabel: reservationStatusLabel(reservation.status),
    total: reservation.total?.toString() ?? "0.00",
    unitName: reservation.unit.name
  };
}

function mapOwnerAvailabilityBlock(block: OwnerAvailabilityBlockRecord) {
  return {
    endsOn: toDateOnly(block.endsOn),
    id: block.id,
    note: block.note,
    reason: block.reason,
    reasonLabel:
      block.reason === "OWNER_HOLD"
        ? "Bloqueo solicitado"
        : block.reason === "OPS_HOLD"
          ? "Bloqueo Ops"
          : "Mantenimiento",
    startsOn: toDateOnly(block.startsOn),
    unitId: block.unitId
  };
}

function buildOwnerPropertyRevenue(reservations: OwnerReservationRecord[]) {
  const confirmed = reservations.filter((reservation) => reservation.status === "CONFIRMED");
  const gross = confirmed.reduce(
    (sum, reservation) => sum + Number(reservation.total?.toString() ?? "0"),
    0
  );
  const estimatedOwner = gross * 0.82;

  return {
    confirmedCount: confirmed.length,
    currency: confirmed[0]?.currency ?? reservations[0]?.currency ?? "GTQ",
    estimatedOwnerPayout: estimatedOwner.toFixed(2),
    grossConfirmed: gross.toFixed(2),
    label: confirmed.length > 0 ? `${confirmed.length} confirmada(s)` : "Sin reservas confirmadas"
  };
}
async function acceptOwnerContractDev(input: {
  actor: AuthorizedDevPortalSession;
  contractId: string;
  owner: OwnerAccessRecord;
  request: Pick<FastifyRequest, "id" | "ip" | "log">;
}): Promise<
  | { ok: true; contract: ReturnType<typeof mapOwnerContract> }
  | { ok: false; error: string; statusCode: 404 | 409 }
> {
  const contract = await loadContractForOwner(input.contractId, input.owner.id);

  if (!contract) {
    await writeOwnerAudit({
      action: "owner.contract.accept_dev",
      actorUserId: input.actor.user.id,
      entityId: input.contractId,
      entityType: "Contract",
      request: input.request,
      result: "DENIED",
      reason: "contract_not_found"
    });

    return { ok: false, error: "contract_not_found", statusCode: 404 };
  }

  if (contract.status === "ACTIVE") {
    await writeOwnerAudit({
      action: "owner.contract.accept_dev",
      actorUserId: input.actor.user.id,
      entityId: contract.id,
      entityType: "Contract",
      nextValue: buildOwnerContractAuditValue(contract),
      request: input.request,
      result: "SUCCESS",
      reason: "contract_already_active"
    });

    return { ok: true, contract: mapOwnerContract(contract) };
  }

  if (contract.status !== "ISSUED") {
    await writeOwnerAudit({
      action: "owner.contract.accept_dev",
      actorUserId: input.actor.user.id,
      entityId: contract.id,
      entityType: "Contract",
      nextValue: buildOwnerContractAuditValue(contract),
      request: input.request,
      result: "DENIED",
      reason: "contract_not_pending_signature"
    });

    return { ok: false, error: "contract_not_pending_signature", statusCode: 409 };
  }

  const signedAt = new Date();
  const signatureProviderRef = buildOwnerSignatureRef();
  const signatureEvidenceHash = hashContractAcceptanceEvidence({
    actorUserId: input.actor.user.id,
    contractId: contract.id,
    ownerId: input.owner.id,
    signedAt,
    signatureProviderRef,
    version: contract.currentVersion
  });

  const updatedContract = await prisma.contract.update({
    data: {
      signedAt,
      signedByUserId: input.actor.user.id,
      signatureEvidenceHash,
      signatureProvider: ownerContractSignatureProvider,
      signatureProviderRef,
      status: "ACTIVE"
    },
    include: {
      owner: true,
      property: true,
      versions: {
        orderBy: {
          version: "desc"
        }
      }
    },
    where: {
      id: contract.id
    }
  });

  await writeOwnerAudit({
    action: "owner.contract.accept_dev",
    actorUserId: input.actor.user.id,
    entityId: updatedContract.id,
    entityType: "Contract",
    nextValue: buildOwnerContractAuditValue(updatedContract),
    request: input.request,
    result: "SUCCESS",
    reason: "contract_signed_dev"
  });

  return { ok: true, contract: mapOwnerContract(updatedContract) };
}

async function requestOwnerAvailabilityBlock(input: {
  actor: AuthorizedDevPortalSession;
  body: z.infer<typeof ownerAvailabilityBlockSchema>;
  owner: OwnerAccessRecord;
  request: Pick<FastifyRequest, "id" | "ip" | "log">;
}): Promise<
  | { ok: true; block: ReturnType<typeof mapOwnerAvailabilityBlock> }
  | { ok: false; error: string; statusCode: 404 | 409 }
> {
  const contract = await prisma.contract.findFirst({
    include: {
      property: {
        include: {
          availabilityBlocks: true,
          reservations: true,
          units: true
        }
      }
    },
    where: {
      ownerId: input.owner.id,
      propertyId: input.body.propertyId,
      status: { in: ["ACTIVE", "SIGNED", "ISSUED"] }
    }
  });

  if (!contract) {
    return { ok: false, error: "owner_property_not_found", statusCode: 404 };
  }

  const unit = contract.property.units.find((candidate) => candidate.id === input.body.unitId);
  if (!unit) {
    return { ok: false, error: "owner_unit_not_found", statusCode: 404 };
  }

  const startsOn = parseDateOnly(input.body.startsOn);
  const endsOn = parseDateOnly(input.body.endsOn);
  const hasReservationConflict = contract.property.reservations.some(
    (reservation) =>
      ["HOLD", "PENDING_PAYMENT", "CONFIRMED"].includes(reservation.status) &&
      reservation.unitId === unit.id &&
      datesOverlap(startsOn, endsOn, reservation.arrivalDate, reservation.departureDate)
  );
  const hasBlockConflict = contract.property.availabilityBlocks.some(
    (block) =>
      block.unitId === unit.id && datesOverlap(startsOn, endsOn, block.startsOn, block.endsOn)
  );

  if (hasReservationConflict || hasBlockConflict) {
    return { ok: false, error: "availability_block_conflict", statusCode: 409 };
  }

  const block = await prisma.availabilityBlock.create({
    data: {
      endsOn,
      note: normalizeNullableText(input.body.note) ?? "Solicitado desde portal del propietario",
      propertyId: contract.propertyId,
      reason: "OWNER_HOLD",
      startsOn,
      unitId: unit.id
    }
  });

  await writeOwnerAudit({
    action: "owner.availability_block.request",
    actorUserId: input.actor.user.id,
    entityId: block.id,
    entityType: "AvailabilityBlock",
    nextValue: {
      endsOn: input.body.endsOn,
      propertyId: contract.propertyId,
      reason: block.reason,
      startsOn: input.body.startsOn,
      unitId: unit.id
    },
    request: input.request,
    result: "SUCCESS",
    reason: "owner_hold_requested"
  });

  return { ok: true, block: mapOwnerAvailabilityBlock(block) };
}

function datesOverlap(leftStart: Date, leftEnd: Date, rightStart: Date, rightEnd: Date) {
  return leftStart < rightEnd && leftEnd > rightStart;
}
async function loadContractForOwner(contractId: string, ownerId: string) {
  return prisma.contract.findFirst({
    where: {
      id: contractId,
      ownerId
    },
    include: {
      owner: true,
      property: true,
      versions: {
        orderBy: {
          version: "desc"
        }
      }
    }
  });
}

function mapOwnerContract(contract: OwnerContractRecord | OwnerContractForSignature) {
  return {
    canAcceptDev: contract.status === "ISSUED",
    currentVersion: contract.currentVersion,
    id: contract.id,
    issuedAt: contract.issuedAt?.toISOString() ?? null,
    signedAt: contract.signedAt?.toISOString() ?? null,
    signatureProvider: contract.signatureProvider,
    signatureProviderRef: contract.signatureProviderRef,
    startsOn: contract.startsOn.toISOString(),
    status: contract.status,
    statusLabel: contractStatusLabel(contract.status),
    summary: contract.summary,
    terms: [
      {
        label: "Participacion del propietario",
        value: formatBps(contract.ownerShareBps)
      },
      {
        label: "Participacion KUQUBA",
        value: formatBps(contract.kuqubaShareBps)
      },
      {
        label: "Vigencia",
        value: formatDateLabel(contract.startsOn, true)
      }
    ],
    title: contract.title,
    versions: contract.versions.map((version) => ({
      createdAt: version.createdAt.toISOString(),
      id: version.id,
      issuedAt: version.issuedAt?.toISOString() ?? null,
      summary: version.summary,
      title: version.title,
      version: version.version
    }))
  };
}

function buildOwnerFinanceSummary(settlements: OwnerSettlementRecord[]) {
  const latestSettlement = settlements[0];

  if (!latestSettlement) {
    return {
      adjustments: "0.00",
      cleaningFees: "0.00",
      currency: "GTQ",
      generatedAt: null,
      grossAccommodation: "0.00",
      kuqubaServiceFees: "0.00",
      lineCount: 0,
      ownerExpenses: "0.00",
      ownerPayout: "0.00",
      ownerPayoutLabel: formatCurrencyValue("0.00", "GTQ"),
      paidAt: null,
      periodLabel: formatMonthYear(new Date()),
      propertyCount: 0,
      status: "DRAFT" as const,
      statusLabel: settlementStatusLabel("DRAFT"),
      taxes: "0.00"
    };
  }

  return {
    adjustments: decimalToAmount(latestSettlement.adjustments),
    cleaningFees: decimalToAmount(latestSettlement.cleaningFees),
    currency: latestSettlement.currency,
    generatedAt: latestSettlement.generatedAt.toISOString(),
    grossAccommodation: decimalToAmount(latestSettlement.grossAccommodation),
    kuqubaServiceFees: decimalToAmount(latestSettlement.kuqubaServiceFees),
    lineCount: latestSettlement.lines.length,
    ownerExpenses: decimalToAmount(latestSettlement.ownerExpenses),
    ownerPayout: decimalToAmount(latestSettlement.ownerPayout),
    ownerPayoutLabel: formatCurrencyValue(latestSettlement.ownerPayout, latestSettlement.currency),
    paidAt: latestSettlement.paidAt?.toISOString() ?? null,
    periodLabel: buildSettlementPeriodLabel(latestSettlement),
    propertyCount: new Set(settlements.map((settlement) => settlement.propertyId).filter(Boolean))
      .size,
    status: latestSettlement.status,
    statusLabel: settlementStatusLabel(latestSettlement.status),
    taxes: decimalToAmount(latestSettlement.taxes)
  };
}

function mapOwnerSettlement(settlement: OwnerSettlementRecord) {
  return {
    adjustments: decimalToAmount(settlement.adjustments),
    approvedAt: settlement.approvedAt?.toISOString() ?? null,
    cleaningFees: decimalToAmount(settlement.cleaningFees),
    currency: settlement.currency,
    generatedAt: settlement.generatedAt.toISOString(),
    grossAccommodation: decimalToAmount(settlement.grossAccommodation),
    id: settlement.id,
    kuqubaServiceFees: decimalToAmount(settlement.kuqubaServiceFees),
    lineItems: settlement.lines.map((line) => ({
      amount: decimalToAmount(line.amount),
      currency: line.currency,
      id: line.id,
      label: line.label,
      occurredAt: line.occurredAt.toISOString(),
      reservationCode: line.reservation?.privateCode ?? null,
      sourceMemo: line.sourceMemo,
      type: line.type,
      typeLabel: ledgerEntryTypeLabel(line.type)
    })),
    ownerExpenses: decimalToAmount(settlement.ownerExpenses),
    ownerPayout: decimalToAmount(settlement.ownerPayout),
    ownerPayoutLabel: formatCurrencyValue(settlement.ownerPayout, settlement.currency),
    paidAt: settlement.paidAt?.toISOString() ?? null,
    periodEnd: settlement.periodEnd.toISOString(),
    periodLabel: buildSettlementPeriodLabel(settlement),
    periodStart: settlement.periodStart.toISOString(),
    propertyName: settlement.property?.name ?? "Portfolio del propietario",
    reviewedAt: settlement.reviewedAt?.toISOString() ?? null,
    status: settlement.status,
    statusLabel: settlementStatusLabel(settlement.status),
    taxes: decimalToAmount(settlement.taxes)
  };
}

function settlementStatusLabel(status: string) {
  const labels: Record<string, string> = {
    APPROVED: "Aprobada",
    DRAFT: "Borrador",
    PAID: "Pagada",
    READY_FOR_REVIEW: "Lista para revision"
  };

  return labels[status] ?? status;
}

function ledgerEntryTypeLabel(type: string) {
  const labels: Record<string, string> = {
    ACCOMMODATION: "Ingreso alojamiento",
    ADJUSTMENT: "Ajuste",
    CLEANING: "Limpieza",
    KUQUBA_SERVICE_FEE: "Servicio KUQUBA",
    MAINTENANCE_FUND: "Fondo mantenimiento",
    OWNER_EXPENSE: "Gasto del propietario",
    OWNER_SHARE: "Participacion del propietario",
    REFUND: "Reembolso",
    SETTLEMENT: "Liquidacion del propietario",
    TAX: "Impuestos"
  };

  return labels[type] ?? type;
}

function buildSettlementPeriodLabel(
  settlement: Pick<OwnerSettlementRecord, "periodEnd" | "periodStart">
) {
  const start = formatDateLabel(settlement.periodStart);
  const end = formatDateLabel(settlement.periodEnd, true);

  return `${start} - ${end}`;
}

function decimalToAmount(value: { toString(): string }) {
  return Number(value.toString()).toFixed(2);
}

function formatCurrencyValue(value: { toString(): string } | string, currency: string) {
  return new Intl.NumberFormat("es-GT", {
    currency,
    style: "currency"
  }).format(Number(value.toString()));
}

function buildOwnerPropertyStatus(contract: OwnerContractRecord, visibility: string) {
  if (contract.status === "ACTIVE" && visibility === "PUBLIC") {
    return "active" as const;
  }

  if (contract.status === "ISSUED") {
    return "attention" as const;
  }

  return "onboarding" as const;
}

function buildOwnerContractStage(contract: OwnerContractRecord) {
  if (contract.status === "ACTIVE") {
    return contract.signedAt
      ? `Contrato activo y firmado el ${formatDateLabel(contract.signedAt, true)}`
      : "Contrato activo, documentos base completos";
  }

  if (contract.status === "ISSUED") {
    return "Contrato emitido y pendiente de aceptacion del propietario";
  }

  if (contract.status === "SIGNED") {
    return "Contrato firmado, pendiente de activacion operativa";
  }

  return "Inventario y reglas de casa en validacion";
}

function contractStatusLabel(status: string) {
  const labels: Record<string, string> = {
    ACTIVE: "Contrato activo",
    DRAFT: "Borrador",
    ISSUED: "Pendiente de firma",
    SIGNED: "Firmado",
    SUPERSEDED: "Reemplazado",
    VOID: "Anulado"
  };

  return labels[status] ?? status;
}

function isOwnerContractPending(contract: OwnerContractRecord) {
  return contract.status === "ISSUED";
}

function buildOwnerContractAuditValue(contract: OwnerContractRecord | OwnerContractForSignature) {
  return {
    currentVersion: contract.currentVersion,
    issuedAt: contract.issuedAt?.toISOString() ?? null,
    ownerId: contract.ownerId,
    propertyId: contract.propertyId,
    signedAt: contract.signedAt?.toISOString() ?? null,
    signatureProvider: contract.signatureProvider,
    signatureProviderRef: contract.signatureProviderRef,
    status: contract.status
  };
}

function hashContractAcceptanceEvidence(input: {
  actorUserId: string;
  contractId: string;
  ownerId: string;
  signedAt: Date;
  signatureProviderRef: string;
  version: number;
}) {
  return createHash("sha256")
    .update(
      JSON.stringify({
        actorUserId: input.actorUserId,
        contractId: input.contractId,
        ownerId: input.ownerId,
        signedAt: input.signedAt.toISOString(),
        signatureProvider: ownerContractSignatureProvider,
        signatureProviderRef: input.signatureProviderRef,
        version: input.version
      })
    )
    .digest("hex");
}

function buildOwnerSignatureRef() {
  return `DEV-SIGN-${randomUUID().replace(/-/g, "").slice(0, 16).toUpperCase()}`;
}

function formatBps(value: number) {
  if (value <= 0) {
    return "Por definir";
  }

  const percent = (value / 100).toFixed(2).replace(/\.00$/, "");

  return `${percent}%`;
}

async function writeOwnerAudit(input: {
  action: string;
  actorUserId?: string;
  entityId?: string;
  entityType?: string;
  nextValue?: Prisma.InputJsonValue;
  reason: string;
  request: Pick<FastifyRequest, "id" | "ip" | "log">;
  result: "SUCCESS" | "PENDING" | "DENIED" | "FAILED";
}) {
  const auditEvent = createAuditEventEnvelope({
    action: input.action,
    actorUserId: input.actorUserId,
    entityId: input.entityId,
    entityType: input.entityType ?? "OwnerPortal",
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

function normalizePriority(value: string) {
  if (value === "high" || value === "medium" || value === "low") {
    return value;
  }

  return "medium";
}

function reservationStatusLabel(status: string) {
  const labels: Record<string, string> = {
    CANCELLED: "Cancelada",
    COMPLETED: "Completada",
    CONFIRMED: "Confirmada",
    EXPIRED: "Expirada",
    HOLD: "Reserva temporal",
    PENDING_PAYMENT: "Pendiente pago"
  };

  return labels[status] ?? status;
}

function paymentStatusLabel(status: string) {
  const labels: Record<string, string> = {
    EXPIRED: "Expirado",
    FAILED: "Fallido",
    PENDING: "Pendiente",
    REFUNDED: "Reembolsado",
    SUCCEEDED: "Confirmado"
  };

  return labels[status] ?? status;
}

function parseDateOnly(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

function toDateOnly(value: Date) {
  return value.toISOString().slice(0, 10);
}

function differenceInNights(arrivalDate: Date, departureDate: Date) {
  return Math.max(0, Math.round((departureDate.getTime() - arrivalDate.getTime()) / 86_400_000));
}

function normalizeNullableText(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}
function formatDateLabel(date: Date, includeYear = false) {
  const month = monthLabels[date.getUTCMonth()] ?? "";
  const day = String(date.getUTCDate()).padStart(2, "0");

  return includeYear ? `${day} ${month} ${date.getUTCFullYear()}` : `${day} ${month}`;
}

function formatMonthYear(date: Date) {
  const month = monthLabels[date.getUTCMonth()] ?? "";

  return `${month} ${date.getUTCFullYear()}`;
}
