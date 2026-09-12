import { PrismaClient, type Prisma } from "@prisma/client";
import { permissionKeys, roleProfiles } from "@kuquba/config";

const defaultDevDatabaseUrl =
  "postgresql://kuquba:kuquba_dev_password@127.0.0.1:55432/kuquba_dev?schema=public";

process.env.DATABASE_URL ??= defaultDevDatabaseUrl;

const organizationId = "00000000-0000-4000-8000-000000000001";
const ownerId = "00000000-0000-4000-8000-000000000101";
const publicDemoOwnerEmail = "josemitchi@gmail.com";

const defaultOwnerShareBps = 6500;
const defaultKuqubaShareBps = 3500;

const financialChargeDefinitions = [
  {
    id: "00000000-0000-4000-8000-000000800001",
    code: "ACCOMMODATION",
    label: "Hospedaje",
    description:
      "Valor principal de la estancia. Se distribuye entre propietario y KUQUBA segun contrato.",
    category: "ACCOMMODATION" as const,
    calculationMethod: "PER_NIGHT" as const,
    amount: null,
    rateBps: null,
    taxable: true,
    guestVisible: true,
    distribution: {
      strategy: "active_contract_split",
      fallback: {
        OWNER: defaultOwnerShareBps,
        KUQUBA: defaultKuqubaShareBps
      }
    }
  },
  {
    id: "00000000-0000-4000-8000-000000800002",
    code: "CLEANING",
    label: "Limpieza",
    description: "Servicio adicional operativo asociado a la preparacion y salida de la estancia.",
    category: "SERVICE" as const,
    calculationMethod: "FIXED" as const,
    amount: null,
    rateBps: null,
    taxable: true,
    guestVisible: true,
    distribution: {
      OWNER: 10000
    }
  },
  {
    id: "00000000-0000-4000-8000-000000800003",
    code: "DIGITAL_PLATFORM_FEE",
    label: "Uso de plataforma",
    description:
      "Cargo por plataforma, gestion digital de la estancia y servicios tecnologicos KUQUBA.",
    category: "DIGITAL_PLATFORM" as const,
    calculationMethod: "PERCENTAGE" as const,
    amount: null,
    rateBps: 800,
    taxable: true,
    guestVisible: true,
    distribution: {
      KUQUBA: 10000
    }
  },
  {
    id: "00000000-0000-4000-8000-000000800004",
    code: "PAYMENT_PROCESSING_FEE",
    label: "Procesamiento electronico",
    description: "Costo interno asociado a la pasarela de pago o adquirente.",
    category: "PAYMENT_PROCESSING" as const,
    calculationMethod: "PERCENTAGE" as const,
    amount: null,
    rateBps: 0,
    taxable: false,
    guestVisible: false,
    distribution: {
      PAYMENT_PROCESSOR: 10000
    }
  }
] as const;

const financialTaxRules = [
  {
    id: "00000000-0000-4000-8000-000000800051",
    code: "GT_IVA_ESTIMATED",
    label: "IVA estimado",
    rateBps: 1200,
    appliesToCategories: ["ACCOMMODATION", "SERVICE", "DIGITAL_PLATFORM"],
    appliesToChargeCodes: null,
    responsibleParty: "TAX_AUTHORITY" as const,
    active: true,
    metadata: {
      country: "GT",
      note: "Regla inicial operativa. Validar tratamiento fiscal final con asesoria tributaria."
    }
  },
  {
    id: "00000000-0000-4000-8000-000000800052",
    code: "GT_INGUAT_PREPARED",
    label: "INGUAT preparado",
    rateBps: 0,
    appliesToCategories: ["ACCOMMODATION"],
    appliesToChargeCodes: null,
    responsibleParty: "TAX_AUTHORITY" as const,
    active: false,
    metadata: {
      country: "GT",
      note: "Regla preparada para activar cuando se confirme base, tasa y responsable fiscal."
    }
  }
] as const;
const catalogStays = [
  {
    ids: {
      property: "00000000-0000-4000-8000-000000000201",
      unit: "00000000-0000-4000-8000-000000000301",
      stayCode: "00000000-0000-4000-8000-000000000331",
      ratePlan: "00000000-0000-4000-8000-000000000341",
      availabilityBlock: "00000000-0000-4000-8000-000000000351",
      contract: "00000000-0000-4000-8000-000000000401",
      contractVersion: "00000000-0000-4000-8000-000000000411",
      imageCover: "00000000-0000-4000-8000-000000000421",
      imageSecondary: "00000000-0000-4000-8000-000000000422"
    },
    amenities: ["Cocina equipada", "Terraza", "WiFi", "Parqueo coordinado"],
    availabilityBlock: {
      endsOn: "2026-09-20",
      note: "Mantenimiento preventivo de piscina",
      reason: "MAINTENANCE" as const,
      startsOn: "2026-09-18"
    },
    bookingNote: "Disponibilidad, tarifa y bloqueo temporal se validan antes de pago.",
    code: "paredon-casa-brisa",
    contractSummary: "Administracion profesional para Casa Brisa del Paredon en El Paredon.",
    contractTitle: "Contrato KUQUBA v1 - Casa Brisa del Paredon",
    destination: "El Paredon",
    houseRules: ["Llegada coordinada", "Tarifa visible tras cotizacion", "Ocupacion segun reserva"],
    images: [
      {
        alt: "Casa de playa con terraza, palmeras y arena volcanica en El Paredon",
        id: "00000000-0000-4000-8000-000000000421",
        isCover: true,
        sortOrder: 0,
        url: "/images/pacific-paredon-beach-house.png"
      },
      {
        alt: "Villa con vista abierta hacia el Pacifico",
        id: "00000000-0000-4000-8000-000000000422",
        isCover: false,
        sortOrder: 1,
        url: "/images/hero-pacific-beach.png"
      }
    ],
    name: "Casa Brisa del Paredon",
    neighborhood: "Playa El Paredon",
    operations: ["Preparacion previa", "Soporte local", "Revision de salida"],
    ratePlan: {
      baseNightlyRate: "1650.00",
      cleaningFee: "450.00",
      minNights: 2,
      name: "Tarifa base El Paredon",
      weekendNightlyRate: "1850.00"
    },
    stayStyle: "Casa frente al mar",
    summary:
      "Casa privada cerca del surf, arena volcanica y atardeceres del Pacifico, preparada para descansar con soporte KUQUBA.",
    unit: {
      bathrooms: "2.50",
      bedrooms: 3,
      maxGuests: 6,
      name: "Casa completa"
    }
  },
  {
    ids: {
      property: "00000000-0000-4000-8000-000000900201",
      unit: "00000000-0000-4000-8000-000000900301",
      stayCode: "00000000-0000-4000-8000-000000900331",
      ratePlan: "00000000-0000-4000-8000-000000900341",
      availabilityBlock: "00000000-0000-4000-8000-000000900351",
      contract: "00000000-0000-4000-8000-000000900401",
      contractVersion: "00000000-0000-4000-8000-000000900411",
      imageCover: "00000000-0000-4000-8000-000000900421",
      imageSecondary: "00000000-0000-4000-8000-000000900422"
    },
    amenities: ["Piscina", "Rancho social", "WiFi", "Limpieza programada"],
    availabilityBlock: {
      endsOn: "2026-10-05",
      note: "Bloqueo operativo de temporada",
      reason: "OWNER_HOLD" as const,
      startsOn: "2026-10-03"
    },
    bookingNote: "Fechas y tarifa se validan en la cotizacion antes de continuar a pago.",
    code: "monterrico-villa-arena",
    contractSummary: "Administracion profesional para Villa Arena Negra en Monterrico.",
    contractTitle: "Contrato KUQUBA v1 - Villa Arena Negra",
    destination: "Monterrico",
    houseRules: ["Estancia tranquila", "Acceso con verificacion", "Servicios segun reserva"],
    images: [
      {
        alt: "Villa familiar con piscina y terraza cerca de la playa en Monterrico",
        id: "00000000-0000-4000-8000-000000900421",
        isCover: true,
        sortOrder: 0,
        url: "/images/pacific-family-villa.png"
      },
      {
        alt: "Vista costera del Pacifico con terraza privada",
        id: "00000000-0000-4000-8000-000000900422",
        isCover: false,
        sortOrder: 1,
        url: "/images/hero-pacific-beach.png"
      }
    ],
    name: "Villa Arena Negra",
    neighborhood: "Zona costera de Monterrico",
    operations: ["Check-in guiado", "Recomendaciones locales", "Atencion durante estancia"],
    ratePlan: {
      baseNightlyRate: "1450.00",
      cleaningFee: "400.00",
      minNights: 2,
      name: "Tarifa base Monterrico",
      weekendNightlyRate: "1700.00"
    },
    stayStyle: "Villa familiar",
    summary:
      "Villa familiar con piscina, terraza sombreada y acceso coordinado a playa para escapadas tranquilas en el Pacifico.",
    unit: {
      bathrooms: "3.00",
      bedrooms: 3,
      maxGuests: 6,
      name: "Villa completa"
    }
  },
  {
    ids: {
      property: "00000000-0000-4000-8000-000000900202",
      unit: "00000000-0000-4000-8000-000000900302",
      stayCode: "00000000-0000-4000-8000-000000900332",
      ratePlan: "00000000-0000-4000-8000-000000900342",
      availabilityBlock: "00000000-0000-4000-8000-000000900352",
      contract: "00000000-0000-4000-8000-000000900402",
      contractVersion: "00000000-0000-4000-8000-000000900412",
      imageCover: "00000000-0000-4000-8000-000000900423",
      imageSecondary: "00000000-0000-4000-8000-000000900424"
    },
    amenities: ["Area social", "Cocina", "WiFi", "Limpieza previa"],
    availabilityBlock: {
      endsOn: "2026-09-28",
      note: "Salida privada previamente coordinada",
      reason: "OWNER_HOLD" as const,
      startsOn: "2026-09-26"
    },
    bookingNote: "La cotizacion valida tarifa y politicas antes de abrir el checkout.",
    code: "puerto-san-jose-casa-costa",
    contractSummary: "Administracion profesional para Casa Costa San Jose en Puerto San Jose.",
    contractTitle: "Contrato KUQUBA v1 - Casa Costa San Jose",
    destination: "Puerto San Jose",
    houseRules: ["Grupo pequeno", "Coordinacion de llegada", "Politicas por propiedad"],
    images: [
      {
        alt: "Casa de playa con piscina y terraza frente al Pacifico",
        id: "00000000-0000-4000-8000-000000900423",
        isCover: true,
        sortOrder: 0,
        url: "/images/hero-pacific-beach.png"
      },
      {
        alt: "Piscina y terraza preparada para grupo pequeno",
        id: "00000000-0000-4000-8000-000000900424",
        isCover: false,
        sortOrder: 1,
        url: "/images/pacific-family-villa.png"
      }
    ],
    name: "Casa Costa San Jose",
    neighborhood: "Puerto San Jose y alrededores",
    operations: ["Limpieza previa", "Anfitrion coordinado", "Seguimiento post-estancia"],
    ratePlan: {
      baseNightlyRate: "1250.00",
      cleaningFee: "350.00",
      minNights: 2,
      name: "Tarifa base Puerto San Jose",
      weekendNightlyRate: "1550.00"
    },
    stayStyle: "Casa completa",
    summary:
      "Casa de playa comoda para escapadas cortas, con patio, piscina y llegada coordinada cerca de la ciudad.",
    unit: {
      bathrooms: "2.00",
      bedrooms: 2,
      maxGuests: 5,
      name: "Casa completa"
    }
  }
] as const;

type CatalogStay = (typeof catalogStays)[number];

export async function seedPublicCatalog(prisma: PrismaClient) {
  await seedAccessControl(prisma);

  const organization = await prisma.organization.upsert({
    where: { id: organizationId },
    create: {
      id: organizationId,
      name: "KUQUBA Dev"
    },
    update: {
      name: "KUQUBA Dev"
    }
  });

  const ownerUser = await seedPortalOwnerUser(prisma, organization.id);

  const owner = await prisma.owner.upsert({
    where: { id: ownerId },
    create: {
      id: ownerId,
      organizationId: organization.id,
      userId: ownerUser.id,
      displayName: "Propietario KUQUBA",
      email: publicDemoOwnerEmail
    },
    update: {
      organizationId: organization.id,
      userId: ownerUser.id,
      displayName: "Propietario KUQUBA",
      email: publicDemoOwnerEmail
    }
  });

  await seedFinancialConfiguration(prisma, organization.id);

  for (const stay of catalogStays) {
    await seedStay(prisma, organization.id, owner.id, stay);
  }
}

async function seedPortalOwnerUser(prisma: PrismaClient, organizationIdValue: string) {
  const user = await prisma.user.upsert({
    where: {
      organizationId_email: {
        organizationId: organizationIdValue,
        email: publicDemoOwnerEmail
      }
    },
    create: {
      organizationId: organizationIdValue,
      email: publicDemoOwnerEmail,
      displayName: "Propietario KUQUBA"
    },
    update: {
      displayName: "Propietario KUQUBA"
    }
  });

  await prisma.identity.upsert({
    where: {
      provider_subject: {
        provider: "EMAIL_OTP",
        subject: publicDemoOwnerEmail
      }
    },
    create: {
      userId: user.id,
      provider: "EMAIL_OTP",
      subject: publicDemoOwnerEmail,
      status: "VERIFIED",
      verifiedAt: new Date()
    },
    update: {
      userId: user.id,
      status: "VERIFIED",
      verifiedAt: new Date()
    }
  });

  const ownerRole = await prisma.role.findUniqueOrThrow({
    where: {
      key: "owner"
    }
  });

  await prisma.userRole.upsert({
    where: {
      userId_roleId_scope_resourceId: {
        userId: user.id,
        roleId: ownerRole.id,
        scope: "ORGANIZATION",
        resourceId: organizationIdValue
      }
    },
    create: {
      userId: user.id,
      roleId: ownerRole.id,
      scope: "ORGANIZATION",
      resourceId: organizationIdValue
    },
    update: {}
  });

  return user;
}

async function seedStay(
  prisma: PrismaClient,
  organizationIdValue: string,
  ownerIdValue: string,
  stay: CatalogStay
) {
  const property = await prisma.property.upsert({
    where: { id: stay.ids.property },
    create: {
      id: stay.ids.property,
      organizationId: organizationIdValue,
      name: stay.name,
      destination: stay.destination,
      neighborhood: stay.neighborhood,
      summary: stay.summary,
      stayStyle: stay.stayStyle,
      bookingNote: stay.bookingNote,
      amenities: jsonList(stay.amenities),
      houseRules: jsonList(stay.houseRules),
      operations: jsonList(stay.operations),
      visibility: "PUBLIC"
    },
    update: {
      organizationId: organizationIdValue,
      name: stay.name,
      destination: stay.destination,
      neighborhood: stay.neighborhood,
      summary: stay.summary,
      stayStyle: stay.stayStyle,
      bookingNote: stay.bookingNote,
      amenities: jsonList(stay.amenities),
      houseRules: jsonList(stay.houseRules),
      operations: jsonList(stay.operations),
      visibility: "PUBLIC"
    }
  });

  const unit = await prisma.unit.upsert({
    where: { id: stay.ids.unit },
    create: {
      id: stay.ids.unit,
      propertyId: property.id,
      name: stay.unit.name,
      maxGuests: stay.unit.maxGuests,
      bedrooms: stay.unit.bedrooms,
      bathrooms: stay.unit.bathrooms
    },
    update: {
      propertyId: property.id,
      name: stay.unit.name,
      maxGuests: stay.unit.maxGuests,
      bedrooms: stay.unit.bedrooms,
      bathrooms: stay.unit.bathrooms
    }
  });

  await prisma.stayCode.upsert({
    where: { id: stay.ids.stayCode },
    create: {
      id: stay.ids.stayCode,
      propertyId: property.id,
      unitId: unit.id,
      code: stay.code,
      active: true
    },
    update: {
      propertyId: property.id,
      unitId: unit.id,
      code: stay.code,
      active: true
    }
  });

  for (const image of stay.images) {
    await prisma.propertyImage.upsert({
      where: { id: image.id },
      create: {
        id: image.id,
        propertyId: property.id,
        url: image.url,
        alt: image.alt,
        sortOrder: image.sortOrder,
        isCover: image.isCover
      },
      update: {
        propertyId: property.id,
        url: image.url,
        alt: image.alt,
        sortOrder: image.sortOrder,
        isCover: image.isCover
      }
    });
  }

  await prisma.ratePlan.upsert({
    where: { id: stay.ids.ratePlan },
    create: {
      id: stay.ids.ratePlan,
      propertyId: property.id,
      unitId: unit.id,
      name: stay.ratePlan.name,
      currency: "GTQ",
      baseNightlyRate: stay.ratePlan.baseNightlyRate,
      weekendNightlyRate: stay.ratePlan.weekendNightlyRate,
      cleaningFee: stay.ratePlan.cleaningFee,
      serviceFeeBps: 800,
      taxBps: 1200,
      minNights: stay.ratePlan.minNights,
      active: true
    },
    update: {
      propertyId: property.id,
      unitId: unit.id,
      name: stay.ratePlan.name,
      currency: "GTQ",
      baseNightlyRate: stay.ratePlan.baseNightlyRate,
      weekendNightlyRate: stay.ratePlan.weekendNightlyRate,
      cleaningFee: stay.ratePlan.cleaningFee,
      serviceFeeBps: 800,
      taxBps: 1200,
      minNights: stay.ratePlan.minNights,
      active: true
    }
  });

  const termsSnapshot = buildTermsSnapshot(stay);
  await prisma.contract.upsert({
    where: { id: stay.ids.contract },
    create: {
      id: stay.ids.contract,
      propertyId: property.id,
      ownerId: ownerIdValue,
      status: "ACTIVE",
      currentVersion: 1,
      title: stay.contractTitle,
      summary: stay.contractSummary,
      termsSnapshot,
      startsOn: parseDateOnly("2026-01-01"),
      endsOn: null,
      ownerShareBps: defaultOwnerShareBps,
      kuqubaShareBps: defaultKuqubaShareBps,
      issuedAt: parseDateOnly("2026-01-01"),
      signedAt: parseDateOnly("2026-01-02"),
      signatureProvider: "public_catalog_seed",
      signatureProviderRef: `public-catalog-${stay.code}`,
      signatureEvidenceHash: `public-catalog-${stay.ids.contract}`
    },
    update: {
      propertyId: property.id,
      ownerId: ownerIdValue,
      status: "ACTIVE",
      currentVersion: 1,
      title: stay.contractTitle,
      summary: stay.contractSummary,
      termsSnapshot,
      startsOn: parseDateOnly("2026-01-01"),
      endsOn: null,
      ownerShareBps: defaultOwnerShareBps,
      kuqubaShareBps: defaultKuqubaShareBps,
      issuedAt: parseDateOnly("2026-01-01"),
      signedAt: parseDateOnly("2026-01-02"),
      signatureProvider: "public_catalog_seed",
      signatureProviderRef: `public-catalog-${stay.code}`,
      signatureEvidenceHash: `public-catalog-${stay.ids.contract}`
    }
  });

  await prisma.contractVersion.upsert({
    where: {
      contractId_version: {
        contractId: stay.ids.contract,
        version: 1
      }
    },
    create: {
      id: stay.ids.contractVersion,
      contractId: stay.ids.contract,
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
    where: { id: stay.ids.availabilityBlock },
    create: {
      id: stay.ids.availabilityBlock,
      propertyId: property.id,
      unitId: unit.id,
      startsOn: parseDateOnly(stay.availabilityBlock.startsOn),
      endsOn: parseDateOnly(stay.availabilityBlock.endsOn),
      reason: stay.availabilityBlock.reason,
      note: stay.availabilityBlock.note
    },
    update: {
      propertyId: property.id,
      unitId: unit.id,
      startsOn: parseDateOnly(stay.availabilityBlock.startsOn),
      endsOn: parseDateOnly(stay.availabilityBlock.endsOn),
      reason: stay.availabilityBlock.reason,
      note: stay.availabilityBlock.note
    }
  });
}

async function seedFinancialConfiguration(prisma: PrismaClient, organizationIdValue: string) {
  for (const definition of financialChargeDefinitions) {
    await prisma.chargeDefinition.upsert({
      where: { id: definition.id },
      create: {
        id: definition.id,
        organizationId: organizationIdValue,
        code: definition.code,
        label: definition.label,
        description: definition.description,
        category: definition.category,
        calculationMethod: definition.calculationMethod,
        amount: definition.amount,
        rateBps: definition.rateBps,
        taxable: definition.taxable,
        guestVisible: definition.guestVisible,
        active: true,
        distribution: definition.distribution,
        metadata: {
          source: "public_catalog_seed",
          version: "guest-billing-v1"
        }
      },
      update: {
        organizationId: organizationIdValue,
        code: definition.code,
        label: definition.label,
        description: definition.description,
        category: definition.category,
        calculationMethod: definition.calculationMethod,
        amount: definition.amount,
        rateBps: definition.rateBps,
        taxable: definition.taxable,
        guestVisible: definition.guestVisible,
        active: true,
        distribution: definition.distribution,
        metadata: {
          source: "public_catalog_seed",
          version: "guest-billing-v1"
        }
      }
    });
  }

  for (const taxRule of financialTaxRules) {
    await prisma.taxRule.upsert({
      where: { id: taxRule.id },
      create: {
        id: taxRule.id,
        organizationId: organizationIdValue,
        code: taxRule.code,
        label: taxRule.label,
        rateBps: taxRule.rateBps,
        appliesToCategories: taxRule.appliesToCategories,
        appliesToChargeCodes: taxRule.appliesToChargeCodes,
        responsibleParty: taxRule.responsibleParty,
        active: taxRule.active,
        metadata: taxRule.metadata
      },
      update: {
        organizationId: organizationIdValue,
        code: taxRule.code,
        label: taxRule.label,
        rateBps: taxRule.rateBps,
        appliesToCategories: taxRule.appliesToCategories,
        appliesToChargeCodes: taxRule.appliesToChargeCodes,
        responsibleParty: taxRule.responsibleParty,
        active: taxRule.active,
        metadata: taxRule.metadata
      }
    });
  }
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

function buildTermsSnapshot(stay: CatalogStay): Prisma.InputJsonObject {
  return {
    source: "public_catalog_seed",
    stayId: stay.code,
    propertyName: stay.name,
    version: 1
  };
}

function jsonList(items: readonly string[]): Prisma.InputJsonValue {
  return [...items];
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
