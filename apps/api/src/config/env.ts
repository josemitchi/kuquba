import { z } from "zod";

const defaultDevDatabaseUrl =
  "postgresql://kuquba:kuquba_dev_password@127.0.0.1:55432/kuquba_dev?schema=public";

const envSchema = z.object({
  API_HOST: z.string().default("0.0.0.0"),
  API_PORT: z.coerce.number().int().positive().default(4000),
  CORS_ORIGIN: z.string().default("http://localhost:3000"),
  DATABASE_URL: z.string().optional(),
  DEV_OTP_CODE: z.string().min(4).max(12).default("000000"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  REDIS_URL: z.string().default("redis://localhost:6379")
}).superRefine((value, context) => {
  if (value.NODE_ENV === "production" && !value.DATABASE_URL) {
    context.addIssue({
      code: "custom",
      message: "DATABASE_URL is required in production",
      path: ["DATABASE_URL"]
    });
  }
});

const parsedEnv = envSchema.parse(process.env);

export const env = {
  ...parsedEnv,
  DATABASE_URL: parsedEnv.DATABASE_URL ?? defaultDevDatabaseUrl
};

process.env.DATABASE_URL ??= env.DATABASE_URL;
