import type { Metadata } from "next";

import { ContactPageContent } from "@/components/public-info-pages";

export const metadata: Metadata = {
  title: "Contacto | KUQUBA"
};

export default function ContactRoute() {
  return <ContactPageContent />;
}