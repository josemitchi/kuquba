"use client";

import {
  ArrowLeft,
  BadgeCheck,
  CalendarCheck2,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Clock3,
  CreditCard,
  DoorOpen,
  FileText,
  LogOut,
  ShieldCheck,
  UserRound,
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
  GuestPortalSnapshot,
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
            <AccountMenu isValidating={isValidating} onLogout={handleLogout} session={session} />
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
            <GuestDashboard snapshot={portal} />
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

function GuestDashboard({ snapshot }: { snapshot: GuestPortalSnapshot }) {
  const [selectedReservationId, setSelectedReservationId] = useState<string | null>(
    snapshot.nextStay?.id ?? snapshot.reservations[0]?.id ?? null
  );
  const summaryMetrics = snapshot.metrics.filter((metric) => metric.label !== "Proxima llegada");

  useEffect(() => {
    setSelectedReservationId(snapshot.nextStay?.id ?? snapshot.reservations[0]?.id ?? null);
  }, [snapshot.nextStay?.id, snapshot.reservations]);

  function handleReservationDetail(reservationId: string) {
    setSelectedReservationId((current) => (current === reservationId ? null : reservationId));
  }

  return (
    <>
      <NextStayPanel reservation={snapshot.nextStay} />

      {summaryMetrics.length > 0 ? (
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {summaryMetrics.map((metric, index) => (
            <MetricCard icon={metricIcons[index] ?? BadgeCheck} key={metric.label} metric={metric} />
          ))}
        </div>
      ) : null}

      <section className="mt-8">
        <SectionHeading
          eyebrow="Mis reservas"
          title="Reservas y pagos"
          value={String(snapshot.reservations.length) + " registro(s)"}
        />
        <ReservationList
          onSelect={handleReservationDetail}
          reservations={snapshot.reservations}
          selectedReservationId={selectedReservationId}
        />
      </section>
    </>
  );
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

function ReservationList({
  onSelect,
  reservations,
  selectedReservationId
}: {
  onSelect: (reservationId: string) => void;
  reservations: GuestReservation[];
  selectedReservationId: string | null;
}) {
  if (reservations.length === 0) {
    return (
      <section className="mt-5 rounded-[8px] border border-line bg-white p-8 text-center shadow-soft">
        <CalendarCheck2 aria-hidden className="mx-auto h-10 w-10 text-green" />
        <h2 className="mt-4 text-xl font-semibold text-midnight">Sin reservas registradas</h2>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-ink/68">
          Cuando una cotizacion genere una reserva temporal o una reserva confirmada, aparecera
          aqui.
        </p>
      </section>
    );
  }

  return (
    <div className="mt-5 space-y-5">
      {reservations.map((reservation) => (
        <ReservationCard
          isSelected={reservation.id === selectedReservationId}
          key={reservation.id}
          onSelect={onSelect}
          reservation={reservation}
        />
      ))}
    </div>
  );
}

function ReservationCard({
  isSelected,
  onSelect,
  reservation
}: {
  isSelected: boolean;
  onSelect: (reservationId: string) => void;
  reservation: GuestReservation;
}) {
  return (
    <article
      className={`overflow-hidden rounded-[8px] border bg-white shadow-soft ${isSelected ? "border-green" : "border-line"}`}
    >
      <div className="grid gap-5 p-5 lg:grid-cols-[190px_minmax(0,1fr)] lg:p-6">
        <div className="relative min-h-44 overflow-hidden rounded-[6px] border border-line bg-midnight lg:min-h-full">
          <Image
            alt={reservation.propertyImageAlt}
            className="object-cover"
            fill
            sizes="(min-width: 1024px) 190px, 100vw"
            src={reservation.propertyImageUrl}
          />
        </div>

        <div className="min-w-0">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase text-green">
                {reservation.reservationCode}
              </p>
              <h3 className="mt-2 truncate font-display text-3xl leading-tight text-midnight">
                {reservation.propertyName}
              </h3>
              <p className="mt-2 text-sm leading-6 text-ink/68">
                {reservation.unitName} / {reservation.propertyDestination}
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

          <dl className="mt-5 grid gap-3 text-sm text-ink/72 sm:grid-cols-2 xl:grid-cols-4">
            <ReservationFact
              icon={DoorOpen}
              label="Llegada"
              value={formatDate(reservation.arrivalDate)}
            />
            <ReservationFact
              icon={CalendarCheck2}
              label="Salida"
              value={formatDate(reservation.departureDate)}
            />
            <ReservationFact icon={Clock3} label="Noches" value={String(reservation.nights)} />
            <ReservationFact
              icon={CreditCard}
              label="Total"
              value={formatCurrency(reservation.total, reservation.currency)}
            />
          </dl>

          {reservation.payment ? (
            <div className="mt-5 flex gap-3 rounded-[6px] border border-line bg-ivory p-4 text-sm leading-6 text-midnight">
              <CreditCard aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-green" />
              <div>
                <p className="font-semibold">Pago asociado</p>
                <p className="text-ink/68">
                  {reservation.payment.statusLabel} -{" "}
                  {formatCurrency(reservation.payment.amount, reservation.payment.currency)}
                </p>
              </div>
            </div>
          ) : null}

          {reservation.expiresAt && reservation.isActionable ? (
            <div className="mt-5 flex gap-3 rounded-[6px] border border-terracotta/26 bg-terracotta/10 p-4 text-sm leading-6 text-midnight">
              <Clock3 aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-terracotta" />
              <div>
                <p className="font-semibold">Reserva temporal activa</p>
                <p className="text-ink/68">Vence {formatDateTime(reservation.expiresAt)}.</p>
              </div>
            </div>
          ) : null}

          <button
            aria-controls={`guest-reservation-detail-${reservation.id}`}
            aria-expanded={isSelected}
            className="focus-ring mt-5 inline-flex min-h-10 items-center justify-center gap-2 rounded-[6px] border border-line bg-white px-4 text-sm font-semibold text-midnight transition hover:border-green hover:text-green"
            onClick={() => onSelect(reservation.id)}
            type="button"
          >
            <ClipboardList aria-hidden className="h-4 w-4" />
            {isSelected ? "Ocultar detalle" : "Ver detalle"}
          </button>
        </div>
      </div>

      {isSelected ? (
        <div className="border-t border-line bg-white p-5 lg:p-6" id={`guest-reservation-detail-${reservation.id}`}>
          <ReservationDetailPanel reservation={reservation} variant="embedded" />
        </div>
      ) : null}
    </article>
  );
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
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase text-green">Detalle de reserva</p>
          <h2 className="mt-1 text-lg font-semibold text-midnight">
            {reservation.reservationCode}
          </h2>
          <p className="mt-1 text-sm text-ink/64">{reservation.propertyName}</p>
        </div>
        <FileText aria-hidden className="h-5 w-5 text-green" />
      </div>

      <div className="mt-5 grid gap-3 text-sm">
        <DetailRow label="Estado" value={reservation.statusLabel} />
        <DetailRow label="Destino" value={reservation.propertyDestination} />
        <DetailRow label="Unidad" value={reservation.unitName} />
        <DetailRow
          label="Fechas"
          value={`${formatDate(reservation.arrivalDate)} - ${formatDate(reservation.departureDate)}`}
        />
        <DetailRow label="Total" value={formatCurrency(reservation.total, reservation.currency)} />
      </div>

      <div className="mt-6 border-t border-line pt-5">
        <div className="flex items-center gap-2">
          <DoorOpen aria-hidden className="h-5 w-5 text-green" />
          <h3 className="text-sm font-semibold text-midnight">Llegada y check-in</h3>
        </div>
        <dl className="mt-3 grid gap-2 text-sm">
          <DetailRow label="Estado llegada" value={reservation.arrival.readinessLabel} />
          <DetailRow label="Check-in" value={reservation.arrival.checkInWindow} />
          <DetailRow label="Check-out" value={reservation.arrival.checkOutTime} />
        </dl>
        <ul className="mt-3 space-y-2 text-sm leading-6 text-ink/68">
          {reservation.arrival.instructions.map((instruction) => (
            <li className="flex gap-2" key={instruction}>
              <CheckCircle2 aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-green" />
              <span>{instruction}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-6 border-t border-line pt-5">
        <div className="flex items-center gap-2">
          <CreditCard aria-hidden className="h-5 w-5 text-green" />
          <h3 className="text-sm font-semibold text-midnight">Estado de pago</h3>
        </div>
        {reservation.payment ? (
          <div className="mt-3 grid gap-2 text-sm">
            <DetailRow label="Pago" value={reservation.payment.statusLabel} />
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
          </div>
        ) : (
          <p className="mt-3 text-sm leading-6 text-ink/68">No hay pago asociado todavia.</p>
        )}
      </div>

      <div className="mt-6 border-t border-line pt-5">
        <div className="flex items-center gap-2">
          <FileText aria-hidden className="h-5 w-5 text-green" />
          <h3 className="text-sm font-semibold text-midnight">Confirmacion</h3>
        </div>
        <div className="mt-3 rounded-[6px] border border-line bg-ivory p-4 text-sm">
          <p className="font-semibold text-midnight">{reservation.confirmation.documentLabel}</p>
          <p className="mt-1 text-ink/64">
            {reservation.confirmation.documentStatus} / {reservation.confirmation.statusLabel}
          </p>
          <ul className="mt-3 space-y-1 text-xs leading-5 text-ink/64">
            {reservation.confirmation.sections.map((section) => (
              <li key={section}>{section}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[6px] border border-line bg-ivory px-3 py-2">
      <dt className="text-xs font-semibold uppercase text-ink/45">{label}</dt>
      <dd className="mt-1 break-words font-semibold text-midnight">{value}</dd>
    </div>
  );
}
function ReservationFact({
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

          <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-3">
            <SessionRow label="Destino" value={reservation.propertyDestination} />
            <SessionRow label="Salida" value={formatDate(reservation.departureDate)} />
            <SessionRow label="Reserva" value={reservation.reservationCode} />
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

function SessionRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-line pb-3 last:border-0 last:pb-0">
      <dt className="text-ink/52">{label}</dt>
      <dd className="text-right font-semibold text-midnight">{value}</dd>
    </div>
  );
}

function formatSessionExpiry(value: string) {
  return new Intl.DateTimeFormat("es-GT", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
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
