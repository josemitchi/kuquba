import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "KUQUBA | Estancias y administracion profesional",
  description:
    "Propiedades seleccionadas y experiencias administradas con atencion personalizada en Guatemala."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
