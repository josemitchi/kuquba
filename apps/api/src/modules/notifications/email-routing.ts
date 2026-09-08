import { env } from "../../config/env";

const aliasSeparators = ["->", "="] as const;

export function getPublicReplyToEmail() {
  return env.KUQUBA_PUBLIC_CONTACT_EMAIL;
}

export function resolveResendRecipients(recipients: string | readonly string[]) {
  const aliases = parseRecipientAliases(env.RESEND_RECIPIENT_ALIAS_MAP);
  const recipientList = Array.isArray(recipients) ? recipients : [recipients];
  const resolved = recipientList.flatMap((recipient) => {
    const normalized = normalizeEmail(recipient);
    const aliasTargets = aliases.get(normalized);

    return aliasTargets ?? [recipient.trim()];
  });

  return Array.from(new Set(resolved.filter(Boolean)));
}

function parseRecipientAliases(rawAliases: string | undefined) {
  const aliases = new Map<string, string[]>();

  if (!rawAliases) {
    return aliases;
  }

  for (const entry of rawAliases.split(/[\n;]/)) {
    const trimmedEntry = entry.trim();

    if (!trimmedEntry) {
      continue;
    }

    const separator = aliasSeparators.find((candidate) => trimmedEntry.includes(candidate));

    if (!separator) {
      continue;
    }

    const separatorIndex = trimmedEntry.indexOf(separator);
    const alias = normalizeEmail(trimmedEntry.slice(0, separatorIndex));
    const targets = trimmedEntry
      .slice(separatorIndex + separator.length)
      .split(",")
      .map(normalizeEmail)
      .filter(isEmailLike);

    if (!isEmailLike(alias) || targets.length === 0) {
      continue;
    }

    aliases.set(alias, targets);
  }

  return aliases;
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function isEmailLike(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
