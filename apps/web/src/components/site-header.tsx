"use client";

import { accessOptions, publicNavigation } from "@kuquba/config";
import {
  ArrowRight,
  Building2,
  CalendarCheck2,
  ChevronDown,
  Menu,
  ShieldCheck,
  UserRound
} from "lucide-react";
import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";

const accessOptionIcons = [CalendarCheck2, Building2, ShieldCheck] as const;

export function SiteHeader({
  homeHref = "#",
  navigationBaseHref = ""
}: {
  homeHref?: string;
  navigationBaseHref?: string;
} = {}) {
  const [isAccessMenuOpen, setIsAccessMenuOpen] = useState(false);
  const accessMenuId = useId();
  const accessMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isAccessMenuOpen) {
      return;
    }

    function closeOnOutsidePointer(event: PointerEvent) {
      const target = event.target;

      if (target instanceof Node && !accessMenuRef.current?.contains(target)) {
        setIsAccessMenuOpen(false);
      }
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsAccessMenuOpen(false);
      }
    }

    document.addEventListener("pointerdown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isAccessMenuOpen]);
  const resolveNavigationHref = (href: string) =>
    href.startsWith("#") ? `${navigationBaseHref}${href}` : href;

  return (
    <header className="container-shell relative z-20 py-4 text-white">
      <div className="flex items-center justify-between gap-4 rounded-[10px] border border-white/24 bg-midnight/84 px-3 py-3 shadow-[0_20px_64px_rgba(6,22,34,0.42)] backdrop-blur-xl sm:px-4">
        <a
          className="focus-ring flex min-w-0 items-center gap-3 rounded-md"
          href={homeHref}
          aria-label="KUQUBA"
        >
          <Image
            src="/brand/kuquba-isotipo.svg"
            alt=""
            width={52}
            height={52}
            className="h-12 w-12 rounded-md object-contain"
            priority
          />
          <span className="hidden min-w-0 sm:block">
            <span className="block text-[1.6rem] font-semibold leading-none text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.38)]">
              KUQUBA
            </span>
            <span className="mt-1 block text-[0.62rem] uppercase text-[#45d1bf] drop-shadow-[0_1px_6px_rgba(0,0,0,0.45)]">
              Conexiones que generan confianza
            </span>
          </span>
        </a>

        <nav
          className="hidden items-center gap-1 rounded-[8px] border border-white/22 bg-midnight/42 px-2 py-1 text-sm font-semibold shadow-[0_14px_38px_rgba(0,0,0,0.28)] backdrop-blur-xl lg:flex"
          aria-label="Principal"
        >
          {publicNavigation.map((item, index) => (
            <a
              className={`focus-ring rounded-[6px] px-3 py-2 transition ${
                index === 0
                  ? "bg-white/16 text-white shadow-[inset_0_-2px_0_rgba(200,112,75,0.95)]"
                  : "text-white/90 hover:bg-white/12 hover:text-white"
              }`}
              href={resolveNavigationHref(item.href)}
              key={item.href}
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <div className="relative" ref={accessMenuRef}>
            <button
              aria-controls={accessMenuId}
              aria-expanded={isAccessMenuOpen}
              aria-haspopup="menu"
              className="focus-ring flex cursor-pointer items-center gap-2 rounded-[8px] border border-white/35 bg-midnight/42 px-4 py-3 text-sm font-semibold text-white shadow-[0_14px_38px_rgba(0,0,0,0.3)] backdrop-blur-xl transition hover:border-white/70 hover:bg-midnight/52"
              onClick={() => setIsAccessMenuOpen((current) => !current)}
              type="button"
            >
              <UserRound aria-hidden className="h-5 w-5" />
              <span className="hidden sm:inline">Portales</span>
              <ChevronDown
                aria-hidden
                className={`h-4 w-4 transition duration-200 ${isAccessMenuOpen ? "rotate-180" : ""}`}
              />
            </button>
            {isAccessMenuOpen ? (
              <div
                className="absolute right-0 z-50 mt-3 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-[8px] border border-white/22 bg-white p-2 text-ink shadow-[0_24px_70px_rgba(6,22,34,0.34)]"
                id={accessMenuId}
                role="menu"
              >
                {accessOptions.map((option, index) => {
                  const Icon = accessOptionIcons[index] ?? UserRound;

                  return (
                    <a
                      className="focus-ring group flex items-center gap-3 rounded-[6px] px-3 py-3 text-sm text-midnight transition hover:bg-ivory"
                      href={option.href}
                      key={option.href}
                      onClick={() => setIsAccessMenuOpen(false)}
                      role="menuitem"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[6px] bg-green/10 text-green">
                        <Icon aria-hidden className="h-4 w-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="block font-semibold leading-5">{option.label}</span>
                        <span className="mt-0.5 block text-xs leading-4 text-ink/58">
                          {option.description}
                        </span>
                      </span>
                      <ArrowRight
                        aria-hidden
                        className="ml-auto h-4 w-4 shrink-0 text-ink/30 transition group-hover:text-green"
                      />
                    </a>
                  );
                })}
              </div>
            ) : null}
          </div>
          <button
            className="focus-ring rounded-[8px] border border-white/35 bg-midnight/42 p-3 shadow-[0_14px_38px_rgba(0,0,0,0.3)] backdrop-blur-xl transition hover:border-white/70 hover:bg-midnight/52 lg:hidden"
            type="button"
            aria-label="Abrir menu"
          >
            <Menu aria-hidden className="h-5 w-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
