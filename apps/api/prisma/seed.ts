import type { PrismaClient } from "@prisma/client";
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
  atitlanUnit: "00000000-0000-4000-8000-000000000301",
  antiguaUnit: "00000000-0000-4000-8000-000000000302",
  atitlanContract: "00000000-0000-4000-8000-000000000401",
  antiguaContract: "00000000-0000-4000-8000-000000000402",
  reservationAtitlanOne: "00000000-0000-4000-8000-000000000501",
  reservationAtitlanTwo: "00000000-0000-4000-8000-000000000502",
  reservationAtitlanThree: "00000000-0000-4000-8000-000000000503",
  taskDocsTax: "00000000-0000-4000-8000-000000000601",
  taskInventoryAntigua: "00000000-0000-4000-8000-000000000602",
  taskMaintenanceAtitlan: "00000000-0000-4000-8000-000000000603",
  taskPhotoAntigua: "00000000-0000-4000-8000-000000000604",
  documentReservations: "00000000-0000-4000-8000-000000000701",
  documentExpenses: "00000000-0000-4000-8000-000000000702",
  documentTax: "00000000-0000-4000-8000-000000000703",
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
      name: "Casa Patio Antigua",
      destination: "Antigua Guatemala",
      visibility: "PRIVATE"
    },
    update: {
      name: "Casa Patio Antigua",
      destination: "Antigua Guatemala",
      visibility: "PRIVATE"
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
      name: "Casa completa",
      maxGuests: 4,
      bedrooms: 2,
      bathrooms: "2.00"
    },
    update: {
      propertyId: antiguaProperty.id,
      name: "Casa completa",
      maxGuests: 4,
      bedrooms: 2,
      bathrooms: "2.00"
    }
  });

  await prismaClient.contract.upsert({
    where: {
      id: devIds.atitlanContract
    },
    create: {
      id: devIds.atitlanContract,
      ownerId: owner.id,
      propertyId: atitlanProperty.id,
      startsOn: parseDateOnly("2026-01-01"),
      ownerShareBps: 0,
      kuqubaShareBps: 0
    },
    update: {
      ownerId: owner.id,
      propertyId: atitlanProperty.id,
      startsOn: parseDateOnly("2026-01-01"),
      endsOn: null,
      ownerShareBps: 0,
      kuqubaShareBps: 0
    }
  });

  await prismaClient.contract.upsert({
    where: {
      id: devIds.antiguaContract
    },
    create: {
      id: devIds.antiguaContract,
      ownerId: owner.id,
      propertyId: antiguaProperty.id,
      startsOn: parseDateOnly("2026-08-01"),
      ownerShareBps: 0,
      kuqubaShareBps: 0
    },
    update: {
      ownerId: owner.id,
      propertyId: antiguaProperty.id,
      startsOn: parseDateOnly("2026-08-01"),
      endsOn: null,
      ownerShareBps: 0,
      kuqubaShareBps: 0
    }
  });

  await seedReservation(prismaClient, {
    id: devIds.reservationAtitlanOne,
    privateCode: "KQB-ATITLAN-20260824",
    guestId: guest.id,
    propertyId: atitlanProperty.id,
    unitId: atitlanUnit.id,
    status: "CONFIRMED",
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

async function seedReservation(
  prismaClient: PrismaClient,
  input: {
    id: string;
    privateCode: string;
    guestId: string;
    propertyId: string;
    unitId: string;
    status: "HOLD" | "CONFIRMED" | "CANCELLED" | "COMPLETED";
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
      privateCode: input.privateCode
    },
    update: {
      guestId: input.guestId,
      propertyId: input.propertyId,
      unitId: input.unitId,
      status: input.status,
      arrivalDate: parseDateOnly(input.arrivalDate),
      departureDate: parseDateOnly(input.departureDate)
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
      deliveryNotes: input.deliveryNotes
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
      deliveryNotes: input.deliveryNotes
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
      deliveryNotes: input.deliveryNotes
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
      deliveryNotes: input.deliveryNotes
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
