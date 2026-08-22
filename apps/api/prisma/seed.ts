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
  documentTax: "00000000-0000-4000-8000-000000000703"
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

  await seedDevUser(prisma, {
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
}

async function seedDevUser(prismaClient: PrismaClient, input: {
  organizationId: string;
  email: string;
  displayName: string;
  roleKey: string;
  identityProvider: "EMAIL_OTP";
}) {
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
