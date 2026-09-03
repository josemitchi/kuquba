import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import sensible from "@fastify/sensible";
import Fastify, { type FastifyInstance, type FastifyServerOptions } from "fastify";

import { env } from "./config/env";
import { registerIdentityRoutes } from "./modules/identity/routes";
import { registerGuestRoutes } from "./routes/guest";
import { registerMetricsRoutes } from "./routes/metrics";
import { registerOwnerRoutes } from "./routes/owner";
import { registerOpsRoutes } from "./routes/ops";
import { registerOpsIamRoutes } from './routes/ops-iam';
import { registerErrorHandler } from "./plugins/error-handler";
import { registerObservability } from "./plugins/observability";
import { registerRequestContext } from "./plugins/request-context";
import { registerHealthRoutes } from "./routes/health";
import { registerPublicRoutes } from "./routes/public";

export function getFastifyOptions(): FastifyServerOptions {
  return {
    logger: {
      level: env.NODE_ENV === "production" ? "info" : "debug",
      redact: [
        "req.headers.authorization",
        "req.headers.cookie",
        "req.headers[\"x-api-key\"]",
        "req.headers[\"x-kuquba-dev-session\"]",
        "req.headers[\"x-kuquba-metrics-token\"]",
        "req.headers[\"x-kuquba-signature\"]",
        "req.headers[\"x-resend-signature\"]"
      ]
    },
    genReqId: (request) =>
      request.headers["x-request-id"]?.toString() ?? crypto.randomUUID()
  };
}

export async function configureApp(app: FastifyInstance) {
  await app.register(registerRequestContext);
  registerObservability(app);
  await app.register(helmet, {
    global: true
  });

  const corsOrigins = env.CORS_ORIGIN.split(",").map((origin) => origin.trim()).filter(Boolean);

  await app.register(cors, {
    origin: corsOrigins,
    credentials: true
  });

  await app.register(sensible);
  registerErrorHandler(app);
  await app.register(registerHealthRoutes);
  await app.register(registerMetricsRoutes);
  await app.register(registerIdentityRoutes, { prefix: "/api/identity" });
  await app.register(registerGuestRoutes, { prefix: "/api/guest" });
  await app.register(registerOwnerRoutes, { prefix: "/api/owner" });
  await app.register(registerOpsRoutes, { prefix: "/api/ops" });
  await app.register(registerOpsIamRoutes, { prefix: '/api/ops' });
  await app.register(registerPublicRoutes, { prefix: "/api/public" });

  return app;
}

export async function buildApp() {
  const app = Fastify(getFastifyOptions());
  return configureApp(app);
}
