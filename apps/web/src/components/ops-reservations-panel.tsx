"use client";

import {
  CalendarDays,
  ClipboardList,
  CreditCard,
  Mail,
  RefreshCw,
  Unlock,
  XCircle
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { getDevPortalApiBaseUrl } from "./use-dev-portal-session";

type ReservationStatus =
  "HOLD" | "PENDING_PAYMENT" | "CONFIRMED" | "CANCELLED" | "COMPLETED" | "EXPIRED";
type StatusFilter = ReservationStatus | "ALL";
type LoadState = "loading" | "ready" | "error";
type Notice = { kind: "success" | "error"; text: string } | null;

type Metric = {
  hint: string;
  label: string;
  value: string;
};

type StatusOption = {
  label: string;
  value: ReservationStatus;
};

type ReservationAuditEvent = {
  action: string;
  createdAt: string;
  id: string;
  reason?: string | null;
  result: string;
};

type OpsReservation = {
  arrivalDate: string;
  auditEvents: ReservationAuditEvent[];
  canCancel: boolean;
  canExpire: boolean;
  createdAt: string;
  currency: string;
  departureDate: string;
  guest: {
    email: string;
    fullName: string;
    phone?: string | null;
  };
  holdExpiresAt?: string | null;
  id: string;
  isExpiredHold: boolean;
  nights: number;
  payment: {
    amount: string;
    confirmedAt?: string | null;
    currency: string;
    expiresAt?: string | null;
    failedAt?: string | null;
    id: string;
    provider: string;
    providerRef: string;
    status: string;
    statusLabel: string;
  } | null;
  privateCode: string;
  property: {
    destination: string;
    id: string;
    name: string;
  };
  status: ReservationStatus;
  statusLabel: string;
  total: string;
  unit: {
    id: string;
    name: string;
  };
  updatedAt: string;
};

type OpsAvailabilityBlock = {
  endsOn: string;
  id: string;
  note?: string | null;
  property: {
    destination: string;
    id: string;
    name: string;
  };
  reason: string;
  reasonLabel: string;
  startsOn: string;
  unit: {
    id: string;
    name: string;
  };
  updatedAt: string;
};

type OpsReservationsDashboard = {
  availabilityBlocks: OpsAvailabilityBlock[];
  generatedAt: string;
  metrics: Metric[];
  reservationStatusOptions: StatusOption[];
  reservations: OpsReservation[];
};

type ReservationsResponse = {
  reservations: OpsReservationsDashboard;
};

type CalendarDay = {
  date: Date;
  dayLabel: string;
  key: string;
  monthLabel: string;
};

type CalendarEventTone = "confirmed" | "hold" | "pending" | "owner" | "ops" | "maintenance";

type CalendarEvent = {
  endsOn: string;
  id: string;
  label: string;
  reservationId?: string;
  startsOn: string;
  tone: CalendarEventTone;
  type: "block" | "reservation";
};

type CalendarUnit = {
  events: CalendarEvent[];
  key: string;
  propertyName: string;
  unitName: string;
};

export function OpsReservationsPanel({ sessionToken }: { sessionToken: string }) {
  const [dashboard, setDashboard] = useState<OpsReservationsDashboard | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [selectedReservationId, setSelectedReservationId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [confirmationId, setConfirmationId] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice>(null);

  useEffect(() => {
    void loadReservations();
  }, [sessionToken]);

  const visibleReservations = useMemo(() => {
    const reservations = dashboard?.reservations ?? [];
    return statusFilter === "ALL"
      ? reservations
      : reservations.filter((reservation) => reservation.status === statusFilter);
  }, [dashboard, statusFilter]);

  const calendarDays = useMemo(
    () => buildCalendarDays(dashboard?.generatedAt),
    [dashboard?.generatedAt]
  );

  const calendarUnits = useMemo(
    () => buildCalendarUnits(dashboard?.reservations ?? [], dashboard?.availabilityBlocks ?? []),
    [dashboard]
  );

  const selectedReservation = useMemo(() => {
    if (!dashboard) {
      return null;
    }

    return (
      dashboard.reservations.find((reservation) => reservation.id === selectedReservationId) ??
      visibleReservations[0] ??
      null
    );
  }, [dashboard, selectedReservationId, visibleReservations]);

  async function loadReservations() {
    setLoadState("loading");
    setNotice(null);

    try {
      const response = await fetchReservations(sessionToken);
      setDashboard(response.reservations);
      setSelectedReservationId(
        (current) => current ?? response.reservations.reservations[0]?.id ?? null
      );
      setLoadState("ready");
    } catch {
      setLoadState("error");
    }
  }

  async function handleStatusAction(reservation: OpsReservation, status: "CANCELLED" | "EXPIRED") {
    setUpdatingId(reservation.id);
    setNotice(null);

    try {
      const response = await patchReservationStatus(reservation.id, status, sessionToken);
      setDashboard(response.reservations);
      setSelectedReservationId(response.reservation.id);
      setNotice({
        kind: "success",
        text: status === "EXPIRED" ? "Hold liberado y auditado." : "Reserva cancelada y auditada."
      });
    } catch {
      setNotice({ kind: "error", text: "No se pudo actualizar la reserva." });
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleConfirmationDev(reservation: OpsReservation) {
    setConfirmationId(reservation.id);
    setNotice(null);

    try {
      const response = await postReservationConfirmationDev(reservation.id, sessionToken);
      setDashboard(response.reservations);
      setSelectedReservationId(response.reservation.id);
      setNotice({
        kind: "success",
        text: `Confirmacion dev registrada para ${response.confirmation.targetMasked}.`
      });
    } catch {
      setNotice({ kind: "error", text: "No se pudo registrar la confirmacion dev." });
    } finally {
      setConfirmationId(null);
    }
  }

  return (
    <section className="mt-7 border-y border-line py-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-[6px] bg-green/10 text-green">
            <CalendarDays aria-hidden className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-green">Reservas y disponibilidad</p>
            <h2 className="text-2xl font-semibold text-midnight">Control operativo</h2>
          </div>
        </div>
        <button
          className="focus-ring inline-flex min-h-10 items-center justify-center gap-2 rounded-[6px] border border-line bg-white px-4 text-sm font-semibold text-midnight transition hover:border-green hover:text-green disabled:cursor-not-allowed disabled:opacity-60"
          disabled={loadState === "loading"}
          onClick={loadReservations}
          type="button"
        >
          <RefreshCw aria-hidden className="h-4 w-4" />
          Actualizar
        </button>
      </div>

      {notice ? (
        <div
          className={`mt-5 rounded-[6px] border p-4 text-sm ${notice.kind === "success" ? "border-green/24 bg-green/10 text-midnight" : "border-terracotta/30 bg-terracotta/10 text-midnight"}`}
        >
          {notice.text}
        </div>
      ) : null}

      {loadState === "loading" ? <StatePanel text="Sincronizando reservas." /> : null}
      {loadState === "error" ? (
        <StatePanel text="No se pudo cargar reservas y disponibilidad." />
      ) : null}

      {loadState === "ready" && dashboard ? (
        <>
          <div className="mt-5 grid gap-4 md:grid-cols-4">
            {dashboard.metrics.map((metric) => (
              <div
                className="rounded-[8px] border border-line bg-white p-4 shadow-soft"
                key={metric.label}
              >
                <p className="text-xs font-semibold uppercase text-ink/45">{metric.label}</p>
                <p className="mt-2 text-2xl font-semibold text-midnight">{metric.value}</p>
                <p className="mt-1 text-xs text-ink/58">{metric.hint}</p>
              </div>
            ))}
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-2 rounded-[8px] border border-line bg-white p-2 shadow-soft">
            <FilterButton
              active={statusFilter === "ALL"}
              label="Todos"
              onClick={() => setStatusFilter("ALL")}
            />
            {dashboard.reservationStatusOptions.map((option) => (
              <FilterButton
                active={statusFilter === option.value}
                key={option.value}
                label={option.label}
                onClick={() => setStatusFilter(option.value)}
              />
            ))}
          </div>

          <AvailabilityCalendar
            days={calendarDays}
            onSelectReservation={setSelectedReservationId}
            units={calendarUnits}
          />

          <div className="mt-5 grid gap-6 2xl:grid-cols-[minmax(0,1fr)_420px]">
            <ReservationsTable
              onSelect={setSelectedReservationId}
              onStatusAction={handleStatusAction}
              reservations={visibleReservations}
              selectedReservationId={selectedReservation?.id ?? null}
              updatingId={updatingId}
            />
            <ReservationDetailPanel
              confirmationId={confirmationId}
              onConfirmationDev={handleConfirmationDev}
              onStatusAction={handleStatusAction}
              reservation={selectedReservation}
              updatingId={updatingId}
            />
          </div>
          <AvailabilityBlocksTable
            blocks={dashboard.availabilityBlocks}
            generatedAt={dashboard.generatedAt}
          />
        </>
      ) : null}
    </section>
  );
}

function AvailabilityCalendar({
  days,
  onSelectReservation,
  units
}: {
  days: CalendarDay[];
  onSelectReservation: (reservationId: string) => void;
  units: CalendarUnit[];
}) {
  return (
    <div className="mt-6 rounded-[8px] border border-line bg-white p-4 shadow-soft">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase text-green">Calendario</p>
          <h3 className="mt-1 text-xl font-semibold text-midnight">
            Ocupacion por propiedad y unidad
          </h3>
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-semibold text-ink/64">
          <LegendDot label="Confirmada" tone="confirmed" />
          <LegendDot label="Hold" tone="hold" />
          <LegendDot label="Pendiente pago" tone="pending" />
          <LegendDot label="Owner" tone="owner" />
          <LegendDot label="Ops" tone="ops" />
          <LegendDot label="Mantenimiento" tone="maintenance" />
        </div>
      </div>

      {units.length === 0 ? (
        <StatePanel text="No hay ocupacion ni bloqueos para mostrar en calendario." />
      ) : (
        <div className="mt-4 overflow-x-auto">
          <div className="min-w-[1760px]">
            <div className="grid grid-cols-[220px_repeat(60,minmax(24px,1fr))] border-b border-line text-xs">
              <div className="sticky left-0 z-10 bg-white px-3 py-2 font-semibold uppercase text-ink/45">
                Unidad
              </div>
              {days.map((day) => (
                <div className="border-l border-line px-1 py-2 text-center" key={day.key}>
                  <p className="font-semibold text-midnight">{day.dayLabel}</p>
                  <p className="mt-1 text-[0.65rem] uppercase text-ink/45">{day.monthLabel}</p>
                </div>
              ))}
            </div>
            <div className="divide-y divide-line">
              {units.map((unit) => (
                <div
                  className="grid grid-cols-[220px_repeat(60,minmax(24px,1fr))] text-xs"
                  key={unit.key}
                >
                  <div className="sticky left-0 z-10 bg-white px-3 py-3">
                    <p className="font-semibold text-midnight">{unit.propertyName}</p>
                    <p className="mt-1 text-ink/58">{unit.unitName}</p>
                  </div>
                  {days.map((day) => {
                    const events = unit.events.filter((event) => eventOverlapsDay(event, day.date));
                    const primaryEvent = events[0] ?? null;

                    return (
                      <button
                        aria-label={primaryEvent ? primaryEvent.label : "Disponible"}
                        className={`min-h-12 border-l border-line px-1 py-2 text-left transition hover:bg-green/10 ${primaryEvent ? calendarToneClass(primaryEvent.tone) : "bg-white"}`}
                        disabled={!primaryEvent?.reservationId}
                        key={day.key}
                        onClick={() => {
                          if (primaryEvent?.reservationId) {
                            onSelectReservation(primaryEvent.reservationId);
                          }
                        }}
                        title={events.map((event) => event.label).join(" | ") || "Disponible"}
                        type="button"
                      >
                        {primaryEvent ? (
                          <span className="block truncate text-[0.65rem] font-semibold">
                            {primaryEvent.label}
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function LegendDot({ label, tone }: { label: string; tone: CalendarEventTone }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className={`h-3 w-3 rounded-sm ${calendarToneClass(tone)}`} />
      {label}
    </span>
  );
}
function ReservationsTable({
  onSelect,
  onStatusAction,
  reservations,
  selectedReservationId,
  updatingId
}: {
  onSelect: (reservationId: string) => void;
  onStatusAction: (reservation: OpsReservation, status: "CANCELLED" | "EXPIRED") => void;
  reservations: OpsReservation[];
  selectedReservationId: string | null;
  updatingId: string | null;
}) {
  if (reservations.length === 0) {
    return <StatePanel text="No hay reservas para el filtro seleccionado." />;
  }

  return (
    <div className="max-h-[620px] overflow-auto rounded-[8px] border border-line bg-white shadow-soft">
      <table className="w-full min-w-[980px] border-separate border-spacing-0 text-left text-sm">
        <thead className="sticky top-0 z-20 bg-ivory text-xs uppercase text-ink/48 shadow-[0_1px_0_rgba(17,24,39,0.08)]">
          <tr>
            <th className="px-4 py-3 font-semibold">Reserva</th>
            <th className="px-4 py-3 font-semibold">Propiedad</th>
            <th className="px-4 py-3 font-semibold">Fechas</th>
            <th className="px-4 py-3 font-semibold">Huesped</th>
            <th className="px-4 py-3 font-semibold">Pago</th>
            <th className="sticky right-0 z-30 bg-ivory px-4 py-3 font-semibold shadow-[-1px_0_0_rgba(17,24,39,0.08)]">
              Acciones
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {reservations.map((reservation) => (
            <tr
              className={`cursor-pointer align-top transition hover:bg-ivory/60 ${reservation.id === selectedReservationId ? "bg-green/5" : ""}`}
              key={reservation.id}
              onClick={() => onSelect(reservation.id)}
            >
              <td className="px-4 py-4">
                <p className="font-semibold text-midnight">{reservation.privateCode}</p>
                <p className="mt-1 text-xs text-ink/58">{reservation.statusLabel}</p>
                {reservation.isExpiredHold ? (
                  <p className="mt-1 text-xs font-semibold text-terracotta">Hold vencido</p>
                ) : null}
              </td>
              <td className="px-4 py-4">
                <p className="font-semibold text-midnight">{reservation.property.name}</p>
                <p className="mt-1 text-xs text-ink/58">{reservation.unit.name}</p>
                <p className="mt-1 text-xs text-ink/58">{reservation.property.destination}</p>
              </td>
              <td className="px-4 py-4 text-xs text-ink/64">
                <p className="font-semibold text-midnight">
                  {formatDate(reservation.arrivalDate)} - {formatDate(reservation.departureDate)}
                </p>
                <p className="mt-1">{reservation.nights} noche(s)</p>
                <p className="mt-1">
                  Hold:{" "}
                  {reservation.holdExpiresAt
                    ? formatDateTime(reservation.holdExpiresAt)
                    : "No aplica"}
                </p>
              </td>
              <td className="px-4 py-4 text-xs text-ink/64">
                <p className="font-semibold text-midnight">{reservation.guest.fullName}</p>
                <p className="mt-1">{reservation.guest.email}</p>
                <p className="mt-1">{reservation.guest.phone ?? "Sin telefono"}</p>
              </td>
              <td className="px-4 py-4 text-xs text-ink/64">
                <div className="flex items-center gap-2 font-semibold text-midnight">
                  <CreditCard aria-hidden className="h-4 w-4 text-green" />
                  {formatCurrency(reservation.total, reservation.currency)}
                </div>
                <p className="mt-1">
                  {reservation.payment ? reservation.payment.statusLabel : "Sin pago"}
                </p>
                <p className="mt-1">{reservation.payment?.providerRef ?? "-"}</p>
              </td>
              <td
                className="sticky right-0 bg-white px-4 py-4 shadow-[-1px_0_0_rgba(17,24,39,0.08)]"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="flex flex-wrap gap-2">
                  {reservation.canExpire ? (
                    <ActionButton
                      disabled={updatingId === reservation.id}
                      icon="unlock"
                      label="Liberar"
                      onClick={() => onStatusAction(reservation, "EXPIRED")}
                    />
                  ) : null}
                  {reservation.canCancel ? (
                    <ActionButton
                      disabled={updatingId === reservation.id}
                      icon="cancel"
                      label="Cancelar"
                      onClick={() => onStatusAction(reservation, "CANCELLED")}
                    />
                  ) : null}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ReservationDetailPanel({
  confirmationId,
  onConfirmationDev,
  onStatusAction,
  reservation,
  updatingId
}: {
  confirmationId: string | null;
  onConfirmationDev: (reservation: OpsReservation) => void;
  onStatusAction: (reservation: OpsReservation, status: "CANCELLED" | "EXPIRED") => void;
  reservation: OpsReservation | null;
  updatingId: string | null;
}) {
  if (!reservation) {
    return <StatePanel text="Selecciona una reserva para ver el detalle operativo." />;
  }

  return (
    <aside className="rounded-[8px] border border-line bg-white p-5 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase text-green">Detalle reserva</p>
          <h3 className="mt-1 text-xl font-semibold text-midnight">{reservation.privateCode}</h3>
          <p className="mt-1 text-sm text-ink/64">{reservation.statusLabel}</p>
        </div>
        <ClipboardList aria-hidden className="h-5 w-5 text-green" />
      </div>

      <dl className="mt-5 grid gap-3 text-sm">
        <DetailRow
          label="Propiedad"
          value={`${reservation.property.name} / ${reservation.unit.name}`}
        />
        <DetailRow
          label="Fechas"
          value={`${formatDate(reservation.arrivalDate)} - ${formatDate(reservation.departureDate)}`}
        />
        <DetailRow
          label="Huesped"
          value={`${reservation.guest.fullName} / ${reservation.guest.email}`}
        />
        <DetailRow label="Total" value={formatCurrency(reservation.total, reservation.currency)} />
        <DetailRow
          label="Pago"
          value={
            reservation.payment
              ? `${reservation.payment.statusLabel} / ${reservation.payment.providerRef}`
              : "Sin pago"
          }
        />
        <DetailRow label="Creada" value={formatDateTime(reservation.createdAt)} />
        <DetailRow label="Actualizada" value={formatDateTime(reservation.updatedAt)} />
      </dl>

      <div className="mt-5 flex flex-wrap items-center gap-2 rounded-[8px] border border-line bg-white p-2 shadow-soft">
        <button
          className="focus-ring inline-flex min-h-10 items-center justify-center gap-2 rounded-[6px] bg-green px-3 text-xs font-semibold text-white transition hover:bg-[#0f5c50] disabled:cursor-not-allowed disabled:opacity-60"
          disabled={reservation.status !== "CONFIRMED" || confirmationId === reservation.id}
          onClick={() => onConfirmationDev(reservation)}
          type="button"
        >
          <Mail aria-hidden className="h-4 w-4" />
          Confirmacion dev
        </button>
        {reservation.canExpire ? (
          <ActionButton
            disabled={updatingId === reservation.id}
            icon="unlock"
            label="Liberar hold"
            onClick={() => onStatusAction(reservation, "EXPIRED")}
          />
        ) : null}
        {reservation.canCancel ? (
          <ActionButton
            disabled={updatingId === reservation.id}
            icon="cancel"
            label="Cancelar"
            onClick={() => onStatusAction(reservation, "CANCELLED")}
          />
        ) : null}
      </div>

      <div className="mt-6 border-t border-line pt-5">
        <p className="text-xs font-semibold uppercase text-green">Auditoria reciente</p>
        {reservation.auditEvents.length === 0 ? (
          <p className="mt-3 text-sm text-ink/58">Sin eventos contextuales para esta reserva.</p>
        ) : (
          <ol className="mt-3 space-y-3">
            {reservation.auditEvents.map((event) => (
              <li className="rounded-[6px] border border-line bg-ivory p-3 text-xs" key={event.id}>
                <p className="font-semibold text-midnight">{event.action}</p>
                <p className="mt-1 text-ink/58">
                  {event.result} / {event.reason ?? "sin razon"}
                </p>
                <p className="mt-1 text-ink/48">{formatDateTime(event.createdAt)}</p>
              </li>
            ))}
          </ol>
        )}
      </div>
    </aside>
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

function AvailabilityBlocksTable({
  blocks,
  generatedAt
}: {
  blocks: OpsAvailabilityBlock[];
  generatedAt: string;
}) {
  return (
    <div className="mt-7">
      <div className="flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase text-green">Disponibilidad</p>
          <h3 className="text-xl font-semibold text-midnight">Bloqueos operativos proximos</h3>
        </div>
        <p className="text-xs text-ink/54">Actualizado {formatDateTime(generatedAt)}</p>
      </div>
      {blocks.length === 0 ? (
        <StatePanel text="No hay bloqueos manuales futuros." />
      ) : (
        <div className="mt-4 max-h-[420px] overflow-auto rounded-[8px] border border-line bg-white shadow-soft">
          <table className="w-full min-w-[760px] border-separate border-spacing-0 text-left text-sm">
            <thead className="sticky top-0 z-20 bg-ivory text-xs uppercase text-ink/48 shadow-[0_1px_0_rgba(17,24,39,0.08)]">
              <tr>
                <th className="px-4 py-3 font-semibold">Propiedad</th>
                <th className="px-4 py-3 font-semibold">Fechas</th>
                <th className="px-4 py-3 font-semibold">Motivo</th>
                <th className="px-4 py-3 font-semibold">Nota</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {blocks.map((block) => (
                <tr className="align-top" key={block.id}>
                  <td className="px-4 py-4">
                    <p className="font-semibold text-midnight">{block.property.name}</p>
                    <p className="mt-1 text-xs text-ink/58">{block.unit.name}</p>
                  </td>
                  <td className="px-4 py-4 text-xs text-ink/64">
                    {formatDate(block.startsOn)} - {formatDate(block.endsOn)}
                  </td>
                  <td className="px-4 py-4 text-xs font-semibold text-midnight">
                    {block.reasonLabel}
                  </td>
                  <td className="px-4 py-4 text-xs text-ink/64">{block.note ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function FilterButton({
  active,
  label,
  onClick
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={`focus-ring min-h-10 rounded-[6px] border px-3 text-sm font-semibold transition ${active ? "border-midnight bg-midnight text-white" : "border-line bg-white text-midnight hover:border-midnight"}`}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}

function ActionButton({
  disabled,
  icon,
  label,
  onClick
}: {
  disabled: boolean;
  icon: "cancel" | "unlock";
  label: string;
  onClick: () => void;
}) {
  const Icon = icon === "unlock" ? Unlock : XCircle;
  return (
    <button
      className="focus-ring inline-flex min-h-9 items-center justify-center gap-2 rounded-[6px] border border-line bg-white px-3 text-xs font-semibold text-midnight transition hover:border-green hover:text-green disabled:cursor-not-allowed disabled:opacity-60"
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      <Icon aria-hidden className="h-4 w-4" />
      {label}
    </button>
  );
}

function StatePanel({ text }: { text: string }) {
  return (
    <div className="mt-5 rounded-[8px] border border-line bg-white p-6 text-sm text-ink/62 shadow-soft">
      {text}
    </div>
  );
}

async function fetchReservations(sessionToken: string): Promise<ReservationsResponse> {
  const response = await fetch(`${getDevPortalApiBaseUrl()}/api/ops/reservations`, {
    headers: { "x-kuquba-dev-session": sessionToken }
  });
  const payload = (await response.json().catch(() => ({}))) as ReservationsResponse & {
    error?: string;
  };

  if (!response.ok) {
    throw new Error(payload.error ?? "reservations_request_failed");
  }

  return payload;
}

async function patchReservationStatus(
  reservationId: string,
  status: "CANCELLED" | "EXPIRED",
  sessionToken: string
): Promise<ReservationsResponse & { reservation: OpsReservation }> {
  const response = await fetch(
    `${getDevPortalApiBaseUrl()}/api/ops/reservations/${reservationId}/status`,
    {
      body: JSON.stringify({ status }),
      headers: {
        "content-type": "application/json",
        "x-kuquba-dev-session": sessionToken
      },
      method: "PATCH"
    }
  );
  const payload = (await response.json().catch(() => ({}))) as ReservationsResponse & {
    error?: string;
    reservation: OpsReservation;
  };

  if (!response.ok) {
    throw new Error(payload.error ?? "reservation_status_update_failed");
  }

  return payload;
}

async function postReservationConfirmationDev(
  reservationId: string,
  sessionToken: string
): Promise<
  ReservationsResponse & { confirmation: { targetMasked: string }; reservation: OpsReservation }
> {
  const response = await fetch(
    `${getDevPortalApiBaseUrl()}/api/ops/reservations/${reservationId}/confirmation-dev`,
    {
      body: JSON.stringify({}),
      headers: {
        "content-type": "application/json",
        "x-kuquba-dev-session": sessionToken
      },
      method: "POST"
    }
  );
  const payload = (await response.json().catch(() => ({}))) as ReservationsResponse & {
    confirmation: { targetMasked: string };
    error?: string;
    reservation: OpsReservation;
  };

  if (!response.ok) {
    throw new Error(payload.error ?? "reservation_confirmation_dev_failed");
  }

  return payload;
}

function buildCalendarDays(generatedAt?: string) {
  const start = generatedAt ? new Date(generatedAt) : new Date();
  const startDate = new Date(
    Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate())
  );

  return Array.from({ length: 60 }, (_, index) => {
    const date = addDays(startDate, index);
    return {
      date,
      dayLabel: new Intl.DateTimeFormat("es-GT", { day: "2-digit", timeZone: "UTC" }).format(date),
      key: toDateKey(date),
      monthLabel: new Intl.DateTimeFormat("es-GT", { month: "short", timeZone: "UTC" }).format(date)
    };
  });
}

function buildCalendarUnits(reservations: OpsReservation[], blocks: OpsAvailabilityBlock[]) {
  const units = new Map<string, CalendarUnit>();

  for (const reservation of reservations) {
    if (!["HOLD", "PENDING_PAYMENT", "CONFIRMED"].includes(reservation.status)) {
      continue;
    }

    const key = `${reservation.property.id}:${reservation.unit.id}`;
    const unit = ensureCalendarUnit(units, key, reservation.property.name, reservation.unit.name);
    unit.events.push({
      endsOn: reservation.departureDate,
      id: reservation.id,
      label: `${reservation.statusLabel} ${reservation.privateCode}`,
      reservationId: reservation.id,
      startsOn: reservation.arrivalDate,
      tone:
        reservation.status === "CONFIRMED"
          ? "confirmed"
          : reservation.status === "PENDING_PAYMENT"
            ? "pending"
            : "hold",
      type: "reservation"
    });
  }

  for (const block of blocks) {
    const key = `${block.property.id}:${block.unit.id}`;
    const unit = ensureCalendarUnit(units, key, block.property.name, block.unit.name);
    unit.events.push({
      endsOn: block.endsOn,
      id: block.id,
      label: block.reasonLabel,
      startsOn: block.startsOn,
      tone:
        block.reason === "MAINTENANCE"
          ? "maintenance"
          : block.reason === "OPS_HOLD"
            ? "ops"
            : "owner",
      type: "block"
    });
  }

  return Array.from(units.values()).sort((a, b) =>
    `${a.propertyName} ${a.unitName}`.localeCompare(`${b.propertyName} ${b.unitName}`)
  );
}

function ensureCalendarUnit(
  units: Map<string, CalendarUnit>,
  key: string,
  propertyName: string,
  unitName: string
) {
  const existing = units.get(key);
  if (existing) {
    return existing;
  }

  const unit = { events: [], key, propertyName, unitName } satisfies CalendarUnit;
  units.set(key, unit);
  return unit;
}

function eventOverlapsDay(event: CalendarEvent, date: Date) {
  const startsOn = parseDateOnly(event.startsOn).getTime();
  const endsOn = parseDateOnly(event.endsOn).getTime();
  const day = date.getTime();
  return day >= startsOn && day < endsOn;
}

function parseDateOnly(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function calendarToneClass(tone: CalendarEventTone) {
  const classes: Record<CalendarEventTone, string> = {
    confirmed: "bg-green/90 text-white",
    hold: "bg-[#f0b35a] text-midnight",
    maintenance: "bg-terracotta/85 text-white",
    ops: "bg-midnight/85 text-white",
    owner: "bg-[#6f8f9d] text-white",
    pending: "bg-[#d7c36a] text-midnight"
  };

  return classes[tone];
}
function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-GT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC"
  }).format(new Date(`${value}T00:00:00.000Z`));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("es-GT", { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(value)
  );
}

function formatCurrency(amount: string, currency: string) {
  return new Intl.NumberFormat("es-GT", { currency, style: "currency" }).format(Number(amount));
}
