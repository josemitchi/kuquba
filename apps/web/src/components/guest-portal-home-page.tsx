"use client";

import {
  ArrowLeft,
  BadgeCheck,
  Cake,
  CalendarCheck2,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Clock3,
  CreditCard,
  DoorOpen,
  FileText,
  History,
  LogOut,
  Mail,
  Phone,
  Save,
  Search,
  ShieldCheck,
  UserRound,
  X,
  type LucideIcon
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";

import {
  getDevPortalApiBaseUrl,
  type DevPortalSession,
  useDevPortalSession
} from "@/components/use-dev-portal-session";
import type {
  GuestPortalSnapshot,
  GuestProfile,
  GuestReservation,
  GuestReservationTone
} from "@/data/guest-portal";

const metricIcons: LucideIcon[] = [CalendarCheck2, Clock3, CreditCard];
const protectedPortalSummary =
  "Vista protegida para huespedes verificados. Tus reservas, pagos y datos de llegada se cargan desde una sesion vigente.";

const reservationToneClasses: Record<GuestReservationTone, string> = {
  danger: "border-terracotta/28 bg-terracotta/10 text-terracotta",
  neutral: "border-line bg-ivory text-ink/62",
  success: "border-green/24 bg-green/10 text-green",
  warning: "border-terracotta/28 bg-terracotta/10 text-terracotta"
};

type GuestPortalResponse = {
  correlationId: string;
  portal: GuestPortalSnapshot;
};

type GuestProfileResponse = {
  correlationId: string;
  profile: GuestProfile;
};

type ProfileSaveState = "idle" | "saving" | "success" | "error";

export function GuestPortalHomePage() {
  const { isValidating, logout, session } = useDevPortalSession("guest");
  const [portal, setPortal] = useState<GuestPortalSnapshot | null>(null);
  const [isPortalLoading, setIsPortalLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    let isMounted = true;
    const sessionToken = session?.sessionToken;

    if (!sessionToken) {
      setPortal(null);
      setIsPortalLoading(false);
      return;
    }

    const activeSessionToken: string = sessionToken;

    async function loadGuestPortal() {
      setIsPortalLoading(true);
      try {
        const response = await fetch(getDevPortalApiBaseUrl() + "/api/guest/portal", {
          headers: {
            "x-kuquba-dev-session": activeSessionToken
          }
        });

        if (!response.ok) {
          const payload = (await response.json().catch(() => undefined)) as
            { error?: string } | undefined;
          throw new Error(payload?.error ?? "guest_portal_load_failed");
        }

        const payload = (await response.json()) as GuestPortalResponse;

        if (isMounted) {
          setPortal(payload.portal);
          setIsPortalLoading(false);
        }
      } catch {
        if (isMounted) {
          setPortal(null);
          setIsPortalLoading(false);
        }
      }
    }

    void loadGuestPortal();

    return () => {
      isMounted = false;
    };
  }, [session?.sessionToken]);

  async function handleLogout() {
    await logout();
    router.push("/stay");
  }

  function handleProfileUpdated(profile: GuestProfile) {
    setPortal((current) =>
      current ? { ...current, guestName: profile.fullName, profile } : current
    );
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
              href="/stay"
            >
              <ArrowLeft aria-hidden className="h-4 w-4" />
              Acceso
            </a>
            <AccountMenu
              isValidating={isValidating}
              onLogout={handleLogout}
              profile={portal?.profile}
              session={session}
            />
          </div>
        </div>
      </header>

      <section className="border-b border-line bg-white">
        <div className="container-shell py-8">
          <div className="max-w-4xl">
            <p className="inline-flex items-center gap-2 rounded-full border border-green/20 bg-green/10 px-4 py-2 text-sm font-semibold text-green">
              <DoorOpen aria-hidden className="h-4 w-4" />
              Huespedes
            </p>
            <h1 className="mt-5 font-display text-4xl leading-tight text-midnight md:text-5xl">
              Reservas y llegada
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
            <GuestDashboard
              onProfileUpdated={handleProfileUpdated}
              sessionToken={session.sessionToken}
              snapshot={portal}
            />
          ) : (
            <PortalLoadState isLoading={isPortalLoading} />
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
  profile,
  session
}: {
  isValidating: boolean;
  onLogout: () => void;
  profile?: GuestProfile;
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

  const displayName = profile?.fullName || session.user.displayName;
  const email = profile?.email ?? "";

  return (
    <details className="group relative">
      <summary className="focus-ring flex min-h-11 cursor-pointer list-none items-center gap-3 rounded-[6px] border border-white/25 px-3 text-left text-sm text-white/90 transition hover:border-white">
        <span className="flex h-8 w-8 items-center justify-center rounded-[6px] bg-white/10 text-white">
          <UserRound aria-hidden className="h-4 w-4" />
        </span>
        <span className="min-w-0">
          <span className="block max-w-36 truncate font-semibold text-white">{displayName}</span>
          <span className="block text-xs text-white/62">Cuenta de huesped</span>
        </span>
        <ChevronDown
          aria-hidden
          className="h-4 w-4 text-white/64 transition group-open:rotate-180"
        />
      </summary>
      <div className="absolute right-0 z-40 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-[8px] border border-line bg-white text-sm text-ink shadow-soft">
        <div className="flex items-start gap-3 border-b border-line bg-ivory px-4 py-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] bg-green/10 text-green">
            <UserRound aria-hidden className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-semibold text-midnight">{displayName}</p>
                {email ? <p className="mt-1 truncate text-xs text-ink/62">{email}</p> : null}
              </div>
              <span className="shrink-0 rounded-full bg-green/10 px-2 py-1 text-[0.68rem] font-semibold uppercase text-green">
                {session.role.name}
              </span>
            </div>
          </div>
        </div>
        <button
          className="focus-ring m-4 inline-flex min-h-10 w-[calc(100%-2rem)] items-center justify-center gap-2 rounded-[6px] border border-line bg-white px-4 text-sm font-semibold text-midnight transition hover:border-green hover:bg-green/5 hover:text-green"
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

type GuestDashboardTab = "confirmed" | "history" | "profile";

type ReservationFilters = {
  endDate: string;
  query: string;
  startDate: string;
};

const emptyReservationFilters: ReservationFilters = {
  endDate: "",
  query: "",
  startDate: ""
};

const guestDashboardTabs: Array<{
  icon: LucideIcon;
  key: GuestDashboardTab;
  label: string;
}> = [
  { icon: CalendarCheck2, key: "confirmed", label: "Confirmadas" },
  { icon: History, key: "history", label: "Historicas" },
  { icon: UserRound, key: "profile", label: "Perfil" }
];

function GuestDashboard({
  onProfileUpdated,
  sessionToken,
  snapshot
}: {
  onProfileUpdated: (profile: GuestProfile) => void;
  sessionToken: string;
  snapshot: GuestPortalSnapshot;
}) {
  const [activeTab, setActiveTab] = useState<GuestDashboardTab>("confirmed");
  const [confirmedFilters, setConfirmedFilters] =
    useState<ReservationFilters>(emptyReservationFilters);
  const [historyFilters, setHistoryFilters] = useState<ReservationFilters>(emptyReservationFilters);
  const todayDateKey = getTodayDateKey();
  const confirmedReservations = sortReservationsByArrival(
    snapshot.reservations.filter((reservation) =>
      isConfirmedUpcomingReservation(reservation, todayDateKey)
    )
  );
  const pendingReservations = sortReservationsByArrival(
    snapshot.reservations.filter(isPendingReservation)
  );
  const historyReservations = sortReservationsByArrivalDesc(
    snapshot.reservations.filter((reservation) =>
      isHistoricalReservation(reservation, todayDateKey)
    )
  );
  const filteredConfirmedReservations = filterReservations(confirmedReservations, confirmedFilters);
  const filteredPendingReservations = filterReservations(pendingReservations, confirmedFilters);
  const filteredHistoryReservations = filterReservations(historyReservations, historyFilters);
  const defaultSelectedReservationId = getDefaultSelectedReservationId({
    confirmedReservations,
    historyReservations,
    nextStay: snapshot.nextStay,
    pendingReservations
  });
  const [selectedReservationId, setSelectedReservationId] = useState<string | null>(
    defaultSelectedReservationId
  );
  const summaryMetrics = snapshot.metrics.filter((metric) => metric.label !== "Proxima llegada");

  useEffect(() => {
    setSelectedReservationId(defaultSelectedReservationId);
  }, [defaultSelectedReservationId]);

  function handleReservationDetail(reservationId: string) {
    setSelectedReservationId((current) => (current === reservationId ? null : reservationId));
  }

  return (
    <>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-stretch">
        <NextStayPanel reservation={snapshot.nextStay} />

        {summaryMetrics.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-1">
            {summaryMetrics.map((metric, index) => (
              <MetricCard
                icon={metricIcons[index] ?? BadgeCheck}
                key={metric.label}
                metric={metric}
              />
            ))}
          </div>
        ) : null}
      </div>

      <section className="mt-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <SectionHeading
            eyebrow="Portal de huesped"
            title="Reservas y perfil"
            value={getTabSummary(activeTab, {
              confirmedCount: confirmedReservations.length,
              historyCount: historyReservations.length,
              pendingCount: pendingReservations.length
            })}
          />

          <div
            aria-label="Secciones del portal de huesped"
            className="inline-flex w-full flex-wrap gap-2 rounded-[8px] border border-line bg-white p-1 shadow-soft sm:w-fit"
            role="tablist"
          >
            {guestDashboardTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = tab.key === activeTab;

              return (
                <button
                  aria-selected={isActive}
                  className={
                    "focus-ring inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-[6px] px-4 text-sm font-semibold transition sm:flex-none " +
                    (isActive
                      ? "bg-midnight text-white"
                      : "text-midnight/70 hover:bg-green/10 hover:text-green")
                  }
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  role="tab"
                  type="button"
                >
                  <Icon aria-hidden className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {activeTab === "confirmed" ? (
          <div className="mt-5 space-y-6">
            <ReservationTable
              emptyDescription="Aqui apareceran tus reservas confirmadas por realizar."
              emptyTitle="Sin reservas confirmadas"
              filters={confirmedFilters}
              icon={CalendarCheck2}
              onFiltersChange={setConfirmedFilters}
              onSelect={handleReservationDetail}
              reservations={filteredConfirmedReservations}
              selectedReservationId={selectedReservationId}
              title="Reservas confirmadas"
              totalCount={confirmedReservations.length}
            />

            {pendingReservations.length > 0 ? (
              <ReservationTable
                emptyDescription="No hay reservas temporales que coincidan con los filtros actuales."
                emptyTitle="Sin pendientes visibles"
                filters={confirmedFilters}
                icon={Clock3}
                onFiltersChange={setConfirmedFilters}
                onSelect={handleReservationDetail}
                reservations={filteredPendingReservations}
                selectedReservationId={selectedReservationId}
                title="Pendientes de confirmacion"
                totalCount={pendingReservations.length}
              />
            ) : null}
          </div>
        ) : null}

        {activeTab === "history" ? (
          <ReservationTable
            emptyDescription="Cuando una estancia finalice o una reserva quede vencida, se movera a este historial."
            emptyTitle="Historial pendiente"
            filters={historyFilters}
            icon={History}
            onFiltersChange={setHistoryFilters}
            onSelect={handleReservationDetail}
            reservations={filteredHistoryReservations}
            selectedReservationId={selectedReservationId}
            title="Reservas historicas"
            totalCount={historyReservations.length}
          />
        ) : null}

        {activeTab === "profile" ? (
          <div className="mt-5 max-w-3xl">
            <GuestProfilePanel
              onProfileUpdated={onProfileUpdated}
              profile={snapshot.profile}
              sessionToken={sessionToken}
            />
          </div>
        ) : null}
      </section>
    </>
  );
}

function getTabSummary(
  activeTab: GuestDashboardTab,
  counts: { confirmedCount: number; historyCount: number; pendingCount: number }
) {
  if (activeTab === "profile") {
    return "Datos de acceso";
  }

  if (activeTab === "history") {
    return String(counts.historyCount) + " registro(s)";
  }

  const pendingSuffix = counts.pendingCount > 0 ? ` / ${counts.pendingCount} pendiente(s)` : "";
  return String(counts.confirmedCount) + " confirmada(s)" + pendingSuffix;
}

function getDefaultSelectedReservationId(input: {
  confirmedReservations: GuestReservation[];
  historyReservations: GuestReservation[];
  nextStay: GuestReservation | null;
  pendingReservations: GuestReservation[];
}) {
  return (
    input.nextStay?.id ??
    input.confirmedReservations[0]?.id ??
    input.pendingReservations[0]?.id ??
    input.historyReservations[0]?.id ??
    null
  );
}

function isConfirmedUpcomingReservation(reservation: GuestReservation, todayDateKey: string) {
  return reservation.status === "CONFIRMED" && reservation.departureDate >= todayDateKey;
}

function isPendingReservation(reservation: GuestReservation) {
  return (
    (reservation.status === "HOLD" || reservation.status === "PENDING_PAYMENT") &&
    reservation.isActionable
  );
}

function isHistoricalReservation(reservation: GuestReservation, todayDateKey: string) {
  if (isPendingReservation(reservation)) {
    return false;
  }

  if (reservation.status === "CONFIRMED") {
    return reservation.departureDate < todayDateKey;
  }

  return true;
}

function sortReservationsByArrival(reservations: GuestReservation[]) {
  return [...reservations].sort(
    (left, right) => getDateKeyTime(left.arrivalDate) - getDateKeyTime(right.arrivalDate)
  );
}

function sortReservationsByArrivalDesc(reservations: GuestReservation[]) {
  return [...reservations].sort(
    (left, right) => getDateKeyTime(right.arrivalDate) - getDateKeyTime(left.arrivalDate)
  );
}

function filterReservations(reservations: GuestReservation[], filters: ReservationFilters) {
  const query = filters.query.trim().toLowerCase();

  return reservations.filter((reservation) => {
    if (query && !getReservationSearchText(reservation).includes(query)) {
      return false;
    }

    if (filters.startDate && reservation.departureDate < filters.startDate) {
      return false;
    }

    if (filters.endDate && reservation.arrivalDate > filters.endDate) {
      return false;
    }

    return true;
  });
}

function getReservationSearchText(reservation: GuestReservation) {
  return [
    reservation.reservationCode,
    reservation.propertyName,
    reservation.unitName,
    reservation.propertyDestination,
    reservation.statusLabel,
    reservation.payment?.statusLabel ?? ""
  ]
    .join(" ")
    .toLowerCase();
}

function getTodayDateKey() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/Guatemala",
    year: "numeric"
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return `${values.year}-${values.month}-${values.day}`;
}
function getDateKeyTime(value: string) {
  return new Date(value + "T00:00:00.000Z").getTime();
}

function MetricCard({
  icon: Icon,
  metric
}: {
  icon: LucideIcon;
  metric: GuestPortalSnapshot["metrics"][number];
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

function GuestProfilePanel({
  onProfileUpdated,
  profile,
  sessionToken
}: {
  onProfileUpdated: (profile: GuestProfile) => void;
  profile: GuestProfile;
  sessionToken: string;
}) {
  const [form, setForm] = useState({
    dateOfBirth: profile.dateOfBirth,
    fullName: profile.fullName,
    phone: profile.phone
  });
  const [saveState, setSaveState] = useState<ProfileSaveState>("idle");
  const isSaving = saveState === "saving";

  useEffect(() => {
    setForm({
      dateOfBirth: profile.dateOfBirth,
      fullName: profile.fullName,
      phone: profile.phone
    });
  }, [profile.dateOfBirth, profile.fullName, profile.phone]);

  function updateField(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    setSaveState("idle");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (form.fullName.trim().length < 2) {
      setSaveState("error");
      return;
    }

    setSaveState("saving");

    try {
      const response = await fetch(`${getDevPortalApiBaseUrl()}/api/guest/profile`, {
        body: JSON.stringify({
          dateOfBirth: form.dateOfBirth || null,
          fullName: form.fullName.trim(),
          phone: form.phone.trim() || null
        }),
        headers: {
          "content-type": "application/json",
          "x-kuquba-dev-session": sessionToken
        },
        method: "PATCH"
      });

      if (!response.ok) {
        throw new Error("guest_profile_update_failed");
      }

      const payload = (await response.json()) as GuestProfileResponse;
      onProfileUpdated(payload.profile);
      setSaveState("success");
    } catch {
      setSaveState("error");
    }
  }

  return (
    <section className="rounded-[8px] border border-line bg-white p-5 shadow-soft">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[6px] bg-green/10 text-green">
          <UserRound aria-hidden className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase text-green">Perfil del huesped</p>
          <h2 className="mt-1 truncate text-lg font-semibold text-midnight">{profile.fullName}</h2>
          <p className="mt-1 truncate text-sm text-ink/62">Datos para llegada y confirmaciones.</p>
        </div>
      </div>

      <div className="mt-5 flex gap-3 rounded-[6px] border border-line bg-ivory p-3 text-sm">
        <Mail aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-green" />
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase text-ink/45">Correo de acceso</p>
          <p className="mt-1 break-words font-semibold text-midnight">{profile.email}</p>
        </div>
      </div>

      <form className="mt-5 grid gap-4" onSubmit={handleSubmit}>
        <label className="block">
          <span className="mb-2 block text-xs font-semibold uppercase text-ink/48">
            Nombres y apellidos
          </span>
          <input
            className="focus-ring min-h-11 w-full rounded-[6px] border border-line bg-white px-3 text-sm text-midnight outline-none"
            name="fullName"
            onChange={(event) => updateField("fullName", event.target.value)}
            required
            type="text"
            value={form.fullName}
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase text-ink/48">
              <Phone aria-hidden className="h-3.5 w-3.5 text-green" />
              Telefono
            </span>
            <input
              className="focus-ring min-h-11 w-full rounded-[6px] border border-line bg-white px-3 text-sm text-midnight outline-none"
              inputMode="tel"
              name="phone"
              onChange={(event) => updateField("phone", event.target.value)}
              placeholder="+502 5555 0000"
              type="tel"
              value={form.phone}
            />
          </label>

          <label className="block">
            <span className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase text-ink/48">
              <Cake aria-hidden className="h-3.5 w-3.5 text-green" />
              Fecha de nacimiento
            </span>
            <input
              className="focus-ring min-h-11 w-full rounded-[6px] border border-line bg-white px-3 text-sm text-midnight outline-none [color-scheme:light]"
              name="dateOfBirth"
              onChange={(event) => updateField("dateOfBirth", event.target.value)}
              type="date"
              value={form.dateOfBirth}
            />
          </label>
        </div>

        <button
          className="focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-[6px] bg-green px-4 text-sm font-semibold text-white transition hover:bg-[#0f5c50] disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isSaving || form.fullName.trim().length < 2}
          type="submit"
        >
          <Save aria-hidden className="h-4 w-4" />
          {isSaving ? "Guardando" : "Guardar perfil"}
        </button>

        {saveState === "success" ? (
          <p className="rounded-[6px] border border-green/24 bg-green/10 px-3 py-2 text-xs font-semibold text-green">
            Perfil actualizado.
          </p>
        ) : null}
        {saveState === "error" ? (
          <p className="rounded-[6px] border border-terracotta/30 bg-terracotta/10 px-3 py-2 text-xs font-semibold text-terracotta">
            No se pudo actualizar el perfil. Revisa los datos e intenta de nuevo.
          </p>
        ) : null}
      </form>
    </section>
  );
}

function ReservationTable({
  emptyDescription,
  emptyTitle,
  filters,
  icon: Icon,
  onFiltersChange,
  onSelect,
  reservations,
  selectedReservationId,
  title,
  totalCount
}: {
  emptyDescription: string;
  emptyTitle: string;
  filters: ReservationFilters;
  icon: LucideIcon;
  onFiltersChange: (filters: ReservationFilters) => void;
  onSelect: (reservationId: string) => void;
  reservations: GuestReservation[];
  selectedReservationId: string | null;
  title: string;
  totalCount: number;
}) {
  const hasFilters = hasReservationFilters(filters);

  return (
    <section className="rounded-[8px] border border-line bg-white shadow-soft">
      <div className="flex flex-col gap-4 border-b border-line p-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[6px] bg-green/10 text-green">
            <Icon aria-hidden className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-green">Listado</p>
            <h3 className="mt-1 text-lg font-semibold text-midnight">{title}</h3>
          </div>
        </div>
        <span className="inline-flex w-fit items-center rounded-full border border-line bg-ivory px-3 py-1 text-xs font-semibold text-midnight/72">
          {String(reservations.length)} de {String(totalCount)}
        </span>
      </div>

      <ReservationFilterBar filters={filters} onFiltersChange={onFiltersChange} />

      {reservations.length === 0 ? (
        <div className="p-8 text-center">
          <CalendarCheck2 aria-hidden className="mx-auto h-10 w-10 text-green" />
          <h4 className="mt-4 text-xl font-semibold text-midnight">
            {hasFilters ? "Sin resultados" : emptyTitle}
          </h4>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-ink/68">
            {hasFilters
              ? "No hay reservas que coincidan con los filtros aplicados."
              : emptyDescription}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] table-fixed border-t border-line text-left text-sm">
            <colgroup>
              <col className="w-[17%]" />
              <col className="w-[24%]" />
              <col className="w-[12%]" />
              <col className="w-[12%]" />
              <col className="w-[14%]" />
              <col className="w-[11%]" />
              <col className="w-[10%]" />
            </colgroup>
            <thead className="bg-ivory text-xs uppercase text-ink/50">
              <tr>
                <th className="px-4 py-3 font-semibold">Reserva</th>
                <th className="px-4 py-3 font-semibold">Estancia</th>
                <th className="px-4 py-3 font-semibold">Llegada</th>
                <th className="px-4 py-3 font-semibold">Salida</th>
                <th className="px-4 py-3 font-semibold">Pago</th>
                <th className="px-4 py-3 font-semibold">Total</th>
                <th className="px-4 py-3 text-right font-semibold">Detalle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {reservations.map((reservation) => (
                <ReservationTableRow
                  isSelected={reservation.id === selectedReservationId}
                  key={reservation.id}
                  onSelect={onSelect}
                  reservation={reservation}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function ReservationFilterBar({
  filters,
  onFiltersChange
}: {
  filters: ReservationFilters;
  onFiltersChange: (filters: ReservationFilters) => void;
}) {
  const hasFilters = hasReservationFilters(filters);

  function updateFilter(field: keyof ReservationFilters, value: string) {
    onFiltersChange({ ...filters, [field]: value });
  }

  return (
    <div className="grid gap-3 border-b border-line p-5 lg:grid-cols-[minmax(220px,1fr)_180px_180px_auto] lg:items-end">
      <label className="block">
        <span className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase text-ink/48">
          <Search aria-hidden className="h-3.5 w-3.5 text-green" />
          Nombre o codigo
        </span>
        <input
          className="focus-ring min-h-11 w-full rounded-[6px] border border-line bg-white px-3 text-sm text-midnight outline-none"
          onChange={(event) => updateFilter("query", event.target.value)}
          placeholder="Propiedad, unidad o reserva"
          type="search"
          value={filters.query}
        />
      </label>

      <label className="block">
        <span className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase text-ink/48">
          <CalendarCheck2 aria-hidden className="h-3.5 w-3.5 text-green" />
          Desde
        </span>
        <input
          className="focus-ring min-h-11 w-full rounded-[6px] border border-line bg-white px-3 text-sm text-midnight outline-none [color-scheme:light]"
          onChange={(event) => updateFilter("startDate", event.target.value)}
          type="date"
          value={filters.startDate}
        />
      </label>

      <label className="block">
        <span className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase text-ink/48">
          <CalendarCheck2 aria-hidden className="h-3.5 w-3.5 text-green" />
          Hasta
        </span>
        <input
          className="focus-ring min-h-11 w-full rounded-[6px] border border-line bg-white px-3 text-sm text-midnight outline-none [color-scheme:light]"
          onChange={(event) => updateFilter("endDate", event.target.value)}
          type="date"
          value={filters.endDate}
        />
      </label>

      <button
        className="focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-[6px] border border-line bg-white px-4 text-sm font-semibold text-midnight transition hover:border-green hover:text-green disabled:cursor-not-allowed disabled:opacity-50"
        disabled={!hasFilters}
        onClick={() => onFiltersChange(emptyReservationFilters)}
        type="button"
      >
        <X aria-hidden className="h-4 w-4" />
        Limpiar
      </button>
    </div>
  );
}

function ReservationTableRow({
  isSelected,
  onSelect,
  reservation
}: {
  isSelected: boolean;
  onSelect: (reservationId: string) => void;
  reservation: GuestReservation;
}) {
  return (
    <>
      <tr className={isSelected ? "bg-green/5" : "bg-white"}>
        <td className="px-4 py-4 align-top">
          <p className="break-words font-semibold text-midnight">{reservation.reservationCode}</p>
          <span
            className={
              "mt-2 inline-flex w-fit rounded-full border px-2.5 py-1 text-[0.68rem] font-semibold " +
              reservationToneClasses[reservation.statusTone]
            }
          >
            {reservation.statusLabel}
          </span>
        </td>
        <td className="px-4 py-4 align-top">
          <p className="font-semibold text-midnight">{reservation.propertyName}</p>
          <p className="mt-1 text-xs leading-5 text-ink/62">
            {reservation.unitName} / {reservation.propertyDestination}
          </p>
        </td>
        <td className="px-4 py-4 align-top font-semibold text-midnight">
          {formatDate(reservation.arrivalDate)}
        </td>
        <td className="px-4 py-4 align-top text-ink/68">{formatDate(reservation.departureDate)}</td>
        <td className="px-4 py-4 align-top text-ink/68">
          {reservation.payment ? reservation.payment.statusLabel : "Sin pago"}
        </td>
        <td className="px-4 py-4 align-top font-semibold text-midnight">
          {formatCurrency(reservation.total, reservation.currency)}
        </td>
        <td className="px-4 py-4 text-right align-top">
          <button
            aria-controls={`guest-reservation-detail-${reservation.id}`}
            aria-expanded={isSelected}
            className="focus-ring inline-flex min-h-10 items-center justify-center gap-2 rounded-[6px] border border-line bg-white px-3 text-sm font-semibold text-midnight transition hover:border-green hover:text-green"
            onClick={() => onSelect(reservation.id)}
            type="button"
          >
            <ClipboardList aria-hidden className="h-4 w-4" />
            {isSelected ? "Ocultar" : "Ver"}
          </button>
        </td>
      </tr>
      {isSelected ? (
        <tr>
          <td
            className="bg-white px-4 py-5"
            colSpan={7}
            id={`guest-reservation-detail-${reservation.id}`}
          >
            <ReservationDetailPanel reservation={reservation} variant="embedded" />
          </td>
        </tr>
      ) : null}
    </>
  );
}

function hasReservationFilters(filters: ReservationFilters) {
  return Boolean(filters.query.trim() || filters.startDate || filters.endDate);
}

function ReservationDetailPanel({
  reservation,
  variant = "panel"
}: {
  reservation: GuestReservation | null;
  variant?: "embedded" | "panel";
}) {
  const containerClassName =
    variant === "embedded"
      ? "outline-none"
      : "rounded-[8px] border border-line bg-white p-6 shadow-soft";
  if (!reservation) {
    return (
      <section className={containerClassName}>
        <FileText aria-hidden className="h-6 w-6 text-green" />
        <h2 className="mt-4 text-lg font-semibold text-midnight">Detalle pendiente</h2>
        <p className="mt-2 text-sm leading-6 text-ink/68">
          Selecciona una reserva para revisar llegada, pago y confirmacion.
        </p>
      </section>
    );
  }

  return (
    <section className={containerClassName}>
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase text-green">Detalle de reserva</p>
          <h2 className="mt-1 text-base font-semibold text-midnight">
            {reservation.reservationCode}
          </h2>
        </div>
        <p className="text-sm font-semibold text-ink/58">
          {formatDate(reservation.arrivalDate)} - {formatDate(reservation.departureDate)}
        </p>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1.1fr_0.9fr_1fr]">
        <DetailSection icon={DoorOpen} title="Llegada y check-in">
          <dl className="grid gap-2 text-sm sm:grid-cols-3 lg:grid-cols-1">
            <DetailRow label="Estado" value={reservation.arrival.readinessLabel} />
            <DetailRow label="Check-in" value={reservation.arrival.checkInWindow} />
            <DetailRow label="Check-out" value={reservation.arrival.checkOutTime} />
          </dl>
          <ul className="mt-3 grid gap-2 text-xs leading-5 text-ink/68">
            {reservation.arrival.instructions.map((instruction) => (
              <li className="flex gap-2" key={instruction}>
                <CheckCircle2 aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-green" />
                <span>{instruction}</span>
              </li>
            ))}
          </ul>
        </DetailSection>

        <DetailSection icon={CreditCard} title="Pago">
          {reservation.payment ? (
            <dl className="grid gap-2 text-sm">
              <DetailRow label="Estado" value={reservation.payment.statusLabel} />
              <DetailRow
                label="Monto"
                value={formatCurrency(reservation.payment.amount, reservation.payment.currency)}
              />
              <DetailRow
                label="Confirmado"
                value={
                  reservation.payment.confirmedAt
                    ? formatDateTime(reservation.payment.confirmedAt)
                    : "Pendiente"
                }
              />
            </dl>
          ) : (
            <p className="text-sm leading-6 text-ink/68">No hay pago asociado todavia.</p>
          )}
        </DetailSection>

        <DetailSection icon={FileText} title="Confirmacion">
          <div className="text-sm leading-6 text-ink/68">
            <p className="font-semibold text-midnight">{reservation.confirmation.documentLabel}</p>
            <p className="mt-1">
              {reservation.confirmation.documentStatus} / {reservation.confirmation.statusLabel}
            </p>
            <ul className="mt-3 grid gap-1 text-xs leading-5">
              {reservation.confirmation.sections.map((section) => (
                <li key={section}>{section}</li>
              ))}
            </ul>
          </div>
        </DetailSection>
      </div>
    </section>
  );
}

function DetailSection({
  children,
  icon: Icon,
  title
}: {
  children: ReactNode;
  icon: LucideIcon;
  title: string;
}) {
  return (
    <section className="border-t border-line pt-4 first:border-t-0 first:pt-0 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0 lg:first:border-l-0 lg:first:pl-0">
      <div className="mb-3 flex items-center gap-2">
        <Icon aria-hidden className="h-5 w-5 text-green" />
        <h3 className="text-sm font-semibold text-midnight">{title}</h3>
      </div>
      {children}
    </section>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-h-14 rounded-[6px] border border-line bg-white px-3 py-2">
      <dt className="text-[0.68rem] font-semibold uppercase text-ink/45">{label}</dt>
      <dd className="mt-1 break-words text-sm font-semibold text-midnight">{value}</dd>
    </div>
  );
}

function NextStayPanel({ reservation }: { reservation: GuestReservation | null }) {
  if (!reservation) {
    return (
      <section className="rounded-[8px] border border-line bg-white p-6 shadow-soft">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-[6px] bg-green/10 text-green">
            <DoorOpen aria-hidden className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-green">Proxima llegada</p>
            <h2 className="text-lg font-semibold text-midnight">Pendiente</h2>
          </div>
        </div>
        <p className="mt-5 text-sm leading-6 text-ink/68">
          No hay una reserva confirmada futura asociada a esta cuenta.
        </p>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-[8px] border border-line bg-white shadow-soft">
      <div className="grid gap-0 lg:grid-cols-[260px_minmax(0,1fr)]">
        <div className="relative min-h-52 bg-midnight lg:min-h-full">
          <Image
            alt={reservation.propertyImageAlt}
            className="object-cover"
            fill
            priority
            sizes="(min-width: 1024px) 260px, 100vw"
            src={reservation.propertyImageUrl}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-midnight/45 to-transparent" />
        </div>
        <div className="p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase text-green">Proxima llegada</p>
              <h2 className="mt-1 font-display text-3xl leading-tight text-midnight">
                {formatDate(reservation.arrivalDate)}
              </h2>
              <p className="mt-2 text-sm leading-6 text-ink/68">
                {reservation.propertyName} / {reservation.unitName}
              </p>
            </div>
            <span
              className={
                "inline-flex w-fit rounded-full border px-3 py-1 text-xs font-semibold " +
                reservationToneClasses[reservation.statusTone]
              }
            >
              {reservation.statusLabel}
            </span>
          </div>

          <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-4">
            <DetailRow label="Destino" value={reservation.propertyDestination} />
            <DetailRow label="Check-in" value={reservation.arrival.checkInWindow} />
            <DetailRow label="Salida" value={formatDate(reservation.departureDate)} />
            <DetailRow label="Reserva" value={reservation.reservationCode} />
          </dl>
        </div>
      </div>
    </section>
  );
}
function AccessState({ isValidating }: { isValidating: boolean }) {
  return (
    <section className="rounded-[8px] border border-line bg-white p-8 text-center shadow-soft">
      <ShieldCheck aria-hidden className="mx-auto h-10 w-10 text-green" />
      <h2 className="mt-4 text-xl font-semibold text-midnight">
        {isValidating ? "Validando sesion de huesped" : "Acceso de huesped requerido"}
      </h2>
      <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-ink/68">
        {isValidating
          ? "La API esta confirmando permisos antes de mostrar reservas."
          : "El portal se carga solamente con una sesion de huesped vigente."}
      </p>
      {!isValidating ? (
        <a
          className="focus-ring mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-[6px] bg-green px-5 text-sm font-semibold text-white transition hover:bg-[#0f5c50]"
          href="/stay"
        >
          <ShieldCheck aria-hidden className="h-4 w-4" />
          Entrar al portal
        </a>
      ) : null}
    </section>
  );
}

function PortalLoadState({ isLoading }: { isLoading: boolean }) {
  return (
    <section className="rounded-[8px] border border-line bg-white p-8 text-center shadow-soft">
      <ShieldCheck aria-hidden className="mx-auto h-10 w-10 text-green" />
      <h2 className="mt-4 text-xl font-semibold text-midnight">
        {isLoading ? "Cargando datos de huesped" : "No se pudo cargar el portal"}
      </h2>
      <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-ink/68">
        {isLoading
          ? "Estamos preparando tus reservas y estados."
          : "No pudimos cargar tus reservas. Intenta de nuevo en unos minutos."}
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
      <span className="inline-flex w-fit items-center rounded-full border border-line bg-white px-3 py-1 text-xs font-semibold text-midnight/72">
        {value}
      </span>
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-GT", {
    dateStyle: "medium",
    timeZone: "UTC"
  }).format(new Date(value + "T00:00:00.000Z"));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("es-GT", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function formatCurrency(amount: string, currency: string) {
  return new Intl.NumberFormat("es-GT", {
    currency,
    style: "currency"
  }).format(Number(amount));
}
