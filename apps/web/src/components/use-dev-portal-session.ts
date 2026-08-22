"use client";

import type { PortalAudience } from "@kuquba/config";
import { useEffect, useState } from "react";

export type DevPortalSession = {
  audience: PortalAudience;
  expiresAt: string;
  sessionId: string;
  sessionToken: string;
  user: {
    displayName: string;
    emailMasked: string;
  };
  role: {
    key: string;
    name: string;
  };
  permissions: string[];
};

const devSessionStorageKey = "kuquba.devSession";

function getApiBaseUrl() {
  return process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";
}

export function useDevPortalSession(audience: PortalAudience) {
  const [session, setSession] = useState<DevPortalSession | null>(null);
  const [isValidating, setIsValidating] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function validateSession() {
      const rawSession = window.localStorage.getItem(devSessionStorageKey);

      if (!rawSession) {
        if (isMounted) {
          setIsValidating(false);
        }
        return;
      }

      try {
        const storedSession = JSON.parse(rawSession) as DevPortalSession;

        if (!storedSession.sessionToken || storedSession.audience !== audience) {
          window.localStorage.removeItem(devSessionStorageKey);
          if (isMounted) {
            setSession(null);
            setIsValidating(false);
          }
          return;
        }

        const response = await fetch(`${getApiBaseUrl()}/api/identity/session?audience=${audience}`, {
          headers: {
            "x-kuquba-dev-session": storedSession.sessionToken
          }
        });

        if (!response.ok) {
          window.localStorage.removeItem(devSessionStorageKey);
          if (isMounted) {
            setSession(null);
            setIsValidating(false);
          }
          return;
        }

        const payload = (await response.json()) as { session: DevPortalSession };

        if (isMounted) {
          window.localStorage.setItem(devSessionStorageKey, JSON.stringify(payload.session));
          setSession(payload.session);
          setIsValidating(false);
        }
      } catch {
        window.localStorage.removeItem(devSessionStorageKey);
        if (isMounted) {
          setSession(null);
          setIsValidating(false);
        }
      }
    }

    void validateSession();

    return () => {
      isMounted = false;
    };
  }, [audience]);

  async function logout() {
    const token = session?.sessionToken;

    if (token) {
      await fetch(`${getApiBaseUrl()}/api/identity/session/logout`, {
        headers: {
          "x-kuquba-dev-session": token
        },
        method: "POST"
      }).catch(() => undefined);
    }

    window.localStorage.removeItem(devSessionStorageKey);
    setSession(null);
  }

  return { isValidating, logout, session };
}
