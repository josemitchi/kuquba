"use client";

import type { PortalAudience } from "@kuquba/config";
import {
  ArrowLeft,
  BadgeCheck,
  Building2,
  CalendarCheck2,
  ClipboardCheck,
  FileText,
  LogOut,
  ShieldCheck,
  UserRound
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type DevSession = {
  audience: PortalAudience;
  expiresAt: string;
  sessionId: string;
  sessionToken: string;
  user: {
    displayName: string;
    emailMasked: string;
  };
  role: {
    key: string;
    name: string;
  };
  permissions: string[];
};

const dashboardCopy: Record<
  PortalAudience,
  {
    title: string;
    eyebrow: string;
    summary: string;
    items: string[];
    icon: typeof UserRound;
  }
> = {
  guest: {
    title: "Mi estancia",
    eyebrow: "Centro del huesped",
    summary: "Aqui vivira el resumen de reserva, llegada, soporte y checkout.",
    items: ["Reserva y pago", "Preparar llegada", "Soporte durante la estancia"],
    icon: CalendarCheck2
  },
  owner: {
    title: "Portal del propietario",
    eyebrow: "Gestion y transparencia",
    summary: "Aqui viviran propiedades asignadas, reservas, mantenimiento y liquidaciones.",
    items: ["Propiedades", "Reservas", "Documentos y liquidaciones"],
    icon: Building2
  },
  ops: {
    title: "Equipo KUQUBA",
    eyebrow: "Operacion interna",
    summary: "Aqui viviran calendario operacional, housekeeping, mantenimiento y auditoria.",
    items: ["Calendario", "Housekeeping", "Auditoria y permisos"],
    icon: ShieldCheck
  }
};

export function PortalDashboardPage({ audience }: { audience: PortalAudience }) {
  const [session, setSession] = useState<DevSession | null>(null);
  const [isValidating, setIsValidating] = useState(true);
  const router = useRouter();
  const copy = dashboardCopy[audience];
  const Icon = copy.icon;

  useEffect(() => {
    let isMounted = true;

    async function validateSession() {
      const rawSession = window.localStorage.getItem("kuquba.devSession");

      if (!rawSession) {
        setIsValidating(false);
        return;
      }

      try {
        const storedSession = JSON.parse(rawSession) as DevSession;

        if (!storedSession.sessionToken || storedSession.audience !== audience) {
          window.localStorage.removeItem("kuquba.devSession");
          setIsValidating(false);
          return;
        }

        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000"}/api/identity/session?audience=${audience}`,
          {
            headers: {
              "x-kuquba-dev-session": storedSession.sessionToken
            }
          }
        );

        if (!response.ok) {
          window.localStorage.removeItem("kuquba.devSession");
          setSession(null);
          setIsValidating(false);
          return;
        }

        const payload = (await response.json()) as { session: DevSession };

        if (isMounted) {
          window.localStorage.setItem("kuquba.devSession", JSON.stringify(payload.session));
          setSession(payload.session);
          setIsValidating(false);
        }
      } catch {
        window.localStorage.removeItem("kuquba.devSession");
        if (isMounted) {
          setSession(null);
          setIsValidating(false);
        }
      }
    }

    void validateSession();

    return () => {
      isMounted = false;
    };
  }, [audience]);

  async function handleLogout() {
    const token = session?.sessionToken;

    if (token) {
      await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000"}/api/identity/session/logout`,
        {
          headers: {
            "x-kuquba-dev-session": token
          },
          method: "POST"
        }
      ).catch(() => undefined);
    }

    window.localStorage.removeItem("kuquba.devSession");
    setSession(null);
    router.push(`/${audience === "guest" ? "stay" : audience}`);
  }

  return (
    <main className="min-h-screen bg-ivory text-ink">
      <header className="bg-midnight text-white">
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
            className="focus-ring inline-flex items-center gap-2 rounded-[6px] border border-white/35 px-4 py-3 text-sm font-semibold text-white/90 transition hover:border-white hover:text-white"
            href={`/${audience === "guest" ? "stay" : audience}`}
          >
            <ArrowLeft aria-hidden className="h-4 w-4" />
            Acceso
          </a>
        </div>
      </header>

      <section className="container-shell py-8">
        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          <div className="rounded-[8px] border border-line bg-white p-8 shadow-soft">
            <div className="inline-flex items-center gap-2 rounded-full bg-green/10 px-4 py-2 text-sm font-semibold text-green">
              <Icon aria-hidden className="h-4 w-4" />
              {copy.eyebrow}
            </div>
            <h1 className="mt-6 font-display text-4xl leading-tight text-midnight md:text-5xl">
              {copy.title}
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-ink/72">{copy.summary}</p>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {copy.items.map((item) => (
                <article className="rounded-[8px] border border-line bg-ivory p-5" key={item}>
                  <ClipboardCheck aria-hidden className="h-7 w-7 text-green" />
                  <h2 className="mt-4 text-sm font-semibold text-midnight">{item}</h2>
                  <p className="mt-2 text-sm leading-6 text-ink/62">Preparado para la siguiente fase.</p>
                </article>
              ))}
            </div>
          </div>

          <aside className="rounded-[8px] border border-line bg-white p-6 shadow-soft">
            <BadgeCheck aria-hidden className="h-9 w-9 text-green" />
            <h2 className="mt-4 text-lg font-semibold text-midnight">
              {isValidating ? "Validando acceso" : session ? "Sesion dev activa" : "Acceso pendiente"}
            </h2>
            {session ? (
              <div className="mt-4 space-y-3 text-sm text-ink/70">
                <p>
                  <span className="font-semibold text-midnight">Usuario:</span>{" "}
                  {session.user.displayName}
                </p>
                <p>
                  <span className="font-semibold text-midnight">Correo:</span>{" "}
                  {session.user.emailMasked}
                </p>
                <p>
                  <span className="font-semibold text-midnight">Rol:</span> {session.role.name}
                </p>
                <p>
                  <span className="font-semibold text-midnight">Permisos:</span>{" "}
                  {session.permissions.length}
                </p>
                <p>
                  <span className="font-semibold text-midnight">Expira:</span>{" "}
                  {new Date(session.expiresAt).toLocaleString("es-GT")}
                </p>
                <button
                  className="focus-ring mt-2 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-[6px] border border-line px-4 text-sm font-semibold text-midnight transition hover:border-green hover:text-green"
                  onClick={handleLogout}
                  type="button"
                >
                  <LogOut aria-hidden className="h-4 w-4" />
                  Cerrar sesion dev
                </button>
              </div>
            ) : isValidating ? (
              <p className="mt-4 text-sm leading-6 text-ink/68">
                Confirmando sesion con la API.
              </p>
            ) : (
              <p className="mt-4 text-sm leading-6 text-ink/68">
                Ingresa desde la pantalla de acceso para cargar una sesion validada por API.
              </p>
            )}
            <div className="mt-6 rounded-[6px] bg-ivory p-4 text-sm leading-6 text-ink/68">
              <FileText aria-hidden className="mb-3 h-5 w-5 text-green" />
              Este dashboard aun no contiene datos reales de reservas, propiedades o finanzas.
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
