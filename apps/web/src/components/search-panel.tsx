import { ArrowRight, CalendarDays, LockKeyhole, MapPin, Search, UsersRound } from "lucide-react";

export type SearchPanelDefaults = {
  arrival?: string;
  departure?: string;
  destination?: string;
  guests?: string;
};

export function SearchPanel({
  defaults,
  tone = "dark"
}: {
  defaults?: SearchPanelDefaults;
  tone?: "dark" | "light";
}) {
  const isLight = tone === "light";
  const labelClass = isLight ? "text-midnight/66" : "text-white/72";
  const fieldClass = isLight
    ? "border-line bg-white px-4 text-ink shadow-sm"
    : "border-white/28 bg-white/5 px-4 text-white";
  const iconClass = isLight ? "text-green" : "text-beige";
  const inputClass = isLight
    ? "w-full min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-ink/45"
    : "w-full min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-white/68";
  const dateInputClass = isLight
    ? "w-full max-w-full min-w-0 appearance-none bg-transparent text-sm leading-5 outline-none [color-scheme:light] [min-inline-size:0]"
    : "w-full max-w-full min-w-0 appearance-none bg-transparent text-sm leading-5 outline-none [color-scheme:dark] [min-inline-size:0]";
  const selectClass = isLight
    ? "w-full min-w-0 flex-1 appearance-none bg-transparent text-sm outline-none text-ink"
    : "w-full min-w-0 flex-1 appearance-none bg-transparent text-sm outline-none text-white";

  return (
    <form
      action="/stay/search"
      className={
        isLight
          ? "w-full min-w-0 overflow-hidden rounded-[8px] border border-line bg-white p-4 shadow-panel md:p-6"
          : "w-full min-w-0 overflow-hidden rounded-[8px] border border-white/18 bg-midnight/78 p-4 shadow-panel backdrop-blur-md md:p-6"
      }
      method="get"
    >
      <div className="grid min-w-0 gap-4 lg:grid-cols-[1.15fr_1.2fr_1fr_auto] lg:items-end">
        <label className="block min-w-0">
          <span className={`mb-2 block text-xs font-semibold uppercase ${labelClass}`}>Destino</span>
          <span className={`flex min-h-14 min-w-0 items-center gap-3 rounded-[6px] border ${fieldClass}`}>
            <MapPin aria-hidden className={`h-5 w-5 shrink-0 ${iconClass}`} />
            <input
              className={inputClass}
              defaultValue={defaults?.destination}
              name="destination"
              placeholder="Antigua Guatemala"
              type="text"
            />
          </span>
        </label>

        <label className="block min-w-0">
          <span className={`mb-2 block text-xs font-semibold uppercase ${labelClass}`}>Fechas</span>
          <span
            className={`grid min-h-14 min-w-0 gap-2 rounded-[6px] border py-3 ${fieldClass} sm:grid-cols-[auto_minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-center sm:gap-3`}
          >
            <span className="flex min-w-0 items-center gap-3 sm:contents">
              <CalendarDays aria-hidden className={`h-5 w-5 shrink-0 ${iconClass}`} />
              <input
                aria-label="Llegada"
                className={dateInputClass}
                defaultValue={defaults?.arrival}
                name="arrival"
                type="date"
              />
            </span>
            <span aria-hidden className={isLight ? "hidden text-ink/34 sm:inline" : "hidden text-white/52 sm:inline"}>
              /
            </span>
            <input
              aria-label="Salida"
              className={dateInputClass}
              defaultValue={defaults?.departure}
              name="departure"
              type="date"
            />
          </span>
        </label>

        <label className="block min-w-0">
          <span className={`mb-2 block text-xs font-semibold uppercase ${labelClass}`}>Huespedes</span>
          <span className={`flex min-h-14 min-w-0 items-center gap-3 rounded-[6px] border ${fieldClass}`}>
            <UsersRound aria-hidden className={`h-5 w-5 shrink-0 ${iconClass}`} />
            <select className={selectClass} defaultValue={defaults?.guests ?? "2"} name="guests">
              <option className="text-ink" value="1">
                1 huesped
              </option>
              <option className="text-ink" value="2">
                2 huespedes
              </option>
              <option className="text-ink" value="4">
                4 huespedes
              </option>
              <option className="text-ink" value="6">
                6 huespedes
              </option>
            </select>
          </span>
        </label>

        <button
          className="focus-ring flex min-h-14 w-full min-w-0 items-center justify-center gap-3 rounded-[6px] bg-green px-4 text-sm font-semibold text-white transition hover:bg-[#0f5c50] lg:w-auto lg:px-7"
          type="submit"
        >
          <Search aria-hidden className="h-5 w-5" />
          Buscar estancia
          <ArrowRight aria-hidden className="h-4 w-4" />
        </button>
      </div>

      <div
        className={`mt-5 flex flex-wrap items-center justify-center gap-2 text-center text-sm ${
          isLight ? "text-ink/64" : "text-white/78"
        }`}
      >
        <LockKeyhole aria-hidden className={`h-4 w-4 ${iconClass}`} />
        <span>Reserva segura. Atencion personalizada. Sin sorpresas.</span>
      </div>
    </form>
  );
}
