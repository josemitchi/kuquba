import { createHash } from "node:crypto";

import { Prisma } from "@prisma/client";
import type { FastifyPluginAsync, FastifyRequest } from "fastify";
import { z } from "zod";

import { env } from "../config/env";
import { prisma } from "../lib/prisma";
import {
  getFormalDeliveryProviderName,
  sendFormalTransactionalMessage
} from "../modules/delivery/formal-delivery-adapter";
import { createAuditEventEnvelope } from "../modules/audit/audit-event";
import {
  authorizeDevPortalSession,
  type AuthorizedDevPortalSession
} from "../modules/identity/dev-session";

const opsReadPermissions = ["operation:calendar:read", "audit:event:read"];
const opsReservationStatusLabels: Record<string, string> = {
  CANCELLED: "Cancelada",
  COMPLETED: "Completada",
  CONFIRMED: "Confirmada",
  EXPIRED: "Expirada",
  HOLD: "Hold",
  PENDING_PAYMENT: "Pendiente pago"
};
const paymentStatusLabels: Record<string, string> = {
  FAILED: "Fallido",
  PENDING: "Pendiente",
  REFUNDED: "Reembolsado",
  SUCCEEDED: "Confirmado"
};
const availabilityBlockReasonLabels: Record<string, string> = {
  MAINTENANCE: "Mantenimiento",
  OPS_HOLD: "Bloqueo Ops",
  OWNER_HOLD: "Bloqueo owner"
};
const opsUpdatePermissions = ["operation:task:update"];
const opsFormalUpdatePermissions = ["operation:formal:update"];
const opsFormalApprovePermissions = ["operation:formal:approve"];
const reviewStatusSchema = z.enum(["NEW", "REVIEWING", "CONTACTED", "CLOSED"]);
const caseStatusSchema = z.enum(["OPEN", "QUALIFYING", "ACTION_PENDING", "CLOSED"]);
const taskStatusSchema = z.enum(["OPEN", "DONE"]);
const opsReservationStatusSchema = z.enum(["HOLD", "PENDING_PAYMENT", "CONFIRMED", "CANCELLED", "COMPLETED", "EXPIRED"]);
const housekeepingTaskStatusSchema = z.enum([
  "SCHEDULED",
  "ASSIGNED",
  "IN_PROGRESS",
  "DONE",
  "BLOCKED",
  "CANCELLED"
]);
const maintenanceTicketStatusSchema = z.enum([
  "OPEN",
  "TRIAGED",
  "SCHEDULED",
  "IN_PROGRESS",
  "RESOLVED",
  "CLOSED"
]);
const dateOnlySchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/);
const propertyOnboardingStatusSchema = z.enum([
  "DRAFT",
  "QUALIFICATION",
  "DOCUMENTS",
  "OPERATIONS_READY",
  "CLOSED"
]);
const stayProposalStatusSchema = z.enum([
  "DRAFT",
  "READY_TO_SEND",
  "SENT",
  "ACCEPTED",
  "DECLINED",
  "VOID"
]);
const prioritySchema = z.enum(["high", "normal", "medium", "low"]);
const workbenchParamsSchema = z.object({
  id: z.string().uuid(),
  itemType: z.enum(["owner-lead", "stay-proposal-request"])
});
const caseTaskParamsSchema = workbenchParamsSchema.extend({
  taskId: z.string().uuid()
});
const caseChecklistParamsSchema = workbenchParamsSchema.extend({
  key: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9_:-]+$/)
});
const statusUpdateSchema = z.object({
  status: reviewStatusSchema
});
const caseUpdateSchema = z.object({
  nextStep: z.string().trim().max(240).nullable().optional(),
  priority: prioritySchema.optional(),
  status: caseStatusSchema.optional()
});
const noteCreateSchema = z.object({
  body: z.string().trim().min(3).max(1000)
});
const taskCreateSchema = z.object({
  dueLabel: z.string().trim().max(80).optional(),
  priority: prioritySchema.default("normal"),
  title: z.string().trim().min(3).max(160)
});
const taskUpdateSchema = z.object({
  status: taskStatusSchema
});
const housekeepingTaskParamsSchema = z.object({
  taskId: z.string().uuid()
});
const housekeepingTaskUpdateSchema = z.object({
  note: z.string().trim().max(500).nullable().optional(),
  status: housekeepingTaskStatusSchema
});
const maintenanceTicketParamsSchema = z.object({
  ticketId: z.string().uuid()
});
const maintenanceTicketUpdateSchema = z.object({
  note: z.string().trim().max(500).nullable().optional(),
  status: maintenanceTicketStatusSchema
});
const conversionUpdateSchema = z.object({
  assigneeAction: z.enum(["ASSIGN_SELF", "CLEAR"]).optional(),
  handoffNotes: z.string().trim().max(700).nullable().optional(),
  nextMilestone: z.string().trim().max(180).optional(),
  status: z.string().trim().optional(),
  targetDate: dateOnlySchema.nullable().optional()
});
const checklistUpdateSchema = z.object({
  status: taskStatusSchema
});
const proposalVersionCreateSchema = z.object({
  internalNotes: z.string().trim().max(500).optional(),
  summary: z.string().trim().min(8).max(700),
  termsLabel: z.string().trim().min(4).max(160)
});
const formalActivityCreateSchema = z.object({
  body: z.string().trim().min(3).max(1000)
});
const formalTransitionSchema = z.object({
  note: z.string().trim().max(700).nullable().optional()
});
const contractIssueSchema = formalTransitionSchema.extend({
  startsOn: dateOnlySchema.optional()
});
const propertyActivationImageSchema = z.object({
  alt: z.string().trim().max(180).optional(),
  isCover: z.boolean().optional(),
  sortOrder: z.coerce.number().int().min(0).max(100).optional(),
  url: z.string().trim().url().max(2048)
});
const propertyVisibilitySchema = z.enum(["PUBLIC", "SEGMENTED", "PRIVATE"]);
const propertyCatalogImageSchema = z.object({
  alt: z.string().trim().max(180).optional(),
  isCover: z.boolean().optional(),
  sortOrder: z.coerce.number().int().min(0).max(100).optional(),
  url: z.string().trim().url().max(2048)
});
const propertyProfileSchema = z.object({
  amenities: z.array(z.string().trim().min(1).max(120)).max(24),
  baseNightlyRate: z.coerce.number().positive().max(999999),
  bathrooms: z.coerce.number().min(0).max(99),
  bedrooms: z.coerce.number().int().min(0).max(99),
  bookingNote: z.string().trim().min(8).max(500),
  cleaningFee: z.coerce.number().min(0).max(999999).default(0),
  currency: z.string().trim().min(3).max(3).default("GTQ"),
  destination: z.string().trim().min(2).max(160),
  houseRules: z.array(z.string().trim().min(1).max(120)).max(24),
  images: z.array(propertyCatalogImageSchema).min(1).max(20),
  maxGuests: z.coerce.number().int().min(1).max(99),
  minNights: z.coerce.number().int().min(1).max(60).default(1),
  name: z.string().trim().min(2).max(160),
  neighborhood: z.string().trim().max(160).optional(),
  operations: z.array(z.string().trim().min(1).max(120)).max(24),
  ratePlanName: z.string().trim().min(2).max(120),
  serviceFeeBps: z.coerce.number().int().min(0).max(10000).default(0),
  stayCode: z.string().trim().min(3).max(80),
  stayStyle: z.string().trim().min(2).max(120),
  summary: z.string().trim().min(8).max(700),
  taxBps: z.coerce.number().int().min(0).max(10000).default(0),
  unitName: z.string().trim().min(2).max(120),
  visibility: propertyVisibilitySchema,
  weekendNightlyRate: z.coerce.number().positive().max(999999).optional()
});
const propertyParamsSchema = z.object({
  propertyId: z.string().uuid()
});
const opsReservationParamsSchema = z.object({
  reservationId: z.string().uuid()
});
const opsReservationStatusUpdateSchema = z.object({
  status: z.enum(["CANCELLED", "EXPIRED"])
});
const propertyActivationSchema = z.object({
  baseNightlyRate: z.coerce.number().positive().max(999999),
  bathrooms: z.coerce.number().min(0).max(99),
  bedrooms: z.coerce.number().int().min(0).max(99),
  cleaningFee: z.coerce.number().min(0).max(999999).default(0),
  currency: z.string().trim().min(3).max(3).default("GTQ"),
  maxGuests: z.coerce.number().int().min(1).max(99),
  images: z.array(propertyActivationImageSchema).min(3).max(20),
  minNights: z.coerce.number().int().min(1).max(60).default(1),
  note: z.string().trim().max(700).nullable().optional(),
  ratePlanName: z.string().trim().min(2).max(120).default("Tarifa base"),
  serviceFeeBps: z.coerce.number().int().min(0).max(10000).default(0),
  stayCode: z.string().trim().min(3).max(80),
  taxBps: z.coerce.number().int().min(0).max(10000).default(0),
  unitName: z.string().trim().min(2).max(120),
  weekendNightlyRate: z.coerce.number().positive().max(999999).optional()
});

const statusLabels: Record<ReviewStatus, string> = {
  NEW: "Nuevo",
  REVIEWING: "En revision",
  CONTACTED: "Contactado",
  CLOSED: "Cerrado"
};

const caseStatusLabels: Record<CaseStatus, string> = {
  OPEN: "Abierto",
  QUALIFYING: "Calificando",
  ACTION_PENDING: "Accion pendiente",
  CLOSED: "Cerrado"
};

const taskStatusLabels: Record<TaskStatus, string> = {
  OPEN: "Abierta",
  DONE: "Completada"
};

const housekeepingTaskStatusLabels: Record<HousekeepingTaskStatus, string> = {
  ASSIGNED: "Asignada",
  BLOCKED: "Bloqueada",
  CANCELLED: "Cancelada",
  DONE: "Completada",
  IN_PROGRESS: "En progreso",
  SCHEDULED: "Programada"
};

const maintenanceTicketStatusLabels: Record<MaintenanceTicketStatus, string> = {
  CLOSED: "Cerrado",
  IN_PROGRESS: "En progreso",
  OPEN: "Abierto",
  RESOLVED: "Resuelto",
  SCHEDULED: "Programado",
  TRIAGED: "Priorizado"
};

const maintenanceSeverityLabels = {
  HIGH: "Alta",
  LOW: "Baja",
  MEDIUM: "Media",
  URGENT: "Urgente"
} as const;

const priorityLabels: Record<Priority, string> = {
  high: "Alta",
  normal: "Normal",
  medium: "Media",
  low: "Baja"
};

const propertyOnboardingStatusLabels = {
  DRAFT: "Borrador",
  QUALIFICATION: "Calificacion",
  DOCUMENTS: "Documentos",
  OPERATIONS_READY: "Listo ops",
  CLOSED: "Cerrado"
} as const;

const stayProposalStatusLabels = {
  DRAFT: "Borrador",
  READY_TO_SEND: "Lista para enviar",
  SENT: "Enviada",
  ACCEPTED: "Aceptada",
  DECLINED: "Rechazada",
  VOID: "Anulada"
} as const;

const formalApprovalStatusLabels = {
  DRAFT: "Borrador interno",
  READY_FOR_APPROVAL: "Lista para aprobacion",
  APPROVED: "Aprobada",
  SENT: "Enviada"
} as const;

const formalDeliveryStatusLabels = {
  PENDING: "Pendiente",
  SENT: "Enviada",
  DELIVERED: "Entregada",
  FAILED: "Fallida"
} as const;

const contractStatusLabels = {
  ACTIVE: "Contrato activo",
  DRAFT: "Borrador",
  ISSUED: "Pendiente de firma",
  SIGNED: "Firmado",
  SUPERSEDED: "Reemplazado",
  VOID: "Anulado"
} as const;

const sourceTypeByItemType: Record<WorkbenchItemType, OpsCaseSourceType> = {
  "owner-lead": "OWNER_LEAD",
  "stay-proposal-request": "STAY_PROPOSAL_REQUEST"
};

type ReviewStatus = z.infer<typeof reviewStatusSchema>;
type CaseStatus = z.infer<typeof caseStatusSchema>;
type TaskStatus = z.infer<typeof taskStatusSchema>;
type HousekeepingTaskStatus = z.infer<typeof housekeepingTaskStatusSchema>;
type MaintenanceTicketStatus = z.infer<typeof maintenanceTicketStatusSchema>;
type Priority = z.infer<typeof prioritySchema>;
type OwnerLeadRecord = Awaited<ReturnType<typeof loadOwnerLeads>>[number];
type ProposalRequestRecord = Awaited<ReturnType<typeof loadProposalRequests>>[number];
type HousekeepingTaskRecord = Awaited<ReturnType<typeof loadHousekeepingTasks>>[number];
type MaintenanceTicketRecord = Awaited<ReturnType<typeof loadMaintenanceTickets>>[number];
type WorkbenchItem =
  ReturnType<typeof buildOwnerLeadItem> | ReturnType<typeof buildProposalRequestItem>;
type WorkbenchItemType = "owner-lead" | "stay-proposal-request";
type OpsCaseSourceType = "OWNER_LEAD" | "STAY_PROPOSAL_REQUEST";
type OpsCaseEntityType = "OwnerLead" | "StayProposalRequest";
type FormalTransition = "REQUEST_APPROVAL" | "APPROVE" | "SEND";
type ContractStatus = keyof typeof contractStatusLabels;
type FormalDeliveryChannel = "EMAIL" | "WHATSAPP";
type FormalDeliveryStatus = keyof typeof formalDeliveryStatusLabels;
type PreparedFormalDelivery = {
  acceptedAt: Date | null;
  attemptCount: number;
  channel: FormalDeliveryChannel;
  deliveredAt: Date | null;
  errorCode: string | null;
  errorMessage: string | null;
  failedAt: Date | null;
  id: string;
  lastAttemptAt: Date | null;
  maxAttempts: number;
  nextAttemptAt: Date | null;
  provider: string;
  providerMessageId: string | null;
  recipientHash: string;
  recipientMasked: string;
  recordActivity: boolean;
  recordEntityState: boolean;
  retryable: boolean;
  sentAt: Date | null;
  status: FormalDeliveryStatus;
  subject: string;
  templateKey: string;
  templateVersion: number;
};
type FormalDeliveryRecord = {
  acceptedAt: Date | null;
  attemptCount: number;
  channel: string;
  deliveredAt: Date | null;
  errorCode: string | null;
  errorMessage: string | null;
  failedAt: Date | null;
  id: string;
  lastAttemptAt: Date | null;
  maxAttempts: number;
  nextAttemptAt: Date | null;
  provider: string;
  providerMessageId: string | null;
  recipientHash: string;
  recipientMasked: string;
  sentAt: Date | null;
  status: FormalDeliveryStatus;
  subject: string;
  templateKey: string;
  templateVersion: number;
};
type FormalDeliveryTemplate = {
  body: string[];
  channel: FormalDeliveryChannel;
  recipient: string;
  recipientName: string;
  subject: string;
  templateKey: string;
  templateVersion: number;
};
type OpsCaseSource = {
  contactEmail: string;
  contactName: string;
  contactPhone?: string | null;
  defaultNextStep: string;
  entityType: OpsCaseEntityType;
  item: WorkbenchItem;
  sourceId: string;
  sourceType: OpsCaseSourceType;
  title: string;
};
type OpsCaseWithRelations = Prisma.OpsCaseGetPayload<{
  include: {
    formalActivities: {
      include: {
        actor: {
          select: {
            displayName: true;
            email: true;
            id: true;
          };
        };
      };
    };
    formalDeliveries: {
      include: {
        actor: {
          select: {
            displayName: true;
            email: true;
            id: true;
          };
        };
      };
    };
    notes: {
      include: {
        author: {
          select: {
            displayName: true;
            email: true;
            id: true;
          };
        };
      };
    };
    tasks: true;
    propertyOnboarding: {
      include: {
        assignedUser: {
          select: {
            displayName: true;
            email: true;
            id: true;
          };
        };
        approvedBy: {
          select: {
            displayName: true;
            email: true;
            id: true;
          };
        };
        sentBy: {
          select: {
            displayName: true;
            email: true;
            id: true;
          };
        };
        contract: {
          include: {
            owner: true;
            property: true;
            versions: {
              orderBy: {
                version: "desc";
              };
            };
          };
        };
      };
    };
    stayProposal: {
      include: {
        assignedUser: {
          select: {
            displayName: true;
            email: true;
            id: true;
          };
        };
        approvedBy: {
          select: {
            displayName: true;
            email: true;
            id: true;
          };
        };
        sentBy: {
          select: {
            displayName: true;
            email: true;
            id: true;
          };
        };
        versions: true;
      };
    };
  };
}>;

export const registerOpsRoutes: FastifyPluginAsync = async (app) => {
  app.get("/workbench", async (request, reply) => {
    const authorization = await authorizeOpsRequest({
      action: "ops.workbench.read",
      request,
      requiredPermissions: opsReadPermissions
    });

    if (!authorization.ok) {
      return reply.code(authorization.statusCode).send({
        error: authorization.error,
        correlationId: request.id
      });
    }

    const workbench = await loadOpsWorkbench();

    await writeOpsAudit({
      action: "ops.workbench.read",
      actorUserId: authorization.session.user.id,
      entityType: "OpsWorkbench",
      nextValue: {
        ownerLeadCount: workbench.queues.ownerLeads.length,
        proposalRequestCount: workbench.queues.proposalRequests.length,
        recentAuditCount: workbench.recentAuditEvents.length
      },
      reason: "ops_workbench_loaded",
      request,
      result: "SUCCESS"
    });

    return reply.send({
      workbench,
      correlationId: request.id
    });
  });

  app.get("/properties", async (request, reply) => {
    const authorization = await authorizeOpsRequest({
      action: "ops.properties.read",
      request,
      requiredPermissions: opsReadPermissions
    });

    if (!authorization.ok) {
      return reply.code(authorization.statusCode).send({
        error: authorization.error,
        correlationId: request.id
      });
    }

    const properties = await loadOpsProperties();

    await writeOpsAudit({
      action: "ops.properties.read",
      actorUserId: authorization.session.user.id,
      entityId: "ops-properties",
      entityType: "Property",
      nextValue: { count: properties.length },
      reason: "ops_properties_loaded",
      request,
      result: "SUCCESS"
    });

    return reply.send({
      properties,
      correlationId: request.id
    });
  });

  app.patch("/properties/:propertyId/profile", async (request, reply) => {
    const authorization = await authorizeOpsRequest({
      action: "ops.properties.profile.update",
      request,
      requiredPermissions: opsUpdatePermissions
    });

    if (!authorization.ok) {
      return reply.code(authorization.statusCode).send({
        error: authorization.error,
        correlationId: request.id
      });
    }

    const params = propertyParamsSchema.parse(request.params);
    const body = propertyProfileSchema.parse(request.body);
    const updateResult = await updateOpsPropertyProfile({
      actor: authorization.session,
      body,
      propertyId: params.propertyId,
      request
    });

    if (!updateResult.ok) {
      return reply.code(updateResult.statusCode).send({
        error: updateResult.error,
        correlationId: request.id
      });
    }

    return reply.send({
      property: updateResult.property,
      properties: await loadOpsProperties(),
      correlationId: request.id
    });
  });
  app.get("/reservations", async (request, reply) => {
    const authorization = await authorizeOpsRequest({
      action: "ops.reservations.read",
      request,
      requiredPermissions: opsReadPermissions
    });

    if (!authorization.ok) {
      return reply.code(authorization.statusCode).send({
        error: authorization.error,
        correlationId: request.id
      });
    }

    const reservations = await loadOpsReservationsDashboard();

    await writeOpsAudit({
      action: "ops.reservations.read",
      actorUserId: authorization.session.user.id,
      entityId: "ops-reservations",
      entityType: "OpsReservationsDashboard",
      nextValue: {
        availabilityBlockCount: reservations.availabilityBlocks.length,
        reservationCount: reservations.reservations.length
      },
      reason: "ops_reservations_loaded",
      request,
      result: "SUCCESS"
    });

    return reply.send({
      reservations,
      correlationId: request.id
    });
  });

  app.patch("/reservations/:reservationId/status", async (request, reply) => {
    const authorization = await authorizeOpsRequest({
      action: "ops.reservations.status.update",
      request,
      requiredPermissions: opsUpdatePermissions
    });

    if (!authorization.ok) {
      return reply.code(authorization.statusCode).send({
        error: authorization.error,
        correlationId: request.id
      });
    }

    const params = opsReservationParamsSchema.parse(request.params);
    const body = opsReservationStatusUpdateSchema.parse(request.body);
    const updateResult = await updateOpsReservationStatus({
      actor: authorization.session,
      request,
      reservationId: params.reservationId,
      status: body.status
    });

    if (!updateResult.ok) {
      return reply.code(updateResult.statusCode).send({
        error: updateResult.error,
        correlationId: request.id
      });
    }

    return reply.send({
      reservation: updateResult.reservation,
      reservations: await loadOpsReservationsDashboard(),
      correlationId: request.id
    });
  });
  app.post("/reservations/:reservationId/confirmation-dev", async (request, reply) => {
    const authorization = await authorizeOpsRequest({
      action: "ops.reservations.confirmation_dev.send",
      request,
      requiredPermissions: opsUpdatePermissions
    });

    if (!authorization.ok) {
      return reply.code(authorization.statusCode).send({
        error: authorization.error,
        correlationId: request.id
      });
    }

    const params = opsReservationParamsSchema.parse(request.params);
    const result = await registerOpsReservationConfirmationDev({
      actor: authorization.session,
      request,
      reservationId: params.reservationId
    });

    if (!result.ok) {
      return reply.code(result.statusCode).send({
        error: result.error,
        correlationId: request.id
      });
    }

    return reply.send({
      confirmation: result.confirmation,
      reservation: result.reservation,
      reservations: await loadOpsReservationsDashboard(),
      correlationId: request.id
    });
  });
  app.get("/operations", async (request, reply) => {
    const authorization = await authorizeOpsRequest({
      action: "ops.operations.read",
      request,
      requiredPermissions: opsReadPermissions
    });

    if (!authorization.ok) {
      return reply.code(authorization.statusCode).send({
        error: authorization.error,
        correlationId: request.id
      });
    }

    const operations = await loadOpsOperationsDashboard();

    await writeOpsAudit({
      action: "ops.operations.read",
      actorUserId: authorization.session.user.id,
      entityType: "OpsOperationsDashboard",
      nextValue: {
        housekeepingTaskCount: operations.housekeepingTasks.length,
        maintenanceTicketCount: operations.maintenanceTickets.length
      },
      reason: "ops_operations_loaded",
      request,
      result: "SUCCESS"
    });

    return reply.send({
      operations,
      correlationId: request.id
    });
  });

  app.patch("/operations/housekeeping/:taskId/status", async (request, reply) => {
    const authorization = await authorizeOpsRequest({
      action: "ops.housekeeping.status.update",
      request,
      requiredPermissions: opsUpdatePermissions
    });

    if (!authorization.ok) {
      return reply.code(authorization.statusCode).send({
        error: authorization.error,
        correlationId: request.id
      });
    }

    const params = housekeepingTaskParamsSchema.parse(request.params);
    const body = housekeepingTaskUpdateSchema.parse(request.body);
    const updated = await updateHousekeepingTaskStatus({
      actor: authorization.session,
      note: body.note,
      request,
      status: body.status,
      taskId: params.taskId
    });

    if (!updated) {
      return reply.code(404).send({
        error: "housekeeping_task_not_found",
        correlationId: request.id
      });
    }

    return reply.send({
      operations: await loadOpsOperationsDashboard(),
      correlationId: request.id
    });
  });

  app.patch("/operations/maintenance/:ticketId/status", async (request, reply) => {
    const authorization = await authorizeOpsRequest({
      action: "ops.maintenance.status.update",
      request,
      requiredPermissions: opsUpdatePermissions
    });

    if (!authorization.ok) {
      return reply.code(authorization.statusCode).send({
        error: authorization.error,
        correlationId: request.id
      });
    }

    const params = maintenanceTicketParamsSchema.parse(request.params);
    const body = maintenanceTicketUpdateSchema.parse(request.body);
    const updated = await updateMaintenanceTicketStatus({
      actor: authorization.session,
      note: body.note,
      request,
      status: body.status,
      ticketId: params.ticketId
    });

    if (!updated) {
      return reply.code(404).send({
        error: "maintenance_ticket_not_found",
        correlationId: request.id
      });
    }

    return reply.send({
      operations: await loadOpsOperationsDashboard(),
      correlationId: request.id
    });
  });
  app.get("/workbench/:itemType/:id/case", async (request, reply) => {
    const authorization = await authorizeOpsRequest({
      action: "ops.case.read",
      request,
      requiredPermissions: opsReadPermissions
    });

    if (!authorization.ok) {
      return reply.code(authorization.statusCode).send({
        error: authorization.error,
        correlationId: request.id
      });
    }

    const params = workbenchParamsSchema.parse(request.params);
    const source = await loadOpsCaseSource(params.itemType, params.id);

    if (!source) {
      await writeOpsAudit({
        action: "ops.case.read",
        actorUserId: authorization.session.user.id,
        entityId: params.id,
        entityType: resolveEntityType(params.itemType),
        nextValue: {
          itemType: params.itemType
        },
        reason: "workbench_item_not_found",
        request,
        result: "DENIED"
      });

      return reply.code(404).send({
        error: "workbench_item_not_found",
        correlationId: request.id
      });
    }

    const opsCase = await ensureOpsCaseForSource(source);
    const caseDetail = buildOpsCaseDetail(opsCase, source);

    await writeOpsAudit({
      action: "ops.case.read",
      actorUserId: authorization.session.user.id,
      entityId: opsCase.id,
      entityType: "OpsCase",
      nextValue: {
        itemType: params.itemType,
        noteCount: caseDetail.notes.length,
        openTaskCount: caseDetail.tasks.filter((task) => task.status === "OPEN").length,
        sourceId: params.id
      },
      reason: "ops_case_loaded",
      request,
      result: "SUCCESS"
    });

    return reply.send({
      caseDetail,
      correlationId: request.id
    });
  });

  app.patch("/workbench/:itemType/:id/case", async (request, reply) => {
    const authorization = await authorizeOpsRequest({
      action: "ops.case.update",
      request,
      requiredPermissions: opsUpdatePermissions
    });

    if (!authorization.ok) {
      return reply.code(authorization.statusCode).send({
        error: authorization.error,
        correlationId: request.id
      });
    }

    const params = workbenchParamsSchema.parse(request.params);
    const body = caseUpdateSchema.parse(request.body);
    const updateResult = await updateOpsCase({
      actor: authorization.session,
      body,
      id: params.id,
      itemType: params.itemType,
      request
    });

    if (!updateResult) {
      return reply.code(404).send({
        error: "workbench_item_not_found",
        correlationId: request.id
      });
    }

    return reply.send({
      caseDetail: updateResult.caseDetail,
      correlationId: request.id
    });
  });

  app.post("/workbench/:itemType/:id/case/convert", async (request, reply) => {
    const authorization = await authorizeOpsRequest({
      action: "ops.case.convert",
      request,
      requiredPermissions: opsUpdatePermissions
    });

    if (!authorization.ok) {
      return reply.code(authorization.statusCode).send({
        error: authorization.error,
        correlationId: request.id
      });
    }

    const params = workbenchParamsSchema.parse(request.params);
    const conversionResult = await convertOpsCase({
      actor: authorization.session,
      id: params.id,
      itemType: params.itemType,
      request
    });

    if (!conversionResult) {
      return reply.code(404).send({
        error: "workbench_item_not_found",
        correlationId: request.id
      });
    }

    return reply.code(conversionResult.created ? 201 : 200).send({
      caseDetail: conversionResult.caseDetail,
      conversion: conversionResult.conversion,
      correlationId: request.id
    });
  });

  app.patch("/workbench/:itemType/:id/case/conversion", async (request, reply) => {
    const authorization = await authorizeOpsRequest({
      action: "ops.case.conversion.update",
      request,
      requiredPermissions: opsFormalUpdatePermissions
    });

    if (!authorization.ok) {
      return reply.code(authorization.statusCode).send({
        error: authorization.error,
        correlationId: request.id
      });
    }

    const params = workbenchParamsSchema.parse(request.params);
    const body = conversionUpdateSchema.parse(request.body);
    const updateResult = await updateCaseConversion({
      actor: authorization.session,
      body,
      id: params.id,
      itemType: params.itemType,
      request
    });

    if (!updateResult) {
      return reply.code(404).send({
        error: "case_conversion_not_found",
        correlationId: request.id
      });
    }

    return reply.send({
      caseDetail: updateResult.caseDetail,
      conversion: updateResult.conversion,
      correlationId: request.id
    });
  });

  app.patch("/workbench/:itemType/:id/case/conversion/checklist/:key", async (request, reply) => {
    const authorization = await authorizeOpsRequest({
      action: "ops.case.conversion.checklist.update",
      request,
      requiredPermissions: opsFormalUpdatePermissions
    });

    if (!authorization.ok) {
      return reply.code(authorization.statusCode).send({
        error: authorization.error,
        correlationId: request.id
      });
    }

    const params = caseChecklistParamsSchema.parse(request.params);
    const body = checklistUpdateSchema.parse(request.body);
    const updateResult = await updateOnboardingChecklistItem({
      actor: authorization.session,
      id: params.id,
      itemType: params.itemType,
      key: params.key,
      request,
      status: body.status
    });

    if (!updateResult) {
      return reply.code(404).send({
        error: "checklist_item_not_found",
        correlationId: request.id
      });
    }

    return reply.send({
      caseDetail: updateResult.caseDetail,
      conversion: updateResult.conversion,
      correlationId: request.id
    });
  });

  app.post("/workbench/:itemType/:id/case/conversion/versions", async (request, reply) => {
    const authorization = await authorizeOpsRequest({
      action: "ops.case.conversion.version.create",
      request,
      requiredPermissions: opsFormalUpdatePermissions
    });

    if (!authorization.ok) {
      return reply.code(authorization.statusCode).send({
        error: authorization.error,
        correlationId: request.id
      });
    }

    const params = workbenchParamsSchema.parse(request.params);
    const body = proposalVersionCreateSchema.parse(request.body);
    const createResult = await createStayProposalVersion({
      actor: authorization.session,
      body,
      id: params.id,
      itemType: params.itemType,
      request
    });

    if (!createResult) {
      return reply.code(404).send({
        error: "stay_proposal_not_found",
        correlationId: request.id
      });
    }

    return reply.code(201).send({
      caseDetail: createResult.caseDetail,
      conversion: createResult.conversion,
      correlationId: request.id
    });
  });

  app.post("/workbench/:itemType/:id/case/conversion/activity", async (request, reply) => {
    const authorization = await authorizeOpsRequest({
      action: "ops.case.conversion.activity.create",
      request,
      requiredPermissions: opsFormalUpdatePermissions
    });

    if (!authorization.ok) {
      return reply.code(authorization.statusCode).send({
        error: authorization.error,
        correlationId: request.id
      });
    }

    const params = workbenchParamsSchema.parse(request.params);
    const body = formalActivityCreateSchema.parse(request.body);
    const createResult = await createFormalActivity({
      actor: authorization.session,
      body: body.body,
      id: params.id,
      itemType: params.itemType,
      request
    });

    if (!createResult) {
      return reply.code(404).send({
        error: "case_conversion_not_found",
        correlationId: request.id
      });
    }

    return reply.code(201).send({
      caseDetail: createResult.caseDetail,
      conversion: createResult.conversion,
      correlationId: request.id
    });
  });

  app.post("/workbench/:itemType/:id/case/conversion/approval-request", async (request, reply) => {
    const authorization = await authorizeOpsRequest({
      action: "ops.case.conversion.approval.request",
      request,
      requiredPermissions: opsFormalUpdatePermissions
    });

    if (!authorization.ok) {
      return reply.code(authorization.statusCode).send({
        error: authorization.error,
        correlationId: request.id
      });
    }

    const params = workbenchParamsSchema.parse(request.params);
    const body = formalTransitionSchema.parse(request.body);
    const transitionResult = await updateFormalTransition({
      actor: authorization.session,
      body,
      id: params.id,
      itemType: params.itemType,
      request,
      transition: "REQUEST_APPROVAL"
    });

    if (!transitionResult.ok) {
      return reply.code(transitionResult.statusCode).send({
        error: transitionResult.error,
        correlationId: request.id
      });
    }

    return reply.send({
      caseDetail: transitionResult.caseDetail,
      conversion: transitionResult.conversion,
      correlationId: request.id
    });
  });

  app.post("/workbench/:itemType/:id/case/conversion/approve", async (request, reply) => {
    const authorization = await authorizeOpsRequest({
      action: "ops.case.conversion.approve",
      request,
      requiredPermissions: opsFormalApprovePermissions
    });

    if (!authorization.ok) {
      return reply.code(authorization.statusCode).send({
        error: authorization.error,
        correlationId: request.id
      });
    }

    const params = workbenchParamsSchema.parse(request.params);
    const body = formalTransitionSchema.parse(request.body);
    const transitionResult = await updateFormalTransition({
      actor: authorization.session,
      body,
      id: params.id,
      itemType: params.itemType,
      request,
      transition: "APPROVE"
    });

    if (!transitionResult.ok) {
      return reply.code(transitionResult.statusCode).send({
        error: transitionResult.error,
        correlationId: request.id
      });
    }

    return reply.send({
      caseDetail: transitionResult.caseDetail,
      conversion: transitionResult.conversion,
      correlationId: request.id
    });
  });

  app.post("/workbench/:itemType/:id/case/conversion/send", async (request, reply) => {
    const authorization = await authorizeOpsRequest({
      action: "ops.case.conversion.send",
      request,
      requiredPermissions: opsFormalApprovePermissions
    });

    if (!authorization.ok) {
      return reply.code(authorization.statusCode).send({
        error: authorization.error,
        correlationId: request.id
      });
    }

    const params = workbenchParamsSchema.parse(request.params);
    const body = formalTransitionSchema.parse(request.body);
    const transitionResult = await updateFormalTransition({
      actor: authorization.session,
      body,
      id: params.id,
      itemType: params.itemType,
      request,
      transition: "SEND"
    });

    if (!transitionResult.ok) {
      return reply.code(transitionResult.statusCode).send({
        error: transitionResult.error,
        correlationId: request.id
      });
    }

    return reply.send({
      caseDetail: transitionResult.caseDetail,
      conversion: transitionResult.conversion,
      correlationId: request.id
    });
  });
  app.post("/workbench/:itemType/:id/case/conversion/contract/issue", async (request, reply) => {
    const authorization = await authorizeOpsRequest({
      action: "ops.case.conversion.contract.issue",
      request,
      requiredPermissions: opsFormalApprovePermissions
    });

    if (!authorization.ok) {
      return reply.code(authorization.statusCode).send({
        error: authorization.error,
        correlationId: request.id
      });
    }

    const params = workbenchParamsSchema.parse(request.params);
    const body = contractIssueSchema.parse(request.body);
    const issueResult = await issueOnboardingContract({
      actor: authorization.session,
      body,
      id: params.id,
      itemType: params.itemType,
      request
    });

    if (!issueResult.ok) {
      return reply.code(issueResult.statusCode).send({
        error: issueResult.error,
        correlationId: request.id
      });
    }

    return reply.send({
      caseDetail: issueResult.caseDetail,
      contract: issueResult.contract,
      conversion: issueResult.conversion,
      correlationId: request.id
    });
  });
  app.post("/workbench/:itemType/:id/case/conversion/property/activate", async (request, reply) => {
    const authorization = await authorizeOpsRequest({
      action: "ops.case.conversion.property.activate",
      request,
      requiredPermissions: opsFormalApprovePermissions
    });

    if (!authorization.ok) {
      return reply.code(authorization.statusCode).send({
        error: authorization.error,
        correlationId: request.id
      });
    }

    const params = workbenchParamsSchema.parse(request.params);
    const body = propertyActivationSchema.parse(request.body);
    const activationResult = await activateOnboardingProperty({
      actor: authorization.session,
      body,
      id: params.id,
      itemType: params.itemType,
      request
    });

    if (!activationResult.ok) {
      return reply.code(activationResult.statusCode).send({
        error: activationResult.error,
        correlationId: request.id
      });
    }

    return reply.send({
      activation: activationResult.activation,
      caseDetail: activationResult.caseDetail,
      conversion: activationResult.conversion,
      correlationId: request.id
    });
  });
  app.post("/workbench/:itemType/:id/case/notes", async (request, reply) => {
    const authorization = await authorizeOpsRequest({
      action: "ops.case.note.create",
      request,
      requiredPermissions: opsUpdatePermissions
    });

    if (!authorization.ok) {
      return reply.code(authorization.statusCode).send({
        error: authorization.error,
        correlationId: request.id
      });
    }

    const params = workbenchParamsSchema.parse(request.params);
    const body = noteCreateSchema.parse(request.body);
    const updateResult = await createOpsCaseNote({
      actor: authorization.session,
      body: body.body,
      id: params.id,
      itemType: params.itemType,
      request
    });

    if (!updateResult) {
      return reply.code(404).send({
        error: "workbench_item_not_found",
        correlationId: request.id
      });
    }

    return reply.code(201).send({
      caseDetail: updateResult.caseDetail,
      correlationId: request.id
    });
  });

  app.post("/workbench/:itemType/:id/case/tasks", async (request, reply) => {
    const authorization = await authorizeOpsRequest({
      action: "ops.case.task.create",
      request,
      requiredPermissions: opsUpdatePermissions
    });

    if (!authorization.ok) {
      return reply.code(authorization.statusCode).send({
        error: authorization.error,
        correlationId: request.id
      });
    }

    const params = workbenchParamsSchema.parse(request.params);
    const body = taskCreateSchema.parse(request.body);
    const updateResult = await createOpsCaseTask({
      actor: authorization.session,
      body,
      id: params.id,
      itemType: params.itemType,
      request
    });

    if (!updateResult) {
      return reply.code(404).send({
        error: "workbench_item_not_found",
        correlationId: request.id
      });
    }

    return reply.code(201).send({
      caseDetail: updateResult.caseDetail,
      correlationId: request.id
    });
  });

  app.patch("/workbench/:itemType/:id/case/tasks/:taskId", async (request, reply) => {
    const authorization = await authorizeOpsRequest({
      action: "ops.case.task.update",
      request,
      requiredPermissions: opsUpdatePermissions
    });

    if (!authorization.ok) {
      return reply.code(authorization.statusCode).send({
        error: authorization.error,
        correlationId: request.id
      });
    }

    const params = caseTaskParamsSchema.parse(request.params);
    const body = taskUpdateSchema.parse(request.body);
    const updateResult = await updateOpsCaseTask({
      actor: authorization.session,
      id: params.id,
      itemType: params.itemType,
      request,
      status: body.status,
      taskId: params.taskId
    });

    if (!updateResult) {
      return reply.code(404).send({
        error: "case_task_not_found",
        correlationId: request.id
      });
    }

    return reply.send({
      caseDetail: updateResult.caseDetail,
      correlationId: request.id
    });
  });

  app.patch("/workbench/:itemType/:id/status", async (request, reply) => {
    const authorization = await authorizeOpsRequest({
      action: "ops.workbench.status.update",
      request,
      requiredPermissions: opsUpdatePermissions
    });

    if (!authorization.ok) {
      return reply.code(authorization.statusCode).send({
        error: authorization.error,
        correlationId: request.id
      });
    }

    const params = workbenchParamsSchema.parse(request.params);
    const body = statusUpdateSchema.parse(request.body);
    const updateResult = await updateWorkbenchItemStatus({
      actor: authorization.session,
      id: params.id,
      itemType: params.itemType,
      request,
      status: body.status
    });

    if (!updateResult) {
      await writeOpsAudit({
        action: "ops.workbench.status.update",
        actorUserId: authorization.session.user.id,
        entityId: params.id,
        entityType: resolveEntityType(params.itemType),
        nextValue: {
          attemptedStatus: body.status,
          itemType: params.itemType
        },
        reason: "workbench_item_not_found",
        request,
        result: "DENIED"
      });

      return reply.code(404).send({
        error: "workbench_item_not_found",
        correlationId: request.id
      });
    }

    return reply.send({
      item: updateResult.item,
      correlationId: request.id
    });
  });
};

async function authorizeOpsRequest(input: {
  action: string;
  request: Pick<FastifyRequest, "headers" | "id" | "ip" | "log">;
  requiredPermissions: string[];
}) {
  const rawSessionToken = input.request.headers["x-kuquba-dev-session"]?.toString();
  const authorization = await authorizeDevPortalSession({
    audience: "ops",
    rawSessionToken,
    requiredPermissions: input.requiredPermissions
  });

  if (!authorization.ok) {
    await writeOpsAudit({
      action: input.action,
      entityType: "OpsWorkbench",
      nextValue: {
        requiredPermissions: input.requiredPermissions
      },
      reason: authorization.error,
      request: input.request,
      result: "DENIED"
    });
  }

  return authorization;
}

async function loadOpsWorkbench() {
  const [ownerLeads, proposalRequests, recentAuditEvents] = await Promise.all([
    loadOwnerLeads(),
    loadProposalRequests(),
    prisma.auditEvent.findMany({
      orderBy: {
        createdAt: "desc"
      },
      select: {
        action: true,
        createdAt: true,
        entityId: true,
        entityType: true,
        id: true,
        reason: true,
        result: true
      },
      take: 10,
      where: {
        entityType: {
          in: [
            "OwnerLead",
            "StayProposalRequest",
            "OpsWorkbench",
            "OpsCase",
            "OpsCaseNote",
            "OpsCaseTask",
            "PropertyOnboarding",
            "StayProposal",
            "StayProposalVersion",
            "OpsFormalActivity",
            "OpsOperationsDashboard",
            "HousekeepingTask",
            "MaintenanceTicket"
          ]
        }
      }
    })
  ]);

  const ownerLeadItems = ownerLeads.map(buildOwnerLeadItem);
  const proposalRequestItems = proposalRequests.map(buildProposalRequestItem);
  const pendingCount = [...ownerLeadItems, ...proposalRequestItems].filter(
    (item) => item.status === "NEW" || item.status === "REVIEWING"
  ).length;

  return {
    generatedAt: new Date().toISOString(),
    statusOptions: reviewStatusSchema.options.map((status) => ({
      label: statusLabels[status],
      value: status
    })),
    metrics: [
      {
        hint: `${ownerLeadItems.filter((item) => item.status === "NEW").length} nuevo(s)`,
        label: "Leads propietario",
        value: `${ownerLeadItems.length}`
      },
      {
        hint: `${proposalRequestItems.filter((item) => item.status === "NEW").length} nuevo(s)`,
        label: "Solicitudes estancia",
        value: `${proposalRequestItems.length}`
      },
      {
        hint: "Nuevos o en revision",
        label: "Pendientes",
        value: `${pendingCount}`
      },
      {
        hint: "Eventos recientes",
        label: "Auditoria",
        value: `${recentAuditEvents.length}`
      }
    ],
    queues: {
      ownerLeads: ownerLeadItems,
      proposalRequests: proposalRequestItems
    },
    recentAuditEvents: recentAuditEvents.map((event) => ({
      action: event.action,
      createdAt: event.createdAt.toISOString(),
      entityId: event.entityId,
      entityType: event.entityType,
      id: event.id,
      reason: event.reason,
      result: event.result
    }))
  };
}

function loadOwnerLeads() {
  return prisma.ownerLead.findMany({
    orderBy: [
      {
        status: "asc"
      },
      {
        createdAt: "desc"
      }
    ],
    take: 30
  });
}

function loadProposalRequests() {
  return prisma.stayProposalRequest.findMany({
    orderBy: [
      {
        status: "asc"
      },
      {
        createdAt: "desc"
      }
    ],
    take: 30
  });
}

async function loadOpsReservationsDashboard() {
  const now = new Date();
  const [reservations, availabilityBlocks, reservationAuditEvents] = await Promise.all([
    prisma.reservation.findMany({
      include: {
        guest: true,
        payments: { orderBy: { createdAt: "desc" }, take: 1 },
        property: true,
        unit: true
      },
      orderBy: [{ arrivalDate: "asc" }, { createdAt: "desc" }],
      take: 80
    }),
    prisma.availabilityBlock.findMany({
      include: {
        property: true,
        unit: true
      },
      orderBy: [{ startsOn: "asc" }, { createdAt: "desc" }],
      take: 80,
      where: {
        endsOn: {
          gte: now
        }
      }
    }),
    prisma.auditEvent.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        action: true,
        createdAt: true,
        entityId: true,
        id: true,
        reason: true,
        result: true
      },
      take: 240,
      where: {
        entityType: "Reservation"
      }
    })
  ]);
  const auditEventsByReservation = groupReservationAuditEvents(reservationAuditEvents);
  const mappedReservations = reservations.map((reservation) => mapOpsReservation(reservation, auditEventsByReservation.get(reservation.id) ?? []));
  const mappedBlocks = availabilityBlocks.map(mapOpsAvailabilityBlock);
  const activeHoldCount = mappedReservations.filter((reservation) => reservation.status === "HOLD" && !reservation.isExpiredHold).length;
  const confirmedCount = mappedReservations.filter((reservation) => reservation.status === "CONFIRMED").length;
  const pendingPaymentCount = mappedReservations.filter((reservation) => reservation.status === "PENDING_PAYMENT").length;
  const blockedDateCount = mappedBlocks.length + mappedReservations.filter((reservation) => ["HOLD", "PENDING_PAYMENT", "CONFIRMED"].includes(reservation.status)).length;

  return {
    availabilityBlocks: mappedBlocks,
    generatedAt: now.toISOString(),
    metrics: [
      { hint: "Reservas pagadas y activas", label: "Confirmadas", value: `${confirmedCount}` },
      { hint: "Holds aun vigentes", label: "Holds activos", value: `${activeHoldCount}` },
      { hint: "Checkout abierto sin cierre", label: "Pendientes pago", value: `${pendingPaymentCount}` },
      { hint: "Reservas o bloqueos futuros", label: "Fechas bloqueadas", value: `${blockedDateCount}` }
    ],
    reservationStatusOptions: opsReservationStatusSchema.options.map((status) => ({
      label: opsReservationStatusLabels[status],
      value: status
    })),
    reservations: mappedReservations
  };
}

type OpsReservationRecord = Awaited<ReturnType<typeof prisma.reservation.findMany>>[number] & {
  guest: { email: string; fullName: string; phone: string | null };
  payments: Array<{
    amount: { toString(): string };
    confirmedAt: Date | null;
    currency: string;
    expiresAt: Date | null;
    failedAt: Date | null;
    id: string;
    provider: string;
    providerRef: string;
    status: string;
  }>;
  property: { destination: string; id: string; name: string };
  unit: { id: string; name: string };
};

type OpsAvailabilityBlockRecord = Awaited<ReturnType<typeof prisma.availabilityBlock.findMany>>[number] & {
  property: { destination: string; id: string; name: string };
  unit: { id: string; name: string };
};

type OpsReservationAuditEvent = {
  action: string;
  createdAt: Date;
  entityId: string | null;
  id: string;
  reason: string | null;
  result: string;
};

function groupReservationAuditEvents(events: OpsReservationAuditEvent[]) {
  const grouped = new Map<string, OpsReservationAuditEvent[]>();

  for (const event of events) {
    if (!event.entityId) {
      continue;
    }

    const current = grouped.get(event.entityId) ?? [];
    if (current.length < 8) {
      grouped.set(event.entityId, [...current, event]);
    }
  }

  return grouped;
}

function mapOpsReservation(reservation: OpsReservationRecord, auditEvents: OpsReservationAuditEvent[] = []) {
  const payment = reservation.payments[0] ?? null;

  return {
    arrivalDate: toDateOnly(reservation.arrivalDate),
    canCancel: ["HOLD", "PENDING_PAYMENT", "CONFIRMED"].includes(reservation.status),
    auditEvents: auditEvents.map((event) => ({
      action: event.action,
      createdAt: event.createdAt.toISOString(),
      id: event.id,
      reason: event.reason,
      result: event.result
    })),
    canExpire: ["HOLD", "PENDING_PAYMENT"].includes(reservation.status),
    createdAt: reservation.createdAt.toISOString(),
    currency: reservation.currency ?? payment?.currency ?? "GTQ",
    departureDate: toDateOnly(reservation.departureDate),
    guest: {
      email: reservation.guest.email,
      fullName: reservation.guest.fullName,
      phone: reservation.guest.phone
    },
    holdExpiresAt: reservation.holdExpiresAt?.toISOString() ?? null,
    id: reservation.id,
    isExpiredHold: Boolean(reservation.holdExpiresAt && reservation.holdExpiresAt.getTime() <= Date.now() && ["HOLD", "PENDING_PAYMENT"].includes(reservation.status)),
    nights: differenceInNights(reservation.arrivalDate, reservation.departureDate),
    payment: payment
      ? {
          amount: payment.amount.toString(),
          confirmedAt: payment.confirmedAt?.toISOString() ?? null,
          currency: payment.currency,
          expiresAt: payment.expiresAt?.toISOString() ?? null,
          failedAt: payment.failedAt?.toISOString() ?? null,
          id: payment.id,
          provider: payment.provider,
          providerRef: payment.providerRef,
          status: payment.status,
          statusLabel: paymentStatusLabels[payment.status] ?? payment.status
        }
      : null,
    privateCode: reservation.privateCode,
    property: {
      destination: reservation.property.destination,
      id: reservation.property.id,
      name: reservation.property.name
    },
    status: reservation.status,
    statusLabel: opsReservationStatusLabels[reservation.status] ?? reservation.status,
    total: reservation.total?.toString() ?? "0.00",
    unit: {
      id: reservation.unit.id,
      name: reservation.unit.name
    },
    updatedAt: reservation.updatedAt.toISOString()
  };
}

function mapOpsAvailabilityBlock(block: OpsAvailabilityBlockRecord) {
  return {
    endsOn: toDateOnly(block.endsOn),
    id: block.id,
    note: block.note,
    property: {
      destination: block.property.destination,
      id: block.property.id,
      name: block.property.name
    },
    reason: block.reason,
    reasonLabel: availabilityBlockReasonLabels[block.reason] ?? block.reason,
    startsOn: toDateOnly(block.startsOn),
    unit: {
      id: block.unit.id,
      name: block.unit.name
    },
    updatedAt: block.updatedAt.toISOString()
  };
}

async function updateOpsReservationStatus(input: {
  actor: AuthorizedDevPortalSession;
  request: Pick<FastifyRequest, "id" | "ip" | "log">;
  reservationId: string;
  status: "CANCELLED" | "EXPIRED";
}): Promise<
  | { ok: true; reservation: ReturnType<typeof mapOpsReservation> }
  | { ok: false; error: string; statusCode: 404 | 409 }
> {
  const existing = await prisma.reservation.findUnique({
    include: {
      guest: true,
      payments: { orderBy: { createdAt: "desc" }, take: 1 },
      property: true,
      unit: true
    },
    where: { id: input.reservationId }
  });

  if (!existing) {
    return { ok: false, error: "reservation_not_found", statusCode: 404 };
  }

  if (input.status === "EXPIRED" && !["HOLD", "PENDING_PAYMENT"].includes(existing.status)) {
    return { ok: false, error: "reservation_cannot_be_expired", statusCode: 409 };
  }

  if (input.status === "CANCELLED" && !["HOLD", "PENDING_PAYMENT", "CONFIRMED"].includes(existing.status)) {
    return { ok: false, error: "reservation_cannot_be_cancelled", statusCode: 409 };
  }

  const updated = await prisma.reservation.update({
    data: {
      confirmationSource: input.status === "EXPIRED" ? "ops_manual_release" : "ops_manual_cancel",
      holdExpiresAt: null,
      status: input.status
    },
    include: {
      guest: true,
      payments: { orderBy: { createdAt: "desc" }, take: 1 },
      property: true,
      unit: true
    },
    where: { id: input.reservationId }
  });

  await writeOpsAudit({
    action: "ops.reservations.status.update",
    actorUserId: input.actor.user.id,
    entityId: input.reservationId,
    entityType: "Reservation",
    nextValue: {
      previousStatus: existing.status,
      privateCode: existing.privateCode,
      status: input.status
    },
    reason: input.status === "EXPIRED" ? "ops_hold_released" : "ops_reservation_cancelled",
    request: input.request,
    result: "SUCCESS"
  });

  return { ok: true, reservation: mapOpsReservation(updated) };
}
async function registerOpsReservationConfirmationDev(input: {
  actor: AuthorizedDevPortalSession;
  request: Pick<FastifyRequest, "id" | "ip" | "log">;
  reservationId: string;
}): Promise<
  | { ok: true; confirmation: { channel: "dev"; status: "RECORDED"; targetMasked: string }; reservation: ReturnType<typeof mapOpsReservation> }
  | { ok: false; error: string; statusCode: 404 | 409 }
> {
  const reservation = await prisma.reservation.findUnique({
    include: {
      guest: true,
      payments: { orderBy: { createdAt: "desc" }, take: 1 },
      property: true,
      unit: true
    },
    where: { id: input.reservationId }
  });

  if (!reservation) {
    return { ok: false, error: "reservation_not_found", statusCode: 404 };
  }

  if (reservation.status !== "CONFIRMED") {
    return { ok: false, error: "reservation_confirmation_requires_confirmed_status", statusCode: 409 };
  }

  const targetMasked = maskOpsReservationEmail(reservation.guest.email);

  await writeOpsAudit({
    action: "ops.reservations.confirmation_dev.send",
    actorUserId: input.actor.user.id,
    entityId: input.reservationId,
    entityType: "Reservation",
    nextValue: {
      channel: "dev",
      privateCode: reservation.privateCode,
      targetMasked
    },
    reason: "dev_confirmation_recorded_no_external_provider",
    request: input.request,
    result: "SUCCESS"
  });

  const auditEvents = await prisma.auditEvent.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      action: true,
      createdAt: true,
      entityId: true,
      id: true,
      reason: true,
      result: true
    },
    take: 8,
    where: {
      entityId: input.reservationId,
      entityType: "Reservation"
    }
  });

  return {
    ok: true,
    confirmation: { channel: "dev", status: "RECORDED", targetMasked },
    reservation: mapOpsReservation(reservation, auditEvents)
  };
}

function maskOpsReservationEmail(email: string) {
  const [localPart = "", domain = ""] = email.split("@");
  const prefix = localPart.slice(0, 2) || "**";
  return `${prefix}***@${domain || "masked"}`;
}
async function loadOpsProperties() {
  const properties = await prisma.property.findMany({
    include: {
      contracts: { orderBy: { createdAt: "desc" }, take: 1 },
      images: { orderBy: [{ isCover: "desc" }, { sortOrder: "asc" }, { createdAt: "asc" }] },
      ratePlans: { where: { active: true }, orderBy: [{ startsOn: "desc" }, { createdAt: "desc" }] },
      stayCodes: { orderBy: { createdAt: "desc" } },
      units: { orderBy: { createdAt: "asc" } }
    },
    orderBy: { updatedAt: "desc" }
  });
  const profileMap = await loadPropertyCatalogProfileMap(properties.map((property) => property.id));

  return properties.map((property) => mapOpsPropertyEditor(property, profileMap.get(property.id)));
}

type OpsPropertyRecord = Awaited<ReturnType<typeof prisma.property.findMany>>[number];
type PropertyCatalogProfile = {
  amenities: Prisma.JsonValue | null;
  bookingNote: string | null;
  houseRules: Prisma.JsonValue | null;
  id: string;
  neighborhood: string | null;
  operations: Prisma.JsonValue | null;
  stayStyle: string | null;
  summary: string | null;
};

async function loadPropertyCatalogProfileMap(propertyIds: string[]) {
  if (propertyIds.length === 0) {
    return new Map<string, PropertyCatalogProfile>();
  }

  const rows = await prisma.$queryRaw<PropertyCatalogProfile[]>`
    SELECT id, amenities, "bookingNote", "houseRules", neighborhood, operations, "stayStyle", summary
    FROM "Property"
    WHERE id IN (${Prisma.join(propertyIds)})
  `;

  return new Map(rows.map((row) => [row.id, row]));
}

function mapOpsPropertyEditor(property: OpsPropertyRecord & {
  contracts: Array<{ status: string }>;
  images: Array<{ alt: string | null; id: string; isCover: boolean; sortOrder: number; url: string }>;
  ratePlans: Array<{
    baseNightlyRate: { toString(): string };
    cleaningFee: { toString(): string };
    currency: string;
    id: string;
    minNights: number;
    name: string;
    serviceFeeBps: number;
    taxBps: number;
    unitId: string;
    weekendNightlyRate: { toString(): string } | null;
  }>;
  stayCodes: Array<{ active: boolean; code: string; id: string; unitId: string | null }>;
  units: Array<{ bathrooms: { toString(): string }; bedrooms: number; id: string; maxGuests: number; name: string }>;
}, catalogProperty?: PropertyCatalogProfile) {
  const unit = property.units[0] ?? null;
  const ratePlan = unit
    ? property.ratePlans.find((plan) => plan.unitId === unit.id) ?? property.ratePlans[0] ?? null
    : property.ratePlans[0] ?? null;
  const stayCode = unit
    ? property.stayCodes.find((code) => code.unitId === unit.id && code.active) ?? property.stayCodes[0] ?? null
    : property.stayCodes[0] ?? null;
  const contract = property.contracts[0] ?? null;

  return {
    amenities: parseStringList(catalogProperty?.amenities ?? null, ["Limpieza coordinada", "Soporte local"]),
    bathrooms: unit ? Number(unit.bathrooms.toString()) : 1,
    bedrooms: unit?.bedrooms ?? 1,
    bookingNote: catalogProperty?.bookingNote ?? "Disponibilidad, tarifa y bloqueo temporal se validan antes de pago.",
    baseNightlyRate: ratePlan?.baseNightlyRate.toString() ?? "1200",
    cleaningFee: ratePlan?.cleaningFee.toString() ?? "0",
    contractStatus: contract?.status ?? "NONE",
    coverImageUrl: property.images.find((image) => image.isCover)?.url ?? property.images[0]?.url ?? "",
    currency: ratePlan?.currency ?? "GTQ",
    destination: property.destination,
    houseRules: parseStringList(catalogProperty?.houseRules ?? null, ["Llegada coordinada", "Ocupacion segun reserva"]),
    id: property.id,
    images: property.images.map((image) => ({
      alt: image.alt ?? "",
      id: image.id,
      isCover: image.isCover,
      sortOrder: image.sortOrder,
      url: image.url
    })),
    maxGuests: unit?.maxGuests ?? 2,
    minNights: ratePlan?.minNights ?? 1,
    name: property.name,
    neighborhood: catalogProperty?.neighborhood ?? property.destination,
    operations: parseStringList(catalogProperty?.operations ?? null, ["Preparacion previa", "Soporte local", "Revision de salida"]),
    ratePlanName: ratePlan?.name ?? "Tarifa base",
    serviceFeeBps: ratePlan?.serviceFeeBps ?? 0,
    stayCode: stayCode?.code ?? "",
    stayStyle: catalogProperty?.stayStyle ?? unit?.name ?? "Estancia KUQUBA",
    summary: catalogProperty?.summary ?? buildOpsPropertyDefaultSummary(property.name, property.destination),
    taxBps: ratePlan?.taxBps ?? 0,
    unitName: unit?.name ?? "Casa completa",
    updatedAt: property.updatedAt.toISOString(),
    visibility: property.visibility,
    weekendNightlyRate: ratePlan?.weekendNightlyRate?.toString() ?? ""
  };
}

async function updateOpsPropertyProfile(input: {
  actor: AuthorizedDevPortalSession;
  body: z.infer<typeof propertyProfileSchema>;
  propertyId: string;
  request: Pick<FastifyRequest, "id" | "ip" | "log">;
}): Promise<
  | { ok: true; property: ReturnType<typeof mapOpsPropertyEditor> }
  | { ok: false; error: string; statusCode: 404 | 409 }
> {
  const existing = await prisma.property.findUnique({
    include: {
      images: true,
      ratePlans: { where: { active: true }, orderBy: [{ startsOn: "desc" }, { createdAt: "desc" }] },
      stayCodes: true,
      units: { orderBy: { createdAt: "asc" } }
    },
    where: { id: input.propertyId }
  });

  if (!existing) {
    return { ok: false, error: "property_not_found", statusCode: 404 };
  }

  const stayCode = normalizeStayCode(input.body.stayCode);
  if (!stayCode) {
    return { ok: false, error: "stay_code_invalid", statusCode: 409 };
  }

  const images = normalizePropertyCatalogImages(input.body.images, input.body.name);
  if (input.body.visibility === "PUBLIC" && images.length < 3) {
    return { ok: false, error: "property_images_minimum_required", statusCode: 409 };
  }

  const conflictingStayCode = await prisma.stayCode.findUnique({
    select: { propertyId: true },
    where: { code: stayCode }
  });
  if (conflictingStayCode && conflictingStayCode.propertyId !== input.propertyId) {
    return { ok: false, error: "stay_code_already_in_use", statusCode: 409 };
  }

  const unitId = existing.units[0]?.id;
  const ratePlanId = unitId
    ? existing.ratePlans.find((plan) => plan.unitId === unitId)?.id ?? existing.ratePlans[0]?.id
    : existing.ratePlans[0]?.id;
  const rateData = {
    active: true,
    baseNightlyRate: input.body.baseNightlyRate.toString(),
    cleaningFee: input.body.cleaningFee.toString(),
    currency: input.body.currency.toUpperCase(),
    minNights: input.body.minNights,
    name: input.body.ratePlanName,
    serviceFeeBps: input.body.serviceFeeBps,
    taxBps: input.body.taxBps,
    weekendNightlyRate: input.body.weekendNightlyRate?.toString() ?? null
  };

  const amenitiesJson = JSON.stringify(input.body.amenities);
  const houseRulesJson = JSON.stringify(input.body.houseRules);
  const operationsJson = JSON.stringify(input.body.operations);

  const updated = await prisma.$transaction(async (tx) => {
    const property = await tx.property.update({
      data: {
        destination: input.body.destination,
        name: input.body.name,
        visibility: input.body.visibility
      },
      where: { id: input.propertyId }
    });
    await tx.$executeRaw`
      UPDATE "Property"
      SET
        amenities = ${amenitiesJson}::jsonb,
        "bookingNote" = ${input.body.bookingNote},
        "houseRules" = ${houseRulesJson}::jsonb,
        neighborhood = ${normalizeNullableText(input.body.neighborhood)},
        operations = ${operationsJson}::jsonb,
        "stayStyle" = ${input.body.stayStyle},
        summary = ${input.body.summary}
      WHERE id = ${input.propertyId}
    `;
    const unit = unitId
      ? await tx.unit.update({
          data: {
            bathrooms: input.body.bathrooms.toString(),
            bedrooms: input.body.bedrooms,
            maxGuests: input.body.maxGuests,
            name: input.body.unitName
          },
          where: { id: unitId }
        })
      : await tx.unit.create({
          data: {
            bathrooms: input.body.bathrooms.toString(),
            bedrooms: input.body.bedrooms,
            maxGuests: input.body.maxGuests,
            name: input.body.unitName,
            propertyId: input.propertyId
          }
        });

    if (ratePlanId) {
      await tx.ratePlan.update({ data: rateData, where: { id: ratePlanId } });
    } else {
      await tx.ratePlan.create({ data: { ...rateData, propertyId: input.propertyId, unitId: unit.id } });
    }

    await tx.stayCode.upsert({
      create: { active: true, code: stayCode, propertyId: input.propertyId, unitId: unit.id },
      update: { active: true, propertyId: input.propertyId, unitId: unit.id },
      where: { code: stayCode }
    });
    await tx.propertyImage.deleteMany({ where: { propertyId: input.propertyId } });
    await tx.propertyImage.createMany({
      data: images.map((image) => ({
        alt: image.alt,
        isCover: image.isCover,
        propertyId: input.propertyId,
        sortOrder: image.sortOrder,
        url: image.url
      }))
    });

    return property;
  });

  const mapped = (await loadOpsProperties()).find((property) => property.id === updated.id);

  if (!mapped) {
    return { ok: false, error: "property_not_found", statusCode: 404 };
  }

  await writeOpsAudit({
    action: "ops.properties.profile.update",
    actorUserId: input.actor.user.id,
    entityId: input.propertyId,
    entityType: "Property",
    nextValue: {
      imageCount: images.length,
      name: input.body.name,
      stayCode,
      visibility: input.body.visibility
    },
    reason: "property_catalog_profile_updated",
    request: input.request,
    result: "SUCCESS"
  });

  return { ok: true, property: mapped };
}

function normalizePropertyCatalogImages(
  images: z.infer<typeof propertyProfileSchema>["images"],
  propertyName: string
) {
  return normalizePropertyActivationImages(images, propertyName);
}

function parseStringList(value: Prisma.JsonValue | null, fallback: string[]) {
  if (!Array.isArray(value)) {
    return fallback;
  }

  const list = value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
  return list.length > 0 ? list : fallback;
}

function buildOpsPropertyDefaultSummary(name: string, destination: string) {
  return `${name} en ${destination}, administrada por KUQUBA con disponibilidad y tarifa verificadas antes del pago.`;
}
async function loadOpsOperationsDashboard() {
  const [housekeepingTasks, maintenanceTickets] = await Promise.all([
    loadHousekeepingTasks(),
    loadMaintenanceTickets()
  ]);
  const activeHousekeepingCount = housekeepingTasks.filter((task) =>
    isActiveHousekeepingStatus(task.status)
  ).length;
  const blockedHousekeepingCount = housekeepingTasks.filter(
    (task) => task.status === "BLOCKED"
  ).length;
  const activeMaintenanceCount = maintenanceTickets.filter((ticket) =>
    isActiveMaintenanceStatus(ticket.status)
  ).length;
  const priorityMaintenanceCount = maintenanceTickets.filter(
    (ticket) =>
      isActiveMaintenanceStatus(ticket.status) &&
      (ticket.severity === "HIGH" || ticket.severity === "URGENT")
  ).length;

  return {
    generatedAt: new Date().toISOString(),
    housekeepingStatusOptions: housekeepingTaskStatusSchema.options.map((status) => ({
      label: housekeepingTaskStatusLabels[status],
      value: status
    })),
    maintenanceStatusOptions: maintenanceTicketStatusSchema.options.map((status) => ({
      label: maintenanceTicketStatusLabels[status],
      value: status
    })),
    metrics: [
      {
        hint: `${blockedHousekeepingCount} bloqueada(s)`,
        label: "Limpiezas activas",
        value: `${activeHousekeepingCount}`
      },
      {
        hint: "Tickets abiertos",
        label: "Mantenimiento",
        value: `${activeMaintenanceCount}`
      },
      {
        hint: "Alta o urgente",
        label: "Prioridad tecnica",
        value: `${priorityMaintenanceCount}`
      }
    ],
    housekeepingTasks: housekeepingTasks.map(buildHousekeepingTaskItem),
    maintenanceTickets: maintenanceTickets.map(buildMaintenanceTicketItem)
  };
}

function loadHousekeepingTasks() {
  return prisma.housekeepingTask.findMany({
    include: {
      property: {
        select: {
          destination: true,
          id: true,
          name: true
        }
      },
      reservation: {
        select: {
          arrivalDate: true,
          departureDate: true,
          id: true,
          privateCode: true,
          status: true
        }
      },
      unit: {
        select: {
          id: true,
          name: true
        }
      }
    },
    orderBy: [
      {
        serviceDate: "asc"
      },
      {
        updatedAt: "desc"
      }
    ],
    take: 30
  });
}

function loadMaintenanceTickets() {
  return prisma.maintenanceTicket.findMany({
    include: {
      property: {
        select: {
          destination: true,
          id: true,
          name: true
        }
      },
      unit: {
        select: {
          id: true,
          name: true
        }
      }
    },
    orderBy: [
      {
        status: "asc"
      },
      {
        dueAt: "asc"
      },
      {
        reportedAt: "desc"
      }
    ],
    take: 30
  });
}

async function updateHousekeepingTaskStatus(input: {
  actor: AuthorizedDevPortalSession;
  note?: string | null;
  request: Pick<FastifyRequest, "id" | "ip" | "log">;
  status: HousekeepingTaskStatus;
  taskId: string;
}) {
  const previous = await prisma.housekeepingTask.findUnique({
    where: {
      id: input.taskId
    }
  });

  if (!previous) {
    await writeOpsAudit({
      action: "ops.housekeeping.status.update",
      actorUserId: input.actor.user.id,
      entityId: input.taskId,
      entityType: "HousekeepingTask",
      nextValue: {
        attemptedStatus: input.status
      },
      reason: "housekeeping_task_not_found",
      request: input.request,
      result: "DENIED"
    });

    return null;
  }

  const hasNote = Object.prototype.hasOwnProperty.call(input, "note");
  const nextNote = hasNote ? normalizeNullableText(input.note) : previous.notes;
  const updated = await prisma.housekeepingTask.update({
    data: {
      blockedReason:
        input.status === "BLOCKED"
          ? nextNote ?? previous.blockedReason ?? "Bloqueada por ops"
          : null,
      completedAt: input.status === "DONE" ? new Date() : null,
      notes: nextNote,
      status: input.status
    },
    where: {
      id: previous.id
    }
  });

  await writeOpsAudit({
    action: "ops.housekeeping.status.update",
    actorUserId: input.actor.user.id,
    entityId: updated.id,
    entityType: "HousekeepingTask",
    nextValue: {
      blockedReason: updated.blockedReason,
      completedAt: formatDateOnly(updated.completedAt),
      status: updated.status
    },
    previousValue: {
      blockedReason: previous.blockedReason,
      completedAt: formatDateOnly(previous.completedAt),
      status: previous.status
    },
    reason: "housekeeping_status_updated",
    request: input.request,
    result: "SUCCESS"
  });

  return updated;
}

async function updateMaintenanceTicketStatus(input: {
  actor: AuthorizedDevPortalSession;
  note?: string | null;
  request: Pick<FastifyRequest, "id" | "ip" | "log">;
  status: MaintenanceTicketStatus;
  ticketId: string;
}) {
  const previous = await prisma.maintenanceTicket.findUnique({
    where: {
      id: input.ticketId
    }
  });

  if (!previous) {
    await writeOpsAudit({
      action: "ops.maintenance.status.update",
      actorUserId: input.actor.user.id,
      entityId: input.ticketId,
      entityType: "MaintenanceTicket",
      nextValue: {
        attemptedStatus: input.status
      },
      reason: "maintenance_ticket_not_found",
      request: input.request,
      result: "DENIED"
    });

    return null;
  }

  const hasNote = Object.prototype.hasOwnProperty.call(input, "note");
  const nextResolutionNotes = hasNote
    ? normalizeNullableText(input.note)
    : previous.resolutionNotes;
  const closesTicket = input.status === "RESOLVED" || input.status === "CLOSED";
  const updated = await prisma.maintenanceTicket.update({
    data: {
      completedAt: closesTicket ? new Date() : null,
      resolutionNotes: closesTicket ? nextResolutionNotes : previous.resolutionNotes,
      status: input.status
    },
    where: {
      id: previous.id
    }
  });

  await writeOpsAudit({
    action: "ops.maintenance.status.update",
    actorUserId: input.actor.user.id,
    entityId: updated.id,
    entityType: "MaintenanceTicket",
    nextValue: {
      completedAt: formatDateOnly(updated.completedAt),
      resolutionNotes: updated.resolutionNotes,
      status: updated.status
    },
    previousValue: {
      completedAt: formatDateOnly(previous.completedAt),
      resolutionNotes: previous.resolutionNotes,
      status: previous.status
    },
    reason: "maintenance_status_updated",
    request: input.request,
    result: "SUCCESS"
  });

  return updated;
}

function buildHousekeepingTaskItem(task: HousekeepingTaskRecord) {
  return {
    assigneeName: task.assigneeName,
    blockedReason: task.blockedReason,
    checklist: readChecklistItems(task.checklist),
    completedAt: task.completedAt?.toISOString() ?? null,
    id: task.id,
    notes: task.notes,
    priority: task.priority,
    priorityLabel: buildPriorityLabel(task.priority),
    property: {
      destination: task.property.destination,
      id: task.property.id,
      name: task.property.name
    },
    reservation: task.reservation
      ? {
          arrivalDate: task.reservation.arrivalDate.toISOString(),
          departureDate: task.reservation.departureDate.toISOString(),
          id: task.reservation.id,
          privateCode: task.reservation.privateCode,
          status: task.reservation.status
        }
      : null,
    serviceDate: task.serviceDate.toISOString(),
    serviceWindow: task.serviceWindow,
    status: task.status,
    statusLabel: housekeepingTaskStatusLabels[task.status],
    title: task.title,
    unit: task.unit
      ? {
          id: task.unit.id,
          name: task.unit.name
        }
      : null,
    updatedAt: task.updatedAt.toISOString(),
    vendorName: task.vendorName
  };
}

function buildMaintenanceTicketItem(ticket: MaintenanceTicketRecord) {
  return {
    assigneeName: ticket.assigneeName,
    category: ticket.category,
    completedAt: ticket.completedAt?.toISOString() ?? null,
    description: ticket.description,
    dueAt: ticket.dueAt?.toISOString() ?? null,
    id: ticket.id,
    property: {
      destination: ticket.property.destination,
      id: ticket.property.id,
      name: ticket.property.name
    },
    reportedAt: ticket.reportedAt.toISOString(),
    resolutionNotes: ticket.resolutionNotes,
    severity: ticket.severity,
    severityLabel: maintenanceSeverityLabels[ticket.severity],
    status: ticket.status,
    statusLabel: maintenanceTicketStatusLabels[ticket.status],
    title: ticket.title,
    unit: ticket.unit
      ? {
          id: ticket.unit.id,
          name: ticket.unit.name
        }
      : null,
    updatedAt: ticket.updatedAt.toISOString(),
    vendorName: ticket.vendorName
  };
}

function readChecklistItems(value: Prisma.JsonValue) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string").slice(0, 8);
}

function isActiveHousekeepingStatus(status: HousekeepingTaskStatus) {
  return status !== "DONE" && status !== "CANCELLED";
}

function isActiveMaintenanceStatus(status: MaintenanceTicketStatus) {
  return status !== "RESOLVED" && status !== "CLOSED";
}

function buildPriorityLabel(priority: string) {
  if (priority === "high") {
    return "Alta";
  }

  if (priority === "medium") {
    return "Media";
  }

  if (priority === "low") {
    return "Baja";
  }

  return priorityLabels.normal;
}
async function updateWorkbenchItemStatus(input: {
  actor: AuthorizedDevPortalSession;
  id: string;
  itemType: WorkbenchItemType;
  request: Pick<FastifyRequest, "id" | "ip" | "log">;
  status: ReviewStatus;
}) {
  if (input.itemType === "owner-lead") {
    const previous = await prisma.ownerLead.findUnique({
      where: {
        id: input.id
      }
    });

    if (!previous) {
      return null;
    }

    const updated = await prisma.ownerLead.update({
      data: {
        status: input.status
      },
      where: {
        id: input.id
      }
    });

    await writeOpsAudit({
      action: "ops.owner_lead.status.update",
      actorUserId: input.actor.user.id,
      entityId: updated.id,
      entityType: "OwnerLead",
      previousValue: {
        status: previous.status
      },
      nextValue: {
        status: updated.status
      },
      reason: "ops_status_updated",
      request: input.request,
      result: "SUCCESS"
    });

    return {
      item: buildOwnerLeadItem(updated)
    };
  }

  const previous = await prisma.stayProposalRequest.findUnique({
    where: {
      id: input.id
    }
  });

  if (!previous) {
    return null;
  }

  const updated = await prisma.stayProposalRequest.update({
    data: {
      status: input.status
    },
    where: {
      id: input.id
    }
  });

  await writeOpsAudit({
    action: "ops.stay_proposal_request.status.update",
    actorUserId: input.actor.user.id,
    entityId: updated.id,
    entityType: "StayProposalRequest",
    previousValue: {
      status: previous.status
    },
    nextValue: {
      status: updated.status
    },
    reason: "ops_status_updated",
    request: input.request,
    result: "SUCCESS"
  });

  return {
    item: buildProposalRequestItem(updated)
  };
}

async function loadOpsCaseSource(
  itemType: WorkbenchItemType,
  id: string
): Promise<OpsCaseSource | null> {
  if (itemType === "owner-lead") {
    const lead = await prisma.ownerLead.findUnique({
      where: {
        id
      }
    });

    if (!lead) {
      return null;
    }

    return {
      contactEmail: lead.email,
      contactName: lead.ownerName,
      contactPhone: lead.phone,
      defaultNextStep: "Calificar propiedad y coordinar siguiente contacto.",
      entityType: "OwnerLead",
      item: buildOwnerLeadItem(lead),
      sourceId: lead.id,
      sourceType: sourceTypeByItemType[itemType],
      title: lead.propertyName ?? lead.propertyType
    };
  }

  const proposalRequest = await prisma.stayProposalRequest.findUnique({
    where: {
      id
    }
  });

  if (!proposalRequest) {
    return null;
  }

  return {
    contactEmail: proposalRequest.email,
    contactName: proposalRequest.guestName,
    contactPhone: proposalRequest.phone,
    defaultNextStep: "Preparar propuesta personalizada y confirmar disponibilidad.",
    entityType: "StayProposalRequest",
    item: buildProposalRequestItem(proposalRequest),
    sourceId: proposalRequest.id,
    sourceType: sourceTypeByItemType[itemType],
    title: proposalRequest.stayName
  };
}

async function ensureOpsCaseForSource(source: OpsCaseSource) {
  const opsCase = await prisma.opsCase.upsert({
    where: {
      sourceType_sourceId: {
        sourceId: source.sourceId,
        sourceType: source.sourceType
      }
    },
    create: {
      contactEmail: source.contactEmail,
      contactName: source.contactName,
      contactPhone: source.contactPhone,
      nextStep: source.defaultNextStep,
      sourceId: source.sourceId,
      sourceType: source.sourceType,
      title: source.title
    },
    update: {
      contactEmail: source.contactEmail,
      contactName: source.contactName,
      contactPhone: source.contactPhone,
      title: source.title
    }
  });

  return loadOpsCaseById(opsCase.id);
}

async function loadOpsCaseById(id: string) {
  return prisma.opsCase.findUniqueOrThrow({
    include: {
      formalActivities: {
        include: {
          actor: {
            select: {
              displayName: true,
              email: true,
              id: true
            }
          }
        },
        orderBy: {
          createdAt: "desc"
        },
        take: 20
      },
      formalDeliveries: {
        include: {
          actor: {
            select: {
              displayName: true,
              email: true,
              id: true
            }
          }
        },
        orderBy: {
          createdAt: "desc"
        },
        take: 20
      },
      propertyOnboarding: {
        include: {
          assignedUser: {
            select: {
              displayName: true,
              email: true,
              id: true
            }
          },
          approvedBy: {
            select: {
              displayName: true,
              email: true,
              id: true
            }
          },
          sentBy: {
            select: {
              displayName: true,
              email: true,
              id: true
            }
          },
          contract: {
            include: {
              owner: true,
              property: { include: { images: { orderBy: [{ isCover: "desc" }, { sortOrder: "asc" }, { createdAt: "asc" }] }, ratePlans: { orderBy: { createdAt: "desc" } }, stayCodes: { orderBy: { createdAt: "desc" } }, units: { orderBy: { createdAt: "asc" } } } },
              versions: {
                orderBy: {
                  version: "desc"
                }
              }
            }
          }
        }
      },
      stayProposal: {
        include: {
          assignedUser: {
            select: {
              displayName: true,
              email: true,
              id: true
            }
          },
          approvedBy: {
            select: {
              displayName: true,
              email: true,
              id: true
            }
          },
          sentBy: {
            select: {
              displayName: true,
              email: true,
              id: true
            }
          },
          versions: {
            orderBy: {
              version: "desc"
            }
          }
        }
      },
      notes: {
        include: {
          author: {
            select: {
              displayName: true,
              email: true,
              id: true
            }
          }
        },
        orderBy: {
          createdAt: "desc"
        }
      },
      tasks: {
        orderBy: [
          {
            status: "asc"
          },
          {
            sortOrder: "asc"
          },
          {
            createdAt: "asc"
          }
        ]
      }
    },
    where: {
      id
    }
  });
}

async function updateOpsCase(input: {
  actor: AuthorizedDevPortalSession;
  body: z.infer<typeof caseUpdateSchema>;
  id: string;
  itemType: WorkbenchItemType;
  request: Pick<FastifyRequest, "id" | "ip" | "log">;
}) {
  const source = await loadOpsCaseSource(input.itemType, input.id);

  if (!source) {
    await writeMissingCaseSourceAudit({
      action: "ops.case.update",
      actor: input.actor,
      id: input.id,
      itemType: input.itemType,
      request: input.request
    });
    return null;
  }

  const previous = await ensureOpsCaseForSource(source);
  const data: Prisma.OpsCaseUpdateInput = {};

  if (input.body.status) {
    data.status = input.body.status;
  }

  if (input.body.priority) {
    data.priority = input.body.priority;
  }

  if (Object.prototype.hasOwnProperty.call(input.body, "nextStep")) {
    data.nextStep = normalizeNullableText(input.body.nextStep);
  }

  const updated = Object.keys(data).length
    ? await prisma.opsCase.update({
        data,
        where: {
          id: previous.id
        }
      })
    : previous;
  const caseDetail = buildOpsCaseDetail(await loadOpsCaseById(updated.id), source);

  await writeOpsAudit({
    action: "ops.case.update",
    actorUserId: input.actor.user.id,
    entityId: updated.id,
    entityType: "OpsCase",
    previousValue: {
      nextStep: previous.nextStep,
      priority: previous.priority,
      status: previous.status
    },
    nextValue: {
      nextStep: updated.nextStep,
      priority: updated.priority,
      status: updated.status
    },
    reason: "ops_case_updated",
    request: input.request,
    result: "SUCCESS"
  });

  return {
    caseDetail
  };
}

async function convertOpsCase(input: {
  actor: AuthorizedDevPortalSession;
  id: string;
  itemType: WorkbenchItemType;
  request: Pick<FastifyRequest, "id" | "ip" | "log">;
}) {
  const source = await loadOpsCaseSource(input.itemType, input.id);

  if (!source) {
    await writeMissingCaseSourceAudit({
      action: "ops.case.convert",
      actor: input.actor,
      id: input.id,
      itemType: input.itemType,
      request: input.request
    });
    return null;
  }

  const opsCase = await ensureOpsCaseForSource(source);

  if (source.sourceType === "OWNER_LEAD") {
    return convertOwnerLeadCase({
      actor: input.actor,
      opsCase,
      request: input.request,
      source
    });
  }

  return convertStayProposalCase({
    actor: input.actor,
    opsCase,
    request: input.request,
    source
  });
}

async function convertOwnerLeadCase(input: {
  actor: AuthorizedDevPortalSession;
  opsCase: OpsCaseWithRelations;
  request: Pick<FastifyRequest, "id" | "ip" | "log">;
  source: OpsCaseSource;
}) {
  if (input.source.item.kind !== "ownerLead") {
    throw new Error("invalid_owner_lead_conversion_source");
  }

  const previous = await prisma.propertyOnboarding.findUnique({
    select: {
      id: true
    },
    where: {
      ownerLeadId: input.source.sourceId
    }
  });

  const onboarding = await prisma.propertyOnboarding.upsert({
    where: {
      ownerLeadId: input.source.sourceId
    },
    create: {
      assignedUserId: input.actor.user.id,
      candidatePropertyName: input.source.item.title,
      checklist: buildDefaultOnboardingChecklist(),
      nextMilestone: "Completar calificacion y checklist documental inicial.",
      opsCaseId: input.opsCase.id,
      ownerEmail: input.source.item.email,
      ownerLeadId: input.source.sourceId,
      ownerName: input.source.item.primaryName,
      ownerPhone: input.source.item.phone,
      propertyLocation: input.source.item.location,
      propertyType: input.source.item.propertyType,
      status: "QUALIFICATION"
    },
    update: {
      candidatePropertyName: input.source.item.title,
      nextMilestone: "Completar calificacion y checklist documental inicial.",
      opsCaseId: input.opsCase.id,
      ownerEmail: input.source.item.email,
      ownerName: input.source.item.primaryName,
      ownerPhone: input.source.item.phone,
      propertyLocation: input.source.item.location,
      propertyType: input.source.item.propertyType
    }
  });

  await prisma.opsCase.update({
    data: {
      nextStep: "Completar onboarding de propiedad y preparar aprobacion operativa.",
      status: "ACTION_PENDING"
    },
    where: {
      id: input.opsCase.id
    }
  });

  const caseDetail = buildOpsCaseDetail(await loadOpsCaseById(input.opsCase.id), input.source);

  await writeOpsAudit({
    action: "ops.case.convert",
    actorUserId: input.actor.user.id,
    entityId: onboarding.id,
    entityType: "PropertyOnboarding",
    previousValue: {
      conversionExists: Boolean(previous)
    },
    nextValue: {
      conversionKind: "property_onboarding",
      opsCaseId: input.opsCase.id,
      ownerLeadId: input.source.sourceId,
      status: onboarding.status
    },
    reason: previous ? "ops_case_conversion_loaded" : "ops_case_converted",
    request: input.request,
    result: "SUCCESS"
  });

  return {
    caseDetail,
    conversion: caseDetail.conversion,
    created: !previous
  };
}

async function convertStayProposalCase(input: {
  actor: AuthorizedDevPortalSession;
  opsCase: OpsCaseWithRelations;
  request: Pick<FastifyRequest, "id" | "ip" | "log">;
  source: OpsCaseSource;
}) {
  if (input.source.item.kind !== "proposalRequest") {
    throw new Error("invalid_stay_proposal_conversion_source");
  }

  const previous = await prisma.stayProposal.findUnique({
    select: {
      id: true
    },
    where: {
      proposalRequestId: input.source.sourceId
    }
  });

  const proposal = await prisma.stayProposal.upsert({
    where: {
      proposalRequestId: input.source.sourceId
    },
    create: {
      assignedUserId: input.actor.user.id,
      arrivalDate: input.source.item.arrivalDate ? new Date(input.source.item.arrivalDate) : null,
      currentVersion: 1,
      departureDate: input.source.item.departureDate
        ? new Date(input.source.item.departureDate)
        : null,
      destination: input.source.item.location,
      guestEmail: input.source.item.email,
      guestName: input.source.item.primaryName,
      guestPhone: input.source.item.phone,
      guests: input.source.item.guests,
      opsCaseId: input.opsCase.id,
      proposalRequestId: input.source.sourceId,
      status: "DRAFT",
      stayId: input.source.item.stayId,
      stayName: input.source.item.title
    },
    update: {
      arrivalDate: input.source.item.arrivalDate ? new Date(input.source.item.arrivalDate) : null,
      departureDate: input.source.item.departureDate
        ? new Date(input.source.item.departureDate)
        : null,
      destination: input.source.item.location,
      guestEmail: input.source.item.email,
      guestName: input.source.item.primaryName,
      guestPhone: input.source.item.phone,
      guests: input.source.item.guests,
      opsCaseId: input.opsCase.id,
      stayId: input.source.item.stayId,
      stayName: input.source.item.title
    }
  });

  const versionNumber = proposal.currentVersion;
  await prisma.stayProposalVersion.upsert({
    where: {
      stayProposalId_version: {
        stayProposalId: proposal.id,
        version: versionNumber
      }
    },
    create: {
      internalNotes:
        "Borrador creado desde expediente ops. Validar disponibilidad antes de enviar.",
      stayProposalId: proposal.id,
      summary: buildStayProposalSummary(input.source.item),
      termsLabel: "Borrador interno sujeto a disponibilidad final",
      title: `Propuesta v${versionNumber} - ${input.source.item.title}`,
      version: versionNumber
    },
    update: {
      summary: buildStayProposalSummary(input.source.item),
      termsLabel: "Borrador interno sujeto a disponibilidad final",
      title: `Propuesta v${versionNumber} - ${input.source.item.title}`
    }
  });

  await prisma.opsCase.update({
    data: {
      nextStep: "Revisar propuesta versionada y preparar envio al huesped.",
      status: "ACTION_PENDING"
    },
    where: {
      id: input.opsCase.id
    }
  });

  const caseDetail = buildOpsCaseDetail(await loadOpsCaseById(input.opsCase.id), input.source);

  await writeOpsAudit({
    action: "ops.case.convert",
    actorUserId: input.actor.user.id,
    entityId: proposal.id,
    entityType: "StayProposal",
    previousValue: {
      conversionExists: Boolean(previous)
    },
    nextValue: {
      conversionKind: "stay_proposal",
      opsCaseId: input.opsCase.id,
      proposalRequestId: input.source.sourceId,
      status: proposal.status,
      version: versionNumber
    },
    reason: previous ? "ops_case_conversion_loaded" : "ops_case_converted",
    request: input.request,
    result: "SUCCESS"
  });

  return {
    caseDetail,
    conversion: caseDetail.conversion,
    created: !previous
  };
}

function buildDefaultOnboardingChecklist(): Prisma.InputJsonValue {
  return [
    {
      key: "technical_visit",
      label: "Visita tecnica",
      status: "OPEN"
    },
    {
      key: "ownership_docs",
      label: "Documentos de propiedad",
      status: "OPEN"
    },
    {
      key: "access_rules",
      label: "Reglas de acceso",
      status: "OPEN"
    }
  ];
}

function buildStayProposalSummary(item: Extract<WorkbenchItem, { kind: "proposalRequest" }>) {
  const arrival = item.arrivalDate ? item.arrivalDate.slice(0, 10) : "fecha flexible";
  const departure = item.departureDate ? item.departureDate.slice(0, 10) : "salida flexible";

  return `${item.guests} huesped(es) en ${item.title}, ${item.location}. Ventana: ${arrival} a ${departure}.`;
}
async function createOpsCaseNote(input: {
  actor: AuthorizedDevPortalSession;
  body: string;
  id: string;
  itemType: WorkbenchItemType;
  request: Pick<FastifyRequest, "id" | "ip" | "log">;
}) {
  const source = await loadOpsCaseSource(input.itemType, input.id);

  if (!source) {
    await writeMissingCaseSourceAudit({
      action: "ops.case.note.create",
      actor: input.actor,
      id: input.id,
      itemType: input.itemType,
      request: input.request
    });
    return null;
  }

  const opsCase = await ensureOpsCaseForSource(source);
  const note = await prisma.opsCaseNote.create({
    data: {
      authorUserId: input.actor.user.id,
      body: input.body,
      opsCaseId: opsCase.id
    }
  });
  const caseDetail = buildOpsCaseDetail(await loadOpsCaseById(opsCase.id), source);

  await writeOpsAudit({
    action: "ops.case.note.create",
    actorUserId: input.actor.user.id,
    entityId: note.id,
    entityType: "OpsCaseNote",
    nextValue: {
      bodyLength: input.body.length,
      opsCaseId: opsCase.id
    },
    reason: "ops_case_note_created",
    request: input.request,
    result: "SUCCESS"
  });

  return {
    caseDetail
  };
}

async function createOpsCaseTask(input: {
  actor: AuthorizedDevPortalSession;
  body: z.infer<typeof taskCreateSchema>;
  id: string;
  itemType: WorkbenchItemType;
  request: Pick<FastifyRequest, "id" | "ip" | "log">;
}) {
  const source = await loadOpsCaseSource(input.itemType, input.id);

  if (!source) {
    await writeMissingCaseSourceAudit({
      action: "ops.case.task.create",
      actor: input.actor,
      id: input.id,
      itemType: input.itemType,
      request: input.request
    });
    return null;
  }

  const opsCase = await ensureOpsCaseForSource(source);
  const maxSortOrder = await prisma.opsCaseTask.aggregate({
    _max: {
      sortOrder: true
    },
    where: {
      opsCaseId: opsCase.id
    }
  });
  const task = await prisma.opsCaseTask.create({
    data: {
      dueLabel: normalizeNullableText(input.body.dueLabel),
      opsCaseId: opsCase.id,
      priority: input.body.priority,
      sortOrder: (maxSortOrder._max.sortOrder ?? 0) + 10,
      title: input.body.title
    }
  });
  const caseDetail = buildOpsCaseDetail(await loadOpsCaseById(opsCase.id), source);

  await writeOpsAudit({
    action: "ops.case.task.create",
    actorUserId: input.actor.user.id,
    entityId: task.id,
    entityType: "OpsCaseTask",
    nextValue: {
      opsCaseId: opsCase.id,
      priority: task.priority,
      title: task.title
    },
    reason: "ops_case_task_created",
    request: input.request,
    result: "SUCCESS"
  });

  return {
    caseDetail
  };
}

async function updateOpsCaseTask(input: {
  actor: AuthorizedDevPortalSession;
  id: string;
  itemType: WorkbenchItemType;
  request: Pick<FastifyRequest, "id" | "ip" | "log">;
  status: TaskStatus;
  taskId: string;
}) {
  const source = await loadOpsCaseSource(input.itemType, input.id);

  if (!source) {
    await writeMissingCaseSourceAudit({
      action: "ops.case.task.update",
      actor: input.actor,
      id: input.id,
      itemType: input.itemType,
      request: input.request
    });
    return null;
  }

  const opsCase = await ensureOpsCaseForSource(source);
  const previous = await prisma.opsCaseTask.findFirst({
    where: {
      id: input.taskId,
      opsCaseId: opsCase.id
    }
  });

  if (!previous) {
    await writeOpsAudit({
      action: "ops.case.task.update",
      actorUserId: input.actor.user.id,
      entityId: input.taskId,
      entityType: "OpsCaseTask",
      nextValue: {
        attemptedStatus: input.status,
        opsCaseId: opsCase.id
      },
      reason: "case_task_not_found",
      request: input.request,
      result: "DENIED"
    });
    return null;
  }

  const updated = await prisma.opsCaseTask.update({
    data: {
      status: input.status
    },
    where: {
      id: previous.id
    }
  });
  const caseDetail = buildOpsCaseDetail(await loadOpsCaseById(opsCase.id), source);

  await writeOpsAudit({
    action: "ops.case.task.update",
    actorUserId: input.actor.user.id,
    entityId: updated.id,
    entityType: "OpsCaseTask",
    previousValue: {
      status: previous.status
    },
    nextValue: {
      status: updated.status
    },
    reason: "ops_case_task_updated",
    request: input.request,
    result: "SUCCESS"
  });

  return {
    caseDetail
  };
}

async function updateCaseConversion(input: {
  actor: AuthorizedDevPortalSession;
  body: z.infer<typeof conversionUpdateSchema>;
  id: string;
  itemType: WorkbenchItemType;
  request: Pick<FastifyRequest, "id" | "ip" | "log">;
}) {
  const source = await loadOpsCaseSource(input.itemType, input.id);

  if (!source) {
    await writeMissingCaseSourceAudit({
      action: "ops.case.conversion.update",
      actor: input.actor,
      id: input.id,
      itemType: input.itemType,
      request: input.request
    });
    return null;
  }

  const opsCase = await ensureOpsCaseForSource(source);

  if (source.sourceType === "OWNER_LEAD") {
    const previous = await prisma.propertyOnboarding.findUnique({
      where: {
        ownerLeadId: source.sourceId
      }
    });

    if (!previous) {
      await writeMissingConversionAudit({
        action: "ops.case.conversion.update",
        actor: input.actor,
        entityType: "PropertyOnboarding",
        opsCaseId: opsCase.id,
        request: input.request
      });
      return null;
    }

    const data: Prisma.PropertyOnboardingUpdateInput = {};

    if (input.body.status) {
      data.status = propertyOnboardingStatusSchema.parse(input.body.status);
    }

    if (Object.prototype.hasOwnProperty.call(input.body, "nextMilestone")) {
      data.nextMilestone = normalizeRequiredText(input.body.nextMilestone, previous.nextMilestone);
    }

    applyFormalAssignmentUpdate(data, input);

    const updated = Object.keys(data).length
      ? await prisma.propertyOnboarding.update({
          data,
          where: {
            id: previous.id
          }
        })
      : previous;
    const caseDetail = buildOpsCaseDetail(await loadOpsCaseById(opsCase.id), source);

    await writeOpsAudit({
      action: "ops.case.conversion.update",
      actorUserId: input.actor.user.id,
      entityId: updated.id,
      entityType: "PropertyOnboarding",
      previousValue: {
        assignedUserId: previous.assignedUserId,
        handoffNotes: previous.handoffNotes,
        nextMilestone: previous.nextMilestone,
        status: previous.status,
        targetDate: formatDateOnly(previous.targetDate)
      },
      nextValue: {
        assignedUserId: updated.assignedUserId,
        handoffNotes: updated.handoffNotes,
        nextMilestone: updated.nextMilestone,
        status: updated.status,
        targetDate: formatDateOnly(updated.targetDate)
      },
      reason: "property_onboarding_updated",
      request: input.request,
      result: "SUCCESS"
    });

    return {
      caseDetail,
      conversion: caseDetail.conversion
    };
  }

  const previous = await prisma.stayProposal.findUnique({
    where: {
      proposalRequestId: source.sourceId
    }
  });

  if (!previous) {
    await writeMissingConversionAudit({
      action: "ops.case.conversion.update",
      actor: input.actor,
      entityType: "StayProposal",
      opsCaseId: opsCase.id,
      request: input.request
    });
    return null;
  }

  const data: Prisma.StayProposalUpdateInput = {};

  if (input.body.status) {
    data.status = stayProposalStatusSchema.parse(input.body.status);
  }

  applyFormalAssignmentUpdate(data, input);

  const updated = Object.keys(data).length
    ? await prisma.stayProposal.update({
        data,
        where: {
          id: previous.id
        }
      })
    : previous;
  const caseDetail = buildOpsCaseDetail(await loadOpsCaseById(opsCase.id), source);

  await writeOpsAudit({
    action: "ops.case.conversion.update",
    actorUserId: input.actor.user.id,
    entityId: updated.id,
    entityType: "StayProposal",
    previousValue: {
      assignedUserId: previous.assignedUserId,
      handoffNotes: previous.handoffNotes,
      status: previous.status,
      targetDate: formatDateOnly(previous.targetDate)
    },
    nextValue: {
      assignedUserId: updated.assignedUserId,
      handoffNotes: updated.handoffNotes,
      status: updated.status,
      targetDate: formatDateOnly(updated.targetDate)
    },
    reason: "stay_proposal_updated",
    request: input.request,
    result: "SUCCESS"
  });

  return {
    caseDetail,
    conversion: caseDetail.conversion
  };
}

async function createFormalActivity(input: {
  actor: AuthorizedDevPortalSession;
  body: string;
  id: string;
  itemType: WorkbenchItemType;
  request: Pick<FastifyRequest, "id" | "ip" | "log">;
}) {
  const source = await loadOpsCaseSource(input.itemType, input.id);

  if (!source) {
    await writeMissingCaseSourceAudit({
      action: "ops.case.conversion.activity.create",
      actor: input.actor,
      id: input.id,
      itemType: input.itemType,
      request: input.request
    });
    return null;
  }

  const opsCase = await ensureOpsCaseForSource(source);
  const formalEntity = resolveFormalEntity(opsCase);

  if (!formalEntity) {
    await writeMissingConversionAudit({
      action: "ops.case.conversion.activity.create",
      actor: input.actor,
      entityType: source.sourceType === "OWNER_LEAD" ? "PropertyOnboarding" : "StayProposal",
      opsCaseId: opsCase.id,
      request: input.request
    });
    return null;
  }

  const activity = await prisma.opsFormalActivity.create({
    data: {
      actorUserId: input.actor.user.id,
      body: input.body,
      entityId: formalEntity.entityId,
      entityType: formalEntity.entityType,
      opsCaseId: opsCase.id
    }
  });
  const caseDetail = buildOpsCaseDetail(await loadOpsCaseById(opsCase.id), source);

  await writeOpsAudit({
    action: "ops.case.conversion.activity.create",
    actorUserId: input.actor.user.id,
    entityId: activity.id,
    entityType: "OpsFormalActivity",
    nextValue: {
      bodyLength: input.body.length,
      formalEntityId: formalEntity.entityId,
      formalEntityType: formalEntity.entityType,
      opsCaseId: opsCase.id
    },
    reason: "formal_activity_created",
    request: input.request,
    result: "SUCCESS"
  });

  return {
    caseDetail,
    conversion: caseDetail.conversion
  };
}
async function updateFormalTransition(input: {
  actor: AuthorizedDevPortalSession;
  body: z.infer<typeof formalTransitionSchema>;
  id: string;
  itemType: WorkbenchItemType;
  request: Pick<FastifyRequest, "id" | "ip" | "log">;
  transition: FormalTransition;
}) {
  const source = await loadOpsCaseSource(input.itemType, input.id);
  const action = buildFormalTransitionAuditAction(input.transition);

  if (!source) {
    await writeMissingCaseSourceAudit({
      action,
      actor: input.actor,
      id: input.id,
      itemType: input.itemType,
      request: input.request
    });
    return {
      ok: false as const,
      statusCode: 404,
      error: "workbench_item_not_found"
    };
  }

  const opsCase = await ensureOpsCaseForSource(source);
  const formalEntity = resolveFormalEntity(opsCase);

  if (!formalEntity) {
    await writeMissingConversionAudit({
      action,
      actor: input.actor,
      entityType: source.sourceType === "OWNER_LEAD" ? "PropertyOnboarding" : "StayProposal",
      opsCaseId: opsCase.id,
      request: input.request
    });
    return {
      ok: false as const,
      statusCode: 404,
      error: "case_conversion_not_found"
    };
  }

  const note = normalizeNullableText(input.body.note);

  if (formalEntity.entityType === "PropertyOnboarding") {
    const previous = opsCase.propertyOnboarding;

    if (!previous) {
      return {
        ok: false as const,
        statusCode: 404,
        error: "case_conversion_not_found"
      };
    }

    const conflict = getFormalTransitionConflict(previous.approvalStatus, input.transition);

    if (conflict) {
      await writeFormalTransitionDeniedAudit({
        action,
        actor: input.actor,
        entityId: previous.id,
        entityType: "PropertyOnboarding",
        error: conflict,
        request: input.request,
        status: previous.approvalStatus,
        transition: input.transition
      });
      return {
        ok: false as const,
        statusCode: 409,
        error: conflict
      };
    }

    const delivery =
      input.transition === "SEND"
        ? await requestFormalDelivery({
            actor: input.actor,
            entity: previous,
            entityType: "PropertyOnboarding",
            note,
            opsCaseId: opsCase.id
          })
        : null;
    const data: Prisma.PropertyOnboardingUpdateInput = {};
    applyFormalTransitionData(data, {
      actor: input.actor,
      delivery,
      entityType: "PropertyOnboarding",
      note,
      transition: input.transition
    });

    const updated =
      Object.keys(data).length > 0
        ? await prisma.propertyOnboarding.update({
            data,
            where: {
              id: previous.id
            }
          })
        : previous;

    if (input.transition !== "SEND" || !delivery || delivery.recordActivity) {
      await createFormalTransitionActivity({
        actor: input.actor,
        delivery,
        entityId: updated.id,
        entityType: "PropertyOnboarding",
        note,
        opsCaseId: opsCase.id,
        transition: input.transition
      });
    }

    const caseDetail = buildOpsCaseDetail(await loadOpsCaseById(opsCase.id), source);

    await writeOpsAudit({
      action,
      actorUserId: input.actor.user.id,
      entityId: updated.id,
      entityType: "PropertyOnboarding",
      previousValue: buildFormalTransitionAuditValue(previous),
      nextValue: buildFormalTransitionAuditValue(updated),
      reason: buildFormalTransitionReason(input.transition),
      request: input.request,
      result: "SUCCESS"
    });

    return {
      ok: true as const,
      caseDetail,
      conversion: caseDetail.conversion
    };
  }

  const previous = opsCase.stayProposal;

  if (!previous) {
    return {
      ok: false as const,
      statusCode: 404,
      error: "case_conversion_not_found"
    };
  }

  const conflict = getFormalTransitionConflict(previous.approvalStatus, input.transition);

  if (conflict) {
    await writeFormalTransitionDeniedAudit({
      action,
      actor: input.actor,
      entityId: previous.id,
      entityType: "StayProposal",
      error: conflict,
      request: input.request,
      status: previous.approvalStatus,
      transition: input.transition
    });
    return {
      ok: false as const,
      statusCode: 409,
      error: conflict
    };
  }

  const delivery =
    input.transition === "SEND"
      ? await requestFormalDelivery({
          actor: input.actor,
          entity: previous,
          entityType: "StayProposal",
          note,
          opsCaseId: opsCase.id
        })
      : null;
  const data: Prisma.StayProposalUpdateInput = {};
  applyFormalTransitionData(data, {
    actor: input.actor,
    delivery,
    entityType: "StayProposal",
    note,
    transition: input.transition
  });

  const updated =
    Object.keys(data).length > 0
      ? await prisma.stayProposal.update({
          data,
          where: {
            id: previous.id
          }
        })
      : previous;

  if (input.transition !== "SEND" || !delivery || delivery.recordActivity) {
    await createFormalTransitionActivity({
      actor: input.actor,
      delivery,
      entityId: updated.id,
      entityType: "StayProposal",
      note,
      opsCaseId: opsCase.id,
      transition: input.transition
    });
  }

  const caseDetail = buildOpsCaseDetail(await loadOpsCaseById(opsCase.id), source);

  await writeOpsAudit({
    action,
    actorUserId: input.actor.user.id,
    entityId: updated.id,
    entityType: "StayProposal",
    previousValue: buildFormalTransitionAuditValue(previous),
    nextValue: buildFormalTransitionAuditValue(updated),
    reason: buildFormalTransitionReason(input.transition),
    request: input.request,
    result: "SUCCESS"
  });

  return {
    ok: true as const,
    caseDetail,
    conversion: caseDetail.conversion
  };
}

async function issueOnboardingContract(input: {
  actor: AuthorizedDevPortalSession;
  body: z.infer<typeof contractIssueSchema>;
  id: string;
  itemType: WorkbenchItemType;
  request: Pick<FastifyRequest, "id" | "ip" | "log">;
}): Promise<
  | {
      ok: true;
      caseDetail: ReturnType<typeof buildOpsCaseDetail>;
      contract: ReturnType<typeof buildOpsContractState>;
      conversion: ReturnType<typeof buildOpsCaseConversion>;
    }
  | { ok: false; error: string; statusCode: 404 | 409 }
> {
  const action = "ops.case.conversion.contract.issue";
  const source = await loadOpsCaseSource(input.itemType, input.id);

  if (!source) {
    await writeMissingCaseSourceAudit({
      action,
      actor: input.actor,
      id: input.id,
      itemType: input.itemType,
      request: input.request
    });
    return { ok: false, error: "workbench_item_not_found", statusCode: 404 };
  }

  if (source.sourceType !== "OWNER_LEAD") {
    await writeOpsAudit({
      action,
      actorUserId: input.actor.user.id,
      entityId: source.sourceId,
      entityType: source.entityType,
      nextValue: {
        itemType: input.itemType
      },
      reason: "contract_only_owner_onboarding",
      request: input.request,
      result: "DENIED"
    });
    return { ok: false, error: "contract_only_owner_onboarding", statusCode: 409 };
  }

  const opsCase = await ensureOpsCaseForSource(source);
  const onboarding = opsCase.propertyOnboarding;

  if (!onboarding) {
    await writeMissingConversionAudit({
      action,
      actor: input.actor,
      entityType: "PropertyOnboarding",
      opsCaseId: opsCase.id,
      request: input.request
    });
    return { ok: false, error: "case_conversion_not_found", statusCode: 404 };
  }

  const conflict = getContractIssueConflict(onboarding);

  if (conflict) {
    await writeOpsAudit({
      action,
      actorUserId: input.actor.user.id,
      entityId: onboarding.id,
      entityType: "PropertyOnboarding",
      nextValue: {
        approvalStatus: onboarding.approvalStatus,
        contractStatus: onboarding.contract?.status ?? null,
        error: conflict
      },
      reason: "contract_issue_denied",
      request: input.request,
      result: "DENIED"
    });
    return { ok: false, error: conflict, statusCode: 409 };
  }

  const note = normalizeNullableText(input.body.note);
  const issue = await prepareOnboardingContract({
    actor: input.actor,
    onboarding,
    startsOn: input.body.startsOn ? parseDateOnly(input.body.startsOn) : parseDateOnly(new Date().toISOString().slice(0, 10))
  });

  if (issue.changed) {
    await prisma.opsFormalActivity.create({
      data: {
        actorUserId: input.actor.user.id,
        body: buildContractIssueActivityBody(issue.contract, note),
        entityId: onboarding.id,
        entityType: "PropertyOnboarding",
        opsCaseId: opsCase.id
      }
    });
  }

  const caseDetail = buildOpsCaseDetail(await loadOpsCaseById(opsCase.id), source);

  await writeOpsAudit({
    action,
    actorUserId: input.actor.user.id,
    entityId: issue.contract.id,
    entityType: "Contract",
    previousValue: {
      currentVersion: onboarding.contract?.currentVersion ?? null,
      status: onboarding.contract?.status ?? null
    },
    nextValue: buildContractAuditValue(issue.contract),
    reason: issue.changed ? "contract_issued_for_owner_signature" : "contract_issue_loaded",
    request: input.request,
    result: "SUCCESS"
  });

  return {
    ok: true,
    caseDetail,
    contract: buildOpsContractState(issue.contract, onboarding.approvalStatus),
    conversion: caseDetail.conversion
  };
}

async function activateOnboardingProperty(input: {
  actor: AuthorizedDevPortalSession;
  body: z.infer<typeof propertyActivationSchema>;
  id: string;
  itemType: WorkbenchItemType;
  request: Pick<FastifyRequest, "id" | "ip" | "log">;
}): Promise<
  | {
      ok: true;
      activation: ReturnType<typeof buildOpsPropertyActivationState>;
      caseDetail: ReturnType<typeof buildOpsCaseDetail>;
      conversion: ReturnType<typeof buildOpsCaseConversion>;
    }
  | { ok: false; error: string; statusCode: 404 | 409 }
> {
  const action = "ops.case.conversion.property.activate";
  const source = await loadOpsCaseSource(input.itemType, input.id);

  if (!source) {
    await writeMissingCaseSourceAudit({
      action,
      actor: input.actor,
      id: input.id,
      itemType: input.itemType,
      request: input.request
    });
    return { ok: false, error: "workbench_item_not_found", statusCode: 404 };
  }

  if (source.sourceType !== "OWNER_LEAD") {
    await writeOpsAudit({
      action,
      actorUserId: input.actor.user.id,
      entityId: source.sourceId,
      entityType: source.entityType,
      nextValue: { itemType: input.itemType },
      reason: "property_activation_only_owner_onboarding",
      request: input.request,
      result: "DENIED"
    });
    return { ok: false, error: "property_activation_only_owner_onboarding", statusCode: 409 };
  }

  const opsCase = await ensureOpsCaseForSource(source);
  const onboarding = opsCase.propertyOnboarding;

  if (!onboarding) {
    await writeMissingConversionAudit({
      action,
      actor: input.actor,
      entityType: "PropertyOnboarding",
      opsCaseId: opsCase.id,
      request: input.request
    });
    return { ok: false, error: "case_conversion_not_found", statusCode: 404 };
  }

  if (!onboarding.contract) {
    await writeOpsAudit({
      action,
      actorUserId: input.actor.user.id,
      entityId: onboarding.id,
      entityType: "PropertyOnboarding",
      nextValue: { error: "contract_required" },
      reason: "property_activation_denied",
      request: input.request,
      result: "DENIED"
    });
    return { ok: false, error: "contract_required", statusCode: 409 };
  }

  if (onboarding.contract.status !== "ACTIVE") {
    await writeOpsAudit({
      action,
      actorUserId: input.actor.user.id,
      entityId: onboarding.contract.id,
      entityType: "Contract",
      nextValue: { contractStatus: onboarding.contract.status, error: "contract_activation_required" },
      reason: "property_activation_denied",
      request: input.request,
      result: "DENIED"
    });
    return { ok: false, error: "contract_activation_required", statusCode: 409 };
  }

  const stayCode = normalizeStayCode(input.body.stayCode);
  const images = normalizePropertyActivationImages(input.body.images, onboarding.candidatePropertyName);

  if (!stayCode) {
    return { ok: false, error: "stay_code_invalid", statusCode: 409 };
  }

  if (images.length < 3) {
    return { ok: false, error: "property_images_minimum_required", statusCode: 409 };
  }

  const conflictingStayCode = await prisma.stayCode.findUnique({
    select: { propertyId: true },
    where: { code: stayCode }
  });

  if (conflictingStayCode && conflictingStayCode.propertyId !== onboarding.contract.propertyId) {
    await writeOpsAudit({
      action,
      actorUserId: input.actor.user.id,
      entityId: onboarding.contract.propertyId,
      entityType: "Property",
      nextValue: { error: "stay_code_already_in_use", stayCode },
      reason: "property_activation_denied",
      request: input.request,
      result: "DENIED"
    });
    return { ok: false, error: "stay_code_already_in_use", statusCode: 409 };
  }

  const activated = await prisma.$transaction(async (tx) => {
    const property = await tx.property.update({
      data: { visibility: "PUBLIC" },
      where: { id: onboarding.contract!.propertyId }
    });
    const existingUnit = await tx.unit.findFirst({
      orderBy: { createdAt: "asc" },
      where: { propertyId: property.id }
    });
    const unit = existingUnit
      ? await tx.unit.update({
          data: {
            bathrooms: input.body.bathrooms.toString(),
            bedrooms: input.body.bedrooms,
            maxGuests: input.body.maxGuests,
            name: input.body.unitName
          },
          where: { id: existingUnit.id }
        })
      : await tx.unit.create({
          data: {
            bathrooms: input.body.bathrooms.toString(),
            bedrooms: input.body.bedrooms,
            maxGuests: input.body.maxGuests,
            name: input.body.unitName,
            propertyId: property.id
          }
        });
    const existingRatePlan = await tx.ratePlan.findFirst({
      orderBy: { createdAt: "desc" },
      where: { active: true, propertyId: property.id, unitId: unit.id }
    });
    const rateData = {
      active: true,
      baseNightlyRate: input.body.baseNightlyRate.toString(),
      cleaningFee: input.body.cleaningFee.toString(),
      currency: input.body.currency.toUpperCase(),
      minNights: input.body.minNights,
      name: input.body.ratePlanName,
      serviceFeeBps: input.body.serviceFeeBps,
      taxBps: input.body.taxBps,
      weekendNightlyRate: input.body.weekendNightlyRate?.toString() ?? null
    };
    const ratePlan = existingRatePlan
      ? await tx.ratePlan.update({ data: rateData, where: { id: existingRatePlan.id } })
      : await tx.ratePlan.create({ data: { ...rateData, propertyId: property.id, unitId: unit.id } });
    const publicStayCode = await tx.stayCode.upsert({
      create: { active: true, code: stayCode, propertyId: property.id, unitId: unit.id },
      update: { active: true, propertyId: property.id, unitId: unit.id },
      where: { code: stayCode }
    });

    await tx.propertyImage.deleteMany({ where: { propertyId: property.id } });
    await tx.propertyImage.createMany({
      data: images.map((image) => ({
        alt: image.alt,
        isCover: image.isCover,
        propertyId: property.id,
        sortOrder: image.sortOrder,
        url: image.url
      }))
    });

    await tx.propertyOnboarding.update({
      data: {
        nextMilestone: "Propiedad activa, publicada y lista para reservas.",
        status: "CLOSED"
      },
      where: { id: onboarding.id }
    });
    await tx.opsCase.update({
      data: {
        nextStep: "Alta comercial cerrada. Monitorear primeras reservas y operacion inicial.",
        status: "CLOSED"
      },
      where: { id: opsCase.id }
    });
    await tx.opsFormalActivity.create({
      data: {
        actorUserId: input.actor.user.id,
        body: buildPropertyActivationActivityBody({ imageCount: images.length, note: input.body.note, ratePlanName: ratePlan.name, stayCode, unitName: unit.name }),
        entityId: onboarding.id,
        entityType: "PropertyOnboarding",
        opsCaseId: opsCase.id
      }
    });

    return { property, publicStayCode, ratePlan, unit };
  });

  const caseDetail = buildOpsCaseDetail(await loadOpsCaseById(opsCase.id), source);
  const activation = caseDetail.conversion?.kind === "propertyOnboarding"
    ? caseDetail.conversion.activation
    : buildOpsPropertyActivationState(onboarding);

  await writeOpsAudit({
    action,
    actorUserId: input.actor.user.id,
    entityId: activated.property.id,
    entityType: "Property",
    nextValue: {
      imageCount: images.length,
      propertyVisibility: activated.property.visibility,
      ratePlanId: activated.ratePlan.id,
      stayCode: activated.publicStayCode.code,
      unitId: activated.unit.id
    },
    reason: "property_activated_for_public_reservations",
    request: input.request,
    result: "SUCCESS"
  });

  return {
    ok: true,
    activation,
    caseDetail,
    conversion: caseDetail.conversion
  };
}
async function prepareOnboardingContract(input: {
  actor: AuthorizedDevPortalSession;
  onboarding: NonNullable<OpsCaseWithRelations["propertyOnboarding"]>;
  startsOn: Date;
}) {
  const existing = input.onboarding.contract;

  if (existing?.status === "ISSUED") {
    return {
      changed: false,
      contract: existing
    };
  }

  const now = new Date();
  const version = existing ? existing.currentVersion + 1 : 1;
  const ownerShareBps = existing?.ownerShareBps ?? 0;
  const kuqubaShareBps = existing?.kuqubaShareBps ?? 0;
  const termsSnapshot = buildContractTermsSnapshot({
    kuqubaShareBps,
    onboarding: input.onboarding,
    ownerShareBps,
    version
  });
  const title = buildContractTitle(input.onboarding, version);
  const summary = buildContractSummary(input.onboarding);
  const transactionResult = await prisma.$transaction(async (tx) => {
    const owner = await findOrCreateContractOwner(tx, input.onboarding, input.actor.user.organizationId);
    const property = await findOrCreateContractProperty(tx, input.onboarding, input.actor.user.organizationId);
    const contract = existing
      ? await tx.contract.update({
          data: {
            currentVersion: version,
            endsOn: null,
            issuedAt: now,
            issuedByUserId: input.actor.user.id,
            kuqubaShareBps,
            ownerId: owner.id,
            ownerShareBps,
            propertyId: property.id,
            signedAt: null,
            signedByUserId: null,
            signatureEvidenceHash: null,
            signatureProvider: null,
            signatureProviderRef: null,
            startsOn: input.startsOn,
            status: "ISSUED",
            summary,
            termsSnapshot,
            title
          },
          where: {
            id: existing.id
          }
        })
      : await tx.contract.create({
          data: {
            currentVersion: version,
            issuedAt: now,
            issuedByUserId: input.actor.user.id,
            kuqubaShareBps,
            ownerId: owner.id,
            ownerShareBps,
            propertyId: property.id,
            propertyOnboardingId: input.onboarding.id,
            startsOn: input.startsOn,
            status: "ISSUED",
            summary,
            termsSnapshot,
            title
          }
        });

    await tx.contractVersion.upsert({
      create: {
        contractId: contract.id,
        createdByUserId: input.actor.user.id,
        issuedAt: now,
        summary,
        termsSnapshot,
        title,
        version
      },
      update: {
        issuedAt: now,
        summary,
        termsSnapshot,
        title
      },
      where: {
        contractId_version: {
          contractId: contract.id,
          version
        }
      }
    });

    await tx.propertyOnboarding.update({
      data: {
        nextMilestone: "Contrato emitido para aceptacion del propietario.",
        status: "OPERATIONS_READY"
      },
      where: {
        id: input.onboarding.id
      }
    });

    return {
      contractId: contract.id
    };
  });

  return {
    changed: true,
    contract: await loadContractWithRelations(transactionResult.contractId)
  };
}

async function loadContractWithRelations(id: string) {
  return prisma.contract.findUniqueOrThrow({
    include: {
      owner: true,
      property: { include: { images: { orderBy: [{ isCover: "desc" }, { sortOrder: "asc" }, { createdAt: "asc" }] }, ratePlans: { orderBy: { createdAt: "desc" } }, stayCodes: { orderBy: { createdAt: "desc" } }, units: { orderBy: { createdAt: "asc" } } } },
      versions: {
        orderBy: {
          version: "desc"
        }
      }
    },
    where: {
      id
    }
  });
}

async function findOrCreateContractOwner(
  tx: Prisma.TransactionClient,
  onboarding: NonNullable<OpsCaseWithRelations["propertyOnboarding"]>,
  organizationId: string
) {
  const email = onboarding.ownerEmail.trim().toLowerCase();
  const existing = await tx.owner.findFirst({
    orderBy: {
      createdAt: "asc"
    },
    where: {
      email,
      organizationId
    }
  });

  if (existing) {
    return tx.owner.update({
      data: {
        displayName: onboarding.ownerName,
        email
      },
      where: {
        id: existing.id
      }
    });
  }

  return tx.owner.create({
    data: {
      displayName: onboarding.ownerName,
      email,
      organizationId
    }
  });
}

async function findOrCreateContractProperty(
  tx: Prisma.TransactionClient,
  onboarding: NonNullable<OpsCaseWithRelations["propertyOnboarding"]>,
  organizationId: string
) {
  const existing = await tx.property.findFirst({
    orderBy: {
      createdAt: "asc"
    },
    where: {
      name: onboarding.candidatePropertyName,
      organizationId
    }
  });

  if (existing) {
    return existing;
  }

  return tx.property.create({
    data: {
      destination: onboarding.propertyLocation,
      name: onboarding.candidatePropertyName,
      organizationId,
      visibility: "SEGMENTED"
    }
  });
}

function getContractIssueConflict(onboarding: NonNullable<OpsCaseWithRelations["propertyOnboarding"]>) {
  if (onboarding.approvalStatus !== "APPROVED" && onboarding.approvalStatus !== "SENT") {
    return "contract_formal_approval_required";
  }

  if (onboarding.contract?.status === "ACTIVE") {
    return "contract_already_active";
  }

  return null;
}

function buildContractTitle(onboarding: NonNullable<OpsCaseWithRelations["propertyOnboarding"]>, version: number) {
  return `Contrato KUQUBA v${version} - ${onboarding.candidatePropertyName}`;
}

function buildContractSummary(onboarding: NonNullable<OpsCaseWithRelations["propertyOnboarding"]>) {
  return `Administracion profesional para ${onboarding.candidatePropertyName} en ${onboarding.propertyLocation}.`;
}

function buildContractTermsSnapshot(input: {
  kuqubaShareBps: number;
  onboarding: NonNullable<OpsCaseWithRelations["propertyOnboarding"]>;
  ownerShareBps: number;
  version: number;
}): Prisma.InputJsonObject {
  return {
    commercialModel: "dev_terms_pending_finance",
    kuqubaShareBps: input.kuqubaShareBps,
    ownerShareBps: input.ownerShareBps,
    ownerName: input.onboarding.ownerName,
    propertyLocation: input.onboarding.propertyLocation,
    propertyName: input.onboarding.candidatePropertyName,
    propertyType: input.onboarding.propertyType,
    serviceScope: ["publicacion", "operacion", "housekeeping_coordination", "owner_reporting"],
    version: input.version
  };
}

function normalizeStayCode(value: string) {
  const normalized = value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return normalized.length >= 3 ? normalized : null;
}

function normalizePropertyActivationImages(
  images: z.infer<typeof propertyActivationSchema>["images"],
  propertyName: string
) {
  const seen = new Set<string>();
  const normalized = images
    .map((image, index) => ({
      alt: normalizeNullableText(image.alt) ?? `${propertyName} foto ${index + 1}`,
      isCover: Boolean(image.isCover),
      sortOrder: image.sortOrder ?? index,
      url: image.url.trim()
    }))
    .filter((image) => {
      if (seen.has(image.url)) {
        return false;
      }

      seen.add(image.url);
      return true;
    });

  if (!normalized.some((image) => image.isCover) && normalized[0]) {
    normalized[0].isCover = true;
  }

  return normalized.map((image, index) => ({
    ...image,
    isCover: index === normalized.findIndex((candidate) => candidate.isCover),
    sortOrder: index
  }));
}
function buildPropertyActivationActivityBody(input: {
  imageCount: number;
  note?: string | null;
  ratePlanName: string;
  stayCode: string;
  unitName: string;
}) {
  const base = `Propiedad publicada para reservas. Unidad ${input.unitName}. Tarifa ${input.ratePlanName}. Codigo ${input.stayCode}. Fotos ${input.imageCount}.`;
  const note = normalizeNullableText(input.note);

  return note ? `${base} Nota: ${note}` : base;
}
function buildContractIssueActivityBody(contract: { currentVersion: number }, note: string | null) {
  const base = `Contrato v${contract.currentVersion} emitido para firma dev del propietario.`;

  return note ? `${base} Nota: ${note}` : base;
}

function buildContractAuditValue(contract: { currentVersion: number; issuedAt: Date | null; ownerId: string; propertyId: string; signedAt: Date | null; signatureProvider: string | null; signatureProviderRef: string | null; status: string }) {
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
async function writeFormalTransitionDeniedAudit(input: {
  action: string;
  actor: AuthorizedDevPortalSession;
  entityId: string;
  entityType: "PropertyOnboarding" | "StayProposal";
  error: string;
  request: Pick<FastifyRequest, "id" | "ip" | "log">;
  status: string;
  transition: FormalTransition;
}) {
  await writeOpsAudit({
    action: input.action,
    actorUserId: input.actor.user.id,
    entityId: input.entityId,
    entityType: input.entityType,
    nextValue: {
      error: input.error,
      status: input.status,
      transition: input.transition
    },
    reason: "formal_transition_denied",
    request: input.request,
    result: "DENIED"
  });
}

async function createFormalTransitionActivity(input: {
  actor: AuthorizedDevPortalSession;
  delivery?: PreparedFormalDelivery | null;
  entityId: string;
  entityType: "PropertyOnboarding" | "StayProposal";
  note: string | null;
  opsCaseId: string;
  transition: FormalTransition;
}) {
  await prisma.opsFormalActivity.create({
    data: {
      actorUserId: input.actor.user.id,
      body: buildFormalTransitionActivityBody(
        input.transition,
        input.entityType,
        input.note,
        input.delivery
      ),
      entityId: input.entityId,
      entityType: input.entityType,
      opsCaseId: input.opsCaseId
    }
  });
}

async function requestFormalDelivery(input: {
  actor: AuthorizedDevPortalSession;
  entity:
    | NonNullable<OpsCaseWithRelations["propertyOnboarding"]>
    | NonNullable<OpsCaseWithRelations["stayProposal"]>;
  entityType: "PropertyOnboarding" | "StayProposal";
  note: string | null;
  opsCaseId: string;
}): Promise<PreparedFormalDelivery> {
  const template = buildFormalDeliveryTemplate(input);
  const idempotencyKey = buildFormalDeliveryIdempotencyKey({
    entity: input.entity,
    entityType: input.entityType,
    template
  });
  const delivery = await prisma.opsFormalDelivery.upsert({
    create: {
      actorUserId: input.actor.user.id,
      channel: template.channel,
      entityId: input.entity.id,
      entityType: input.entityType,
      idempotencyKey,
      maxAttempts: env.FORMAL_DELIVERY_MAX_ATTEMPTS,
      opsCaseId: input.opsCaseId,
      provider: getFormalDeliveryProviderName(),
      recipientHash: hashDestination(template.recipient),
      recipientMasked: maskDestination(template.recipient),
      status: "PENDING",
      subject: template.subject,
      templateKey: template.templateKey,
      templateVersion: template.templateVersion
    },
    update: {},
    where: {
      idempotencyKey
    }
  });
  const attemptAt = new Date();
  const reserved = await prisma.opsFormalDelivery.updateMany({
    data: {
      actorUserId: input.actor.user.id,
      attemptCount: {
        increment: 1
      },
      errorCode: null,
      errorMessage: null,
      failedAt: null,
      lastAttemptAt: attemptAt,
      nextAttemptAt: null,
      status: "PENDING"
    },
    where: {
      attemptCount: {
        lt: delivery.maxAttempts
      },
      id: delivery.id,
      OR: [
        {
          lastAttemptAt: null,
          status: "PENDING"
        },
        {
          nextAttemptAt: {
            lte: attemptAt
          },
          status: "FAILED"
        }
      ]
    }
  });

  if (reserved.count !== 1) {
    const current = await prisma.opsFormalDelivery.findUniqueOrThrow({
      where: {
        id: delivery.id
      }
    });

    return mapFormalDeliveryRecord(current, {
      recordActivity: false,
      recordEntityState: current.status !== "PENDING",
      retryable:
        current.status === "FAILED" &&
        current.nextAttemptAt !== null &&
        current.attemptCount < current.maxAttempts
    });
  }

  const reservedDelivery = await prisma.opsFormalDelivery.findUniqueOrThrow({
    where: {
      id: delivery.id
    }
  });
  const adapterResult = await sendFormalTransactionalMessage({
    ...template,
    idempotencyKey
  });
  const nextAttemptAt =
    adapterResult.status === "FAILED" &&
    adapterResult.retryable &&
    reservedDelivery.attemptCount < reservedDelivery.maxAttempts
      ? buildNextFormalDeliveryAttemptAt(reservedDelivery.attemptCount)
      : null;
  const updated = await prisma.opsFormalDelivery.update({
    data: {
      acceptedAt: adapterResult.acceptedAt,
      deliveredAt: adapterResult.deliveredAt,
      errorCode: adapterResult.errorCode,
      errorMessage: adapterResult.errorMessage,
      failedAt: adapterResult.failedAt,
      nextAttemptAt,
      provider: adapterResult.provider,
      providerMessageId: adapterResult.providerMessageId,
      sentAt: adapterResult.sentAt,
      status: adapterResult.status
    },
    where: {
      id: reservedDelivery.id
    }
  });

  return mapFormalDeliveryRecord(updated, {
    recordActivity: true,
    recordEntityState: true,
    retryable: adapterResult.retryable
  });
}

function buildFormalDeliveryIdempotencyKey(input: {
  entity:
    | NonNullable<OpsCaseWithRelations["propertyOnboarding"]>
    | NonNullable<OpsCaseWithRelations["stayProposal"]>;
  entityType: "PropertyOnboarding" | "StayProposal";
  template: FormalDeliveryTemplate;
}) {
  const approvalMarker = input.entity.approvedAt?.toISOString() ?? "approved";
  const rawKey = `${input.entityType}:${input.entity.id}:${approvalMarker}:${input.template.templateKey}:${input.template.templateVersion}`;

  return createHash("sha256").update(rawKey).digest("hex");
}

function buildNextFormalDeliveryAttemptAt(attemptCount: number) {
  const delayMs = env.FORMAL_DELIVERY_RETRY_DELAY_SECONDS * 1000 * Math.max(1, attemptCount);

  return new Date(Date.now() + delayMs);
}

function mapFormalDeliveryRecord(
  delivery: FormalDeliveryRecord,
  options: { recordActivity: boolean; recordEntityState: boolean; retryable: boolean }
): PreparedFormalDelivery {
  return {
    acceptedAt: delivery.acceptedAt,
    attemptCount: delivery.attemptCount,
    channel: delivery.channel as FormalDeliveryChannel,
    deliveredAt: delivery.deliveredAt,
    errorCode: delivery.errorCode,
    errorMessage: delivery.errorMessage,
    failedAt: delivery.failedAt,
    id: delivery.id,
    lastAttemptAt: delivery.lastAttemptAt,
    maxAttempts: delivery.maxAttempts,
    nextAttemptAt: delivery.nextAttemptAt,
    provider: delivery.provider,
    providerMessageId: delivery.providerMessageId,
    recipientHash: delivery.recipientHash,
    recipientMasked: delivery.recipientMasked,
    recordActivity: options.recordActivity,
    recordEntityState: options.recordEntityState,
    retryable: options.retryable,
    sentAt: delivery.sentAt,
    status: delivery.status,
    subject: delivery.subject,
    templateKey: delivery.templateKey,
    templateVersion: delivery.templateVersion
  };
}
function buildFormalDeliveryTemplate(input: {
  entity:
    | NonNullable<OpsCaseWithRelations["propertyOnboarding"]>
    | NonNullable<OpsCaseWithRelations["stayProposal"]>;
  entityType: "PropertyOnboarding" | "StayProposal";
  note: string | null;
}): FormalDeliveryTemplate {
  if (input.entityType === "PropertyOnboarding") {
    const onboarding = input.entity as NonNullable<OpsCaseWithRelations["propertyOnboarding"]>;

    return {
      body: [
        `Hola ${onboarding.ownerName},`,
        `KUQUBA registro el siguiente paso para ${onboarding.candidatePropertyName}.`,
        `Ubicacion: ${onboarding.propertyLocation}. Tipo: ${onboarding.propertyType}.`,
        onboarding.handoffNotes ??
          "El equipo operativo dara seguimiento con los detalles acordados.",
        input.note ? `Nota interna aprobada: ${input.note}` : "Sin nota adicional aprobada."
      ],
      channel: "EMAIL",
      recipient: onboarding.ownerEmail,
      recipientName: onboarding.ownerName,
      subject: `KUQUBA - Activacion de ${onboarding.candidatePropertyName}`,
      templateKey: "property_onboarding_owner_v1",
      templateVersion: 1
    };
  }

  const proposal = input.entity as NonNullable<OpsCaseWithRelations["stayProposal"]>;
  const latestVersion = proposal.versions[0];
  const stayWindow = buildStayWindowLabel(proposal.arrivalDate, proposal.departureDate);

  return {
    body: [
      `Hola ${proposal.guestName},`,
      `Tenemos una propuesta KUQUBA para ${proposal.stayName} en ${proposal.destination}.`,
      `Fechas: ${stayWindow}. Huespedes: ${proposal.guests}.`,
      latestVersion?.summary ?? "Propuesta personalizada pendiente de resumen operativo.",
      `Condiciones: ${latestVersion?.termsLabel ?? "Condiciones sujetas a validacion final"}.`,
      input.note ? `Nota aprobada: ${input.note}` : "Sin nota adicional aprobada."
    ],
    channel: "EMAIL",
    recipient: proposal.guestEmail,
    recipientName: proposal.guestName,
    subject: `Propuesta KUQUBA - ${proposal.stayName}`,
    templateKey: "stay_proposal_guest_v1",
    templateVersion: 1
  };
}

function applyFormalTransitionData(
  data: Prisma.PropertyOnboardingUpdateInput | Prisma.StayProposalUpdateInput,
  input: {
    actor: AuthorizedDevPortalSession;
    delivery?: PreparedFormalDelivery | null;
    entityType: "PropertyOnboarding" | "StayProposal";
    note: string | null;
    transition: FormalTransition;
  }
) {
  const target = data as Record<string, unknown>;
  const now = new Date();

  if (input.transition === "REQUEST_APPROVAL") {
    target.approvalStatus = "READY_FOR_APPROVAL";
  }

  if (input.transition === "APPROVE") {
    target.approvalStatus = "APPROVED";
    target.approvedAt = now;
    target.approvedBy = {
      connect: {
        id: input.actor.user.id
      }
    };
    target.status = input.entityType === "StayProposal" ? "READY_TO_SEND" : "OPERATIONS_READY";
  }

  if (input.transition === "SEND") {
    const shouldApplyDelivery = !input.delivery || input.delivery.recordEntityState;

    if (
      shouldApplyDelivery &&
      (!input.delivery || isFormalDeliveryAccepted(input.delivery.status))
    ) {
      target.approvalStatus = "SENT";
      target.sentAt = input.delivery?.acceptedAt ?? input.delivery?.sentAt ?? now;
      target.sentBy = {
        connect: {
          id: input.actor.user.id
        }
      };
      target.status = input.entityType === "StayProposal" ? "SENT" : "OPERATIONS_READY";
    }

    if (input.delivery && shouldApplyDelivery) {
      target.deliveryChannel = input.delivery.channel;
      target.deliveryErrorCode = input.delivery.errorCode;
      target.deliveryErrorMessage = input.delivery.errorMessage;
      target.deliveryFailedAt = input.delivery.failedAt;
      target.deliveredAt = input.delivery.deliveredAt;
      target.deliveryProvider = input.delivery.provider;
      target.deliveryStatus = input.delivery.status;
      target.deliveryTemplateKey = input.delivery.templateKey;
      target.deliveryTemplateVersion = input.delivery.templateVersion;
      target.providerMessageId = input.delivery.providerMessageId;
    }
  }

  if (input.note) {
    target.deliveryNotes = input.note;
  }
}

function isFormalDeliveryAccepted(status: FormalDeliveryStatus) {
  return status === "SENT" || status === "DELIVERED";
}
function getFormalTransitionConflict(status: string, transition: FormalTransition) {
  if (status === "SENT") {
    return "formal_already_sent";
  }

  if (transition === "REQUEST_APPROVAL" && status === "APPROVED") {
    return "formal_already_approved";
  }

  if (transition === "SEND" && status !== "APPROVED") {
    return "formal_approval_required";
  }

  return null;
}

function buildFormalTransitionAuditAction(transition: FormalTransition) {
  if (transition === "REQUEST_APPROVAL") {
    return "ops.case.conversion.approval.request";
  }

  if (transition === "APPROVE") {
    return "ops.case.conversion.approve";
  }

  return "ops.case.conversion.send";
}

function buildFormalTransitionReason(transition: FormalTransition) {
  if (transition === "REQUEST_APPROVAL") {
    return "formal_approval_requested";
  }

  if (transition === "APPROVE") {
    return "formal_approved";
  }

  return "formal_send_recorded";
}

function buildFormalTransitionActivityBody(
  transition: FormalTransition,
  entityType: "PropertyOnboarding" | "StayProposal",
  note: string | null,
  delivery?: PreparedFormalDelivery | null
) {
  const base =
    transition === "REQUEST_APPROVAL"
      ? "Solicitud de aprobacion formal registrada."
      : transition === "APPROVE"
        ? "Aprobacion interna registrada."
        : delivery
          ? buildFormalDeliveryActivityBody(delivery)
          : entityType === "StayProposal"
            ? "Envio controlado registrado."
            : "Entrega controlada registrada.";

  return note ? `${base} Nota: ${note}` : base;
}

function buildFormalDeliveryActivityBody(delivery: PreparedFormalDelivery) {
  const retryDetail = delivery.nextAttemptAt
    ? ` Proximo reintento ${delivery.nextAttemptAt.toISOString()}.`
    : "";

  return `Envio transaccional registrado via ${delivery.provider} (${formalDeliveryStatusLabels[delivery.status]}). Plantilla ${delivery.templateKey} v${delivery.templateVersion}. Destino ${delivery.recipientMasked}. Intento ${delivery.attemptCount}/${delivery.maxAttempts}.${retryDetail}`;
}
function buildFormalTransitionAuditValue(input: {
  approvalStatus: string;
  approvedAt?: Date | null;
  approvedByUserId?: string | null;
  sentAt?: Date | null;
  sentByUserId?: string | null;
  deliveryNotes?: string | null;
  deliveryStatus?: string | null;
  deliveryProvider?: string | null;
  providerMessageId?: string | null;
  deliveryChannel?: string | null;
  deliveryTemplateKey?: string | null;
  deliveryTemplateVersion?: number | null;
  deliveredAt?: Date | null;
  deliveryFailedAt?: Date | null;
  deliveryErrorCode?: string | null;
  deliveryErrorMessage?: string | null;
  status: string;
}) {
  return {
    approvalStatus: input.approvalStatus,
    approvedAt: input.approvedAt?.toISOString() ?? null,
    approvedByUserId: input.approvedByUserId ?? null,
    deliveredAt: input.deliveredAt?.toISOString() ?? null,
    deliveryChannel: input.deliveryChannel ?? null,
    deliveryErrorCode: input.deliveryErrorCode ?? null,
    deliveryErrorMessage: input.deliveryErrorMessage ?? null,
    deliveryFailedAt: input.deliveryFailedAt?.toISOString() ?? null,
    deliveryNotes: input.deliveryNotes ?? null,
    deliveryProvider: input.deliveryProvider ?? null,
    deliveryStatus: input.deliveryStatus ?? null,
    deliveryTemplateKey: input.deliveryTemplateKey ?? null,
    deliveryTemplateVersion: input.deliveryTemplateVersion ?? null,
    providerMessageId: input.providerMessageId ?? null,
    sentAt: input.sentAt?.toISOString() ?? null,
    sentByUserId: input.sentByUserId ?? null,
    status: input.status
  };
}
async function updateOnboardingChecklistItem(input: {
  actor: AuthorizedDevPortalSession;
  id: string;
  itemType: WorkbenchItemType;
  key: string;
  request: Pick<FastifyRequest, "id" | "ip" | "log">;
  status: TaskStatus;
}) {
  if (input.itemType !== "owner-lead") {
    return null;
  }

  const source = await loadOpsCaseSource(input.itemType, input.id);

  if (!source) {
    await writeMissingCaseSourceAudit({
      action: "ops.case.conversion.checklist.update",
      actor: input.actor,
      id: input.id,
      itemType: input.itemType,
      request: input.request
    });
    return null;
  }

  const opsCase = await ensureOpsCaseForSource(source);
  const onboarding = await prisma.propertyOnboarding.findUnique({
    where: {
      ownerLeadId: source.sourceId
    }
  });

  if (!onboarding) {
    await writeMissingConversionAudit({
      action: "ops.case.conversion.checklist.update",
      actor: input.actor,
      entityType: "PropertyOnboarding",
      opsCaseId: opsCase.id,
      request: input.request
    });
    return null;
  }

  const checklist = parseOnboardingChecklist(onboarding.checklist);
  const nextChecklist = checklist.map((item) =>
    item.key === input.key ? { ...item, status: input.status } : item
  );
  const previousItem = checklist.find((item) => item.key === input.key);

  if (!previousItem) {
    await writeOpsAudit({
      action: "ops.case.conversion.checklist.update",
      actorUserId: input.actor.user.id,
      entityId: onboarding.id,
      entityType: "PropertyOnboarding",
      nextValue: {
        attemptedKey: input.key,
        status: input.status
      },
      reason: "checklist_item_not_found",
      request: input.request,
      result: "DENIED"
    });
    return null;
  }

  const updated = await prisma.propertyOnboarding.update({
    data: {
      checklist: nextChecklist
    },
    where: {
      id: onboarding.id
    }
  });
  const caseDetail = buildOpsCaseDetail(await loadOpsCaseById(opsCase.id), source);

  await writeOpsAudit({
    action: "ops.case.conversion.checklist.update",
    actorUserId: input.actor.user.id,
    entityId: updated.id,
    entityType: "PropertyOnboarding",
    previousValue: {
      key: input.key,
      status: previousItem.status
    },
    nextValue: {
      key: input.key,
      status: input.status
    },
    reason: "property_onboarding_checklist_updated",
    request: input.request,
    result: "SUCCESS"
  });

  return {
    caseDetail,
    conversion: caseDetail.conversion
  };
}

async function createStayProposalVersion(input: {
  actor: AuthorizedDevPortalSession;
  body: z.infer<typeof proposalVersionCreateSchema>;
  id: string;
  itemType: WorkbenchItemType;
  request: Pick<FastifyRequest, "id" | "ip" | "log">;
}) {
  if (input.itemType !== "stay-proposal-request") {
    return null;
  }

  const source = await loadOpsCaseSource(input.itemType, input.id);

  if (!source) {
    await writeMissingCaseSourceAudit({
      action: "ops.case.conversion.version.create",
      actor: input.actor,
      id: input.id,
      itemType: input.itemType,
      request: input.request
    });
    return null;
  }

  const opsCase = await ensureOpsCaseForSource(source);
  const proposal = await prisma.stayProposal.findUnique({
    where: {
      proposalRequestId: source.sourceId
    }
  });

  if (!proposal) {
    await writeMissingConversionAudit({
      action: "ops.case.conversion.version.create",
      actor: input.actor,
      entityType: "StayProposal",
      opsCaseId: opsCase.id,
      request: input.request
    });
    return null;
  }

  const nextVersion = proposal.currentVersion + 1;
  const version = await prisma.$transaction(async (tx) => {
    const createdVersion = await tx.stayProposalVersion.create({
      data: {
        internalNotes: normalizeNullableText(input.body.internalNotes),
        stayProposalId: proposal.id,
        summary: input.body.summary,
        termsLabel: input.body.termsLabel,
        title: `Propuesta v${nextVersion} - ${proposal.stayName}`,
        version: nextVersion
      }
    });

    await tx.stayProposal.update({
      data: {
        currentVersion: nextVersion,
        status: "DRAFT"
      },
      where: {
        id: proposal.id
      }
    });

    return createdVersion;
  });
  const caseDetail = buildOpsCaseDetail(await loadOpsCaseById(opsCase.id), source);

  await writeOpsAudit({
    action: "ops.case.conversion.version.create",
    actorUserId: input.actor.user.id,
    entityId: version.id,
    entityType: "StayProposalVersion",
    nextValue: {
      stayProposalId: proposal.id,
      version: nextVersion
    },
    reason: "stay_proposal_version_created",
    request: input.request,
    result: "SUCCESS"
  });

  return {
    caseDetail,
    conversion: caseDetail.conversion
  };
}

async function writeMissingConversionAudit(input: {
  action: string;
  actor: AuthorizedDevPortalSession;
  entityType: "PropertyOnboarding" | "StayProposal";
  opsCaseId: string;
  request: Pick<FastifyRequest, "id" | "ip" | "log">;
}) {
  await writeOpsAudit({
    action: input.action,
    actorUserId: input.actor.user.id,
    entityId: input.opsCaseId,
    entityType: input.entityType,
    reason: "case_conversion_not_found",
    request: input.request,
    result: "DENIED"
  });
}

function parseOnboardingChecklist(value: Prisma.JsonValue) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      return [];
    }

    const candidate = item as Record<string, unknown>;

    if (typeof candidate.key !== "string" || typeof candidate.label !== "string") {
      return [];
    }

    const status = candidate.status === "DONE" ? "DONE" : "OPEN";

    return [
      {
        key: candidate.key,
        label: candidate.label,
        status
      }
    ];
  });
}

function normalizeRequiredText(value: string | undefined, fallback: string) {
  const normalized = value?.trim();

  return normalized ? normalized : fallback;
}

async function writeMissingCaseSourceAudit(input: {
  action: string;
  actor: AuthorizedDevPortalSession;
  id: string;
  itemType: WorkbenchItemType;
  request: Pick<FastifyRequest, "id" | "ip" | "log">;
}) {
  await writeOpsAudit({
    action: input.action,
    actorUserId: input.actor.user.id,
    entityId: input.id,
    entityType: resolveEntityType(input.itemType),
    nextValue: {
      itemType: input.itemType
    },
    reason: "workbench_item_not_found",
    request: input.request,
    result: "DENIED"
  });
}

function buildOwnerLeadItem(lead: OwnerLeadRecord) {
  return {
    kind: "ownerLead" as const,
    id: lead.id,
    title: lead.propertyName ?? lead.propertyType,
    primaryName: lead.ownerName,
    email: lead.email,
    phone: lead.phone,
    location: lead.propertyLocation,
    propertyType: lead.propertyType,
    operatingStatus: lead.operatingStatus,
    message: lead.message,
    source: lead.source,
    status: lead.status,
    statusLabel: statusLabels[lead.status],
    createdAt: lead.createdAt.toISOString(),
    updatedAt: lead.updatedAt.toISOString(),
    summary: `${lead.propertyType} en ${lead.propertyLocation}`
  };
}

function buildProposalRequestItem(request: ProposalRequestRecord) {
  return {
    kind: "proposalRequest" as const,
    id: request.id,
    title: request.stayName,
    primaryName: request.guestName,
    email: request.email,
    phone: request.phone,
    location: request.destination,
    stayId: request.stayId,
    arrivalDate: request.arrivalDate?.toISOString(),
    departureDate: request.departureDate?.toISOString(),
    guests: request.guests,
    message: request.message,
    source: request.source,
    status: request.status,
    statusLabel: statusLabels[request.status],
    createdAt: request.createdAt.toISOString(),
    updatedAt: request.updatedAt.toISOString(),
    summary: `${request.guests} huesped(es), ${request.destination}`
  };
}

function buildOpsCaseDetail(opsCase: OpsCaseWithRelations, source: OpsCaseSource) {
  const openTasks = opsCase.tasks.filter((task) => task.status === "OPEN").length;

  return {
    id: opsCase.id,
    source: {
      entityType: source.entityType,
      item: source.item,
      sourceId: source.sourceId,
      sourceType: source.sourceType
    },
    status: opsCase.status,
    statusLabel: caseStatusLabels[opsCase.status],
    priority: opsCase.priority,
    priorityLabel: priorityLabels[opsCase.priority as Priority] ?? opsCase.priority,
    nextStep: opsCase.nextStep,
    contact: {
      email: opsCase.contactEmail,
      name: opsCase.contactName,
      phone: opsCase.contactPhone
    },
    conversion: buildOpsCaseConversion(opsCase),
    metrics: {
      noteCount: opsCase.notes.length,
      openTaskCount: openTasks,
      taskCount: opsCase.tasks.length
    },
    options: {
      priorities: prioritySchema.options.map((priority) => ({
        label: priorityLabels[priority],
        value: priority
      })),
      statuses: caseStatusSchema.options.map((status) => ({
        label: caseStatusLabels[status],
        value: status
      })),
      taskStatuses: taskStatusSchema.options.map((status) => ({
        label: taskStatusLabels[status],
        value: status
      }))
    },
    notes: opsCase.notes.map((note) => ({
      author: note.author
        ? {
            displayName: note.author.displayName,
            email: note.author.email,
            id: note.author.id
          }
        : null,
      body: note.body,
      createdAt: note.createdAt.toISOString(),
      id: note.id
    })),
    tasks: opsCase.tasks.map((task) => ({
      createdAt: task.createdAt.toISOString(),
      dueLabel: task.dueLabel,
      id: task.id,
      priority: task.priority,
      priorityLabel: priorityLabels[task.priority as Priority] ?? task.priority,
      sortOrder: task.sortOrder,
      status: task.status,
      statusLabel: taskStatusLabels[task.status],
      title: task.title,
      updatedAt: task.updatedAt.toISOString()
    })),
    createdAt: opsCase.createdAt.toISOString(),
    updatedAt: opsCase.updatedAt.toISOString()
  };
}

function buildOpsCaseConversion(opsCase: OpsCaseWithRelations) {
  if (opsCase.propertyOnboarding) {
    const entityType = "PropertyOnboarding";
    const entityId = opsCase.propertyOnboarding.id;
    const latestDelivery = findLatestFormalDelivery(opsCase, entityType, entityId);

    return {
      kind: "propertyOnboarding" as const,
      id: entityId,
      label: "Onboarding propiedad",
      status: opsCase.propertyOnboarding.status,
      statusLabel: propertyOnboardingStatusLabels[opsCase.propertyOnboarding.status],
      nextMilestone: opsCase.propertyOnboarding.nextMilestone,
      checklist: opsCase.propertyOnboarding.checklist as Array<{
        key: string;
        label: string;
        status: string;
      }>,
      assignee: buildUserSummary(opsCase.propertyOnboarding.assignedUser),
      targetDate: formatDateOnly(opsCase.propertyOnboarding.targetDate),
      handoffNotes: opsCase.propertyOnboarding.handoffNotes,
      formalState: buildFormalApprovalState(opsCase.propertyOnboarding, latestDelivery),
      contract: buildOpsContractState(opsCase.propertyOnboarding.contract, opsCase.propertyOnboarding.approvalStatus),
      activation: buildOpsPropertyActivationState(opsCase.propertyOnboarding),
      activities: buildFormalActivities(opsCase, entityType, entityId),
      deliveries: buildFormalDeliveries(opsCase, entityType, entityId),
      createdAt: opsCase.propertyOnboarding.createdAt.toISOString(),
      updatedAt: opsCase.propertyOnboarding.updatedAt.toISOString()
    };
  }

  if (opsCase.stayProposal) {
    const entityType = "StayProposal";
    const entityId = opsCase.stayProposal.id;
    const latestDelivery = findLatestFormalDelivery(opsCase, entityType, entityId);

    return {
      kind: "stayProposal" as const,
      id: entityId,
      label: "Propuesta estancia",
      status: opsCase.stayProposal.status,
      statusLabel: stayProposalStatusLabels[opsCase.stayProposal.status],
      currentVersion: opsCase.stayProposal.currentVersion,
      stayName: opsCase.stayProposal.stayName,
      assignee: buildUserSummary(opsCase.stayProposal.assignedUser),
      targetDate: formatDateOnly(opsCase.stayProposal.targetDate),
      handoffNotes: opsCase.stayProposal.handoffNotes,
      formalState: buildFormalApprovalState(opsCase.stayProposal, latestDelivery),
      activities: buildFormalActivities(opsCase, entityType, entityId),
      deliveries: buildFormalDeliveries(opsCase, entityType, entityId),
      preview: buildStayProposalPreview(opsCase.stayProposal),
      versions: opsCase.stayProposal.versions.map((version) => ({
        createdAt: version.createdAt.toISOString(),
        id: version.id,
        internalNotes: version.internalNotes,
        summary: version.summary,
        termsLabel: version.termsLabel,
        title: version.title,
        version: version.version
      })),
      createdAt: opsCase.stayProposal.createdAt.toISOString(),
      updatedAt: opsCase.stayProposal.updatedAt.toISOString()
    };
  }

  return null;
}

function buildOpsPropertyActivationState(onboarding: NonNullable<OpsCaseWithRelations["propertyOnboarding"]>) {
  const contract = onboarding.contract;
  const property = contract?.property ?? null;
  const propertyWithInventory = property as typeof property & {
    images?: Array<{ isCover: boolean; url: string }>;
    ratePlans?: Array<{ active: boolean; name: string; unitId: string }>;
    stayCodes?: Array<{ active: boolean; code: string; unitId: string | null }>;
    units?: Array<{ id: string; name: string }>;
  };
  const firstUnit = propertyWithInventory?.units?.[0] ?? null;
  const activeRatePlan = firstUnit
    ? propertyWithInventory?.ratePlans?.find((ratePlan) => ratePlan.active && ratePlan.unitId === firstUnit.id) ?? null
    : null;
  const activeStayCode = firstUnit
    ? propertyWithInventory?.stayCodes?.find((stayCode) => stayCode.active && stayCode.unitId === firstUnit.id) ?? null
    : null;
  const imageCount = propertyWithInventory?.images?.length ?? 0;
  const coverImage = propertyWithInventory?.images?.find((image) => image.isCover) ?? propertyWithInventory?.images?.[0] ?? null;
  const isActive = Boolean(
    contract?.status === "ACTIVE" &&
      property?.visibility === "PUBLIC" &&
      firstUnit &&
      activeRatePlan &&
      activeStayCode &&
      imageCount >= 3
  );

  return {
    canActivate: contract?.status === "ACTIVE" && !isActive,
    coverImageUrl: coverImage?.url ?? null,
    imageCount,
    isActive,
    propertyId: property?.id ?? null,
    propertyVisibility: property?.visibility ?? null,
    ratePlanName: activeRatePlan?.name ?? null,
    statusLabel: isActive
      ? "Publicada y reservable"
      : contract?.status === "ACTIVE"
        ? "Lista para alta comercial"
        : "Pendiente de contrato activo",
    stayCode: activeStayCode?.code ?? null,
    unitName: firstUnit?.name ?? null
  };
}
function buildOpsContractState(
  contract: {
    currentVersion: number;
    id: string;
    issuedAt: Date | null;
    owner: { displayName: string };
    property: { name: string };
    signedAt: Date | null;
    signatureProvider: string | null;
    signatureProviderRef: string | null;
    status: ContractStatus;
    summary: string | null;
    title: string | null;
    versions: Array<{ createdAt: Date; id: string; issuedAt: Date | null; summary: string | null; title: string | null; version: number }>;
  } | null,
  approvalStatus: keyof typeof formalApprovalStatusLabels
) {
  if (!contract) {
    return {
      canIssue: approvalStatus === "APPROVED" || approvalStatus === "SENT",
      currentVersion: 0,
      id: null,
      issuedAt: null,
      ownerName: null,
      propertyName: null,
      signedAt: null,
      signatureProvider: null,
      signatureProviderRef: null,
      status: "DRAFT" as ContractStatus,
      statusLabel: contractStatusLabels.DRAFT,
      summary: null,
      title: null,
      versions: []
    };
  }

  return {
    canIssue:
      (approvalStatus === "APPROVED" || approvalStatus === "SENT") &&
      contract.status !== "ISSUED" &&
      contract.status !== "ACTIVE",
    currentVersion: contract.currentVersion,
    id: contract.id,
    issuedAt: contract.issuedAt?.toISOString() ?? null,
    ownerName: contract.owner.displayName,
    propertyName: contract.property.name,
    signedAt: contract.signedAt?.toISOString() ?? null,
    signatureProvider: contract.signatureProvider,
    signatureProviderRef: contract.signatureProviderRef,
    status: contract.status,
    statusLabel: contractStatusLabels[contract.status],
    summary: contract.summary,
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
function findLatestFormalDelivery(
  opsCase: OpsCaseWithRelations,
  entityType: string,
  entityId: string
): FormalDeliveryRecord | null {
  return (
    opsCase.formalDeliveries.find(
      (delivery) => delivery.entityType === entityType && delivery.entityId === entityId
    ) ?? null
  );
}

function buildFormalApprovalState(
  input: {
    approvalStatus: keyof typeof formalApprovalStatusLabels;
    approvedAt: Date | null;
    approvedBy?: { displayName: string; email: string; id: string } | null;
    deliveredAt: Date | null;
    deliveryChannel: string | null;
    deliveryErrorMessage: string | null;
    deliveryFailedAt: Date | null;
    deliveryNotes: string | null;
    deliveryProvider: string | null;
    deliveryStatus: keyof typeof formalDeliveryStatusLabels | null;
    deliveryTemplateKey: string | null;
    deliveryTemplateVersion: number | null;
    providerMessageId: string | null;
    sentAt: Date | null;
    sentBy?: { displayName: string; email: string; id: string } | null;
  },
  latestDelivery: FormalDeliveryRecord | null
) {
  const deliveryStatus = latestDelivery?.status ?? input.deliveryStatus;

  return {
    status: input.approvalStatus,
    statusLabel: formalApprovalStatusLabels[input.approvalStatus],
    approvedAt: input.approvedAt?.toISOString() ?? null,
    approvedBy: buildUserSummary(input.approvedBy),
    canSend: input.approvalStatus === "APPROVED",
    delivery: deliveryStatus
      ? {
          acceptedAt: latestDelivery?.acceptedAt?.toISOString() ?? null,
          attemptCount: latestDelivery?.attemptCount ?? 0,
          channel: latestDelivery?.channel ?? input.deliveryChannel,
          deliveredAt: (latestDelivery?.deliveredAt ?? input.deliveredAt)?.toISOString() ?? null,
          errorMessage: latestDelivery?.errorMessage ?? input.deliveryErrorMessage,
          failedAt: (latestDelivery?.failedAt ?? input.deliveryFailedAt)?.toISOString() ?? null,
          lastAttemptAt: latestDelivery?.lastAttemptAt?.toISOString() ?? null,
          maxAttempts: latestDelivery?.maxAttempts ?? 0,
          nextAttemptAt: latestDelivery?.nextAttemptAt?.toISOString() ?? null,
          provider: latestDelivery?.provider ?? input.deliveryProvider,
          providerMessageId: latestDelivery?.providerMessageId ?? input.providerMessageId,
          retryable:
            latestDelivery?.status === "FAILED" &&
            latestDelivery.nextAttemptAt !== null &&
            latestDelivery.attemptCount < latestDelivery.maxAttempts,
          status: deliveryStatus,
          statusLabel: formalDeliveryStatusLabels[deliveryStatus],
          templateKey: latestDelivery?.templateKey ?? input.deliveryTemplateKey,
          templateVersion: latestDelivery?.templateVersion ?? input.deliveryTemplateVersion
        }
      : null,
    deliveryNotes: input.deliveryNotes,
    sentAt: input.sentAt?.toISOString() ?? null,
    sentBy: buildUserSummary(input.sentBy)
  };
}
function buildFormalDeliveries(
  opsCase: OpsCaseWithRelations,
  entityType: string,
  entityId: string
) {
  return opsCase.formalDeliveries
    .filter((delivery) => delivery.entityType === entityType && delivery.entityId === entityId)
    .map((delivery) => ({
      acceptedAt: delivery.acceptedAt?.toISOString() ?? null,
      actor: buildUserSummary(delivery.actor),
      attemptCount: delivery.attemptCount,
      channel: delivery.channel,
      createdAt: delivery.createdAt.toISOString(),
      deliveredAt: delivery.deliveredAt?.toISOString() ?? null,
      errorMessage: delivery.errorMessage,
      failedAt: delivery.failedAt?.toISOString() ?? null,
      id: delivery.id,
      lastAttemptAt: delivery.lastAttemptAt?.toISOString() ?? null,
      maxAttempts: delivery.maxAttempts,
      nextAttemptAt: delivery.nextAttemptAt?.toISOString() ?? null,
      provider: delivery.provider,
      providerMessageId: delivery.providerMessageId,
      recipientMasked: delivery.recipientMasked,
      retryable:
        delivery.status === "FAILED" &&
        delivery.nextAttemptAt !== null &&
        delivery.attemptCount < delivery.maxAttempts,
      sentAt: delivery.sentAt?.toISOString() ?? null,
      status: delivery.status,
      statusLabel: formalDeliveryStatusLabels[delivery.status],
      subject: delivery.subject,
      templateKey: delivery.templateKey,
      templateVersion: delivery.templateVersion
    }));
}
function buildFormalActivities(
  opsCase: OpsCaseWithRelations,
  entityType: string,
  entityId: string
) {
  return opsCase.formalActivities
    .filter((activity) => activity.entityType === entityType && activity.entityId === entityId)
    .map((activity) => ({
      actor: buildUserSummary(activity.actor),
      body: activity.body,
      createdAt: activity.createdAt.toISOString(),
      id: activity.id
    }));
}

function buildStayProposalPreview(proposal: NonNullable<OpsCaseWithRelations["stayProposal"]>) {
  const latestVersion = proposal.versions[0];
  const stayWindow = buildStayWindowLabel(proposal.arrivalDate, proposal.departureDate);
  const summary = latestVersion?.summary ?? `Solicitud para ${proposal.stayName}.`;
  const termsLabel = latestVersion?.termsLabel ?? "Condiciones pendientes de validar.";

  return {
    recipientEmail: proposal.guestEmail,
    recipientName: proposal.guestName,
    readinessLabel:
      proposal.status === "READY_TO_SEND" ? "Lista para aprobacion interna" : "Borrador interno",
    subject: `Propuesta KUQUBA - ${proposal.stayName}`,
    body: [
      `Hola ${proposal.guestName},`,
      `Tenemos una propuesta para ${proposal.stayName} en ${proposal.destination}.`,
      `Fechas: ${stayWindow}. Huespedes: ${proposal.guests}.`,
      summary,
      `Condiciones: ${termsLabel}.`,
      "Preview interno: no se envia ninguna comunicacion real desde esta pantalla."
    ]
  };
}

function hashDestination(destination: string) {
  return createHash("sha256").update(destination.trim().toLowerCase()).digest("hex");
}

function maskDestination(destination: string) {
  const trimmed = destination.trim();

  if (trimmed.includes("@")) {
    const [name = "", domain = ""] = trimmed.split("@");
    return `${name.slice(0, 2)}***@${domain}`;
  }

  return `${trimmed.slice(0, 4)}***${trimmed.slice(-2)}`;
}

function buildStayWindowLabel(arrivalDate: Date | null, departureDate: Date | null) {
  if (!arrivalDate && !departureDate) {
    return "flexibles";
  }

  if (!arrivalDate || !departureDate) {
    return formatDateOnly(arrivalDate ?? departureDate) ?? "flexibles";
  }

  return `${formatDateOnly(arrivalDate)} a ${formatDateOnly(departureDate)}`;
}

function buildUserSummary(
  user: { displayName: string; email: string; id: string } | null | undefined
) {
  if (!user) {
    return null;
  }

  return {
    displayName: user.displayName,
    email: user.email,
    id: user.id
  };
}

function resolveFormalEntity(opsCase: OpsCaseWithRelations) {
  if (opsCase.propertyOnboarding) {
    return {
      entityId: opsCase.propertyOnboarding.id,
      entityType: "PropertyOnboarding" as const
    };
  }

  if (opsCase.stayProposal) {
    return {
      entityId: opsCase.stayProposal.id,
      entityType: "StayProposal" as const
    };
  }

  return null;
}

function applyFormalAssignmentUpdate(
  data: Prisma.PropertyOnboardingUpdateInput | Prisma.StayProposalUpdateInput,
  input: {
    actor: AuthorizedDevPortalSession;
    body: z.infer<typeof conversionUpdateSchema>;
  }
) {
  const target = data as Record<string, unknown>;

  if (input.body.assigneeAction === "ASSIGN_SELF") {
    target.assignedUser = {
      connect: {
        id: input.actor.user.id
      }
    };
  }

  if (input.body.assigneeAction === "CLEAR") {
    target.assignedUser = {
      disconnect: true
    };
  }

  if (Object.prototype.hasOwnProperty.call(input.body, "handoffNotes")) {
    target.handoffNotes = normalizeNullableText(input.body.handoffNotes);
  }

  if (Object.prototype.hasOwnProperty.call(input.body, "targetDate")) {
    target.targetDate = input.body.targetDate ? parseDateOnly(input.body.targetDate) : null;
  }
}
function resolveEntityType(itemType: WorkbenchItemType): OpsCaseEntityType {
  return itemType === "owner-lead" ? "OwnerLead" : "StayProposalRequest";
}

function normalizeNullableText(value: string | null | undefined) {
  const normalized = value?.trim();

  return normalized ? normalized : null;
}

function parseDateOnly(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

function formatDateOnly(value: Date | null | undefined) {
  return value ? value.toISOString().slice(0, 10) : null;
}

function toDateOnly(value: Date) {
  return value.toISOString().slice(0, 10);
}

function differenceInNights(arrivalDate: Date, departureDate: Date) {
  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  return Math.max(0, Math.round((departureDate.getTime() - arrivalDate.getTime()) / millisecondsPerDay));
}

async function writeOpsAudit(input: {
  action: string;
  actorUserId?: string;
  entityId?: string;
  entityType: string;
  nextValue?: Prisma.InputJsonValue;
  previousValue?: Prisma.InputJsonValue;
  reason: string;
  request: Pick<FastifyRequest, "id" | "ip" | "log">;
  result: "SUCCESS" | "PENDING" | "DENIED" | "FAILED";
}) {
  const auditEvent = createAuditEventEnvelope({
    action: input.action,
    actorUserId: input.actorUserId,
    entityId: input.entityId,
    entityType: input.entityType,
    ipAddress: input.request.ip,
    correlationId: input.request.id,
    nextValue: input.nextValue,
    previousValue: input.previousValue,
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
      previousValue: auditEvent.previousValue as Prisma.InputJsonValue | undefined,
      result: auditEvent.result,
      reason: auditEvent.reason
    }
  });

  input.request.log.info({ auditEvent }, "audit.event");
}









