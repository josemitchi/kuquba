"use client";

import { KeyRound, Plus, RefreshCw, ShieldCheck, Trash2, UserCog, UsersRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { getDevPortalApiBaseUrl } from "./use-dev-portal-session";

type IamMetric = {
  hint: string;
  label: string;
  value: string;
};

type IamPermission = {
  description?: string | null;
  id: string;
  key: string;
};

type IamRole = {
  createdAt: string;
  description?: string | null;
  id: string;
  key: string;
  name: string;
  permissions: IamPermission[];
};

type IamUserRole = {
  assignedByUserId?: string | null;
  assignmentId: string;
  createdAt: string;
  permissions: string[];
  resourceId?: string | null;
  roleId: string;
  roleKey: string;
  roleName: string;
  scope: IamRoleScope;
  userId: string;
};

type IamUser = {
  createdAt: string;
  displayName: string;
  emailMasked: string;
  id: string;
  organizationId: string;
  roles: IamUserRole[];
};

type IamAuditEvent = {
  action: string;
  createdAt: string;
  entityId?: string | null;
  entityType: string;
  id: string;
  reason?: string | null;
  result: string;
};
type IamUserRoleRow = {
  role: IamUserRole | null;
  user: IamUser;
};

type IamRolePermissionRow = {
  permission: IamPermission | null;
  role: IamRole;
};

type IamRoleScope = "PLATFORM" | "ORGANIZATION" | "PROPERTY" | "RESERVATION";

type OpsIamDashboard = {
  generatedAt: string;
  metrics: IamMetric[];
  permissions: IamPermission[];
  recentAuditEvents: IamAuditEvent[];
  roleScopes: IamRoleScope[];
  roles: IamRole[];
  users: IamUser[];
};

type OpsIamResponse = {
  iam: OpsIamDashboard;
};

type LoadState = "idle" | "loading" | "ready" | "error";
type Notice = { kind: "success" | "error"; text: string } | null;

export function OpsIamPanel({ sessionToken }: { sessionToken: string }) {
  const [iam, setIam] = useState<OpsIamDashboard | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [notice, setNotice] = useState<Notice>(null);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedRoleId, setSelectedRoleId] = useState("");
  const [selectedScope, setSelectedScope] = useState<IamRoleScope>("ORGANIZATION");
  const [resourceId, setResourceId] = useState("");
  const [selectedPermissionRoleId, setSelectedPermissionRoleId] = useState("");
  const [selectedPermissionId, setSelectedPermissionId] = useState("");
  const [updatingKey, setUpdatingKey] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setLoadState("loading");

    fetchIam(sessionToken)
      .then((response) => {
        if (!isMounted) {
          return;
        }

        setIam(response.iam);
        setLoadState("ready");
      })
      .catch(() => {
        if (isMounted) {
          setLoadState("error");
        }
      });

    return () => {
      isMounted = false;
    };
  }, [sessionToken]);

  useEffect(() => {
    if (!iam) {
      return;
    }

    setSelectedUserId((current) => current || iam.users[0]?.id || "");
    setSelectedRoleId((current) => current || iam.roles[0]?.id || "");
    setSelectedPermissionRoleId((current) => current || iam.roles[0]?.id || "");
    setSelectedPermissionId((current) => current || iam.permissions[0]?.id || "");
  }, [iam]);

  const selectedPermissionRole = useMemo(
    () => iam?.roles.find((role) => role.id === selectedPermissionRoleId) ?? null,
    [iam, selectedPermissionRoleId]
  );
  const grantablePermissions = useMemo(() => {
    if (!iam || !selectedPermissionRole) {
      return [];
    }

    const assigned = new Set(selectedPermissionRole.permissions.map((permission) => permission.id));

    return iam.permissions.filter((permission) => !assigned.has(permission.id));
  }, [iam, selectedPermissionRole]);

  async function handleRefresh() {
    setNotice(null);
    setLoadState("loading");

    try {
      const response = await fetchIam(sessionToken);
      setIam(response.iam);
      setLoadState("ready");
    } catch {
      setLoadState("error");
    }
  }

  async function handleAssignRole() {
    if (!selectedUserId || !selectedRoleId) {
      return;
    }

    setUpdatingKey("assign-role");
    setNotice(null);

    try {
      const response = await assignUserRole({
        resourceId: resourceId.trim() || undefined,
        roleId: selectedRoleId,
        scope: selectedScope,
        sessionToken,
        userId: selectedUserId
      });
      setIam(response.iam);
      setNotice({ kind: "success", text: "Rol asignado y auditado." });
    } catch {
      setNotice({ kind: "error", text: "No se pudo asignar el rol." });
    } finally {
      setUpdatingKey(null);
    }
  }

  async function handleRevokeRole(assignmentId: string) {
    setUpdatingKey(`revoke-role:${assignmentId}`);
    setNotice(null);

    try {
      const response = await revokeUserRole({ assignmentId, sessionToken });
      setIam(response.iam);
      setNotice({ kind: "success", text: "Rol revocado y auditado." });
    } catch {
      setNotice({ kind: "error", text: "No se pudo revocar el rol." });
    } finally {
      setUpdatingKey(null);
    }
  }

  async function handleGrantPermission() {
    const permissionId = selectedPermissionId || grantablePermissions[0]?.id;

    if (!selectedPermissionRoleId || !permissionId) {
      return;
    }

    setUpdatingKey("grant-permission");
    setNotice(null);

    try {
      const response = await grantRolePermission({
        permissionId,
        roleId: selectedPermissionRoleId,
        sessionToken
      });
      setIam(response.iam);
      setNotice({ kind: "success", text: "Permiso agregado y auditado." });
    } catch {
      setNotice({ kind: "error", text: "No se pudo agregar el permiso." });
    } finally {
      setUpdatingKey(null);
    }
  }

  async function handleRevokePermission(roleId: string, permissionId: string) {
    const updateKey = `revoke-permission:${roleId}:${permissionId}`;
    setUpdatingKey(updateKey);
    setNotice(null);

    try {
      const response = await revokeRolePermission({ permissionId, roleId, sessionToken });
      setIam(response.iam);
      setNotice({ kind: "success", text: "Permiso revocado y auditado." });
    } catch {
      setNotice({ kind: "error", text: "No se pudo revocar el permiso." });
    } finally {
      setUpdatingKey(null);
    }
  }

  const isLoading = loadState === "loading";

  return (
    <section className="mt-7 rounded-[8px] border border-line bg-white p-6 shadow-soft">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-midnight/8 px-3 py-1 text-xs font-semibold text-midnight">
            <UserCog aria-hidden className="h-4 w-4" />
            IAM
          </div>
          <h2 className="mt-3 text-2xl font-semibold text-midnight">Usuarios, roles y permisos</h2>
        </div>
        <button
          className="focus-ring inline-flex min-h-10 items-center justify-center gap-2 rounded-[6px] border border-line px-3 text-sm font-semibold text-midnight transition hover:border-green hover:text-green disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isLoading}
          onClick={handleRefresh}
          type="button"
        >
          <RefreshCw aria-hidden className="h-4 w-4" />
          Actualizar IAM
        </button>
      </div>

      {notice ? (
        <div
          className={`mt-5 rounded-[6px] border p-3 text-sm ${
            notice.kind === "success"
              ? "border-green/24 bg-green/10 text-midnight"
              : "border-terracotta/30 bg-terracotta/10 text-midnight"
          }`}
        >
          {notice.text}
        </div>
      ) : null}

      {loadState === "error" ? (
        <div className="mt-5 rounded-[6px] border border-terracotta/30 bg-terracotta/10 p-4 text-sm text-midnight">
          No se pudo cargar IAM.
        </div>
      ) : null}

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        {(iam?.metrics ?? buildEmptyIamMetrics()).map((metric) => (
          <article className="rounded-[8px] border border-line bg-ivory p-4" key={metric.label}>
            <p className="text-xs font-semibold uppercase text-ink/48">{metric.label}</p>
            <p className="mt-2 text-2xl font-semibold text-midnight">{metric.value}</p>
            <p className="mt-1 text-xs text-ink/58">{metric.hint}</p>
          </article>
        ))}
      </div>

      {iam ? (
        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]">
          <div className="space-y-5">
            <section className="rounded-[8px] border border-line bg-white p-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-midnight">
                <UsersRound aria-hidden className="h-4 w-4 text-green" />
                Asignaciones de usuario
              </div>
              <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_150px]">
                <select
                  className="focus-ring h-10 rounded-[6px] border border-line bg-white px-3 text-sm font-semibold text-midnight"
                  onChange={(event) => setSelectedUserId(event.target.value)}
                  value={selectedUserId}
                >
                  {iam.users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.displayName}
                    </option>
                  ))}
                </select>
                <select
                  className="focus-ring h-10 rounded-[6px] border border-line bg-white px-3 text-sm font-semibold text-midnight"
                  onChange={(event) => setSelectedRoleId(event.target.value)}
                  value={selectedRoleId}
                >
                  {iam.roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
                  ))}
                </select>
                <select
                  className="focus-ring h-10 rounded-[6px] border border-line bg-white px-3 text-sm font-semibold text-midnight"
                  onChange={(event) => setSelectedScope(event.target.value as IamRoleScope)}
                  value={selectedScope}
                >
                  {iam.roleScopes.map((scope) => (
                    <option key={scope} value={scope}>
                      {scope}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
                <input
                  className="focus-ring h-10 rounded-[6px] border border-line bg-white px-3 text-sm text-midnight placeholder:text-ink/40"
                  onChange={(event) => setResourceId(event.target.value)}
                  placeholder="resourceId opcional"
                  value={resourceId}
                />
                <button
                  className="focus-ring inline-flex min-h-10 items-center justify-center gap-2 rounded-[6px] bg-green px-4 text-sm font-semibold text-white transition hover:bg-[#0f5c50] disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={updatingKey === "assign-role" || !selectedUserId || !selectedRoleId}
                  onClick={handleAssignRole}
                  type="button"
                >
                  <Plus aria-hidden className="h-4 w-4" />
                  Asignar rol
                </button>
              </div>
            </section>

            <UserRolesTable
              onRevokeRole={handleRevokeRole}
              updatingKey={updatingKey}
              users={iam.users}
            />
          </div>

          <div className="space-y-5">
            <section className="rounded-[8px] border border-line bg-white p-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-midnight">
                <KeyRound aria-hidden className="h-4 w-4 text-green" />
                Permisos por rol
              </div>
              <div className="mt-4 grid gap-3">
                <select
                  className="focus-ring h-10 rounded-[6px] border border-line bg-white px-3 text-sm font-semibold text-midnight"
                  onChange={(event) => setSelectedPermissionRoleId(event.target.value)}
                  value={selectedPermissionRoleId}
                >
                  {iam.roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
                  ))}
                </select>
                <select
                  className="focus-ring h-10 rounded-[6px] border border-line bg-white px-3 text-sm font-semibold text-midnight"
                  onChange={(event) => setSelectedPermissionId(event.target.value)}
                  value={selectedPermissionId}
                >
                  {grantablePermissions.map((permission) => (
                    <option key={permission.id} value={permission.id}>
                      {permission.key}
                    </option>
                  ))}
                </select>
                <button
                  className="focus-ring inline-flex min-h-10 items-center justify-center gap-2 rounded-[6px] bg-midnight px-4 text-sm font-semibold text-white transition hover:bg-[#071926] disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={updatingKey === "grant-permission" || grantablePermissions.length === 0}
                  onClick={handleGrantPermission}
                  type="button"
                >
                  <Plus aria-hidden className="h-4 w-4" />
                  Agregar permiso
                </button>
              </div>
            </section>

            <RolePermissionsTable
              onRevokePermission={handleRevokePermission}
              roles={iam.roles}
              updatingKey={updatingKey}
            />

            <section className="rounded-[8px] border border-line bg-ivory p-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-midnight">
                <ShieldCheck aria-hidden className="h-4 w-4 text-green" />
                Auditoria IAM
              </div>
              <IamAuditEventsTable events={iam.recentAuditEvents} />
            </section>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function UserRolesTable({
  onRevokeRole,
  updatingKey,
  users
}: {
  onRevokeRole: (assignmentId: string) => void;
  updatingKey: string | null;
  users: IamUser[];
}) {
  const rows: IamUserRoleRow[] = users.flatMap((user): IamUserRoleRow[] =>
    user.roles.length > 0 ? user.roles.map((role) => ({ role, user })) : [{ role: null, user }]
  );

  return (
    <div className="max-h-[620px] overflow-auto rounded-[8px] border border-line bg-white shadow-soft">
      <table className="w-full min-w-[880px] border-separate border-spacing-0 text-left text-sm">
        <thead className="sticky top-0 z-20 bg-ivory text-xs uppercase text-ink/48 shadow-[0_1px_0_rgba(17,24,39,0.08)]">
          <tr>
            <th className="px-4 py-3 font-semibold">Usuario</th>
            <th className="px-4 py-3 font-semibold">Rol</th>
            <th className="px-4 py-3 font-semibold">Alcance</th>
            <th className="px-4 py-3 font-semibold">Permisos</th>
            <th className="px-4 py-3 font-semibold">Creado</th>
            <th className="sticky right-0 z-30 bg-ivory px-4 py-3 font-semibold shadow-[-1px_0_0_rgba(17,24,39,0.08)]">
              Accion
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((row) => (
            <tr
              className="align-top transition hover:bg-ivory/60"
              key={row.role?.assignmentId ?? `user:${row.user.id}`}
            >
              <td className="px-4 py-4">
                <p className="font-semibold text-midnight">{row.user.displayName}</p>
                <p className="mt-1 text-xs text-ink/58">{row.user.emailMasked}</p>
              </td>
              <td className="px-4 py-4 text-ink/70">
                {row.role ? (
                  <>
                    <p className="font-semibold text-midnight">{row.role.roleName}</p>
                    <p className="mt-1 text-xs text-ink/58">{row.role.roleKey}</p>
                  </>
                ) : (
                  <span className="text-xs text-ink/48">Sin roles</span>
                )}
              </td>
              <td className="px-4 py-4 text-xs text-ink/58">
                {row.role ? `${row.role.scope} - ${row.role.resourceId ?? "global"}` : "-"}
              </td>
              <td className="px-4 py-4 text-xs text-ink/58">
                {row.role ? `${row.role.permissions.length} permiso(s)` : "-"}
              </td>
              <td className="px-4 py-4 text-xs text-ink/58">
                {row.role
                  ? formatIamDateTime(row.role.createdAt)
                  : formatIamDateTime(row.user.createdAt)}
              </td>
              <td className="sticky right-0 bg-white px-4 py-4 shadow-[-1px_0_0_rgba(17,24,39,0.08)]">
                {row.role ? (
                  <button
                    aria-label={`Revocar ${row.role.roleName}`}
                    className="focus-ring inline-flex h-9 w-9 items-center justify-center rounded-[6px] border border-line text-terracotta transition hover:border-terracotta disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={updatingKey === `revoke-role:${row.role!.assignmentId}`}
                    onClick={() => onRevokeRole(row.role!.assignmentId)}
                    type="button"
                  >
                    <Trash2 aria-hidden className="h-4 w-4" />
                  </button>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RolePermissionsTable({
  onRevokePermission,
  roles,
  updatingKey
}: {
  onRevokePermission: (roleId: string, permissionId: string) => void;
  roles: IamRole[];
  updatingKey: string | null;
}) {
  const rows: IamRolePermissionRow[] = roles.flatMap((role): IamRolePermissionRow[] =>
    role.permissions.length > 0
      ? role.permissions.map((permission) => ({ permission, role }))
      : [{ permission: null, role }]
  );

  return (
    <div className="max-h-[620px] overflow-auto rounded-[8px] border border-line bg-white shadow-soft">
      <table className="w-full min-w-[760px] border-separate border-spacing-0 text-left text-sm">
        <thead className="sticky top-0 z-20 bg-ivory text-xs uppercase text-ink/48 shadow-[0_1px_0_rgba(17,24,39,0.08)]">
          <tr>
            <th className="px-4 py-3 font-semibold">Rol</th>
            <th className="px-4 py-3 font-semibold">Permiso</th>
            <th className="px-4 py-3 font-semibold">Descripcion</th>
            <th className="sticky right-0 z-30 bg-ivory px-4 py-3 font-semibold shadow-[-1px_0_0_rgba(17,24,39,0.08)]">
              Accion
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((row) => (
            <tr
              className="align-top transition hover:bg-ivory/60"
              key={`${row.role.id}:${row.permission?.id ?? "empty"}`}
            >
              <td className="px-4 py-4">
                <p className="font-semibold text-midnight">{row.role.name}</p>
                <p className="mt-1 text-xs text-green">{row.role.key}</p>
              </td>
              <td className="px-4 py-4 text-xs font-semibold text-midnight">
                {row.permission?.key ?? "Sin permisos"}
              </td>
              <td className="px-4 py-4 text-xs leading-5 text-ink/58">
                {row.permission?.description ?? row.role.description ?? "-"}
              </td>
              <td className="sticky right-0 bg-white px-4 py-4 shadow-[-1px_0_0_rgba(17,24,39,0.08)]">
                {row.permission ? (
                  <button
                    aria-label={`Revocar ${row.permission.key}`}
                    className="focus-ring inline-flex h-9 w-9 items-center justify-center rounded-[6px] border border-line text-terracotta transition hover:border-terracotta disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={
                      updatingKey === `revoke-permission:${row.role.id}:${row.permission!.id}`
                    }
                    onClick={() => onRevokePermission(row.role.id, row.permission!.id)}
                    type="button"
                  >
                    <Trash2 aria-hidden className="h-4 w-4" />
                  </button>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function IamAuditEventsTable({ events }: { events: IamAuditEvent[] }) {
  if (events.length === 0) {
    return <p className="mt-3 text-sm text-ink/58">Sin auditoria IAM reciente.</p>;
  }

  return (
    <div className="mt-3 max-h-[360px] overflow-auto rounded-[8px] border border-line bg-white">
      <table className="w-full min-w-[680px] border-separate border-spacing-0 text-left text-xs">
        <thead className="sticky top-0 z-20 bg-white text-ink/48 shadow-[0_1px_0_rgba(17,24,39,0.08)]">
          <tr>
            <th className="px-3 py-2 font-semibold uppercase">Accion</th>
            <th className="px-3 py-2 font-semibold uppercase">Resultado</th>
            <th className="px-3 py-2 font-semibold uppercase">Motivo</th>
            <th className="px-3 py-2 font-semibold uppercase">Fecha</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {events.map((event) => (
            <tr className="align-top" key={event.id}>
              <td className="px-3 py-2 font-semibold text-midnight">{event.action}</td>
              <td className="px-3 py-2 text-ink/58">{event.result}</td>
              <td className="px-3 py-2 text-ink/58">{event.reason ?? "sin motivo"}</td>
              <td className="px-3 py-2 text-ink/58">{formatIamDateTime(event.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatIamDateTime(value: string) {
  const date = new Date(value);

  return new Intl.DateTimeFormat("es-GT", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short"
  }).format(date);
}
async function fetchIam(sessionToken: string): Promise<OpsIamResponse> {
  const response = await fetch(`${getDevPortalApiBaseUrl()}/api/ops/iam`, {
    headers: {
      "x-kuquba-dev-session": sessionToken
    }
  });

  const payload = (await response.json().catch(() => ({}))) as OpsIamResponse & {
    error?: string;
  };

  if (!response.ok) {
    throw new Error(payload.error ?? "iam_request_failed");
  }

  return payload;
}

async function assignUserRole(input: {
  resourceId?: string;
  roleId: string;
  scope: IamRoleScope;
  sessionToken: string;
  userId: string;
}): Promise<OpsIamResponse> {
  const response = await fetch(
    `${getDevPortalApiBaseUrl()}/api/ops/iam/users/${input.userId}/roles`,
    {
      body: JSON.stringify({
        resourceId: input.resourceId,
        roleId: input.roleId,
        scope: input.scope
      }),
      headers: {
        "content-type": "application/json",
        "x-kuquba-dev-session": input.sessionToken
      },
      method: "POST"
    }
  );

  const payload = (await response.json().catch(() => ({}))) as OpsIamResponse & {
    error?: string;
  };

  if (!response.ok) {
    throw new Error(payload.error ?? "iam_role_assign_failed");
  }

  return payload;
}

async function revokeUserRole(input: {
  assignmentId: string;
  sessionToken: string;
}): Promise<OpsIamResponse> {
  const response = await fetch(
    `${getDevPortalApiBaseUrl()}/api/ops/iam/user-roles/${input.assignmentId}`,
    {
      headers: {
        "x-kuquba-dev-session": input.sessionToken
      },
      method: "DELETE"
    }
  );

  const payload = (await response.json().catch(() => ({}))) as OpsIamResponse & {
    error?: string;
  };

  if (!response.ok) {
    throw new Error(payload.error ?? "iam_role_revoke_failed");
  }

  return payload;
}

async function grantRolePermission(input: {
  permissionId: string;
  roleId: string;
  sessionToken: string;
}): Promise<OpsIamResponse> {
  const response = await fetch(
    `${getDevPortalApiBaseUrl()}/api/ops/iam/roles/${input.roleId}/permissions`,
    {
      body: JSON.stringify({ permissionId: input.permissionId }),
      headers: {
        "content-type": "application/json",
        "x-kuquba-dev-session": input.sessionToken
      },
      method: "POST"
    }
  );

  const payload = (await response.json().catch(() => ({}))) as OpsIamResponse & {
    error?: string;
  };

  if (!response.ok) {
    throw new Error(payload.error ?? "iam_permission_grant_failed");
  }

  return payload;
}

async function revokeRolePermission(input: {
  permissionId: string;
  roleId: string;
  sessionToken: string;
}): Promise<OpsIamResponse> {
  const response = await fetch(
    `${getDevPortalApiBaseUrl()}/api/ops/iam/roles/${input.roleId}/permissions/${input.permissionId}`,
    {
      headers: {
        "x-kuquba-dev-session": input.sessionToken
      },
      method: "DELETE"
    }
  );

  const payload = (await response.json().catch(() => ({}))) as OpsIamResponse & {
    error?: string;
  };

  if (!response.ok) {
    throw new Error(payload.error ?? "iam_permission_revoke_failed");
  }

  return payload;
}

function buildEmptyIamMetrics(): IamMetric[] {
  return ["Usuarios IAM", "Roles", "Rol admin"].map((label) => ({
    hint: "Pendiente de carga",
    label,
    value: "-"
  }));
}
