"use client";

import {
  ArrowLeft,
  Building2,
  CalendarCheck2,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  FileText,
  LogOut,
  MapPin,
  Maximize2,
  ShieldCheck,
  TrendingUp,
  UserRound,
  Wrench,
  X,
  type LucideIcon
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import {
  getDevPortalApiBaseUrl,
  type DevPortalSession,
  useDevPortalSession
} from "@/components/use-dev-portal-session";
import type {
  OwnerPortalSnapshot,
  OwnerProperty,
  OwnerPropertyStatus,
  OwnerTask
} from "@/data/owner-portal";

const propertyStatusClasses: Record<OwnerPropertyStatus, string> = {
  active: "border-green/24 bg-green/10 text-green",
  attention: "border-midnight/18 bg-midnight/8 text-midnight",
  onboarding: "border-terracotta/26 bg-terracotta/10 text-terracotta"
};

const taskPriorityClasses: Record<OwnerTask["priority"], string> = {
  high: "border-terracotta/28 bg-terracotta/10 text-terracotta",
  low: "border-line bg-ivory text-ink/62",
  medium: "border-green/24 bg-green/10 text-green"
};

const protectedPortalSummary =
  "Vista protegida para propietarios verificados. Las propiedades, tareas y documentos se cargan con una sesion vigente.";

type OwnerPortalResponse = {
  correlationId: string;
  portal: OwnerPortalSnapshot;
};

type OwnerContractAcceptResponse = OwnerPortalResponse & {
  contract: OwnerProperty["contract"];
};

type OwnerAvailabilityBlockResponse = OwnerPortalResponse & {
  block: OwnerProperty["requestedBlocks"][number];
};

type Notice = { kind: "success" | "error"; text: string } | null;
type SuggestedOwnerBlockDates = { endsOn: string; startsOn: string };
type OwnerPortalViewKey = "finance" | "properties";

const ownerPortalViews: Array<{ icon: LucideIcon; key: OwnerPortalViewKey; label: string }> = [
  { icon: TrendingUp, key: "finance", label: "Dashboard financiero" },
  { icon: Building2, key: "properties", label: "Propiedades" }
];
type OwnerPropertyTabKey =
  | "overview"
  | "reservations"
  | "blocks"
  | "finance"
  | "operations"
  | "documents";

const propertyTabs: Array<{ icon: LucideIcon; key: OwnerPropertyTabKey; label: string }> = [
  { icon: Building2, key: "overview", label: "Informacion" },
  { icon: CalendarCheck2, key: "reservations", label: "Reservas" },
  { icon: Wrench, key: "blocks", label: "Bloqueos" },
  { icon: TrendingUp, key: "finance", label: "Finanzas" },
  { icon: ClipboardCheck, key: "operations", label: "Operaciones" },
  { icon: FileText, key: "documents", label: "Documentos" }
];

type OwnerCalendarEventTone = "confirmed" | "hold" | "maintenance" | "ops" | "owner" | "pending";

type OwnerCalendarDay = {
  date: Date;
  events: OwnerCalendarEvent[];
  key: string;
};

type OwnerCalendarMonth = {
  availableDays: number;
  days: OwnerCalendarDay[];
  key: string;
  label: string;
  leadingBlanks: number;
};

type OwnerCalendarEvent = {
  endsOn: string;
  id: string;
  label: string;
  requester: string;
  startsOn: string;
  tone: OwnerCalendarEventTone;
  type: "block" | "reservation";
  unitName: string;
};

type OwnerCalendarUnit = {
  events: OwnerCalendarEvent[];
  key: string;
  unitName: string;
};

export function OwnerPortalHomePage() {
  const { isValidating, logout, session } = useDevPortalSession("owner");
  const [portal, setPortal] = useState<OwnerPortalSnapshot | null>(null);
  const [portalError, setPortalError] = useState<string | null>(null);
  const [isPortalLoading, setIsPortalLoading] = useState(false);
  const [contractNotice, setContractNotice] = useState<Notice>(null);
  const [updatingContractId, setUpdatingContractId] = useState<string | null>(null);
  const [blockingPropertyId, setBlockingPropertyId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    let isMounted = true;

    const sessionToken = session?.sessionToken;

    if (!sessionToken) {
      setPortal(null);
      setPortalError(null);
      setIsPortalLoading(false);
      setContractNotice(null);
      setUpdatingContractId(null);
      setBlockingPropertyId(null);
      return;
    }

    const activeSessionToken: string = sessionToken;

    async function loadOwnerPortal() {
      setIsPortalLoading(true);
      setPortalError(null);
      setContractNotice(null);

      try {
        const response = await fetch(`${getDevPortalApiBaseUrl()}/api/owner/portal`, {
          headers: {
            "x-kuquba-dev-session": activeSessionToken
          }
        });

        if (!response.ok) {
          const payload = (await response.json().catch(() => undefined)) as
            { error?: string } | undefined;
          throw new Error(payload?.error ?? "owner_portal_load_failed");
        }

        const payload = (await response.json()) as OwnerPortalResponse;

        if (isMounted) {
          setPortal(payload.portal);
          setIsPortalLoading(false);
        }
      } catch (error) {
        if (isMounted) {
          setPortal(null);
          setPortalError(error instanceof Error ? error.message : "owner_portal_load_failed");
          setIsPortalLoading(false);
        }
      }
    }

    void loadOwnerPortal();

    return () => {
      isMounted = false;
    };
  }, [session?.sessionToken]);

  async function handleLogout() {
    await logout();
    router.push("/owner");
  }

  async function handleAvailabilityBlockRequest(input: {
    endsOn: string;
    note: string;
    propertyId: string;
    startsOn: string;
    unitId: string;
  }) {
    const sessionToken = session?.sessionToken;

    if (!sessionToken) {
      return;
    }

    setBlockingPropertyId(input.propertyId);
    setContractNotice(null);

    try {
      const response = await requestOwnerAvailabilityBlock(input, sessionToken);
      setPortal(response.portal);
      setContractNotice({ kind: "success", text: "Bloqueo solicitado y auditado." });
    } catch {
      setContractNotice({
        kind: "error",
        text: "No se pudo solicitar el bloqueo. Revisa fechas disponibles."
      });
    } finally {
      setBlockingPropertyId(null);
    }
  }
  async function handleContractAccept(contractId: string) {
    const sessionToken = session?.sessionToken;

    if (!sessionToken) {
      return;
    }

    setUpdatingContractId(contractId);
    setContractNotice(null);

    try {
      const response = await acceptOwnerContract(contractId, sessionToken);
      setPortal(response.portal);
      setContractNotice({ kind: "success", text: "Contrato aceptado y auditado." });
    } catch {
      setContractNotice({ kind: "error", text: "No se pudo aceptar el contrato." });
    } finally {
      setUpdatingContractId(null);
      setBlockingPropertyId(null);
    }
  }

  return (
    <main className="min-h-screen bg-ivory text-ink">
      <header className="border-b border-white/10 bg-midnight text-white">
        <div className="container-shell flex flex-col gap-4 py-5 md:flex-row md:items-center md:justify-between">
          <a className="focus-ring inline-flex w-fit items-center gap-3 rounded-md" href="/">
            <Image
              alt=""
              className="h-11 w-11 object-contain"
              height={48}
              src="/brand/kuquba-isotipo.svg"
              width={48}
            />
            <span>
              <span className="block text-2xl font-semibold leading-none">KUQUBA</span>
              <span className="mt-1 block text-[0.62rem] uppercase text-[#1fb7a2]">
                Conexiones que generan confianza
              </span>
            </span>
          </a>

          <div className="flex flex-wrap items-center gap-3">
            <a
              className="focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-[6px] border border-white/35 px-4 text-sm font-semibold text-white/90 transition hover:border-white hover:text-white"
              href="/owner"
            >
              <ArrowLeft aria-hidden className="h-4 w-4" />
              Acceso
            </a>
            <AccountMenu isValidating={isValidating} onLogout={handleLogout} session={session} />
          </div>
        </div>
      </header>

      <section className="border-b border-line bg-white">
        <div className="container-shell py-5 md:py-6">
          <div className="max-w-3xl">
            <p className="inline-flex items-center gap-2 rounded-full border border-green/20 bg-green/10 px-3 py-1.5 text-xs font-semibold text-green">
              <Building2 aria-hidden className="h-4 w-4" />
              Propietarios
            </p>
            <h1 className="mt-3 font-display text-3xl leading-tight text-midnight md:text-4xl">
              Portfolio y operacion de propiedades
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/68">
              {portal?.summary ?? protectedPortalSummary}
            </p>
          </div>
        </div>
      </section>

      <section className="container-shell py-6">
        {session ? (
          portal ? (
            <OwnerDashboard
              contractNotice={contractNotice}
              blockingPropertyId={blockingPropertyId}
              onAvailabilityBlockRequest={handleAvailabilityBlockRequest}
              onContractAccept={handleContractAccept}
              session={session}
              snapshot={portal}
              updatingContractId={updatingContractId}
            />
          ) : (
            <PortalLoadState error={portalError} isLoading={isPortalLoading} />
          )
        ) : (
          <AccessState isValidating={isValidating} />
        )}
      </section>
    </main>
  );
}

function AccountMenu({
  isValidating,
  onLogout,
  session
}: {
  isValidating: boolean;
  onLogout: () => void;
  session: DevPortalSession | null;
}) {
  if (!session) {
    return (
      <span className="inline-flex min-h-11 items-center gap-2 rounded-[6px] border border-white/20 px-4 text-sm font-semibold text-white/72">
        <ShieldCheck aria-hidden className="h-4 w-4" />
        {isValidating ? "Validando" : "Sin sesion"}
      </span>
    );
  }

  return (
    <details className="group relative">
      <summary className="focus-ring flex min-h-11 cursor-pointer list-none items-center gap-3 rounded-[6px] border border-white/25 px-3 text-left text-sm text-white/90 transition hover:border-white">
        <span className="flex h-8 w-8 items-center justify-center rounded-[6px] bg-white/10 text-white">
          <UserRound aria-hidden className="h-4 w-4" />
        </span>
        <span className="min-w-0">
          <span className="block max-w-36 truncate font-semibold text-white">
            {session.user.displayName}
          </span>
          <span className="block text-xs text-white/62">{session.role.name}</span>
        </span>
        <ChevronDown
          aria-hidden
          className="h-4 w-4 text-white/64 transition group-open:rotate-180"
        />
      </summary>
      <div className="absolute right-0 z-40 mt-2 w-72 max-w-[calc(100vw-2rem)] rounded-[8px] border border-line bg-white p-4 text-sm text-ink shadow-soft">
        <p className="text-xs font-semibold uppercase text-green">Cuenta</p>
        <p className="mt-2 truncate font-semibold text-midnight">{session.user.displayName}</p>
        <p className="mt-1 truncate text-ink/62">{session.user.emailMasked}</p>
        <dl className="mt-4 space-y-2 border-t border-line pt-3">
          <SessionRow label="Rol" value={session.role.name} />
          <SessionRow label="Expira" value={formatSessionExpiry(session.expiresAt)} />
        </dl>
        <button
          className="focus-ring mt-4 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-[6px] bg-midnight px-4 text-sm font-semibold text-white transition hover:bg-green"
          onClick={onLogout}
          type="button"
        >
          <LogOut aria-hidden className="h-4 w-4" />
          Cerrar sesion
        </button>
      </div>
    </details>
  );
}

function OwnerDashboard({
  contractNotice,
  blockingPropertyId,
  onAvailabilityBlockRequest,
  onContractAccept,
  session,
  snapshot,
  updatingContractId
}: {
  contractNotice: Notice;
  blockingPropertyId: string | null;
  onAvailabilityBlockRequest: (input: {
    endsOn: string;
    note: string;
    propertyId: string;
    startsOn: string;
    unitId: string;
  }) => void;
  onContractAccept: (contractId: string) => void;
  session: DevPortalSession;
  snapshot: OwnerPortalSnapshot;
  updatingContractId: string | null;
}) {
  const [activeOwnerView, setActiveOwnerView] = useState<OwnerPortalViewKey>("finance");
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(
    snapshot.properties[0]?.id ?? null
  );
  const [activePropertyTab, setActivePropertyTab] = useState<OwnerPropertyTabKey>("overview");
  const selectedProperty =
    snapshot.properties.find((property) => property.id === selectedPropertyId) ??
    snapshot.properties[0] ??
    null;
  const selectedPropertyTasks = selectedProperty ? getPropertyTasks(snapshot, selectedProperty) : [];
  const selectedPropertySettlements = selectedProperty
    ? getPropertySettlements(snapshot, selectedProperty)
    : [];

  function handleSelectProperty(propertyId: string) {
    setSelectedPropertyId(propertyId);
    setActivePropertyTab("overview");
  }

  return (
    <>
      <OwnerPortalViewTabs
        activeView={activeOwnerView}
        onSelectView={setActiveOwnerView}
        snapshot={snapshot}
      />

      {contractNotice ? (
        <div
          className={
            "mt-5 rounded-[6px] border p-3 text-sm " +
            (contractNotice.kind === "success"
              ? "border-green/24 bg-green/10 text-midnight"
              : "border-terracotta/30 bg-terracotta/10 text-midnight")
          }
        >
          {contractNotice.text}
        </div>
      ) : null}

      {activeOwnerView === "finance" ? (
        <div className="mt-5">
          <OwnerPortfolioDashboard session={session} snapshot={snapshot} />
        </div>
      ) : (
        <div className="mt-5 grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)] xl:items-start">
          <PropertyCatalog
            onSelect={handleSelectProperty}
            properties={snapshot.properties}
            selectedPropertyId={selectedProperty?.id ?? null}
          />

          {selectedProperty ? (
            <PropertyWorkspace
              activeTab={activePropertyTab}
              blockingPropertyId={blockingPropertyId}
              onAvailabilityBlockRequest={onAvailabilityBlockRequest}
              onContractAccept={onContractAccept}
              onTabChange={setActivePropertyTab}
              property={selectedProperty}
              propertySettlements={selectedPropertySettlements}
              propertyTasks={selectedPropertyTasks}
              updatingContractId={updatingContractId}
            />
          ) : (
            <OwnerEmptyState />
          )}
        </div>
      )}
    </>
  );
}

function OwnerPortalViewTabs({
  activeView,
  onSelectView,
  snapshot
}: {
  activeView: OwnerPortalViewKey;
  onSelectView: (view: OwnerPortalViewKey) => void;
  snapshot: OwnerPortalSnapshot;
}) {
  return (
    <nav
      aria-label="Vistas del portal de propietario"
      className="rounded-[8px] border border-line bg-white p-1.5 shadow-soft"
    >
      <div className="grid gap-2 sm:grid-cols-2">
        {ownerPortalViews.map((view) => {
          const Icon = view.icon;
          const isActive = activeView === view.key;
          const count = view.key === "finance" ? snapshot.settlements.length : snapshot.properties.length;

          return (
            <button
              aria-current={isActive ? "page" : undefined}
              className={
                "focus-ring flex min-h-11 items-center justify-between gap-3 rounded-[6px] px-4 text-sm font-semibold transition " +
                (isActive ? "bg-green text-white" : "text-midnight hover:bg-ivory hover:text-green")
              }
              key={view.key}
              onClick={() => onSelectView(view.key)}
              type="button"
            >
              <span className="inline-flex min-w-0 items-center gap-2">
                <Icon aria-hidden className="h-4 w-4 shrink-0" />
                <span className="truncate">{view.label}</span>
              </span>
              <span
                className={
                  "inline-flex h-6 min-w-6 items-center justify-center rounded-full px-2 text-[0.68rem] " +
                  (isActive ? "bg-white/20 text-white" : "bg-ivory text-ink/58")
                }
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
function OwnerPortfolioDashboard({
  session,
  snapshot
}: {
  session: DevPortalSession;
  snapshot: OwnerPortalSnapshot;
}) {
  const finance = snapshot.financeSummary;
  const pendingSettlement =
    snapshot.settlements.find((settlement) => settlement.status !== "PAID") ?? null;
  const confirmedReservations = snapshot.reservations.filter(
    (reservation) => reservation.status === "CONFIRMED"
  ).length;

  return (
    <section className="rounded-[8px] border border-line bg-white p-5 shadow-soft md:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase text-green">Dashboard principal</p>
          <h2 className="mt-1 text-2xl font-semibold text-midnight">{snapshot.ownerName}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-ink/64">
            Seguimiento de cortes, reservas del periodo y acumulado estimado para el propietario.
          </p>
        </div>
        <div className="flex min-w-0 items-center gap-3 rounded-[8px] border border-line bg-ivory px-3 py-2">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[6px] bg-green/10 text-green">
            <UserRound aria-hidden className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-midnight">{session.user.displayName}</p>
            <p className="text-xs text-ink/56">{snapshot.properties.length} propiedades asignadas</p>
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-3">
        <DashboardFact
          detail={
            pendingSettlement
              ? `${pendingSettlement.periodLabel} / ${pendingSettlement.statusLabel}`
              : `${finance.periodLabel} / Sin corte pendiente`
          }
          icon={Clock3}
          label="Corte pendiente de ejecutarse"
          value={pendingSettlement?.ownerPayoutLabel ?? "Sin corte"}
        />
        <DashboardFact
          detail={`${confirmedReservations} confirmada(s), ${snapshot.reservations.length} visible(s)`}
          icon={CalendarCheck2}
          label="Reservas del periodo"
          value={String(snapshot.reservations.length)}
        />
        <DashboardFact
          detail={`${finance.statusLabel} / ${finance.periodLabel}`}
          icon={TrendingUp}
          label="Acumulado para este corte"
          value={finance.ownerPayoutLabel}
        />
      </div>

      <SettlementHistory settlements={snapshot.settlements} />
    </section>
  );
}

function DashboardFact({
  detail,
  icon: Icon,
  label,
  value
}: {
  detail: string;
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[8px] border border-line bg-ivory p-4">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase text-ink/48">
        <Icon aria-hidden className="h-4 w-4 text-green" />
        {label}
      </p>
      <p className="mt-3 break-words text-2xl font-semibold text-midnight">{value}</p>
      <p className="mt-1 text-sm leading-6 text-ink/62">{detail}</p>
    </div>
  );
}

function SettlementHistory({ settlements }: { settlements: OwnerPortalSnapshot["settlements"] }) {
  return (
    <div className="mt-5 border-t border-line pt-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase text-green">Historico de cortes</p>
          <h3 className="mt-1 text-lg font-semibold text-midnight">Pagos al propietario</h3>
        </div>
        <span className="w-fit rounded-full border border-line bg-white px-3 py-1 text-xs font-semibold text-midnight/72">
          {settlements.length} corte(s)
        </span>
      </div>

      {settlements.length > 0 ? (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-left text-xs">
            <thead className="bg-ivory text-ink/48">
              <tr>
                <th className="px-3 py-2 font-semibold uppercase">Periodo</th>
                <th className="px-3 py-2 font-semibold uppercase">Propiedad</th>
                <th className="px-3 py-2 font-semibold uppercase">Estado</th>
                <th className="px-3 py-2 font-semibold uppercase">Pago propietario</th>
                <th className="px-3 py-2 font-semibold uppercase">Pagado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {settlements.map((settlement) => (
                <tr key={settlement.id}>
                  <td className="px-3 py-3 font-semibold text-midnight">{settlement.periodLabel}</td>
                  <td className="px-3 py-3 text-ink/64">{settlement.propertyName}</td>
                  <td className="px-3 py-3 text-ink/64">{settlement.statusLabel}</td>
                  <td className="px-3 py-3 font-semibold text-midnight">
                    {settlement.ownerPayoutLabel}
                  </td>
                  <td className="px-3 py-3 text-ink/64">{formatContractDate(settlement.paidAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mt-4 rounded-[6px] border border-line bg-ivory p-4 text-sm leading-6 text-ink/64">
          Aun no hay cortes historicos para este propietario.
        </p>
      )}
    </div>
  );
}

function PropertyCatalog({
  onSelect,
  properties,
  selectedPropertyId
}: {
  onSelect: (propertyId: string) => void;
  properties: OwnerProperty[];
  selectedPropertyId: string | null;
}) {
  return (
    <section className="rounded-[8px] border border-line bg-white p-5 shadow-soft md:p-6">
      <SectionHeading
        eyebrow="Catalogo"
        title="Propiedades"
        value={String(properties.length) + " asignada(s)"}
      />
      <div className="mt-5 space-y-3">
        {properties.map((property) => {
          const isSelected = property.id === selectedPropertyId;
          return (
            <button
              aria-pressed={isSelected}
              className={
                "focus-ring grid w-full gap-3 rounded-[8px] border p-3 text-left transition sm:grid-cols-[88px_minmax(0,1fr)] " +
                (isSelected
                  ? "border-green bg-green/8"
                  : "border-line bg-white hover:border-green hover:bg-ivory")
              }
              key={property.id}
              onClick={() => onSelect(property.id)}
              type="button"
            >
              <span className="relative h-20 overflow-hidden rounded-[6px] bg-midnight sm:h-full">
                <Image
                  alt={property.imageAlt}
                  className="object-cover"
                  fill
                  sizes="88px"
                  src={property.image}
                />
              </span>
              <span className="min-w-0">
                <span className="flex items-center justify-between gap-3">
                  <span className="truncate text-sm font-semibold text-midnight">{property.name}</span>
                  <span className="shrink-0 rounded-full border border-line bg-white px-2 py-0.5 text-[0.68rem] font-semibold text-midnight/70">
                    {property.reservations.length}
                  </span>
                </span>
                <span className="mt-1 block truncate text-xs text-ink/58">{property.location}</span>
                <span className="mt-3 flex flex-wrap gap-2">
                  <span className="rounded-full border border-line bg-white px-2 py-0.5 text-[0.68rem] font-semibold text-midnight/70">
                    {property.statusLabel}
                  </span>
                  <span className="rounded-full border border-line bg-white px-2 py-0.5 text-[0.68rem] font-semibold text-midnight/70">
                    {property.openItems} pendiente(s)
                  </span>
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function PropertyWorkspace({
  activeTab,
  blockingPropertyId,
  onAvailabilityBlockRequest,
  onContractAccept,
  onTabChange,
  property,
  propertySettlements,
  propertyTasks,
  updatingContractId
}: {
  activeTab: OwnerPropertyTabKey;
  blockingPropertyId: string | null;
  onAvailabilityBlockRequest: (input: {
    endsOn: string;
    note: string;
    propertyId: string;
    startsOn: string;
    unitId: string;
  }) => void;
  onContractAccept: (contractId: string) => void;
  onTabChange: (tab: OwnerPropertyTabKey) => void;
  property: OwnerProperty;
  propertySettlements: OwnerPortalSnapshot["settlements"];
  propertyTasks: OwnerPortalSnapshot["tasks"];
  updatingContractId: string | null;
}) {
  const content =
    activeTab === "overview" ? (
      <PropertyOverviewTab property={property} />
    ) : activeTab === "reservations" ? (
      <PropertyReservationsTab reservations={property.reservations} />
    ) : activeTab === "blocks" ? (
      <PropertyBlocksTab
        blockingPropertyId={blockingPropertyId}
        onAvailabilityBlockRequest={onAvailabilityBlockRequest}
        property={property}
      />
    ) : activeTab === "finance" ? (
      <PropertyFinanceTab property={property} settlements={propertySettlements} />
    ) : activeTab === "operations" ? (
      <PropertyOperationsTab property={property} tasks={propertyTasks} />
    ) : (
      <PropertyDocumentsTab
        onContractAccept={onContractAccept}
        property={property}
        updatingContractId={updatingContractId}
      />
    );

  return (
    <section className="min-w-0 rounded-[8px] border border-line bg-white p-5 shadow-soft md:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-medium text-green">
            <MapPin aria-hidden className="h-4 w-4" />
            {property.location}
          </p>
          <h2 className="mt-2 font-display text-3xl leading-tight text-midnight">{property.name}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-ink/64">{property.contractStage}</p>
        </div>
        <span className="w-fit rounded-full border border-line bg-ivory px-3 py-1 text-xs font-semibold text-midnight/72">
          {property.serviceLevel}
        </span>
      </div>

      <PropertyTabs
        activeTab={activeTab}
        onTabChange={onTabChange}
        property={property}
        propertySettlements={propertySettlements}
        propertyTasks={propertyTasks}
      />

      <div className="mt-5">{content}</div>
    </section>
  );
}

function PropertyTabs({
  activeTab,
  onTabChange,
  property,
  propertySettlements,
  propertyTasks
}: {
  activeTab: OwnerPropertyTabKey;
  onTabChange: (tab: OwnerPropertyTabKey) => void;
  property: OwnerProperty;
  propertySettlements: OwnerPortalSnapshot["settlements"];
  propertyTasks: OwnerPortalSnapshot["tasks"];
}) {
  return (
    <div className="mt-5 flex flex-wrap gap-2 border-b border-line pb-3" role="tablist">
      {propertyTabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.key;
        const count = getPropertyTabCount(tab.key, property, propertyTasks, propertySettlements);
        return (
          <button
            aria-selected={isActive}
            className={
              "focus-ring inline-flex min-h-10 items-center gap-2 rounded-[6px] border px-3 text-sm font-semibold transition " +
              (isActive
                ? "border-green bg-green text-white"
                : "border-line bg-white text-midnight hover:border-green hover:text-green")
            }
            key={tab.key}
            onClick={() => onTabChange(tab.key)}
            role="tab"
            type="button"
          >
            <Icon aria-hidden className="h-4 w-4" />
            {tab.label}
            {count !== null ? (
              <span
                className={
                  "inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[0.68rem] " +
                  (isActive ? "bg-white/20 text-white" : "bg-ivory text-ink/58")
                }
              >
                {count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

function PropertySplitOverview({ contract }: { contract: OwnerProperty["contract"] }) {
  const split = getContractSplitTerms(contract);
  const validity = getContractValidityTerms(contract);

  return (
    <div className="rounded-[8px] border border-line bg-ivory p-4">
      <p className="text-xs font-semibold uppercase text-green">Participacion contractual</p>
      <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
        {split.map((term) => (
          <div className="rounded-[6px] border border-line bg-white px-3 py-2" key={term.label}>
            <dt className="text-xs font-semibold uppercase text-ink/48">{term.label}</dt>
            <dd className="mt-1 text-lg font-semibold text-midnight">{term.value}</dd>
          </div>
        ))}
      </dl>
      <dl className="mt-3 grid gap-3 border-t border-line pt-3 text-sm sm:grid-cols-2">
        {validity.map((term) => (
          <div className="rounded-[6px] border border-line bg-white px-3 py-2" key={term.label}>
            <dt className="text-xs font-semibold uppercase text-ink/48">{term.label}</dt>
            <dd className="mt-1 text-sm font-semibold leading-5 text-midnight">{term.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function getContractSplitTerms(contract: OwnerProperty["contract"]) {
  const ownerTerm = contract.terms.find((term) => {
    const label = term.label.toLowerCase();

    return label.includes("propietario") || label.includes("owner");
  });
  const kuqubaTerm = contract.terms.find((term) => term.label.toLowerCase().includes("kuquba"));

  return [
    { label: "Propietario", value: ownerTerm?.value ?? "Por definir" },
    { label: "KUQUBA", value: kuqubaTerm?.value ?? "Por definir" }
  ];
}

function getContractValidityTerms(contract: OwnerProperty["contract"]) {
  const terms = contract.terms.filter((term) => {
    const label = term.label.toLowerCase();

    return label.includes("vigencia") || label.includes("culminacion");
  });

  if (terms.length > 0) {
    return terms;
  }

  return [
    {
      label: "Vigencia",
      value: `${formatContractDate(contract.startsOn)} - ${
        contract.endsOn ? formatContractDate(contract.endsOn) : "Indefinida"
      }`
    },
    {
      label: "Culminacion",
      value: contract.endsOn ? formatContractDate(contract.endsOn) : "Indefinida"
    }
  ];
}
function PropertyPhotoGallery({ property }: { property: OwnerProperty }) {
  const photos = getPropertyPhotos(property);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [viewerPhotoIndex, setViewerPhotoIndex] = useState<number | null>(null);
  const activePhoto = photos[activePhotoIndex] ?? photos[0] ?? { alt: property.imageAlt, label: "Principal", src: property.image };
  const viewerPhoto = viewerPhotoIndex === null ? null : photos[viewerPhotoIndex];

  useEffect(() => {
    setActivePhotoIndex(0);
    setViewerPhotoIndex(null);
  }, [property.id]);

  useEffect(() => {
    if (viewerPhotoIndex === null) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setViewerPhotoIndex(null);
      }

      if (event.key === "ArrowLeft") {
        setViewerPhotoIndex((currentIndex) =>
          currentIndex === null ? currentIndex : (currentIndex - 1 + photos.length) % photos.length
        );
      }

      if (event.key === "ArrowRight") {
        setViewerPhotoIndex((currentIndex) =>
          currentIndex === null ? currentIndex : (currentIndex + 1) % photos.length
        );
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [photos.length, viewerPhotoIndex]);

  function openViewer(photoIndex: number) {
    setActivePhotoIndex(photoIndex);
    setViewerPhotoIndex(photoIndex);
  }

  function showViewerPhoto(nextIndex: number) {
    setViewerPhotoIndex((nextIndex + photos.length) % photos.length);
  }

  return (
    <section className="rounded-[8px] border border-line bg-ivory p-3">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
        <button
          aria-label={`Ampliar ${activePhoto.label}`}
          className="focus-ring group relative min-h-[320px] overflow-hidden rounded-[6px] bg-midnight text-left"
          onClick={() => openViewer(activePhotoIndex)}
          type="button"
        >
          <Image
            alt={activePhoto.alt}
            className="object-cover transition duration-300 group-hover:scale-[1.02]"
            fill
            sizes="(min-width: 1280px) 48vw, (min-width: 1024px) 60vw, 100vw"
            src={activePhoto.src}
          />
          <span
            className={
              "absolute left-4 top-4 rounded-full border px-3 py-1 text-xs font-semibold backdrop-blur " +
              propertyStatusClasses[property.status]
            }
          >
            {property.statusLabel}
          </span>
          <span className="absolute bottom-4 right-4 inline-flex items-center gap-2 rounded-full bg-midnight/80 px-3 py-2 text-xs font-semibold text-white shadow-soft backdrop-blur">
            <Maximize2 aria-hidden className="h-4 w-4" />
            Ampliar foto
          </span>
        </button>

        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
          {photos.map((photo, index) => {
            const isActive = index === activePhotoIndex;
            return (
              <button
                aria-pressed={isActive}
                className={
                  "focus-ring overflow-hidden rounded-[6px] border bg-white text-left transition " +
                  (isActive ? "border-green shadow-soft" : "border-line hover:border-green")
                }
                key={photo.src}
                onClick={() => setActivePhotoIndex(index)}
                type="button"
              >
                <div className="relative min-h-[104px] bg-midnight">
                  <Image
                    alt={photo.alt}
                    className="object-cover"
                    fill
                    sizes="(min-width: 1024px) 220px, 33vw"
                    src={photo.src}
                  />
                </div>
                <span className="block px-3 py-2 text-xs font-semibold text-midnight/72">
                  {photo.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {viewerPhoto ? (
        <div
          aria-label="Visor de fotos de propiedad"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-midnight/92 p-4 text-white"
          role="dialog"
        >
          <button
            aria-label="Cerrar visor"
            className="absolute inset-0 h-full w-full cursor-zoom-out"
            onClick={() => setViewerPhotoIndex(null)}
            type="button"
          />
          <div className="relative z-10 mx-auto flex h-full max-w-6xl flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase text-white/62">{property.name}</p>
                <p className="text-lg font-semibold">{viewerPhoto.label}</p>
              </div>
              <button
                aria-label="Cerrar"
                className="focus-ring inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/24 bg-white/10 text-white transition hover:bg-white/18"
                onClick={() => setViewerPhotoIndex(null)}
                type="button"
              >
                <X aria-hidden className="h-5 w-5" />
              </button>
            </div>

            <div className="relative min-h-0 flex-1 overflow-hidden rounded-[8px] bg-black/35">
              <Image
                alt={viewerPhoto.alt}
                className="object-contain"
                fill
                sizes="100vw"
                src={viewerPhoto.src}
              />
              {photos.length > 1 ? (
                <>
                  <button
                    aria-label="Foto anterior"
                    className="focus-ring absolute left-3 top-1/2 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/24 bg-white/12 text-white backdrop-blur transition hover:bg-white/22"
                    onClick={() => showViewerPhoto((viewerPhotoIndex ?? 0) - 1)}
                    type="button"
                  >
                    <ChevronLeft aria-hidden className="h-6 w-6" />
                  </button>
                  <button
                    aria-label="Foto siguiente"
                    className="focus-ring absolute right-3 top-1/2 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/24 bg-white/12 text-white backdrop-blur transition hover:bg-white/22"
                    onClick={() => showViewerPhoto((viewerPhotoIndex ?? 0) + 1)}
                    type="button"
                  >
                    <ChevronRight aria-hidden className="h-6 w-6" />
                  </button>
                </>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function getPropertyPhotos(property: OwnerProperty) {
  const location = property.location.toLowerCase();
  const supportingPhotos = location.includes("paredon")
    ? [
        { alt: "Playa del Pacifico para " + property.name, label: "Entorno", src: "/images/hero-pacific-beach.png" },
        { alt: "Operacion de " + property.name, label: "Operacion", src: "/images/owner-dashboard.png" }
      ]
    : [
        { alt: "Villa familiar en la costa", label: "Exterior", src: "/images/pacific-family-villa.png" },
        { alt: "Playa del Pacifico cercana", label: "Entorno", src: "/images/hero-pacific-beach.png" }
      ];
  const photos = [
    { alt: property.imageAlt, label: "Principal", src: property.image },
    ...supportingPhotos
  ];

  return photos.filter(
    (photo, index, allPhotos) => allPhotos.findIndex((candidate) => candidate.src === photo.src) === index
  );
}

function PropertyOverviewTab({ property }: { property: OwnerProperty }) {
  return (
    <div className="space-y-5">
      <PropertyPhotoGallery property={property} />

      <div className="grid gap-3 md:grid-cols-3">
        <PropertyFact icon={CalendarCheck2} label="Proxima llegada" value={property.nextArrival} />
        <PropertyFact icon={TrendingUp} label="Senal comercial" value={property.occupancySignal} />
        <PropertyFact icon={Wrench} label="Pendientes" value={String(property.openItems)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.45fr)]">
        <PropertySplitOverview contract={property.contract} />
        <div className="rounded-[8px] border border-line bg-ivory p-4">
          <p className="text-xs font-semibold uppercase text-green">Seguimiento</p>
          <p className="mt-2 text-sm leading-6 text-ink/64">{property.occupancySignal}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {[property.reviewLabel, ...property.highlights].map((item) => (
              <span
                className="rounded-full border border-line bg-white px-3 py-1 text-xs font-semibold text-midnight/72"
                key={item}
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
function PropertyReservationsTab({ reservations }: { reservations: OwnerProperty["reservations"] }) {
  if (reservations.length === 0) {
    return <EmptyPanel text="Sin reservas visibles para esta propiedad en el periodo." />;
  }

  return (
    <div className="overflow-x-auto rounded-[8px] border border-line">
      <table className="w-full min-w-[980px] border-collapse text-left text-xs">
        <thead className="bg-ivory text-ink/48">
          <tr>
            <th className="px-3 py-2 font-semibold uppercase">Codigo</th>
            <th className="px-3 py-2 font-semibold uppercase">Fechas</th>
            <th className="px-3 py-2 font-semibold uppercase">Huesped</th>
            <th className="px-3 py-2 font-semibold uppercase">Unidad</th>
            <th className="px-3 py-2 font-semibold uppercase">Estado</th>
            <th className="px-3 py-2 font-semibold uppercase">Pago huesped</th>
            <th className="px-3 py-2 font-semibold uppercase">Total reserva</th>
            <th className="px-3 py-2 font-semibold uppercase">Pago propietario</th>
            <th className="px-3 py-2 font-semibold uppercase">Corte</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line bg-white">
          {reservations.map((reservation) => (
            <tr key={reservation.id}>
              <td className="px-3 py-3 font-semibold text-midnight">{reservation.reservationCode}</td>
              <td className="px-3 py-3 text-ink/64">
                {formatShortDate(reservation.arrivalDate)} - {formatShortDate(reservation.departureDate)}
              </td>
              <td className="px-3 py-3 text-ink/64">{reservation.guestName}</td>
              <td className="px-3 py-3 text-ink/64">{reservation.unitName}</td>
              <td className="px-3 py-3 text-ink/64">{reservation.statusLabel}</td>
              <td className="px-3 py-3 text-ink/64">{reservation.paymentStatusLabel}</td>
              <td className="px-3 py-3 font-semibold text-midnight">
                {formatCurrency(reservation.total, reservation.currency)}
              </td>
              <td className="px-3 py-3">
                <p className="font-semibold text-midnight">{reservation.ownerPayment.amountLabel}</p>
                <p className="mt-1 text-[0.68rem] font-semibold uppercase text-green">
                  {reservation.ownerPayment.statusLabel}
                </p>
              </td>
              <td className="px-3 py-3 text-ink/64">
                <p className="font-semibold text-midnight">
                  {reservation.ownerPayment.settlementPeriodLabel ?? "Sin corte"}
                </p>
                <p className="mt-1 text-[0.68rem] text-ink/52">
                  {reservation.ownerPayment.paidAt
                    ? `Pagado ${formatShortDate(reservation.ownerPayment.paidAt)}`
                    : reservation.ownerPayment.settlementStatusLabel ?? "Pendiente"}
                </p>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PropertyBlocksTab({
  blockingPropertyId,
  onAvailabilityBlockRequest,
  property
}: {
  blockingPropertyId: string | null;
  onAvailabilityBlockRequest: (input: {
    endsOn: string;
    note: string;
    propertyId: string;
    startsOn: string;
    unitId: string;
  }) => void;
  property: OwnerProperty;
}) {
  const blocks = getSortedPropertyBlocks(property);
  const calendarUnits = buildOwnerCalendarUnits(property);
  const [suggestedBlockDates, setSuggestedBlockDates] = useState<SuggestedOwnerBlockDates | null>(null);

  useEffect(() => {
    setSuggestedBlockDates(null);
  }, [property.id]);

  function handleAvailableDaySelect(dateKey: string) {
    setSuggestedBlockDates({
      endsOn: toOwnerDateKey(addOwnerDays(parseOwnerDateOnly(dateKey), 1)),
      startsOn: dateKey
    });
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <OwnerOccupancyCalendar
          onAvailableDaySelect={handleAvailableDaySelect}
          selectedDate={suggestedBlockDates?.startsOn ?? null}
          units={calendarUnits}
        />
        <OwnerBlocksSummary blocks={blocks} />
      </div>

      <OwnerAvailabilityBlockForm
        isSubmitting={blockingPropertyId === property.id}
        onSubmit={onAvailabilityBlockRequest}
        property={property}
        suggestedDates={suggestedBlockDates}
      />
      <OwnerAvailabilityBlocksTable blocks={blocks} property={property} />
    </div>
  );
}
function PropertyFinanceTab({
  property,
  settlements
}: {
  property: OwnerProperty;
  settlements: OwnerPortalSnapshot["settlements"];
}) {
  return (
    <div className="space-y-5">
      <PropertyRevenuePanel property={property} />
      <div className="border-t border-line pt-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase text-green">Cortes de la propiedad</p>
            <h3 className="mt-1 text-lg font-semibold text-midnight">Historial financiero</h3>
          </div>
          <span className="w-fit rounded-full border border-line bg-ivory px-3 py-1 text-xs font-semibold text-midnight/72">
            {settlements.length} corte(s)
          </span>
        </div>

        {settlements.length > 0 ? (
          <div className="mt-4 grid gap-3">
            {settlements.map((settlement) => {
              const reservationLines = settlement.lineItems.filter((line) => line.reservationCode);

              return (
                <div className="rounded-[8px] border border-line bg-ivory p-4" key={settlement.id}>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-midnight">{settlement.periodLabel}</p>
                      <p className="mt-1 text-xs leading-5 text-ink/56">
                        {settlement.statusLabel} / Pagado {formatContractDate(settlement.paidAt)}
                      </p>
                    </div>
                    <p className="text-lg font-semibold text-midnight">{settlement.ownerPayoutLabel}</p>
                  </div>

                  {reservationLines.length > 0 ? (
                    <div className="mt-3 overflow-x-auto rounded-[6px] border border-line bg-white">
                      <table className="w-full min-w-[620px] border-collapse text-left text-xs">
                        <thead className="bg-ivory text-ink/48">
                          <tr>
                            <th className="px-3 py-2 font-semibold uppercase">Reserva</th>
                            <th className="px-3 py-2 font-semibold uppercase">Concepto</th>
                            <th className="px-3 py-2 font-semibold uppercase">Fecha</th>
                            <th className="px-3 py-2 text-right font-semibold uppercase">Monto</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-line">
                          {reservationLines.map((line) => (
                            <tr key={line.id}>
                              <td className="px-3 py-2 font-semibold text-midnight">{line.reservationCode}</td>
                              <td className="px-3 py-2 text-ink/64">{line.typeLabel}</td>
                              <td className="px-3 py-2 text-ink/64">{formatShortDate(line.occurredAt)}</td>
                              <td className="px-3 py-2 text-right font-semibold text-midnight">
                                {formatCurrency(line.amount, line.currency)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyPanel text="Aun no hay cortes historicos asociados a esta propiedad." />
        )}
      </div>
    </div>
  );
}

function PropertyOperationsTab({
  property,
  tasks
}: {
  property: OwnerProperty;
  tasks: OwnerPortalSnapshot["tasks"];
}) {
  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-3">
        {property.operations.map((operation) => (
          <div className="min-h-[96px] rounded-[8px] border border-line bg-ivory p-4" key={operation.label}>
            <p className="text-sm font-semibold text-midnight">{operation.label}</p>
            <p className="mt-2 text-sm leading-6 text-ink/62">{operation.state}</p>
          </div>
        ))}
      </div>

      <div className="border-t border-line pt-5">
        <p className="text-xs font-semibold uppercase text-green">Mantenimiento y acciones abiertas</p>
        {tasks.length > 0 ? (
          <div className="mt-3 divide-y divide-line rounded-[8px] border border-line bg-white px-4">
            {tasks.map((task) => (
              <div className="grid gap-3 py-4 md:grid-cols-[1fr_auto] md:items-center" key={task.id}>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold text-midnight">{task.title}</h3>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[0.7rem] font-semibold ${taskPriorityClasses[task.priority]}`}
                    >
                      {task.ownerAction ? "Accion propietario" : "KUQUBA"}
                    </span>
                  </div>
                  <p className="mt-1 text-sm leading-6 text-ink/62">{task.property}</p>
                </div>
                <p className="flex items-center gap-2 text-sm font-semibold text-midnight">
                  <Clock3 aria-hidden className="h-4 w-4 text-green" />
                  {task.due}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <EmptyPanel text="Sin pendientes operativos abiertos para esta propiedad." />
        )}
      </div>
    </div>
  );
}

function PropertyDocumentsTab({
  onContractAccept,
  property,
  updatingContractId
}: {
  onContractAccept: (contractId: string) => void;
  property: OwnerProperty;
  updatingContractId: string | null;
}) {
  return (
    <div className="rounded-[8px] border border-line bg-ivory p-4">
      <p className="text-xs font-semibold uppercase text-green">Contrato vigente</p>
      <PropertyContractPanel
        onContractAccept={onContractAccept}
        property={property}
        updatingContractId={updatingContractId}
      />
    </div>
  );
}

function PropertyRevenuePanel({ property }: { property: OwnerProperty }) {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      <FinanceFact
        detail={property.estimatedRevenue.label}
        label="Reservas confirmadas"
        value={property.estimatedRevenue.confirmedCount.toString()}
      />
      <FinanceFact
        detail="Antes de ajustes y liquidacion final"
        label="Ingreso bruto"
        value={formatCurrency(
          property.estimatedRevenue.grossConfirmed,
          property.estimatedRevenue.currency
        )}
      />
      <FinanceFact
        detail="Estimado para seguimiento del propietario"
        label="Saldo estimado"
        value={formatCurrency(
          property.estimatedRevenue.estimatedOwnerPayout,
          property.estimatedRevenue.currency
        )}
      />
    </div>
  );
}

function OwnerEmptyState() {
  return <EmptyPanel text="No hay propiedades asignadas a este propietario." />;
}

function OwnerOccupancyCalendar({
  onAvailableDaySelect,
  selectedDate,
  units
}: {
  onAvailableDaySelect: (dateKey: string) => void;
  selectedDate: string | null;
  units: OwnerCalendarUnit[];
}) {
  const months = buildOwnerCalendarMonths(units);
  const [visibleMonthIndex, setVisibleMonthIndex] = useState(0);
  const boundedMonthIndex = Math.min(visibleMonthIndex, Math.max(months.length - 1, 0));
  const visibleMonth = months[boundedMonthIndex] ?? null;

  useEffect(() => {
    setVisibleMonthIndex(0);
  }, [units]);

  return (
    <section className="rounded-[8px] border border-line bg-white p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase text-green">Calendario de disponibilidad</p>
          <h3 className="mt-1 text-lg font-semibold text-midnight">Ocupacion mensual</h3>
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-semibold text-ink/64">
          <OwnerCalendarLegendDot label="Confirmada" tone="confirmed" />
          <OwnerCalendarLegendDot label="Hold" tone="hold" />
          <OwnerCalendarLegendDot label="Propietario" tone="owner" />
          <OwnerCalendarLegendDot label="Operaciones" tone="ops" />
          <OwnerCalendarLegendDot label="Mantenimiento" tone="maintenance" />
          <span className="inline-flex items-center gap-2">
            <span className="h-3 w-3 rounded-sm border border-green/24 bg-white" />
            Libre
          </span>
        </div>
      </div>

      {units.length === 0 || !visibleMonth ? (
        <EmptyPanel text="No hay unidades para mostrar disponibilidad." />
      ) : (
        <>
          <div className="mt-4 flex items-center justify-between gap-3">
            <button
              className="focus-ring inline-flex min-h-9 items-center justify-center rounded-[6px] border border-line bg-white px-3 text-xs font-semibold text-midnight transition hover:border-green disabled:cursor-not-allowed disabled:opacity-45"
              disabled={boundedMonthIndex === 0}
              onClick={() => setVisibleMonthIndex((current) => Math.max(0, current - 1))}
              type="button"
            >
              Anterior
            </button>
            <span className="text-xs font-semibold text-ink/58">
              {boundedMonthIndex + 1} de {months.length}
            </span>
            <button
              className="focus-ring inline-flex min-h-9 items-center justify-center rounded-[6px] border border-line bg-white px-3 text-xs font-semibold text-midnight transition hover:border-green disabled:cursor-not-allowed disabled:opacity-45"
              disabled={boundedMonthIndex >= months.length - 1}
              onClick={() => setVisibleMonthIndex((current) => Math.min(months.length - 1, current + 1))}
              type="button"
            >
              Siguiente
            </button>
          </div>

          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {months.map((month, index) => (
              <button
                className={
                  "focus-ring min-h-9 shrink-0 rounded-[6px] border px-3 text-xs font-semibold capitalize transition " +
                  (index === boundedMonthIndex
                    ? "border-green bg-green text-white"
                    : "border-line bg-white text-midnight hover:border-green hover:text-green")
                }
                key={month.key}
                onClick={() => setVisibleMonthIndex(index)}
                type="button"
              >
                {formatOwnerCompactMonthTitle(month.key)}
              </button>
            ))}
          </div>

          <section className="mt-3 rounded-[8px] border border-line bg-white/80 p-3 shadow-[0_10px_30px_rgba(13,34,51,0.04)]">
            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-sm font-semibold capitalize text-midnight">{visibleMonth.label}</h3>
              <span className="w-fit rounded-full bg-green/10 px-2.5 py-1 text-[0.68rem] font-semibold text-green">
                {visibleMonth.availableDays} libre{visibleMonth.availableDays === 1 ? "" : "s"}
              </span>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center text-[0.65rem] font-semibold uppercase text-ink/45">
              {ownerCalendarWeekdays.map((weekday) => (
                <span key={`${visibleMonth.key}-${weekday}`}>{weekday}</span>
              ))}
            </div>

            <div className="mt-1.5 grid grid-cols-7 gap-1.5">
              {Array.from({ length: visibleMonth.leadingBlanks }, (_, index) => (
                <span
                  aria-hidden
                  className="aspect-square min-h-16 rounded-[6px] border border-transparent"
                  key={`${visibleMonth.key}-blank-${index}`}
                />
              ))}

              {visibleMonth.days.map((day) => {
                const primaryEvent = getPrimaryOwnerCalendarEvent(day.events);
                const title = day.events.map((event) => `${event.label} / ${event.unitName} / ${event.requester}`).join(" | ") || "Libre";

                return (
                  <button
                    aria-label={`${formatFullOwnerDate(day.key)}: ${title}`}
                    aria-pressed={day.key === selectedDate}
                    className={
                      "focus-ring min-h-16 rounded-[6px] border p-2 text-left text-xs transition disabled:cursor-not-allowed " +
                      getOwnerCalendarDayClasses(primaryEvent, day.key === selectedDate)
                    }
                    disabled={primaryEvent !== null}
                    key={day.key}
                    onClick={() => onAvailableDaySelect(day.key)}
                    title={title}
                    type="button"
                  >
                    <p className="font-semibold">{formatOwnerDayNumber(day.key)}</p>
                    {primaryEvent ? (
                      <p className="mt-2 max-h-8 overflow-hidden text-[0.68rem] font-semibold leading-4">
                        {primaryEvent.label}
                      </p>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </section>
        </>
      )}
    </section>
  );
}
function OwnerCalendarLegendDot({ label, tone }: { label: string; tone: OwnerCalendarEventTone }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className={`h-3 w-3 rounded-sm ${ownerCalendarToneClass(tone)}`} />
      {label}
    </span>
  );
}

function OwnerBlocksSummary({ blocks }: { blocks: OwnerProperty["requestedBlocks"] }) {
  const ownerBlocks = blocks.filter((block) => block.reason === "OWNER_HOLD").length;
  const operationsBlocks = blocks.length - ownerBlocks;
  const nextBlock = blocks.find((block) => parseOwnerDateOnly(block.endsOn) >= getTodayUtc()) ?? null;

  return (
    <aside className="rounded-[8px] border border-line bg-ivory p-4">
      <p className="text-xs font-semibold uppercase text-green">Estado de bloqueos</p>
      <dl className="mt-3 grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
        <BlockingSummaryFact label="Bloqueos visibles" value={String(blocks.length)} />
        <BlockingSummaryFact label="Propietario" value={String(ownerBlocks)} />
        <BlockingSummaryFact label="Operaciones" value={String(operationsBlocks)} />
      </dl>
      <div className="mt-3 rounded-[6px] border border-line bg-white p-3">
        <p className="text-xs font-semibold uppercase text-ink/48">Proxima ocupacion bloqueada</p>
        <p className="mt-2 text-sm font-semibold text-midnight">
          {nextBlock
            ? `${formatShortDate(nextBlock.startsOn)} - ${formatShortDate(nextBlock.endsOn)}`
            : "Sin bloqueos futuros"}
        </p>
      </div>
    </aside>
  );
}

function BlockingSummaryFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[6px] border border-line bg-white px-3 py-2">
      <dt className="text-xs font-semibold uppercase text-ink/48">{label}</dt>
      <dd className="mt-1 text-lg font-semibold text-midnight">{value}</dd>
    </div>
  );
}

function OwnerAvailabilityBlocksTable({
  blocks,
  property
}: {
  blocks: OwnerProperty["requestedBlocks"];
  property: OwnerProperty;
}) {
  if (blocks.length === 0) {
    return <EmptyPanel text="Sin bloqueos activos o solicitados para esta propiedad." />;
  }

  return (
    <section className="rounded-[8px] border border-line bg-white p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase text-green">Registro</p>
          <h3 className="mt-1 text-lg font-semibold text-midnight">Bloqueos de disponibilidad</h3>
        </div>
        <span className="w-fit rounded-full border border-line bg-ivory px-3 py-1 text-xs font-semibold text-midnight/72">
          {blocks.length} bloqueo(s)
        </span>
      </div>
      <div className="mt-4 overflow-x-auto rounded-[6px] border border-line">
        <table className="w-full min-w-[760px] border-collapse text-left text-xs">
          <thead className="bg-ivory text-ink/48">
            <tr>
              <th className="px-3 py-2 font-semibold uppercase">Fechas</th>
              <th className="px-3 py-2 font-semibold uppercase">Unidad</th>
              <th className="px-3 py-2 font-semibold uppercase">Tipo</th>
              <th className="px-3 py-2 font-semibold uppercase">Solicitado por</th>
              <th className="px-3 py-2 font-semibold uppercase">Nota</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line bg-white">
            {blocks.map((block) => (
              <tr key={block.id}>
                <td className="px-3 py-3 font-semibold text-midnight">
                  {formatShortDate(block.startsOn)} - {formatShortDate(block.endsOn)}
                </td>
                <td className="px-3 py-3 text-ink/64">{getPropertyUnitName(property, block.unitId)}</td>
                <td className="px-3 py-3">
                  <span className={`inline-flex rounded-full px-2 py-1 font-semibold ${ownerCalendarToneClass(getBlockTone(block.reason))}`}>
                    {block.reasonLabel}
                  </span>
                </td>
                <td className="px-3 py-3 text-ink/64">{getBlockRequesterLabel(block.reason)}</td>
                <td className="px-3 py-3 text-ink/64">{block.note ?? "Sin nota"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
function getSortedPropertyBlocks(property: OwnerProperty) {
  return [...property.requestedBlocks].sort(
    (left, right) => parseOwnerDateOnly(left.startsOn).getTime() - parseOwnerDateOnly(right.startsOn).getTime()
  );
}

const ownerCalendarWeekdays = ["Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"];

function buildOwnerCalendarMonths(units: OwnerCalendarUnit[]) {
  const monthStart = getOwnerMonthStart(getTodayUtc());

  return Array.from({ length: 3 }, (_, monthIndex) => {
    const currentMonthStart = addOwnerMonths(monthStart, monthIndex);
    const monthKey = currentMonthStart.toISOString().slice(0, 7);
    const days = Array.from({ length: getOwnerDaysInMonth(currentMonthStart) }, (_, dayIndex) => {
      const date = addOwnerDays(currentMonthStart, dayIndex);
      const key = toOwnerDateKey(date);
      const events = units.flatMap((unit) =>
        unit.events.filter((event) => ownerEventOverlapsDay(event, date))
      );

      return { date, events, key } satisfies OwnerCalendarDay;
    });

    return {
      availableDays: days.filter((day) => day.events.length === 0).length,
      days,
      key: monthKey,
      label: formatOwnerMonthTitle(monthKey),
      leadingBlanks: getOwnerMondayFirstWeekdayIndex(toOwnerDateKey(currentMonthStart))
    } satisfies OwnerCalendarMonth;
  });
}
function buildOwnerCalendarUnits(property: OwnerProperty) {
  const units = new Map<string, OwnerCalendarUnit>();

  for (const unit of property.units) {
    ensureOwnerCalendarUnit(units, unit.id, unit.name);
  }

  for (const reservation of property.reservations) {
    if (!["HOLD", "PENDING_PAYMENT", "CONFIRMED"].includes(reservation.status)) {
      continue;
    }

    const unit = property.units.find((candidate) => candidate.name === reservation.unitName);
    const unitKey = unit?.id ?? reservation.unitName;
    const calendarUnit = ensureOwnerCalendarUnit(units, unitKey, reservation.unitName);
    calendarUnit.events.push({
      endsOn: reservation.departureDate,
      id: reservation.id,
      label: reservation.statusLabel,
      requester: "Huesped",
      startsOn: reservation.arrivalDate,
      tone:
        reservation.status === "CONFIRMED"
          ? "confirmed"
          : reservation.status === "PENDING_PAYMENT"
            ? "pending"
            : "hold",
      type: "reservation",
      unitName: reservation.unitName
    });
  }

  for (const block of property.requestedBlocks) {
    const unitName = getPropertyUnitName(property, block.unitId);
    const calendarUnit = ensureOwnerCalendarUnit(units, block.unitId, unitName);
    calendarUnit.events.push({
      endsOn: block.endsOn,
      id: block.id,
      label: block.reasonLabel,
      requester: getBlockRequesterLabel(block.reason),
      startsOn: block.startsOn,
      tone: getBlockTone(block.reason),
      type: "block",
      unitName
    });
  }

  return Array.from(units.values()).sort((left, right) => left.unitName.localeCompare(right.unitName));
}

function ensureOwnerCalendarUnit(
  units: Map<string, OwnerCalendarUnit>,
  key: string,
  unitName: string
) {
  const existing = units.get(key);
  if (existing) {
    return existing;
  }

  const unit = { events: [], key, unitName } satisfies OwnerCalendarUnit;
  units.set(key, unit);
  return unit;
}

function ownerEventOverlapsDay(event: OwnerCalendarEvent, date: Date) {
  const startsOn = parseOwnerDateOnly(event.startsOn).getTime();
  const endsOn = parseOwnerDateOnly(event.endsOn).getTime();
  const day = date.getTime();
  return day >= startsOn && day < endsOn;
}

function getPropertyUnitName(property: OwnerProperty, unitId: string) {
  return property.units.find((unit) => unit.id === unitId)?.name ?? "Unidad asignada";
}

function getBlockRequesterLabel(reason: string) {
  return reason === "OWNER_HOLD" ? "Propietario" : "Operaciones";
}

function getBlockTone(reason: string): OwnerCalendarEventTone {
  if (reason === "MAINTENANCE") return "maintenance";
  if (reason === "OPS_HOLD") return "ops";
  return "owner";
}

function ownerCalendarToneClass(tone: OwnerCalendarEventTone) {
  const classes: Record<OwnerCalendarEventTone, string> = {
    confirmed: "bg-green/90 text-white",
    hold: "bg-[#f0b35a] text-midnight",
    maintenance: "bg-terracotta/85 text-white",
    ops: "bg-midnight/85 text-white",
    owner: "bg-[#7c3aed] text-white",
    pending: "bg-[#d7c36a] text-midnight"
  };

  return classes[tone];
}

function getPrimaryOwnerCalendarEvent(events: OwnerCalendarEvent[]) {
  return events[0] ?? null;
}

function getOwnerCalendarDayClasses(event: OwnerCalendarEvent | null, isSelected: boolean) {
  if (isSelected) {
    return "border-green bg-green text-white shadow-sm";
  }

  if (!event) {
    return "border-green/24 bg-white text-green hover:border-green hover:bg-green/10";
  }

  if (event.tone === "confirmed") {
    return "border-green/24 bg-green/10 text-green";
  }

  if (event.tone === "hold" || event.tone === "pending") {
    return "border-[#f0b35a]/35 bg-[#f0b35a]/16 text-midnight";
  }

  if (event.tone === "maintenance") {
    return "border-terracotta/28 bg-terracotta/10 text-terracotta";
  }

  if (event.tone === "ops") {
    return "border-midnight/18 bg-midnight/10 text-midnight";
  }

  return "border-[#7c3aed]/50 bg-[#ede9fe] text-[#5b21b6]";
}

function getOwnerMonthStart(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function addOwnerMonths(date: Date, months: number) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1));
}

function getOwnerDaysInMonth(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
}

function getOwnerMondayFirstWeekdayIndex(value: string) {
  const weekday = new Date(`${value}T00:00:00.000Z`).getUTCDay();
  return (weekday + 6) % 7;
}

function formatOwnerMonthTitle(value: string) {
  return new Intl.DateTimeFormat("es-GT", {
    month: "long",
    timeZone: "UTC",
    year: "numeric"
  }).format(new Date(`${value}-01T00:00:00.000Z`));
}

function formatOwnerCompactMonthTitle(value: string) {
  return new Intl.DateTimeFormat("es-GT", {
    month: "short",
    timeZone: "UTC"
  }).format(new Date(`${value}-01T00:00:00.000Z`));
}

function formatOwnerDayNumber(value: string) {
  return new Intl.DateTimeFormat("es-GT", {
    day: "2-digit",
    timeZone: "UTC"
  }).format(new Date(`${value}T00:00:00.000Z`));
}

function formatFullOwnerDate(value: string) {
  return new Intl.DateTimeFormat("es-GT", {
    dateStyle: "full",
    timeZone: "UTC"
  }).format(new Date(`${value}T00:00:00.000Z`));
}
function parseOwnerDateOnly(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

function addOwnerDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setUTCDate(nextDate.getUTCDate() + days);
  return nextDate;
}

function getTodayUtc() {
  const today = new Date();
  return new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
}

function toOwnerDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}
function EmptyPanel({ text }: { text: string }) {
  return (
    <div className="rounded-[8px] border border-line bg-ivory p-5 text-sm leading-6 text-ink/64">
      {text}
    </div>
  );
}

function getPropertyTasks(snapshot: OwnerPortalSnapshot, property: OwnerProperty) {
  return snapshot.tasks.filter((task) => task.property === property.name);
}

function getPropertySettlements(snapshot: OwnerPortalSnapshot, property: OwnerProperty) {
  return snapshot.settlements.filter((settlement) => settlement.propertyName === property.name);
}

function getPropertyTabCount(
  tab: OwnerPropertyTabKey,
  property: OwnerProperty,
  tasks: OwnerPortalSnapshot["tasks"],
  settlements: OwnerPortalSnapshot["settlements"]
) {
  if (tab === "overview") return null;
  if (tab === "reservations") return property.reservations.length;
  if (tab === "blocks") return property.requestedBlocks.length;
  if (tab === "finance") return settlements.length;
  if (tab === "operations") return tasks.length;
  return property.contract.versions.length;
}
function OwnerAvailabilityBlockForm({
  isSubmitting,
  onSubmit,
  property,
  suggestedDates
}: {
  isSubmitting: boolean;
  onSubmit: (input: {
    endsOn: string;
    note: string;
    propertyId: string;
    startsOn: string;
    unitId: string;
  }) => void;
  property: OwnerProperty;
  suggestedDates: SuggestedOwnerBlockDates | null;
}) {
  const defaultUnitId = property.units[0]?.id ?? "";
  const [startsOn, setStartsOn] = useState("");
  const [endsOn, setEndsOn] = useState("");
  const [note, setNote] = useState("");
  const [unitId, setUnitId] = useState(defaultUnitId);

  useEffect(() => {
    setStartsOn("");
    setEndsOn("");
    setNote("");
    setUnitId(defaultUnitId);
  }, [defaultUnitId, property.id]);

  useEffect(() => {
    if (!suggestedDates) {
      return;
    }

    setStartsOn(suggestedDates.startsOn);
    setEndsOn(suggestedDates.endsOn);
  }, [suggestedDates]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit({ endsOn, note, propertyId: property.id, startsOn, unitId });
  }

  return (
    <form className="rounded-[8px] border border-line bg-white p-4" onSubmit={handleSubmit}>
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase text-green">Crear bloqueo</p>
          <h3 className="mt-1 text-lg font-semibold text-midnight">Solicitar nuevas fechas bloqueadas</h3>
          <p className="mt-1 text-sm leading-6 text-ink/62">
            Se audita contra reservas y bloqueos existentes antes de registrar la solicitud.
          </p>
        </div>
        <button
          className="focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-[6px] bg-green px-4 text-sm font-semibold text-white transition hover:bg-[#0f5c50] disabled:cursor-not-allowed disabled:opacity-55"
          disabled={isSubmitting || !startsOn || !endsOn || !unitId}
          type="submit"
        >
          <CalendarCheck2 aria-hidden className="h-4 w-4" />
          {isSubmitting ? "Solicitando" : "Solicitar bloqueo"}
        </button>
      </div>
      <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(160px,0.8fr)_minmax(150px,0.7fr)_minmax(150px,0.7fr)_minmax(220px,1fr)]">
        <label className="text-xs font-semibold uppercase text-ink/48">
          Unidad
          <select
            className="focus-ring mt-2 min-h-11 w-full rounded-[6px] border border-line bg-white px-3 text-sm normal-case text-midnight"
            onChange={(event) => setUnitId(event.target.value)}
            value={unitId}
          >
            {property.units.map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-semibold uppercase text-ink/48">
          Inicio
          <input
            className="focus-ring mt-2 min-h-11 w-full rounded-[6px] border border-line bg-white px-3 text-sm normal-case text-midnight"
            onChange={(event) => setStartsOn(event.target.value)}
            type="date"
            value={startsOn}
          />
        </label>
        <label className="text-xs font-semibold uppercase text-ink/48">
          Fin
          <input
            className="focus-ring mt-2 min-h-11 w-full rounded-[6px] border border-line bg-white px-3 text-sm normal-case text-midnight"
            min={startsOn || undefined}
            onChange={(event) => setEndsOn(event.target.value)}
            type="date"
            value={endsOn}
          />
        </label>
        <label className="text-xs font-semibold uppercase text-ink/48">
          Nota
          <input
            className="focus-ring mt-2 min-h-11 w-full rounded-[6px] border border-line bg-white px-3 text-sm normal-case text-midnight"
            onChange={(event) => setNote(event.target.value)}
            placeholder="Motivo visible para operaciones"
            value={note}
          />
        </label>
      </div>
    </form>
  );
}
function PropertyContractPanel({
  onContractAccept,
  property,
  updatingContractId
}: {
  onContractAccept: (contractId: string) => void;
  property: OwnerProperty;
  updatingContractId: string | null;
}) {
  const contract = property.contract;
  const isUpdating = updatingContractId === contract.id;

  return (
    <div className="mt-5 border-t border-line pt-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <FileText aria-hidden className="h-4 w-4 text-green" />
            <p className="text-sm font-semibold text-midnight">
              {contract.title ?? `Contrato version ${contract.currentVersion}`}
            </p>
            <span className="rounded-full border border-line bg-ivory px-2 py-0.5 text-[0.7rem] font-semibold text-midnight/72">
              {contract.statusLabel}
            </span>
          </div>
          {contract.summary ? (
            <p className="mt-2 text-sm leading-6 text-ink/62">{contract.summary}</p>
          ) : null}
        </div>

        {contract.canAcceptDev ? (
          <button
            className="focus-ring inline-flex min-h-10 w-fit items-center justify-center gap-2 rounded-[6px] bg-green px-4 text-sm font-semibold text-white transition hover:bg-[#0f5c50] disabled:cursor-not-allowed disabled:opacity-55"
            disabled={isUpdating}
            onClick={() => onContractAccept(contract.id)}
            type="button"
          >
            <CheckCircle2 aria-hidden className="h-4 w-4" />
            {isUpdating ? "Aceptando" : "Aceptar contrato"}
          </button>
        ) : null}
      </div>

      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
        {contract.terms.map((term) => (
          <div className="rounded-[6px] border border-line bg-ivory px-3 py-2" key={term.label}>
            <dt className="text-xs font-semibold uppercase text-ink/48">{term.label}</dt>
            <dd className="mt-1 font-semibold text-midnight">{term.value}</dd>
          </div>
        ))}
      </dl>

      <p className="mt-3 text-xs leading-5 text-ink/56">
        Version {contract.currentVersion} - Emitido {formatContractDate(contract.issuedAt)} -
        Firmado {formatContractDate(contract.signedAt)}
      </p>
      {contract.signatureProviderRef ? (
        <p className="mt-1 text-xs leading-5 text-ink/56">
          Referencia: {contract.signatureProviderRef}
        </p>
      ) : null}
    </div>
  );
}

function PropertyFact({
  icon: Icon,
  label,
  value
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="min-h-[76px] rounded-[6px] border border-line p-3">
      <dt className="flex items-center gap-2 text-xs font-semibold uppercase text-ink/48">
        <Icon aria-hidden className="h-4 w-4 text-green" />
        {label}
      </dt>
      <dd className="mt-2 text-sm font-semibold text-midnight">{value}</dd>
    </div>
  );
}

function FinanceFact({ detail, label, value }: { detail: string; label: string; value: string }) {
  return (
    <div className="min-h-[118px] rounded-[6px] border border-line bg-ivory p-4">
      <p className="text-xs font-semibold uppercase text-ink/48">{label}</p>
      <p className="mt-2 break-words text-xl font-semibold text-midnight">{value}</p>
      <p className="mt-2 text-xs leading-5 text-ink/56">{detail}</p>
    </div>
  );
}

function AccessState({ isValidating }: { isValidating: boolean }) {
  return (
    <section className="rounded-[8px] border border-line bg-white p-8 text-center shadow-soft">
      <ShieldCheck aria-hidden className="mx-auto h-10 w-10 text-green" />
      <h2 className="mt-4 text-xl font-semibold text-midnight">
        {isValidating ? "Validando sesion de propietario" : "Acceso de propietario requerido"}
      </h2>
      <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-ink/68">
        {isValidating
          ? "La API esta confirmando permisos antes de mostrar propiedades asignadas."
          : "El portfolio se carga solamente con una sesion vigente de propietario."}
      </p>
      {!isValidating ? (
        <a
          className="focus-ring mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-[6px] bg-green px-5 text-sm font-semibold text-white transition hover:bg-[#0f5c50]"
          href="/owner"
        >
          <ShieldCheck aria-hidden className="h-4 w-4" />
          Entrar al portal
        </a>
      ) : null}
    </section>
  );
}

function PortalLoadState({ error, isLoading }: { error: string | null; isLoading: boolean }) {
  return (
    <section className="rounded-[8px] border border-line bg-white p-8 text-center shadow-soft">
      <ShieldCheck aria-hidden className="mx-auto h-10 w-10 text-green" />
      <h2 className="mt-4 text-xl font-semibold text-midnight">
        {isLoading ? "Cargando datos de propietario" : "No se pudo cargar el portal"}
      </h2>
      <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-ink/68">
        {isLoading
          ? "La API esta preparando propiedades asignadas, tareas y documentos."
          : `La API respondio: ${error ?? "portal_load_failed"}.`}
      </p>
    </section>
  );
}

function SectionHeading({
  eyebrow,
  title,
  value
}: {
  eyebrow: string;
  title: string;
  value: string;
}) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div>
        <p className="text-xs font-semibold uppercase text-green">{eyebrow}</p>
        <h2 className="mt-1 text-xl font-semibold text-midnight">{title}</h2>
      </div>
      <span className="inline-flex w-fit items-center rounded-full border border-line bg-ivory px-3 py-1 text-xs font-semibold text-midnight/72">
        {value}
      </span>
    </div>
  );
}

function SessionRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-line pb-3 last:border-b-0 last:pb-0">
      <dt className="text-ink/54">{label}</dt>
      <dd className="text-right font-semibold text-midnight">{value}</dd>
    </div>
  );
}

async function requestOwnerAvailabilityBlock(
  input: { endsOn: string; note: string; propertyId: string; startsOn: string; unitId: string },
  sessionToken: string
): Promise<OwnerAvailabilityBlockResponse> {
  const response = await fetch(`${getDevPortalApiBaseUrl()}/api/owner/availability-blocks`, {
    body: JSON.stringify(input),
    headers: {
      "content-type": "application/json",
      "x-kuquba-dev-session": sessionToken
    },
    method: "POST"
  });

  const payload = (await response.json().catch(() => ({}))) as OwnerAvailabilityBlockResponse & {
    error?: string;
  };

  if (!response.ok) {
    throw new Error(payload.error ?? "owner_availability_block_failed");
  }

  return payload;
}
async function acceptOwnerContract(
  contractId: string,
  sessionToken: string
): Promise<OwnerContractAcceptResponse> {
  const response = await fetch(
    `${getDevPortalApiBaseUrl()}/api/owner/contracts/${contractId}/accept-dev`,
    {
      headers: {
        "content-type": "application/json",
        "x-kuquba-dev-session": sessionToken
      },
      method: "POST"
    }
  );

  const payload = (await response.json().catch(() => ({}))) as OwnerContractAcceptResponse & {
    error?: string;
  };

  if (!response.ok) {
    throw new Error(payload.error ?? "owner_contract_accept_failed");
  }

  return payload;
}

function formatCurrency(amount: string, currency: string) {
  return new Intl.NumberFormat("es-GT", {
    currency,
    style: "currency"
  }).format(Number(amount));
}

function parseDisplayDate(value: string) {
  return new Date(value.includes("T") ? value : `${value}T00:00:00.000Z`);
}

function formatShortDate(value?: string | null) {
  if (!value) {
    return "Pendiente";
  }

  return parseDisplayDate(value).toLocaleDateString("es-GT", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
    year: "numeric"
  });
}

function formatContractDate(value?: string | null) {
  if (!value) {
    return "Pendiente";
  }

  return parseDisplayDate(value).toLocaleDateString("es-GT", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
    year: "numeric"
  });
}
function formatSessionExpiry(value: string) {
  return new Date(value).toLocaleString("es-GT", {
    dateStyle: "medium",
    timeStyle: "short"
  });
}
