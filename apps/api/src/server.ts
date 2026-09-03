import { buildApp } from "./build-app";
import { env } from "./config/env";

async function main() {
  const app = await buildApp();

  try {
    await app.listen({
      host: env.API_HOST,
      port: env.API_PORT
    });
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

void main();
