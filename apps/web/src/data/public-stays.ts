export type StayAvailability = "available" | "limited" | "request";

export type StayGalleryImage = {
  alt: string;
  src: string;
};

export type PublicStay = {
  amenities: string[];
  availability: StayAvailability;
  availabilityLabel: string;
  bathrooms: number;
  bedrooms: number;
  destination: string;
  gallery: StayGalleryImage[];
  highlights: string[];
  houseRules: string[];
  id: string;
  image: string;
  imageAlt: string;
  maxGuests: number;
  name: string;
  neighborhood: string;
  operations: string[];
  bookingNote: string;
  stayStyle: string;
  summary: string;
};

export const publicStays: PublicStay[] = [
  {
    id: "paredon-casa-brisa",
    name: "Casa Brisa del Paredón",
    destination: "El Paredón",
    neighborhood: "Playa El Paredón",
    image: "/images/pacific-paredon-beach-house.png",
    imageAlt: "Casa de playa con terraza, palmeras y arena volcánica en El Paredón",
    summary:
      "Casa privada cerca del surf, arena volcánica y atardeceres del Pacífico, preparada para descansar con soporte KUQUBA.",
    maxGuests: 6,
    bedrooms: 3,
    bathrooms: 2.5,
    stayStyle: "Casa frente al mar",
    availability: "limited",
    availabilityLabel: "Ventanas limitadas",
    highlights: ["Playa activa", "Ideal familias", "Soporte local"],
    amenities: ["Cocina equipada", "Terraza", "WiFi", "Parqueo coordinado"],
    gallery: [
      {
        src: "/images/pacific-paredon-beach-house.png",
        alt: "Terraza frente a la playa en El Paredón"
      },
      { src: "/images/hero-pacific-beach.png", alt: "Villa con vista abierta hacia el Pacífico" }
    ],
    houseRules: ["Llegada coordinada", "Tarifa visible tras cotización", "Ocupación según reserva"],
    operations: ["Preparación previa", "Soporte local", "Revisión de salida"],
    bookingNote: "Disponibilidad, tarifa y bloqueo temporal se validan antes de pago."
  },
  {
    id: "monterrico-villa-arena",
    name: "Villa Arena Negra",
    destination: "Monterrico",
    neighborhood: "Zona costera de Monterrico",
    image: "/images/pacific-family-villa.png",
    imageAlt: "Villa familiar con piscina y terraza cerca de la playa en Monterrico",
    summary:
      "Villa familiar con piscina, terraza sombreada y acceso coordinado a playa para escapadas tranquilas en el Pacífico.",
    maxGuests: 6,
    bedrooms: 3,
    bathrooms: 3,
    stayStyle: "Villa familiar",
    availability: "available",
    availabilityLabel: "Lista para reservar",
    highlights: ["Piscina privada", "Cerca de playa", "Llegada guiada"],
    amenities: ["Piscina", "Rancho social", "WiFi", "Limpieza programada"],
    gallery: [
      {
        src: "/images/pacific-family-villa.png",
        alt: "Villa familiar con piscina en la costa del Pacífico"
      },
      {
        src: "/images/hero-pacific-beach.png",
        alt: "Vista costera del Pacífico con terraza privada"
      }
    ],
    houseRules: ["Estancia tranquila", "Acceso con verificación", "Servicios según reserva"],
    operations: ["Check-in guiado", "Recomendaciones locales", "Atención durante estancia"],
    bookingNote: "Fechas y tarifa se validan en la cotización antes de continuar a pago."
  },
  {
    id: "puerto-san-jose-casa-costa",
    name: "Casa Costa San José",
    destination: "Puerto San José",
    neighborhood: "Puerto San José y alrededores",
    image: "/images/hero-pacific-beach.png",
    imageAlt: "Casa de playa con piscina y terraza frente al Pacífico",
    summary:
      "Casa de playa cómoda para escapadas cortas, con patio, piscina y llegada coordinada cerca de la ciudad.",
    maxGuests: 5,
    bedrooms: 2,
    bathrooms: 2,
    stayStyle: "Casa completa",
    availability: "request",
    availabilityLabel: "Bajo validación",
    highlights: ["Escapada corta", "Piscina", "Llegada asistida"],
    amenities: ["Área social", "Cocina", "WiFi", "Limpieza previa"],
    gallery: [
      {
        src: "/images/hero-pacific-beach.png",
        alt: "Casa con terraza abierta hacia la costa del Pacífico"
      },
      {
        src: "/images/pacific-family-villa.png",
        alt: "Piscina y terraza preparada para grupo pequeño"
      }
    ],
    houseRules: ["Grupo pequeño", "Coordinación de llegada", "Políticas por propiedad"],
    operations: ["Limpieza previa", "Anfitrión coordinado", "Seguimiento post-estancia"],
    bookingNote: "La cotización valida tarifa y políticas antes de abrir el checkout."
  }
];

export function findPublicStayById(id: string) {
  return publicStays.find((stay) => stay.id === id);
}

type PublicStaysListResponse = {
  stays?: PublicStay[];
};

type PublicStayResponse = {
  stay?: PublicStay;
};

export async function loadPublicStays() {
  try {
    const response = await fetch(`${getPublicApiBaseUrl()}/api/public/stays`, {
      cache: "no-store"
    });

    if (!response.ok) {
      return publicStays;
    }

    const payload = (await response.json()) as PublicStaysListResponse;
    return payload.stays && payload.stays.length > 0 ? payload.stays : publicStays;
  } catch {
    return publicStays;
  }
}

export async function loadPublicStayById(id: string) {
  try {
    const response = await fetch(
      `${getPublicApiBaseUrl()}/api/public/stays/${encodeURIComponent(id)}`,
      {
        cache: "no-store"
      }
    );

    if (!response.ok) {
      return findPublicStayById(id) ?? null;
    }

    const payload = (await response.json()) as PublicStayResponse;
    return payload.stay ?? findPublicStayById(id) ?? null;
  } catch {
    return findPublicStayById(id) ?? null;
  }
}

function getPublicApiBaseUrl() {
  return process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:4000";
}
