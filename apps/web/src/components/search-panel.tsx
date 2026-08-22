import { ArrowRight, CalendarDays, LockKeyhole, MapPin, Search, UsersRound } from "lucide-react";

export function SearchPanel() {
  return (
    <form className="w-full rounded-[8px] border border-white/18 bg-midnight/78 p-4 shadow-panel backdrop-blur-md md:p-6">
      <div className="grid gap-4 lg:grid-cols-[1.15fr_1.2fr_1fr_auto] lg:items-end">
        <label className="block">
          <span className="mb-2 block text-xs font-semibold uppercase text-white/72">Destino</span>
          <span className="flex min-h-14 items-center gap-3 rounded-[6px] border border-white/28 bg-white/5 px-4 text-white">
            <MapPin aria-hidden className="h-5 w-5 shrink-0 text-beige" />
            <input
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-white/68"
              name="destination"
              placeholder="Antigua Guatemala"
              type="text"
            />
          </span>
        </label>

        <label className="block">
          <span className="mb-2 block text-xs font-semibold uppercase text-white/72">Fechas</span>
          <span className="flex min-h-14 items-center gap-3 rounded-[6px] border border-white/28 bg-white/5 px-4 text-white">
            <CalendarDays aria-hidden className="h-5 w-5 shrink-0 text-beige" />
            <input
              aria-label="Llegada"
              className="min-w-0 flex-1 bg-transparent text-sm outline-none [color-scheme:dark]"
              name="arrival"
              type="date"
            />
            <span aria-hidden className="text-white/52">
              /
            </span>
            <input
              aria-label="Salida"
              className="min-w-0 flex-1 bg-transparent text-sm outline-none [color-scheme:dark]"
              name="departure"
              type="date"
            />
          </span>
        </label>

        <label className="block">
          <span className="mb-2 block text-xs font-semibold uppercase text-white/72">Huespedes</span>
          <span className="flex min-h-14 items-center gap-3 rounded-[6px] border border-white/28 bg-white/5 px-4 text-white">
            <UsersRound aria-hidden className="h-5 w-5 shrink-0 text-beige" />
            <select
              className="min-w-0 flex-1 appearance-none bg-transparent text-sm outline-none"
              defaultValue="2"
              name="guests"
            >
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
          className="focus-ring flex min-h-14 items-center justify-center gap-3 rounded-[6px] bg-green px-7 text-sm font-semibold text-white transition hover:bg-[#0f5c50]"
          type="submit"
        >
          <Search aria-hidden className="h-5 w-5" />
          Buscar estancia
          <ArrowRight aria-hidden className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-5 flex items-center justify-center gap-2 text-sm text-white/78">
        <LockKeyhole aria-hidden className="h-4 w-4 text-beige" />
        <span>Reserva segura. Atencion personalizada. Sin sorpresas.</span>
      </div>
    </form>
  );
}
