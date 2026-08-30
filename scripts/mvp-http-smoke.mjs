#!/usr/bin/env node
/* global console, fetch, process */

const apiBaseUrl =
  process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:4000";
const devOtpCode = process.env.DEV_OTP_CODE ?? "000000";

const checks = [];

async function main() {
  const health = await request("GET", "/health");
  assert(health.ok === true, "API healthcheck did not return ok");
  pass("healthcheck");

  const metrics = await requestText("GET", "/metrics");
  assert(metrics.includes("kuquba_http_requests_total"), "metrics endpoint missing HTTP counter");
  pass("metrics endpoint");

  const catalog = await request("GET", "/api/public/stays");
  assert(Array.isArray(catalog.stays) && catalog.stays.length > 0, "public catalog is empty");
  const stay =
    catalog.stays.find((item) => item.id === "atitlan-villa-luz") ??
    catalog.stays.find((item) => item.maxGuests >= 2) ??
    catalog.stays[0];
  pass(`public catalog (${stay.id})`);

  const quote = await findAvailableQuote(stay.id);
  pass(`availability quote ${quote.arrivalDate} to ${quote.departureDate}`);

  const email = `qa.mvp.${Date.now()}@kuquba.local`;
  const holdResponse = await request("POST", "/api/public/stay-holds", {
    email,
    guestName: "QA MVP Smoke",
    phone: "55552222",
    quoteId: quote.id
  });
  const hold = holdResponse.hold;
  assert(hold?.id && hold?.reservationCode, "reservation hold was not created");
  pass(`reservation hold ${hold.reservationCode}`);

  const checkoutResponse = await request("POST", "/api/public/payment-checkouts", {
    reservationId: hold.id,
    reservationCode: hold.reservationCode
  });
  const checkout = checkoutResponse.checkout;
  assert(checkout?.id, "payment checkout was not created");
  pass("payment checkout");

  const confirmedPayment = await request("POST", "/api/public/payment-checkouts/confirm", {
    paymentId: checkout.id,
    reservationCode: hold.reservationCode
  });
  assert(
    confirmedPayment.reservation?.status === "CONFIRMED",
    "payment confirmation did not confirm reservation"
  );
  pass("payment confirmation blocks reservation");

  const guestSession = await login("guest", email);
  const guestPortal = await request("GET", "/api/guest/portal", undefined, guestSession);
  assert(
    guestPortal.portal?.reservations?.some(
      (reservation) => reservation.reservationCode === hold.reservationCode
    ),
    "guest portal does not include confirmed reservation"
  );
  pass("guest portal");

  const ownerSession = await login("owner", "owner.dev@kuquba.local");
  const ownerPortal = await request("GET", "/api/owner/portal", undefined, ownerSession);
  assert(ownerPortal.portal?.properties?.length > 0, "owner portal has no properties");
  assert(Array.isArray(ownerPortal.portal?.reservations), "owner portal has no reservations list");
  pass("owner portal");

  const opsSession = await login("ops", "iam.admin@kuquba.local");
  const opsReservations = await request("GET", "/api/ops/reservations", undefined, opsSession);
  assert(
    Array.isArray(opsReservations.reservations?.reservations),
    "ops reservations dashboard did not return a reservations list"
  );
  pass("ops reservations dashboard");

  const confirmation = await request(
    "POST",
    `/api/ops/reservations/${hold.id}/confirmation-dev`,
    {},
    opsSession
  );
  assert(confirmation.confirmation?.targetMasked, "ops confirmation dev was not recorded");
  pass("ops confirmation dev");

  const cancelResponse = await request(
    "PATCH",
    `/api/ops/reservations/${hold.id}/status`,
    { status: "CANCELLED" },
    opsSession
  );
  assert(cancelResponse.reservation?.status === "CANCELLED", "ops cancellation failed");
  pass("ops cancellation releases reservation");

  const releasedQuote = await request("POST", "/api/public/stay-quotes", {
    arrivalDate: quote.arrivalDate,
    departureDate: quote.departureDate,
    guests: 2,
    stayId: stay.id
  });
  assert(
    releasedQuote.quote?.available === true,
    "cancelled reservation still blocks availability"
  );
  pass("availability released after cancellation");

  console.log(JSON.stringify({ ok: true, apiBaseUrl, checks }, null, 2));
}

async function findAvailableQuote(stayId) {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  for (let offset = 420; offset < 780; offset += 3) {
    const arrivalDate = dateOnly(addDays(today, offset));
    const departureDate = dateOnly(addDays(today, offset + 2));
    const response = await request("POST", "/api/public/stay-quotes", {
      arrivalDate,
      departureDate,
      guests: 2,
      stayId
    });

    if (response.quote?.available === true) {
      return response.quote;
    }
  }

  throw new Error(`No available quote found for ${stayId}`);
}

async function login(audience, email) {
  const start = await request("POST", "/api/identity/passwordless/start", { audience, email });
  assert(start.challengeId, `missing challenge for ${audience}`);

  const verify = await request("POST", "/api/identity/passwordless/verify", {
    audience,
    challengeId: start.challengeId,
    code: devOtpCode
  });

  assert(verify.session?.sessionToken, `missing session token for ${audience}`);
  pass(`${audience} login`);
  return verify.session.sessionToken;
}

async function request(method, path, body, sessionToken) {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method,
    headers: buildHeaders(body, sessionToken),
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(`${method} ${path} failed ${response.status}: ${text}`);
  }

  return payload;
}

async function requestText(method, path, sessionToken) {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method,
    headers: buildHeaders(undefined, sessionToken)
  });
  const text = await response.text();

  if (!response.ok) {
    throw new Error(`${method} ${path} failed ${response.status}: ${text}`);
  }

  return text;
}

function buildHeaders(body, sessionToken) {
  return {
    ...(body === undefined ? {} : { "content-type": "application/json" }),
    ...(sessionToken ? { "x-kuquba-dev-session": sessionToken } : {})
  };
}

function pass(name) {
  checks.push(name);
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function addDays(date, days) {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function dateOnly(date) {
  return date.toISOString().slice(0, 10);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
