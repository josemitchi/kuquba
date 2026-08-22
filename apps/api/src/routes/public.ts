import { accessOptions, kuqubaBrand, publicNavigation, trustPillars } from "@kuquba/config";
import type { FastifyPluginAsync } from "fastify";

export const registerPublicRoutes: FastifyPluginAsync = async (app) => {
  app.get("/bootstrap", async () => ({
    brand: kuqubaBrand,
    navigation: publicNavigation,
    accessOptions,
    trustPillars,
    featureFlags: {
      search: "static-shell",
      ownerLead: "static-shell",
      payments: "adapter-pending"
    }
  }));
};
