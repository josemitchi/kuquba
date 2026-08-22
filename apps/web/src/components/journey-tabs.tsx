"use client";

import { CalendarCheck, Heart, Home, Search, UserRound } from "lucide-react";
import { useState } from "react";

const flows = {
  guests: {
    label: "Para huespedes",
    steps: [
      {
        title: "Busca tu destino",
        copy: "Cuentanos donde y cuando quieres viajar.",
        icon: Search
      },
      {
        title: "Encuentra tu estancia",
        copy: "Te mostramos propiedades que se adaptan a tu viaje.",
        icon: Home
      },
      {
        title: "Reserva de forma segura",
        copy: "Confirma tu estancia facilmente y sin complicaciones.",
        icon: CalendarCheck
      },
      {
        title: "Disfruta y relajate",
        copy: "Te acompanamos antes, durante y despues de tu estancia.",
        icon: Heart
      }
    ]
  },
  owners: {
    label: "Para propietarios",
    steps: [
      {
        title: "Evaluamos tu propiedad",
        copy: "Revisamos ubicacion, condicion y potencial operativo.",
        icon: Search
      },
      {
        title: "Preparamos y comercializamos",
        copy: "Configuramos la propiedad para una operacion consistente.",
        icon: Home
      },
      {
        title: "Operamos integralmente",
        copy: "Coordinamos reservas, limpieza, mantenimiento y soporte.",
        icon: CalendarCheck
      },
      {
        title: "Recibes visibilidad",
        copy: "Consultas resultados reales, documentos e incidencias.",
        icon: UserRound
      }
    ]
  }
} as const;

type FlowKey = keyof typeof flows;

export function JourneyTabs() {
  const [active, setActive] = useState<FlowKey>("guests");
  const selected = flows[active];

  return (
    <section className="container-shell py-12 md:py-16" id="nosotros">
      <div className="mx-auto max-w-4xl text-center">
        <p className="text-xs font-semibold uppercase text-green">Como funciona</p>
        <div className="mx-auto mt-5 grid max-w-xl grid-cols-2 rounded-full border border-line bg-white p-1">
          {(Object.keys(flows) as FlowKey[]).map((key) => (
            <button
              className={`focus-ring flex items-center justify-center gap-2 rounded-full px-4 py-3 text-sm font-semibold transition ${
                active === key ? "bg-green text-white shadow-soft" : "text-ink hover:bg-ivory"
              }`}
              key={key}
              onClick={() => setActive(key)}
              type="button"
            >
              {key === "guests" ? (
                <UserRound aria-hidden className="h-4 w-4" />
              ) : (
                <Home aria-hidden className="h-4 w-4" />
              )}
              {flows[key].label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-10 grid gap-5 md:grid-cols-4">
        {selected.steps.map((step, index) => {
          const Icon = step.icon;

          return (
            <article className="relative text-center" key={step.title}>
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-line bg-white text-green shadow-soft">
                <Icon aria-hidden className="h-7 w-7" />
              </div>
              <div className="mx-auto mt-5 flex h-7 w-7 items-center justify-center rounded-full bg-green text-sm font-bold text-white">
                {index + 1}
              </div>
              <h3 className="mt-4 text-base font-semibold text-midnight">{step.title}</h3>
              <p className="mx-auto mt-2 max-w-56 text-sm leading-6 text-ink/70">{step.copy}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
