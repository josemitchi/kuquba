"use client";

import {
  ArrowLeft,
  BadgeCheck,
  Building2,
  CalendarCheck2,
  CheckCircle2,
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

const metricIcons: LucideIcon[] = [Building2, CalendarCheck2, ClipboardCheck, FileText];
const protectedPortalSummary =
  "Vista protegida para propietarios verificados. Las propiedades, tareas y documentos se cargan desde API con una sesion owner vigente.";

type OwnerPortalResponse = {
  correlationId: string;
  portal: OwnerPortalSnapshot;
};

export function OwnerPortalHomePage() {
  const { isValidating, logout, session } = useDevPortalSession("owner");
  const [portal, setPortal] = useState<OwnerPortalSnapshot | null>(null);
  const [portalError, setPortalError] = useState<string | null>(null);
  const [isPortalLoading, setIsPortalLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    let isMounted = true;

    const sessionToken = session?.sessionToken;

    if (!sessionToken) {
      setPortal(null);
      setPortalError(null);
      setIsPortalLoading(false);
      return;
    }

    const activeSessionToken: string = sessionToken;

    async function loadOwnerPortal() {
      setIsPortalLoading(true);
      setPortalError(null);

      try {
        const response = await fetch(`${getDevPortalApiBaseUrl()}/api/owner/portal`, {
          headers: {
            "x-kuquba-dev-session": activeSessionToken
          }
        });

        if (!response.ok) {
          const payload = (await response.json().catch(() => undefined)) as { error?: string } | undefined;
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
            {session ? (
              <button
                className="focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-[6px] bg-white px-4 text-sm font-semibold text-midnight transition hover:bg-beige"
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

      <section className="border-b border-line bg-white">
        <div className="container-shell grid gap-6 py-8 lg:grid-cols-[minmax(0,1fr)_390px] lg:items-start">
          <div className="max-w-4xl">
            <p className="inline-flex items-center gap-2 rounded-full border border-green/20 bg-green/10 px-4 py-2 text-sm font-semibold text-green">
              <Building2 aria-hidden className="h-4 w-4" />
              Portal del propietario
            </p>
            <h1 className="mt-5 font-display text-4xl leading-tight text-midnight md:text-5xl">
              Portfolio y operacion de propiedades
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-ink/72">
              {portal?.summary ?? protectedPortalSummary}
            </p>
          </div>

          <SessionPanel isValidating={isValidating} session={session} />
        </div>
      </section>

      <section className="container-shell py-8">
        {session ? (
          portal ? (
            <OwnerDashboard session={session} snapshot={portal} />
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

function SessionPanel({
  isValidating,
  session
}: {
  isValidating: boolean;
  session: DevPortalSession | null;
}) {
  const statusLabel = isValidating ? "Validando acceso" : session ? "Sesion owner activa" : "Acceso pendiente";

  return (
    <aside className="rounded-[8px] border border-line bg-ivory p-5">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-[6px] bg-green/10 text-green">
          <ShieldCheck aria-hidden className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase text-green">Acceso verificado</p>
          <h2 className="text-lg font-semibold text-midnight">{statusLabel}</h2>
        </div>
      </div>

      {session ? (
        <dl className="mt-5 space-y-3 text-sm">
          <SessionRow label="Usuario" value={session.user.displayName} />
          <SessionRow label="Correo" value={session.user.emailMasked} />
          <SessionRow label="Rol" value={session.role.name} />
          <SessionRow label="Permisos" value={`${session.permissions.length}`} />
          <SessionRow label="Expira" value={formatSessionExpiry(session.expiresAt)} />
        </dl>
      ) : (
        <p className="mt-5 text-sm leading-6 text-ink/68">
          {isValidating
            ? "Confirmando sesion con la API."
            : "Ingresa desde la pantalla de acceso para cargar datos asignados al propietario."}
        </p>
      )}
    </aside>
  );
}

function OwnerDashboard({
  session,
  snapshot
}: {
  session: DevPortalSession;
  snapshot: OwnerPortalSnapshot;
}) {
  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {snapshot.metrics.map((metric, index) => (
          <MetricCard icon={metricIcons[index] ?? BadgeCheck} key={metric.label} metric={metric} />
        ))}
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_390px] lg:items-start">
        <div className="space-y-8">
          <section>
            <SectionHeading
              eyebrow={snapshot.periodLabel}
              title="Propiedades asignadas"
              value={`${snapshot.properties.length} activas o en activacion`}
            />
            <div className="mt-5 space-y-5">
              {snapshot.properties.map((property) => (
                <PropertyCard key={property.id} property={property} />
              ))}
            </div>
          </section>

          <TasksPanel snapshot={snapshot} />
        </div>

        <aside className="space-y-6">
          <OwnerIdentityCard session={session} snapshot={snapshot} />
          <UpcomingStaysPanel snapshot={snapshot} />
          <SettlementPanel snapshot={snapshot} />
          <GovernancePanel snapshot={snapshot} />
        </aside>
      </div>
    </>
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

function PropertyCard({ property }: { property: OwnerProperty }) {
  return (
    <article className="overflow-hidden rounded-[8px] border border-line bg-white shadow-soft xl:grid xl:grid-cols-[260px_1fr]">
      <div className="relative min-h-[240px] bg-midnight xl:min-h-full">
        <Image
          alt={property.imageAlt}
          className="object-cover"
          fill
          sizes="(min-width: 1280px) 260px, 100vw"
          src={property.image}
        />
        <span
          className={`absolute left-4 top-4 rounded-full border px-3 py-1 text-xs font-semibold backdrop-blur ${propertyStatusClasses[property.status]}`}
        >
          {property.statusLabel}
        </span>
      </div>

      <div className="p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="flex items-center gap-2 text-sm font-medium text-green">
              <MapPin aria-hidden className="h-4 w-4" />
              {property.location}
            </p>
            <h3 className="mt-2 font-display text-3xl leading-tight text-midnight">{property.name}</h3>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-ink/68">{property.contractStage}</p>
          </div>
          <span className="inline-flex w-fit items-center rounded-full border border-line bg-ivory px-3 py-1 text-xs font-semibold text-midnight/72">
            {property.serviceLevel}
          </span>
        </div>

        <dl className="mt-5 grid gap-3 text-sm text-ink/72 sm:grid-cols-3">
          <PropertyFact icon={CalendarCheck2} label="Proxima llegada" value={property.nextArrival} />
          <PropertyFact icon={TrendingUp} label="Senal comercial" value={property.occupancySignal} />
          <PropertyFact icon={Wrench} label="Pendientes" value={`${property.openItems}`} />
        </dl>

        <div className="mt-5 border-t border-line pt-5">
          <div className="grid gap-3 md:grid-cols-3">
            {property.operations.map((operation) => (
              <div className="text-sm" key={operation.label}>
                <p className="font-semibold text-midnight">{operation.label}</p>
                <p className="mt-1 leading-6 text-ink/62">{operation.state}</p>
              </div>
            ))}
          </div>
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
    </article>
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
      <SectionHeading eyebrow="Acciones abiertas" title="Pendientes operativos" value={`${snapshot.tasks.length} tareas`} />
      <div className="mt-5 divide-y divide-line">
        {snapshot.tasks.map((task) => (
          <div className="grid gap-3 py-4 first:pt-0 last:pb-0 md:grid-cols-[1fr_auto] md:items-center" key={task.id}>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-semibold text-midnight">{task.title}</h3>
                <span className={`rounded-full border px-2 py-0.5 text-[0.7rem] font-semibold ${taskPriorityClasses[task.priority]}`}>
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
          <div className="grid grid-cols-[64px_1fr] gap-4 py-4 first:pt-0 last:pb-0" key={`${stay.date}-${stay.traveler}`}>
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
  return (
    <section className="rounded-[8px] border border-line bg-white p-6 shadow-soft">
      <SectionHeading eyebrow="Documentos" title="Cierre mensual" value="Sin montos" />
      <div className="mt-5 divide-y divide-line">
        {snapshot.settlementItems.map((item) => (
          <div className="py-4 first:pt-0 last:pb-0" key={item.label}>
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
    </section>
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
          : "El portfolio se carga solamente con una sesion owner vigente."}
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
          : `La API respondio: ${error ?? "owner_portal_load_failed"}.`}
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

function formatSessionExpiry(value: string) {
  return new Date(value).toLocaleString("es-GT", {
    dateStyle: "medium",
    timeStyle: "short"
  });
}
