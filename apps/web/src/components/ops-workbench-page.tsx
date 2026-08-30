"use client";

import {
  ArrowLeft,
  Building2,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Inbox,
  LogOut,
  RefreshCw,
  Send,
  ShieldCheck,
  SlidersHorizontal,
  Wrench,
  type LucideIcon
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { OpsCasePanel } from "./ops-case-panel";
import { OpsPropertyEditorPanel } from "./ops-property-editor-panel";
import { OpsReservationsPanel } from "./ops-reservations-panel";
import { OpsIamPanel } from "./ops-iam-panel";
import { getDevPortalApiBaseUrl, useDevPortalSession } from "./use-dev-portal-session";

type ReviewStatus = "NEW" | "REVIEWING" | "CONTACTED" | "CLOSED";
type StatusFilter = ReviewStatus | "ALL";
type QueueKey = "ownerLeads" | "proposalRequests";
type OpsModuleKey = "requests" | "reservations" | "properties" | "operations" | "iam" | "audit";

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

type RecentAuditEvent = OpsWorkbench["recentAuditEvents"][number];

type WorkbenchResponse = {
  workbench: OpsWorkbench;
};
type HousekeepingTaskStatus =
  "SCHEDULED" | "ASSIGNED" | "IN_PROGRESS" | "DONE" | "BLOCKED" | "CANCELLED";

type MaintenanceTicketStatus =
  "OPEN" | "TRIAGED" | "SCHEDULED" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";

type OperationStatusOption<T extends string> = {
  label: string;
  value: T;
};
type OperationTableStatusFilter<T extends string> = T | "ALL";

type OpsHousekeepingTask = {
  assigneeName?: string | null;
  blockedReason?: string | null;
  checklist: string[];
  completedAt?: string | null;
  id: string;
  notes?: string | null;
  priority: string;
  priorityLabel: string;
  property: {
    destination: string;
    id: string;
    name: string;
  };
  reservation?: {
    arrivalDate: string;
    departureDate: string;
    id: string;
    privateCode: string;
    status: string;
  } | null;
  serviceDate: string;
  serviceWindow?: string | null;
  status: HousekeepingTaskStatus;
  statusLabel: string;
  title: string;
  unit?: {
    id: string;
    name: string;
  } | null;
  updatedAt: string;
  vendorName?: string | null;
};

type OpsMaintenanceTicket = {
  assigneeName?: string | null;
  category: string;
  completedAt?: string | null;
  description: string;
  dueAt?: string | null;
  id: string;
  property: {
    destination: string;
    id: string;
    name: string;
  };
  reportedAt: string;
  resolutionNotes?: string | null;
  severity: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  severityLabel: string;
  status: MaintenanceTicketStatus;
  statusLabel: string;
  title: string;
  unit?: {
    id: string;
    name: string;
  } | null;
  updatedAt: string;
  vendorName?: string | null;
};

type OpsOperationsDashboard = {
  generatedAt: string;
  housekeepingStatusOptions: Array<OperationStatusOption<HousekeepingTaskStatus>>;
  housekeepingTasks: OpsHousekeepingTask[];
  maintenanceStatusOptions: Array<OperationStatusOption<MaintenanceTicketStatus>>;
  maintenanceTickets: OpsMaintenanceTicket[];
  metrics: WorkbenchMetric[];
};

type OperationsResponse = {
  operations: OpsOperationsDashboard;
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

const opsModuleOptions: Array<{ key: OpsModuleKey; label: string; icon: LucideIcon }> = [
  { key: "requests", label: "Solicitudes", icon: ClipboardList },
  { key: "reservations", label: "Reservas", icon: CalendarDays },
  { key: "properties", label: "Propiedades", icon: Building2 },
  { key: "operations", label: "Operaciones", icon: CalendarDays },
  { key: "iam", label: "IAM", icon: ShieldCheck },
  { key: "audit", label: "Auditoria", icon: SlidersHorizontal }
];

const defaultOpsModuleOption = opsModuleOptions[0] as (typeof opsModuleOptions)[number];
const opsActiveModuleStorageKey = "kuquba.ops.activeModule";

const statusFilterOptions: Array<{ label: string; value: StatusFilter }> = [
  { label: "Todos", value: "ALL" },
  { label: "Nuevos", value: "NEW" },
  { label: "En revision", value: "REVIEWING" },
  { label: "Contactados", value: "CONTACTED" },
  { label: "Cerrados", value: "CLOSED" }
];

export function OpsWorkbenchPage() {
  const { isValidating, logout, session } = useDevPortalSession("ops");
  const router = useRouter();
  const [workbench, setWorkbench] = useState<OpsWorkbench | null>(null);
  const [operations, setOperations] = useState<OpsOperationsDashboard | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [operationsLoadState, setOperationsLoadState] = useState<LoadState>("idle");
  const [activeModule, setActiveModule] = useState<OpsModuleKey>(() => readStoredOpsModule());
  const [activeQueue, setActiveQueue] = useState<QueueKey>("ownerLeads");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [selectedItem, setSelectedItem] = useState<WorkbenchItem | null>(null);
  const [updatingKey, setUpdatingKey] = useState<string | null>(null);
  const [operationsUpdatingKey, setOperationsUpdatingKey] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice>(null);

  useEffect(() => {
    window.localStorage.setItem(opsActiveModuleStorageKey, activeModule);
  }, [activeModule]);

  useEffect(() => {
    if (!session) {
      setWorkbench(null);
      setOperations(null);
      setLoadState(isValidating ? "loading" : "idle");
      setOperationsLoadState(isValidating ? "loading" : "idle");
      return;
    }

    let isMounted = true;
    setLoadState("loading");
    setOperationsLoadState("loading");

    Promise.all([fetchWorkbench(session.sessionToken), fetchOperations(session.sessionToken)])
      .then(([workbenchResponse, operationsResponse]) => {
        if (isMounted) {
          setWorkbench(workbenchResponse.workbench);
          setOperations(operationsResponse.operations);
          setLoadState("ready");
          setOperationsLoadState("ready");
        }
      })
      .catch(() => {
        if (isMounted) {
          setLoadState("error");
          setOperationsLoadState("error");
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

  const canManageIam = session?.permissions.includes("identity:user:manage") ?? false;
  const activeModuleOption =
    opsModuleOptions.find((option) => option.key === activeModule) ?? defaultOpsModuleOption;

  useEffect(() => {
    if (!canManageIam && activeModule === "iam") {
      setActiveModule("requests");
    }
  }, [activeModule, canManageIam]);

  const moduleSummaries = useMemo<Record<OpsModuleKey, string>>(() => {
    const requestCount =
      (workbench?.queues.ownerLeads.length ?? 0) + (workbench?.queues.proposalRequests.length ?? 0);
    const operationCount =
      (operations?.housekeepingTasks.length ?? 0) + (operations?.maintenanceTickets.length ?? 0);
    const auditCount = workbench?.recentAuditEvents.length ?? 0;

    return {
      audit: `${auditCount} eventos`,
      iam: canManageIam ? "Gestion activa" : "Sin permiso",
      operations: `${operationCount} tareas`,
      properties: "Catalogo activo",
      reservations: "Reservas y calendario",
      requests: `${requestCount} casos`
    };
  }, [canManageIam, operations, workbench]);

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
    setOperationsLoadState("loading");

    try {
      const [workbenchResponse, operationsResponse] = await Promise.all([
        fetchWorkbench(session.sessionToken),
        fetchOperations(session.sessionToken)
      ]);
      setWorkbench(workbenchResponse.workbench);
      setOperations(operationsResponse.operations);
      setLoadState("ready");
      setOperationsLoadState("ready");
    } catch {
      setLoadState("error");
      setOperationsLoadState("error");
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

  async function handleHousekeepingStatusChange(
    task: OpsHousekeepingTask,
    status: HousekeepingTaskStatus
  ) {
    if (!session || task.status === status) {
      return;
    }

    const updateKey = `housekeeping:${task.id}`;
    setOperationsUpdatingKey(updateKey);
    setNotice(null);

    try {
      const response = await patchHousekeepingStatus(task.id, status, session.sessionToken);
      const workbenchResponse = await fetchWorkbench(session.sessionToken);
      setOperations(response.operations);
      setWorkbench(workbenchResponse.workbench);
      setOperationsLoadState("ready");
      setNotice({ kind: "success", text: "Operacion de limpieza actualizada." });
    } catch {
      setNotice({ kind: "error", text: "No se pudo actualizar la limpieza." });
    } finally {
      setOperationsUpdatingKey(null);
    }
  }

  async function handleMaintenanceStatusChange(
    ticket: OpsMaintenanceTicket,
    status: MaintenanceTicketStatus
  ) {
    if (!session || ticket.status === status) {
      return;
    }

    const updateKey = `maintenance:${ticket.id}`;
    setOperationsUpdatingKey(updateKey);
    setNotice(null);

    try {
      const response = await patchMaintenanceStatus(ticket.id, status, session.sessionToken);
      const workbenchResponse = await fetchWorkbench(session.sessionToken);
      setOperations(response.operations);
      setWorkbench(workbenchResponse.workbench);
      setOperationsLoadState("ready");
      setNotice({ kind: "success", text: "Mantenimiento actualizado." });
    } catch {
      setNotice({ kind: "error", text: "No se pudo actualizar mantenimiento." });
    } finally {
      setOperationsUpdatingKey(null);
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
                Revision de leads de propietarios y solicitudes de propuesta con estado persistido y
                auditoria por accion.
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
            <OpsModuleNav
              activeModule={activeModule}
              canManageIam={canManageIam}
              moduleSummaries={moduleSummaries}
              onChange={setActiveModule}
            />
          ) : null}

          {session ? (
            <OpsModuleHeader module={activeModuleOption} summary={moduleSummaries[activeModule]} />
          ) : null}

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

          {session && activeModule === "requests" ? (
            <>
              <div className="mt-5 grid gap-3 md:grid-cols-4">
                {(workbench?.metrics ?? buildEmptyMetrics()).map((metric) => (
                  <MetricCard key={metric.label} metric={metric} />
                ))}
              </div>

              <div className="mt-5 rounded-[8px] border border-line bg-white p-4 shadow-soft">
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

              <div className="mt-6">
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

              <div className="mt-6">
                <OpsCasePanel
                  canApproveFormal={
                    session?.permissions.includes("operation:formal:approve") ?? false
                  }
                  currentUser={session?.user ?? null}
                  selectedItem={selectedItem}
                  sessionToken={session?.sessionToken ?? null}
                />
              </div>
            </>
          ) : null}

          {session && activeModule === "reservations" ? (
            <OpsReservationsPanel sessionToken={session.sessionToken} />
          ) : null}

          {session && activeModule === "properties" ? (
            <OpsPropertyEditorPanel sessionToken={session.sessionToken} />
          ) : null}

          {session && activeModule === "operations" ? (
            <OpsOperationsPanel
              loadState={operationsLoadState}
              onHousekeepingStatusChange={handleHousekeepingStatusChange}
              onMaintenanceStatusChange={handleMaintenanceStatusChange}
              operations={operations}
              updatingKey={operationsUpdatingKey}
            />
          ) : null}

          {session && activeModule === "iam" ? (
            canManageIam ? (
              <OpsIamPanel sessionToken={session.sessionToken} />
            ) : (
              <div className="mt-7">
                <StatePanel
                  body="Tu sesion no tiene permiso para modificar usuarios, roles y permisos."
                  icon={ShieldCheck}
                  title="IAM no disponible"
                />
              </div>
            )
          ) : null}

          {session && activeModule === "audit" ? (
            <OpsAuditPanel
              events={workbench?.recentAuditEvents ?? []}
              hasSession={Boolean(session)}
              loadState={loadState}
              variant="main"
            />
          ) : null}
        </div>
      </section>
    </main>
  );
}

function OpsModuleHeader({
  module,
  summary
}: {
  module: (typeof opsModuleOptions)[number];
  summary: string;
}) {
  const Icon = module.icon;

  return (
    <div className="mt-6 rounded-[8px] border border-line bg-white px-4 py-3 shadow-soft">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[6px] bg-green text-white">
            <Icon aria-hidden className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase text-green">Modulo activo</p>
            <h2 className="text-lg font-semibold text-midnight">{module.label}</h2>
          </div>
        </div>
        <span className="w-fit rounded-full border border-line bg-ivory px-3 py-1 text-xs font-semibold text-midnight/72">
          {summary}
        </span>
      </div>
    </div>
  );
}

function OpsModuleNav({
  activeModule,
  canManageIam,
  moduleSummaries,
  onChange
}: {
  activeModule: OpsModuleKey;
  canManageIam: boolean;
  moduleSummaries: Record<OpsModuleKey, string>;
  onChange: (module: OpsModuleKey) => void;
}) {
  const visibleOptions = canManageIam
    ? opsModuleOptions
    : opsModuleOptions.filter((option) => option.key !== "iam");

  return (
    <nav
      aria-label="Modulos Ops"
      className="mt-6 rounded-[8px] border border-line bg-white p-2 shadow-soft"
    >
      <div className="grid gap-1 sm:grid-cols-3 xl:grid-cols-6">
        {visibleOptions.map((option) => {
          const Icon = option.icon;
          const isActive = activeModule === option.key;

          return (
            <button
              aria-current={isActive ? "page" : undefined}
              className={
                "focus-ring flex min-h-12 items-center justify-between gap-2 rounded-[6px] px-3 text-left text-sm font-semibold transition " +
                (isActive ? "bg-green text-white" : "text-midnight hover:bg-ivory hover:text-green")
              }
              key={option.key}
              onClick={() => onChange(option.key)}
              title={moduleSummaries[option.key]}
              type="button"
            >
              <span className="inline-flex min-w-0 items-center gap-2">
                <Icon aria-hidden className="h-4 w-4 shrink-0" />
                <span className="truncate">{option.label}</span>
              </span>
              <span
                className={
                  "rounded-full px-2 py-0.5 text-[0.68rem] " +
                  (isActive ? "bg-white/20" : "bg-ivory text-ink/58")
                }
              >
                {getOpsModuleBadge(option.key, moduleSummaries[option.key])}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function getOpsModuleBadge(module: OpsModuleKey, summary: string) {
  const [firstToken] = summary.split(" ");

  if (module === "iam") {
    return summary === "Gestion activa" ? "on" : "off";
  }

  if (module === "properties") {
    return "cat";
  }

  if (module === "reservations") {
    return "cal";
  }

  return firstToken || "0";
}

function readStoredOpsModule(): OpsModuleKey {
  if (typeof window === "undefined") {
    return "requests";
  }

  const stored = window.localStorage.getItem(opsActiveModuleStorageKey);
  return opsModuleOptions.some((option) => option.key === stored)
    ? (stored as OpsModuleKey)
    : "requests";
}

function OpsAuditPanel({
  events,
  hasSession,
  loadState,
  variant = "aside"
}: {
  events: RecentAuditEvent[];
  hasSession: boolean;
  loadState?: LoadState;
  variant?: "aside" | "main";
}) {
  const isMain = variant === "main";

  return (
    <section
      className={
        isMain
          ? "mt-7 border-y border-line py-6"
          : "rounded-[8px] border border-line bg-white p-6 shadow-soft"
      }
    >
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-[6px] bg-midnight/8 text-midnight">
          <SlidersHorizontal aria-hidden className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase text-green">Auditoria</p>
          <h2
            className={
              isMain
                ? "text-2xl font-semibold text-midnight"
                : "text-lg font-semibold text-midnight"
            }
          >
            Eventos recientes
          </h2>
        </div>
      </div>

      <div className={isMain ? "mt-5 grid gap-3 lg:grid-cols-2" : "mt-5 space-y-3"}>
        {loadState === "loading" ? (
          <p className="rounded-[8px] border border-line bg-ivory p-5 text-sm leading-6 text-ink/62 lg:col-span-2">
            Sincronizando auditoria.
          </p>
        ) : loadState === "error" ? (
          <p className="rounded-[8px] border border-terracotta/30 bg-terracotta/10 p-5 text-sm leading-6 text-midnight lg:col-span-2">
            No se pudo cargar auditoria.
          </p>
        ) : (
          events.map((event) => (
            <div
              className={
                isMain
                  ? "rounded-[8px] border border-line bg-white p-4 text-sm shadow-soft"
                  : "border-b border-line pb-3 text-sm last:border-b-0 last:pb-0"
              }
              key={event.id}
            >
              <p className="font-semibold text-midnight">{event.action}</p>
              <p className="mt-1 text-xs text-ink/58">
                {event.entityType} - {event.result} - {formatDateTime(event.createdAt)}
              </p>
              {event.reason ? <p className="mt-1 text-xs text-ink/50">{event.reason}</p> : null}
            </div>
          ))
        )}
        {hasSession && loadState !== "loading" && loadState !== "error" && events.length === 0 ? (
          <p className="text-sm leading-6 text-ink/62 lg:col-span-2">
            Sin eventos recientes para esta bandeja.
          </p>
        ) : null}
      </div>
    </section>
  );
}
function OpsOperationsPanel({
  loadState,
  onHousekeepingStatusChange,
  onMaintenanceStatusChange,
  operations,
  updatingKey
}: {
  loadState: LoadState;
  onHousekeepingStatusChange: (task: OpsHousekeepingTask, status: HousekeepingTaskStatus) => void;
  onMaintenanceStatusChange: (
    ticket: OpsMaintenanceTicket,
    status: MaintenanceTicketStatus
  ) => void;
  operations: OpsOperationsDashboard | null;
  updatingKey: string | null;
}) {
  const metrics = operations?.metrics ?? buildEmptyOperationsMetrics();
  const housekeepingTasks = operations?.housekeepingTasks ?? [];
  const maintenanceTickets = operations?.maintenanceTickets ?? [];
  const [housekeepingStatusFilter, setHousekeepingStatusFilter] =
    useState<OperationTableStatusFilter<HousekeepingTaskStatus>>("ALL");
  const [maintenanceStatusFilter, setMaintenanceStatusFilter] =
    useState<OperationTableStatusFilter<MaintenanceTicketStatus>>("ALL");
  const visibleHousekeepingTasks =
    housekeepingStatusFilter === "ALL"
      ? housekeepingTasks
      : housekeepingTasks.filter((task) => task.status === housekeepingStatusFilter);
  const visibleMaintenanceTickets =
    maintenanceStatusFilter === "ALL"
      ? maintenanceTickets
      : maintenanceTickets.filter((ticket) => ticket.status === maintenanceStatusFilter);

  return (
    <section className="mt-7 border-y border-line py-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-[6px] bg-green/10 text-green">
            <CalendarDays aria-hidden className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-green">Operacion en campo</p>
            <h2 className="text-2xl font-semibold text-midnight">Housekeeping y mantenimiento</h2>
          </div>
        </div>
        <p className="text-sm text-ink/58">
          Actualizado {operations ? formatDateTime(operations.generatedAt) : "-"}
        </p>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} metric={metric} />
        ))}
      </div>

      {loadState === "loading" ? (
        <div className="mt-5 rounded-[8px] border border-line bg-white p-6 text-sm text-ink/62 shadow-soft">
          Sincronizando operaciones.
        </div>
      ) : loadState === "error" ? (
        <div className="mt-5 rounded-[8px] border border-terracotta/30 bg-terracotta/10 p-6 text-sm text-midnight">
          No se pudo cargar housekeeping y mantenimiento.
        </div>
      ) : (
        <div className="mt-5 space-y-6">
          <section>
            <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-midnight">
                <CheckCircle2 aria-hidden className="h-4 w-4 text-green" />
                Limpiezas
              </div>
              <OperationStatusFilters
                onChange={setHousekeepingStatusFilter}
                options={operations?.housekeepingStatusOptions ?? []}
                value={housekeepingStatusFilter}
              />
            </div>
            {visibleHousekeepingTasks.length > 0 ? (
              <HousekeepingTasksTable
                onStatusChange={onHousekeepingStatusChange}
                statusOptions={operations?.housekeepingStatusOptions ?? []}
                tasks={visibleHousekeepingTasks}
                updatingKey={updatingKey}
              />
            ) : (
              <EmptyOperationCard
                label={
                  housekeepingStatusFilter === "ALL"
                    ? "Sin limpiezas programadas."
                    : "Sin limpiezas con este estado."
                }
              />
            )}
          </section>

          <section>
            <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-midnight">
                <Wrench aria-hidden className="h-4 w-4 text-green" />
                Mantenimiento
              </div>
              <OperationStatusFilters
                onChange={setMaintenanceStatusFilter}
                options={operations?.maintenanceStatusOptions ?? []}
                value={maintenanceStatusFilter}
              />
            </div>
            {visibleMaintenanceTickets.length > 0 ? (
              <MaintenanceTicketsTable
                onStatusChange={onMaintenanceStatusChange}
                statusOptions={operations?.maintenanceStatusOptions ?? []}
                tickets={visibleMaintenanceTickets}
                updatingKey={updatingKey}
              />
            ) : (
              <EmptyOperationCard
                label={
                  maintenanceStatusFilter === "ALL"
                    ? "Sin tickets de mantenimiento."
                    : "Sin tickets con este estado."
                }
              />
            )}
          </section>
        </div>
      )}
    </section>
  );
}

function OperationStatusFilters<TStatus extends string>({
  onChange,
  options,
  value
}: {
  onChange: (value: OperationTableStatusFilter<TStatus>) => void;
  options: Array<OperationStatusOption<TStatus>>;
  value: OperationTableStatusFilter<TStatus>;
}) {
  const filterOptions: Array<OperationStatusOption<OperationTableStatusFilter<TStatus>>> = [
    { label: "Todos", value: "ALL" },
    ...options
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {filterOptions.map((option) => (
        <button
          className={`focus-ring min-h-9 rounded-[6px] border px-3 text-xs font-semibold transition ${
            value === option.value
              ? "border-midnight bg-midnight text-white"
              : "border-line bg-white text-midnight hover:border-midnight"
          }`}
          key={option.value}
          onClick={() => onChange(option.value)}
          type="button"
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
function HousekeepingTasksTable({
  onStatusChange,
  statusOptions,
  tasks,
  updatingKey
}: {
  onStatusChange: (task: OpsHousekeepingTask, status: HousekeepingTaskStatus) => void;
  statusOptions: Array<OperationStatusOption<HousekeepingTaskStatus>>;
  tasks: OpsHousekeepingTask[];
  updatingKey: string | null;
}) {
  return (
    <div className="max-h-[620px] overflow-auto rounded-[8px] border border-line bg-white shadow-soft">
      <table className="w-full min-w-[960px] border-separate border-spacing-0 text-left text-sm">
        <thead className="sticky top-0 z-20 bg-ivory text-xs uppercase text-ink/48 shadow-[0_1px_0_rgba(17,24,39,0.08)]">
          <tr>
            <th className="px-4 py-3 font-semibold">Tarea</th>
            <th className="px-4 py-3 font-semibold">Propiedad</th>
            <th className="px-4 py-3 font-semibold">Fecha</th>
            <th className="px-4 py-3 font-semibold">Responsable</th>
            <th className="px-4 py-3 font-semibold">Checklist</th>
            <th className="sticky right-0 z-30 bg-ivory px-4 py-3 font-semibold shadow-[-1px_0_0_rgba(17,24,39,0.08)]">
              Estado
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {tasks.map((task) => (
            <tr className="align-top transition hover:bg-ivory/60" key={task.id}>
              <td className="px-4 py-4">
                <p className="font-semibold text-midnight">{task.title}</p>
                <p className="mt-1 text-xs text-ink/58">Prioridad {task.priorityLabel}</p>
                {task.blockedReason ? (
                  <p className="mt-2 text-xs font-semibold text-terracotta">{task.blockedReason}</p>
                ) : task.notes ? (
                  <p className="mt-2 text-xs text-ink/58">{task.notes}</p>
                ) : null}
              </td>
              <td className="px-4 py-4 text-ink/70">
                <p className="font-semibold text-midnight">{task.property.name}</p>
                <p className="mt-1 text-xs text-ink/58">
                  {task.unit ? `${task.unit.name} - ` : ""}
                  {task.property.destination}
                </p>
                {task.reservation ? (
                  <p className="mt-2 text-xs text-ink/58">Reserva {task.reservation.privateCode}</p>
                ) : null}
              </td>
              <td className="px-4 py-4 text-ink/70">
                <p>{formatDate(task.serviceDate)}</p>
                <p className="mt-1 text-xs text-ink/58">{task.serviceWindow ?? "Sin ventana"}</p>
              </td>
              <td className="px-4 py-4 text-ink/70">
                <p>{task.assigneeName ?? "Sin asignar"}</p>
                <p className="mt-1 text-xs text-ink/58">{task.vendorName ?? "Interno"}</p>
              </td>
              <td className="px-4 py-4 text-ink/70">
                <ul className="space-y-1">
                  {task.checklist.slice(0, 3).map((item) => (
                    <li className="text-xs" key={item}>
                      {item}
                    </li>
                  ))}
                </ul>
                {task.checklist.length > 3 ? (
                  <p className="mt-1 text-xs text-ink/48">+{task.checklist.length - 3} mas</p>
                ) : null}
              </td>
              <td className="sticky right-0 bg-white px-4 py-4 shadow-[-1px_0_0_rgba(17,24,39,0.08)]">
                <select
                  aria-label={`Estado de ${task.title}`}
                  className="focus-ring h-10 w-full min-w-40 rounded-[6px] border border-line bg-white px-3 text-sm font-semibold text-midnight disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={updatingKey === `housekeeping:${task.id}`}
                  onChange={(event) =>
                    onStatusChange(task, event.target.value as HousekeepingTaskStatus)
                  }
                  value={task.status}
                >
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MaintenanceTicketsTable({
  onStatusChange,
  statusOptions,
  tickets,
  updatingKey
}: {
  onStatusChange: (ticket: OpsMaintenanceTicket, status: MaintenanceTicketStatus) => void;
  statusOptions: Array<OperationStatusOption<MaintenanceTicketStatus>>;
  tickets: OpsMaintenanceTicket[];
  updatingKey: string | null;
}) {
  return (
    <div className="max-h-[620px] overflow-auto rounded-[8px] border border-line bg-white shadow-soft">
      <table className="w-full min-w-[900px] border-separate border-spacing-0 text-left text-sm">
        <thead className="sticky top-0 z-20 bg-ivory text-xs uppercase text-ink/48 shadow-[0_1px_0_rgba(17,24,39,0.08)]">
          <tr>
            <th className="px-4 py-3 font-semibold">Ticket</th>
            <th className="px-4 py-3 font-semibold">Propiedad</th>
            <th className="px-4 py-3 font-semibold">Severidad</th>
            <th className="px-4 py-3 font-semibold">Responsable</th>
            <th className="sticky right-0 z-30 bg-ivory px-4 py-3 font-semibold shadow-[-1px_0_0_rgba(17,24,39,0.08)]">
              Estado
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {tickets.map((ticket) => (
            <tr className="align-top transition hover:bg-ivory/60" key={ticket.id}>
              <td className="px-4 py-4">
                <p className="text-xs font-semibold uppercase text-green">{ticket.category}</p>
                <p className="mt-1 font-semibold text-midnight">{ticket.title}</p>
                <p className="mt-2 max-w-md text-xs leading-5 text-ink/58">{ticket.description}</p>
                {ticket.resolutionNotes ? (
                  <p className="mt-2 text-xs font-semibold text-green">{ticket.resolutionNotes}</p>
                ) : null}
              </td>
              <td className="px-4 py-4 text-ink/70">
                <p className="font-semibold text-midnight">{ticket.property.name}</p>
                <p className="mt-1 text-xs text-ink/58">
                  {ticket.unit ? `${ticket.unit.name} - ` : ""}
                  {ticket.property.destination}
                </p>
              </td>
              <td className="px-4 py-4">
                <span
                  className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getSeverityClasses(ticket.severity)}`}
                >
                  {ticket.severityLabel}
                </span>
                <p className="mt-2 text-xs text-ink/58">
                  Vence {ticket.dueAt ? formatDate(ticket.dueAt) : "sin fecha"}
                </p>
              </td>
              <td className="px-4 py-4 text-ink/70">
                <p>{ticket.assigneeName ?? "Sin asignar"}</p>
                <p className="mt-1 text-xs text-ink/58">{ticket.vendorName ?? "Interno"}</p>
              </td>
              <td className="sticky right-0 bg-white px-4 py-4 shadow-[-1px_0_0_rgba(17,24,39,0.08)]">
                <select
                  aria-label={`Estado de ${ticket.title}`}
                  className="focus-ring h-10 w-full min-w-40 rounded-[6px] border border-line bg-white px-3 text-sm font-semibold text-midnight disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={updatingKey === `maintenance:${ticket.id}`}
                  onChange={(event) =>
                    onStatusChange(ticket, event.target.value as MaintenanceTicketStatus)
                  }
                  value={ticket.status}
                >
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
function EmptyOperationCard({ label }: { label: string }) {
  return (
    <div className="rounded-[8px] border border-line bg-white p-5 text-sm text-ink/62 shadow-soft">
      {label}
    </div>
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

  return (
    <WorkbenchItemsTable
      items={items}
      onOpenCase={onOpenCase}
      onStatusChange={onStatusChange}
      selectedItemKey={selectedItemKey}
      statusOptions={statusOptions}
      updatingKey={updatingKey}
    />
  );
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

function WorkbenchItemsTable({
  items,
  onOpenCase,
  onStatusChange,
  selectedItemKey,
  statusOptions,
  updatingKey
}: {
  items: WorkbenchItem[];
  onOpenCase: (item: WorkbenchItem) => void;
  onStatusChange: (item: WorkbenchItem, status: ReviewStatus) => void;
  selectedItemKey: string | null;
  statusOptions: WorkbenchStatusOption[];
  updatingKey: string | null;
}) {
  return (
    <div className="max-h-[620px] overflow-auto rounded-[8px] border border-line bg-white shadow-soft">
      <table className="w-full min-w-[1020px] border-separate border-spacing-0 text-left text-sm">
        <thead className="sticky top-0 z-20 bg-ivory text-xs uppercase text-ink/48 shadow-[0_1px_0_rgba(17,24,39,0.08)]">
          <tr>
            <th className="px-4 py-3 font-semibold">Tipo</th>
            <th className="px-4 py-3 font-semibold">Contacto</th>
            <th className="px-4 py-3 font-semibold">Detalle</th>
            <th className="px-4 py-3 font-semibold">Estado</th>
            <th className="px-4 py-3 font-semibold">Actualizado</th>
            <th className="sticky right-0 z-30 bg-ivory px-4 py-3 font-semibold shadow-[-1px_0_0_rgba(17,24,39,0.08)]">
              Accion
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {items.map((item) => {
            const itemKey = buildItemKey(item);
            const selected = selectedItemKey === itemKey;
            const updating = updatingKey === itemKey;

            return (
              <tr
                className={`align-top transition hover:bg-ivory/60 ${selected ? "bg-green/5" : ""}`}
                key={itemKey}
              >
                <td className="px-4 py-4">
                  <p className="text-xs font-semibold uppercase text-green">
                    {item.kind === "ownerLead" ? "Lead" : "Solicitud"}
                  </p>
                  <p className="mt-1 max-w-[220px] font-semibold leading-5 text-midnight">
                    {item.title}
                  </p>
                  <p className="mt-2 max-w-[260px] text-xs leading-5 text-ink/58">{item.summary}</p>
                </td>
                <td className="px-4 py-4 text-ink/70">
                  <p className="font-semibold text-midnight">{item.primaryName}</p>
                  <p className="mt-1 text-xs text-ink/58">{item.email}</p>
                  <p className="mt-1 text-xs text-ink/58">{item.phone ?? "No indicado"}</p>
                </td>
                <td className="px-4 py-4 text-ink/70">
                  <p className="font-semibold text-midnight">{item.location}</p>
                  {item.kind === "ownerLead" ? (
                    <>
                      <p className="mt-1 text-xs text-ink/58">{item.propertyType}</p>
                      <p className="mt-1 text-xs text-ink/58">{item.operatingStatus}</p>
                    </>
                  ) : (
                    <>
                      <p className="mt-1 text-xs text-ink/58">{item.guests} huespedes</p>
                      <p className="mt-1 text-xs text-ink/58">
                        {item.arrivalDate ? formatDate(item.arrivalDate) : "Flexible"} -{" "}
                        {item.departureDate ? formatDate(item.departureDate) : "Flexible"}
                      </p>
                    </>
                  )}
                </td>
                <td className="px-4 py-4">
                  <select
                    aria-label={`Estado de ${item.title}`}
                    className="focus-ring h-10 w-full min-w-40 rounded-[6px] border border-line bg-white px-3 text-sm font-semibold text-midnight disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={updating}
                    onChange={(event) => onStatusChange(item, event.target.value as ReviewStatus)}
                    value={item.status}
                  >
                    {statusOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-4 text-xs text-ink/58">{formatDateTime(item.updatedAt)}</td>
                <td className="sticky right-0 bg-white px-4 py-4 shadow-[-1px_0_0_rgba(17,24,39,0.08)]">
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
                    {selected ? "Abierto" : "Abrir"}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
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

async function fetchOperations(sessionToken: string): Promise<OperationsResponse> {
  const response = await fetch(`${getDevPortalApiBaseUrl()}/api/ops/operations`, {
    headers: {
      "x-kuquba-dev-session": sessionToken
    }
  });

  const payload = (await response.json().catch(() => ({}))) as OperationsResponse & {
    error?: string;
  };

  if (!response.ok) {
    throw new Error(payload.error ?? "operations_request_failed");
  }

  return payload;
}

async function patchHousekeepingStatus(
  taskId: string,
  status: HousekeepingTaskStatus,
  sessionToken: string
): Promise<OperationsResponse> {
  const response = await fetch(
    `${getDevPortalApiBaseUrl()}/api/ops/operations/housekeeping/${taskId}/status`,
    {
      body: JSON.stringify({ status }),
      headers: {
        "content-type": "application/json",
        "x-kuquba-dev-session": sessionToken
      },
      method: "PATCH"
    }
  );

  const payload = (await response.json().catch(() => ({}))) as OperationsResponse & {
    error?: string;
  };

  if (!response.ok) {
    throw new Error(payload.error ?? "housekeeping_status_update_failed");
  }

  return payload;
}

async function patchMaintenanceStatus(
  ticketId: string,
  status: MaintenanceTicketStatus,
  sessionToken: string
): Promise<OperationsResponse> {
  const response = await fetch(
    `${getDevPortalApiBaseUrl()}/api/ops/operations/maintenance/${ticketId}/status`,
    {
      body: JSON.stringify({ status }),
      headers: {
        "content-type": "application/json",
        "x-kuquba-dev-session": sessionToken
      },
      method: "PATCH"
    }
  );

  const payload = (await response.json().catch(() => ({}))) as OperationsResponse & {
    error?: string;
  };

  if (!response.ok) {
    throw new Error(payload.error ?? "maintenance_status_update_failed");
  }

  return payload;
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

function buildEmptyOperationsMetrics(): WorkbenchMetric[] {
  return ["Limpiezas activas", "Mantenimiento", "Prioridad tecnica"].map((label) => ({
    hint: "Pendiente de carga",
    label,
    value: "-"
  }));
}

function getSeverityClasses(severity: OpsMaintenanceTicket["severity"]) {
  if (severity === "URGENT" || severity === "HIGH") {
    return "border-terracotta/30 bg-terracotta/10 text-terracotta";
  }

  if (severity === "MEDIUM") {
    return "border-midnight/18 bg-midnight/8 text-midnight";
  }

  return "border-line bg-ivory text-ink/62";
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
