import { publicContactEmail, publicCoverageDestinations } from "@kuquba/config";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Building2,
  CalendarCheck2,
  CheckCircle2,
  KeyRound,
  Mail,
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
      "Actualmente mostramos El Paredón, Monterrico y Puerto San José, zonas donde podemos coordinar soporte, llegada y seguimiento."
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
      "Puedes solicitar una evaluación de propiedad. Revisamos ubicación, condiciones, disponibilidad y operación antes de publicarla."
  }
] as const;

const termsSections = [
  {
    title: "Alcance del servicio",
    body: "KUQUBA administra estancias seleccionadas y facilita reservas directas, acceso privado, coordinación de llegada y soporte operativo. El uso del sitio implica aceptar estas condiciones y la información específica de cada reserva."
  },
  {
    title: "Cobertura y propiedades",
    body: "Mostramos únicamente destinos y propiedades donde existe cobertura operativa activa. Las fotografías, descripciones, amenidades, reglas y capacidades pueden actualizarse para reflejar cambios de operación o mantenimiento."
  },
  {
    title: "Cotizaciones y disponibilidad",
    body: "Las tarifas, noches, impuestos, cargos aplicables y disponibilidad se validan antes del pago. Una cotización inicial es informativa y no garantiza una reserva hasta que el sistema confirme el bloqueo temporal y el pago correspondiente."
  },
  {
    title: "Confirmación de reserva",
    body: "La reserva queda confirmada cuando KUQUBA registra el pago aprobado y emite la confirmación asociada. Mientras el pago esté pendiente, la disponibilidad puede estar protegida solo durante el tiempo indicado en el proceso de checkout."
  },
  {
    title: "Pagos y comprobantes",
    body: "Los pagos pueden procesarse mediante proveedores externos. KUQUBA registra el estado de la transacción, referencia, monto y reserva asociada; los datos completos de tarjetas u otros instrumentos de pago no se almacenan en el portal público."
  },
  {
    title: "Cambios, cancelaciones y reembolsos",
    body: "Las solicitudes de cambio, cancelación o reembolso se atienden según las condiciones informadas para cada estancia, la fecha de solicitud, los costos ya comprometidos y las políticas de los proveedores de pago o servicios involucrados."
  },
  {
    title: "Llegada, estancia y reglas de uso",
    body: "El huésped debe respetar horarios, capacidad, reglas de casa, instrucciones de llegada y condiciones comunicadas para la propiedad. Incidentes, daños, ocupación no autorizada o uso indebido pueden generar cargos o restricciones adicionales."
  },
  {
    title: "Acceso privado",
    body: "Los portales privados usan verificación por correo y permisos por rol. Cada usuario es responsable de usar únicamente el acceso que le corresponde y de no compartir códigos, enlaces o información privada de reservas, propiedades u operaciones."
  },
  {
    title: "Propietarios",
    body: "Solicitar una evaluación no implica aceptación ni publicación automática de una propiedad. KUQUBA revisa ubicación, documentación, disponibilidad, estándares mínimos, condiciones comerciales y viabilidad operativa antes de avanzar."
  },
  {
    title: "Actualizaciones y contacto",
    body: "KUQUBA puede actualizar contenido, cobertura, procesos y estas condiciones para mantener claridad operativa y calidad de servicio. Para dudas sobre una reserva, propiedad o acceso, utiliza el canal de contacto correspondiente."
  }
] as const;

const privacySections = [
  {
    title: "Responsable y alcance",
    body: "KUQUBA trata información relacionada con estancias, reservas, propietarios, huéspedes, accesos privados y solicitudes recibidas por medio del sitio o canales operativos vinculados al servicio."
  },
  {
    title: "Datos que recopilamos",
    body: "Podemos procesar nombre, correo, teléfono, datos de perfil, fechas de estancia, número de huéspedes, preferencias, propiedad reservada, estado de pago, solicitudes, mensajes y actividad básica de acceso al portal."
  },
  {
    title: "Uso de la información",
    body: "Usamos la información para validar disponibilidad, preparar cotizaciones, confirmar reservas, enviar códigos de acceso por correo, coordinar llegada, brindar soporte, administrar propiedades y mantener trazabilidad operativa."
  },
  {
    title: "Pagos y proveedores",
    body: "Cuando un pago se procesa con terceros, KUQUBA recibe datos necesarios para identificar la transacción, como estado, referencia, monto y reserva asociada. Los proveedores de pago gestionan la información sensible bajo sus propios controles."
  },
  {
    title: "Correos y comunicaciones",
    body: "Podemos enviar mensajes transaccionales sobre códigos de acceso, confirmaciones, pagos, llegada, cambios relevantes y soporte. Estos mensajes son necesarios para operar correctamente la reserva o la relación con la propiedad."
  },
  {
    title: "Seguridad y acceso",
    body: "Protegemos los portales con verificación por correo, permisos por rol y registros de actividad. Aun así, ningún sistema es absoluto; por eso limitamos el acceso a la información necesaria para cada perfil."
  },
  {
    title: "Conservación",
    body: "Conservamos información mientras sea necesaria para operar reservas, atender solicitudes, cumplir obligaciones, resolver incidencias, prevenir uso indebido y mantener registros razonables del servicio."
  },
  {
    title: "Solicitudes de datos",
    body: "Puedes solicitar revisión, corrección o actualización de información vinculada a tu reserva, propiedad o perfil. Para proteger el acceso, podremos validar tu identidad antes de atender la solicitud."
  },
  {
    title: "Cookies y analítica técnica",
    body: "El sitio puede usar tecnologías necesarias para funcionamiento, seguridad, medición técnica y mejora de experiencia. Evitamos recolectar más información de la necesaria para operar y mejorar el servicio."
  },
  {
    title: "Actualizaciones de privacidad",
    body: "Podemos actualizar esta política cuando cambien procesos, proveedores o funcionalidades. La versión publicada en el sitio será la referencia vigente para usuarios, huéspedes y propietarios."
  }
] as const;

const stayRulesSections = [
  {
    title: "Uso permitido",
    body: "La propiedad debe utilizarse únicamente como alojamiento temporal para los huéspedes incluidos en la reserva. No se permite subarrendar, organizar eventos, sesiones comerciales, fiestas o actividades no autorizadas por KUQUBA o el propietario."
  },
  {
    title: "Capacidad y visitantes",
    body: "La ocupación no puede exceder la capacidad aprobada ni el número de huéspedes indicado en la reserva. Cualquier visitante, cambio de huésped o solicitud especial debe coordinarse antes de la llegada y puede estar sujeto a aprobación o cargos adicionales."
  },
  {
    title: "Llegada y salida",
    body: "Los horarios de check-in, check-out e instrucciones de acceso se informan en el portal de huéspedes o por el equipo KUQUBA. Llegadas tardías, salidas después del horario o cambios de coordinación pueden requerir confirmación operativa previa."
  },
  {
    title: "Cuidado de la propiedad",
    body: "El huésped debe cuidar mobiliario, equipo, llaves, amenidades, áreas comunes y elementos de seguridad. Daños, faltantes, limpieza extraordinaria, uso indebido o pérdida de accesos pueden generar cobros según evidencia y costos aplicables."
  },
  {
    title: "Convivencia y ruido",
    body: "Se debe respetar la tranquilidad del entorno, vecinos, personal y normas de la propiedad. Ruido excesivo, conducta riesgosa, consumo indebido, molestias recurrentes o incumplimiento de instrucciones pueden provocar restricciones, cargos o terminación anticipada de la estancia."
  },
  {
    title: "Pagos, cargos y garantías",
    body: "La reserva se confirma cuando el pago es aprobado. KUQUBA puede solicitar pagos pendientes, cargos por daños, penalidades informadas, extensiones, limpieza extraordinaria, reposiciones o costos derivados del incumplimiento del reglamento o condiciones específicas de la estancia."
  },
  {
    title: "Seguridad y accesos",
    body: "Los códigos, llaves, enlaces e instrucciones de acceso son privados. El huésped debe mantenerlos bajo resguardo, no compartirlos con personas no autorizadas y reportar de inmediato cualquier pérdida, incidente, emergencia o condición insegura."
  },
  {
    title: "Mantenimiento e incidencias",
    body: "Si ocurre una falla, daño o situación que afecte la estancia, el huésped debe reportarla por los canales indicados. KUQUBA coordinará seguimiento razonable según disponibilidad, urgencia, proveedores y condiciones de la propiedad."
  },
  {
    title: "Limitación de responsabilidad",
    body: "KUQUBA no responde por objetos personales, servicios externos, eventos de fuerza mayor, actos de terceros, interrupciones fuera de su control o uso de la propiedad contrario a las instrucciones. La responsabilidad se limita al alcance operativo de la reserva confirmada."
  },
  {
    title: "Reglas específicas",
    body: "Cada propiedad puede tener reglas adicionales sobre parqueo, mascotas, piscina, cocina, áreas compartidas, acceso, depósitos, documentación o restricciones locales. Cuando existan reglas específicas, prevalecen para esa estancia y forman parte de la reserva."
  }
] as const;

const contactChannels = [
  {
    title: "Información general",
    body: "Escríbenos para dudas generales, alianzas o solicitudes que no encajan en otro portal.",
    href: `mailto:${publicContactEmail}`,
    action: publicContactEmail,
    icon: Mail
  },
  {
    title: "Quiero reservar una estancia",
    body: "Explora zonas activas, fechas disponibles y capacidad antes de continuar a cotización.",
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
      description="Respuestas directas sobre cobertura, reservas, acceso y propiedades de KUQUBA."
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
        <div className="grid gap-4">
          {faqItems.map((item) => (
            <article
              className="rounded-[8px] border border-line bg-white p-6 shadow-soft"
              key={item.question}
            >
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
      description="Condiciones base para usar el sitio, consultar estancias, solicitar evaluaciones y acceder a portales KUQUBA."
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

export function StayRulesPageContent() {
  return (
    <PublicInfoLayout
      eyebrow="Reglas de estancia"
      title="Reglamento de estancia"
      description="Condiciones de uso de la propiedad, convivencia, cobros operativos y responsabilidades aplicables a cada reserva."
    >
      <PolicyArticle sections={stayRulesSections} />
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
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {contactChannels.map((channel) => (
          <ContactCard key={channel.title} {...channel} />
        ))}
        <CoverageAside className="md:col-span-2 xl:col-span-4" sticky={false} />
        <SupportGuidanceCard className="md:col-span-2 xl:col-span-4" />
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
            src="/images/hero-pacific-beach.png"
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
              <p className="mt-6 max-w-2xl text-lg leading-8 text-white/84 md:text-xl">
                {description}
              </p>
            </div>
          </div>
        </section>

        <section className="container-shell relative z-10 -mt-10 pb-16">{children}</section>
      </main>
      <SiteFooter />
    </>
  );
}

function CoverageAside({
  className = "",
  sticky = true
}: {
  className?: string;
  sticky?: boolean;
}) {
  const stickyClassName = sticky ? " lg:sticky lg:top-6" : "";

  return (
    <aside
      className={`h-full rounded-[8px] border border-line bg-white p-6 shadow-soft${stickyClassName} ${className}`}
    >
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
        Última actualización: septiembre de 2026.
      </p>
    </article>
  );
}

function SupportGuidanceCard({ className = "" }: { className?: string }) {
  const guidanceItems = [
    "Si ya tienes reserva, usa el portal de huéspedes.",
    "Si quieres reservar, empieza por destino y fechas.",
    "Si tienes propiedad, solicita evaluación antes de enviar documentos."
  ];

  return (
    <section
      className={`rounded-[8px] border border-line bg-white p-6 shadow-soft md:p-7 ${className}`}
    >
      <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)] lg:items-center">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[6px] bg-green/10 text-green">
            <ShieldCheck aria-hidden className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-green">Soporte ordenado</p>
            <h2 className="mt-1 text-xl font-semibold leading-7 text-midnight">
              Antes de escribirnos
            </h2>
          </div>
        </div>
        <ul className="grid gap-4 text-sm leading-6 text-ink/68 md:grid-cols-3">
          {guidanceItems.map((item) => (
            <li className="flex gap-3" key={item}>
              <CheckCircle2 aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-green" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
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
    <article className="flex h-full flex-col rounded-[8px] border border-line bg-white p-6 shadow-soft">
      <div className="flex h-12 w-12 items-center justify-center rounded-[6px] bg-green/10 text-green">
        <Icon aria-hidden className="h-6 w-6" />
      </div>
      <h2 className="mt-5 text-xl font-semibold leading-7 text-midnight">{title}</h2>
      <p className="mb-6 mt-3 text-sm leading-6 text-ink/68">{body}</p>
      <a
        className="focus-ring mt-auto inline-flex min-h-11 items-center justify-center gap-2 rounded-[6px] bg-green px-5 text-sm font-semibold text-white transition hover:bg-[#0f5c50]"
        href={href}
      >
        {action}
        <ArrowRight aria-hidden className="h-4 w-4" />
      </a>
    </article>
  );
}
