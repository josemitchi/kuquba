"use client";

import type { PortalAudience } from "@kuquba/config";
import { ArrowRight, CheckCircle2, KeyRound, LockKeyhole, MailCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

type Phase = "destination" | "code";

type StartResponse = {
  challengeId: string;
  delivery: {
    channel: "email";
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
  action,
  helperText,
  securityText,
  title
}: {
  audience: PortalAudience;
  accessMethod: string;
  primaryFieldLabel: string;
  primaryFieldPlaceholder: string;
  action: string;
  helperText: string;
  securityText: string;
  title: string;
}) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("destination");
  const [email, setEmail] = useState("");
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
          email: email.trim()
        });

        setChallenge(response);
        setPhase("code");
        return;
      }

      if (!challenge) {
        setError("La verificación expiró. Solicita un nuevo código.");
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
      className="overflow-hidden rounded-[8px] border border-white/16 bg-white text-ink shadow-panel"
      onSubmit={handleSubmit}
    >
      <div className="border-b border-line bg-ivory/72 px-6 py-5 md:px-7">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[8px] bg-green text-white">
            {phase === "destination" ? <KeyRound aria-hidden className="h-6 w-6" /> : <MailCheck aria-hidden className="h-6 w-6" />}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase text-green">Acceso seguro</p>
            <h2 className="mt-1 text-2xl font-semibold leading-7 text-midnight">{title}</h2>
            <p className="mt-2 inline-flex rounded-full border border-line bg-white px-3 py-1 text-xs font-semibold text-ink/64">
              {accessMethod}
            </p>
          </div>
        </div>
      </div>

      <div className="px-6 py-6 md:px-7">
        {phase === "destination" ? (
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-midnight">
              {primaryFieldLabel}
            </span>
            <input
              className="focus-ring min-h-[52px] w-full rounded-[6px] border border-line bg-white px-4 text-base text-ink outline-none transition placeholder:text-ink/36 focus:border-green"
              name="email"
              onChange={(event) => setEmail(event.target.value)}
              placeholder={primaryFieldPlaceholder}
              autoComplete="email"
              inputMode="email"
              required
              type="email"
              value={email}
            />
            <span className="mt-2 block text-xs leading-5 text-ink/58">{helperText}</span>
          </label>
        ) : (
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-midnight">
              Código de verificación
            </span>
            <input
              className="focus-ring min-h-[52px] w-full rounded-[6px] border border-line bg-white px-4 text-base tracking-[0.18em] text-ink outline-none transition placeholder:tracking-normal placeholder:text-ink/36 focus:border-green"
              inputMode="numeric"
              name="code"
              onChange={(event) => setCode(event.target.value)}
              placeholder="000000"
              required
              type="text"
              value={code}
            />
            {challenge ? (
              <span className="mt-2 block text-xs leading-5 text-ink/58">
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
          className="focus-ring mt-5 inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-[6px] bg-green px-5 text-sm font-semibold text-white transition hover:bg-[#0f5c50] disabled:cursor-not-allowed disabled:opacity-65"
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
            Cambiar correo
          </button>
        ) : null}

        <div className="mt-6 grid gap-3 rounded-[8px] border border-line bg-ivory p-4 text-sm leading-6 text-ink/72">
          <div className="flex gap-3">
            <LockKeyhole aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-green" />
            <p>{securityText}</p>
          </div>
          <div className="flex gap-3 border-t border-line pt-3 text-xs leading-5 text-ink/58">
            <CheckCircle2 aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-green" />
            <span>Sin contraseña tradicional y sin acceso público a tus datos.</span>
          </div>
        </div>
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
    challenge_expired: "El código expiró. Solicita uno nuevo.",
    challenge_not_found: "No encontramos esa verificación. Solicita un nuevo código.",
    identity_not_allowed_for_audience: "Ese usuario no tiene acceso a este portal.",
    invalid_code: "El código no es válido.",
    otp_delivery_failed: "No se pudo enviar el código. Intenta de nuevo.",
    provider_adapter_required: "El proveedor OTP productivo aún no está configurado.",
    request_failed: fallback,
    too_many_attempts: "Demasiados intentos. Solicita un nuevo código."
  };

  return messages[message] ?? fallback;
}