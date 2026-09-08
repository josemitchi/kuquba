import { accessOptions } from "@kuquba/config";
import { Camera, MessageCircle, ShieldCheck } from "lucide-react";
import Image from "next/image";

const footerNavigation = [
  { label: "Estancias", href: "/#estancias" },
  { label: "Administra tu propiedad", href: "/#propietarios" },
  { label: "Nosotros", href: "/#experiencia" },
  { label: "Contacto", href: "/contact" }
] as const;

const resourceLinks = [
  { label: "Preguntas frecuentes", href: "/faq" },
  { label: "Términos y condiciones", href: "/terms" },
  { label: "Políticas de privacidad", href: "/privacy" },
  { label: "Reglamento de estancia", href: "/reglamento-de-estancia" }
] as const;

const footerActions = [
  { label: "Buscar estancia", href: "/stay/search", icon: Camera },
  { label: "Contactar KUQUBA", href: "/contact", icon: MessageCircle },
  { label: "Privacidad y seguridad", href: "/privacy", icon: ShieldCheck }
] as const;

export function SiteFooter() {
  return (
    <footer className="bg-midnight text-white" id="contacto">
      <div className="container-shell grid gap-10 py-12 md:grid-cols-[1.35fr_0.8fr_0.8fr_0.8fr]">
        <div>
          <div className="flex items-center gap-3">
            <Image
              src="/brand/kuquba-isotipo.svg"
              alt=""
              width={52}
              height={52}
              className="h-12 w-12 object-contain"
            />
            <div>
              <p className="text-2xl font-semibold leading-none">KUQUBA</p>
              <p className="mt-1 text-[0.65rem] uppercase text-[#1fb7a2]">
                Conexiones que generan confianza
              </p>
            </div>
          </div>
          <p className="mt-5 max-w-xs text-sm leading-6 text-white/70">
            Administramos estancias seleccionadas en la costa del Pacífico de Guatemala, con operación y soporte KUQUBA.
          </p>
          <div className="mt-6 flex gap-3">
            {footerActions.map((action) => {
              const Icon = action.icon;

              return (
                <a
                  aria-label={action.label}
                  className="focus-ring flex h-11 w-11 items-center justify-center rounded-full border border-white/40 text-white transition hover:border-white hover:bg-white/8"
                  href={action.href}
                  key={action.href}
                >
                  <Icon aria-hidden className="h-5 w-5" />
                </a>
              );
            })}
          </div>
        </div>

        <FooterGroup title="Enlaces" items={footerNavigation} />
        <FooterGroup title="Recursos" items={resourceLinks} />
        <FooterGroup title="Acceso" items={accessOptions} />
      </div>

      <div className="border-t border-white/10 py-5 text-center text-xs text-white/58">
        © 2026 KUQUBA. Todos los derechos reservados.
      </div>
    </footer>
  );
}

function FooterGroup({
  title,
  items
}: {
  title: string;
  items: ReadonlyArray<{ label: string; href: string }>;
}) {
  return (
    <div>
      <h2 className="text-xs font-semibold uppercase text-white/80">{title}</h2>
      <ul className="mt-4 space-y-3 text-sm text-white/72">
        {items.map((item) => (
          <li key={item.href + item.label}>
            <a className="focus-ring rounded-sm transition hover:text-white" href={item.href}>
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}