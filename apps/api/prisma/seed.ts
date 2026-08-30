import { createHash } from "node:crypto";

import type { Prisma, PrismaClient } from "@prisma/client";
import { permissionKeys, roleProfiles } from "@kuquba/config";

process.env.DATABASE_URL ??=
  "postgresql://kuquba:kuquba_dev_password@127.0.0.1:55432/kuquba_dev?schema=public";

let prisma: PrismaClient | undefined;

const devIds = {
  organization: "00000000-0000-4000-8000-000000000001",
  owner: "00000000-0000-4000-8000-000000000101",
  guest: "00000000-0000-4000-8000-000000000102",
  atitlanProperty: "00000000-0000-4000-8000-000000000201",
  antiguaProperty: "00000000-0000-4000-8000-000000000202",
  atitlanTerrazaProperty: "00000000-0000-4000-8000-000000000203",
  atitlanUnit: "00000000-0000-4000-8000-000000000301",
  antiguaUnit: "00000000-0000-4000-8000-000000000302",
  atitlanTerrazaUnit: "00000000-0000-4000-8000-000000000303",
  stayCodeAtitlanVilla: "00000000-0000-4000-8000-000000000331",
  stayCodeAntiguaSuite: "00000000-0000-4000-8000-000000000332",
  stayCodeAtitlanTerraza: "00000000-0000-4000-8000-000000000333",
  ratePlanAtitlanBase: "00000000-0000-4000-8000-000000000341",
  ratePlanAntiguaBase: "00000000-0000-4000-8000-000000000342",
  ratePlanAtitlanTerrazaBase: "00000000-0000-4000-8000-000000000343",
  availabilityBlockAtitlanMaintenance: "00000000-0000-4000-8000-000000000351",
  atitlanContract: "00000000-0000-4000-8000-000000000401",
  antiguaContract: "00000000-0000-4000-8000-000000000402",
  atitlanContractVersionOne: "00000000-0000-4000-8000-000000000411",
  antiguaContractVersionOne: "00000000-0000-4000-8000-000000000412",
  reservationAtitlanOne: "00000000-0000-4000-8000-000000000501",
  reservationAtitlanTwo: "00000000-0000-4000-8000-000000000502",
  reservationAtitlanThree: "00000000-0000-4000-8000-000000000503",
  housekeepingTurnoverAtitlanDone: "00000000-0000-4000-8000-000000000611",
  housekeepingTurnoverAtitlanNext: "00000000-0000-4000-8000-000000000612",
  housekeepingInspectionAntigua: "00000000-0000-4000-8000-000000000613",
  maintenanceTerraceAtitlan: "00000000-0000-4000-8000-000000000621",
  maintenanceWifiAntigua: "00000000-0000-4000-8000-000000000622",
  taskDocsTax: "00000000-0000-4000-8000-000000000601",
  taskInventoryAntigua: "00000000-0000-4000-8000-000000000602",
  taskMaintenanceAtitlan: "00000000-0000-4000-8000-000000000603",
  taskPhotoAntigua: "00000000-0000-4000-8000-000000000604",
  documentReservations: "00000000-0000-4000-8000-000000000701",
  documentExpenses: "00000000-0000-4000-8000-000000000702",
  documentTax: "00000000-0000-4000-8000-000000000703",
  ownerFinanceLedgerAccount: "00000000-0000-4000-8000-000000000711",
  ledgerAtitlanAccommodation: "00000000-0000-4000-8000-000000000721",
  ledgerAtitlanCleaning: "00000000-0000-4000-8000-000000000722",
  ledgerAtitlanService: "00000000-0000-4000-8000-000000000723",
  ledgerAtitlanTax: "00000000-0000-4000-8000-000000000724",
  ledgerAtitlanExpense: "00000000-0000-4000-8000-000000000725",
  ownerSettlementAtitlanAugust: "00000000-0000-4000-8000-000000000731",
  ownerSettlementLineAccommodation: "00000000-0000-4000-8000-000000000741",
  ownerSettlementLineCleaning: "00000000-0000-4000-8000-000000000742",
  ownerSettlementLineService: "00000000-0000-4000-8000-000000000743",
  ownerSettlementLineTax: "00000000-0000-4000-8000-000000000744",
  ownerSettlementLineExpense: "00000000-0000-4000-8000-000000000745",
  ownerLeadAtitlan: "00000000-0000-4000-8000-000000000801",
  ownerLeadAntigua: "00000000-0000-4000-8000-000000000802",
  proposalRequestAtitlan: "00000000-0000-4000-8000-000000000811",
  proposalRequestAntigua: "00000000-0000-4000-8000-000000000812",
  opsCaseOwnerLeadAtitlan: "00000000-0000-4000-8000-000000000901",
  opsCaseOwnerLeadAntigua: "00000000-0000-4000-8000-000000000902",
  opsCaseProposalAtitlan: "00000000-0000-4000-8000-000000000911",
  opsNoteOwnerLeadAtitlan: "00000000-0000-4000-8000-000000000931",
  opsNoteOwnerLeadAntigua: "00000000-0000-4000-8000-000000000932",
  opsNoteProposalAtitlan: "00000000-0000-4000-8000-000000000933",
  opsTaskOwnerLeadCall: "00000000-0000-4000-8000-000000000951",
  opsTaskOwnerLeadPhotos: "00000000-0000-4000-8000-000000000952",
  opsTaskOwnerLeadAntiguaCalendar: "00000000-0000-4000-8000-000000000953",
  opsTaskProposalQuote: "00000000-0000-4000-8000-000000000961",
  opsTaskProposalAvailability: "00000000-0000-4000-8000-000000000962",
  propertyOnboardingAtitlan: "00000000-0000-4000-8000-000000000971",
  stayProposalAtitlanFormal: "00000000-0000-4000-8000-000000000981",
  stayProposalAtitlanVersionOne: "00000000-0000-4000-8000-000000000982",
  formalActivityOnboardingAtitlan: "00000000-0000-4000-8000-000000000991",
  formalActivityProposalAtitlan: "00000000-0000-4000-8000-000000000992",
  formalActivityProposalApprovalAtitlan: "00000000-0000-4000-8000-000000000993"
} as const;

async function main() {
  const { PrismaClient } = await import("@prisma/client");
  prisma = new PrismaClient({
    datasourceUrl: process.env.DATABASE_URL
  });

  const organization = await prisma.organization.upsert({
    where: {
      id: devIds.organization
    },
    create: {
      id: devIds.organization,
      name: "KUQUBA Dev"
    },
    update: {
      name: "KUQUBA Dev"
    }
  });

  const permissions = await Promise.all(
    permissionKeys.map((key) =>
      prisma.permission.upsert({
        where: { key },
        create: {
          key,
          description: `Permission ${key}`
        },
        update: {}
      })
    )
  );

  const permissionByKey = new Map(permissions.map((permission) => [permission.key, permission]));

  for (const roleProfile of roleProfiles) {
    const role = await prisma.role.upsert({
      where: { key: roleProfile.key },
      create: {
        key: roleProfile.key,
        name: roleProfile.label,
        description: `Rol base ${roleProfile.label}`
      },
      update: {
        name: roleProfile.label
      }
    });

    for (const permissionKey of roleProfile.permissions) {
      const permission = permissionByKey.get(permissionKey);

      if (!permission) {
        throw new Error(`Missing permission seed for ${permissionKey}`);
      }

      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: role.id,
            permissionId: permission.id
          }
        },
        create: {
          roleId: role.id,
          permissionId: permission.id
        },
        update: {}
      });
    }
  }

  const guestUser = await seedDevUser(prisma, {
    organizationId: organization.id,
    email: "guest.dev@kuquba.local",
    displayName: "Huesped Dev",
    roleKey: "guest",
    identityProvider: "EMAIL_OTP"
  });

  const ownerUser = await seedDevUser(prisma, {
    organizationId: organization.id,
    email: "owner.dev@kuquba.local",
    displayName: "Propietario Dev",
    roleKey: "owner",
    identityProvider: "EMAIL_OTP"
  });

  const opsUser = await seedDevUser(prisma, {
    organizationId: organization.id,
    email: "ops.dev@kuquba.local",
    displayName: "Equipo KUQUBA Dev",
    roleKey: "ops_admin",
    identityProvider: "EMAIL_OTP"
  });
  await seedDevUser(prisma, {
    organizationId: organization.id,
    email: 'iam.admin@kuquba.local',
    displayName: 'Administrador IAM Dev',
    roleKey: 'iam_admin',
    identityProvider: 'EMAIL_OTP'
  });


  await seedOwnerPortal(prisma, {
    organizationId: organization.id,
    ownerUserId: ownerUser.id,
    guestUserId: guestUser.id
  });

  await seedOpsWorkbench(prisma, { opsUserId: opsUser.id });
}

async function seedDevUser(
  prismaClient: PrismaClient,
  input: {
    organizationId: string;
    email: string;
    displayName: string;
    roleKey: string;
    identityProvider: "EMAIL_OTP";
  }
) {
  const user = await prismaClient.user.upsert({
    where: {
      organizationId_email: {
        organizationId: input.organizationId,
        email: input.email
      }
    },
    create: {
      organizationId: input.organizationId,
      email: input.email,
      displayName: input.displayName
    },
    update: {
      displayName: input.displayName
    }
  });

  await prismaClient.identity.upsert({
    where: {
      provider_subject: {
        provider: input.identityProvider,
        subject: input.email
      }
    },
    create: {
      userId: user.id,
      provider: input.identityProvider,
      subject: input.email,
      status: "VERIFIED",
      verifiedAt: new Date()
    },
    update: {
      userId: user.id,
      status: "VERIFIED"
    }
  });

  const role = await prismaClient.role.findUniqueOrThrow({
    where: {
      key: input.roleKey
    }
  });

  await prismaClient.userRole.upsert({
    where: {
      userId_roleId_scope_resourceId: {
        userId: user.id,
        roleId: role.id,
        scope: "ORGANIZATION",
        resourceId: input.organizationId
      }
    },
    create: {
      userId: user.id,
      roleId: role.id,
      scope: "ORGANIZATION",
      resourceId: input.organizationId
    },
    update: {}
  });

  return user;
}

async function seedOwnerPortal(
  prismaClient: PrismaClient,
  input: {
    organizationId: string;
    ownerUserId: string;
    guestUserId: string;
  }
) {
  const owner = await prismaClient.owner.upsert({
    where: {
      userId: input.ownerUserId
    },
    create: {
      id: devIds.owner,
      organizationId: input.organizationId,
      userId: input.ownerUserId,
      displayName: "Propietario KUQUBA",
      email: "owner.dev@kuquba.local"
    },
    update: {
      displayName: "Propietario KUQUBA",
      email: "owner.dev@kuquba.local"
    }
  });

  const guest = await prismaClient.guest.upsert({
    where: {
      userId: input.guestUserId
    },
    create: {
      id: devIds.guest,
      userId: input.guestUserId,
      email: "guest.dev@kuquba.local",
      fullName: "Familia Rivera",
      countryCode: "GT"
    },
    update: {
      email: "guest.dev@kuquba.local",
      fullName: "Familia Rivera",
      countryCode: "GT"
    }
  });

  const atitlanProperty = await prismaClient.property.upsert({
    where: {
      id: devIds.atitlanProperty
    },
    create: {
      id: devIds.atitlanProperty,
      organizationId: input.organizationId,
      name: "Villa Luz de Atitlan",
      destination: "Lago de Atitlan",
      visibility: "PUBLIC"
    },
    update: {
      name: "Villa Luz de Atitlan",
      destination: "Lago de Atitlan",
      visibility: "PUBLIC"
    }
  });

  const antiguaProperty = await prismaClient.property.upsert({
    where: {
      id: devIds.antiguaProperty
    },
    create: {
      id: devIds.antiguaProperty,
      organizationId: input.organizationId,
      name: "Suite Jardin Colonial",
      destination: "Antigua Guatemala",
      visibility: "PUBLIC"
    },
    update: {
      name: "Suite Jardin Colonial",
      destination: "Antigua Guatemala",
      visibility: "PUBLIC"
    }
  });

  const atitlanTerrazaProperty = await prismaClient.property.upsert({
    where: {
      id: devIds.atitlanTerrazaProperty
    },
    create: {
      id: devIds.atitlanTerrazaProperty,
      organizationId: input.organizationId,
      name: "Casa Terraza del Lago",
      destination: "Lago de Atitlan",
      visibility: "PUBLIC"
    },
    update: {
      name: "Casa Terraza del Lago",
      destination: "Lago de Atitlan",
      visibility: "PUBLIC"
    }
  });

  const atitlanUnit = await prismaClient.unit.upsert({
    where: {
      id: devIds.atitlanUnit
    },
    create: {
      id: devIds.atitlanUnit,
      propertyId: atitlanProperty.id,
      name: "Casa completa",
      maxGuests: 6,
      bedrooms: 3,
      bathrooms: "2.50"
    },
    update: {
      propertyId: atitlanProperty.id,
      name: "Casa completa",
      maxGuests: 6,
      bedrooms: 3,
      bathrooms: "2.50"
    }
  });

  await prismaClient.unit.upsert({
    where: {
      id: devIds.antiguaUnit
    },
    create: {
      id: devIds.antiguaUnit,
      propertyId: antiguaProperty.id,
      name: "Suite Jardin",
      maxGuests: 2,
      bedrooms: 1,
      bathrooms: "1.00"
    },
    update: {
      propertyId: antiguaProperty.id,
      name: "Suite Jardin",
      maxGuests: 2,
      bedrooms: 1,
      bathrooms: "1.00"
    }
  });

  const atitlanTerrazaUnit = await prismaClient.unit.upsert({
    where: {
      id: devIds.atitlanTerrazaUnit
    },
    create: {
      id: devIds.atitlanTerrazaUnit,
      propertyId: atitlanTerrazaProperty.id,
      name: "Casa Terraza",
      maxGuests: 4,
      bedrooms: 2,
      bathrooms: "2.00"
    },
    update: {
      propertyId: atitlanTerrazaProperty.id,
      name: "Casa Terraza",
      maxGuests: 4,
      bedrooms: 2,
      bathrooms: "2.00"
    }
  });

  await seedStayCode(prismaClient, {
    id: devIds.stayCodeAtitlanVilla,
    propertyId: atitlanProperty.id,
    unitId: atitlanUnit.id,
    code: "atitlan-villa-luz"
  });

  await seedStayCode(prismaClient, {
    id: devIds.stayCodeAntiguaSuite,
    propertyId: antiguaProperty.id,
    unitId: devIds.antiguaUnit,
    code: "antigua-suite-jardin"
  });

  await seedStayCode(prismaClient, {
    id: devIds.stayCodeAtitlanTerraza,
    propertyId: atitlanTerrazaProperty.id,
    unitId: atitlanTerrazaUnit.id,
    code: "atitlan-casa-terraza"
  });

  await seedRatePlan(prismaClient, {
    id: devIds.ratePlanAtitlanBase,
    propertyId: atitlanProperty.id,
    unitId: atitlanUnit.id,
    name: "Tarifa base Atitlan",
    currency: "GTQ",
    baseNightlyRate: "1550.00",
    weekendNightlyRate: "1750.00",
    cleaningFee: "425.00",
    serviceFeeBps: 800,
    taxBps: 1200,
    minNights: 2
  });

  await seedRatePlan(prismaClient, {
    id: devIds.ratePlanAntiguaBase,
    propertyId: antiguaProperty.id,
    unitId: devIds.antiguaUnit,
    name: "Tarifa base Antigua",
    currency: "GTQ",
    baseNightlyRate: "820.00",
    weekendNightlyRate: "960.00",
    cleaningFee: "180.00",
    serviceFeeBps: 800,
    taxBps: 1200,
    minNights: 1
  });

  await seedRatePlan(prismaClient, {
    id: devIds.ratePlanAtitlanTerrazaBase,
    propertyId: atitlanTerrazaProperty.id,
    unitId: atitlanTerrazaUnit.id,
    name: "Tarifa base Casa Terraza",
    currency: "GTQ",
    baseNightlyRate: "1180.00",
    weekendNightlyRate: "1380.00",
    cleaningFee: "325.00",
    serviceFeeBps: 800,
    taxBps: 1200,
    minNights: 2
  });

  await seedAvailabilityBlock(prismaClient, {
    id: devIds.availabilityBlockAtitlanMaintenance,
    propertyId: atitlanProperty.id,
    unitId: atitlanUnit.id,
    startsOn: "2026-09-18",
    endsOn: "2026-09-20",
    reason: "MAINTENANCE",
    note: "Mantenimiento preventivo de terraza"
  });

  const atitlanContractIssuedAt = new Date("2025-12-15T00:00:00.000Z");
  const atitlanContractSignedAt = new Date("2025-12-20T00:00:00.000Z");
  const atitlanContractTitle = "Contrato KUQUBA v1 - Villa Luz de Atitlan";
  const atitlanContractSummary =
    "Administracion profesional para Villa Luz de Atitlan en Lago de Atitlan.";
  const atitlanContractTerms = buildSeedContractTermsSnapshot({
    kuqubaShareBps: 0,
    ownerName: owner.displayName,
    ownerShareBps: 0,
    propertyLocation: atitlanProperty.destination,
    propertyName: atitlanProperty.name,
    propertyType: "Casa completa",
    version: 1
  });
  const atitlanSignatureRef = "DEV-SIGN-ATITLAN-SEED";
  const atitlanContract = await prismaClient.contract.upsert({
    where: {
      id: devIds.atitlanContract
    },
    create: {
      id: devIds.atitlanContract,
      ownerId: owner.id,
      propertyId: atitlanProperty.id,
      status: "ACTIVE",
      currentVersion: 1,
      title: atitlanContractTitle,
      summary: atitlanContractSummary,
      termsSnapshot: atitlanContractTerms,
      startsOn: parseDateOnly("2026-01-01"),
      ownerShareBps: 0,
      kuqubaShareBps: 0,
      issuedAt: atitlanContractIssuedAt,
      signedAt: atitlanContractSignedAt,
      signedByUserId: input.ownerUserId,
      signatureProvider: "seed_dev_signature",
      signatureProviderRef: atitlanSignatureRef,
      signatureEvidenceHash: buildSeedSignatureHash(devIds.atitlanContract, atitlanSignatureRef)
    },
    update: {
      ownerId: owner.id,
      propertyId: atitlanProperty.id,
      status: "ACTIVE",
      currentVersion: 1,
      title: atitlanContractTitle,
      summary: atitlanContractSummary,
      termsSnapshot: atitlanContractTerms,
      startsOn: parseDateOnly("2026-01-01"),
      endsOn: null,
      ownerShareBps: 0,
      kuqubaShareBps: 0,
      issuedAt: atitlanContractIssuedAt,
      signedAt: atitlanContractSignedAt,
      signedByUserId: input.ownerUserId,
      signatureProvider: "seed_dev_signature",
      signatureProviderRef: atitlanSignatureRef,
      signatureEvidenceHash: buildSeedSignatureHash(devIds.atitlanContract, atitlanSignatureRef)
    }
  });

  await prismaClient.contractVersion.upsert({
    where: {
      contractId_version: {
        contractId: atitlanContract.id,
        version: 1
      }
    },
    create: {
      id: devIds.atitlanContractVersionOne,
      contractId: atitlanContract.id,
      version: 1,
      title: atitlanContractTitle,
      summary: atitlanContractSummary,
      termsSnapshot: atitlanContractTerms,
      issuedAt: atitlanContractIssuedAt
    },
    update: {
      title: atitlanContractTitle,
      summary: atitlanContractSummary,
      termsSnapshot: atitlanContractTerms,
      issuedAt: atitlanContractIssuedAt
    }
  });

  const antiguaContractIssuedAt = new Date("2026-08-15T00:00:00.000Z");
  const antiguaContractTitle = "Contrato KUQUBA v1 - Suite Jardin Colonial";
  const antiguaContractSummary =
    "Administracion profesional para Suite Jardin Colonial en Antigua Guatemala.";
  const antiguaContractTerms = buildSeedContractTermsSnapshot({
    kuqubaShareBps: 0,
    ownerName: owner.displayName,
    ownerShareBps: 0,
    propertyLocation: antiguaProperty.destination,
    propertyName: antiguaProperty.name,
    propertyType: "Suite",
    version: 1
  });
  const antiguaContract = await prismaClient.contract.upsert({
    where: {
      id: devIds.antiguaContract
    },
    create: {
      id: devIds.antiguaContract,
      ownerId: owner.id,
      propertyId: antiguaProperty.id,
      status: "ISSUED",
      currentVersion: 1,
      title: antiguaContractTitle,
      summary: antiguaContractSummary,
      termsSnapshot: antiguaContractTerms,
      startsOn: parseDateOnly("2026-08-01"),
      ownerShareBps: 0,
      kuqubaShareBps: 0,
      issuedAt: antiguaContractIssuedAt
    },
    update: {
      ownerId: owner.id,
      propertyId: antiguaProperty.id,
      status: "ISSUED",
      currentVersion: 1,
      title: antiguaContractTitle,
      summary: antiguaContractSummary,
      termsSnapshot: antiguaContractTerms,
      startsOn: parseDateOnly("2026-08-01"),
      endsOn: null,
      ownerShareBps: 0,
      kuqubaShareBps: 0,
      issuedAt: antiguaContractIssuedAt,
      signedAt: null,
      signedByUserId: null,
      signatureProvider: null,
      signatureProviderRef: null,
      signatureEvidenceHash: null
    }
  });

  await prismaClient.contractVersion.upsert({
    where: {
      contractId_version: {
        contractId: antiguaContract.id,
        version: 1
      }
    },
    create: {
      id: devIds.antiguaContractVersionOne,
      contractId: antiguaContract.id,
      version: 1,
      title: antiguaContractTitle,
      summary: antiguaContractSummary,
      termsSnapshot: antiguaContractTerms,
      issuedAt: antiguaContractIssuedAt
    },
    update: {
      title: antiguaContractTitle,
      summary: antiguaContractSummary,
      termsSnapshot: antiguaContractTerms,
      issuedAt: antiguaContractIssuedAt
    }
  });

  await seedReservation(prismaClient, {
    id: devIds.reservationAtitlanOne,
    privateCode: "KQB-ATITLAN-20260824",
    guestId: guest.id,
    propertyId: atitlanProperty.id,
    unitId: atitlanUnit.id,
    status: "CONFIRMED",
    currency: "GTQ",
    total: "7975.00",
    arrivalDate: "2026-08-24",
    departureDate: "2026-08-28"
  });

  await seedReservation(prismaClient, {
    id: devIds.reservationAtitlanTwo,
    privateCode: "KQB-ATITLAN-20260828",
    guestId: guest.id,
    propertyId: atitlanProperty.id,
    unitId: atitlanUnit.id,
    status: "HOLD",
    arrivalDate: "2026-08-28",
    departureDate: "2026-08-31"
  });

  await seedReservation(prismaClient, {
    id: devIds.reservationAtitlanThree,
    privateCode: "KQB-ATITLAN-20260902",
    guestId: guest.id,
    propertyId: atitlanProperty.id,
    unitId: atitlanUnit.id,
    status: "HOLD",
    arrivalDate: "2026-09-02",
    departureDate: "2026-09-05"
  });

  await seedHousekeepingTask(prismaClient, {
    id: devIds.housekeepingTurnoverAtitlanDone,
    propertyId: atitlanProperty.id,
    unitId: atitlanUnit.id,
    reservationId: devIds.reservationAtitlanOne,
    title: "Turnover Villa Luz post checkout",
    status: "DONE",
    priority: "high",
    serviceDate: "2026-08-28",
    serviceWindow: "11:00-15:00",
    assigneeName: "Equipo Ops Atitlan",
    vendorName: "Limpiezas Lago Dev",
    checklist: ["Lavanderia", "Banos", "Cocina", "Amenidades", "Reporte fotografico"],
    notes: "Limpieza completada para salida confirmada.",
    blockedReason: null,
    completedAt: "2026-08-28T15:10:00.000Z"
  });

  await seedHousekeepingTask(prismaClient, {
    id: devIds.housekeepingTurnoverAtitlanNext,
    propertyId: atitlanProperty.id,
    unitId: atitlanUnit.id,
    reservationId: devIds.reservationAtitlanTwo,
    title: "Preparar Villa Luz para hold activo",
    status: "ASSIGNED",
    priority: "high",
    serviceDate: "2026-08-31",
    serviceWindow: "10:00-14:00",
    assigneeName: "Equipo Ops Atitlan",
    vendorName: "Limpiezas Lago Dev",
    checklist: ["Inventario rapido", "Amenidades", "Toallas", "Refrigerador", "Fotos antes de check-in"],
    notes: "Pendiente de confirmar si el hold pasa a pago.",
    blockedReason: null,
    completedAt: null
  });

  await seedHousekeepingTask(prismaClient, {
    id: devIds.housekeepingInspectionAntigua,
    propertyId: antiguaProperty.id,
    unitId: devIds.antiguaUnit,
    reservationId: null,
    title: "Inspeccion preventiva Suite Jardin",
    status: "SCHEDULED",
    priority: "medium",
    serviceDate: "2026-09-01",
    serviceWindow: "09:00-11:00",
    assigneeName: "Ops Antigua",
    vendorName: "Housekeeping Colonial Dev",
    checklist: ["Ropa de cama", "Humedad", "Cerraduras", "Kit bienvenida"],
    notes: "Revision sin reserva asociada.",
    blockedReason: null,
    completedAt: null
  });

  await seedMaintenanceTicket(prismaClient, {
    id: devIds.maintenanceTerraceAtitlan,
    propertyId: atitlanProperty.id,
    unitId: atitlanUnit.id,
    title: "Sellado preventivo de terraza",
    category: "Preventivo",
    severity: "MEDIUM",
    status: "SCHEDULED",
    reportedAt: "2026-08-26T09:00:00.000Z",
    dueAt: "2026-09-18T09:00:00.000Z",
    assigneeName: "Ops Atitlan",
    vendorName: "Mantenimiento Lago Dev",
    description: "Bloqueo de disponibilidad ya creado para mantenimiento preventivo de terraza.",
    resolutionNotes: null,
    completedAt: null
  });

  await seedMaintenanceTicket(prismaClient, {
    id: devIds.maintenanceWifiAntigua,
    propertyId: antiguaProperty.id,
    unitId: devIds.antiguaUnit,
    title: "Intermitencia WiFi Suite Jardin",
    category: "Conectividad",
    severity: "HIGH",
    status: "TRIAGED",
    reportedAt: "2026-08-28T10:30:00.000Z",
    dueAt: "2026-08-29T18:00:00.000Z",
    assigneeName: "Ops Antigua",
    vendorName: "Proveedor ISP Dev",
    description: "Revisar router antes de publicar nuevas fechas.",
    resolutionNotes: null,
    completedAt: null
  });
  const ownerFinanceAccount = await seedLedgerAccount(prismaClient, {
    id: devIds.ownerFinanceLedgerAccount,
    name: "KUQUBA Owner Finance Dev",
    currency: "GTQ"
  });

  const accommodationEntry = await seedLedgerEntry(prismaClient, {
    id: devIds.ledgerAtitlanAccommodation,
    ledgerAccountId: ownerFinanceAccount.id,
    reservationId: devIds.reservationAtitlanOne,
    type: "ACCOMMODATION",
    amount: "6200.00",
    currency: "GTQ",
    memo: "Reserva confirmada KQB-ATITLAN-20260824",
    createdAt: "2026-08-24T00:00:00.000Z"
  });

  const cleaningEntry = await seedLedgerEntry(prismaClient, {
    id: devIds.ledgerAtitlanCleaning,
    ledgerAccountId: ownerFinanceAccount.id,
    reservationId: devIds.reservationAtitlanOne,
    type: "CLEANING",
    amount: "425.00",
    currency: "GTQ",
    memo: "Limpieza reserva KQB-ATITLAN-20260824",
    createdAt: "2026-08-24T00:00:00.000Z"
  });

  const serviceEntry = await seedLedgerEntry(prismaClient, {
    id: devIds.ledgerAtitlanService,
    ledgerAccountId: ownerFinanceAccount.id,
    reservationId: devIds.reservationAtitlanOne,
    type: "KUQUBA_SERVICE_FEE",
    amount: "496.00",
    currency: "GTQ",
    memo: "Servicio KUQUBA reserva KQB-ATITLAN-20260824",
    createdAt: "2026-08-24T00:00:00.000Z"
  });

  const taxEntry = await seedLedgerEntry(prismaClient, {
    id: devIds.ledgerAtitlanTax,
    ledgerAccountId: ownerFinanceAccount.id,
    reservationId: devIds.reservationAtitlanOne,
    type: "TAX",
    amount: "854.00",
    currency: "GTQ",
    memo: "Impuestos estimados reserva KQB-ATITLAN-20260824",
    createdAt: "2026-08-24T00:00:00.000Z"
  });

  const expenseEntry = await seedLedgerEntry(prismaClient, {
    id: devIds.ledgerAtitlanExpense,
    ledgerAccountId: ownerFinanceAccount.id,
    reservationId: null,
    type: "OWNER_EXPENSE",
    amount: "250.00",
    currency: "GTQ",
    memo: "Mantenimiento preventivo terraza",
    createdAt: "2026-08-26T00:00:00.000Z"
  });

  const ownerSettlement = await seedOwnerSettlement(prismaClient, {
    id: devIds.ownerSettlementAtitlanAugust,
    ownerId: owner.id,
    propertyId: atitlanProperty.id,
    periodStart: "2026-08-01",
    periodEnd: "2026-08-31",
    status: "READY_FOR_REVIEW",
    currency: "GTQ",
    grossAccommodation: "6200.00",
    cleaningFees: "425.00",
    taxes: "854.00",
    kuqubaServiceFees: "496.00",
    ownerExpenses: "250.00",
    adjustments: "0.00",
    ownerPayout: "5075.00",
    generatedAt: "2026-08-28T00:00:00.000Z",
    reviewedAt: "2026-08-28T00:00:00.000Z",
    approvedAt: null,
    paidAt: null
  });

  await seedOwnerSettlementLine(prismaClient, {
    id: devIds.ownerSettlementLineAccommodation,
    settlementId: ownerSettlement.id,
    ledgerEntryId: accommodationEntry.id,
    reservationId: devIds.reservationAtitlanOne,
    type: "ACCOMMODATION",
    label: "Alojamiento confirmado KQB-ATITLAN-20260824",
    amount: "6200.00",
    currency: "GTQ",
    occurredAt: "2026-08-24T00:00:00.000Z",
    sourceMemo: "seed owner finance"
  });

  await seedOwnerSettlementLine(prismaClient, {
    id: devIds.ownerSettlementLineCleaning,
    settlementId: ownerSettlement.id,
    ledgerEntryId: cleaningEntry.id,
    reservationId: devIds.reservationAtitlanOne,
    type: "CLEANING",
    label: "Limpieza reserva KQB-ATITLAN-20260824",
    amount: "425.00",
    currency: "GTQ",
    occurredAt: "2026-08-24T00:00:00.000Z",
    sourceMemo: "seed owner finance"
  });

  await seedOwnerSettlementLine(prismaClient, {
    id: devIds.ownerSettlementLineService,
    settlementId: ownerSettlement.id,
    ledgerEntryId: serviceEntry.id,
    reservationId: devIds.reservationAtitlanOne,
    type: "KUQUBA_SERVICE_FEE",
    label: "Servicio KUQUBA",
    amount: "496.00",
    currency: "GTQ",
    occurredAt: "2026-08-24T00:00:00.000Z",
    sourceMemo: "seed owner finance"
  });

  await seedOwnerSettlementLine(prismaClient, {
    id: devIds.ownerSettlementLineTax,
    settlementId: ownerSettlement.id,
    ledgerEntryId: taxEntry.id,
    reservationId: devIds.reservationAtitlanOne,
    type: "TAX",
    label: "Impuestos estimados",
    amount: "854.00",
    currency: "GTQ",
    occurredAt: "2026-08-24T00:00:00.000Z",
    sourceMemo: "seed owner finance"
  });

  await seedOwnerSettlementLine(prismaClient, {
    id: devIds.ownerSettlementLineExpense,
    settlementId: ownerSettlement.id,
    ledgerEntryId: expenseEntry.id,
    reservationId: null,
    type: "OWNER_EXPENSE",
    label: "Mantenimiento preventivo terraza",
    amount: "250.00",
    currency: "GTQ",
    occurredAt: "2026-08-26T00:00:00.000Z",
    sourceMemo: "seed owner finance"
  });

  await seedOwnerTask(prismaClient, {
    id: devIds.taskDocsTax,
    ownerId: owner.id,
    propertyId: null,
    title: "Actualizar datos fiscales de propietario",
    dueLabel: "Antes del cierre mensual",
    priority: "high",
    ownerAction: true,
    sortOrder: 10
  });

  await seedOwnerTask(prismaClient, {
    id: devIds.taskInventoryAntigua,
    ownerId: owner.id,
    propertyId: antiguaProperty.id,
    title: "Confirmar inventario sensible",
    dueLabel: "Esta semana",
    priority: "medium",
    ownerAction: true,
    sortOrder: 20
  });

  await seedOwnerTask(prismaClient, {
    id: devIds.taskMaintenanceAtitlan,
    ownerId: owner.id,
    propertyId: atitlanProperty.id,
    title: "Revisar mantenimiento preventivo de terraza",
    dueLabel: "Programado por KUQUBA",
    priority: "medium",
    ownerAction: false,
    sortOrder: 30
  });

  await seedOwnerTask(prismaClient, {
    id: devIds.taskPhotoAntigua,
    ownerId: owner.id,
    propertyId: antiguaProperty.id,
    title: "Preparar sesion de fotografia",
    dueLabel: "Sin fecha final",
    priority: "low",
    ownerAction: false,
    sortOrder: 40
  });

  await seedOwnerDocument(prismaClient, {
    id: devIds.documentReservations,
    ownerId: owner.id,
    propertyId: atitlanProperty.id,
    label: "Reservas conciliadas",
    statusLabel: "En revision",
    detail: "Se mostraran importes cuando exista libro mayor validado.",
    sortOrder: 10
  });

  await seedOwnerDocument(prismaClient, {
    id: devIds.documentExpenses,
    ownerId: owner.id,
    propertyId: atitlanProperty.id,
    label: "Gastos operativos",
    statusLabel: "Pendiente",
    detail: "Mantenimiento y servicios requieren aprobacion documental.",
    sortOrder: 20
  });

  await seedOwnerDocument(prismaClient, {
    id: devIds.documentTax,
    ownerId: owner.id,
    propertyId: null,
    label: "Documentos",
    statusLabel: "2 pendientes",
    detail: "Datos fiscales e inventario sensible requieren confirmacion.",
    sortOrder: 30
  });
}

async function seedStayCode(
  prismaClient: PrismaClient,
  input: {
    id: string;
    propertyId: string;
    unitId: string;
    code: string;
  }
) {
  await prismaClient.stayCode.upsert({
    where: {
      code: input.code
    },
    create: {
      id: input.id,
      propertyId: input.propertyId,
      unitId: input.unitId,
      code: input.code,
      active: true
    },
    update: {
      propertyId: input.propertyId,
      unitId: input.unitId,
      active: true
    }
  });
}

async function seedRatePlan(
  prismaClient: PrismaClient,
  input: {
    id: string;
    propertyId: string;
    unitId: string;
    name: string;
    currency: string;
    baseNightlyRate: string;
    weekendNightlyRate: string | null;
    cleaningFee: string;
    serviceFeeBps: number;
    taxBps: number;
    minNights: number;
  }
) {
  await prismaClient.ratePlan.upsert({
    where: {
      id: input.id
    },
    create: {
      id: input.id,
      propertyId: input.propertyId,
      unitId: input.unitId,
      name: input.name,
      currency: input.currency,
      baseNightlyRate: input.baseNightlyRate,
      weekendNightlyRate: input.weekendNightlyRate,
      cleaningFee: input.cleaningFee,
      serviceFeeBps: input.serviceFeeBps,
      taxBps: input.taxBps,
      minNights: input.minNights,
      active: true
    },
    update: {
      propertyId: input.propertyId,
      unitId: input.unitId,
      name: input.name,
      currency: input.currency,
      baseNightlyRate: input.baseNightlyRate,
      weekendNightlyRate: input.weekendNightlyRate,
      cleaningFee: input.cleaningFee,
      serviceFeeBps: input.serviceFeeBps,
      taxBps: input.taxBps,
      minNights: input.minNights,
      active: true
    }
  });
}

async function seedAvailabilityBlock(
  prismaClient: PrismaClient,
  input: {
    id: string;
    propertyId: string;
    unitId: string;
    startsOn: string;
    endsOn: string;
    reason: "OWNER_HOLD" | "MAINTENANCE" | "OPS_HOLD";
    note: string | null;
  }
) {
  await prismaClient.availabilityBlock.upsert({
    where: {
      id: input.id
    },
    create: {
      id: input.id,
      propertyId: input.propertyId,
      unitId: input.unitId,
      startsOn: parseDateOnly(input.startsOn),
      endsOn: parseDateOnly(input.endsOn),
      reason: input.reason,
      note: input.note
    },
    update: {
      propertyId: input.propertyId,
      unitId: input.unitId,
      startsOn: parseDateOnly(input.startsOn),
      endsOn: parseDateOnly(input.endsOn),
      reason: input.reason,
      note: input.note
    }
  });
}

async function seedReservation(
  prismaClient: PrismaClient,
  input: {
    id: string;
    privateCode: string;
    guestId: string;
    propertyId: string;
    unitId: string;
    status: "HOLD" | "PENDING_PAYMENT" | "CONFIRMED" | "CANCELLED" | "COMPLETED" | "EXPIRED";
    holdExpiresAt?: string | null;
    currency?: string | null;
    total?: string | null;
    arrivalDate: string;
    departureDate: string;
  }
) {
  await prismaClient.reservation.upsert({
    where: {
      privateCode: input.privateCode
    },
    create: {
      id: input.id,
      guestId: input.guestId,
      propertyId: input.propertyId,
      unitId: input.unitId,
      status: input.status,
      arrivalDate: parseDateOnly(input.arrivalDate),
      departureDate: parseDateOnly(input.departureDate),
      privateCode: input.privateCode,
      holdExpiresAt: input.holdExpiresAt ? new Date(input.holdExpiresAt) : null,
      confirmationSource: input.status === "HOLD" ? "seed_dev" : null,
      currency: input.currency ?? null,
      total: input.total ?? null
    },
    update: {
      guestId: input.guestId,
      propertyId: input.propertyId,
      unitId: input.unitId,
      status: input.status,
      arrivalDate: parseDateOnly(input.arrivalDate),
      departureDate: parseDateOnly(input.departureDate),
      holdExpiresAt: input.holdExpiresAt ? new Date(input.holdExpiresAt) : null,
      confirmationSource: input.status === "HOLD" ? "seed_dev" : null,
      currency: input.currency ?? null,
      total: input.total ?? null
    }
  });
}

async function seedLedgerAccount(
  prismaClient: PrismaClient,
  input: {
    id: string;
    name: string;
    currency: string;
  }
) {
  return prismaClient.ledgerAccount.upsert({
    where: {
      id: input.id
    },
    create: {
      id: input.id,
      name: input.name,
      currency: input.currency
    },
    update: {
      name: input.name,
      currency: input.currency
    }
  });
}

async function seedLedgerEntry(
  prismaClient: PrismaClient,
  input: {
    id: string;
    ledgerAccountId: string;
    reservationId: string | null;
    type:
      | "ACCOMMODATION"
      | "TAX"
      | "OTA_FEE"
      | "PAYMENT_PROCESSING_FEE"
      | "CLEANING"
      | "KUQUBA_SERVICE_FEE"
      | "OWNER_SHARE"
      | "KUQUBA_SHARE"
      | "MAINTENANCE_FUND"
      | "OWNER_EXPENSE"
      | "REFUND"
      | "ADJUSTMENT"
      | "SETTLEMENT";
    amount: string;
    currency: string;
    memo: string;
    createdAt: string;
  }
) {
  return prismaClient.ledgerEntry.upsert({
    where: {
      id: input.id
    },
    create: {
      id: input.id,
      ledgerAccountId: input.ledgerAccountId,
      reservationId: input.reservationId,
      type: input.type,
      amount: input.amount,
      currency: input.currency,
      memo: input.memo,
      createdAt: new Date(input.createdAt)
    },
    update: {
      ledgerAccountId: input.ledgerAccountId,
      reservationId: input.reservationId,
      type: input.type,
      amount: input.amount,
      currency: input.currency,
      memo: input.memo,
      createdAt: new Date(input.createdAt)
    }
  });
}

async function seedOwnerSettlement(
  prismaClient: PrismaClient,
  input: {
    id: string;
    ownerId: string;
    propertyId: string;
    periodStart: string;
    periodEnd: string;
    status: "DRAFT" | "READY_FOR_REVIEW" | "APPROVED" | "PAID";
    currency: string;
    grossAccommodation: string;
    cleaningFees: string;
    taxes: string;
    kuqubaServiceFees: string;
    ownerExpenses: string;
    adjustments: string;
    ownerPayout: string;
    generatedAt: string;
    reviewedAt: string | null;
    approvedAt: string | null;
    paidAt: string | null;
  }
) {
  return prismaClient.ownerSettlement.upsert({
    where: {
      id: input.id
    },
    create: {
      id: input.id,
      ownerId: input.ownerId,
      propertyId: input.propertyId,
      periodStart: parseDateOnly(input.periodStart),
      periodEnd: parseDateOnly(input.periodEnd),
      status: input.status,
      currency: input.currency,
      grossAccommodation: input.grossAccommodation,
      cleaningFees: input.cleaningFees,
      taxes: input.taxes,
      kuqubaServiceFees: input.kuqubaServiceFees,
      ownerExpenses: input.ownerExpenses,
      adjustments: input.adjustments,
      ownerPayout: input.ownerPayout,
      generatedAt: new Date(input.generatedAt),
      reviewedAt: input.reviewedAt ? new Date(input.reviewedAt) : null,
      approvedAt: input.approvedAt ? new Date(input.approvedAt) : null,
      paidAt: input.paidAt ? new Date(input.paidAt) : null
    },
    update: {
      ownerId: input.ownerId,
      propertyId: input.propertyId,
      periodStart: parseDateOnly(input.periodStart),
      periodEnd: parseDateOnly(input.periodEnd),
      status: input.status,
      currency: input.currency,
      grossAccommodation: input.grossAccommodation,
      cleaningFees: input.cleaningFees,
      taxes: input.taxes,
      kuqubaServiceFees: input.kuqubaServiceFees,
      ownerExpenses: input.ownerExpenses,
      adjustments: input.adjustments,
      ownerPayout: input.ownerPayout,
      generatedAt: new Date(input.generatedAt),
      reviewedAt: input.reviewedAt ? new Date(input.reviewedAt) : null,
      approvedAt: input.approvedAt ? new Date(input.approvedAt) : null,
      paidAt: input.paidAt ? new Date(input.paidAt) : null
    }
  });
}

async function seedOwnerSettlementLine(
  prismaClient: PrismaClient,
  input: {
    id: string;
    settlementId: string;
    ledgerEntryId: string;
    reservationId: string | null;
    type:
      | "ACCOMMODATION"
      | "TAX"
      | "OTA_FEE"
      | "PAYMENT_PROCESSING_FEE"
      | "CLEANING"
      | "KUQUBA_SERVICE_FEE"
      | "OWNER_SHARE"
      | "KUQUBA_SHARE"
      | "MAINTENANCE_FUND"
      | "OWNER_EXPENSE"
      | "REFUND"
      | "ADJUSTMENT"
      | "SETTLEMENT";
    label: string;
    amount: string;
    currency: string;
    occurredAt: string;
    sourceMemo: string;
  }
) {
  return prismaClient.ownerSettlementLine.upsert({
    where: {
      id: input.id
    },
    create: {
      id: input.id,
      settlementId: input.settlementId,
      ledgerEntryId: input.ledgerEntryId,
      reservationId: input.reservationId,
      type: input.type,
      label: input.label,
      amount: input.amount,
      currency: input.currency,
      occurredAt: new Date(input.occurredAt),
      sourceMemo: input.sourceMemo
    },
    update: {
      settlementId: input.settlementId,
      ledgerEntryId: input.ledgerEntryId,
      reservationId: input.reservationId,
      type: input.type,
      label: input.label,
      amount: input.amount,
      currency: input.currency,
      occurredAt: new Date(input.occurredAt),
      sourceMemo: input.sourceMemo
    }
  });
}

async function seedHousekeepingTask(
  prismaClient: PrismaClient,
  input: {
    id: string;
    propertyId: string;
    unitId: string | null;
    reservationId: string | null;
    title: string;
    status: "SCHEDULED" | "ASSIGNED" | "IN_PROGRESS" | "DONE" | "BLOCKED" | "CANCELLED";
    priority: "high" | "medium" | "low";
    serviceDate: string;
    serviceWindow: string | null;
    assigneeName: string | null;
    vendorName: string | null;
    checklist: Prisma.InputJsonValue;
    notes: string | null;
    blockedReason: string | null;
    completedAt: string | null;
  }
) {
  await prismaClient.housekeepingTask.upsert({
    where: {
      id: input.id
    },
    create: {
      id: input.id,
      propertyId: input.propertyId,
      unitId: input.unitId,
      reservationId: input.reservationId,
      title: input.title,
      status: input.status,
      priority: input.priority,
      serviceDate: parseDateOnly(input.serviceDate),
      serviceWindow: input.serviceWindow,
      assigneeName: input.assigneeName,
      vendorName: input.vendorName,
      checklist: input.checklist,
      notes: input.notes,
      blockedReason: input.blockedReason,
      completedAt: input.completedAt ? new Date(input.completedAt) : null
    },
    update: {
      propertyId: input.propertyId,
      unitId: input.unitId,
      reservationId: input.reservationId,
      title: input.title,
      status: input.status,
      priority: input.priority,
      serviceDate: parseDateOnly(input.serviceDate),
      serviceWindow: input.serviceWindow,
      assigneeName: input.assigneeName,
      vendorName: input.vendorName,
      checklist: input.checklist,
      notes: input.notes,
      blockedReason: input.blockedReason,
      completedAt: input.completedAt ? new Date(input.completedAt) : null
    }
  });
}

async function seedMaintenanceTicket(
  prismaClient: PrismaClient,
  input: {
    id: string;
    propertyId: string;
    unitId: string | null;
    title: string;
    category: string;
    severity: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
    status: "OPEN" | "TRIAGED" | "SCHEDULED" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
    reportedAt: string;
    dueAt: string | null;
    assigneeName: string | null;
    vendorName: string | null;
    description: string;
    resolutionNotes: string | null;
    completedAt: string | null;
  }
) {
  await prismaClient.maintenanceTicket.upsert({
    where: {
      id: input.id
    },
    create: {
      id: input.id,
      propertyId: input.propertyId,
      unitId: input.unitId,
      title: input.title,
      category: input.category,
      severity: input.severity,
      status: input.status,
      reportedAt: new Date(input.reportedAt),
      dueAt: input.dueAt ? new Date(input.dueAt) : null,
      assigneeName: input.assigneeName,
      vendorName: input.vendorName,
      description: input.description,
      resolutionNotes: input.resolutionNotes,
      completedAt: input.completedAt ? new Date(input.completedAt) : null
    },
    update: {
      propertyId: input.propertyId,
      unitId: input.unitId,
      title: input.title,
      category: input.category,
      severity: input.severity,
      status: input.status,
      reportedAt: new Date(input.reportedAt),
      dueAt: input.dueAt ? new Date(input.dueAt) : null,
      assigneeName: input.assigneeName,
      vendorName: input.vendorName,
      description: input.description,
      resolutionNotes: input.resolutionNotes,
      completedAt: input.completedAt ? new Date(input.completedAt) : null
    }
  });
}
async function seedOwnerTask(
  prismaClient: PrismaClient,
  input: {
    id: string;
    ownerId: string;
    propertyId: string | null;
    title: string;
    dueLabel: string;
    priority: "high" | "medium" | "low";
    ownerAction: boolean;
    sortOrder: number;
  }
) {
  await prismaClient.ownerTask.upsert({
    where: {
      id: input.id
    },
    create: {
      id: input.id,
      ownerId: input.ownerId,
      propertyId: input.propertyId,
      title: input.title,
      dueLabel: input.dueLabel,
      priority: input.priority,
      ownerAction: input.ownerAction,
      status: "OPEN",
      sortOrder: input.sortOrder
    },
    update: {
      ownerId: input.ownerId,
      propertyId: input.propertyId,
      title: input.title,
      dueLabel: input.dueLabel,
      priority: input.priority,
      ownerAction: input.ownerAction,
      status: "OPEN",
      sortOrder: input.sortOrder
    }
  });
}

async function seedOwnerDocument(
  prismaClient: PrismaClient,
  input: {
    id: string;
    ownerId: string;
    propertyId: string | null;
    label: string;
    statusLabel: string;
    detail: string;
    sortOrder: number;
  }
) {
  await prismaClient.ownerDocument.upsert({
    where: {
      id: input.id
    },
    create: {
      id: input.id,
      ownerId: input.ownerId,
      propertyId: input.propertyId,
      label: input.label,
      statusLabel: input.statusLabel,
      detail: input.detail,
      sortOrder: input.sortOrder
    },
    update: {
      ownerId: input.ownerId,
      propertyId: input.propertyId,
      label: input.label,
      statusLabel: input.statusLabel,
      detail: input.detail,
      sortOrder: input.sortOrder
    }
  });
}

async function seedOpsWorkbench(prismaClient: PrismaClient, input: { opsUserId: string }) {
  await prismaClient.ownerLead.upsert({
    where: {
      id: devIds.ownerLeadAtitlan
    },
    create: {
      id: devIds.ownerLeadAtitlan,
      ownerName: "Mariana Castillo",
      email: "mariana.castillo@example.com",
      phone: "+50255551111",
      propertyName: "Casa Brisa Atitlan",
      propertyType: "Casa completa",
      propertyLocation: "San Marcos La Laguna",
      operatingStatus: "Por evaluar",
      message: "Propiedad familiar con muelle compartido y necesidad de revisar reglas de acceso.",
      status: "NEW",
      correlationId: "seed-owner-lead-atitlan"
    },
    update: {
      ownerName: "Mariana Castillo",
      email: "mariana.castillo@example.com",
      phone: "+50255551111",
      propertyName: "Casa Brisa Atitlan",
      propertyType: "Casa completa",
      propertyLocation: "San Marcos La Laguna",
      operatingStatus: "Por evaluar",
      message: "Propiedad familiar con muelle compartido y necesidad de revisar reglas de acceso.",
      status: "NEW",
      correlationId: "seed-owner-lead-atitlan"
    }
  });

  await prismaClient.ownerLead.upsert({
    where: {
      id: devIds.ownerLeadAntigua
    },
    create: {
      id: devIds.ownerLeadAntigua,
      ownerName: "Roberto Herrera",
      email: "roberto.herrera@example.com",
      phone: "+50255552222",
      propertyName: "Suite Patio Central",
      propertyType: "Apartamento",
      propertyLocation: "Antigua Guatemala",
      operatingStatus: "Ya publicada en OTAs",
      message: "Busca separar uso familiar de calendario comercial y revisar soporte de limpieza.",
      status: "REVIEWING",
      correlationId: "seed-owner-lead-antigua"
    },
    update: {
      ownerName: "Roberto Herrera",
      email: "roberto.herrera@example.com",
      phone: "+50255552222",
      propertyName: "Suite Patio Central",
      propertyType: "Apartamento",
      propertyLocation: "Antigua Guatemala",
      operatingStatus: "Ya publicada en OTAs",
      message: "Busca separar uso familiar de calendario comercial y revisar soporte de limpieza.",
      status: "REVIEWING",
      correlationId: "seed-owner-lead-antigua"
    }
  });

  await prismaClient.stayProposalRequest.upsert({
    where: {
      id: devIds.proposalRequestAtitlan
    },
    create: {
      id: devIds.proposalRequestAtitlan,
      stayId: "atitlan-villa-luz",
      stayName: "Villa Luz de Atitlan",
      destination: "Lago de Atitlan",
      guestName: "Laura Mendoza",
      email: "laura.mendoza@example.com",
      phone: "+50255553333",
      arrivalDate: parseDateOnly("2026-09-12"),
      departureDate: parseDateOnly("2026-09-15"),
      guests: 4,
      message: "Viaje familiar con llegada flexible y solicitud de cocina equipada.",
      status: "NEW",
      correlationId: "seed-proposal-atitlan"
    },
    update: {
      stayId: "atitlan-villa-luz",
      stayName: "Villa Luz de Atitlan",
      destination: "Lago de Atitlan",
      guestName: "Laura Mendoza",
      email: "laura.mendoza@example.com",
      phone: "+50255553333",
      arrivalDate: parseDateOnly("2026-09-12"),
      departureDate: parseDateOnly("2026-09-15"),
      guests: 4,
      message: "Viaje familiar con llegada flexible y solicitud de cocina equipada.",
      status: "NEW",
      correlationId: "seed-proposal-atitlan"
    }
  });

  await prismaClient.stayProposalRequest.upsert({
    where: {
      id: devIds.proposalRequestAntigua
    },
    create: {
      id: devIds.proposalRequestAntigua,
      stayId: "antigua-suite-jardin",
      stayName: "Suite Jardin Antigua",
      destination: "Antigua Guatemala",
      guestName: "Diego Pineda",
      email: "diego.pineda@example.com",
      arrivalDate: parseDateOnly("2026-10-03"),
      departureDate: parseDateOnly("2026-10-05"),
      guests: 2,
      message: "Escapada de fin de semana con interes en late checkout.",
      status: "REVIEWING",
      correlationId: "seed-proposal-antigua"
    },
    update: {
      stayId: "antigua-suite-jardin",
      stayName: "Suite Jardin Antigua",
      destination: "Antigua Guatemala",
      guestName: "Diego Pineda",
      email: "diego.pineda@example.com",
      arrivalDate: parseDateOnly("2026-10-03"),
      departureDate: parseDateOnly("2026-10-05"),
      guests: 2,
      message: "Escapada de fin de semana con interes en late checkout.",
      status: "REVIEWING",
      correlationId: "seed-proposal-antigua"
    }
  });
  await seedOpsCase(prismaClient, {
    id: devIds.opsCaseOwnerLeadAtitlan,
    sourceType: "OWNER_LEAD",
    sourceId: devIds.ownerLeadAtitlan,
    title: "Casa Brisa Atitlan",
    contactName: "Mariana Castillo",
    contactEmail: "mariana.castillo@example.com",
    contactPhone: "+50255551111",
    status: "QUALIFYING",
    priority: "high",
    nextStep: "Confirmar visita tecnica y validar reglas de acceso al muelle.",
    notes: [
      {
        id: devIds.opsNoteOwnerLeadAtitlan,
        body: "Lead con potencial alto por ubicacion y disponibilidad familiar flexible. Requiere validacion operativa en sitio."
      }
    ],
    tasks: [
      {
        id: devIds.opsTaskOwnerLeadCall,
        title: "Llamar a Mariana para confirmar disponibilidad",
        dueLabel: "Hoy",
        priority: "high",
        sortOrder: 10
      },
      {
        id: devIds.opsTaskOwnerLeadPhotos,
        title: "Solicitar fotos actuales de habitaciones y muelle",
        dueLabel: "Esta semana",
        priority: "medium",
        sortOrder: 20
      }
    ]
  });

  await seedOpsCase(prismaClient, {
    id: devIds.opsCaseOwnerLeadAntigua,
    sourceType: "OWNER_LEAD",
    sourceId: devIds.ownerLeadAntigua,
    title: "Suite Patio Central",
    contactName: "Roberto Herrera",
    contactEmail: "roberto.herrera@example.com",
    contactPhone: "+50255552222",
    status: "ACTION_PENDING",
    priority: "normal",
    nextStep: "Revisar calendario OTA y propuesta de separacion de uso familiar.",
    notes: [
      {
        id: devIds.opsNoteOwnerLeadAntigua,
        body: "Ya opera en OTAs. El valor inmediato esta en orden operativo, calendario y limpieza."
      }
    ],
    tasks: [
      {
        id: devIds.opsTaskOwnerLeadAntiguaCalendar,
        title: "Pedir acceso o captura del calendario actual",
        dueLabel: "Manana",
        priority: "medium",
        sortOrder: 10
      }
    ]
  });

  await seedOpsCase(prismaClient, {
    id: devIds.opsCaseProposalAtitlan,
    sourceType: "STAY_PROPOSAL_REQUEST",
    sourceId: devIds.proposalRequestAtitlan,
    title: "Villa Luz de Atitlan",
    contactName: "Laura Mendoza",
    contactEmail: "laura.mendoza@example.com",
    contactPhone: "+50255553333",
    status: "OPEN",
    priority: "normal",
    nextStep: "Preparar propuesta con cocina equipada y llegada flexible.",
    notes: [
      {
        id: devIds.opsNoteProposalAtitlan,
        body: "Familia de cuatro personas. Conviene responder con tarifa total y condiciones de llegada flexible."
      }
    ],
    tasks: [
      {
        id: devIds.opsTaskProposalAvailability,
        title: "Validar disponibilidad del 12 al 15 de septiembre",
        dueLabel: "Hoy",
        priority: "high",
        sortOrder: 10
      },
      {
        id: devIds.opsTaskProposalQuote,
        title: "Enviar propuesta inicial por correo",
        dueLabel: "Despues de validar disponibilidad",
        priority: "medium",
        sortOrder: 20
      }
    ]
  });
  await seedPropertyOnboarding(prismaClient, {
    id: devIds.propertyOnboardingAtitlan,
    opsCaseId: devIds.opsCaseOwnerLeadAtitlan,
    ownerLeadId: devIds.ownerLeadAtitlan,
    candidatePropertyName: "Casa Brisa Atitlan",
    propertyType: "Casa completa",
    propertyLocation: "San Marcos La Laguna",
    ownerName: "Mariana Castillo",
    ownerEmail: "mariana.castillo@example.com",
    ownerPhone: "+50255551111",
    status: "QUALIFICATION",
    nextMilestone: "Visita tecnica y checklist documental inicial",
    checklist: [
      { key: "technical_visit", label: "Visita tecnica", status: "OPEN" },
      { key: "ownership_docs", label: "Documentos de propiedad", status: "OPEN" },
      { key: "access_rules", label: "Reglas de acceso", status: "OPEN" }
    ],
    assignedUserId: input.opsUserId,
    targetDate: "2026-08-30",
    handoffNotes:
      "Coordinar visita tecnica, documentos iniciales y reglas de acceso antes de marcar listo ops.",
    approvalStatus: "DRAFT",
    approvedAt: null,
    approvedByUserId: null,
    sentAt: null,
    sentByUserId: null,
    deliveryNotes: null,
    activities: [
      {
        id: devIds.formalActivityOnboardingAtitlan,
        actorUserId: input.opsUserId,
        body: "Asignado a equipo ops para preparar visita tecnica y validar documentacion base.",
        createdAt: "2026-08-23T10:00:00.000Z"
      }
    ]
  });

  await seedStayProposal(prismaClient, {
    id: devIds.stayProposalAtitlanFormal,
    versionId: devIds.stayProposalAtitlanVersionOne,
    opsCaseId: devIds.opsCaseProposalAtitlan,
    proposalRequestId: devIds.proposalRequestAtitlan,
    stayId: "atitlan-villa-luz",
    stayName: "Villa Luz de Atitlan",
    destination: "Lago de Atitlan",
    guestName: "Laura Mendoza",
    guestEmail: "laura.mendoza@example.com",
    guestPhone: "+50255553333",
    arrivalDate: "2026-09-12",
    departureDate: "2026-09-15",
    guests: 4,
    status: "DRAFT",
    version: 1,
    title: "Propuesta inicial Villa Luz de Atitlan",
    summary: "Estancia familiar para cuatro personas con llegada flexible y cocina equipada.",
    termsLabel: "Borrador interno sujeto a disponibilidad final",
    internalNotes: "No enviar hasta validar disponibilidad operativa y condiciones de llegada.",
    assignedUserId: input.opsUserId,
    targetDate: "2026-08-24",
    handoffNotes:
      "Validar disponibilidad, ajustar terminos y dejar propuesta lista para aprobacion interna.",
    approvalStatus: "READY_FOR_APPROVAL",
    approvedAt: null,
    approvedByUserId: null,
    sentAt: null,
    sentByUserId: null,
    deliveryNotes: "Lista para revision interna; no hay envio real registrado.",
    activities: [
      {
        id: devIds.formalActivityProposalAtitlan,
        actorUserId: input.opsUserId,
        body: "Propuesta formal abierta con version inicial y pendiente de validacion operativa.",
        createdAt: "2026-08-23T10:10:00.000Z"
      },
      {
        id: devIds.formalActivityProposalApprovalAtitlan,
        actorUserId: input.opsUserId,
        body: "Solicitud de aprobacion formal registrada para propuesta demo.",
        createdAt: "2026-08-23T10:20:00.000Z"
      }
    ]
  });
}

async function seedOpsCase(
  prismaClient: PrismaClient,
  input: {
    id: string;
    sourceType: "OWNER_LEAD" | "STAY_PROPOSAL_REQUEST";
    sourceId: string;
    title: string;
    contactName: string;
    contactEmail: string;
    contactPhone: string | null;
    status: "OPEN" | "QUALIFYING" | "ACTION_PENDING" | "CLOSED";
    priority: "high" | "normal" | "medium" | "low";
    nextStep: string;
    notes: Array<{ id: string; body: string }>;
    tasks: Array<{
      id: string;
      title: string;
      dueLabel: string;
      priority: "high" | "normal" | "medium" | "low";
      sortOrder: number;
    }>;
  }
) {
  const opsCase = await prismaClient.opsCase.upsert({
    where: {
      sourceType_sourceId: {
        sourceType: input.sourceType,
        sourceId: input.sourceId
      }
    },
    create: {
      id: input.id,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      title: input.title,
      contactName: input.contactName,
      contactEmail: input.contactEmail,
      contactPhone: input.contactPhone,
      status: input.status,
      priority: input.priority,
      nextStep: input.nextStep
    },
    update: {
      title: input.title,
      contactName: input.contactName,
      contactEmail: input.contactEmail,
      contactPhone: input.contactPhone,
      status: input.status,
      priority: input.priority,
      nextStep: input.nextStep
    }
  });

  for (const note of input.notes) {
    await prismaClient.opsCaseNote.upsert({
      where: {
        id: note.id
      },
      create: {
        id: note.id,
        opsCaseId: opsCase.id,
        body: note.body
      },
      update: {
        opsCaseId: opsCase.id,
        body: note.body
      }
    });
  }

  for (const task of input.tasks) {
    await prismaClient.opsCaseTask.upsert({
      where: {
        id: task.id
      },
      create: {
        id: task.id,
        opsCaseId: opsCase.id,
        title: task.title,
        dueLabel: task.dueLabel,
        priority: task.priority,
        status: "OPEN",
        sortOrder: task.sortOrder
      },
      update: {
        opsCaseId: opsCase.id,
        title: task.title,
        dueLabel: task.dueLabel,
        priority: task.priority,
        status: "OPEN",
        sortOrder: task.sortOrder
      }
    });
  }
}

async function seedPropertyOnboarding(
  prismaClient: PrismaClient,
  input: {
    id: string;
    opsCaseId: string;
    ownerLeadId: string;
    candidatePropertyName: string;
    propertyType: string;
    propertyLocation: string;
    ownerName: string;
    ownerEmail: string;
    ownerPhone: string | null;
    status: "DRAFT" | "QUALIFICATION" | "DOCUMENTS" | "OPERATIONS_READY" | "CLOSED";
    nextMilestone: string;
    checklist: Array<{ key: string; label: string; status: "OPEN" | "DONE" }>;
    assignedUserId: string | null;
    targetDate: string | null;
    handoffNotes: string | null;
    approvalStatus: "DRAFT" | "READY_FOR_APPROVAL" | "APPROVED" | "SENT";
    approvedAt: string | null;
    approvedByUserId: string | null;
    sentAt: string | null;
    sentByUserId: string | null;
    deliveryNotes: string | null;
    activities: Array<{ id: string; actorUserId: string; body: string; createdAt: string }>;
  }
) {
  const onboarding = await prismaClient.propertyOnboarding.upsert({
    where: {
      ownerLeadId: input.ownerLeadId
    },
    create: {
      id: input.id,
      opsCaseId: input.opsCaseId,
      ownerLeadId: input.ownerLeadId,
      candidatePropertyName: input.candidatePropertyName,
      propertyType: input.propertyType,
      propertyLocation: input.propertyLocation,
      ownerName: input.ownerName,
      ownerEmail: input.ownerEmail,
      ownerPhone: input.ownerPhone,
      status: input.status,
      nextMilestone: input.nextMilestone,
      checklist: input.checklist,
      assignedUserId: input.assignedUserId,
      targetDate: input.targetDate ? parseDateOnly(input.targetDate) : null,
      handoffNotes: input.handoffNotes,
      approvalStatus: input.approvalStatus,
      approvedAt: input.approvedAt ? new Date(input.approvedAt) : null,
      approvedByUserId: input.approvedByUserId,
      sentAt: input.sentAt ? new Date(input.sentAt) : null,
      sentByUserId: input.sentByUserId,
      deliveryNotes: input.deliveryNotes,
      deliveryStatus: null,
      deliveryProvider: null,
      providerMessageId: null,
      deliveryChannel: null,
      deliveryTemplateKey: null,
      deliveryTemplateVersion: null,
      deliveredAt: null,
      deliveryFailedAt: null,
      deliveryErrorCode: null,
      deliveryErrorMessage: null
    },
    update: {
      opsCaseId: input.opsCaseId,
      candidatePropertyName: input.candidatePropertyName,
      propertyType: input.propertyType,
      propertyLocation: input.propertyLocation,
      ownerName: input.ownerName,
      ownerEmail: input.ownerEmail,
      ownerPhone: input.ownerPhone,
      status: input.status,
      nextMilestone: input.nextMilestone,
      checklist: input.checklist,
      assignedUserId: input.assignedUserId,
      targetDate: input.targetDate ? parseDateOnly(input.targetDate) : null,
      handoffNotes: input.handoffNotes,
      approvalStatus: input.approvalStatus,
      approvedAt: input.approvedAt ? new Date(input.approvedAt) : null,
      approvedByUserId: input.approvedByUserId,
      sentAt: input.sentAt ? new Date(input.sentAt) : null,
      sentByUserId: input.sentByUserId,
      deliveryNotes: input.deliveryNotes,
      deliveryStatus: null,
      deliveryProvider: null,
      providerMessageId: null,
      deliveryChannel: null,
      deliveryTemplateKey: null,
      deliveryTemplateVersion: null,
      deliveredAt: null,
      deliveryFailedAt: null,
      deliveryErrorCode: null,
      deliveryErrorMessage: null
    }
  });

  await seedFormalActivities(prismaClient, {
    opsCaseId: input.opsCaseId,
    entityType: "PropertyOnboarding",
    entityId: onboarding.id,
    activities: input.activities
  });
}

async function seedStayProposal(
  prismaClient: PrismaClient,
  input: {
    id: string;
    versionId: string;
    opsCaseId: string;
    proposalRequestId: string;
    stayId: string;
    stayName: string;
    destination: string;
    guestName: string;
    guestEmail: string;
    guestPhone: string | null;
    arrivalDate: string | null;
    departureDate: string | null;
    guests: number;
    status: "DRAFT" | "READY_TO_SEND" | "SENT" | "ACCEPTED" | "DECLINED" | "VOID";
    version: number;
    title: string;
    summary: string;
    termsLabel: string;
    internalNotes: string | null;
    assignedUserId: string | null;
    targetDate: string | null;
    handoffNotes: string | null;
    approvalStatus: "DRAFT" | "READY_FOR_APPROVAL" | "APPROVED" | "SENT";
    approvedAt: string | null;
    approvedByUserId: string | null;
    sentAt: string | null;
    sentByUserId: string | null;
    deliveryNotes: string | null;
    activities: Array<{ id: string; actorUserId: string; body: string; createdAt: string }>;
  }
) {
  const proposal = await prismaClient.stayProposal.upsert({
    where: {
      proposalRequestId: input.proposalRequestId
    },
    create: {
      id: input.id,
      opsCaseId: input.opsCaseId,
      proposalRequestId: input.proposalRequestId,
      stayId: input.stayId,
      stayName: input.stayName,
      destination: input.destination,
      guestName: input.guestName,
      guestEmail: input.guestEmail,
      guestPhone: input.guestPhone,
      arrivalDate: input.arrivalDate ? parseDateOnly(input.arrivalDate) : null,
      departureDate: input.departureDate ? parseDateOnly(input.departureDate) : null,
      guests: input.guests,
      status: input.status,
      currentVersion: input.version,
      assignedUserId: input.assignedUserId,
      targetDate: input.targetDate ? parseDateOnly(input.targetDate) : null,
      handoffNotes: input.handoffNotes,
      approvalStatus: input.approvalStatus,
      approvedAt: input.approvedAt ? new Date(input.approvedAt) : null,
      approvedByUserId: input.approvedByUserId,
      sentAt: input.sentAt ? new Date(input.sentAt) : null,
      sentByUserId: input.sentByUserId,
      deliveryNotes: input.deliveryNotes,
      deliveryStatus: null,
      deliveryProvider: null,
      providerMessageId: null,
      deliveryChannel: null,
      deliveryTemplateKey: null,
      deliveryTemplateVersion: null,
      deliveredAt: null,
      deliveryFailedAt: null,
      deliveryErrorCode: null,
      deliveryErrorMessage: null
    },
    update: {
      opsCaseId: input.opsCaseId,
      stayId: input.stayId,
      stayName: input.stayName,
      destination: input.destination,
      guestName: input.guestName,
      guestEmail: input.guestEmail,
      guestPhone: input.guestPhone,
      arrivalDate: input.arrivalDate ? parseDateOnly(input.arrivalDate) : null,
      departureDate: input.departureDate ? parseDateOnly(input.departureDate) : null,
      guests: input.guests,
      status: input.status,
      currentVersion: input.version,
      assignedUserId: input.assignedUserId,
      targetDate: input.targetDate ? parseDateOnly(input.targetDate) : null,
      handoffNotes: input.handoffNotes,
      approvalStatus: input.approvalStatus,
      approvedAt: input.approvedAt ? new Date(input.approvedAt) : null,
      approvedByUserId: input.approvedByUserId,
      sentAt: input.sentAt ? new Date(input.sentAt) : null,
      sentByUserId: input.sentByUserId,
      deliveryNotes: input.deliveryNotes,
      deliveryStatus: null,
      deliveryProvider: null,
      providerMessageId: null,
      deliveryChannel: null,
      deliveryTemplateKey: null,
      deliveryTemplateVersion: null,
      deliveredAt: null,
      deliveryFailedAt: null,
      deliveryErrorCode: null,
      deliveryErrorMessage: null
    }
  });

  await prismaClient.stayProposalVersion.deleteMany({
    where: {
      stayProposalId: proposal.id,
      version: {
        not: input.version
      }
    }
  });

  await prismaClient.stayProposalVersion.upsert({
    where: {
      stayProposalId_version: {
        stayProposalId: proposal.id,
        version: input.version
      }
    },
    create: {
      id: input.versionId,
      stayProposalId: proposal.id,
      version: input.version,
      title: input.title,
      summary: input.summary,
      termsLabel: input.termsLabel,
      internalNotes: input.internalNotes
    },
    update: {
      title: input.title,
      summary: input.summary,
      termsLabel: input.termsLabel,
      internalNotes: input.internalNotes
    }
  });

  await seedFormalActivities(prismaClient, {
    opsCaseId: input.opsCaseId,
    entityType: "StayProposal",
    entityId: proposal.id,
    activities: input.activities
  });
}

async function seedFormalActivities(
  prismaClient: PrismaClient,
  input: {
    opsCaseId: string;
    entityType: "PropertyOnboarding" | "StayProposal";
    entityId: string;
    activities: Array<{ id: string; actorUserId: string; body: string; createdAt: string }>;
  }
) {
  await prismaClient.opsFormalDelivery.deleteMany({
    where: {
      opsCaseId: input.opsCaseId
    }
  });

  await prismaClient.opsFormalActivity.deleteMany({
    where: {
      opsCaseId: input.opsCaseId
    }
  });

  for (const activity of input.activities) {
    await prismaClient.opsFormalActivity.create({
      data: {
        id: activity.id,
        opsCaseId: input.opsCaseId,
        actorUserId: activity.actorUserId,
        entityType: input.entityType,
        entityId: input.entityId,
        body: activity.body,
        createdAt: new Date(activity.createdAt)
      }
    });
  }
}
function buildSeedContractTermsSnapshot(input: {
  kuqubaShareBps: number;
  ownerName: string;
  ownerShareBps: number;
  propertyLocation: string;
  propertyName: string;
  propertyType: string;
  version: number;
}) {
  return {
    commercialModel: "seed_dev_terms_pending_finance",
    kuqubaShareBps: input.kuqubaShareBps,
    ownerName: input.ownerName,
    ownerShareBps: input.ownerShareBps,
    propertyLocation: input.propertyLocation,
    propertyName: input.propertyName,
    propertyType: input.propertyType,
    serviceScope: ["publicacion", "operacion", "housekeeping_coordination", "owner_reporting"],
    version: input.version
  };
}

function buildSeedSignatureHash(contractId: string, signatureProviderRef: string) {
  return createHash("sha256")
    .update(
      JSON.stringify({
        contractId,
        signatureProvider: "seed_dev_signature",
        signatureProviderRef
      })
    )
    .digest("hex");
}

function parseDateOnly(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

main()
  .then(async () => {
    await prisma?.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma?.$disconnect();
    process.exit(1);
  });
