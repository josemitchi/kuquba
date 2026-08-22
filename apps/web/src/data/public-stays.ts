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
  proposalNote: string;
  stayStyle: string;
  summary: string;
};

export const publicStays: PublicStay[] = [
  {
    id: "atitlan-villa-luz",
    name: "Villa Luz de Atitlan",
    destination: "Lago de Atitlan",
    neighborhood: "Panajachel y pueblos cercanos",
    image: "/images/hero-villa-atitlan.png",
    imageAlt: "Villa con terraza abierta frente al Lago de Atitlan",
    summary:
      "Casa privada para viajes tranquilos, desayunos largos y vistas abiertas hacia lago y volcanes.",
    maxGuests: 6,
    bedrooms: 3,
    bathrooms: 2.5,
    stayStyle: "Villa privada",
    availability: "limited",
    availabilityLabel: "Ventanas limitadas",
    highlights: ["Vista al lago", "Ideal familias", "Soporte local"],
    amenities: ["Cocina equipada", "Terraza", "WiFi", "Parqueo coordinado"],
    gallery: [
      { src: "/images/hero-villa-atitlan.png", alt: "Terraza abierta frente al Lago de Atitlan" },
      { src: "/images/guest-suite.png", alt: "Dormitorio preparado para llegada privada" }
    ],
    houseRules: ["Llegada coordinada", "No se publican tarifas sin validacion", "Ocupacion segun propuesta"],
    operations: ["Preparacion previa", "Soporte local", "Revision de salida"],
    proposalNote: "Disponibilidad y tarifa final bajo confirmacion del equipo KUQUBA."
  },
  {
    id: "antigua-suite-jardin",
    name: "Suite Jardin Colonial",
    destination: "Antigua Guatemala",
    neighborhood: "Centro historico",
    image: "/images/guest-suite.png",
    imageAlt: "Suite elegante con luz natural y acabados calidos",
    summary:
      "Suite para escapadas de pareja o viajes de trabajo con acceso rapido a restaurantes y caminatas.",
    maxGuests: 2,
    bedrooms: 1,
    bathrooms: 1,
    stayStyle: "Suite curada",
    availability: "available",
    availabilityLabel: "Lista para solicitud",
    highlights: ["Caminable", "Check-in guiado", "Ambiente silencioso"],
    amenities: ["Cama queen", "Cafe local", "WiFi", "Limpieza programada"],
    gallery: [
      { src: "/images/guest-suite.png", alt: "Suite con luz natural y textiles calidos" },
      { src: "/images/hero-villa-atitlan.png", alt: "Referencia de estancia seleccionada KUQUBA" }
    ],
    houseRules: ["Estancia tranquila", "Acceso con verificacion", "Servicios bajo propuesta"],
    operations: ["Check-in guiado", "Recomendaciones locales", "Atencion durante estancia"],
    proposalNote: "Inventario conceptual. KUQUBA confirma fechas antes de reservar."
  },
  {
    id: "atitlan-casa-terraza",
    name: "Casa Terraza del Lago",
    destination: "Lago de Atitlan",
    neighborhood: "San Antonio Palopo y alrededores",
    image: "/images/hero-villa-atitlan.png",
    imageAlt: "Casa con terraza abierta y vista hacia volcanes en Atitlan",
    summary:
      "Casa completa para grupos pequenos que buscan privacidad, cocina equipada y atencion local coordinada.",
    maxGuests: 4,
    bedrooms: 2,
    bathrooms: 2,
    stayStyle: "Casa completa",
    availability: "request",
    availabilityLabel: "Bajo solicitud",
    highlights: ["Terraza privada", "Grupo pequeno", "Llegada asistida"],
    amenities: ["Area social", "Cocina", "WiFi", "Limpieza previa"],
    gallery: [
      { src: "/images/hero-villa-atitlan.png", alt: "Casa con terraza y vista abierta en Atitlan" },
      { src: "/images/guest-suite.png", alt: "Habitacion preparada para grupo pequeno" }
    ],
    houseRules: ["Grupo pequeno", "Coordinacion de llegada", "Politicas por propiedad"],
    operations: ["Limpieza previa", "Anfitrion coordinado", "Seguimiento post-estancia"],
    proposalNote: "Tarifas, depositos y politicas se definen por propiedad antes de confirmar."
  }
];

export function findPublicStayById(id: string) {
  return publicStays.find((stay) => stay.id === id);
}
