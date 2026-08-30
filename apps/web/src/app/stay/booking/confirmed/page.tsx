import { ArrowRight, CalendarCheck2, CheckCircle2, CreditCard, KeyRound, MapPin, ShieldCheck } from "lucide-react";
import Image from "next/image";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

type BookingConfirmedParams = Record<string, string | string[] | undefined>;

export default async function BookingConfirmedRoute({
  searchParams
}: {
  searchParams: Promise<BookingConfirmedParams>;
}) {
  const params = await searchParams;
  const reservationCode = readParam(params.reservationCode) || "Reserva confirmada";
  const email = readParam(params.email);
  const propertyName = readParam(params.propertyName) || "Propiedad confirmada";
  const unitName = readParam(params.unitName) || "Unidad asignada";
  const arrivalDate = readParam(params.arrivalDate);
  const departureDate = readParam(params.departureDate);
  const nights = readParam(params.nights);
  const total = readParam(params.total);
  const currency = readParam(params.currency) || "GTQ";
  const statusLabel = readParam(params.statusLabel) || "Confirmada";
  const stayDates = arrivalDate && departureDate ? `${formatDate(arrivalDate)} - ${formatDate(departureDate)}` : "Fechas confirmadas";
  const totalLabel = total ? formatCurrency(total, currency) : "Monto confirmado";

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
            src="/images/guest-suite.png"
          />
          <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(13,34,51,0.96)_0%,rgba(13,34,51,0.84)_52%,rgba(13,34,51,0.58)_100%)]" />
          <div className="absolute inset-x-0 bottom-0 -z-10 h-40 bg-gradient-to-t from-ivory to-transparent" />

          <SiteHeader homeHref="/" navigationBaseHref="/" />

          <div className="container-shell pb-16 pt-10 md:pb-24 md:pt-16">
            <div className="max-w-3xl">
              <p className="inline-flex items-center gap-2 rounded-full border border-green/30 bg-green/15 px-3 py-1 text-xs font-semibold uppercase text-beige">
                <CheckCircle2 aria-hidden className="h-4 w-4 text-green" />
                Pago confirmado
              </p>
              <h1 className="mt-5 font-display text-[clamp(2.8rem,6vw,5.4rem)] leading-[1.04] text-white">
                Tu reserva esta lista.
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-white/84 md:text-xl">
                Confirmamos tu estancia en {propertyName}. El acceso de huesped quedo habilitado
                con el correo de la reserva para consultar fechas, pago y proximos pasos.
              </p>
            </div>
          </div>
        </section>

        <section className="container-shell relative z-10 -mt-10 pb-16">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
            <section className="rounded-[8px] border border-line bg-white p-6 shadow-panel md:p-8">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[6px] bg-green/10 text-green">
                  <CalendarCheck2 aria-hidden className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-green">Codigo de reserva</p>
                  <h2 className="mt-2 text-2xl font-semibold text-midnight">{reservationCode}</h2>
                  {email ? <p className="mt-2 text-sm text-ink/62">Acceso habilitado para {email}.</p> : null}
                </div>
              </div>

              <div className="mt-8 grid gap-4 md:grid-cols-2">
                <SummaryItem icon={MapPin} label="Propiedad" value={propertyName} detail={unitName} />
                <SummaryItem icon={CalendarCheck2} label="Fechas" value={stayDates} detail={nights ? `${nights} noche(s)` : undefined} />
                <SummaryItem icon={CreditCard} label="Pago" value={totalLabel} detail={statusLabel} />
                <SummaryItem icon={ShieldCheck} label="Acceso" value="Portal de huesped" detail="Protegido por OTP" />
              </div>

              <div className="mt-8 border-t border-line pt-6">
                <p className="text-xs font-semibold uppercase text-ink/48">Siguientes pasos</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  {[
                    "Ingresa al portal con el mismo correo.",
                    "Revisa el estado y detalle de tu estancia.",
                    "Mantente atento a instrucciones de llegada."
                  ].map((item) => (
                    <div className="rounded-[8px] border border-line bg-ivory p-4" key={item}>
                      <CheckCircle2 aria-hidden className="h-5 w-5 text-green" />
                      <p className="mt-3 text-sm font-semibold leading-6 text-midnight">{item}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <aside className="rounded-[8px] border border-line bg-white p-6 shadow-soft lg:sticky lg:top-6">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-[6px] bg-green/10 text-green">
                  <KeyRound aria-hidden className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-green">Portal huesped</p>
                  <h2 className="text-lg font-semibold text-midnight">Ver mi estancia</h2>
                </div>
              </div>
              <p className="mt-4 text-sm leading-6 text-ink/68">
                Usa el mismo correo de la reserva. En dev el codigo OTP es 000000 hasta conectar
                proveedor real de envio.
              </p>
              <a
                className="focus-ring mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[6px] bg-green px-5 text-sm font-semibold text-white transition hover:bg-[#0f5c50]"
                href="/stay"
              >
                Entrar al portal
                <ArrowRight aria-hidden className="h-4 w-4" />
              </a>
              <div className="mt-6 flex gap-3 border-t border-line pt-5 text-xs leading-5 text-ink/58">
                <ShieldCheck aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-green" />
                <span>El portal solo muestra reservas vinculadas al perfil autenticado.</span>
              </div>
            </aside>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

function SummaryItem({
  detail,
  icon: Icon,
  label,
  value
}: {
  detail?: string;
  icon: typeof CalendarCheck2;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[8px] border border-line bg-ivory p-4">
      <div className="flex items-start gap-3">
        <Icon aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-green" />
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase text-ink/48">{label}</p>
          <p className="mt-1 break-words text-base font-semibold leading-6 text-midnight">{value}</p>
          {detail ? <p className="mt-1 text-sm leading-5 text-ink/62">{detail}</p> : null}
        </div>
      </div>
    </div>
  );
}

function readParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

function formatDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year ?? 0, (month ?? 1) - 1, day ?? 1));

  return new Intl.DateTimeFormat("es-GT", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
    year: "numeric"
  }).format(date);
}

function formatCurrency(amount: string, currency: string) {
  const parsed = Number(amount);

  if (!Number.isFinite(parsed)) {
    return `${currency} ${amount}`;
  }

  return new Intl.NumberFormat("es-GT", {
    currency,
    style: "currency"
  }).format(parsed);
}