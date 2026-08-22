import { trustPillars } from "@kuquba/config";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  CheckCircle2,
  FileCheck2,
  HousePlus,
  ShieldCheck,
  UserRoundCheck
} from "lucide-react";
import Image from "next/image";

import { JourneyTabs } from "./journey-tabs";
import { SearchPanel } from "./search-panel";
import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";

const guestBenefits = [
  "Propiedades cuidadosamente seleccionadas",
  "Atencion antes, durante y despues de tu estancia",
  "Reserva segura y transparente",
  "Soporte local cuando lo necesitas"
] as const;

const ownerBenefits = [
  "Comercializacion y pricing inteligente",
  "Gestion de reservas y huespedes",
  "Operacion, limpieza y mantenimiento",
  "Reportes y liquidaciones transparentes"
] as const;

const trustIcons = [ShieldCheck, UserRoundCheck, HousePlus, FileCheck2] as const;

export function LandingPage() {
  return (
    <>
      <main>
        <section className="relative isolate overflow-hidden bg-midnight text-white">
          <Image
            src="/images/hero-villa-atitlan.png"
            alt=""
            fill
            priority
            sizes="100vw"
            className="absolute inset-0 -z-20 h-full w-full object-cover"
          />
          <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(13,34,51,0.92)_0%,rgba(13,34,51,0.74)_40%,rgba(13,34,51,0.42)_100%)]" />
          <div className="absolute inset-x-0 bottom-0 -z-10 h-48 bg-gradient-to-t from-midnight/82 to-transparent" />

          <SiteHeader />

          <div className="container-shell pb-12 pt-8 md:pb-16 md:pt-14">
            <div className="max-w-4xl">
              <h1 className="font-display text-[clamp(3rem,6vw,5.8rem)] leading-[1.03] text-white">
                Encuentra una estancia excepcional.
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-white/88 md:text-xl">
                Propiedades seleccionadas. Experiencias administradas con atencion personalizada
                de principio a fin.
              </p>
            </div>

            <div className="mt-10 max-w-6xl">
              <SearchPanel />
            </div>
          </div>
        </section>

        <section className="bg-ivory py-5" id="estancias">
          <div className="container-shell grid gap-5 lg:grid-cols-2">
            <AudiencePanel
              eyebrow="Para huespedes"
              title="Tu estancia comienza con confianza."
              copy="Disfruta propiedades unicas, atencion personalizada y una experiencia pensada para ti."
              cta="Encontrar mi estancia"
              image="/images/guest-suite.png"
              imageAlt="Suite elegante con vista hacia lago y volcan"
              benefits={guestBenefits}
            />
            <AudiencePanel
              eyebrow="Para propietarios"
              title="Tu propiedad, perfectamente administrada."
              copy="Nos encargamos de cuidar tu inversion y operar tu propiedad como si fuera nuestra."
              cta="Quiero evaluar mi propiedad"
              image="/images/owner-dashboard.png"
              imageAlt="Escena de administracion de propiedad con dashboard abstracto"
              benefits={ownerBenefits}
              reverse
            />
          </div>
        </section>

        <JourneyTabs />

        <section className="container-shell pb-12 md:pb-16">
          <div className="grid gap-5 rounded-[8px] border border-line bg-white px-5 py-7 shadow-soft md:grid-cols-4 md:px-8">
            {trustPillars.map((pillar, index) => {
              const Icon = trustIcons[index] ?? BadgeCheck;

              return (
                <div
                  className="flex gap-4 border-line md:border-r md:pr-5 md:last:border-r-0"
                  key={pillar}
                >
                  <Icon aria-hidden className="h-9 w-9 shrink-0 text-green" />
                  <div>
                    <h3 className="text-sm font-semibold uppercase text-midnight">{pillar}</h3>
                    <p className="mt-2 text-sm leading-6 text-ink/68">
                      Una experiencia cuidada en cada paso.
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="container-shell pb-8">
          <div className="relative overflow-hidden rounded-[8px] bg-midnight px-6 py-9 text-white md:px-12">
            <Image
              src="/images/hero-villa-atitlan.png"
              alt=""
              fill
              sizes="100vw"
              className="absolute inset-0 h-full w-full object-cover opacity-28"
            />
            <div className="absolute inset-0 bg-midnight/72" />
            <div className="relative z-10 grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <h2 className="font-display text-3xl leading-tight md:text-4xl">
                  Listo para comenzar?
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-white/78 md:text-base">
                  Ya sea que busques una estancia inolvidable o quieras que administremos tu
                  propiedad, estamos listos para ayudarte.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <a
                  className="focus-ring inline-flex min-h-12 items-center justify-center gap-2 rounded-[6px] bg-green px-6 text-sm font-semibold text-white transition hover:bg-[#0f5c50]"
                  href="#estancias"
                >
                  Buscar estancia
                  <ArrowRight aria-hidden className="h-4 w-4" />
                </a>
                <a
                  className="focus-ring inline-flex min-h-12 items-center justify-center gap-2 rounded-[6px] border border-white/55 px-6 text-sm font-semibold text-white transition hover:border-white hover:bg-white/8"
                  href="/owner"
                >
                  Administra tu propiedad
                  <Building2 aria-hidden className="h-4 w-4" />
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

function AudiencePanel({
  eyebrow,
  title,
  copy,
  cta,
  image,
  imageAlt,
  benefits,
  reverse = false
}: {
  eyebrow: string;
  title: string;
  copy: string;
  cta: string;
  image: string;
  imageAlt: string;
  benefits: ReadonlyArray<string>;
  reverse?: boolean;
}) {
  return (
    <article
      className="grid min-h-[440px] overflow-hidden rounded-[8px] border border-line bg-white shadow-soft md:grid-cols-[1fr_0.86fr]"
      id={eyebrow.includes("propietarios") ? "propietarios" : undefined}
    >
      <div className={`p-8 md:p-10 ${reverse ? "md:order-2" : ""}`}>
        <p className="text-xs font-semibold uppercase text-green">{eyebrow}</p>
        <h2 className="mt-5 font-display text-3xl leading-tight text-midnight md:text-4xl">
          {title}
        </h2>
        <p className="mt-4 text-base leading-7 text-ink/75">{copy}</p>
        <ul className="mt-7 space-y-3">
          {benefits.map((benefit) => (
            <li className="flex gap-3 text-sm text-ink/78" key={benefit}>
              <CheckCircle2 aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-green" />
              <span>{benefit}</span>
            </li>
          ))}
        </ul>
        <a
          className="focus-ring mt-8 inline-flex min-h-12 items-center justify-center gap-2 rounded-[6px] bg-green px-6 text-sm font-semibold text-white transition hover:bg-[#0f5c50]"
          href={eyebrow.includes("propietarios") ? "/owner" : "/stay"}
        >
          {cta}
          <ArrowRight aria-hidden className="h-4 w-4" />
        </a>
      </div>
      <div className="relative min-h-[260px]">
        <Image
          src={image}
          alt={imageAlt}
          fill
          sizes="(min-width: 1024px) 32vw, 100vw"
          className="object-cover"
        />
      </div>
    </article>
  );
}
