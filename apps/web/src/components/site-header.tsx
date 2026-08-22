import { accessOptions, publicNavigation } from "@kuquba/config";
import { ChevronDown, Menu, UserRound } from "lucide-react";
import Image from "next/image";

export function SiteHeader() {
  return (
    <header className="container-shell relative z-20 flex items-center justify-between py-5 text-white">
      <a className="focus-ring flex min-w-0 items-center gap-3 rounded-md" href="#" aria-label="KUQUBA">
        <Image
          src="/brand/kuquba-isotipo.svg"
          alt=""
          width={52}
          height={52}
          className="h-12 w-12 rounded-md object-contain"
          priority
        />
        <span className="hidden min-w-0 sm:block">
          <span className="block text-[1.6rem] font-semibold leading-none">KUQUBA</span>
          <span className="mt-1 block text-[0.62rem] uppercase text-[#1fb7a2]">
            Conexiones que generan confianza
          </span>
        </span>
      </a>

      <nav className="hidden items-center gap-9 text-sm font-medium lg:flex" aria-label="Principal">
        {publicNavigation.map((item, index) => (
          <a
            className={`focus-ring rounded-sm pb-2 ${
              index === 0 ? "border-b-2 border-terracotta text-white" : "text-white/88"
            }`}
            href={item.href}
            key={item.href}
          >
            {item.label}
          </a>
        ))}
      </nav>

      <div className="flex items-center gap-3">
        <details className="group relative">
          <summary className="focus-ring flex cursor-pointer items-center gap-2 rounded-[8px] border border-white/45 px-4 py-3 text-sm font-semibold text-white transition hover:border-white">
            <UserRound aria-hidden className="h-5 w-5" />
            <span className="hidden sm:inline">Acceder</span>
            <ChevronDown
              aria-hidden
              className="h-4 w-4 transition duration-200 group-open:rotate-180"
            />
          </summary>
          <div className="absolute right-0 mt-3 w-64 overflow-hidden rounded-[8px] border border-white/15 bg-midnight/95 p-2 shadow-panel backdrop-blur">
            {accessOptions.map((option) => (
              <a
                className="focus-ring block rounded-[6px] px-3 py-3 text-sm text-white/90 transition hover:bg-white/10 hover:text-white"
                href={option.href}
                key={option.href}
              >
                {option.label}
              </a>
            ))}
          </div>
        </details>
        <button
          className="focus-ring rounded-[8px] border border-white/45 p-3 lg:hidden"
          type="button"
          aria-label="Abrir menu"
        >
          <Menu aria-hidden className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
}
