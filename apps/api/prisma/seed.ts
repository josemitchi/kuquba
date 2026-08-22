import type { PrismaClient } from "@prisma/client";
import { permissionKeys, roleProfiles } from "@kuquba/config";

process.env.DATABASE_URL ??=
  "postgresql://kuquba:kuquba_dev_password@127.0.0.1:55432/kuquba_dev?schema=public";

let prisma: PrismaClient | undefined;

async function main() {
  const { PrismaClient } = await import("@prisma/client");
  prisma = new PrismaClient({
    datasourceUrl: process.env.DATABASE_URL
  });

  const organization = await prisma.organization.upsert({
    where: {
      id: "00000000-0000-4000-8000-000000000001"
    },
    create: {
      id: "00000000-0000-4000-8000-000000000001",
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

  await seedDevUser(prisma, {
    organizationId: organization.id,
    email: "guest.dev@kuquba.local",
    displayName: "Huesped Dev",
    roleKey: "guest",
    identityProvider: "EMAIL_OTP"
  });

  await seedDevUser(prisma, {
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
