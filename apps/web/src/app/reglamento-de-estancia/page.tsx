import type { Metadata } from "next";

import { StayRulesPageContent } from "@/components/public-info-pages";

export const metadata: Metadata = {
  title: "Reglamento de estancia | KUQUBA"
};

export default function StayRulesRoute() {
  return <StayRulesPageContent />;
}