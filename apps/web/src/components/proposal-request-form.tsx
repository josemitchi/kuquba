"use client";

import { ArrowRight, CheckCircle2, Send } from "lucide-react";
import { FormEvent, useState } from "react";

type SubmitState = "idle" | "submitting" | "success" | "error";

type ProposalRequestResponse = {
  proposalRequest: {
    id: string;
    status: string;
  };
};

export function ProposalRequestForm({
  defaultGuests,
  maxGuests,
  destination,
  stayId,
  stayName
}: {
  defaultGuests: number;
  maxGuests: number;
  destination: string;
  stayId: string;
  stayName: string;
}) {
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [requestId, setRequestId] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setSubmitState("submitting");
    setRequestId(null);

    const formData = new FormData(form);
    const payload = {
      arrivalDate: getFormValue(formData, "arrivalDate") || undefined,
      departureDate: getFormValue(formData, "departureDate") || undefined,
      destination,
      email: getFormValue(formData, "email"),
      guestName: getFormValue(formData, "guestName"),
      guests: Number(getFormValue(formData, "guests") || defaultGuests),
      message: getFormValue(formData, "message") || undefined,
      phone: getFormValue(formData, "phone") || undefined,
      stayId,
      stayName
    };

    try {
      const response = await postJson<ProposalRequestResponse>(
        "/api/public/stay-proposal-requests",
        payload
      );
      setRequestId(response.proposalRequest.id);
      setSubmitState("success");
      form.reset();
    } catch {
      setSubmitState("error");
    }
  }

  return (
    <form
      className="rounded-[8px] border border-line bg-white p-6 shadow-panel"
      id="solicitud"
      onSubmit={handleSubmit}
    >
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-[6px] bg-green/10 text-green">
          <Send aria-hidden className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase text-green">Solicitud de propuesta</p>
          <h2 className="text-lg font-semibold text-midnight">{stayName}</h2>
        </div>
      </div>

      <div className="mt-6 grid gap-4">
        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-midnight">Nombre</span>
          <input
            className="focus-ring min-h-12 w-full rounded-[6px] border border-line px-4 text-sm outline-none transition focus:border-green"
            name="guestName"
            required
            type="text"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-midnight">Correo</span>
          <input
            className="focus-ring min-h-12 w-full rounded-[6px] border border-line px-4 text-sm outline-none transition focus:border-green"
            name="email"
            required
            type="email"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-midnight">Telefono</span>
          <input
            className="focus-ring min-h-12 w-full rounded-[6px] border border-line px-4 text-sm outline-none transition focus:border-green"
            name="phone"
            type="tel"
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-midnight">Llegada</span>
            <input
              className="focus-ring min-h-12 w-full rounded-[6px] border border-line px-4 text-sm outline-none transition focus:border-green"
              name="arrivalDate"
              type="date"
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-midnight">Salida</span>
            <input
              className="focus-ring min-h-12 w-full rounded-[6px] border border-line px-4 text-sm outline-none transition focus:border-green"
              name="departureDate"
              type="date"
            />
          </label>
        </div>

        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-midnight">Huespedes</span>
          <select
            className="focus-ring min-h-12 w-full rounded-[6px] border border-line px-4 text-sm outline-none transition focus:border-green"
            defaultValue={String(defaultGuests)}
            name="guests"
          >
            {Array.from({ length: maxGuests }, (_, index) => index + 1).map((count) => (
              <option key={count} value={count}>
                {count} {count === 1 ? "huesped" : "huespedes"}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-midnight">Interes del viaje</span>
          <textarea
            className="focus-ring min-h-28 w-full resize-none rounded-[6px] border border-line px-4 py-3 text-sm outline-none transition focus:border-green"
            maxLength={1000}
            name="message"
          />
        </label>
      </div>

      {submitState === "success" ? (
        <div className="mt-5 rounded-[6px] border border-green/24 bg-green/10 p-4 text-sm leading-6 text-midnight">
          <div className="flex gap-3">
            <CheckCircle2 aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-green" />
            <p>
              Solicitud recibida para revision. Referencia {requestId?.slice(0, 8)}. KUQUBA debe
              confirmar disponibilidad, tarifa y condiciones antes de cualquier reserva.
            </p>
          </div>
        </div>
      ) : null}

      {submitState === "error" ? (
        <div className="mt-5 rounded-[6px] border border-terracotta/30 bg-terracotta/10 p-4 text-sm text-midnight">
          No se pudo enviar la solicitud. Revisa los datos o intenta de nuevo.
        </div>
      ) : null}

      <button
        className="focus-ring mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[6px] bg-green px-5 text-sm font-semibold text-white transition hover:bg-[#0f5c50] disabled:cursor-not-allowed disabled:opacity-65"
        disabled={submitState === "submitting"}
        type="submit"
      >
        {submitState === "submitting" ? "Enviando solicitud" : "Enviar solicitud"}
        <ArrowRight aria-hidden className="h-4 w-4" />
      </button>

      <p className="mt-4 text-xs leading-5 text-ink/58">
        Esta solicitud no bloquea fechas, no crea una reserva y no confirma precio.
      </p>
    </form>
  );
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";
  const response = await fetch(`${apiBase}${path}`, {
    body: JSON.stringify(body),
    headers: {
      "content-type": "application/json"
    },
    method: "POST"
  });

  const payload = (await response.json().catch(() => ({}))) as { error?: string };

  if (!response.ok) {
    throw new Error(payload.error ?? "request_failed");
  }

  return payload as T;
}

function getFormValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}
