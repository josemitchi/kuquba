"use client";

import {
  ArrowLeft,
  BadgeCheck,
  Building2,
  CalendarCheck2,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  Clock3,
  FileText,
  KeyRound,
  LogOut,
  MapPin,
  ShieldCheck,
  TrendingUp,
  UserRound,
  Wrench,
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

const metricIcons: LucideIcon[] = [Building2, CalendarCheck2, ClipboardCheck, FileText, TrendingUp];
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

type OwnerModuleKey = "properties" | "reservations" | "finance" | "blocks" | "documents";

const ownerModules: Array<{ icon: LucideIcon; key: OwnerModuleKey; label: string }> = [
  { icon: Building2, key: "properties", label: "Propiedades" },
  { icon: CalendarCheck2, key: "reservations", label: "Reservas" },
  { icon: TrendingUp, key: "finance", label: "Finanzas" },
  { icon: Wrench, key: "blocks", label: "Bloqueos" },
  { icon: FileText, key: "documents", label: "Documentos" }
];

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
        <div className="container-shell py-8">
          <div className="max-w-4xl">
            <p className="inline-flex items-center gap-2 rounded-full border border-green/20 bg-green/10 px-4 py-2 text-sm font-semibold text-green">
              <Building2 aria-hidden className="h-4 w-4" />
              Propietarios
            </p>
            <h1 className="mt-5 font-display text-4xl leading-tight text-midnight md:text-5xl">
              Portfolio y operacion de propiedades
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-ink/72">
              {portal?.summary ?? protectedPortalSummary}
            </p>
          </div>
        </div>
      </section>

      <section className="container-shell py-8">
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
  const [activeModule, setActiveModule] = useState<OwnerModuleKey>("properties");
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(
    snapshot.properties[0]?.id ?? null
  );
  const selectedProperty =
    snapshot.properties.find((property) => property.id === selectedPropertyId) ??
    snapshot.properties[0] ??
    null;

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {snapshot.metrics.map((metric, index) => (
          <MetricCard icon={metricIcons[index] ?? BadgeCheck} key={metric.label} metric={metric} />
        ))}
      </div>

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

      <div className="mt-8 grid gap-8 xl:grid-cols-[260px_minmax(0,1fr)] xl:items-start">
        <aside className="space-y-5">
          <OwnerModuleNav
            activeModule={activeModule}
            onSelect={setActiveModule}
            snapshot={snapshot}
          />
          <OwnerIdentityCard session={session} snapshot={snapshot} />
        </aside>

        <div className="min-w-0">
          {activeModule === "properties" ? (
            <PropertiesModule
              onSelectProperty={setSelectedPropertyId}
              selectedProperty={selectedProperty}
              selectedPropertyId={selectedProperty?.id ?? null}
              snapshot={snapshot}
            />
          ) : null}

          {activeModule === "reservations" ? <ReservationsModule snapshot={snapshot} /> : null}

          {activeModule === "finance" ? <SettlementPanel snapshot={snapshot} /> : null}

          {activeModule === "blocks" ? (
            <BlocksModule
              blockingPropertyId={blockingPropertyId}
              onAvailabilityBlockRequest={onAvailabilityBlockRequest}
              snapshot={snapshot}
            />
          ) : null}

          {activeModule === "documents" ? (
            <DocumentsModule
              onContractAccept={onContractAccept}
              snapshot={snapshot}
              updatingContractId={updatingContractId}
            />
          ) : null}
        </div>
      </div>
    </>
  );
}

function OwnerModuleNav({
  activeModule,
  onSelect,
  snapshot
}: {
  activeModule: OwnerModuleKey;
  onSelect: (module: OwnerModuleKey) => void;
  snapshot: OwnerPortalSnapshot;
}) {
  return (
    <nav
      aria-label="Modulos del propietario"
      className="rounded-[8px] border border-line bg-white p-2 shadow-soft"
    >
      <div className="grid gap-1 sm:grid-cols-5 xl:grid-cols-1">
        {ownerModules.map((module) => {
          const Icon = module.icon;
          const isActive = activeModule === module.key;
          return (
            <button
              aria-current={isActive ? "page" : undefined}
              className={
                "focus-ring flex min-h-11 items-center justify-between gap-3 rounded-[6px] px-3 text-sm font-semibold transition " +
                (isActive ? "bg-green text-white" : "text-midnight hover:bg-ivory hover:text-green")
              }
              key={module.key}
              onClick={() => onSelect(module.key)}
              type="button"
            >
              <span className="inline-flex items-center gap-2">
                <Icon aria-hidden className="h-4 w-4" />
                {module.label}
              </span>
              <span
                className={
                  "rounded-full px-2 py-0.5 text-[0.68rem] " +
                  (isActive ? "bg-white/20" : "bg-ivory text-ink/58")
                }
              >
                {getOwnerModuleCount(module.key, snapshot)}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function getOwnerModuleCount(module: OwnerModuleKey, snapshot: OwnerPortalSnapshot) {
  if (module === "properties") return snapshot.properties.length;
  if (module === "reservations") return snapshot.reservations.length;
  if (module === "finance") return snapshot.financeSummary.lineCount;
  if (module === "blocks")
    return snapshot.properties.reduce(
      (total, property) => total + property.requestedBlocks.length,
      0
    );
  return snapshot.properties.length;
}

function PropertiesModule({
  onSelectProperty,
  selectedProperty,
  selectedPropertyId,
  snapshot
}: {
  onSelectProperty: (propertyId: string) => void;
  selectedProperty: OwnerProperty | null;
  selectedPropertyId: string | null;
  snapshot: OwnerPortalSnapshot;
}) {
  return (
    <div className="space-y-6">
      <section>
        <SectionHeading
          eyebrow={snapshot.periodLabel}
          title="Propiedades asignadas"
          value={String(snapshot.properties.length) + " activas o en activacion"}
        />
        <div className="mt-5 grid gap-4">
          {snapshot.properties.map((property) => (
            <PropertyCard
              isSelected={property.id === selectedPropertyId}
              key={property.id}
              onSelect={onSelectProperty}
              property={property}
            />
          ))}
        </div>
      </section>

      {selectedProperty ? <PropertySummaryPanel property={selectedProperty} /> : null}
      <TasksPanel snapshot={snapshot} />
    </div>
  );
}

function ReservationsModule({ snapshot }: { snapshot: OwnerPortalSnapshot }) {
  return (
    <div className="space-y-6">
      <section className="rounded-[8px] border border-line bg-white p-6 shadow-soft">
        <SectionHeading
          eyebrow={snapshot.periodLabel}
          title="Reservas"
          value={String(snapshot.reservations.length) + " registro(s)"}
        />
        {snapshot.reservations.length === 0 ? (
          <p className="mt-5 text-sm leading-6 text-ink/62">
            Sin reservas visibles para tus propiedades.
          </p>
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-left text-xs">
              <thead className="bg-ivory text-ink/48">
                <tr>
                  <th className="px-3 py-2 font-semibold uppercase">Codigo</th>
                  <th className="px-3 py-2 font-semibold uppercase">Propiedad</th>
                  <th className="px-3 py-2 font-semibold uppercase">Fechas</th>
                  <th className="px-3 py-2 font-semibold uppercase">Huesped</th>
                  <th className="px-3 py-2 font-semibold uppercase">Estado</th>
                  <th className="px-3 py-2 font-semibold uppercase">Pago</th>
                  <th className="px-3 py-2 font-semibold uppercase">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {snapshot.reservations.map((reservation) => (
                  <tr key={reservation.id}>
                    <td className="px-3 py-3 font-semibold text-midnight">
                      {reservation.reservationCode}
                    </td>
                    <td className="px-3 py-3 text-ink/64">{reservation.propertyName}</td>
                    <td className="px-3 py-3 text-ink/64">
                      {formatShortDate(reservation.arrivalDate)} -{" "}
                      {formatShortDate(reservation.departureDate)}
                    </td>
                    <td className="px-3 py-3 text-ink/64">{reservation.guestName}</td>
                    <td className="px-3 py-3 text-ink/64">{reservation.statusLabel}</td>
                    <td className="px-3 py-3 text-ink/64">{reservation.paymentStatusLabel}</td>
                    <td className="px-3 py-3 font-semibold text-midnight">
                      {formatCurrency(reservation.total, reservation.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <UpcomingStaysPanel snapshot={snapshot} />
    </div>
  );
}

function BlocksModule({
  blockingPropertyId,
  onAvailabilityBlockRequest,
  snapshot
}: {
  blockingPropertyId: string | null;
  onAvailabilityBlockRequest: (input: {
    endsOn: string;
    note: string;
    propertyId: string;
    startsOn: string;
    unitId: string;
  }) => void;
  snapshot: OwnerPortalSnapshot;
}) {
  return (
    <section className="rounded-[8px] border border-line bg-white p-6 shadow-soft">
      <SectionHeading
        eyebrow="Calendario"
        title="Bloqueos de disponibilidad"
        value={String(getOwnerModuleCount("blocks", snapshot)) + " visibles"}
      />
      <div className="mt-5 space-y-6 divide-y divide-line">
        {snapshot.properties.map((property) => (
          <div className="pt-6 first:pt-0" key={property.id}>
            <div className="flex flex-col gap-1 md:flex-row md:items-start md:justify-between">
              <div>
                <h3 className="text-base font-semibold text-midnight">{property.name}</h3>
                <p className="text-sm leading-6 text-ink/62">{property.location}</p>
              </div>
              <span className="w-fit rounded-full border border-line bg-ivory px-3 py-1 text-xs font-semibold text-midnight/72">
                {property.requestedBlocks.length} bloqueo(s)
              </span>
            </div>
            <OwnerAvailabilityBlockForm
              isSubmitting={blockingPropertyId === property.id}
              onSubmit={onAvailabilityBlockRequest}
              property={property}
            />
          </div>
        ))}
      </div>
    </section>
  );
}

function DocumentsModule({
  onContractAccept,
  snapshot,
  updatingContractId
}: {
  onContractAccept: (contractId: string) => void;
  snapshot: OwnerPortalSnapshot;
  updatingContractId: string | null;
}) {
  return (
    <div className="space-y-6">
      <section>
        <SectionHeading
          eyebrow="Contratos"
          title="Documentos por propiedad"
          value={String(snapshot.properties.length) + " contrato(s)"}
        />
        <div className="mt-5 space-y-5">
          {snapshot.properties.map((property) => (
            <section
              className="rounded-[8px] border border-line bg-white p-6 shadow-soft"
              key={property.id}
            >
              <p className="text-xs font-semibold uppercase text-green">{property.name}</p>
              <PropertyContractPanel
                onContractAccept={onContractAccept}
                property={property}
                updatingContractId={updatingContractId}
              />
            </section>
          ))}
        </div>
      </section>
      <GovernancePanel snapshot={snapshot} />
    </div>
  );
}

function MetricCard({
  icon: Icon,
  metric
}: {
  icon: LucideIcon;
  metric: OwnerPortalSnapshot["metrics"][number];
}) {
  return (
    <article className="rounded-[8px] border border-line bg-white p-5 shadow-soft">
      <Icon aria-hidden className="h-6 w-6 text-green" />
      <p className="mt-4 text-xs font-semibold uppercase text-ink/48">{metric.label}</p>
      <p className="mt-1 text-2xl font-semibold text-midnight">{metric.value}</p>
      <p className="mt-2 text-sm leading-6 text-ink/62">{metric.hint}</p>
    </article>
  );
}

function PropertyCard({
  isSelected,
  onSelect,
  property
}: {
  isSelected: boolean;
  onSelect: (propertyId: string) => void;
  property: OwnerProperty;
}) {
  return (
    <article
      className={
        "overflow-hidden rounded-[8px] border bg-white shadow-soft " +
        (isSelected ? "border-green" : "border-line")
      }
    >
      <div className="grid gap-0 md:grid-cols-[220px_minmax(0,1fr)]">
        <button
          aria-label={"Seleccionar " + property.name}
          className="relative min-h-[180px] bg-midnight text-left md:min-h-full"
          onClick={() => onSelect(property.id)}
          type="button"
        >
          <Image
            alt={property.imageAlt}
            className="object-cover"
            fill
            sizes="(min-width: 768px) 220px, 100vw"
            src={property.image}
          />
          <span
            className={
              "absolute left-4 top-4 rounded-full border px-3 py-1 text-xs font-semibold backdrop-blur " +
              propertyStatusClasses[property.status]
            }
          >
            {property.statusLabel}
          </span>
        </button>

        <div className="p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="flex items-center gap-2 text-sm font-medium text-green">
                <MapPin aria-hidden className="h-4 w-4" />
                {property.location}
              </p>
              <h3 className="mt-2 font-display text-2xl leading-tight text-midnight">
                {property.name}
              </h3>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/68">
                {property.contractStage}
              </p>
            </div>
            <button
              aria-pressed={isSelected}
              className="focus-ring inline-flex min-h-10 w-fit items-center justify-center gap-2 rounded-[6px] border border-line bg-white px-4 text-sm font-semibold text-midnight transition hover:border-green hover:text-green"
              onClick={() => onSelect(property.id)}
              type="button"
            >
              <ClipboardCheck aria-hidden className="h-4 w-4" />
              {isSelected ? "Seleccionada" : "Ver resumen"}
            </button>
          </div>

          <dl className="mt-5 grid gap-3 text-sm text-ink/72 sm:grid-cols-3">
            <PropertyFact
              icon={CalendarCheck2}
              label="Proxima llegada"
              value={property.nextArrival}
            />
            <PropertyFact
              icon={TrendingUp}
              label="Senal comercial"
              value={property.occupancySignal}
            />
            <PropertyFact icon={Wrench} label="Pendientes" value={String(property.openItems)} />
          </dl>
        </div>
      </div>
    </article>
  );
}

function PropertySummaryPanel({ property }: { property: OwnerProperty }) {
  return (
    <section className="rounded-[8px] border border-line bg-white p-6 shadow-soft">
      <SectionHeading
        eyebrow="Detalle seleccionado"
        title={property.name}
        value={property.serviceLevel}
      />
      <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div>
          <div className="grid gap-3 md:grid-cols-3">
            {property.operations.map((operation) => (
              <div
                className="rounded-[6px] border border-line bg-ivory p-3 text-sm"
                key={operation.label}
              >
                <p className="font-semibold text-midnight">{operation.label}</p>
                <p className="mt-1 leading-6 text-ink/62">{operation.state}</p>
              </div>
            ))}
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            {[property.reviewLabel, ...property.highlights].map((item) => (
              <span
                className="rounded-full border border-line bg-ivory px-3 py-1 text-xs font-semibold text-midnight/72"
                key={item}
              >
                {item}
              </span>
            ))}
          </div>
        </div>
        <PropertyRevenuePanel property={property} />
      </div>
    </section>
  );
}

function PropertyRevenuePanel({ property }: { property: OwnerProperty }) {
  return (
    <div className="mt-5 grid gap-3 border-t border-line pt-5 sm:grid-cols-3">
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

function OwnerAvailabilityBlockForm({
  isSubmitting,
  onSubmit,
  property
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
}) {
  const [startsOn, setStartsOn] = useState("");
  const [endsOn, setEndsOn] = useState("");
  const [note, setNote] = useState("");
  const [unitId, setUnitId] = useState(property.units[0]?.id ?? "");

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit({ endsOn, note, propertyId: property.id, startsOn, unitId });
  }

  return (
    <form className="mt-5 border-t border-line pt-5" onSubmit={handleSubmit}>
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold text-midnight">Solicitar bloqueo de fechas</p>
          <p className="mt-1 text-xs leading-5 text-ink/58">
            Crea una solicitud de bloqueo si no hay conflicto con reservas u otros bloqueos.
          </p>
        </div>
        <button
          className="focus-ring inline-flex min-h-10 items-center justify-center gap-2 rounded-[6px] bg-green px-4 text-sm font-semibold text-white transition hover:bg-[#0f5c50] disabled:cursor-not-allowed disabled:opacity-55"
          disabled={isSubmitting || !startsOn || !endsOn || !unitId}
          type="submit"
        >
          <CalendarCheck2 aria-hidden className="h-4 w-4" />
          {isSubmitting ? "Solicitando" : "Solicitar"}
        </button>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-4">
        <label className="text-xs font-semibold uppercase text-ink/48">
          Unidad
          <select
            className="focus-ring mt-2 min-h-10 w-full rounded-[6px] border border-line bg-white px-3 text-sm normal-case text-midnight"
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
            className="focus-ring mt-2 min-h-10 w-full rounded-[6px] border border-line bg-white px-3 text-sm normal-case text-midnight"
            onChange={(event) => setStartsOn(event.target.value)}
            type="date"
            value={startsOn}
          />
        </label>
        <label className="text-xs font-semibold uppercase text-ink/48">
          Fin
          <input
            className="focus-ring mt-2 min-h-10 w-full rounded-[6px] border border-line bg-white px-3 text-sm normal-case text-midnight"
            onChange={(event) => setEndsOn(event.target.value)}
            type="date"
            value={endsOn}
          />
        </label>
        <label className="text-xs font-semibold uppercase text-ink/48">
          Nota
          <input
            className="focus-ring mt-2 min-h-10 w-full rounded-[6px] border border-line bg-white px-3 text-sm normal-case text-midnight"
            onChange={(event) => setNote(event.target.value)}
            value={note}
          />
        </label>
      </div>
      {property.requestedBlocks.length > 0 ? (
        <div className="mt-4 rounded-[6px] border border-line bg-ivory p-3 text-xs leading-5 text-ink/64">
          <p className="font-semibold text-midnight">Bloqueos solicitados y operativos visibles</p>
          {property.requestedBlocks.slice(0, 3).map((block) => (
            <p className="mt-1" key={block.id}>
              {formatShortDate(block.startsOn)} - {formatShortDate(block.endsOn)} /{" "}
              {block.reasonLabel}
            </p>
          ))}
        </div>
      ) : null}
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

function TasksPanel({ snapshot }: { snapshot: OwnerPortalSnapshot }) {
  return (
    <section className="rounded-[8px] border border-line bg-white p-6 shadow-soft">
      <SectionHeading
        eyebrow="Acciones abiertas"
        title="Pendientes operativos"
        value={`${snapshot.tasks.length} tareas`}
      />
      <div className="mt-5 divide-y divide-line">
        {snapshot.tasks.map((task) => (
          <div
            className="grid gap-3 py-4 first:pt-0 last:pb-0 md:grid-cols-[1fr_auto] md:items-center"
            key={task.id}
          >
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
    </section>
  );
}

function OwnerIdentityCard({
  session,
  snapshot
}: {
  session: DevPortalSession;
  snapshot: OwnerPortalSnapshot;
}) {
  return (
    <section className="rounded-[8px] border border-line bg-white p-6 shadow-soft">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-[6px] bg-green/10 text-green">
          <UserRound aria-hidden className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase text-green">{snapshot.ownerName}</p>
          <h2 className="text-lg font-semibold text-midnight">{session.user.displayName}</h2>
        </div>
      </div>
      <p className="mt-4 text-sm leading-6 text-ink/68">
        Acceso limitado a propiedades asignadas y permisos de lectura para liquidaciones.
      </p>
    </section>
  );
}

function UpcomingStaysPanel({ snapshot }: { snapshot: OwnerPortalSnapshot }) {
  return (
    <section className="rounded-[8px] border border-line bg-white p-6 shadow-soft">
      <SectionHeading eyebrow="Calendario" title="Proximas estancias" value="API" />
      <div className="mt-5 divide-y divide-line">
        {snapshot.upcomingStays.map((stay) => (
          <div
            className="grid grid-cols-[64px_1fr] gap-4 py-4 first:pt-0 last:pb-0"
            key={`${stay.date}-${stay.traveler}`}
          >
            <div className="rounded-[6px] bg-ivory px-3 py-2 text-center">
              <p className="text-xs font-semibold uppercase text-green">{stay.date}</p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-midnight">{stay.property}</h3>
              <p className="mt-1 text-sm leading-6 text-ink/62">{stay.traveler}</p>
              <p className="mt-1 text-xs font-semibold uppercase text-terracotta">{stay.status}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function SettlementPanel({ snapshot }: { snapshot: OwnerPortalSnapshot }) {
  const finance = snapshot.financeSummary;
  const latestSettlement = snapshot.settlements[0];

  return (
    <section className="rounded-[8px] border border-line bg-white p-6 shadow-soft">
      <SectionHeading
        eyebrow={finance.periodLabel}
        title="Finanzas"
        value={finance.ownerPayoutLabel}
      />

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <FinanceFact
          detail={`${finance.lineCount} linea(s) conciliada(s)`}
          label="Ingresos"
          value={formatCurrency(finance.grossAccommodation, finance.currency)}
        />
        <FinanceFact
          detail="Comision y servicio KUQUBA"
          label="Servicio"
          value={formatCurrency(finance.kuqubaServiceFees, finance.currency)}
        />
        <FinanceFact
          detail="Limpieza, mantenimiento y gastos del propietario"
          label="Gastos"
          value={formatCurrency(finance.ownerExpenses, finance.currency)}
        />
        <FinanceFact
          detail={finance.statusLabel}
          label="Saldo estimado"
          value={finance.ownerPayoutLabel}
        />
      </div>

      {latestSettlement ? (
        <div className="mt-5 border-t border-line pt-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase text-green">
                {latestSettlement.propertyName}
              </p>
              <h3 className="mt-1 text-sm font-semibold text-midnight">
                {latestSettlement.periodLabel}
              </h3>
            </div>
            <span className="rounded-full border border-line bg-ivory px-2 py-0.5 text-[0.7rem] font-semibold text-midnight/72">
              {latestSettlement.statusLabel}
            </span>
          </div>

          <div className="mt-4 divide-y divide-line">
            {latestSettlement.lineItems.slice(0, 6).map((line) => (
              <div
                className="grid gap-2 py-3 first:pt-0 last:pb-0 sm:grid-cols-[1fr_auto]"
                key={line.id}
              >
                <div>
                  <p className="text-sm font-semibold text-midnight">{line.label}</p>
                  <p className="mt-1 text-xs leading-5 text-ink/52">
                    {line.typeLabel} - {line.reservationCode ?? "Sin reserva"} -{" "}
                    {formatShortDate(line.occurredAt)}
                  </p>
                </div>
                <p className="text-sm font-semibold text-midnight">
                  {formatCurrency(line.amount, line.currency)}
                </p>
              </div>
            ))}
          </div>

          <p className="mt-4 text-xs leading-5 text-ink/56">
            Generada {formatShortDate(latestSettlement.generatedAt)}. Payout productivo
            deshabilitado hasta aprobar proveedor.
          </p>
        </div>
      ) : (
        <p className="mt-5 border-t border-line pt-5 text-sm leading-6 text-ink/62">
          Sin liquidaciones registradas para este periodo.
        </p>
      )}

      <div className="mt-5 border-t border-line pt-5">
        <p className="text-xs font-semibold uppercase text-ink/48">Documentos soporte</p>
        <div className="mt-3 divide-y divide-line">
          {snapshot.settlementItems.map((item) => (
            <div className="py-3 first:pt-0 last:pb-0" key={item.label}>
              <div className="flex items-start justify-between gap-4">
                <h3 className="text-sm font-semibold text-midnight">{item.label}</h3>
                <span className="rounded-full border border-line bg-ivory px-2 py-0.5 text-[0.7rem] font-semibold text-midnight/72">
                  {item.status}
                </span>
              </div>
              <p className="mt-2 text-sm leading-6 text-ink/62">{item.detail}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinanceFact({ detail, label, value }: { detail: string; label: string; value: string }) {
  return (
    <div className="rounded-[6px] border border-line bg-ivory px-3 py-2">
      <p className="text-xs font-semibold uppercase text-ink/48">{label}</p>
      <p className="mt-1 text-sm font-semibold text-midnight">{value}</p>
      <p className="mt-1 text-xs leading-5 text-ink/56">{detail}</p>
    </div>
  );
}

function GovernancePanel({ snapshot }: { snapshot: OwnerPortalSnapshot }) {
  return (
    <section className="rounded-[8px] border border-line bg-white p-6 shadow-soft">
      <div className="flex items-center gap-3">
        <KeyRound aria-hidden className="h-5 w-5 text-green" />
        <h2 className="text-lg font-semibold text-midnight">Gobernanza</h2>
      </div>
      <ul className="mt-5 space-y-3 text-sm leading-6 text-ink/68">
        {snapshot.governance.map((item) => (
          <li className="flex gap-3" key={item}>
            <CheckCircle2 aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-green" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
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

function formatShortDate(value?: string | null) {
  if (!value) {
    return "Pendiente";
  }

  return new Date(value).toLocaleDateString("es-GT", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function formatContractDate(value?: string | null) {
  if (!value) {
    return "Pendiente";
  }

  return new Date(value).toLocaleDateString("es-GT", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function formatSessionExpiry(value: string) {
  return new Date(value).toLocaleString("es-GT", {
    dateStyle: "medium",
    timeStyle: "short"
  });
}
