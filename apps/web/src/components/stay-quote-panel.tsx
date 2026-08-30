"use client";

import {
  AlertCircle,
  Calculator,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  Loader2,
  ShieldCheck,
  XCircle
} from "lucide-react";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";

type QuoteSubmitState = "idle" | "submitting" | "success" | "error";
type HoldSubmitState = "idle" | "submitting" | "success" | "error";
type CheckoutActionState = "idle" | "starting" | "confirming" | "failing" | "success" | "error";

type StayQuoteLineItem = {
  amount: string;
  key: string;
  label: string;
};

type StayQuote = {
  arrivalDate: string;
  available: boolean;
  currency: string;
  departureDate: string;
  expiresAt: string;
  guests: number;
  id: string;
  lineItems: StayQuoteLineItem[];
  nights: number;
  notice: string;
  propertyName: string;
  status: "AVAILABLE" | "UNAVAILABLE";
  total: string;
  unitName: string;
  unavailableReason: string | null;
  unavailableReasonLabel: string | null;
};

type ReservationHold = {
  arrivalDate: string;
  currency: string;
  departureDate: string;
  expiresAt: string | null;
  id: string;
  nights: number;
  propertyName: string;
  reservationCode: string;
  status: string;
  statusLabel: string;
  total: string;
  unitName: string;
};

type PaymentCheckout = {
  amount: string;
  checkoutUrl: string | null;
  confirmedAt: string | null;
  currency: string;
  expiresAt: string | null;
  failedAt: string | null;
  failureReason: string | null;
  id: string;
  provider: string;
  providerRef: string;
  reservationId: string;
  status: "PENDING" | "SUCCEEDED" | "FAILED" | "EXPIRED";
  statusLabel: string;
};

type StayQuoteResponse = {
  quote: StayQuote;
};

type StayHoldResponse = {
  hold: ReservationHold;
};

type PaymentCheckoutResponse = {
  checkout: PaymentCheckout;
  reservation: ReservationHold;
};

type StayAvailabilityStatus =
  | "AVAILABLE"
  | "RESERVED"
  | "HOLD"
  | "MAINTENANCE"
  | "OWNER_HOLD"
  | "OPS_HOLD"
  | "RATE_MISSING"
  | "CAPACITY_EXCEEDED";

type StayAvailabilityDay = {
  date: string;
  reason: string | null;
  status: StayAvailabilityStatus;
  statusLabel: string;
};

type StayAvailability = {
  days: StayAvailabilityDay[];
  generatedAt: string;
  nextAvailableRange: { arrivalDate: string; departureDate: string; nights: number } | null;
  propertyName: string;
  recommendedNights: number;
  stayId: string;
  unitName: string;
};

type StayAvailabilityResponse = {
  availability: StayAvailability;
};

type AvailabilityLoadState = "idle" | "loading" | "success" | "error";

export function StayQuotePanel({
  defaultGuests,
  maxGuests,
  stayId
}: {
  defaultGuests: number;
  maxGuests: number;
  stayId: string;
}) {
  const [submitState, setSubmitState] = useState<QuoteSubmitState>("idle");
  const [holdSubmitState, setHoldSubmitState] = useState<HoldSubmitState>("idle");
  const [checkoutActionState, setCheckoutActionState] = useState<CheckoutActionState>("idle");
  const [quote, setQuote] = useState<StayQuote | null>(null);
  const [hold, setHold] = useState<ReservationHold | null>(null);
  const [checkout, setCheckout] = useState<PaymentCheckout | null>(null);
  const [arrivalDate, setArrivalDate] = useState("");
  const [departureDate, setDepartureDate] = useState("");
  const [guests, setGuests] = useState(defaultGuests);
  const [availability, setAvailability] = useState<StayAvailability | null>(null);
  const [availabilityState, setAvailabilityState] = useState<AvailabilityLoadState>("idle");
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);
  const [holdError, setHoldError] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [guestEmail, setGuestEmail] = useState("");
  const router = useRouter();

  useEffect(() => {
    let isMounted = true;
    setAvailabilityState("loading");
    setAvailabilityError(null);

    const query = new URLSearchParams({
      days: "60",
      guests: String(guests),
      nights: "2"
    });

    getJson<StayAvailabilityResponse>(
      `/api/public/stays/${stayId}/availability?${query.toString()}`
    )
      .then((response) => {
        if (!isMounted) {
          return;
        }

        setAvailability(response.availability);
        setAvailabilityState("success");
      })
      .catch((error) => {
        if (!isMounted) {
          return;
        }

        setAvailability(null);
        setAvailabilityError(error instanceof Error ? error.message : "availability_load_failed");
        setAvailabilityState("error");
      });

    return () => {
      isMounted = false;
    };
  }, [guests, stayId]);

  function handleAvailabilityDaySelect(day: StayAvailabilityDay) {
    if (day.status !== "AVAILABLE") {
      return;
    }

    setArrivalDate(day.date);
    setDepartureDate(addDateOnlyDays(day.date, availability?.recommendedNights ?? 2));
    resetHoldAndCheckout();
    setQuote(null);
    setSubmitState("idle");
  }

  function handleSuggestedRangeSelect() {
    if (!availability?.nextAvailableRange) {
      return;
    }

    setArrivalDate(availability.nextAvailableRange.arrivalDate);
    setDepartureDate(availability.nextAvailableRange.departureDate);
    resetHoldAndCheckout();
    setQuote(null);
    setSubmitState("idle");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitState("submitting");
    resetHoldAndCheckout();
    setQuote(null);

    const payload = {
      arrivalDate,
      departureDate,
      guests,
      stayId
    };

    try {
      const response = await postJson<StayQuoteResponse>("/api/public/stay-quotes", payload);
      setQuote(response.quote);
      setSubmitState("success");
    } catch {
      setSubmitState("error");
    }
  }

  async function handleHoldSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!quote?.available) {
      return;
    }

    setHoldSubmitState("submitting");
    setHold(null);
    setCheckout(null);
    setHoldError(null);
    setCheckoutError(null);
    setCheckoutActionState("idle");

    const formData = new FormData(event.currentTarget);
    const payload = {
      email: getFormValue(formData, "email"),
      guestName: getFormValue(formData, "guestName"),
      phone: getFormValue(formData, "phone") || undefined,
      quoteId: quote.id
    };
    setGuestEmail(payload.email);

    let createdHold: ReservationHold | null = null;

    try {
      const holdResponse = await postJson<StayHoldResponse>("/api/public/stay-holds", payload);
      createdHold = holdResponse.hold;
      setHold(createdHold);
      setHoldSubmitState("success");
      setCheckoutActionState("starting");

      const checkoutResponse = await startPaymentCheckout(createdHold);
      setCheckout(checkoutResponse.checkout);
      setHold(checkoutResponse.reservation);
      setCheckoutActionState("success");
    } catch (error) {
      const message = error instanceof Error ? error.message : "request_failed";

      if (createdHold) {
        setCheckoutError(getCheckoutErrorMessage(message));
        setCheckoutActionState("error");
        return;
      }

      setHoldError(getHoldErrorMessage(message));
      setHoldSubmitState("error");
      setCheckoutActionState("idle");
    }
  }

  async function handleCheckoutStart() {
    if (!hold) {
      return;
    }

    setCheckoutActionState("starting");
    setCheckoutError(null);

    try {
      const response = await startPaymentCheckout(hold);
      setCheckout(response.checkout);
      setHold(response.reservation);
      setCheckoutActionState("success");
    } catch (error) {
      setCheckoutError(
        getCheckoutErrorMessage(error instanceof Error ? error.message : "request_failed")
      );
      setCheckoutActionState("error");
    }
  }

  function startPaymentCheckout(reservation: ReservationHold) {
    return postJson<PaymentCheckoutResponse>("/api/public/payment-checkouts", {
      reservationCode: reservation.reservationCode,
      reservationId: reservation.id
    });
  }

  async function handleCheckoutConfirm() {
    if (!checkout || !hold) {
      return;
    }

    setCheckoutActionState("confirming");
    setCheckoutError(null);

    try {
      const response = await postJson<PaymentCheckoutResponse>(
        "/api/public/payment-checkouts/confirm",
        {
          paymentId: checkout.id,
          reservationCode: hold.reservationCode
        }
      );
      setCheckout(response.checkout);
      setHold(response.reservation);
      setCheckoutActionState("success");

      if (response.checkout.status === "SUCCEEDED" && response.reservation.status === "CONFIRMED") {
        router.push(buildBookingConfirmationPath(response.reservation, guestEmail));
      }
    } catch (error) {
      setCheckoutError(
        getCheckoutErrorMessage(error instanceof Error ? error.message : "request_failed")
      );
      setCheckoutActionState("error");
    }
  }

  async function handleCheckoutFail() {
    if (!checkout || !hold) {
      return;
    }

    setCheckoutActionState("failing");
    setCheckoutError(null);

    try {
      const response = await postJson<PaymentCheckoutResponse>(
        "/api/public/payment-checkouts/fail",
        {
          failureReason: "dev_user_marked_failed",
          paymentId: checkout.id,
          reservationCode: hold.reservationCode
        }
      );
      setCheckout(response.checkout);
      setHold(response.reservation);
      setCheckoutActionState("success");
    } catch (error) {
      setCheckoutError(
        getCheckoutErrorMessage(error instanceof Error ? error.message : "request_failed")
      );
      setCheckoutActionState("error");
    }
  }

  function resetHoldAndCheckout() {
    setCheckout(null);
    setCheckoutActionState("idle");
    setCheckoutError(null);
    setHold(null);
    setHoldError(null);
    setHoldSubmitState("idle");
    setGuestEmail("");
  }

  return (
    <section className="rounded-[8px] border border-line bg-white p-6 shadow-panel">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-[6px] bg-green/10 text-green">
          <Calculator aria-hidden className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase text-green">Disponibilidad y tarifa</p>
          <h2 className="text-lg font-semibold text-midnight">Cotizacion inicial</h2>
        </div>
      </div>

      <form className="mt-6 grid gap-4" onSubmit={handleSubmit}>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-midnight">Llegada</span>
            <input
              className="focus-ring min-h-12 w-full rounded-[6px] border border-line px-4 text-sm outline-none transition focus:border-green"
              name="arrivalDate"
              onChange={(event) => setArrivalDate(event.target.value)}
              required
              type="date"
              value={arrivalDate}
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-midnight">Salida</span>
            <input
              className="focus-ring min-h-12 w-full rounded-[6px] border border-line px-4 text-sm outline-none transition focus:border-green"
              name="departureDate"
              onChange={(event) => setDepartureDate(event.target.value)}
              required
              type="date"
              value={departureDate}
            />
          </label>
        </div>

        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-midnight">Huespedes</span>
          <select
            className="focus-ring min-h-12 w-full rounded-[6px] border border-line px-4 text-sm outline-none transition focus:border-green"
            name="guests"
            onChange={(event) => setGuests(Number(event.target.value))}
            value={String(guests)}
          >
            {Array.from({ length: maxGuests }, (_, index) => index + 1).map((count) => (
              <option key={count} value={count}>
                {count} {count === 1 ? "huesped" : "huespedes"}
              </option>
            ))}
          </select>
        </label>

        <AvailabilityGuide
          availability={availability}
          arrivalDate={arrivalDate}
          departureDate={departureDate}
          error={availabilityError}
          loadState={availabilityState}
          onDaySelect={handleAvailabilityDaySelect}
          onSuggestedRangeSelect={handleSuggestedRangeSelect}
        />

        <button
          className="focus-ring inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[6px] bg-midnight px-5 text-sm font-semibold text-white transition hover:bg-ink disabled:cursor-not-allowed disabled:opacity-65"
          disabled={submitState === "submitting"}
          type="submit"
        >
          {submitState === "submitting" ? (
            <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
          ) : (
            <Calculator aria-hidden className="h-4 w-4" />
          )}
          {submitState === "submitting" ? "Calculando" : "Calcular cotizacion"}
        </button>
      </form>

      {quote ? <QuoteResult quote={quote} /> : null}

      {quote?.available && !hold ? (
        <PaymentRequestForm
          holdError={holdError}
          holdSubmitState={holdSubmitState}
          onSubmit={handleHoldSubmit}
        />
      ) : null}

      {hold ? <HoldResult hold={hold} /> : null}

      {hold ? (
        <CheckoutPanel
          actionState={checkoutActionState}
          checkout={checkout}
          checkoutError={checkoutError}
          hold={hold}
          onConfirm={handleCheckoutConfirm}
          onFail={handleCheckoutFail}
          onStart={handleCheckoutStart}
        />
      ) : null}

      {submitState === "error" ? (
        <div className="mt-5 rounded-[6px] border border-terracotta/30 bg-terracotta/10 p-4 text-sm text-midnight">
          No se pudo calcular la cotizacion. Revisa las fechas o intenta de nuevo.
        </div>
      ) : null}

      <p className="mt-4 text-xs leading-5 text-ink/58">
        La disponibilidad se protege durante el pago y la reserva queda confirmada al aprobarse el
        pago.
      </p>
    </section>
  );
}

function AvailabilityGuide({
  availability,
  arrivalDate,
  departureDate,
  error,
  loadState,
  onDaySelect,
  onSuggestedRangeSelect
}: {
  availability: StayAvailability | null;
  arrivalDate: string;
  departureDate: string;
  error: string | null;
  loadState: AvailabilityLoadState;
  onDaySelect: (day: StayAvailabilityDay) => void;
  onSuggestedRangeSelect: () => void;
}) {
  const selectedRange = arrivalDate && departureDate ? { arrivalDate, departureDate } : null;

  return (
    <div className="rounded-[6px] border border-line bg-ivory p-4">
      <div className="flex items-start gap-3">
        <CalendarDays aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-green" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-midnight">Calendario de disponibilidad</p>
              <p className="mt-1 text-xs leading-5 text-ink/62">
                Selecciona una fecha disponible para rellenar llegada y salida.
              </p>
            </div>
            {availability?.nextAvailableRange ? (
              <button
                className="focus-ring inline-flex min-h-9 w-fit items-center justify-center rounded-[6px] border border-green px-3 text-xs font-semibold text-green transition hover:bg-green hover:text-white"
                onClick={onSuggestedRangeSelect}
                type="button"
              >
                Usar {formatDate(availability.nextAvailableRange.arrivalDate)}
              </button>
            ) : null}
          </div>

          {loadState === "loading" ? (
            <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-ink/58">
              <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
              Cargando disponibilidad
            </div>
          ) : null}

          {loadState === "error" ? (
            <div className="mt-4 rounded-[6px] border border-terracotta/30 bg-terracotta/10 p-3 text-xs leading-5 text-midnight">
              No se pudo cargar el calendario. {error ?? "Intenta de nuevo."}
            </div>
          ) : null}

          {availability ? (
            <>
              <div className="mt-4 grid grid-cols-7 gap-1.5">
                {availability.days.map((day) => {
                  const isSelected = selectedRange
                    ? day.date >= selectedRange.arrivalDate &&
                      day.date < selectedRange.departureDate
                    : false;
                  return (
                    <button
                      aria-label={`${formatShortDate(day.date)}: ${day.statusLabel}`}
                      className={`focus-ring min-h-10 rounded-[6px] border px-1 text-xs font-semibold transition ${getAvailabilityDayClasses(day, isSelected)}`}
                      disabled={day.status !== "AVAILABLE"}
                      key={day.date}
                      onClick={() => onDaySelect(day)}
                      title={day.statusLabel}
                      type="button"
                    >
                      {formatDayNumber(day.date)}
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 flex flex-wrap gap-2 text-[0.7rem] font-semibold text-ink/62">
                <AvailabilityLegend
                  className="border-green/28 bg-green/10 text-green"
                  label="Disponible"
                />
                <AvailabilityLegend
                  className="border-terracotta/28 bg-terracotta/10 text-terracotta"
                  label="Ocupada"
                />
                <AvailabilityLegend
                  className="border-midnight/18 bg-white text-ink/58"
                  label="Sin tarifa/bloqueada"
                />
                <AvailabilityLegend
                  className="border-green bg-green text-white"
                  label="Seleccionada"
                />
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function AvailabilityLegend({ className, label }: { className: string; label: string }) {
  return <span className={`rounded-full border px-2 py-1 ${className}`}>{label}</span>;
}
function QuoteResult({ quote }: { quote: StayQuote }) {
  if (!quote.available) {
    return (
      <div className="mt-5 rounded-[6px] border border-terracotta/30 bg-terracotta/10 p-4 text-sm leading-6 text-midnight">
        <div className="flex gap-3">
          <AlertCircle aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-terracotta" />
          <div>
            <p className="font-semibold">Fechas no disponibles</p>
            <p className="mt-1 text-ink/68">
              {quote.unavailableReasonLabel ?? "No disponible para estas fechas."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-5 rounded-[6px] border border-green/24 bg-green/10 p-4 text-sm leading-6 text-midnight">
      <div className="flex gap-3">
        <CheckCircle2 aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-green" />
        <div className="w-full">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="font-semibold">Disponible para reservar</p>
              <p className="text-ink/64">
                {quote.nights} {quote.nights === 1 ? "noche" : "noches"} - {quote.guests}{" "}
                {quote.guests === 1 ? "huesped" : "huespedes"}
              </p>
            </div>
            <p className="text-xl font-semibold text-midnight">
              {formatCurrency(quote.total, quote.currency)}
            </p>
          </div>

          <dl className="mt-4 space-y-2 border-t border-green/20 pt-4">
            {quote.lineItems.map((item) => (
              <div className="flex items-center justify-between gap-4" key={item.key}>
                <dt className="text-ink/64">{item.label}</dt>
                <dd className="font-semibold">{formatCurrency(item.amount, quote.currency)}</dd>
              </div>
            ))}
          </dl>

          <p className="mt-4 text-xs leading-5 text-ink/58">
            Valida hasta {formatDateTime(quote.expiresAt)}.
          </p>
        </div>
      </div>
    </div>
  );
}

function PaymentRequestForm({
  holdError,
  holdSubmitState,
  onSubmit
}: {
  holdError: string | null;
  holdSubmitState: HoldSubmitState;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <div className="mt-5 rounded-[6px] border border-line bg-ivory p-4">
      <div className="flex gap-3">
        <ShieldCheck aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-green" />
        <div>
          <p className="text-sm font-semibold text-midnight">Datos para pago</p>
          <p className="mt-1 text-xs leading-5 text-ink/62">
            Completa tus datos para proteger estas fechas durante el pago. La reserva queda
            confirmada cuando el pago sea aprobado.
          </p>
        </div>
      </div>

      <form className="mt-4 grid gap-3" onSubmit={onSubmit}>
        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-midnight">Nombre</span>
          <input
            className="focus-ring min-h-11 w-full rounded-[6px] border border-line bg-white px-4 text-sm outline-none transition focus:border-green"
            name="guestName"
            required
            type="text"
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-midnight">Correo</span>
          <input
            className="focus-ring min-h-11 w-full rounded-[6px] border border-line bg-white px-4 text-sm outline-none transition focus:border-green"
            name="email"
            required
            type="email"
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-midnight">Telefono</span>
          <input
            className="focus-ring min-h-11 w-full rounded-[6px] border border-line bg-white px-4 text-sm outline-none transition focus:border-green"
            name="phone"
            type="tel"
          />
        </label>

        <button
          className="focus-ring inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-[6px] bg-green px-5 text-sm font-semibold text-white transition hover:bg-[#0f5c50] disabled:cursor-not-allowed disabled:opacity-65"
          disabled={holdSubmitState === "submitting"}
          type="submit"
        >
          {holdSubmitState === "submitting" ? (
            <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
          ) : (
            <CreditCard aria-hidden className="h-4 w-4" />
          )}
          {holdSubmitState === "submitting" ? "Preparando pago" : "Continuar a pago"}
        </button>
      </form>

      {holdError ? (
        <div className="mt-4 rounded-[6px] border border-terracotta/30 bg-terracotta/10 p-3 text-sm leading-6 text-midnight">
          {holdError}
        </div>
      ) : null}
    </div>
  );
}

function HoldResult({ hold }: { hold: ReservationHold }) {
  const title = hold.status === "CONFIRMED" ? "Reserva confirmada" : "Reserva en proceso";

  return (
    <div className="mt-5 rounded-[6px] border border-green/24 bg-green/10 p-4 text-sm leading-6 text-midnight">
      <div className="flex gap-3">
        <CheckCircle2 aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-green" />
        <div className="w-full">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="font-semibold">{title}</p>
              <p className="text-ink/64">Codigo {hold.reservationCode}</p>
            </div>
            <p className="text-xl font-semibold text-midnight">
              {formatCurrency(hold.total, hold.currency)}
            </p>
          </div>

          <dl className="mt-4 grid gap-3 border-t border-green/20 pt-4 sm:grid-cols-2">
            <div>
              <dt className="text-ink/58">Estancia</dt>
              <dd className="font-semibold">
                {formatDate(hold.arrivalDate)} - {formatDate(hold.departureDate)}
              </dd>
            </div>
            <div>
              <dt className="text-ink/58">Estado</dt>
              <dd className="font-semibold">{hold.statusLabel}</dd>
            </div>
            <div>
              <dt className="text-ink/58">Unidad</dt>
              <dd className="font-semibold">{hold.unitName}</dd>
            </div>
            <div>
              <dt className="text-ink/58">Proteccion vence</dt>
              <dd className="font-semibold">
                {hold.expiresAt ? formatDateTime(hold.expiresAt) : "Sin vencimiento"}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}

function CheckoutPanel({
  actionState,
  checkout,
  checkoutError,
  hold,
  onConfirm,
  onFail,
  onStart
}: {
  actionState: CheckoutActionState;
  checkout: PaymentCheckout | null;
  checkoutError: string | null;
  hold: ReservationHold;
  onConfirm: () => void;
  onFail: () => void;
  onStart: () => void;
}) {
  const isBusy =
    actionState === "starting" || actionState === "confirming" || actionState === "failing";
  const canStart = !checkout && hold.status !== "CONFIRMED";
  const canResolve = checkout?.status === "PENDING";

  return (
    <div className="mt-5 rounded-[6px] border border-line bg-ivory p-4 text-sm leading-6 text-midnight">
      <div className="flex gap-3">
        <CreditCard aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-green" />
        <div className="w-full">
          <p className="font-semibold">Pago de reserva</p>
          <p className="mt-1 text-xs leading-5 text-ink/62">
            Procesaremos la confirmacion de pago en un entorno seguro.
          </p>

          {checkout ? (
            <dl className="mt-4 grid gap-3 border-t border-line pt-4 sm:grid-cols-2">
              <div>
                <dt className="text-ink/58">Estado</dt>
                <dd className="font-semibold">{checkout.statusLabel}</dd>
              </div>
              <div>
                <dt className="text-ink/58">Monto</dt>
                <dd className="font-semibold">
                  {formatCurrency(checkout.amount, checkout.currency)}
                </dd>
              </div>
              <div>
                <dt className="text-ink/58">Referencia</dt>
                <dd className="font-semibold">{checkout.providerRef}</dd>
              </div>
              <div>
                <dt className="text-ink/58">Expira</dt>
                <dd className="font-semibold">
                  {checkout.expiresAt ? formatDateTime(checkout.expiresAt) : "Sin vencimiento"}
                </dd>
              </div>
            </dl>
          ) : null}

          {canStart ? (
            <button
              className="focus-ring mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-[6px] bg-midnight px-5 text-sm font-semibold text-white transition hover:bg-ink disabled:cursor-not-allowed disabled:opacity-65"
              disabled={isBusy}
              onClick={onStart}
              type="button"
            >
              {actionState === "starting" ? (
                <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
              ) : (
                <CreditCard aria-hidden className="h-4 w-4" />
              )}
              {actionState === "starting" ? "Preparando pago" : "Reintentar pago"}
            </button>
          ) : null}

          {canResolve ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <button
                className="focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-[6px] bg-green px-5 text-sm font-semibold text-white transition hover:bg-[#0f5c50] disabled:cursor-not-allowed disabled:opacity-65"
                disabled={isBusy}
                onClick={onConfirm}
                type="button"
              >
                {actionState === "confirming" ? (
                  <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 aria-hidden className="h-4 w-4" />
                )}
                Confirmar pago
              </button>
              <button
                className="focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-[6px] border border-terracotta/35 px-5 text-sm font-semibold text-terracotta transition hover:border-terracotta disabled:cursor-not-allowed disabled:opacity-65"
                disabled={isBusy}
                onClick={onFail}
                type="button"
              >
                {actionState === "failing" ? (
                  <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
                ) : (
                  <XCircle aria-hidden className="h-4 w-4" />
                )}
                Marcar pago fallido
              </button>
            </div>
          ) : null}

          {checkout?.status === "SUCCEEDED" ? (
            <p className="mt-4 rounded-[6px] border border-green/24 bg-green/10 p-3 text-sm font-semibold text-green">
              Pago confirmado y reserva marcada como confirmada.
            </p>
          ) : null}

          {checkout?.status === "FAILED" || checkout?.status === "EXPIRED" ? (
            <p className="mt-4 rounded-[6px] border border-terracotta/30 bg-terracotta/10 p-3 text-sm font-semibold text-terracotta">
              El pago no confirmo la reserva. La disponibilidad queda sujeta al vencimiento del
              bloqueo temporal.
            </p>
          ) : null}

          {checkoutError ? (
            <div className="mt-4 rounded-[6px] border border-terracotta/30 bg-terracotta/10 p-3 text-sm leading-6 text-midnight">
              {checkoutError}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

async function getJson<T>(path: string): Promise<T> {
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";
  const response = await fetch(apiBase + path);
  const payload = (await response.json().catch(() => ({}))) as { error?: string };

  if (!response.ok) {
    throw new Error(payload.error ?? "request_failed");
  }

  return payload as T;
}
async function postJson<T>(path: string, body: unknown): Promise<T> {
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";
  const response = await fetch(apiBase + path, {
    body: JSON.stringify(body),
    headers: {
      "content-type": "application/json"
    },
    method: "POST"
  });

  const payload = (await response.json().catch(() => ({}))) as { error?: string };

  if (!response.ok) {
    throw new Error(payload.error ?? "request_failed");
  }

  return payload as T;
}

function getFormValue(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value.trim() : "";
}

function buildBookingConfirmationPath(reservation: ReservationHold, email: string) {
  const params = new URLSearchParams({
    arrivalDate: reservation.arrivalDate,
    currency: reservation.currency,
    departureDate: reservation.departureDate,
    nights: String(reservation.nights),
    propertyName: reservation.propertyName,
    reservationCode: reservation.reservationCode,
    statusLabel: reservation.statusLabel,
    total: reservation.total,
    unitName: reservation.unitName
  });

  if (email) {
    params.set("email", email);
  }

  return `/stay/booking/confirmed?${params.toString()}`;
}

function getHoldErrorMessage(error: string) {
  if (error === "quote_expired") {
    return "La cotizacion vencio. Calcula una nueva antes de continuar a pago.";
  }

  if (error === "quote_dates_no_longer_available") {
    return "Las fechas ya no estan disponibles. Calcula una nueva cotizacion.";
  }

  if (error === "quote_not_available") {
    return "Esta cotizacion no esta disponible para pago.";
  }

  return "No se pudo preparar la reserva para pago. Revisa tus datos o intenta de nuevo.";
}

function getCheckoutErrorMessage(error: string) {
  if (error === "reservation_hold_expired_or_not_checkoutable") {
    return "La reserva temporal ya no esta disponible para pago.";
  }

  if (error === "payment_checkout_expired") {
    return "El proceso de pago vencio. Inicia uno nuevo si la reserva temporal sigue vigente.";
  }

  if (error === "payment_already_succeeded" || error === "reservation_already_confirmed") {
    return "La reserva ya tiene pago confirmado.";
  }

  if (error === "reservation_amount_missing") {
    return "La reserva no tiene monto valido para pago.";
  }

  return "No se pudo actualizar el pago. Intenta de nuevo.";
}

function getAvailabilityDayClasses(day: StayAvailabilityDay, isSelected: boolean) {
  if (isSelected) {
    return "border-green bg-green text-white shadow-sm";
  }

  if (day.status === "AVAILABLE") {
    return "border-green/24 bg-white text-green hover:border-green hover:bg-green/10";
  }

  if (day.status === "RESERVED" || day.status === "HOLD") {
    return "cursor-not-allowed border-terracotta/24 bg-terracotta/10 text-terracotta/75";
  }

  return "cursor-not-allowed border-line bg-white text-ink/38";
}

function addDateOnlyDays(value: string, days: number) {
  const date = new Date(value + "T00:00:00.000Z");
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function formatDayNumber(value: string) {
  return new Intl.DateTimeFormat("es-GT", {
    day: "2-digit",
    timeZone: "UTC"
  }).format(new Date(value + "T00:00:00.000Z"));
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat("es-GT", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC"
  }).format(new Date(value + "T00:00:00.000Z"));
}
function formatCurrency(amount: string, currency: string) {
  return new Intl.NumberFormat("es-GT", {
    currency,
    style: "currency"
  }).format(Number(amount));
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
