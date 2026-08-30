import type { FastifyInstance, FastifyRequest } from "fastify";

import { getRouteMetricLabel, observeHttpRequest } from "../modules/observability/metrics";

const requestStartedAt = new WeakMap<FastifyRequest, bigint>();

export function registerObservability(app: FastifyInstance) {
  app.addHook("onRequest", async (request) => {
    requestStartedAt.set(request, process.hrtime.bigint());
  });

  app.addHook("onResponse", async (request, reply) => {
    const durationMs = calculateDurationMs(requestStartedAt.get(request));
    const route = getRouteMetricLabel(request);

    observeHttpRequest({
      durationMs,
      method: request.method,
      route,
      statusCode: reply.statusCode
    });

    request.log.info(
      {
        correlationId: request.id,
        http: {
          durationMs,
          method: request.method,
          route,
          statusCode: reply.statusCode
        }
      },
      "http.request.observed"
    );
  });
}

function calculateDurationMs(startedAt: bigint | undefined) {
  if (!startedAt) {
    return 0;
  }

  const elapsedNs = process.hrtime.bigint() - startedAt;

  return Number(elapsedNs) / 1_000_000;
}