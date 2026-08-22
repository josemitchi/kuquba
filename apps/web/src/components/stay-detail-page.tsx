import {
  ArrowLeft,
  BadgeCheck,
  BedDouble,
  CalendarCheck2,
  DoorOpen,
  MapPin,
  ShieldCheck,
  UsersRound,
  type LucideIcon
} from "lucide-react";
import Image from "next/image";

import type { PublicStay } from "@/data/public-stays";

import { ProposalRequestForm } from "./proposal-request-form";
import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";

export function StayDetailPage({ stay }: { stay: PublicStay }) {
  return (
    <>
      <main className="min-h-screen bg-ivory text-ink">
        <section className="relative isolate overflow-hidden bg-midnight text-white">
          <Image
            alt=""
            className="absolute inset-0 -z-20 h-full w-full object-cover"
            fill
            priority
            sizes="100vw"
            src={stay.image}
          />
          <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(13,34,51,0.95)_0%,rgba(13,34,51,0.82)_50%,rgba(13,34,51,0.58)_100%)]" />
          <div className="absolute inset-x-0 bottom-0 -z-10 h-40 bg-gradient-to-t from-ivory to-transparent" />

          <SiteHeader homeHref="/" navigationBaseHref="/" />

          <div className="container-shell pb-16 pt-8 md:pb-20 md:pt-14">
            <a
              className="focus-ring inline-flex items-center gap-2 rounded-[6px] border border-white/24 bg-white/8 px-4 py-2 text-sm font-semibold text-white/86 transition hover:border-white hover:text-white"
              href="/stay/search"
            >
              <ArrowLeft aria-hidden className="h-4 w-4" />
              Volver a resultados
            </a>
            <div className="mt-8 max-w-4xl">
              <p className="text-xs font-semibold uppercase text-beige">{stay.stayStyle}</p>
              <h1 className="mt-4 font-display text-[clamp(2.8rem,6vw,5.4rem)] leading-[1.04] text-white">
                {stay.name}
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-white/84 md:text-xl">
                {stay.summary}
              </p>
            </div>

            <div className="mt-9 grid max-w-5xl gap-3 sm:grid-cols-3">
              <HeroMetric icon={MapPin} label="Destino" value={stay.destination} />
              <HeroMetric icon={UsersRound} label="Capacidad" value={`${stay.maxGuests} huespedes`} />
              <HeroMetric icon={CalendarCheck2} label="Estado" value={stay.availabilityLabel} />
            </div>
          </div>
        </section>

        <section className="container-shell relative z-10 -mt-10 pb-8">
          <div className="grid gap-3 md:grid-cols-[1.35fr_0.65fr]">
            {stay.gallery.map((image, index) => (
              <div
                className="relative min-h-[260px] overflow-hidden rounded-[8px] border border-white/20 bg-midnight shadow-panel md:min-h-[420px]"
                key={image.src + image.alt}
              >
                <Image
                  alt={image.alt}
                  className="object-cover"
                  fill
                  sizes={index === 0 ? "(min-width: 768px) 58vw, 100vw" : "(min-width: 768px) 30vw, 100vw"}
                  src={image.src}
                />
              </div>
            ))}
          </div>
        </section>

        <section className="container-shell pb-16">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_390px] lg:items-start">
            <div className="space-y-8">
              <section className="border-b border-line pb-8">
                <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase text-green">Detalle de estancia</p>
                    <h2 className="mt-2 font-display text-3xl leading-tight text-midnight md:text-4xl">
                      {stay.destination} · {stay.neighborhood}
                    </h2>
                  </div>
                  <span className="w-fit rounded-full border border-green/24 bg-green/10 px-3 py-1 text-xs font-semibold text-green">
                    {stay.availabilityLabel}
                  </span>
                </div>
                <p className="mt-5 max-w-3xl text-base leading-7 text-ink/72">{stay.proposalNote}</p>
              </section>

              <section className="grid gap-3 sm:grid-cols-3">
                <StayFact icon={UsersRound} label="Huespedes" value={`${stay.maxGuests}`} />
                <StayFact icon={BedDouble} label="Habitaciones" value={`${stay.bedrooms}`} />
                <StayFact icon={DoorOpen} label="Banos" value={`${stay.bathrooms}`} />
              </section>

              <InfoSection title="Amenidades" items={stay.amenities} />
              <InfoSection title="Operacion KUQUBA" items={stay.operations} />
              <InfoSection title="Condiciones conceptuales" items={stay.houseRules} />

              <section className="rounded-[8px] border border-line bg-white p-6 shadow-soft">
                <div className="flex gap-3">
                  <ShieldCheck aria-hidden className="mt-0.5 h-6 w-6 shrink-0 text-green" />
                  <div>
                    <h2 className="text-lg font-semibold text-midnight">Antes de reservar</h2>
                    <p className="mt-2 text-sm leading-6 text-ink/68">
                      KUQUBA revisa disponibilidad, tarifa aplicable, reglas de propiedad y condiciones
                      antes de convertir una solicitud en reserva. Esta pagina no muestra precios reales
                      ni inventario garantizado.
                    </p>
                  </div>
                </div>
              </section>
            </div>

            <aside className="lg:sticky lg:top-6">
              <ProposalRequestForm
                defaultGuests={Math.min(stay.maxGuests, 2)}
                destination={stay.destination}
                stayId={stay.id}
                stayName={stay.name}
              />
            </aside>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
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

function StayFact({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="rounded-[8px] border border-line bg-white p-5 shadow-soft">
      <Icon aria-hidden className="h-6 w-6 text-green" />
      <p className="mt-4 text-xs font-semibold uppercase text-ink/48">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-midnight">{value}</p>
    </div>
  );
}

function InfoSection({ title, items }: { title: string; items: string[] }) {
  return (
    <section>
      <h2 className="text-xl font-semibold text-midnight">{title}</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {items.map((item) => (
          <div className="flex gap-3 rounded-[8px] border border-line bg-white p-4 shadow-soft" key={item}>
            <BadgeCheck aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-green" />
            <span className="text-sm leading-6 text-ink/72">{item}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
