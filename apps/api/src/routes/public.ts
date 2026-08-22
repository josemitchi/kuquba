import { createHash } from "node:crypto";

import { accessOptions, kuqubaBrand, publicNavigation, trustPillars } from "@kuquba/config";
import type { Prisma } from "@prisma/client";
import type { FastifyPluginAsync, FastifyRequest } from "fastify";
import { z } from "zod";

import { prisma } from "../lib/prisma";
import { createAuditEventEnvelope } from "../modules/audit/audit-event";

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

    if (parseDateOnly(value.departureDate).getTime() <= parseDateOnly(value.arrivalDate).getTime()) {
      context.addIssue({
        code: "custom",
        message: "departure_after_arrival_required",
        path: ["departureDate"]
      });
    }
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
  app.get("/bootstrap", async () => ({
    brand: kuqubaBrand,
    navigation: publicNavigation,
    accessOptions,
    trustPillars,
    featureFlags: {
      search: "static-shell",
      stayProposalRequests: "persisted-dev",
      ownerLead: "persisted-dev",
      ownerPortal: "persisted-dev",
      payments: "adapter-pending"
    }
  }));

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
