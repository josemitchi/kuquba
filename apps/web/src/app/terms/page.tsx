import type { Metadata } from "next";

import { TermsPageContent } from "@/components/public-info-pages";

export const metadata: Metadata = {
  title: "Terminos y condiciones | KUQUBA"
};

export default function TermsRoute() {
  return <TermsPageContent />;
}