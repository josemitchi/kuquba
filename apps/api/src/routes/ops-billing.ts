import { Prisma } from "@prisma/client";
import type { FastifyPluginAsync, FastifyRequest } from "fastify";
import { z } from "zod";

import { prisma } from "../lib/prisma";
import { createAuditEventEnvelope } from "../modules/audit/audit-event";
import {
  authorizeDevPortalSession,
  type AuthorizedDevPortalSession
} from "../modules/identity/dev-session";

const billingReadPermissions = ["finance:ledger:read"];
const billingUpdatePermissions = ["finance:ledger:read", "operation:task:update"];

const chargeCategoryValues = [
  "ACCOMMODATION",
  "SERVICE",
  "DIGITAL_PLATFORM",
  "PAYMENT_PROCESSING",
  "TAX",
  "DISCOUNT",
  "ADJUSTMENT"
] as const;
const chargeCalculationMethodValues = ["FIXED", "PER_NIGHT", "PERCENTAGE", "PASS_THROUGH"] as const;
const beneficiaryTypeValues = [
  "OWNER",
  "KUQUBA",
  "PROVIDER",
  "PAYMENT_PROCESSOR",
  "TAX_AUTHORITY",
  "GUEST"
] as const;

const chargeCategoryLabels = {
  ACCOMMODATION: "Hospedaje",
  ADJUSTMENT: "Ajuste",
  DIGITAL_PLATFORM: "Plataforma digital",
  DISCOUNT: "Descuento",
  PAYMENT_PROCESSING: "Procesamiento de pago",
  SERVICE: "Servicio adicional",
  TAX: "Impuesto"
} as const;
const chargeCalculationMethodLabels = {
  FIXED: "Monto fijo",
  PASS_THROUGH: "Traslado",
  PERCENTAGE: "Porcentaje",
  PER_NIGHT: "Por noche"
} as const;
const beneficiaryTypeLabels = {
  GUEST: "Huesped",
  KUQUBA: "KUQUBA",
  OWNER: "Propietario",
  PAYMENT_PROCESSOR: "Procesador de pago",
  PROVIDER: "Proveedor",
  TAX_AUTHORITY: "Autoridad fiscal"
} as const;

const chargeCategorySchema = z.enum(chargeCategoryValues);
const chargeCalculationMethodSchema = z.enum(chargeCalculationMethodValues);
const beneficiaryTypeSchema = z.enum(beneficiaryTypeValues);
const codeSchema = z
  .string()
  .trim()
  .min(2)
  .max(80)
  .regex(/^[A-Za-z0-9_:-]+$/)
  .transform(normalizeCode);
const nullableUuidSchema = z
  .preprocess(
    (value) => (value === "" || value === null || typeof value === "undefined" ? null : value),
    z.string().uuid().nullable()
  )
  .transform((value) => value ?? null);
const nullableTextSchema = z
  .preprocess(
    (value) => (value === "" || value === null || typeof value === "undefined" ? null : value),
    z.string().trim().max(500).nullable()
  )
  .transform((value) => value ?? null);
const nullableMoneySchema = z
  .preprocess(
    (value) => {
      if (value === "" || value === null || typeof value === "undefined") {
        return null;
      }

      return String(value).trim();
    },
    z
      .string()
      .regex(/^\d+(\.\d{1,2})?$/)
      .nullable()
  )
  .transform((value) => value ?? null);
const nullableBpsSchema = z
  .preprocess(parseNullableNumber, z.number().int().min(0).max(10000).nullable())
  .transform((value) => value ?? null);
const requiredBpsSchema = z.preprocess(parseRequiredNumber, z.number().int().min(0).max(10000));
const chargeCodeListSchema = z
  .array(
    z
      .string()
      .trim()
      .min(1)
      .max(80)
      .regex(/^[A-Za-z0-9_:-]+$/)
      .transform(normalizeCode)
  )
  .max(30)
  .default([]);

const billingScopeSchema = z.object({
  propertyId: nullableUuidSchema,
  unitId: nullableUuidSchema
});
const chargeDefinitionCreateSchema = billingScopeSchema.extend({
  active: z.boolean().default(true),
  amount: nullableMoneySchema,
  calculationMethod: chargeCalculationMethodSchema,
  category: chargeCategorySchema,
  code: codeSchema,
  description: nullableTextSchema,
  distributionBeneficiaryType: beneficiaryTypeSchema.default("KUQUBA"),
  guestVisible: z.boolean().default(true),
  label: z.string().trim().min(2).max(160),
  rateBps: nullableBpsSchema,
  taxable: z.boolean().default(true)
});
const taxRuleCreateSchema = billingScopeSchema.extend({
  active: z.boolean().default(true),
  appliesToCategories: z.array(chargeCategorySchema).max(20).default([]),
  appliesToChargeCodes: chargeCodeListSchema,
  code: codeSchema,
  label: z.string().trim().min(2).max(160),
  rateBps: requiredBpsSchema,
  responsibleParty: beneficiaryTypeSchema.default("TAX_AUTHORITY")
});
const activeToggleSchema = z.object({ active: z.boolean() });
const billingIdParamsSchema = z.object({ id: z.string().uuid() });
const propertySplitParamsSchema = z.object({ propertyId: z.string().uuid() });
const propertyFinancialSplitSchema = z.object({
  kuqubaShareBps: requiredBpsSchema,
  ownerShareBps: requiredBpsSchema
});

type BillingScopeValidation =
  | { ok: true; propertyId: string | null; unitId: string | null }
  | { ok: false; error: string; statusCode: 404 | 409 };
export const registerOpsBillingRoutes: FastifyPluginAsync = async (app) => {
  app.get("/billing", async (request, reply) => {
    const authorization = await authorizeOpsBillingRequest({
      action: "ops.billing.read",
      request,
      requiredPermissions: billingReadPermissions
    });

    if (!authorization.ok) {
      return reply.code(authorization.statusCode).send({
        error: authorization.error,
        correlationId: request.id
      });
    }

    const billing = await loadOpsBillingDashboard(authorization.session.user.organizationId);

    await writeOpsBillingAudit({
      action: "ops.billing.read",
      actorUserId: authorization.session.user.id,
      entityId: "ops-billing",
      entityType: "OpsBillingDashboard",
      nextValue: {
        chargeDefinitionCount: billing.chargeDefinitions.length,
        taxRuleCount: billing.taxRules.length
      },
      reason: "ops_billing_loaded",
      request,
      result: "SUCCESS"
    });

    return reply.send({ billing, correlationId: request.id });
  });

  app.post("/billing/charges", async (request, reply) => {
    const authorization = await authorizeOpsBillingRequest({
      action: "ops.billing.charge.create",
      request,
      requiredPermissions: billingUpdatePermissions
    });

    if (!authorization.ok) {
      return reply.code(authorization.statusCode).send({
        error: authorization.error,
        correlationId: request.id
      });
    }

    const body = chargeDefinitionCreateSchema.parse(request.body);
    const result = await createChargeDefinition({ actor: authorization.session, body, request });

    if (!result.ok) {
      return reply.code(result.statusCode).send({ error: result.error, correlationId: request.id });
    }

    return reply.code(201).send({
      billing: await loadOpsBillingDashboard(authorization.session.user.organizationId),
      chargeDefinition: result.chargeDefinition,
      correlationId: request.id
    });
  });

  app.patch("/billing/charges/:id", async (request, reply) => {
    const authorization = await authorizeOpsBillingRequest({
      action: "ops.billing.charge.update",
      request,
      requiredPermissions: billingUpdatePermissions
    });

    if (!authorization.ok) {
      return reply.code(authorization.statusCode).send({
        error: authorization.error,
        correlationId: request.id
      });
    }

    const params = billingIdParamsSchema.parse(request.params);
    const body = activeToggleSchema.parse(request.body);
    const result = await updateChargeDefinitionActiveState({
      actor: authorization.session,
      active: body.active,
      chargeDefinitionId: params.id,
      request
    });

    if (!result.ok) {
      return reply.code(result.statusCode).send({ error: result.error, correlationId: request.id });
    }

    return reply.send({
      billing: await loadOpsBillingDashboard(authorization.session.user.organizationId),
      chargeDefinition: result.chargeDefinition,
      correlationId: request.id
    });
  });

  app.post("/billing/tax-rules", async (request, reply) => {
    const authorization = await authorizeOpsBillingRequest({
      action: "ops.billing.tax_rule.create",
      request,
      requiredPermissions: billingUpdatePermissions
    });

    if (!authorization.ok) {
      return reply.code(authorization.statusCode).send({
        error: authorization.error,
        correlationId: request.id
      });
    }

    const body = taxRuleCreateSchema.parse(request.body);
    const result = await createTaxRule({ actor: authorization.session, body, request });

    if (!result.ok) {
      return reply.code(result.statusCode).send({ error: result.error, correlationId: request.id });
    }

    return reply.code(201).send({
      billing: await loadOpsBillingDashboard(authorization.session.user.organizationId),
      correlationId: request.id,
      taxRule: result.taxRule
    });
  });

  app.patch("/billing/tax-rules/:id", async (request, reply) => {
    const authorization = await authorizeOpsBillingRequest({
      action: "ops.billing.tax_rule.update",
      request,
      requiredPermissions: billingUpdatePermissions
    });

    if (!authorization.ok) {
      return reply.code(authorization.statusCode).send({
        error: authorization.error,
        correlationId: request.id
      });
    }

    const params = billingIdParamsSchema.parse(request.params);
    const body = activeToggleSchema.parse(request.body);
    const result = await updateTaxRuleActiveState({
      actor: authorization.session,
      active: body.active,
      request,
      taxRuleId: params.id
    });

    if (!result.ok) {
      return reply.code(result.statusCode).send({ error: result.error, correlationId: request.id });
    }

    return reply.send({
      billing: await loadOpsBillingDashboard(authorization.session.user.organizationId),
      correlationId: request.id,
      taxRule: result.taxRule
    });
  });

  app.patch("/billing/properties/:propertyId/split", async (request, reply) => {
    const authorization = await authorizeOpsBillingRequest({
      action: "ops.billing.property_split.update",
      request,
      requiredPermissions: billingUpdatePermissions
    });

    if (!authorization.ok) {
      return reply.code(authorization.statusCode).send({
        error: authorization.error,
        correlationId: request.id
      });
    }

    const params = propertySplitParamsSchema.parse(request.params);
    const body = propertyFinancialSplitSchema.parse(request.body);
    const result = await updatePropertyFinancialSplit({
      actor: authorization.session,
      body,
      propertyId: params.propertyId,
      request
    });

    if (!result.ok) {
      return reply.code(result.statusCode).send({ error: result.error, correlationId: request.id });
    }

    return reply.send({
      billing: await loadOpsBillingDashboard(authorization.session.user.organizationId),
      correlationId: request.id,
      property: result.property
    });
  });
};
async function authorizeOpsBillingRequest(input: {
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
    await writeOpsBillingAudit({
      action: input.action,
      entityType: "OpsBillingDashboard",
      nextValue: { requiredPermissions: input.requiredPermissions },
      reason: authorization.error,
      request: input.request,
      result: "DENIED"
    });
  }

  return authorization;
}

async function loadOpsBillingDashboard(organizationId: string) {
  const [properties, chargeDefinitions, taxRules] = await Promise.all([
    prisma.property.findMany({
      include: {
        contracts: {
          include: {
            owner: { select: { displayName: true, id: true } }
          },
          orderBy: [{ startsOn: "desc" }, { createdAt: "desc" }],
          take: 1,
          where: { status: "ACTIVE" }
        },
        units: {
          orderBy: { createdAt: "asc" },
          select: { id: true, name: true }
        }
      },
      orderBy: [{ name: "asc" }, { createdAt: "asc" }],
      where: { organizationId }
    }),
    prisma.chargeDefinition.findMany({
      include: {
        property: { select: { destination: true, id: true, name: true } },
        unit: { select: { id: true, name: true, propertyId: true } }
      },
      orderBy: [{ active: "desc" }, { category: "asc" }, { code: "asc" }],
      where: { organizationId }
    }),
    prisma.taxRule.findMany({
      include: {
        property: { select: { destination: true, id: true, name: true } },
        unit: { select: { id: true, name: true, propertyId: true } }
      },
      orderBy: [{ active: "desc" }, { code: "asc" }],
      where: { organizationId }
    })
  ]);

  const activeChargeDefinitions = chargeDefinitions.filter(
    (definition) => definition.active
  ).length;
  const activeTaxRules = taxRules.filter((rule) => rule.active).length;
  const propertiesWithSplit = properties.filter((property) => property.contracts[0]).length;

  return {
    chargeDefinitions: chargeDefinitions.map(mapChargeDefinition),
    generatedAt: new Date().toISOString(),
    metrics: [
      { hint: "Conceptos activos", label: "Conceptos", value: String(activeChargeDefinitions) },
      { hint: "Reglas activas", label: "Impuestos", value: String(activeTaxRules) },
      {
        hint: "Contrato activo",
        label: "Splits propiedad",
        value: `${propertiesWithSplit}/${properties.length}`
      }
    ],
    options: {
      beneficiaryTypes: beneficiaryTypeValues.map((value) => ({
        label: beneficiaryTypeLabels[value],
        value
      })),
      calculationMethods: chargeCalculationMethodValues.map((value) => ({
        label: chargeCalculationMethodLabels[value],
        value
      })),
      categories: chargeCategoryValues.map((value) => ({
        label: chargeCategoryLabels[value],
        value
      }))
    },
    properties: properties.map(mapBillingProperty),
    taxRules: taxRules.map(mapTaxRule)
  };
}
async function createChargeDefinition(input: {
  actor: AuthorizedDevPortalSession;
  body: z.infer<typeof chargeDefinitionCreateSchema>;
  request: Pick<FastifyRequest, "id" | "ip" | "log">;
}): Promise<
  | { ok: true; chargeDefinition: ReturnType<typeof mapChargeDefinition> }
  | { ok: false; error: string; statusCode: 404 | 409 }
> {
  const scope = await validateBillingScope({
    organizationId: input.actor.user.organizationId,
    propertyId: input.body.propertyId,
    unitId: input.body.unitId
  });

  if (!scope.ok) {
    return scope;
  }

  const chargeDefinition = await prisma.chargeDefinition.create({
    data: {
      active: input.body.active,
      amount: input.body.amount,
      calculationMethod: input.body.calculationMethod,
      category: input.body.category,
      code: input.body.code,
      description: input.body.description,
      distribution: buildDistribution(input.body.category, input.body.distributionBeneficiaryType),
      guestVisible: input.body.guestVisible,
      label: input.body.label,
      metadata: { createdByUserId: input.actor.user.id, source: "ops_billing" },
      organizationId: input.actor.user.organizationId,
      propertyId: scope.propertyId,
      rateBps: input.body.rateBps,
      taxable: input.body.taxable,
      unitId: scope.unitId
    },
    include: {
      property: { select: { destination: true, id: true, name: true } },
      unit: { select: { id: true, name: true, propertyId: true } }
    }
  });

  await writeOpsBillingAudit({
    action: "ops.billing.charge.create",
    actorUserId: input.actor.user.id,
    entityId: chargeDefinition.id,
    entityType: "ChargeDefinition",
    nextValue: {
      active: chargeDefinition.active,
      category: chargeDefinition.category,
      code: chargeDefinition.code,
      propertyId: scope.propertyId,
      unitId: scope.unitId
    },
    reason: "charge_definition_created",
    request: input.request,
    result: "SUCCESS"
  });

  return { ok: true, chargeDefinition: mapChargeDefinition(chargeDefinition) };
}

async function updateChargeDefinitionActiveState(input: {
  actor: AuthorizedDevPortalSession;
  active: boolean;
  chargeDefinitionId: string;
  request: Pick<FastifyRequest, "id" | "ip" | "log">;
}): Promise<
  | { ok: true; chargeDefinition: ReturnType<typeof mapChargeDefinition> }
  | { ok: false; error: string; statusCode: 404 }
> {
  const previous = await prisma.chargeDefinition.findFirst({
    where: { id: input.chargeDefinitionId, organizationId: input.actor.user.organizationId }
  });

  if (!previous) {
    return { ok: false, error: "charge_definition_not_found", statusCode: 404 };
  }

  const chargeDefinition = await prisma.chargeDefinition.update({
    data: { active: input.active },
    include: {
      property: { select: { destination: true, id: true, name: true } },
      unit: { select: { id: true, name: true, propertyId: true } }
    },
    where: { id: input.chargeDefinitionId }
  });

  await writeOpsBillingAudit({
    action: "ops.billing.charge.update",
    actorUserId: input.actor.user.id,
    entityId: chargeDefinition.id,
    entityType: "ChargeDefinition",
    nextValue: { active: chargeDefinition.active },
    previousValue: { active: previous.active },
    reason: "charge_definition_active_state_updated",
    request: input.request,
    result: "SUCCESS"
  });

  return { ok: true, chargeDefinition: mapChargeDefinition(chargeDefinition) };
}

async function createTaxRule(input: {
  actor: AuthorizedDevPortalSession;
  body: z.infer<typeof taxRuleCreateSchema>;
  request: Pick<FastifyRequest, "id" | "ip" | "log">;
}): Promise<
  | { ok: true; taxRule: ReturnType<typeof mapTaxRule> }
  | { ok: false; error: string; statusCode: 404 | 409 }
> {
  const scope = await validateBillingScope({
    organizationId: input.actor.user.organizationId,
    propertyId: input.body.propertyId,
    unitId: input.body.unitId
  });

  if (!scope.ok) {
    return scope;
  }

  const taxRule = await prisma.taxRule.create({
    data: {
      active: input.body.active,
      appliesToCategories: toJsonArrayOrNull(input.body.appliesToCategories),
      appliesToChargeCodes: toJsonArrayOrNull(input.body.appliesToChargeCodes),
      code: input.body.code,
      label: input.body.label,
      metadata: { createdByUserId: input.actor.user.id, source: "ops_billing" },
      organizationId: input.actor.user.organizationId,
      propertyId: scope.propertyId,
      rateBps: input.body.rateBps,
      responsibleParty: input.body.responsibleParty,
      unitId: scope.unitId
    },
    include: {
      property: { select: { destination: true, id: true, name: true } },
      unit: { select: { id: true, name: true, propertyId: true } }
    }
  });

  await writeOpsBillingAudit({
    action: "ops.billing.tax_rule.create",
    actorUserId: input.actor.user.id,
    entityId: taxRule.id,
    entityType: "TaxRule",
    nextValue: {
      active: taxRule.active,
      code: taxRule.code,
      propertyId: scope.propertyId,
      rateBps: taxRule.rateBps,
      unitId: scope.unitId
    },
    reason: "tax_rule_created",
    request: input.request,
    result: "SUCCESS"
  });

  return { ok: true, taxRule: mapTaxRule(taxRule) };
}

async function updateTaxRuleActiveState(input: {
  actor: AuthorizedDevPortalSession;
  active: boolean;
  request: Pick<FastifyRequest, "id" | "ip" | "log">;
  taxRuleId: string;
}): Promise<
  | { ok: true; taxRule: ReturnType<typeof mapTaxRule> }
  | { ok: false; error: string; statusCode: 404 }
> {
  const previous = await prisma.taxRule.findFirst({
    where: { id: input.taxRuleId, organizationId: input.actor.user.organizationId }
  });

  if (!previous) {
    return { ok: false, error: "tax_rule_not_found", statusCode: 404 };
  }

  const taxRule = await prisma.taxRule.update({
    data: { active: input.active },
    include: {
      property: { select: { destination: true, id: true, name: true } },
      unit: { select: { id: true, name: true, propertyId: true } }
    },
    where: { id: input.taxRuleId }
  });

  await writeOpsBillingAudit({
    action: "ops.billing.tax_rule.update",
    actorUserId: input.actor.user.id,
    entityId: taxRule.id,
    entityType: "TaxRule",
    nextValue: { active: taxRule.active },
    previousValue: { active: previous.active },
    reason: "tax_rule_active_state_updated",
    request: input.request,
    result: "SUCCESS"
  });

  return { ok: true, taxRule: mapTaxRule(taxRule) };
}
async function updatePropertyFinancialSplit(input: {
  actor: AuthorizedDevPortalSession;
  body: z.infer<typeof propertyFinancialSplitSchema>;
  propertyId: string;
  request: Pick<FastifyRequest, "id" | "ip" | "log">;
}): Promise<
  | {
      ok: true;
      property: Awaited<ReturnType<typeof loadOpsBillingDashboard>>["properties"][number];
    }
  | { ok: false; error: string; statusCode: 404 | 409 }
> {
  if (input.body.ownerShareBps + input.body.kuqubaShareBps !== 10000) {
    return { ok: false, error: "invalid_financial_split", statusCode: 409 };
  }

  const property = await prisma.property.findFirst({
    include: {
      contracts: {
        include: { owner: true },
        orderBy: [{ startsOn: "desc" }, { createdAt: "desc" }],
        take: 1,
        where: { status: "ACTIVE" }
      }
    },
    where: { id: input.propertyId, organizationId: input.actor.user.organizationId }
  });

  if (!property) {
    return { ok: false, error: "property_not_found", statusCode: 404 };
  }

  const contract = property.contracts[0] ?? null;

  if (!contract) {
    return { ok: false, error: "active_contract_required", statusCode: 409 };
  }

  const termsSnapshot = buildUpdatedContractTermsSnapshot({
    actor: input.actor,
    contract,
    kuqubaShareBps: input.body.kuqubaShareBps,
    ownerShareBps: input.body.ownerShareBps
  });

  const updatedContract = await prisma.contract.update({
    data: {
      kuqubaShareBps: input.body.kuqubaShareBps,
      ownerShareBps: input.body.ownerShareBps,
      termsSnapshot
    },
    where: { id: contract.id }
  });

  await writeOpsBillingAudit({
    action: "ops.billing.property_split.update",
    actorUserId: input.actor.user.id,
    entityId: updatedContract.id,
    entityType: "Contract",
    nextValue: {
      kuqubaShareBps: updatedContract.kuqubaShareBps,
      ownerShareBps: updatedContract.ownerShareBps,
      propertyId: input.propertyId
    },
    previousValue: {
      kuqubaShareBps: contract.kuqubaShareBps,
      ownerShareBps: contract.ownerShareBps,
      propertyId: input.propertyId
    },
    reason: "property_financial_split_updated",
    request: input.request,
    result: "SUCCESS"
  });

  const billing = await loadOpsBillingDashboard(input.actor.user.organizationId);
  const mappedProperty = billing.properties.find((item) => item.id === input.propertyId);

  if (!mappedProperty) {
    return { ok: false, error: "property_not_found", statusCode: 404 };
  }

  return { ok: true, property: mappedProperty };
}

async function validateBillingScope(input: {
  organizationId: string;
  propertyId: string | null;
  unitId: string | null;
}): Promise<BillingScopeValidation> {
  if (input.unitId) {
    const unit = await prisma.unit.findFirst({
      select: { id: true, propertyId: true },
      where: { id: input.unitId, property: { organizationId: input.organizationId } }
    });

    if (!unit) {
      return { ok: false, error: "unit_not_found", statusCode: 404 };
    }

    if (input.propertyId && input.propertyId !== unit.propertyId) {
      return { ok: false, error: "scope_unit_property_mismatch", statusCode: 409 };
    }

    return { ok: true, propertyId: unit.propertyId, unitId: unit.id };
  }

  if (input.propertyId) {
    const property = await prisma.property.findFirst({
      select: { id: true },
      where: { id: input.propertyId, organizationId: input.organizationId }
    });

    if (!property) {
      return { ok: false, error: "property_not_found", statusCode: 404 };
    }

    return { ok: true, propertyId: property.id, unitId: null };
  }

  return { ok: true, propertyId: null, unitId: null };
}

function mapBillingProperty(property: {
  contracts: Array<{
    id: string;
    kuqubaShareBps: number;
    owner: { displayName: string; id: string };
    ownerShareBps: number;
    updatedAt: Date;
  }>;
  destination: string;
  id: string;
  name: string;
  units: Array<{ id: string; name: string }>;
}) {
  const contract = property.contracts[0] ?? null;

  return {
    activeContract: contract
      ? {
          id: contract.id,
          kuqubaShareBps: contract.kuqubaShareBps,
          ownerName: contract.owner.displayName,
          ownerShareBps: contract.ownerShareBps,
          updatedAt: contract.updatedAt.toISOString()
        }
      : null,
    destination: property.destination,
    id: property.id,
    name: property.name,
    units: property.units
  };
}

function mapChargeDefinition(definition: {
  active: boolean;
  amount: { toString(): string } | null;
  calculationMethod: string;
  category: string;
  code: string;
  description: string | null;
  distribution: Prisma.JsonValue | null;
  guestVisible: boolean;
  id: string;
  label: string;
  property: { destination: string; id: string; name: string } | null;
  propertyId: string | null;
  rateBps: number | null;
  taxable: boolean;
  unit: { id: string; name: string; propertyId: string } | null;
  unitId: string | null;
  updatedAt: Date;
}) {
  return {
    active: definition.active,
    amount: definition.amount?.toString() ?? null,
    calculationMethod: definition.calculationMethod,
    calculationMethodLabel:
      chargeCalculationMethodLabels[
        definition.calculationMethod as keyof typeof chargeCalculationMethodLabels
      ] ?? definition.calculationMethod,
    category: definition.category,
    categoryLabel:
      chargeCategoryLabels[definition.category as keyof typeof chargeCategoryLabels] ??
      definition.category,
    code: definition.code,
    description: definition.description,
    distributionBeneficiaryType: readDistributionBeneficiaryType(definition.distribution),
    guestVisible: definition.guestVisible,
    id: definition.id,
    label: definition.label,
    property: definition.property,
    propertyId: definition.propertyId,
    rateBps: definition.rateBps,
    scopeLabel: buildScopeLabel(definition.property, definition.unit),
    taxable: definition.taxable,
    unit: definition.unit,
    unitId: definition.unitId,
    updatedAt: definition.updatedAt.toISOString()
  };
}
function mapTaxRule(rule: {
  active: boolean;
  appliesToCategories: Prisma.JsonValue | null;
  appliesToChargeCodes: Prisma.JsonValue | null;
  code: string;
  id: string;
  label: string;
  property: { destination: string; id: string; name: string } | null;
  propertyId: string | null;
  rateBps: number;
  responsibleParty: string;
  unit: { id: string; name: string; propertyId: string } | null;
  unitId: string | null;
  updatedAt: Date;
}) {
  return {
    active: rule.active,
    appliesToCategories: readStringArray(rule.appliesToCategories),
    appliesToChargeCodes: readStringArray(rule.appliesToChargeCodes),
    code: rule.code,
    id: rule.id,
    label: rule.label,
    property: rule.property,
    propertyId: rule.propertyId,
    rateBps: rule.rateBps,
    responsibleParty: rule.responsibleParty,
    responsiblePartyLabel:
      beneficiaryTypeLabels[rule.responsibleParty as keyof typeof beneficiaryTypeLabels] ??
      rule.responsibleParty,
    scopeLabel: buildScopeLabel(rule.property, rule.unit),
    unit: rule.unit,
    unitId: rule.unitId,
    updatedAt: rule.updatedAt.toISOString()
  };
}

function buildUpdatedContractTermsSnapshot(input: {
  actor: AuthorizedDevPortalSession;
  contract: { termsSnapshot: Prisma.JsonValue | null };
  kuqubaShareBps: number;
  ownerShareBps: number;
}): Prisma.InputJsonValue {
  const base = isRecord(input.contract.termsSnapshot) ? input.contract.termsSnapshot : {};

  return {
    ...base,
    financialSplitUpdatedAt: new Date().toISOString(),
    financialSplitUpdatedByUserId: input.actor.user.id,
    kuqubaShareBps: input.kuqubaShareBps,
    ownerShareBps: input.ownerShareBps
  } as Prisma.InputJsonObject;
}

function buildDistribution(
  category: (typeof chargeCategoryValues)[number],
  beneficiaryType: (typeof beneficiaryTypeValues)[number]
): Prisma.InputJsonObject {
  if (category === "ACCOMMODATION") {
    return { strategy: "active_contract_split" };
  }

  return { [beneficiaryType]: 10000 };
}

function readDistributionBeneficiaryType(value: Prisma.JsonValue | null) {
  if (!isRecord(value)) {
    return null;
  }

  const beneficiaryType = beneficiaryTypeValues.find((type) => Number(value[type]) === 10000);

  return beneficiaryType ?? null;
}

function toJsonArrayOrNull(values: readonly string[]) {
  return values.length > 0 ? ([...values] as Prisma.InputJsonValue) : Prisma.JsonNull;
}

function readStringArray(value: Prisma.JsonValue | null) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function buildScopeLabel(property: { name: string } | null, unit: { name: string } | null) {
  if (property && unit) {
    return `${property.name} / ${unit.name}`;
  }

  if (property) {
    return property.name;
  }

  return "Organizacion";
}

function normalizeCode(value: string) {
  return value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function parseNullableNumber(value: unknown) {
  if (value === "" || value === null || typeof value === "undefined") {
    return null;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? Number(trimmed) : null;
  }

  return value;
}

function parseRequiredNumber(value: unknown) {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? Number(trimmed) : null;
  }

  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

async function writeOpsBillingAudit(input: {
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
    correlationId: input.request.id,
    entityId: input.entityId,
    entityType: input.entityType,
    ipAddress: input.request.ip,
    nextValue: input.nextValue,
    previousValue: input.previousValue,
    reason: input.reason,
    result: input.result
  });

  await prisma.auditEvent.create({
    data: {
      action: auditEvent.action,
      actorUserId: auditEvent.actorUserId,
      correlationId: auditEvent.correlationId,
      entityId: auditEvent.entityId,
      entityType: auditEvent.entityType,
      ipAddress: auditEvent.ipAddress,
      nextValue: auditEvent.nextValue as Prisma.InputJsonValue | undefined,
      previousValue: auditEvent.previousValue as Prisma.InputJsonValue | undefined,
      reason: auditEvent.reason,
      result: auditEvent.result
    }
  });

  input.request.log.info({ auditEvent }, "audit.event");
}
