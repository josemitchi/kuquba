import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import sensible from "@fastify/sensible";
import Fastify from "fastify";

import { env } from "./config/env";
import { registerIdentityRoutes } from "./modules/identity/routes";
import { registerOwnerRoutes } from "./routes/owner";
import { registerErrorHandler } from "./plugins/error-handler";
import { registerRequestContext } from "./plugins/request-context";
import { registerHealthRoutes } from "./routes/health";
import { registerPublicRoutes } from "./routes/public";

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: env.NODE_ENV === "production" ? "info" : "debug",
      redact: ["req.headers.authorization", "req.headers.cookie"]
    },
    genReqId: (request) =>
      request.headers["x-request-id"]?.toString() ?? crypto.randomUUID()
  });

  await app.register(registerRequestContext);
  await app.register(helmet, {
    global: true
  });

  await app.register(cors, {
    origin: env.CORS_ORIGIN,
    credentials: true
  });

  await app.register(sensible);
  registerErrorHandler(app);
  await app.register(registerHealthRoutes);
  await app.register(registerIdentityRoutes, { prefix: "/api/identity" });
  await app.register(registerOwnerRoutes, { prefix: "/api/owner" });
  await app.register(registerPublicRoutes, { prefix: "/api/public" });

  return app;
}
