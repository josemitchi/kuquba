"use client";

import {
  ArrowLeft,
  BadgeCheck,
  Building2,
  ClipboardList,
  Home,
  Inbox,
  LogOut,
  Mail,
  Phone,
  RefreshCw,
  Send,
  ShieldCheck,
  SlidersHorizontal,
  UserRound,
  type LucideIcon
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { OpsCasePanel } from "./ops-case-panel";
import { getDevPortalApiBaseUrl, useDevPortalSession } from "./use-dev-portal-session";

type ReviewStatus = "NEW" | "REVIEWING" | "CONTACTED" | "CLOSED";
type StatusFilter = ReviewStatus | "ALL";
type QueueKey = "ownerLeads" | "proposalRequests";

type WorkbenchMetric = {
  hint: string;
  label: string;
  value: string;
};

type WorkbenchStatusOption = {
  label: string;
  value: ReviewStatus;
};

type OwnerLeadItem = {
  kind: "ownerLead";
  id: string;
  title: string;
  primaryName: string;
  email: string;
  phone?: string | null;
  location: string;
  propertyType: string;
  operatingStatus: string;
  message?: string | null;
  source: string;
  status: ReviewStatus;
  statusLabel: string;
  createdAt: string;
  updatedAt: string;
  summary: string;
};

type ProposalRequestItem = {
  kind: "proposalRequest";
  id: string;
  title: string;
  primaryName: string;
  email: string;
  phone?: string | null;
  location: string;
  stayId: string;
  arrivalDate?: string;
  departureDate?: string;
  guests: number;
  message?: string | null;
  source: string;
  status: ReviewStatus;
  statusLabel: string;
  createdAt: string;
  updatedAt: string;
  summary: string;
};

type WorkbenchItem = OwnerLeadItem | ProposalRequestItem;

type OpsWorkbench = {
  generatedAt: string;
  statusOptions: WorkbenchStatusOption[];
  metrics: WorkbenchMetric[];
  queues: {
    ownerLeads: OwnerLeadItem[];
    proposalRequests: ProposalRequestItem[];
  };
  recentAuditEvents: Array<{
    action: string;
    createdAt: string;
    entityId?: string | null;
    entityType: string;
    id: string;
    reason?: string | null;
    result: string;
  }>;
};

type WorkbenchResponse = {
  workbench: OpsWorkbench;
};

type StatusUpdateResponse = {
  item: WorkbenchItem;
};

type LoadState = "idle" | "loading" | "ready" | "error";
type Notice = { kind: "success" | "error"; text: string } | null;

const queueOptions: Array<{ key: QueueKey; label: string; icon: LucideIcon }> = [
  { key: "ownerLeads", label: "Leads propietarios", icon: Building2 },
  { key: "proposalRequests", label: "Solicitudes estancia", icon: Send }
];

const statusFilterOptions: Array<{ label: string; value: StatusFilter }> = [
  { label: "Todos", value: "ALL" },
  { label: "Nuevos", value: "NEW" },
  { label: "En revision", value: "REVIEWING" },
  { label: "Contactados", value: "CONTACTED" },
  { label: "Cerrados", value: "CLOSED" }
];

const statusClasses: Record<ReviewStatus, string> = {
  NEW: "border-terracotta/30 bg-terracotta/10 text-terracotta",
  REVIEWING: "border-midnight/18 bg-midnight/8 text-midnight",
  CONTACTED: "border-green/24 bg-green/10 text-green",
  CLOSED: "border-line bg-ivory text-ink/62"
};

export function OpsWorkbenchPage() {
  const { isValidating, logout, session } = useDevPortalSession("ops");
  const router = useRouter();
  const [workbench, setWorkbench] = useState<OpsWorkbench | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [activeQueue, setActiveQueue] = useState<QueueKey>("ownerLeads");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [selectedItem, setSelectedItem] = useState<WorkbenchItem | null>(null);
  const [updatingKey, setUpdatingKey] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice>(null);

  useEffect(() => {
    if (!session) {
      setWorkbench(null);
      setLoadState(isValidating ? "loading" : "idle");
      return;
    }

    let isMounted = true;
    setLoadState("loading");

    fetchWorkbench(session.sessionToken)
      .then((response) => {
        if (isMounted) {
          setWorkbench(response.workbench);
          setLoadState("ready");
        }
      })
      .catch(() => {
        if (isMounted) {
          setLoadState("error");
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isValidating, session]);

  const visibleItems = useMemo(() => {
    const items = workbench?.queues[activeQueue] ?? [];

    if (statusFilter === "ALL") {
      return items;
    }

    return items.filter((item) => item.status === statusFilter);
  }, [activeQueue, statusFilter, workbench]);

  async function handleLogout() {
    await logout();
    router.push("/ops");
  }

  async function handleRefresh() {
    if (!session) {
      return;
    }

    setNotice(null);
    setLoadState("loading");

    try {
      const response = await fetchWorkbench(session.sessionToken);
      setWorkbench(response.workbench);
      setLoadState("ready");
    } catch {
      setLoadState("error");
    }
  }

  function handleOpenCase(item: WorkbenchItem) {
    setSelectedItem(item);
  }

  async function handleStatusChange(item: WorkbenchItem, status: ReviewStatus) {
    if (!session || item.status === status) {
      return;
    }

    const updateKey = `${item.kind}:${item.id}`;
    setUpdatingKey(updateKey);
    setNotice(null);

    try {
      await patchStatus(item, status, session.sessionToken);
      const response = await fetchWorkbench(session.sessionToken);
      setWorkbench(response.workbench);
      setNotice({ kind: "success", text: "Estado actualizado y auditado." });
    } catch {
      setNotice({ kind: "error", text: "No se pudo actualizar el estado." });
    } finally {
      setUpdatingKey(null);
    }
  }

  return (
    <main className="min-h-screen bg-ivory text-ink">
      <header className="bg-midnight text-white">
        <div className="container-shell flex flex-wrap items-center justify-between gap-4 py-5">
          <a className="focus-ring inline-flex min-w-0 items-center gap-3 rounded-md" href="/">
            <Image
              alt=""
              className="h-11 w-11 object-contain"
              height={48}
              src="/brand/kuquba-isotipo.svg"
              width={48}
            />
            <span className="min-w-0">
              <span className="block text-2xl font-semibold leading-none">KUQUBA</span>
              <span className="mt-1 block text-[0.62rem] uppercase text-[#1fb7a2]">
                Conexiones que generan confianza
              </span>
            </span>
          </a>

          <div className="flex flex-wrap items-center gap-3">
            <a
              className="focus-ring inline-flex min-h-10 items-center justify-center gap-2 rounded-[6px] border border-white/35 px-4 text-sm font-semibold text-white/90 transition hover:border-white hover:text-white"
              href="/ops"
            >
              <ArrowLeft aria-hidden className="h-4 w-4" />
              Acceso
            </a>
            {session ? (
              <button
                className="focus-ring inline-flex min-h-10 items-center justify-center gap-2 rounded-[6px] border border-white/35 px-4 text-sm font-semibold text-white/90 transition hover:border-white hover:text-white"
                onClick={handleLogout}
                type="button"
              >
                <LogOut aria-hidden className="h-4 w-4" />
                Cerrar sesion
              </button>
            ) : null}
          </div>
        </div>
      </header>

      <section className="container-shell py-8">
        <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
          <div className="min-w-0">
            <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-green/10 px-4 py-2 text-sm font-semibold text-green">
                  <ShieldCheck aria-hidden className="h-4 w-4" />
                  Operacion interna
                </div>
                <h1 className="mt-5 font-display text-4xl leading-tight text-midnight md:text-5xl">
                  Bandeja ops
                </h1>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-ink/68 md:text-base">
                  Revision de leads de propietarios y solicitudes de propuesta con estado persistido
                  y auditoria por accion.
                </p>
              </div>

              <button
                className="focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-[6px] border border-line bg-white px-4 text-sm font-semibold text-midnight transition hover:border-green hover:text-green disabled:cursor-not-allowed disabled:opacity-60"
                disabled={!session || loadState === "loading"}
                onClick={handleRefresh}
                type="button"
              >
                <RefreshCw aria-hidden className="h-4 w-4" />
                Actualizar
              </button>
            </div>

            {session ? (
              <div className="mt-7 grid gap-4 md:grid-cols-4">
                {(workbench?.metrics ?? buildEmptyMetrics()).map((metric) => (
                  <MetricCard key={metric.label} metric={metric} />
                ))}
              </div>
            ) : null}

            <div className="mt-7 border-y border-line py-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-wrap gap-2">
                  {queueOptions.map((option) => {
                    const Icon = option.icon;
                    const isActive = activeQueue === option.key;

                    return (
                      <button
                        className={`focus-ring inline-flex min-h-10 items-center justify-center gap-2 rounded-[6px] border px-4 text-sm font-semibold transition ${
                          isActive
                            ? "border-green bg-green text-white"
                            : "border-line bg-white text-midnight hover:border-green hover:text-green"
                        }`}
                        key={option.key}
                        onClick={() => setActiveQueue(option.key)}
                        type="button"
                      >
                        <Icon aria-hidden className="h-4 w-4" />
                        {option.label}
                      </button>
                    );
                  })}
                </div>

                <div className="flex flex-wrap gap-2">
                  {statusFilterOptions.map((option) => (
                    <button
                      className={`focus-ring min-h-10 rounded-[6px] border px-3 text-sm font-semibold transition ${
                        statusFilter === option.value
                          ? "border-midnight bg-midnight text-white"
                          : "border-line bg-white text-midnight hover:border-midnight"
                      }`}
                      key={option.value}
                      onClick={() => setStatusFilter(option.value)}
                      type="button"
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {notice ? (
              <div
                className={`mt-5 rounded-[6px] border p-4 text-sm ${
                  notice.kind === "success"
                    ? "border-green/24 bg-green/10 text-midnight"
                    : "border-terracotta/30 bg-terracotta/10 text-midnight"
                }`}
              >
                {notice.text}
              </div>
            ) : null}

            <div className="mt-6 grid gap-4 2xl:grid-cols-2">
              {renderWorkbenchContent({
                activeQueue,
                isValidating,
                items: visibleItems,
                loadState,
                onOpenCase: handleOpenCase,
                onStatusChange: handleStatusChange,
                selectedItemKey: selectedItem ? buildItemKey(selectedItem) : null,
                statusOptions: workbench?.statusOptions ?? [],
                updatingKey
              })}
            </div>
          </div>

          <aside className="space-y-5">
            <section className="rounded-[8px] border border-line bg-white p-6 shadow-soft">
              <BadgeCheck aria-hidden className="h-9 w-9 text-green" />
              <h2 className="mt-4 text-lg font-semibold text-midnight">
                {isValidating
                  ? "Validando acceso"
                  : session
                    ? "Sesion ops activa"
                    : "Acceso pendiente"}
              </h2>
              {session ? (
                <div className="mt-4 space-y-3 text-sm text-ink/70">
                  <p>
                    <span className="font-semibold text-midnight">Usuario:</span>{" "}
                    {session.user.displayName}
                  </p>
                  <p>
                    <span className="font-semibold text-midnight">Correo:</span>{" "}
                    {session.user.emailMasked}
                  </p>
                  <p>
                    <span className="font-semibold text-midnight">Rol:</span> {session.role.name}
                  </p>
                  <p>
                    <span className="font-semibold text-midnight">Permisos:</span>{" "}
                    {session.permissions.length}
                  </p>
                </div>
              ) : isValidating ? (
                <p className="mt-4 text-sm leading-6 text-ink/68">Confirmando sesion con la API.</p>
              ) : (
                <div className="mt-4">
                  <p className="text-sm leading-6 text-ink/68">
                    Entra con una sesion del equipo KUQUBA para cargar la bandeja.
                  </p>
                  <a
                    className="focus-ring mt-4 inline-flex min-h-10 items-center justify-center gap-2 rounded-[6px] bg-green px-4 text-sm font-semibold text-white transition hover:bg-[#0f5c50]"
                    href="/ops"
                  >
                    <UserRound aria-hidden className="h-4 w-4" />
                    Ir a acceso
                  </a>
                </div>
              )}
            </section>

            <OpsCasePanel
              canApproveFormal={session?.permissions.includes("operation:formal:approve") ?? false}
              currentUser={session?.user ?? null}
              selectedItem={selectedItem}
              sessionToken={session?.sessionToken ?? null}
            />

            <section className="rounded-[8px] border border-line bg-white p-6 shadow-soft">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-[6px] bg-midnight/8 text-midnight">
                  <SlidersHorizontal aria-hidden className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-green">Auditoria</p>
                  <h2 className="text-lg font-semibold text-midnight">Eventos recientes</h2>
                </div>
              </div>

              <div className="mt-5 space-y-3">
                {(workbench?.recentAuditEvents ?? []).map((event) => (
                  <div
                    className="border-b border-line pb-3 text-sm last:border-b-0 last:pb-0"
                    key={event.id}
                  >
                    <p className="font-semibold text-midnight">{event.action}</p>
                    <p className="mt-1 text-xs text-ink/58">
                      {event.entityType} - {event.result} - {formatDateTime(event.createdAt)}
                    </p>
                  </div>
                ))}
                {session && workbench?.recentAuditEvents.length === 0 ? (
                  <p className="text-sm leading-6 text-ink/62">
                    Sin eventos recientes para esta bandeja.
                  </p>
                ) : null}
              </div>
            </section>
          </aside>
        </div>
      </section>
    </main>
  );
}

function renderWorkbenchContent({
  activeQueue,
  isValidating,
  items,
  loadState,
  onOpenCase,
  onStatusChange,
  selectedItemKey,
  statusOptions,
  updatingKey
}: {
  activeQueue: QueueKey;
  isValidating: boolean;
  items: WorkbenchItem[];
  loadState: LoadState;
  onOpenCase: (item: WorkbenchItem) => void;
  onStatusChange: (item: WorkbenchItem, status: ReviewStatus) => void;
  selectedItemKey: string | null;
  statusOptions: WorkbenchStatusOption[];
  updatingKey: string | null;
}) {
  if (isValidating || loadState === "loading") {
    return (
      <StatePanel icon={RefreshCw} title="Cargando bandeja" body="Sincronizando datos con API." />
    );
  }

  if (loadState === "error") {
    return (
      <StatePanel
        icon={ShieldCheck}
        title="No se pudo cargar"
        body="La API no devolvio la bandeja ops."
      />
    );
  }

  if (items.length === 0) {
    return (
      <StatePanel
        icon={Inbox}
        title="Sin elementos en este filtro"
        body={
          activeQueue === "ownerLeads"
            ? "No hay leads con este estado."
            : "No hay solicitudes con este estado."
        }
      />
    );
  }

  return items.map((item) => (
    <WorkbenchItemCard
      item={item}
      key={`${item.kind}:${item.id}`}
      onOpenCase={onOpenCase}
      onStatusChange={onStatusChange}
      selected={selectedItemKey === buildItemKey(item)}
      statusOptions={statusOptions}
      updating={updatingKey === buildItemKey(item)}
    />
  ));
}

function MetricCard({ metric }: { metric: WorkbenchMetric }) {
  return (
    <article className="rounded-[8px] border border-line bg-white p-5 shadow-soft">
      <p className="text-xs font-semibold uppercase text-ink/48">{metric.label}</p>
      <p className="mt-3 text-3xl font-semibold text-midnight">{metric.value}</p>
      <p className="mt-2 text-sm text-ink/62">{metric.hint}</p>
    </article>
  );
}

function WorkbenchItemCard({
  item,
  onOpenCase,
  onStatusChange,
  selected,
  statusOptions,
  updating
}: {
  item: WorkbenchItem;
  onOpenCase: (item: WorkbenchItem) => void;
  onStatusChange: (item: WorkbenchItem, status: ReviewStatus) => void;
  selected: boolean;
  statusOptions: WorkbenchStatusOption[];
  updating: boolean;
}) {
  return (
    <article
      className={`rounded-[8px] border bg-white p-5 shadow-soft ${selected ? "border-green" : "border-line"}`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase text-green">
            {item.kind === "ownerLead" ? "Lead propietario" : "Solicitud estancia"}
          </p>
          <h2 className="mt-2 text-xl font-semibold leading-tight text-midnight">{item.title}</h2>
          <p className="mt-2 text-sm leading-6 text-ink/68">{item.summary}</p>
        </div>
        <span
          className={`inline-flex w-fit shrink-0 rounded-full border px-3 py-1 text-xs font-semibold ${statusClasses[item.status]}`}
        >
          {item.statusLabel}
        </span>
      </div>

      <div className="mt-5 grid gap-3 text-sm text-ink/72 md:grid-cols-2">
        <InfoLine icon={UserRound} label="Contacto" value={item.primaryName} />
        <InfoLine icon={Home} label="Ubicacion" value={item.location} />
        <InfoLine icon={Mail} label="Correo" value={item.email} />
        <InfoLine icon={Phone} label="Telefono" value={item.phone ?? "No indicado"} />
      </div>

      {item.kind === "ownerLead" ? (
        <div className="mt-4 grid gap-3 text-sm text-ink/72 md:grid-cols-2">
          <TextBadge label="Tipo" value={item.propertyType} />
          <TextBadge label="Estado operativo" value={item.operatingStatus} />
        </div>
      ) : (
        <div className="mt-4 grid gap-3 text-sm text-ink/72 md:grid-cols-3">
          <TextBadge label="Huespedes" value={`${item.guests}`} />
          <TextBadge
            label="Llegada"
            value={item.arrivalDate ? formatDate(item.arrivalDate) : "Flexible"}
          />
          <TextBadge
            label="Salida"
            value={item.departureDate ? formatDate(item.departureDate) : "Flexible"}
          />
        </div>
      )}

      {item.message ? <p className="mt-4 text-sm leading-6 text-ink/68">{item.message}</p> : null}

      <div className="mt-5 border-t border-line pt-4">
        <div className="flex flex-wrap gap-2">
          <button
            className={`focus-ring inline-flex min-h-9 items-center justify-center gap-2 rounded-[6px] border px-3 text-xs font-semibold transition ${
              selected
                ? "border-midnight bg-midnight text-white"
                : "border-line bg-white text-midnight hover:border-midnight"
            }`}
            onClick={() => onOpenCase(item)}
            type="button"
          >
            <ClipboardList aria-hidden className="h-4 w-4" />
            {selected ? "Caso abierto" : "Abrir caso"}
          </button>
          {statusOptions.map((option) => (
            <button
              className={`focus-ring min-h-9 rounded-[6px] border px-3 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-55 ${
                item.status === option.value
                  ? "border-green bg-green text-white"
                  : "border-line bg-white text-midnight hover:border-green hover:text-green"
              }`}
              disabled={updating || item.status === option.value}
              key={option.value}
              onClick={() => onStatusChange(item, option.value)}
              type="button"
            >
              {option.label}
            </button>
          ))}
        </div>
        <p className="mt-3 text-xs text-ink/50">Actualizado {formatDateTime(item.updatedAt)}</p>
      </div>
    </article>
  );
}

function InfoLine({
  icon: Icon,
  label,
  value
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-h-11 items-center gap-3 rounded-[6px] border border-line px-3">
      <Icon aria-hidden className="h-4 w-4 shrink-0 text-green" />
      <span className="min-w-0 truncate">
        <span className="font-semibold text-midnight">{label}:</span> {value}
      </span>
    </div>
  );
}

function TextBadge({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[6px] border border-line bg-ivory px-3 py-2">
      <span className="text-xs font-semibold uppercase text-ink/48">{label}</span>
      <p className="mt-1 font-semibold text-midnight">{value}</p>
    </div>
  );
}

function StatePanel({
  icon: Icon,
  title,
  body
}: {
  icon: LucideIcon;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-[8px] border border-line bg-white p-8 text-center shadow-soft 2xl:col-span-2">
      <Icon aria-hidden className="mx-auto h-9 w-9 text-green" />
      <h2 className="mt-4 text-xl font-semibold text-midnight">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-ink/68">{body}</p>
    </div>
  );
}

async function fetchWorkbench(sessionToken: string): Promise<WorkbenchResponse> {
  const response = await fetch(`${getDevPortalApiBaseUrl()}/api/ops/workbench`, {
    headers: {
      "x-kuquba-dev-session": sessionToken
    }
  });

  const payload = (await response.json().catch(() => ({}))) as WorkbenchResponse & {
    error?: string;
  };

  if (!response.ok) {
    throw new Error(payload.error ?? "workbench_request_failed");
  }

  return payload;
}

async function patchStatus(
  item: WorkbenchItem,
  status: ReviewStatus,
  sessionToken: string
): Promise<StatusUpdateResponse> {
  const itemType = item.kind === "ownerLead" ? "owner-lead" : "stay-proposal-request";
  const response = await fetch(
    `${getDevPortalApiBaseUrl()}/api/ops/workbench/${itemType}/${item.id}/status`,
    {
      body: JSON.stringify({ status }),
      headers: {
        "content-type": "application/json",
        "x-kuquba-dev-session": sessionToken
      },
      method: "PATCH"
    }
  );

  const payload = (await response.json().catch(() => ({}))) as StatusUpdateResponse & {
    error?: string;
  };

  if (!response.ok) {
    throw new Error(payload.error ?? "status_update_failed");
  }

  return payload;
}

function buildItemKey(item: WorkbenchItem) {
  return `${item.kind}:${item.id}`;
}

function buildEmptyMetrics(): WorkbenchMetric[] {
  return ["Leads propietario", "Solicitudes estancia", "Pendientes", "Auditoria"].map((label) => ({
    hint: "Pendiente de carga",
    label,
    value: "-"
  }));
}

function formatDate(value: string) {
  const date = new Date(value);

  return new Intl.DateTimeFormat("es-GT", {
    day: "2-digit",
    month: "short"
  }).format(date);
}

function formatDateTime(value: string) {
  const date = new Date(value);

  return new Intl.DateTimeFormat("es-GT", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short"
  }).format(date);
}
