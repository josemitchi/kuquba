import type { Prisma } from "@prisma/client";
import type { FastifyPluginAsync, FastifyRequest } from "fastify";

import { prisma } from "../lib/prisma";
import { createAuditEventEnvelope } from "../modules/audit/audit-event";
import { authorizeDevPortalSession, type AuthorizedDevPortalSession } from "../modules/identity/dev-session";

const ownerPortalPermissions = ["property:assigned:read", "owner:settlement:read"];
const monthLabels = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

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
};

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
              reservations: {
                include: {
                  guest: true
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
type ReservationWithProperty = OwnerReservationRecord & { property: OwnerPropertyRecord };

function buildOwnerPortal(owner: OwnerPortalRecord, session: AuthorizedDevPortalSession) {
  const contracts = uniqueContractsByProperty(owner.contracts);
  const reservations = getReservationsWithProperty(contracts)
    .filter((reservation) => reservation.status !== "CANCELLED")
    .sort((left, right) => left.arrivalDate.getTime() - right.arrivalDate.getTime());
  const properties = contracts.map((contract) => buildPropertySummary(contract, owner.tasks));
  const activeCount = properties.filter((property) => property.status === "active").length;
  const activationCount = properties.filter((property) => property.status === "onboarding").length;
  const ownerActionCount = owner.tasks.filter((task) => task.ownerAction).length;

  return {
    ownerName: owner.displayName,
    periodLabel: formatMonthYear(new Date()),
    summary:
      "Vista persistida para revisar propiedades asignadas, estancias proximas, pendientes operativos y cierre documental sin exponer reglas financieras definitivas.",
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
        hint: "Sin montos en esta etapa",
        label: "Cierre mensual",
        value: owner.documents.some((document) => document.statusLabel.toLowerCase().includes("revision"))
          ? "En revision"
          : "Pendiente"
      }
    ],
    properties,
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
    governance: [
      "El portal respeta permisos de propietario y no muestra propiedades no asignadas.",
      "Liquidaciones y montos quedan fuera de esta vista hasta definir contrato y ledger.",
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
  const nextReservation = property.reservations.find((reservation) => reservation.status !== "CANCELLED");
  const status = property.visibility === "PUBLIC" ? "active" : property.visibility === "PRIVATE" ? "onboarding" : "attention";
  const maxGuests = firstUnit?.maxGuests ?? 0;
  const bedrooms = firstUnit?.bedrooms ?? 0;

  return {
    contractStage:
      status === "active" ? "Contrato activo, documentos base completos" : "Inventario y reglas de casa en validacion",
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
    nextArrival: nextReservation ? formatDateLabel(nextReservation.arrivalDate, true) : "Pendiente de publicacion",
    occupancySignal: property.reservations.length > 0 ? "Demanda activa" : "Preparando inventario",
    openItems: propertyTasks.length,
    operations: [
      {
        label: "Calendario",
        state: nextReservation ? `${property.reservations.length} estancia(s) en agenda` : "Bloqueado para carga"
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
    statusLabel: status === "active" ? "Operativa" : status === "onboarding" ? "Activacion" : "Atencion"
  };
}

async function writeOwnerAudit(input: {
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
    entityType: "OwnerPortal",
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
  if (status === "CONFIRMED") {
    return "Preparacion previa";
  }

  if (status === "HOLD") {
    return "Solicitud en validacion";
  }

  if (status === "COMPLETED") {
    return "Completada";
  }

  return "Cancelada";
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
