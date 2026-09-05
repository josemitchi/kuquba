import type { Metadata } from "next";

import { FaqPageContent } from "@/components/public-info-pages";

export const metadata: Metadata = {
  title: "Preguntas frecuentes | KUQUBA"
};

export default function FaqRoute() {
  return <FaqPageContent />;
}