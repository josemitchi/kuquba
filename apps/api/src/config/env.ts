import { z } from "zod";

const defaultDevDatabaseUrl =
  "postgresql://kuquba:kuquba_dev_password@127.0.0.1:55432/kuquba_dev?schema=public";

const emptyToUndefined = (value: unknown) => (value === "" ? undefined : value);

const optionalSecretSchema = z.preprocess(emptyToUndefined, z.string().min(1).optional());
const optionalUrlSchema = z.preprocess(emptyToUndefined, z.string().url().optional());

const envSchema = z
  .object({
    API_HOST: z.string().default("0.0.0.0"),
    API_PORT: z.coerce.number().int().positive().default(4000),
    CORS_ORIGIN: z.string().default("http://localhost:3000,http://127.0.0.1:3000"),
    DATABASE_URL: z.string().optional(),
    DEV_OTP_CODE: z.string().min(4).max(12).default("000000"),
    FORMAL_DELIVERY_API_KEY: optionalSecretSchema,
    FORMAL_DELIVERY_MAX_ATTEMPTS: z.coerce.number().int().min(1).max(10).default(3),
    FORMAL_DELIVERY_PROVIDER: z.enum(["dev", "webhook"]).default("dev"),
    FORMAL_DELIVERY_RETRY_DELAY_SECONDS: z.coerce.number().int().min(10).max(86400).default(300),
    FORMAL_DELIVERY_SIGNING_SECRET: optionalSecretSchema,
    FORMAL_DELIVERY_TIMEOUT_MS: z.coerce.number().int().min(1000).max(60000).default(8000),
    FORMAL_DELIVERY_WEBHOOK_URL: optionalUrlSchema,
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    OBSERVABILITY_METRICS_TOKEN: optionalSecretSchema,
    REDIS_URL: z.string().default("redis://localhost:6379")
  })
  .superRefine((value, context) => {
    if (value.NODE_ENV === "production" && !value.DATABASE_URL) {
      context.addIssue({
        code: "custom",
        message: "DATABASE_URL is required in production",
        path: ["DATABASE_URL"]
      });
    }

    if (value.NODE_ENV === "production" && !value.OBSERVABILITY_METRICS_TOKEN) {
      context.addIssue({
        code: "custom",
        message: "OBSERVABILITY_METRICS_TOKEN is required in production",
        path: ["OBSERVABILITY_METRICS_TOKEN"]
      });
    }

    if (value.FORMAL_DELIVERY_PROVIDER !== "webhook") {
      return;
    }

    if (!value.FORMAL_DELIVERY_WEBHOOK_URL) {
      context.addIssue({
        code: "custom",
        message: "FORMAL_DELIVERY_WEBHOOK_URL is required when FORMAL_DELIVERY_PROVIDER=webhook",
        path: ["FORMAL_DELIVERY_WEBHOOK_URL"]
      });
    } else if (!isAllowedFormalDeliveryWebhookUrl(value.FORMAL_DELIVERY_WEBHOOK_URL, value.NODE_ENV)) {
      context.addIssue({
        code: "custom",
        message:
          "FORMAL_DELIVERY_WEBHOOK_URL must use https, except http localhost URLs in non-production environments",
        path: ["FORMAL_DELIVERY_WEBHOOK_URL"]
      });
    }

    if (!value.FORMAL_DELIVERY_API_KEY) {
      context.addIssue({
        code: "custom",
        message: "FORMAL_DELIVERY_API_KEY is required when FORMAL_DELIVERY_PROVIDER=webhook",
        path: ["FORMAL_DELIVERY_API_KEY"]
      });
    }
  });

const parsedEnv = envSchema.parse(process.env);

export const env = {
  ...parsedEnv,
  DATABASE_URL: parsedEnv.DATABASE_URL ?? defaultDevDatabaseUrl
};

process.env.DATABASE_URL ??= env.DATABASE_URL;

function isAllowedFormalDeliveryWebhookUrl(value: string, nodeEnv: "development" | "test" | "production") {
  const url = new URL(value);

  if (url.protocol === "https:") {
    return true;
  }

  return nodeEnv !== "production" && url.protocol === "http:" && isLocalhost(url.hostname);
}

function isLocalhost(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}
