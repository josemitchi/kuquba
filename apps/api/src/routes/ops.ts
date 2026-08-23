import type { Prisma } from "@prisma/client";
import type { FastifyPluginAsync, FastifyRequest } from "fastify";
import { z } from "zod";

import { prisma } from "../lib/prisma";
import { createAuditEventEnvelope } from "../modules/audit/audit-event";
import { authorizeDevPortalSession, type AuthorizedDevPortalSession } from "../modules/identity/dev-session";

const opsReadPermissions = ["operation:calendar:read", "audit:event:read"];
const opsUpdatePermissions = ["operation:task:update"];
const reviewStatusSchema = z.enum(["NEW", "REVIEWING", "CONTACTED", "CLOSED"]);
const caseStatusSchema = z.enum(["OPEN", "QUALIFYING", "ACTION_PENDING", "CLOSED"]);
const taskStatusSchema = z.enum(["OPEN", "DONE"]);
const propertyOnboardingStatusSchema = z.enum(["DRAFT", "QUALIFICATION", "DOCUMENTS", "OPERATIONS_READY", "CLOSED"]);
const stayProposalStatusSchema = z.enum(["DRAFT", "READY_TO_SEND", "SENT", "ACCEPTED", "DECLINED", "VOID"]);
const prioritySchema = z.enum(["high", "normal", "medium", "low"]);
const workbenchParamsSchema = z.object({
  id: z.string().uuid(),
  itemType: z.enum(["owner-lead", "stay-proposal-request"])
});
const caseTaskParamsSchema = workbenchParamsSchema.extend({
  taskId: z.string().uuid()
});
const caseChecklistParamsSchema = workbenchParamsSchema.extend({
  key: z.string().trim().min(2).max(80).regex(/^[a-z0-9_:-]+$/)
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
const conversionUpdateSchema = z.object({
  nextMilestone: z.string().trim().max(180).optional(),
  status: z.string().trim().optional()
});
const checklistUpdateSchema = z.object({
  status: taskStatusSchema
});
const proposalVersionCreateSchema = z.object({
  internalNotes: z.string().trim().max(500).optional(),
  summary: z.string().trim().min(8).max(700),
  termsLabel: z.string().trim().min(4).max(160)
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

const sourceTypeByItemType: Record<WorkbenchItemType, OpsCaseSourceType> = {
  "owner-lead": "OWNER_LEAD",
  "stay-proposal-request": "STAY_PROPOSAL_REQUEST"
};

type ReviewStatus = z.infer<typeof reviewStatusSchema>;
type CaseStatus = z.infer<typeof caseStatusSchema>;
type TaskStatus = z.infer<typeof taskStatusSchema>;
type Priority = z.infer<typeof prioritySchema>;
type OwnerLeadRecord = Awaited<ReturnType<typeof loadOwnerLeads>>[number];
type ProposalRequestRecord = Awaited<ReturnType<typeof loadProposalRequests>>[number];
type WorkbenchItem = ReturnType<typeof buildOwnerLeadItem> | ReturnType<typeof buildProposalRequestItem>;
type WorkbenchItemType = "owner-lead" | "stay-proposal-request";
type OpsCaseSourceType = "OWNER_LEAD" | "STAY_PROPOSAL_REQUEST";
type OpsCaseEntityType = "OwnerLead" | "StayProposalRequest";
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
    propertyOnboarding: true;
    stayProposal: {
      include: {
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
      requiredPermissions: opsUpdatePermissions
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
      requiredPermissions: opsUpdatePermissions
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
      requiredPermissions: opsUpdatePermissions
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
            "StayProposalVersion"
          ]
        }
      }
    })
  ]);

  const ownerLeadItems = ownerLeads.map(buildOwnerLeadItem);
  const proposalRequestItems = proposalRequests.map(buildProposalRequestItem);
  const pendingCount = [...ownerLeadItems, ...proposalRequestItems].filter((item) =>
    item.status === "NEW" || item.status === "REVIEWING"
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

async function loadOpsCaseSource(itemType: WorkbenchItemType, id: string): Promise<OpsCaseSource | null> {
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
      propertyOnboarding: true,
      stayProposal: {
        include: {
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
      arrivalDate: input.source.item.arrivalDate ? new Date(input.source.item.arrivalDate) : null,
      currentVersion: 1,
      departureDate: input.source.item.departureDate ? new Date(input.source.item.departureDate) : null,
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
      departureDate: input.source.item.departureDate ? new Date(input.source.item.departureDate) : null,
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
      internalNotes: "Borrador creado desde expediente ops. Validar disponibilidad antes de enviar.",
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
        nextMilestone: previous.nextMilestone,
        status: previous.status
      },
      nextValue: {
        nextMilestone: updated.nextMilestone,
        status: updated.status
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

  const status = input.body.status ? stayProposalStatusSchema.parse(input.body.status) : previous.status;
  const updated = await prisma.stayProposal.update({
    data: {
      status
    },
    where: {
      id: previous.id
    }
  });
  const caseDetail = buildOpsCaseDetail(await loadOpsCaseById(opsCase.id), source);

  await writeOpsAudit({
    action: "ops.case.conversion.update",
    actorUserId: input.actor.user.id,
    entityId: updated.id,
    entityType: "StayProposal",
    previousValue: {
      status: previous.status
    },
    nextValue: {
      status: updated.status
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
  const nextChecklist = checklist.map((item) => (item.key === input.key ? { ...item, status: input.status } : item));
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
    return {
      kind: "propertyOnboarding" as const,
      id: opsCase.propertyOnboarding.id,
      label: "Onboarding propiedad",
      status: opsCase.propertyOnboarding.status,
      statusLabel: propertyOnboardingStatusLabels[opsCase.propertyOnboarding.status],
      nextMilestone: opsCase.propertyOnboarding.nextMilestone,
      checklist: opsCase.propertyOnboarding.checklist as Array<{ key: string; label: string; status: string }>,
      createdAt: opsCase.propertyOnboarding.createdAt.toISOString(),
      updatedAt: opsCase.propertyOnboarding.updatedAt.toISOString()
    };
  }

  if (opsCase.stayProposal) {
    return {
      kind: "stayProposal" as const,
      id: opsCase.stayProposal.id,
      label: "Propuesta estancia",
      status: opsCase.stayProposal.status,
      statusLabel: stayProposalStatusLabels[opsCase.stayProposal.status],
      currentVersion: opsCase.stayProposal.currentVersion,
      stayName: opsCase.stayProposal.stayName,
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
function resolveEntityType(itemType: WorkbenchItemType): OpsCaseEntityType {
  return itemType === "owner-lead" ? "OwnerLead" : "StayProposalRequest";
}

function normalizeNullableText(value: string | null | undefined) {
  const normalized = value?.trim();

  return normalized ? normalized : null;
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