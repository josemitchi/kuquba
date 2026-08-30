import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  BedDouble,
  CalendarDays,
  CheckCircle2,
  Clock3,
  DoorOpen,
  MapPin,
  ShieldCheck,
  SlidersHorizontal,
  UsersRound,
  type LucideIcon
} from "lucide-react";
import Image from "next/image";

import { type PublicStay, type StayAvailability } from "@/data/public-stays";

import { SearchPanel, type SearchPanelDefaults } from "./search-panel";
import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";

export type StaySearchParams = Record<string, string | string[] | undefined>;

type StaySearchCriteria = Required<SearchPanelDefaults> & {
  guestsNumber: number;
};

const availabilityClasses: Record<StayAvailability, string> = {
  available: "border-green/24 bg-green/10 text-green",
  limited: "border-terracotta/28 bg-terracotta/10 text-terracotta",
  request: "border-midnight/18 bg-midnight/8 text-midnight"
};

export function StaySearchPage({ searchParams, stays }: { searchParams: StaySearchParams; stays: PublicStay[] }) {
  const criteria = buildCriteria(searchParams);
  const visibleStays = filterStays(criteria, stays);
  const destinationLabel = criteria.destination || "Guatemala";
  const dateLabel = buildDateLabel(criteria.arrival, criteria.departure);
  const resultTitle =
    visibleStays.length === 1 ? "1 opcion para revisar" : `${visibleStays.length} opciones para revisar`;

  return (
    <>
      <main className="min-h-screen bg-ivory text-ink">
        <section className="relative isolate overflow-hidden bg-midnight text-white">
          <Image
            alt=""
            className="absolute inset-0 -z-20 h-full w-full object-cover brightness-125 contrast-105 saturate-110"
            fill
            priority
            sizes="100vw"
            src="/images/hero-villa-atitlan.png"
          />
          <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(13,34,51,0.58)_0%,rgba(13,34,51,0.34)_48%,rgba(13,34,51,0.08)_100%)]" />
          <div className="absolute inset-x-0 bottom-0 -z-10 h-32 bg-gradient-to-t from-ivory/70 to-transparent" />

          <SiteHeader homeHref="/" navigationBaseHref="/" />

          <div className="container-shell pb-16 pt-8 md:pb-20 md:pt-14">
            <a
              className="focus-ring inline-flex items-center gap-2 rounded-[6px] border border-white/24 bg-white/8 px-4 py-2 text-sm font-semibold text-white/86 transition hover:border-white hover:text-white"
              href="/"
            >
              <ArrowLeft aria-hidden className="h-4 w-4" />
              Volver a KUQUBA
            </a>
            <div className="mt-8 max-w-4xl">
              <p className="text-xs font-semibold uppercase text-beige">Estancias seleccionadas</p>
              <h1 className="mt-4 font-display text-[clamp(2.8rem,6vw,5.4rem)] leading-[1.04] text-white drop-shadow-[0_3px_18px_rgba(0,0,0,0.55)]">
                Encuentra el lugar correcto para tu viaje.
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.45)] md:text-xl">
                Explora propiedades curadas por KUQUBA, valida disponibilidad y continua a pago
                desde el detalle de cada estancia.
              </p>
            </div>

            <div className="mt-9 grid max-w-5xl gap-3 sm:grid-cols-3">
              <HeroMetric icon={MapPin} label="Destino" value={destinationLabel} />
              <HeroMetric icon={CalendarDays} label="Fechas" value={dateLabel} />
              <HeroMetric icon={UsersRound} label="Viajeros" value={`${criteria.guestsNumber} huespedes`} />
            </div>
          </div>
        </section>

        <section className="container-shell relative z-10 -mt-10 pb-8">
          <SearchPanel defaults={criteria} tone="light" />
        </section>

        <section className="container-shell pb-16 pt-2">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
            <div>
              <div className="flex flex-col gap-3 border-b border-line pb-5 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase text-green">Resultados publicos</p>
                  <h2 className="mt-2 font-display text-3xl leading-tight text-midnight md:text-4xl">
                    {resultTitle}
                  </h2>
                </div>
                <p className="max-w-xl text-sm leading-6 text-ink/66">
                  Selecciona una propiedad, valida fechas y continua a pago para confirmar la
                  reserva con disponibilidad protegida durante checkout.
                </p>
              </div>

              <div className="mt-6 grid gap-5">
                {visibleStays.length > 0 ? (
                  visibleStays.map((stay) => <StayCard key={stay.id} stay={stay} />)
                ) : (
                  <EmptyResults />
                )}
              </div>
            </div>

            <aside className="rounded-[8px] border border-line bg-white p-6 shadow-soft lg:sticky lg:top-6">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-[6px] bg-green/10 text-green">
                  <SlidersHorizontal aria-hidden className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-green">Criterios actuales</p>
                  <h2 className="text-lg font-semibold text-midnight">Busqueda curada</h2>
                </div>
              </div>

              <dl className="mt-6 space-y-4 text-sm">
                <CriteriaRow label="Destino" value={destinationLabel} />
                <CriteriaRow label="Fechas" value={dateLabel} />
                <CriteriaRow label="Huespedes" value={`${criteria.guestsNumber}`} />
              </dl>

              <div className="mt-7 border-t border-line pt-6">
                <h3 className="text-sm font-semibold text-midnight">Reserva directa</h3>
                <ul className="mt-4 space-y-3 text-sm leading-6 text-ink/68">
                  {[
                    "Disponibilidad y tarifa validadas antes de pago.",
                    "Bloqueo temporal durante checkout.",
                    "Reserva confirmada al aprobarse el pago."
                  ].map((item) => (
                    <li className="flex gap-3" key={item}>
                      <CheckCircle2 aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-green" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </aside>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

function StayCard({ stay }: { stay: PublicStay }) {
  return (
    <article className="overflow-hidden rounded-[8px] border border-line bg-white shadow-soft md:grid md:grid-cols-[300px_1fr]">
      <div className="relative min-h-[260px] md:min-h-full">
        <Image
          alt={stay.imageAlt}
          className="object-cover"
          fill
          sizes="(min-width: 1024px) 300px, 100vw"
          src={stay.image}
        />
        <div className="absolute left-4 top-4 rounded-full border border-white/30 bg-midnight/72 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
          Reserva directa
        </div>
      </div>

      <div className="p-6 md:p-7">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="flex items-center gap-2 text-sm font-medium text-green">
              <MapPin aria-hidden className="h-4 w-4" />
              {stay.destination} - {stay.neighborhood}
            </p>
            <h3 className="mt-2 font-display text-3xl leading-tight text-midnight">{stay.name}</h3>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-ink/70">{stay.summary}</p>
          </div>
          <span
            className={`inline-flex w-fit items-center rounded-full border px-3 py-1 text-xs font-semibold ${availabilityClasses[stay.availability]}`}
          >
            {stay.availabilityLabel}
          </span>
        </div>

        <div className="mt-5 grid gap-3 text-sm text-ink/72 sm:grid-cols-3">
          <StayStat icon={UsersRound} label={`${stay.maxGuests} huespedes`} />
          <StayStat icon={BedDouble} label={`${stay.bedrooms} habitaciones`} />
          <StayStat icon={DoorOpen} label={`${stay.bathrooms} banos`} />
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {[stay.stayStyle, ...stay.highlights].map((item) => (
            <span
              className="rounded-full border border-line bg-ivory px-3 py-1 text-xs font-semibold text-midnight/76"
              key={item}
            >
              {item}
            </span>
          ))}
        </div>

        <div className="mt-6 grid gap-5 border-t border-line pt-5 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="text-xs font-semibold uppercase text-ink/48">Incluye</p>
            <ul className="mt-3 grid gap-2 text-sm leading-6 text-ink/68 sm:grid-cols-2">
              {stay.amenities.map((amenity) => (
                <li className="flex gap-2" key={amenity}>
                  <BadgeCheck aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-green" />
                  <span>{amenity}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 flex gap-2 text-sm leading-6 text-ink/62">
              <Clock3 aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-terracotta" />
              <span>{stay.bookingNote}</span>
            </p>
          </div>

          <a
            className="focus-ring inline-flex min-h-12 items-center justify-center gap-2 rounded-[6px] bg-green px-5 text-sm font-semibold text-white transition hover:bg-[#0f5c50]"
            href={`/stay/properties/${stay.id}`}
          >
            Reservar
            <ArrowRight aria-hidden className="h-4 w-4" />
          </a>
        </div>
      </div>
    </article>
  );
}

function HeroMetric({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="rounded-[8px] border border-white/18 bg-white/9 p-4 backdrop-blur">
      <div className="flex items-center gap-3">
        <Icon aria-hidden className="h-5 w-5 text-beige" />
        <span className="text-xs font-semibold uppercase text-white/62">{label}</span>
      </div>
      <p className="mt-2 truncate text-base font-semibold text-white">{value}</p>
    </div>
  );
}

function StayStat({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <div className="flex min-h-11 items-center gap-2 rounded-[6px] border border-line px-3">
      <Icon aria-hidden className="h-4 w-4 text-green" />
      <span>{label}</span>
    </div>
  );
}

function CriteriaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-line pb-3 last:border-b-0 last:pb-0">
      <dt className="text-ink/54">{label}</dt>
      <dd className="text-right font-semibold text-midnight">{value}</dd>
    </div>
  );
}

function EmptyResults() {
  return (
    <div className="rounded-[8px] border border-line bg-white p-8 text-center shadow-soft">
      <ShieldCheck aria-hidden className="mx-auto h-10 w-10 text-green" />
      <h3 className="mt-4 text-xl font-semibold text-midnight">No hay coincidencias con esos criterios.</h3>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-ink/68">
        Amplia destino o reduce cantidad de huespedes para revisar opciones conceptuales disponibles
        en esta etapa.
      </p>
      <a
        className="focus-ring mt-6 inline-flex min-h-12 items-center justify-center rounded-[6px] border border-green px-5 text-sm font-semibold text-green transition hover:bg-green hover:text-white"
        href="/stay/search"
      >
        Ver todas las estancias
      </a>
    </div>
  );
}

function buildCriteria(searchParams: StaySearchParams): StaySearchCriteria {
  const destination = readParam(searchParams.destination).trim();
  const arrival = readParam(searchParams.arrival);
  const departure = readParam(searchParams.departure);
  const guests = readParam(searchParams.guests) || "2";
  const parsedGuests = Number.parseInt(guests, 10);
  const guestsNumber = Number.isFinite(parsedGuests) && parsedGuests > 0 ? parsedGuests : 2;

  return {
    arrival,
    departure,
    destination,
    guests: String(guestsNumber),
    guestsNumber
  };
}

function filterStays(criteria: StaySearchCriteria, stays: PublicStay[]) {
  const destinationQuery = criteria.destination.toLowerCase();

  return stays.filter((stay) => {
    const matchesDestination =
      !destinationQuery ||
      [stay.destination, stay.name, stay.neighborhood].some((value) =>
        value.toLowerCase().includes(destinationQuery)
      );
    const matchesGuests = criteria.guestsNumber <= stay.maxGuests;

    return matchesDestination && matchesGuests;
  });
}

function readParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

function buildDateLabel(arrival: string, departure: string) {
  if (arrival && departure) {
    return `${formatDate(arrival)} - ${formatDate(departure)}`;
  }

  if (arrival) {
    return `Desde ${formatDate(arrival)}`;
  }

  return "Fechas flexibles";
}

function formatDate(value: string) {
  const [year, month, day] = value.split("-");

  if (!year || !month || !day) {
    return value;
  }

  return `${day}/${month}/${year}`;
}