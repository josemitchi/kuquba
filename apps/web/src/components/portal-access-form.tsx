"use client";

import type { PortalAudience } from "@kuquba/config";
import { ArrowRight, KeyRound, LockKeyhole } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

type Phase = "destination" | "code";

type StartResponse = {
  challengeId: string;
  delivery: {
    channel: "email" | "phone";
    destinationMasked: string;
  };
  expiresAt: string;
};

type VerifyResponse = {
  session: unknown;
  redirectTo: string;
};

export function PortalAccessForm({
  audience,
  accessMethod,
  primaryFieldLabel,
  primaryFieldPlaceholder,
  action
}: {
  audience: PortalAudience;
  accessMethod: string;
  primaryFieldLabel: string;
  primaryFieldPlaceholder: string;
  action: string;
}) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("destination");
  const [destination, setDestination] = useState("");
  const [code, setCode] = useState("");
  const [challenge, setChallenge] = useState<StartResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      if (phase === "destination") {
        const response = await postJson<StartResponse>("/api/identity/passwordless/start", {
          audience,
          ...(destination.includes("@") ? { email: destination } : { phone: destination })
        });

        setChallenge(response);
        setPhase("code");
        return;
      }

      if (!challenge) {
        setError("La verificacion expiro. Solicita un nuevo codigo.");
        setPhase("destination");
        return;
      }

      const response = await postJson<VerifyResponse>("/api/identity/passwordless/verify", {
        audience,
        challengeId: challenge.challengeId,
        code
      });

      window.localStorage.setItem("kuquba.devSession", JSON.stringify(response.session));
      router.push(response.redirectTo);
    } catch (submitError) {
      setError(getErrorMessage(submitError));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      className="rounded-[8px] border border-white/16 bg-white p-6 text-ink shadow-panel"
      onSubmit={handleSubmit}
    >
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green/10 text-green">
          <KeyRound aria-hidden className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-midnight">Acceso seguro</h2>
          <p className="text-sm text-ink/62">{accessMethod}</p>
        </div>
      </div>

      {phase === "destination" ? (
        <label className="mt-7 block">
          <span className="mb-2 block text-sm font-semibold text-midnight">
            {primaryFieldLabel}
          </span>
          <input
            className="focus-ring min-h-12 w-full rounded-[6px] border border-line px-4 text-sm text-ink outline-none transition focus:border-green"
            name="destination"
            onChange={(event) => setDestination(event.target.value)}
            placeholder={primaryFieldPlaceholder}
            required
            type="text"
            value={destination}
          />
        </label>
      ) : (
        <label className="mt-7 block">
          <span className="mb-2 block text-sm font-semibold text-midnight">
            Codigo de verificacion
          </span>
          <input
            className="focus-ring min-h-12 w-full rounded-[6px] border border-line px-4 text-sm text-ink outline-none transition focus:border-green"
            inputMode="numeric"
            name="code"
            onChange={(event) => setCode(event.target.value)}
            placeholder="000000"
            required
            type="text"
            value={code}
          />
          {challenge ? (
            <span className="mt-2 block text-xs text-ink/58">
              Enviado a {challenge.delivery.destinationMasked}
            </span>
          ) : null}
        </label>
      )}

      {error ? (
        <div className="mt-4 rounded-[6px] border border-terracotta/30 bg-terracotta/10 px-4 py-3 text-sm text-midnight">
          {error}
        </div>
      ) : null}

      <button
        className="focus-ring mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[6px] bg-green px-5 text-sm font-semibold text-white transition hover:bg-[#0f5c50] disabled:cursor-not-allowed disabled:opacity-65"
        disabled={isSubmitting}
        type="submit"
      >
        {phase === "destination" ? action : "Verificar y entrar"}
        <ArrowRight aria-hidden className="h-4 w-4" />
      </button>

      {phase === "code" ? (
        <button
          className="focus-ring mt-3 w-full rounded-[6px] px-4 py-2 text-sm font-semibold text-green transition hover:bg-green/8"
          onClick={() => {
            setPhase("destination");
            setChallenge(null);
            setCode("");
            setError(null);
          }}
          type="button"
        >
          Cambiar correo o telefono
        </button>
      ) : null}

      <div className="mt-5 flex gap-3 rounded-[6px] bg-ivory p-4 text-sm leading-6 text-ink/72">
        <LockKeyhole aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-green" />
        <p>
          Este acceso usa verificacion por desafio. KUQUBA no solicita contrasenas tradicionales
          en esta etapa.
        </p>
      </div>
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

function getErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "request_failed";
  const fallback = "No se pudo completar la solicitud.";

  const messages: Record<string, string> = {
    challenge_expired: "El codigo expiro. Solicita uno nuevo.",
    challenge_not_found: "No encontramos esa verificacion. Solicita un nuevo codigo.",
    identity_not_allowed_for_audience: "Ese usuario no tiene acceso a este portal.",
    invalid_code: "El codigo no es valido.",
    otp_delivery_failed: "No se pudo enviar el codigo. Intenta de nuevo.",
    phone_otp_not_configured: "Por ahora el codigo solo se envia por correo.",
    provider_adapter_required: "El proveedor OTP productivo aun no esta configurado.",
    request_failed: fallback,
    too_many_attempts: "Demasiados intentos. Solicita un nuevo codigo."
  };

  return messages[message] ?? fallback;
}
