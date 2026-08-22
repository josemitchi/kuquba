export type OwnerPropertyStatus = "active" | "attention" | "onboarding";

export type OwnerPortalMetric = {
  hint: string;
  label: string;
  value: string;
};

export type OwnerProperty = {
  contractStage: string;
  highlights: string[];
  id: string;
  image: string;
  imageAlt: string;
  location: string;
  name: string;
  nextArrival: string;
  occupancySignal: string;
  openItems: number;
  operations: Array<{
    label: string;
    state: string;
  }>;
  reviewLabel: string;
  serviceLevel: string;
  status: OwnerPropertyStatus;
  statusLabel: string;
};

export type OwnerUpcomingStay = {
  date: string;
  property: string;
  status: string;
  traveler: string;
};

export type OwnerTask = {
  due: string;
  id: string;
  ownerAction: boolean;
  priority: "high" | "low" | "medium";
  property: string;
  title: string;
};

export type OwnerSettlementItem = {
  detail: string;
  label: string;
  status: string;
};

export type OwnerPortalSnapshot = {
  governance: string[];
  metrics: OwnerPortalMetric[];
  ownerName: string;
  periodLabel: string;
  properties: OwnerProperty[];
  settlementItems: OwnerSettlementItem[];
  summary: string;
  tasks: OwnerTask[];
  upcomingStays: OwnerUpcomingStay[];
};

export const ownerPortalSnapshot: OwnerPortalSnapshot = {
  ownerName: "Propietario KUQUBA",
  periodLabel: "Agosto 2026",
  summary:
    "Vista dev para revisar propiedades asignadas, estancias proximas, pendientes operativos y cierre documental sin exponer reglas financieras definitivas.",
  metrics: [
    {
      hint: "1 operativa, 1 en activacion",
      label: "Propiedades",
      value: "2"
    },
    {
      hint: "Coordinadas por operacion",
      label: "Llegadas proximas",
      value: "3"
    },
    {
      hint: "2 requieren accion del propietario",
      label: "Pendientes",
      value: "5"
    },
    {
      hint: "Sin montos en esta etapa",
      label: "Cierre mensual",
      value: "En revision"
    }
  ],
  properties: [
    {
      id: "atitlan-villa-luz",
      name: "Villa Luz de Atitlan",
      location: "Lago de Atitlan",
      image: "/images/hero-villa-atitlan.png",
      imageAlt: "Villa con terraza abierta frente al Lago de Atitlan",
      status: "active",
      statusLabel: "Operativa",
      contractStage: "Contrato activo, documentos base completos",
      nextArrival: "24 Ago 2026",
      occupancySignal: "Demanda activa",
      openItems: 2,
      reviewLabel: "Revision semanal completa",
      serviceLevel: "Operacion completa",
      highlights: ["Soporte local", "Limpieza coordinada", "Check-in asistido"],
      operations: [
        { label: "Calendario", state: "Sin bloqueos criticos" },
        { label: "Housekeeping", state: "Equipo asignado" },
        { label: "Mantenimiento", state: "Preventivo pendiente" }
      ]
    },
    {
      id: "antigua-casa-patio",
      name: "Casa Patio Antigua",
      location: "Antigua Guatemala",
      image: "/images/owner-dashboard.png",
      imageAlt: "Dashboard conceptual de administracion para propietario",
      status: "onboarding",
      statusLabel: "Activacion",
      contractStage: "Inventario y reglas de casa en validacion",
      nextArrival: "Pendiente de publicacion",
      occupancySignal: "Preparando inventario",
      openItems: 3,
      reviewLabel: "Revision inicial abierta",
      serviceLevel: "Activacion operativa",
      highlights: ["Fotografia pendiente", "Reglas por validar", "Alta de proveedor"],
      operations: [
        { label: "Calendario", state: "Bloqueado para carga" },
        { label: "Housekeeping", state: "Proveedor por confirmar" },
        { label: "Mantenimiento", state: "Inspeccion inicial" }
      ]
    }
  ],
  upcomingStays: [
    {
      date: "24 Ago",
      property: "Villa Luz de Atitlan",
      status: "Preparacion previa",
      traveler: "Familia Rivera"
    },
    {
      date: "28 Ago",
      property: "Villa Luz de Atitlan",
      status: "Propuesta aceptada",
      traveler: "Grupo privado"
    },
    {
      date: "02 Sep",
      property: "Villa Luz de Atitlan",
      status: "Solicitud en validacion",
      traveler: "Huesped por confirmar"
    }
  ],
  tasks: [
    {
      id: "task-docs-tax",
      title: "Actualizar datos fiscales de propietario",
      property: "Cuenta propietario",
      due: "Antes del cierre mensual",
      priority: "high",
      ownerAction: true
    },
    {
      id: "task-inventory-antigua",
      title: "Confirmar inventario sensible",
      property: "Casa Patio Antigua",
      due: "Esta semana",
      priority: "medium",
      ownerAction: true
    },
    {
      id: "task-maintenance-atitlan",
      title: "Revisar mantenimiento preventivo de terraza",
      property: "Villa Luz de Atitlan",
      due: "Programado por KUQUBA",
      priority: "medium",
      ownerAction: false
    },
    {
      id: "task-photo-antigua",
      title: "Preparar sesion de fotografia",
      property: "Casa Patio Antigua",
      due: "Sin fecha final",
      priority: "low",
      ownerAction: false
    }
  ],
  settlementItems: [
    {
      label: "Reservas conciliadas",
      status: "En revision",
      detail: "Se mostraran importes cuando exista libro mayor validado."
    },
    {
      label: "Gastos operativos",
      status: "Pendiente",
      detail: "Mantenimiento y servicios requieren aprobacion documental."
    },
    {
      label: "Documentos",
      status: "2 pendientes",
      detail: "Datos fiscales e inventario sensible requieren confirmacion."
    }
  ],
  governance: [
    "El portal respeta permisos de propietario y no muestra propiedades no asignadas.",
    "Liquidaciones y montos quedan fuera del mock hasta definir contrato y ledger.",
    "Acciones sensibles quedan preparadas para auditoria por sesion."
  ]
};
