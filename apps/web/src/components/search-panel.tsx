"use client";

import { publicCoverageDestinations, publicGuestOptions } from "@kuquba/config";
import {
  ArrowRight,
  CalendarDays,
  Check,
  ChevronDown,
  LockKeyhole,
  MapPin,
  Search,
  UsersRound,
  type LucideIcon
} from "lucide-react";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";

export type SearchPanelDefaults = {
  arrival?: string;
  departure?: string;
  destination?: string;
  guests?: string;
};

type ChoiceOption = {
  label: string;
  value: string;
};

const destinationOptions: ChoiceOption[] = publicCoverageDestinations.map((destination) => ({
  label: destination,
  value: destination
}));

const guestOptions: ChoiceOption[] = publicGuestOptions.map((guests) => ({
  label: `${guests} ${guests === 1 ? "huésped" : "huéspedes"}`,
  value: String(guests)
}));

const guestValues = publicGuestOptions.map(String);

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
  const dateInputClass = isLight
    ? "w-full max-w-full min-w-0 appearance-none bg-transparent text-sm leading-5 outline-none [color-scheme:light] [min-inline-size:0]"
    : "w-full max-w-full min-w-0 appearance-none bg-transparent text-sm leading-5 outline-none [color-scheme:dark] [min-inline-size:0]";
  const choiceMenuPlacement = "bottom" as const;
  const [destination, setDestination] = useState(() =>
    getInitialDestination(defaults?.destination)
  );
  const [destinationError, setDestinationError] = useState<string | null>(null);
  const [guests, setGuests] = useState(() => getInitialGuests(defaults?.guests));
  const [openChoice, setOpenChoice] = useState<"destination" | "guests" | null>(null);
  const choiceMenuOffsetClass =
    openChoice === "guests"
      ? "mt-4 lg:mt-72"
      : openChoice === "destination"
        ? "mt-4 lg:mt-48"
        : "mt-4";

  useEffect(() => {
    setDestination(getInitialDestination(defaults?.destination));
  }, [defaults?.destination]);

  useEffect(() => {
    setGuests(getInitialGuests(defaults?.guests));
  }, [defaults?.guests]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (!destination) {
      event.preventDefault();
      setDestinationError("Selecciona una zona con cobertura KUQUBA.");
    }
  }

  return (
    <form
      action="/stay/search"
      className={
        isLight
          ? "relative z-10 w-full min-w-0 overflow-visible rounded-[8px] border border-line bg-white p-4 shadow-panel md:p-5"
          : "relative z-10 w-full min-w-0 overflow-visible rounded-[8px] border border-white/18 bg-midnight/78 p-4 shadow-panel backdrop-blur-md md:p-5"
      }
      method="get"
      onSubmit={handleSubmit}
    >
      <div className="grid min-w-0 gap-3 lg:grid-cols-[1.15fr_1.2fr_1fr_auto] lg:items-end">
        <label className="block min-w-0">
          <span className={`mb-2 block text-xs font-semibold uppercase ${labelClass}`}>
            Destino
          </span>
          <ChoiceField
            error={destinationError}
            fieldClass={fieldClass}
            icon={MapPin}
            iconClass={iconClass}
            isLight={isLight}
            isOpen={openChoice === "destination"}
            menuPlacement={choiceMenuPlacement}
            name="destination"
            onOpenChange={(isOpen) => setOpenChoice(isOpen ? "destination" : null)}
            onChange={(value) => {
              setDestination(value);
              setDestinationError(null);
            }}
            options={destinationOptions}
            placeholder="Elige destino"
            value={destination}
          />
        </label>

        <label className="block min-w-0">
          <span className={`mb-2 block text-xs font-semibold uppercase ${labelClass}`}>Fechas</span>
          <span
            className={`grid min-h-[52px] min-w-0 gap-2 rounded-[6px] border py-3 ${fieldClass} md:grid-cols-[auto_minmax(0,1fr)_auto_minmax(0,1fr)] md:items-center md:gap-3`}
          >
            <span className="flex min-w-0 items-center gap-3 md:contents">
              <CalendarDays aria-hidden className={`h-5 w-5 shrink-0 ${iconClass}`} />
              <input
                aria-label="Llegada"
                className={dateInputClass}
                defaultValue={defaults?.arrival}
                name="arrival"
                type="date"
              />
            </span>
            <span
              aria-hidden
              className={
                isLight ? "hidden text-ink/34 md:inline" : "hidden text-white/52 md:inline"
              }
            >
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
          <span className={`mb-2 block text-xs font-semibold uppercase ${labelClass}`}>
            Huéspedes
          </span>
          <ChoiceField
            fieldClass={fieldClass}
            icon={UsersRound}
            iconClass={iconClass}
            isLight={isLight}
            isOpen={openChoice === "guests"}
            menuPlacement={choiceMenuPlacement}
            name="guests"
            onOpenChange={(isOpen) => setOpenChoice(isOpen ? "guests" : null)}
            onChange={setGuests}
            options={guestOptions}
            placeholder="Huéspedes"
            value={guests}
          />
        </label>

        <button
          className="focus-ring flex min-h-[52px] w-full min-w-0 items-center justify-center gap-3 rounded-[6px] bg-green px-4 text-sm font-semibold text-white transition hover:bg-[#0f5c50] lg:w-auto lg:px-7"
          type="submit"
        >
          <Search aria-hidden className="h-5 w-5" />
          Buscar estancia
          <ArrowRight aria-hidden className="h-4 w-4" />
        </button>
      </div>

      <div
        className={`${choiceMenuOffsetClass} flex flex-wrap items-center justify-center gap-2 text-center text-sm transition-[margin] duration-200 ${
          isLight ? "text-ink/64" : "text-white/78"
        }`}
      >
        <LockKeyhole aria-hidden className={`h-4 w-4 ${iconClass}`} />
        <span>Reserva segura. Atención personalizada. Sin sorpresas.</span>
      </div>
    </form>
  );
}

function ChoiceField({
  error,
  fieldClass,
  icon: Icon,
  iconClass,
  isLight,
  isOpen,
  menuPlacement,
  name,
  onChange,
  onOpenChange,
  options,
  placeholder,
  value
}: {
  error?: string | null;
  fieldClass: string;
  icon: LucideIcon;
  iconClass: string;
  isLight: boolean;
  isOpen: boolean;
  menuPlacement: "bottom" | "top";
  name: string;
  onChange: (value: string) => void;
  onOpenChange: (isOpen: boolean) => void;
  options: readonly ChoiceOption[];
  placeholder: string;
  value: string;
}) {
  const listboxId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedOption = options.find((option) => option.value === value);
  const placeholderClass = isLight ? "text-ink/45" : "text-white/64";
  const menuPlacementClass =
    menuPlacement === "top" ? "lg:bottom-full lg:mb-3" : "lg:top-full lg:mt-3";

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function closeOnOutsidePointer(event: PointerEvent) {
      const target = event.target;

      if (target instanceof Node && !containerRef.current?.contains(target)) {
        onOpenChange(false);
      }
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onOpenChange(false);
      }
    }

    document.addEventListener("pointerdown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen, onOpenChange]);

  return (
    <div className={`relative ${isOpen ? "z-50" : "z-30"}`} ref={containerRef}>
      <input name={name} type="hidden" value={value} />
      <button
        aria-controls={listboxId}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-invalid={Boolean(error)}
        className={`focus-ring flex min-h-[52px] w-full min-w-0 items-center gap-3 rounded-[6px] border text-left transition ${fieldClass} ${
          isOpen ? (isLight ? "ring-2 ring-green/14" : "ring-2 ring-beige/24") : ""
        } ${error ? "ring-1 ring-terracotta" : ""}`}
        onClick={() => onOpenChange(!isOpen)}
        type="button"
      >
        <Icon aria-hidden className={`h-5 w-5 shrink-0 ${iconClass}`} />
        <span
          className={`min-w-0 flex-1 truncate text-sm ${selectedOption ? "" : placeholderClass}`}
        >
          {selectedOption?.label ?? placeholder}
        </span>
        <ChevronDown
          aria-hidden
          className={`h-4 w-4 shrink-0 transition duration-200 ${iconClass} ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {error ? <p className="mt-2 text-xs font-medium text-terracotta">{error}</p> : null}

      {isOpen ? (
        <div
          className={`relative z-50 mt-3 overflow-hidden rounded-[8px] border bg-white p-2 text-ink shadow-[0_22px_70px_rgba(6,22,34,0.32)] lg:absolute lg:left-0 lg:right-0 lg:mt-0 ${menuPlacementClass} ${
            isLight ? "border-line" : "border-white/18"
          }`}
        >
          <ul
            aria-label={placeholder}
            className="max-h-64 overflow-auto pr-1"
            id={listboxId}
            role="listbox"
          >
            {options.map((option) => {
              const isSelected = option.value === value;

              return (
                <li key={option.value} role="presentation">
                  <button
                    aria-selected={isSelected}
                    className={`group flex min-h-12 w-full items-center justify-between gap-3 rounded-[6px] border px-3 py-3 text-left text-sm transition ${
                      isSelected
                        ? "border-green/20 bg-green/10 text-green"
                        : "border-transparent text-midnight hover:border-line hover:bg-ivory"
                    }`}
                    onClick={() => {
                      onChange(option.value);
                      onOpenChange(false);
                    }}
                    role="option"
                    type="button"
                  >
                    <span className="min-w-0 truncate">{option.label}</span>
                    {isSelected ? (
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green text-white">
                        <Check aria-hidden className="h-3.5 w-3.5" />
                      </span>
                    ) : (
                      <span aria-hidden className="h-6 w-6 shrink-0" />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function getInitialDestination(value: string | undefined) {
  const normalizedValue = normalizeText(value ?? "");

  return (
    publicCoverageDestinations.find(
      (destination) => normalizeText(destination) === normalizedValue
    ) ?? ""
  );
}

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function getInitialGuests(value: string | undefined) {
  return guestValues.find((guestValue) => guestValue === value) ?? "2";
}
