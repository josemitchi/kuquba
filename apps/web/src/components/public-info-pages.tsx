import { publicCoverageDestinations } from "@kuquba/config";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Building2,
  CalendarCheck2,
  CheckCircle2,
  KeyRound,
  MapPin,
  MessageCircle,
  ShieldCheck,
  type LucideIcon
} from "lucide-react";
import Image from "next/image";

import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";

const faqItems = [
  {
    question: "¿En qué zonas opera KUQUBA?",
    answer:
      "Actualmente mostramos solo destinos donde podemos coordinar soporte, llegada y seguimiento. Las zonas activas aparecen en el buscador público."
  },
  {
    question: "¿Puedo buscar estancias en otra ubicación?",
    answer:
      "Por ahora no abrimos búsqueda libre. Preferimos mostrar menos destinos y cumplir bien, antes que crear expectativas en zonas sin operación activa."
  },
  {
    question: "¿Cómo se confirma una reserva?",
    answer:
      "Seleccionas estancia, fechas y huéspedes. Luego validamos disponibilidad, tarifa y bloqueo temporal antes de continuar al pago."
  },
  {
    question: "¿Por qué el acceso usa código de verificación?",
    answer:
      "El portal protege datos de reserva, pagos e información de llegada. Por eso usamos verificación por correo asociado a la reserva."
  },
  {
    question: "Soy propietario, ¿cómo inicio?",
    answer:
      "Puedes solicitar una evaluación de propiedad. Revisamos ubicación, condiciones, disponibilidad y operacion antes de publicarla."
  }
] as const;

const termsSections = [
  {
    title: "Uso del sitio",
    body:
      "KUQUBA permite explorar estancias seleccionadas, solicitar evaluación de propiedades y acceder a portales privados de huéspedes, propietarios y operaciones."
  },
  {
    title: "Disponibilidad y tarifas",
    body:
      "La disponibilidad, tarifa, noches y bloqueo temporal se validan antes del pago. Una cotizacion inicial no garantiza reserva hasta que el pago sea aprobado y la reserva quede confirmada."
  },
  {
    title: "Reservas y pagos",
    body:
      "Los pagos se procesan mediante proveedores externos. KUQUBA registra el estado de pago y habilita el acceso del huesped cuando la reserva queda confirmada."
  },
  {
    title: "Llegada y estancia",
    body:
      "El huesped debe usar la propiedad segun las reglas indicadas en la reserva. Los horarios, instrucciones de llegada y condiciones pueden variar por propiedad."
  },
  {
    title: "Propietarios",
    body:
      "La solicitud de evaluación no publica una propiedad de forma automatica. KUQUBA revisa operacion, disponibilidad, condiciones y documentacion antes de avanzar."
  },
  {
    title: "Cambios del servicio",
    body:
      "Podemos ajustar contenido, disponibilidad, zonas de cobertura y flujos operativos para mejorar la experiencia y proteger la calidad del servicio."
  }
] as const;

const privacySections = [
  {
    title: "Datos que usamos",
    body:
      "Podemos procesar datos de contacto, perfil de huesped, reserva, propiedad, estado de pago, actividad de acceso y comunicaciones necesarias para operar el servicio."
  },
  {
    title: "Para qué usamos la información",
    body:
      "Usamos la información para validar disponibilidad, confirmar reservas, enviar códigos de acceso, coordinar llegada, dar soporte y mantener registros operativos."
  },
  {
    title: "Proveedores",
    body:
      "Podemos apoyarnos en proveedores de hosting, base de datos, correo transaccional, analítica técnica y pagos. Cada proveedor recibe solo la información necesaria para su función."
  },
  {
    title: "Seguridad",
    body:
      "Protegemos portales privados con verificación y control de acceso por rol. Las acciones sensibles pueden quedar registradas para auditoría operativa."
  },
  {
    title: "Conservación",
    body:
      "Conservamos información mientras sea necesaria para operar reservas, cumplir obligaciones, atender soporte y mantener trazabilidad razonable del servicio."
  },
  {
    title: "Solicitudes de datos",
    body:
      "Si necesitas corregir o consultar información vinculada a una reserva o propiedad, utiliza el canal de acceso correspondiente para iniciar la solicitud."
  }
] as const;

const contactChannels = [
  {
    title: "Quiero reservar una estancia",
    body: "Explora zonas activas, fechas disponibles y capacidad antes de continuar a cotizacion.",
    href: "/stay/search",
    action: "Buscar estancia",
    icon: CalendarCheck2
  },
  {
    title: "Ya tengo una reserva",
    body: "Entra con el correo asociado a tu reserva para revisar pagos, llegada y detalles privados.",
    href: "/stay",
    action: "Acceso huéspedes",
    icon: KeyRound
  },
  {
    title: "Tengo una propiedad",
    body: "Solicita una evaluación para revisar si tu propiedad puede operar con KUQUBA.",
    href: "/owner/evaluate",
    action: "Evaluar propiedad",
    icon: Building2
  }
] as const;

export function FaqPageContent() {
  return (
    <PublicInfoLayout
      eyebrow="Ayuda"
      title="Preguntas frecuentes"
      description="Respuestas directas sobre cobertura, reservas, acceso y propiedades dentro del MVP de KUQUBA."
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
        <div className="grid gap-4">
          {faqItems.map((item) => (
            <article className="rounded-[8px] border border-line bg-white p-6 shadow-soft" key={item.question}>
              <div className="flex gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[6px] bg-green/10 text-green">
                  <MessageCircle aria-hidden className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-midnight">{item.question}</h2>
                  <p className="mt-3 text-sm leading-6 text-ink/68">{item.answer}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
        <CoverageAside />
      </div>
    </PublicInfoLayout>
  );
}

export function TermsPageContent() {
  return (
    <PublicInfoLayout
      eyebrow="Legal"
      title="Términos y condiciones"
      description="Condiciones base para usar el sitio, consultar estancias, solicitar evaluaciónes y acceder a portales KUQUBA."
    >
      <PolicyArticle sections={termsSections} />
    </PublicInfoLayout>
  );
}

export function PrivacyPageContent() {
  return (
    <PublicInfoLayout
      eyebrow="Privacidad"
      title="Políticas de privacidad"
      description="Resumen de cómo KUQUBA usa información para operar reservas, accesos privados y soporte."
    >
      <PolicyArticle sections={privacySections} />
    </PublicInfoLayout>
  );
}

export function ContactPageContent() {
  return (
    <PublicInfoLayout
      eyebrow="Contacto"
      title="¿Cómo podemos ayudarte?"
      description="Elige el canal correcto según lo que necesitas. Así mantenemos cada solicitud vinculada al flujo adecuado."
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
        <div className="grid gap-4 md:grid-cols-3">
          {contactChannels.map((channel) => (
            <ContactCard key={channel.title} {...channel} />
          ))}
        </div>

        <aside className="grid gap-5">
          <CoverageAside />
          <section className="rounded-[8px] border border-line bg-white p-6 shadow-soft">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-[6px] bg-green/10 text-green">
                <ShieldCheck aria-hidden className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-green">Soporte ordenado</p>
                <h2 className="text-lg font-semibold text-midnight">Antes de escribirnos</h2>
              </div>
            </div>
            <ul className="mt-5 space-y-3 text-sm leading-6 text-ink/68">
              {[
                "Si ya tienes reserva, usa el portal de huéspedes.",
                "Si quieres reservar, empieza por destino y fechas.",
                "Si tienes propiedad, solicita evaluación antes de enviar documentos."
              ].map((item) => (
                <li className="flex gap-3" key={item}>
                  <CheckCircle2 aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-green" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>
    </PublicInfoLayout>
  );
}

function PublicInfoLayout({
  children,
  description,
  eyebrow,
  title
}: {
  children: React.ReactNode;
  description: string;
  eyebrow: string;
  title: string;
}) {
  return (
    <>
      <main className="min-h-screen bg-ivory text-ink">
        <section className="relative isolate overflow-hidden bg-midnight text-white">
          <Image
            alt=""
            className="absolute inset-0 -z-20 h-full w-full object-cover brightness-110 saturate-110"
            fill
            priority
            sizes="100vw"
            src="/images/hero-villa-atitlan.png"
          />
          <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(13,34,51,0.94)_0%,rgba(13,34,51,0.76)_56%,rgba(13,34,51,0.52)_100%)]" />
          <div className="absolute inset-x-0 bottom-0 -z-10 h-36 bg-gradient-to-t from-ivory to-transparent" />

          <SiteHeader homeHref="/" navigationBaseHref="/" />

          <div className="container-shell pb-16 pt-8 md:pb-20 md:pt-12">
            <a
              className="focus-ring inline-flex items-center gap-2 rounded-[6px] border border-white/24 bg-white/8 px-4 py-2 text-sm font-semibold text-white/86 transition hover:border-white hover:text-white"
              href="/"
            >
              <ArrowLeft aria-hidden className="h-4 w-4" />
              Volver a KUQUBA
            </a>
            <div className="mt-8 max-w-3xl">
              <p className="text-xs font-semibold uppercase text-beige">{eyebrow}</p>
              <h1 className="mt-4 font-display text-[clamp(2.8rem,6vw,5.2rem)] leading-[1.04] text-white">
                {title}
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-white/84 md:text-xl">{description}</p>
            </div>
          </div>
        </section>

        <section className="container-shell relative z-10 -mt-10 pb-16">{children}</section>
      </main>
      <SiteFooter />
    </>
  );
}

function CoverageAside() {
  return (
    <aside className="rounded-[8px] border border-line bg-white p-6 shadow-soft lg:sticky lg:top-6">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-[6px] bg-green/10 text-green">
          <MapPin aria-hidden className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase text-green">Cobertura actual</p>
          <h2 className="text-lg font-semibold text-midnight">Zonas activas</h2>
        </div>
      </div>
      <ul className="mt-5 space-y-3 text-sm font-semibold text-midnight">
        {publicCoverageDestinations.map((destination) => (
          <li className="flex items-center gap-3" key={destination}>
            <BadgeCheck aria-hidden className="h-5 w-5 text-green" />
            <span>{destination}</span>
          </li>
        ))}
      </ul>
      <p className="mt-5 border-t border-line pt-5 text-sm leading-6 text-ink/66">
        Si no ves tu destino, aún no tenemos cobertura pública en esa zona.
      </p>
    </aside>
  );
}

function PolicyArticle({ sections }: { sections: readonly { body: string; title: string }[] }) {
  return (
    <article className="rounded-[8px] border border-line bg-white p-6 shadow-panel md:p-8">
      <div className="grid gap-6 md:grid-cols-2">
        {sections.map((section) => (
          <section className="rounded-[8px] border border-line bg-ivory p-5" key={section.title}>
            <h2 className="text-lg font-semibold text-midnight">{section.title}</h2>
            <p className="mt-3 text-sm leading-6 text-ink/68">{section.body}</p>
          </section>
        ))}
      </div>
      <p className="mt-6 border-t border-line pt-5 text-sm leading-6 text-ink/60">
        Este contenido es una base operativa para el MVP y puede actualizarse conforme avance el servicio.
      </p>
    </article>
  );
}

function ContactCard({
  action,
  body,
  href,
  icon: Icon,
  title
}: {
  action: string;
  body: string;
  href: string;
  icon: LucideIcon;
  title: string;
}) {
  return (
    <article className="rounded-[8px] border border-line bg-white p-6 shadow-soft">
      <div className="flex h-12 w-12 items-center justify-center rounded-[6px] bg-green/10 text-green">
        <Icon aria-hidden className="h-6 w-6" />
      </div>
      <h2 className="mt-5 text-xl font-semibold leading-7 text-midnight">{title}</h2>
      <p className="mt-3 text-sm leading-6 text-ink/68">{body}</p>
      <a
        className="focus-ring mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-[6px] bg-green px-5 text-sm font-semibold text-white transition hover:bg-[#0f5c50]"
        href={href}
      >
        {action}
        <ArrowRight aria-hidden className="h-4 w-4" />
      </a>
    </article>
  );
}