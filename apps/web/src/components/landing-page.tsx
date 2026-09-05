import { trustPillars } from "@kuquba/config";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  CalendarCheck2,
  CheckCircle2,
  FileCheck2,
  HousePlus,
  Search,
  ShieldCheck,
  UserRoundCheck
} from "lucide-react";
import Image from "next/image";

import { SearchPanel } from "./search-panel";
import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";

const reservationSteps = [
  {
    title: "Elige un destino disponible",
    copy: "Solo mostramos zonas donde podemos coordinar una estancia con soporte KUQUBA.",
    icon: Search
  },
  {
    title: "Revisa fechas y tarifa",
    copy: "Antes de pagar ves noches, total estimado y disponibilidad para tu grupo.",
    icon: CalendarCheck2
  },
  {
    title: "Confirma tu reserva",
    copy: "Al aprobarse el pago recibes confirmación y acceso a los detalles de llegada.",
    icon: ShieldCheck
  }
] as const;

const ownerBenefits = [
  "Revisamos si la ubicación y el estado de la propiedad encajan con la operación KUQUBA",
  "Te explicamos qué se necesita antes de recibir huéspedes",
  "Definimos disponibilidad, reglas y responsabilidades antes de publicar",
  "Si ya trabajas con KUQUBA, entra al panel de propietarios"
] as const;

const trustIcons = [ShieldCheck, UserRoundCheck, HousePlus, FileCheck2] as const;

const trustDescriptions = [
  "Pagas con información clara y seguimiento documentado.",
  "Te acompañamos con comunicación cercana en cada etapa.",
  "Trabajamos con estancias que podemos preparar y cuidar.",
  "Coordinamos operación, llegada y soporte local."
] as const;

export function LandingPage() {
  return (
    <>
      <main>
        <section className="relative isolate overflow-hidden bg-midnight text-white">
          <Image
            alt=""
            className="absolute inset-0 -z-20 h-full w-full object-cover brightness-125 contrast-105 saturate-110"
            fill
            priority
            sizes="100vw"
            src="/images/hero-villa-atitlan.png"
          />
          <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(13,34,51,0.62)_0%,rgba(13,34,51,0.34)_46%,rgba(13,34,51,0.08)_100%)]" />
          <div className="absolute inset-x-0 bottom-0 -z-10 h-32 bg-gradient-to-t from-midnight/35 to-transparent" />

          <SiteHeader />

          <div className="container-shell pb-8 pt-5 md:pb-10 md:pt-9">
            <div className="max-w-4xl">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-beige">
                Estancias administradas en Guatemala
              </p>
              <h1 className="mt-3 max-w-4xl font-display text-[clamp(2.6rem,5.35vw,5.1rem)] leading-[1.02] text-white drop-shadow-[0_3px_18px_rgba(0,0,0,0.55)]">
                Encuentra una estancia excepcional.
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.45)] md:text-lg">
                Propiedades seleccionadas en zonas activas, con disponibilidad validada y acompañamiento KUQUBA.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <a
                  className="focus-ring inline-flex min-h-12 items-center justify-center gap-2 rounded-[6px] bg-green px-6 text-sm font-semibold text-white transition hover:bg-[#0f5c50]"
                  href="/stay/search"
                >
                  Explorar estancias
                  <ArrowRight aria-hidden className="h-4 w-4" />
                </a>
                <a
                  className="focus-ring inline-flex min-h-12 items-center justify-center gap-2 rounded-[6px] border border-white/55 px-6 text-sm font-semibold text-white transition hover:border-white hover:bg-white/8"
                  href="/owner/evaluate"
                >
                  Tengo una propiedad
                  <Building2 aria-hidden className="h-4 w-4" />
                </a>
              </div>
            </div>

            <div className="mt-7 max-w-6xl">
              <SearchPanel />
            </div>
          </div>
        </section>

        <section className="bg-ivory py-10 md:py-14" id="estancias">
          <div className="container-shell grid gap-8 lg:grid-cols-[0.92fr_1.08fr] lg:items-stretch">
            <div>
              <p className="text-xs font-semibold uppercase text-green">Reservar con KUQUBA</p>
              <h2 className="mt-3 font-display text-3xl leading-tight text-midnight md:text-4xl">
                Reserva con claridad desde el primer paso.
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-ink/70 md:text-base md:leading-7">
                Elige una estancia en nuestras zonas activas, revisa fechas disponibles y confirma con información clara antes del pago.
              </p>

              <div className="mt-7 grid gap-4">
                {reservationSteps.map((step, index) => {
                  const Icon = step.icon;

                  return (
                    <article className="rounded-[8px] border border-line bg-white p-5 shadow-soft" key={step.title}>
                      <div className="flex items-start gap-4">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[6px] bg-green text-sm font-semibold text-white">
                          {index + 1}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <Icon aria-hidden className="h-5 w-5 text-green" />
                            <h3 className="font-semibold text-midnight">{step.title}</h3>
                          </div>
                          <p className="mt-2 text-sm leading-6 text-ink/68">{step.copy}</p>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>

            <div className="relative min-h-[420px] overflow-hidden rounded-[8px] border border-line bg-midnight shadow-panel">
              <Image
                alt="Suite preparada para una estancia KUQUBA"
                className="object-cover"
                fill
                sizes="(min-width: 1024px) 54vw, 100vw"
                src="/images/guest-suite.png"
              />
              <div className="absolute inset-0 bg-[linear-gradient(0deg,rgba(13,34,51,0.74)_0%,rgba(13,34,51,0.08)_56%)]" />
              <div className="absolute inset-x-0 bottom-0 p-6 text-white md:p-8">
                <p className="text-xs font-semibold uppercase text-beige">Experiencia de huésped</p>
                <h3 className="mt-2 max-w-xl font-display text-3xl leading-tight">
                  Estancias seleccionadas donde podemos acompañarte bien.
                </h3>
                <a
                  className="focus-ring mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-[6px] bg-white px-5 text-sm font-semibold text-midnight transition hover:bg-ivory"
                  href="/stay/search"
                >
                  Ver estancias
                  <ArrowRight aria-hidden className="h-4 w-4" />
                </a>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white py-10 md:py-14" id="propietarios">
          <div className="container-shell grid gap-8 lg:grid-cols-[minmax(0,0.96fr)_minmax(360px,0.74fr)] lg:items-center">
            <div className="relative min-h-[340px] overflow-hidden rounded-[8px] border border-line bg-midnight shadow-soft">
              <Image
                alt="Panel visual de administración de propiedad KUQUBA"
                className="object-cover"
                fill
                sizes="(min-width: 1024px) 54vw, 100vw"
                src="/images/owner-dashboard.png"
              />
            </div>

            <div>
              <p className="text-xs font-semibold uppercase text-green">Para propietarios</p>
              <h2 className="mt-3 font-display text-3xl leading-tight text-midnight md:text-4xl">
                ¿Tienes una propiedad para recibir huéspedes?
              </h2>
              <p className="mt-4 text-sm leading-6 text-ink/70 md:text-base md:leading-7">
                Cuéntanos sobre tu propiedad y revisamos si puede operar con el nivel de cuidado, disponibilidad y soporte que ofrecemos.
              </p>
              <ul className="mt-6 grid gap-3">
                {ownerBenefits.map((benefit) => (
                  <li className="flex gap-3 text-sm leading-6 text-ink/74" key={benefit}>
                    <CheckCircle2 aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-green" />
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>
              <a
                className="focus-ring mt-8 inline-flex min-h-12 items-center justify-center gap-2 rounded-[6px] bg-green px-6 text-sm font-semibold text-white transition hover:bg-[#0f5c50]"
                href="/owner/evaluate"
              >
                Evaluar mi propiedad
                <ArrowRight aria-hidden className="h-4 w-4" />
              </a>
            </div>
          </div>
        </section>

        <section className="container-shell py-10 md:py-14" id="experiencia">
          <div className="mb-7 max-w-3xl">
            <p className="text-xs font-semibold uppercase text-green">Experiencia KUQUBA</p>
            <h2 className="mt-3 font-display text-3xl leading-tight text-midnight md:text-4xl">
              Confianza antes, durante y después de la estancia.
            </h2>
          </div>
          <div className="grid gap-5 rounded-[8px] border border-line bg-white px-5 py-7 shadow-soft md:grid-cols-4 md:px-8">
            {trustPillars.map((pillar, index) => {
              const Icon = trustIcons[index] ?? BadgeCheck;
              const description = trustDescriptions[index] ?? "Información clara para decidir con confianza.";

              return (
                <div className="flex gap-4 border-line md:border-r md:pr-5 md:last:border-r-0" key={pillar}>
                  <Icon aria-hidden className="h-9 w-9 shrink-0 text-green" />
                  <div>
                    <h3 className="text-sm font-semibold uppercase text-midnight">{pillar}</h3>
                    <p className="mt-2 text-sm leading-6 text-ink/68">{description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
