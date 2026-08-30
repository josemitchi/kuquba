import { timingSafeEqual } from "node:crypto";

import type { FastifyPluginAsync, FastifyRequest } from "fastify";

import { env } from "../config/env";
import { renderPrometheusMetrics } from "../modules/observability/metrics";

export const registerMetricsRoutes: FastifyPluginAsync = async (app) => {
  app.get("/metrics", async (request, reply) => {
    if (!isMetricsRequestAuthorized(request)) {
      request.log.warn({ correlationId: request.id }, "metrics.unauthorized");

      return reply.code(401).send({
        error: "metrics_unauthorized",
        correlationId: request.id
      });
    }

    const metrics = await renderPrometheusMetrics();

    return reply.type("text/plain; version=0.0.4; charset=utf-8").send(metrics);
  });
};

function isMetricsRequestAuthorized(request: FastifyRequest) {
  if (!env.OBSERVABILITY_METRICS_TOKEN && env.NODE_ENV !== "production") {
    return true;
  }

  if (!env.OBSERVABILITY_METRICS_TOKEN) {
    return false;
  }

  const providedToken = extractMetricsToken(request);

  if (!providedToken) {
    return false;
  }

  return constantTimeEquals(providedToken, env.OBSERVABILITY_METRICS_TOKEN);
}

function extractMetricsToken(request: FastifyRequest) {
  const explicitToken = request.headers["x-kuquba-metrics-token"]?.toString();

  if (explicitToken) {
    return explicitToken;
  }

  const authorization = request.headers.authorization;

  if (!authorization) {
    return null;
  }

  const [scheme, token] = authorization.split(" ");

  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return null;
  }

  return token;
}

function constantTimeEquals(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}