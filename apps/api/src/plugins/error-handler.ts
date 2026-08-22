import type { FastifyInstance } from "fastify";
import { ZodError } from "zod";

export function registerErrorHandler(app: FastifyInstance) {
  app.setErrorHandler((error, request, reply) => {
    if (error instanceof ZodError) {
      request.log.warn({ correlationId: request.id }, "validation.failed");

      return reply.code(400).send({
        error: "validation_error",
        correlationId: request.id,
        issues: error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message
        }))
      });
    }

    const statusCode = getStatusCode(error);
    request.log.error({ err: error, correlationId: request.id }, "request.failed");

    return reply.code(statusCode).send({
      error: statusCode >= 500 ? "internal_server_error" : "request_error",
      correlationId: request.id
    });
  });
}

function getStatusCode(error: unknown) {
  const statusCode = (error as { statusCode?: unknown }).statusCode;

  if (typeof statusCode === "number" && statusCode >= 400 && statusCode < 600) {
    return statusCode;
  }

  return 500;
}
