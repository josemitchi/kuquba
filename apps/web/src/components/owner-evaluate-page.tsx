import {
  ArrowLeft,
  BadgeCheck,
  Building2,
  ClipboardCheck,
  FileText,
  MapPin,
  ShieldCheck,
  UserRoundCheck,
  type LucideIcon
} from "lucide-react";
import Image from "next/image";

import { OwnerLeadForm } from "./owner-lead-form";
import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";

const reviewAreas = [
  {
    icon: MapPin,
    title: "Ubicacion y contexto",
    copy: "Destino, accesos, reglas del entorno y tipo de demanda que podria encajar con la propiedad."
  },
  {
    icon: Building2,
    title: "Estado operativo",
    copy: "Mobiliario, mantenimiento, limpieza, inventario y necesidades antes de recibir huespedes."
  },
  {
    icon: ClipboardCheck,
    title: "Proceso comercial",
    copy: "Forma de publicar, revisar disponibilidad, responder solicitudes y mantener control operativo."
  },
  {
    icon: FileText,
    title: "Condiciones pendientes",
    copy: "Documentos, permisos, reglas de uso y acuerdos que deben definirse antes de operar."
  }
] as const;

const processSteps = [
  "Recepcion del lead con correlacion y registro auditable.",
  "Revision humana de la propiedad y su estado operativo.",
  "Contacto del equipo KUQUBA si la propiedad encaja con el alcance inicial.",
  "Definicion posterior de condiciones, documentos y responsabilidades."
] as const;

export function OwnerEvaluatePage() {
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
            src="/images/hero-villa-atitlan.png"
          />
          <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(13,34,51,0.95)_0%,rgba(13,34,51,0.84)_48%,rgba(20,104,90,0.54)_100%)]" />
          <div className="absolute inset-x-0 bottom-0 -z-10 h-40 bg-gradient-to-t from-ivory to-transparent" />

          <SiteHeader homeHref="/" navigationBaseHref="/" />

          <div className="container-shell grid gap-8 pb-12 pt-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(360px,0.54fr)] lg:items-start lg:pb-16 lg:pt-10">
            <div>
              <a
                className="focus-ring inline-flex items-center gap-2 rounded-[6px] border border-white/24 bg-white/8 px-4 py-2 text-sm font-semibold text-white/86 transition hover:border-white hover:text-white"
                href="/"
              >
                <ArrowLeft aria-hidden className="h-4 w-4" />
                Volver a KUQUBA
              </a>

              <div className="mt-8 max-w-4xl">
                <p className="text-xs font-semibold uppercase text-beige">Para propietarios</p>
                <h1 className="mt-4 font-display text-[clamp(2.7rem,5vw,5rem)] leading-[1.04] text-white">
                  Evaluacion inicial de propiedad.
                </h1>
                <p className="mt-5 max-w-2xl text-base leading-7 text-white/82 md:text-lg">
                  Comparte informacion basica de tu propiedad para que KUQUBA revise si encaja con
                  una operacion administrada, curada y responsable.
                </p>
              </div>

              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                <HeroSignal icon={ShieldCheck} label="Flujo publico" value="Sin acceso privado" />
                <HeroSignal icon={UserRoundCheck} label="Revision" value="Operaciones" />
                <HeroSignal icon={BadgeCheck} label="Condiciones" value="No automaticas" />
              </div>
            </div>

            <div className="lg:sticky lg:top-6">
              <OwnerLeadForm />
            </div>
          </div>
        </section>

        <section className="bg-ivory py-12 md:py-16">
          <div className="container-shell grid gap-8 lg:grid-cols-[0.46fr_1fr] lg:items-start">
            <div>
              <p className="text-xs font-semibold uppercase text-green">Revision operativa</p>
              <h2 className="mt-3 font-display text-3xl leading-tight text-midnight md:text-4xl">
                Lo que se valida antes de avanzar.
              </h2>
              <p className="mt-4 text-sm leading-6 text-ink/68">
                Este flujo no reemplaza el portal del propietario. Es una entrada publica para
                iniciar una conversacion documentada y separar captacion de operacion activa.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {reviewAreas.map((area) => (
                <ReviewArea key={area.title} {...area} />
              ))}
            </div>
          </div>
        </section>

        <section className="bg-white py-12 md:py-16">
          <div className="container-shell grid gap-8 lg:grid-cols-[1fr_0.78fr] lg:items-center">
            <div className="relative min-h-[340px] overflow-hidden rounded-[8px] border border-line">
              <Image
                alt="Panel visual de administracion de propiedad KUQUBA"
                className="object-cover"
                fill
                sizes="(min-width: 1024px) 54vw, 100vw"
                src="/images/owner-dashboard.png"
              />
            </div>

            <div>
              <p className="text-xs font-semibold uppercase text-green">Separacion de flujos</p>
              <h2 className="mt-3 font-display text-3xl leading-tight text-midnight md:text-4xl">
                Captacion primero, portal despues.
              </h2>
              <ol className="mt-6 space-y-4">
                {processSteps.map((step, index) => (
                  <li className="flex gap-4" key={step}>
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[6px] bg-green text-sm font-semibold text-white">
                      {index + 1}
                    </span>
                    <p className="pt-1 text-sm leading-6 text-ink/72">{step}</p>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

function HeroSignal({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
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

function ReviewArea({
  copy,
  icon: Icon,
  title
}: {
  copy: string;
  icon: LucideIcon;
  title: string;
}) {
  return (
    <article className="rounded-[8px] border border-line bg-white p-6 shadow-soft">
      <Icon aria-hidden className="h-8 w-8 text-green" />
      <h3 className="mt-4 text-lg font-semibold text-midnight">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-ink/68">{copy}</p>
    </article>
  );
}
