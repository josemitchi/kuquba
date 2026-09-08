import { portalEntries, type PortalAudience } from "@kuquba/config";
import {
  ArrowLeft,
  BadgeCheck,
  Building2,
  CalendarCheck2,
  CheckCircle2,
  CreditCard,
  FileCheck2,
  Home,
  MapPin,
  MessageCircle,
  ShieldCheck,
  type LucideIcon
} from "lucide-react";
import Image from "next/image";

import { PortalAccessForm } from "./portal-access-form";

type PortalFeature = {
  body: string;
  icon: LucideIcon;
  title: string;
};

type PortalCopy = {
  action: string;
  body: string;
  cards: PortalFeature[];
  eyebrow: string;
  fieldHelp: string;
  formTitle: string;
  highlights: string[];
  primaryFieldLabel: string;
  primaryFieldPlaceholder: string;
  sectionBody: string;
  sectionEyebrow: string;
  sectionTitle: string;
  securityText: string;
  steps: string[];
  title: string;
};

const portalCopy: Record<PortalAudience, PortalCopy> = {
  guest: {
    eyebrow: "Portal de huéspedes",
    title: "Tu estancia, pagos y llegada en un solo lugar.",
    body:
      "Ingresa con el correo asociado a tu reserva para consultar información privada antes, durante y después de tu estancia.",
    primaryFieldLabel: "Correo de la reserva",
    primaryFieldPlaceholder: "correo@ejemplo.com",
    action: "Enviar código",
    formTitle: "Entrar a mi reserva",
    fieldHelp: "Usa el correo que indicaste al reservar.",
    securityText: "Te enviaremos un código de un solo uso. No necesitas recordar contraseñas.",
    highlights: [
      "Reservas vinculadas a tu contacto",
      "Pago, fechas y estado en una sola vista",
      "Instrucciones de llegada cuando la estancia está confirmada"
    ],
    steps: ["Ingresa tu correo", "Confirma el código", "Revisa tu estancia"],
    sectionEyebrow: "Para tu estancia",
    sectionTitle: "Información útil antes de llegar.",
    sectionBody: "Consulta lo esencial de tu reserva sin buscar entre correos o mensajes.",
    cards: [
      {
        title: "Reserva y pago",
        body: "Consulta estado, total confirmado y referencia de tu reserva.",
        icon: CreditCard
      },
      {
        title: "Llegada preparada",
        body: "Revisa fechas, horario de check-in y detalles de tu estancia.",
        icon: MapPin
      },
      {
        title: "Soporte durante la estancia",
        body: "Ten a mano la información necesaria para coordinar con KUQUBA.",
        icon: MessageCircle
      }
    ]
  },
  owner: {
    eyebrow: "Portal de propietarios",
    title: "Tu propiedad, reservas y seguimiento con claridad.",
    body:
      "Accede al panel privado de propiedades incorporadas para revisar reservas, disponibilidad, tareas, documentos y liquidaciones.",
    primaryFieldLabel: "Correo del propietario",
    primaryFieldPlaceholder: "propietario@ejemplo.com",
    action: "Solicitar código",
    formTitle: "Entrar como propietario",
    fieldHelp: "Usa el correo autorizado por KUQUBA para tu propiedad.",
    securityText: "Protegemos información operacional, documentos y movimientos de tu propiedad.",
    highlights: [
      "Vista privada por propiedad asignada",
      "Reservas, disponibilidad y tareas operativas",
      "Documentos y liquidaciones centralizados"
    ],
    steps: ["Ingresa tu correo", "Confirma el código", "Consulta tu panel"],
    sectionEyebrow: "Para propietarios",
    sectionTitle: "Seguimiento claro para tu propiedad.",
    sectionBody: "Revisa reservas, pendientes y documentos con una vista pensada para tomar acción.",
    cards: [
      {
        title: "Reservas asignadas",
        body: "Consulta próximas estadías, historial y estado de cada reserva.",
        icon: CalendarCheck2
      },
      {
        title: "Propiedad en control",
        body: "Revisa disponibilidad, bloqueos y condiciones acordadas con KUQUBA.",
        icon: Home
      },
      {
        title: "Documentos y liquidaciones",
        body: "Mantiene contratos, reportes y movimientos en un acceso privado.",
        icon: FileCheck2
      }
    ]
  },
  ops: {
    eyebrow: "Operaciones KUQUBA",
    title: "Coordina reservas, tareas y casos con control.",
    body:
      "Acceso interno para el equipo KUQUBA con permisos por rol, trazabilidad y seguimiento de acciones sensibles.",
    primaryFieldLabel: "Correo corporativo",
    primaryFieldPlaceholder: "equipo@kuquba.com",
    action: "Entrar a operaciones",
    formTitle: "Acceso de equipo",
    fieldHelp: "Usa tu correo corporativo autorizado para operar en KUQUBA.",
    securityText: "El acceso interno requiere verificación para proteger datos sensibles.",
    highlights: [
      "Casos, reservas y tareas en un flujo operativo",
      "Permisos por rol y acciones auditadas",
      "Seguimiento para housekeeping, mantenimiento y soporte"
    ],
    steps: ["Valida tu correo", "Confirma el código", "Abre operaciones"],
    sectionEyebrow: "Para el equipo",
    sectionTitle: "Control diario para operar mejor.",
    sectionBody: "Centraliza reservas, tareas y decisiones sensibles para mantener la operación ordenada.",
    cards: [
      {
        title: "Mesa operativa",
        body: "Da seguimiento a solicitudes, conversiones, reservas y casos abiertos.",
        icon: Building2
      },
      {
        title: "Llegadas y calendario",
        body: "Coordina disponibilidad, preparación, bloqueos y ventanas de llegada.",
        icon: CalendarCheck2
      },
      {
        title: "Control y auditoría",
        body: "Mantiene visibilidad sobre cambios sensibles y decisiones operativas.",
        icon: ShieldCheck
      }
    ]
  }
};

const portalIcons: Record<PortalAudience, LucideIcon> = {
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
          src="/images/hero-pacific-beach.png"
          alt=""
          fill
          priority
          sizes="100vw"
          className="absolute inset-0 -z-20 h-full w-full object-cover brightness-110 saturate-110"
        />
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(13,34,51,0.96)_0%,rgba(13,34,51,0.82)_52%,rgba(13,34,51,0.58)_100%)]" />
        <div className="absolute inset-x-0 bottom-0 -z-10 h-36 bg-gradient-to-t from-ivory to-transparent" />

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

        <div className="container-shell grid gap-8 pb-14 pt-8 lg:grid-cols-[minmax(0,1fr)_430px] lg:items-center">
          <div className="max-w-4xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/24 bg-white/8 px-4 py-2 text-sm font-semibold text-white/86">
              <Icon aria-hidden className="h-4 w-4 text-beige" />
              {copy.eyebrow}
            </div>
            <h1 className="mt-6 max-w-4xl font-display text-[clamp(2.7rem,5vw,5rem)] leading-[1.04] text-white">
              {copy.title}
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-white/84">{copy.body}</p>

            <ul className="mt-7 grid gap-3 text-sm leading-6 text-white/84 sm:grid-cols-3">
              {copy.highlights.map((highlight) => (
                <li className="flex gap-3 rounded-[8px] border border-white/14 bg-white/8 p-4 backdrop-blur" key={highlight}>
                  <CheckCircle2 aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-beige" />
                  <span>{highlight}</span>
                </li>
              ))}
            </ul>

            <AccessGuide steps={copy.steps} />
          </div>

          <PortalAccessForm
            accessMethod={portal.accessMethod}
            action={copy.action}
            audience={audience}
            helperText={copy.fieldHelp}
            securityText={copy.securityText}
            title={copy.formTitle}
            primaryFieldLabel={copy.primaryFieldLabel}
            primaryFieldPlaceholder={copy.primaryFieldPlaceholder}
          />
        </div>
      </section>

      <section className="container-shell py-10 md:py-14">
        <div className="mb-6 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase text-green">{copy.sectionEyebrow}</p>
            <h2 className="mt-2 font-display text-3xl leading-tight text-midnight md:text-4xl">
              {copy.sectionTitle}
            </h2>
          </div>
          <p className="max-w-xl text-sm leading-6 text-ink/66">{copy.sectionBody}</p>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {copy.cards.map((card) => {
            const CardIcon = card.icon;

            return (
              <article className="rounded-[8px] border border-line bg-white p-6 shadow-soft" key={card.title}>
                <div className="flex h-12 w-12 items-center justify-center rounded-[6px] bg-green/10 text-green">
                  <CardIcon aria-hidden className="h-6 w-6" />
                </div>
                <h3 className="mt-5 text-xl font-semibold leading-7 text-midnight">{card.title}</h3>
                <p className="mt-3 text-sm leading-6 text-ink/68">{card.body}</p>
                <div className="mt-5 flex items-center gap-2 border-t border-line pt-4 text-xs font-semibold uppercase text-green">
                  <BadgeCheck aria-hidden className="h-4 w-4" />
                  Acceso verificado
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}

function AccessGuide({ steps }: { steps: string[] }) {
  return (
    <div className="mt-7 max-w-3xl rounded-[8px] border border-white/14 bg-midnight/42 px-4 py-4 backdrop-blur">
      <p className="text-xs font-semibold uppercase text-beige">Acceso en minutos</p>
      <ol className="mt-3 grid gap-3 text-sm font-semibold text-white/88 sm:grid-cols-3">
        {steps.map((step, index) => (
          <li className="flex items-center gap-3" key={step}>
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-beige/45 bg-white/8 text-xs text-beige">
              {index + 1}
            </span>
            <span className="leading-5">{step}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}