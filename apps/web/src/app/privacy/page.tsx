import type { Metadata } from "next";

import { PrivacyPageContent } from "@/components/public-info-pages";

export const metadata: Metadata = {
  title: "Políticas de privacidad | KUQUBA"
};

export default function PrivacyRoute() {
  return <PrivacyPageContent />;
}