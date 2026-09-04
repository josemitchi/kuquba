import { accessOptions, publicNavigation } from "@kuquba/config";
import { Camera, MessageCircle, ShieldCheck } from "lucide-react";
import Image from "next/image";

export function SiteFooter() {
  return (
    <footer className="bg-midnight text-white" id="contacto">
      <div className="container-shell grid gap-10 py-12 md:grid-cols-[1.25fr_1fr_1fr_1fr]">
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
            Administramos propiedades y creamos estancias excepcionales en los destinos mas
            especiales de Guatemala.
          </p>
          <div className="mt-6 flex gap-3">
            {[Camera, MessageCircle, ShieldCheck].map((Icon, index) => (
              <a
                aria-label={`Canal KUQUBA ${index + 1}`}
                className="focus-ring flex h-10 w-10 items-center justify-center rounded-full border border-white/28 text-white transition hover:border-white"
                href="#"
                key={index}
              >
                <Icon aria-hidden className="h-5 w-5" />
              </a>
            ))}
          </div>
        </div>

        <FooterGroup title="Enlaces" items={publicNavigation} />
        <FooterGroup
          title="Recursos"
          items={[
            { label: "Preguntas frecuentes", href: "#" },
            { label: "Terminos y condiciones", href: "#" },
            { label: "Politicas de privacidad", href: "#" }
          ]}
        />
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
