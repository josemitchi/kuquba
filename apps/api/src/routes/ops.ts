import type { Prisma } from "@prisma/client";
import type { FastifyPluginAsync, FastifyRequest } from "fastify";
import { z } from "zod";

import { prisma } from "../lib/prisma";
import { createAuditEventEnvelope } from "../modules/audit/audit-event";
import { authorizeDevPortalSession, type AuthorizedDevPortalSession } from "../modules/identity/dev-session";

const opsReadPermissions = ["operation:calendar:read", "audit:event:read"];
const opsUpdatePermissions = ["operation:task:update"];
const reviewStatusSchema = z.enum(["NEW", "REVIEWING", "CONTACTED", "CLOSED"]);
const workbenchParamsSchema = z.object({
  id: z.string().uuid(),
  itemType: z.enum(["owner-lead", "stay-proposal-request"])
});
const statusUpdateSchema = z.object({
  status: reviewStatusSchema
});

const statusLabels: Record<ReviewStatus, string> = {
  NEW: "Nuevo",
  REVIEWING: "En revision",
  CONTACTED: "Contactado",
  CLOSED: "Cerrado"
};

type ReviewStatus = z.infer<typeof reviewStatusSchema>;
type OwnerLeadRecord = Awaited<ReturnType<typeof loadOwnerLeads>>[number];
type ProposalRequestRecord = Awaited<ReturnType<typeof loadProposalRequests>>[number];
type WorkbenchItemType = "owner-lead" | "stay-proposal-request";

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
        entityType: params.itemType === "owner-lead" ? "OwnerLead" : "StayProposalRequest",
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
          in: ["OwnerLead", "StayProposalRequest", "OpsWorkbench"]
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
