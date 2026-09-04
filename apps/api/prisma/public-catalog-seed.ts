import { PrismaClient, type Prisma } from "@prisma/client";
import { permissionKeys, roleProfiles } from "@kuquba/config";

const defaultDevDatabaseUrl =
  "postgresql://kuquba:kuquba_dev_password@127.0.0.1:55432/kuquba_dev?schema=public";

process.env.DATABASE_URL ??= defaultDevDatabaseUrl;

const ids = {
  organization: "00000000-0000-4000-8000-000000000001",
  owner: "00000000-0000-4000-8000-000000000101",
  property: "00000000-0000-4000-8000-000000000201",
  unit: "00000000-0000-4000-8000-000000000301",
  stayCode: "00000000-0000-4000-8000-000000000331",
  ratePlan: "00000000-0000-4000-8000-000000000341",
  availabilityBlock: "00000000-0000-4000-8000-000000000351",
  contract: "00000000-0000-4000-8000-000000000401",
  contractVersion: "00000000-0000-4000-8000-000000000411",
  imageCover: "00000000-0000-4000-8000-000000000421",
  imageSuite: "00000000-0000-4000-8000-000000000422"
} as const;

const stay = {
  amenities: ["Cocina equipada", "Terraza", "WiFi", "Parqueo coordinado"],
  bookingNote: "Disponibilidad, tarifa y bloqueo temporal se validan antes de pago.",
  code: "atitlan-villa-luz",
  contractSummary: "Administracion profesional para Villa Luz de Atitlan en Lago de Atitlan.",
  contractTitle: "Contrato KUQUBA v1 - Villa Luz de Atitlan",
  destination: "Lago de Atitlan",
  houseRules: ["Llegada coordinada", "Tarifa visible tras cotizacion", "Ocupacion segun reserva"],
  name: "Villa Luz de Atitlan",
  neighborhood: "Panajachel y pueblos cercanos",
  operations: ["Preparacion previa", "Soporte local", "Revision de salida"],
  stayStyle: "Villa privada",
  summary:
    "Casa privada para viajes tranquilos, desayunos largos y vistas abiertas hacia lago y volcanes."
} as const;

export async function seedPublicCatalog(prisma: PrismaClient) {
  await seedAccessControl(prisma);

  const organization = await prisma.organization.upsert({
    where: { id: ids.organization },
    create: {
      id: ids.organization,
      name: "KUQUBA Dev"
    },
    update: {
      name: "KUQUBA Dev"
    }
  });

  const owner = await prisma.owner.upsert({
    where: { id: ids.owner },
    create: {
      id: ids.owner,
      organizationId: organization.id,
      displayName: "Propietario KUQUBA",
      email: "owner.dev@kuquba.local"
    },
    update: {
      organizationId: organization.id,
      displayName: "Propietario KUQUBA",
      email: "owner.dev@kuquba.local"
    }
  });

  const property = await prisma.property.upsert({
    where: { id: ids.property },
    create: {
      id: ids.property,
      organizationId: organization.id,
      name: stay.name,
      destination: stay.destination,
      neighborhood: stay.neighborhood,
      summary: stay.summary,
      stayStyle: stay.stayStyle,
      bookingNote: stay.bookingNote,
      amenities: stay.amenities as Prisma.InputJsonValue,
      houseRules: stay.houseRules as Prisma.InputJsonValue,
      operations: stay.operations as Prisma.InputJsonValue,
      visibility: "PUBLIC"
    },
    update: {
      organizationId: organization.id,
      name: stay.name,
      destination: stay.destination,
      neighborhood: stay.neighborhood,
      summary: stay.summary,
      stayStyle: stay.stayStyle,
      bookingNote: stay.bookingNote,
      amenities: stay.amenities as Prisma.InputJsonValue,
      houseRules: stay.houseRules as Prisma.InputJsonValue,
      operations: stay.operations as Prisma.InputJsonValue,
      visibility: "PUBLIC"
    }
  });

  const unit = await prisma.unit.upsert({
    where: { id: ids.unit },
    create: {
      id: ids.unit,
      propertyId: property.id,
      name: "Casa completa",
      maxGuests: 6,
      bedrooms: 3,
      bathrooms: "2.50"
    },
    update: {
      propertyId: property.id,
      name: "Casa completa",
      maxGuests: 6,
      bedrooms: 3,
      bathrooms: "2.50"
    }
  });

  await prisma.stayCode.upsert({
    where: { code: stay.code },
    create: {
      id: ids.stayCode,
      propertyId: property.id,
      unitId: unit.id,
      code: stay.code,
      active: true
    },
    update: {
      propertyId: property.id,
      unitId: unit.id,
      active: true
    }
  });

  await prisma.propertyImage.upsert({
    where: { id: ids.imageCover },
    create: {
      id: ids.imageCover,
      propertyId: property.id,
      url: "/images/hero-villa-atitlan.png",
      alt: "Villa con terraza abierta frente al Lago de Atitlan",
      sortOrder: 0,
      isCover: true
    },
    update: {
      propertyId: property.id,
      url: "/images/hero-villa-atitlan.png",
      alt: "Villa con terraza abierta frente al Lago de Atitlan",
      sortOrder: 0,
      isCover: true
    }
  });

  await prisma.propertyImage.upsert({
    where: { id: ids.imageSuite },
    create: {
      id: ids.imageSuite,
      propertyId: property.id,
      url: "/images/guest-suite.png",
      alt: "Dormitorio preparado para llegada privada",
      sortOrder: 1,
      isCover: false
    },
    update: {
      propertyId: property.id,
      url: "/images/guest-suite.png",
      alt: "Dormitorio preparado para llegada privada",
      sortOrder: 1,
      isCover: false
    }
  });

  await prisma.ratePlan.upsert({
    where: { id: ids.ratePlan },
    create: {
      id: ids.ratePlan,
      propertyId: property.id,
      unitId: unit.id,
      name: "Tarifa base Atitlan",
      currency: "GTQ",
      baseNightlyRate: "1550.00",
      weekendNightlyRate: "1750.00",
      cleaningFee: "425.00",
      serviceFeeBps: 800,
      taxBps: 1200,
      minNights: 2,
      active: true
    },
    update: {
      propertyId: property.id,
      unitId: unit.id,
      name: "Tarifa base Atitlan",
      currency: "GTQ",
      baseNightlyRate: "1550.00",
      weekendNightlyRate: "1750.00",
      cleaningFee: "425.00",
      serviceFeeBps: 800,
      taxBps: 1200,
      minNights: 2,
      active: true
    }
  });

  const termsSnapshot = buildTermsSnapshot();
  await prisma.contract.upsert({
    where: { id: ids.contract },
    create: {
      id: ids.contract,
      propertyId: property.id,
      ownerId: owner.id,
      status: "ACTIVE",
      currentVersion: 1,
      title: stay.contractTitle,
      summary: stay.contractSummary,
      termsSnapshot,
      startsOn: parseDateOnly("2026-01-01"),
      endsOn: null,
      ownerShareBps: 0,
      kuqubaShareBps: 0,
      issuedAt: parseDateOnly("2026-01-01"),
      signedAt: parseDateOnly("2026-01-02"),
      signatureProvider: "public_catalog_seed",
      signatureProviderRef: `public-catalog-${stay.code}`,
      signatureEvidenceHash: `public-catalog-${ids.contract}`
    },
    update: {
      propertyId: property.id,
      ownerId: owner.id,
      status: "ACTIVE",
      currentVersion: 1,
      title: stay.contractTitle,
      summary: stay.contractSummary,
      termsSnapshot,
      startsOn: parseDateOnly("2026-01-01"),
      endsOn: null,
      ownerShareBps: 0,
      kuqubaShareBps: 0,
      issuedAt: parseDateOnly("2026-01-01"),
      signedAt: parseDateOnly("2026-01-02"),
      signatureProvider: "public_catalog_seed",
      signatureProviderRef: `public-catalog-${stay.code}`,
      signatureEvidenceHash: `public-catalog-${ids.contract}`
    }
  });

  await prisma.contractVersion.upsert({
    where: {
      contractId_version: {
        contractId: ids.contract,
        version: 1
      }
    },
    create: {
      id: ids.contractVersion,
      contractId: ids.contract,
      version: 1,
      title: stay.contractTitle,
      summary: stay.contractSummary,
      termsSnapshot,
      issuedAt: parseDateOnly("2026-01-01")
    },
    update: {
      title: stay.contractTitle,
      summary: stay.contractSummary,
      termsSnapshot,
      issuedAt: parseDateOnly("2026-01-01")
    }
  });

  await prisma.availabilityBlock.upsert({
    where: { id: ids.availabilityBlock },
    create: {
      id: ids.availabilityBlock,
      propertyId: property.id,
      unitId: unit.id,
      startsOn: parseDateOnly("2026-09-18"),
      endsOn: parseDateOnly("2026-09-20"),
      reason: "MAINTENANCE",
      note: "Mantenimiento preventivo de terraza"
    },
    update: {
      propertyId: property.id,
      unitId: unit.id,
      startsOn: parseDateOnly("2026-09-18"),
      endsOn: parseDateOnly("2026-09-20"),
      reason: "MAINTENANCE",
      note: "Mantenimiento preventivo de terraza"
    }
  });
}

async function seedAccessControl(prisma: PrismaClient) {
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
}
function buildTermsSnapshot(): Prisma.InputJsonObject {
  return {
    source: "public_catalog_seed",
    stayId: stay.code,
    propertyName: stay.name,
    version: 1
  };
}

function parseDateOnly(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

async function main() {
  const prisma = new PrismaClient({
    datasourceUrl: process.env.DATABASE_URL
  });

  try {
    await seedPublicCatalog(prisma);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
