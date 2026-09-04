import { portalEntries, type PortalAudience } from "@kuquba/config";
import {
  ArrowLeft,
  BadgeCheck,
  Building2,
  CalendarCheck2,
  ShieldCheck,
  UserRound
} from "lucide-react";
import Image from "next/image";

import { PortalAccessForm } from "./portal-access-form";

type PortalCopy = {
  eyebrow: string;
  title: string;
  body: string;
  primaryFieldLabel: string;
  primaryFieldPlaceholder: string;
  action: string;
  notes: string[];
};

const portalCopy: Record<PortalAudience, PortalCopy> = {
  guest: {
    eyebrow: "Huespedes",
    title: "Accede a los detalles de tu reserva.",
    body: "Usa el correo o telefono asociado a tu reserva para recibir una verificacion segura.",
    primaryFieldLabel: "Correo o telefono",
    primaryFieldPlaceholder: "correo@ejemplo.com",
    action: "Continuar con verificacion",
    notes: [
      "Resumen de reserva y pago",
      "Preparacion de llegada",
      "Soporte KUQUBA durante la estancia"
    ]
  },
  owner: {
    eyebrow: "Propietarios",
    title: "Controla tu propiedad con acceso verificado.",
    body: "El portal de propietarios requiere MFA para proteger informacion operativa, documentos y liquidaciones.",
    primaryFieldLabel: "Correo del propietario",
    primaryFieldPlaceholder: "propietario@ejemplo.com",
    action: "Solicitar acceso seguro",
    notes: [
      "Propiedades y reservas asignadas",
      "Incidencias y mantenimiento",
      "Documentos y liquidaciones"
    ]
  },
  ops: {
    eyebrow: "Operaciones",
    title: "Operaciones con privilegio minimo.",
    body: "El acceso del equipo requiere MFA y permisos por rol para proteger reservas, finanzas y datos sensibles.",
    primaryFieldLabel: "Correo corporativo",
    primaryFieldPlaceholder: "equipo@kuquba.com",
    action: "Entrar como equipo",
    notes: [
      "Calendario operacional",
      "Housekeeping y mantenimiento",
      "Auditoria de acciones sensibles"
    ]
  }
};

const portalIcons: Record<PortalAudience, typeof UserRound> = {
  guest: CalendarCheck2,
  owner: Building2,
  ops: ShieldCheck
};

export function PortalEntryPage({ audience }: { audience: PortalAudience }) {
  const portal = portalEntries.find((entry) => entry.key === audience);

  if (!portal) {
    return null;
  }

  const copy = portalCopy[audience];
  const Icon = portalIcons[audience];

  return (
    <main className="min-h-screen bg-ivory text-ink">
      <section className="relative isolate overflow-hidden bg-midnight text-white">
        <Image
          src="/images/hero-villa-atitlan.png"
          alt=""
          fill
          priority
          sizes="100vw"
          className="absolute inset-0 -z-20 h-full w-full object-cover"
        />
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(13,34,51,0.94)_0%,rgba(13,34,51,0.78)_54%,rgba(13,34,51,0.58)_100%)]" />

        <div className="container-shell flex items-center justify-between py-5">
          <a className="focus-ring inline-flex items-center gap-3 rounded-md" href="/">
            <Image
              src="/brand/kuquba-isotipo.svg"
              alt=""
              width={48}
              height={48}
              className="h-11 w-11 object-contain"
            />
            <span>
              <span className="block text-2xl font-semibold leading-none">KUQUBA</span>
              <span className="mt-1 block text-[0.62rem] uppercase text-[#1fb7a2]">
                Conexiones que generan confianza
              </span>
            </span>
          </a>

          <a
            className="focus-ring hidden items-center gap-2 rounded-[6px] border border-white/35 px-4 py-3 text-sm font-semibold text-white/90 transition hover:border-white hover:text-white sm:inline-flex"
            href="/"
          >
            <ArrowLeft aria-hidden className="h-4 w-4" />
            Volver
          </a>
        </div>

        <div className="container-shell grid gap-8 pb-12 pt-8 lg:grid-cols-[1fr_430px] lg:items-end">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/24 bg-white/8 px-4 py-2 text-sm font-semibold text-white/86">
              <Icon aria-hidden className="h-4 w-4 text-beige" />
              {copy.eyebrow}
            </div>
            <h1 className="mt-6 font-display text-[clamp(2.7rem,5vw,5rem)] leading-[1.05] text-white">
              {copy.title}
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-white/82">{copy.body}</p>
          </div>

          <PortalAccessForm
            accessMethod={portal.accessMethod}
            action={copy.action}
            audience={audience}
            primaryFieldLabel={copy.primaryFieldLabel}
            primaryFieldPlaceholder={copy.primaryFieldPlaceholder}
          />
        </div>
      </section>

      <section className="container-shell grid gap-5 py-8 md:grid-cols-3">
        {copy.notes.map((note) => (
          <article className="rounded-[8px] border border-line bg-white p-6 shadow-soft" key={note}>
            <BadgeCheck aria-hidden className="h-8 w-8 text-green" />
            <h2 className="mt-4 text-base font-semibold text-midnight">{note}</h2>
            <p className="mt-2 text-sm leading-6 text-ink/68">
              Acceso disponible segun rol, recurso asignado y estado de verificacion.
            </p>
          </article>
        ))}
      </section>
    </main>
  );
}
