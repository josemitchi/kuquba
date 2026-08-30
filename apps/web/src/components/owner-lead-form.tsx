"use client";

import { ArrowRight, CheckCircle2, Send } from "lucide-react";
import { FormEvent, useState } from "react";

type SubmitState = "idle" | "submitting" | "success" | "error";

type OwnerLeadResponse = {
  ownerLead: {
    id: string;
    status: string;
  };
};

const propertyTypes = [
  "Casa completa",
  "Apartamento",
  "Villa",
  "Habitacion o suite",
  "Otro"
] as const;

const operatingStatuses = [
  "Por evaluar",
  "Lista para operar",
  "En remodelacion",
  "Ya publicada en OTAs",
  "Uso familiar actual"
] as const;

export function OwnerLeadForm() {
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [leadId, setLeadId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setSubmitState("submitting");
    setLeadId(null);
    setErrorMessage(null);

    const formData = new FormData(form);
    const payload = {
      email: getFormValue(formData, "email"),
      message: getFormValue(formData, "message") || undefined,
      operatingStatus: getFormValue(formData, "operatingStatus"),
      ownerName: getFormValue(formData, "ownerName"),
      phone: getFormValue(formData, "phone") || undefined,
      propertyLocation: getFormValue(formData, "propertyLocation"),
      propertyName: getFormValue(formData, "propertyName") || undefined,
      propertyType: getFormValue(formData, "propertyType")
    };

    try {
      const response = await postJson<OwnerLeadResponse>("/api/public/owner-leads", payload);
      setLeadId(response.ownerLead.id);
      setSubmitState("success");
      form.reset();
    } catch (error) {
      setErrorMessage(getOwnerLeadErrorMessage(error instanceof Error ? error.message : "request_failed"));
      setSubmitState("error");
    }
  }

  return (
    <form
      className="rounded-[8px] border border-line bg-white p-6 text-ink shadow-panel"
      id="evaluacion"
      onSubmit={handleSubmit}
    >
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-[6px] bg-green/10 text-green">
          <Send aria-hidden className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase text-green">Evaluacion inicial</p>
          <h2 className="text-lg font-semibold text-midnight">Propiedad candidata</h2>
        </div>
      </div>

      <div className="mt-6 grid gap-4">
        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-midnight">Nombre</span>
          <input
            className="focus-ring min-h-12 w-full rounded-[6px] border border-line px-4 text-sm outline-none transition focus:border-green"
            name="ownerName"
            required
            type="text"
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
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
        </div>

        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-midnight">
            Nombre de la propiedad
          </span>
          <input
            className="focus-ring min-h-12 w-full rounded-[6px] border border-line px-4 text-sm outline-none transition focus:border-green"
            name="propertyName"
            type="text"
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-midnight">Tipo</span>
            <select
              className="focus-ring min-h-12 w-full rounded-[6px] border border-line px-4 text-sm outline-none transition focus:border-green"
              defaultValue={propertyTypes[0]}
              name="propertyType"
              required
            >
              {propertyTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-midnight">Estado operativo</span>
            <select
              className="focus-ring min-h-12 w-full rounded-[6px] border border-line px-4 text-sm outline-none transition focus:border-green"
              defaultValue={operatingStatuses[0]}
              name="operatingStatus"
              required
            >
              {operatingStatuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-midnight">Ubicacion</span>
          <input
            className="focus-ring min-h-12 w-full rounded-[6px] border border-line px-4 text-sm outline-none transition focus:border-green"
            name="propertyLocation"
            placeholder="Zona, municipio o destino"
            required
            type="text"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-midnight">Contexto</span>
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
              Solicitud recibida para revision inicial. Referencia {leadId?.slice(0, 8)}. KUQUBA
              validara encaje operativo antes de proponer condiciones.
            </p>
          </div>
        </div>
      ) : null}

      {submitState === "error" ? (
        <div className="mt-5 rounded-[6px] border border-terracotta/30 bg-terracotta/10 p-4 text-sm text-midnight">
          {errorMessage ?? "No se pudo enviar la evaluacion. Revisa los datos o intenta de nuevo."}
        </div>
      ) : null}

      <button
        className="focus-ring mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[6px] bg-green px-5 text-sm font-semibold text-white transition hover:bg-[#0f5c50] disabled:cursor-not-allowed disabled:opacity-65"
        disabled={submitState === "submitting"}
        type="submit"
      >
        {submitState === "submitting" ? "Enviando evaluacion" : "Enviar evaluacion"}
        <ArrowRight aria-hidden className="h-4 w-4" />
      </button>

      <p className="mt-4 text-xs leading-5 text-ink/58">
        Esta solicitud no crea contrato, no confirma rentabilidad y no establece condiciones
        comerciales finales.
      </p>
    </form>
  );
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const apiBase = getPublicApiBaseUrl();
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

function getPublicApiBaseUrl() {
  const configuredApiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:4000";

  if (typeof window !== "undefined" && window.location.hostname === "127.0.0.1") {
    return configuredApiBase.replace("http://localhost:", "http://127.0.0.1:");
  }

  return configuredApiBase;
}

function getOwnerLeadErrorMessage(error: string) {
  const messages: Record<string, string> = {
    "Failed to fetch": "No se pudo conectar con el API local. Verifica que el backend este activo en 127.0.0.1:4000.",
    request_failed: "No se pudo enviar la evaluacion. Revisa los datos o intenta de nuevo."
  };

  return messages[error] ?? error.replaceAll("_", " ");
}