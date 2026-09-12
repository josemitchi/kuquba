export type OwnerPropertyStatus = "active" | "attention" | "onboarding";
export type OwnerContractStatus = "DRAFT" | "ISSUED" | "SIGNED" | "ACTIVE" | "VOID" | "SUPERSEDED";
export type OwnerSettlementStatus = "DRAFT" | "READY_FOR_REVIEW" | "APPROVED" | "PAID";

export type OwnerPortalMetric = {
  hint: string;
  label: string;
  value: string;
};

export type OwnerContract = {
  canAcceptDev: boolean;
  currentVersion: number;
  endsOn?: string | null;
  id: string;
  issuedAt?: string | null;
  signedAt?: string | null;
  signatureProvider?: string | null;
  signatureProviderRef?: string | null;
  startsOn: string;
  status: OwnerContractStatus;
  statusLabel: string;
  summary?: string | null;
  terms: Array<{
    label: string;
    value: string;
  }>;
  title?: string | null;
  versions: Array<{
    createdAt: string;
    id: string;
    issuedAt?: string | null;
    summary: string;
    title: string;
    version: number;
  }>;
};

export type OwnerReservationOwnerPayment = {
  amount: string;
  amountLabel: string;
  currency: string;
  paidAt?: string | null;
  settlementId?: string | null;
  settlementPeriodLabel?: string | null;
  settlementStatus?: string | null;
  settlementStatusLabel?: string | null;
  status: "PENDING_CONFIRMATION" | "PENDING_SETTLEMENT" | "IN_SETTLEMENT" | "PAID";
  statusLabel: string;
};

export type OwnerReservation = {
  arrivalDate: string;
  currency: string;
  departureDate: string;
  guestName: string;
  id: string;
  nights: number;
  ownerPayment: OwnerReservationOwnerPayment;
  paymentStatus: string;
  paymentStatusLabel: string;
  propertyName: string;
  reservationCode: string;
  status: string;
  statusLabel: string;
  total: string;
  unitName: string;
};

export type OwnerAvailabilityBlock = {
  endsOn: string;
  id: string;
  note?: string | null;
  reason: string;
  reasonLabel: string;
  startsOn: string;
  unitId: string;
};

export type OwnerPropertyRevenue = {
  confirmedCount: number;
  currency: string;
  estimatedOwnerPayout: string;
  grossConfirmed: string;
  label: string;
};
export type OwnerProperty = {
  contract: OwnerContract;
  contractStage: string;
  estimatedRevenue: OwnerPropertyRevenue;
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
  reservations: OwnerReservation[];
  requestedBlocks: OwnerAvailabilityBlock[];
  reviewLabel: string;
  serviceLevel: string;
  status: OwnerPropertyStatus;
  statusLabel: string;
  units: Array<{ id: string; name: string }>;
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

export type OwnerFinanceSummary = {
  adjustments: string;
  cleaningFees: string;
  currency: string;
  generatedAt?: string | null;
  grossAccommodation: string;
  kuqubaServiceFees: string;
  lineCount: number;
  ownerExpenses: string;
  ownerPayout: string;
  ownerPayoutLabel: string;
  paidAt?: string | null;
  periodLabel: string;
  propertyCount: number;
  status: OwnerSettlementStatus;
  statusLabel: string;
  taxes: string;
};

export type OwnerSettlement = {
  adjustments: string;
  approvedAt?: string | null;
  cleaningFees: string;
  currency: string;
  generatedAt: string;
  grossAccommodation: string;
  id: string;
  kuqubaServiceFees: string;
  lineItems: Array<{
    amount: string;
    currency: string;
    id: string;
    label: string;
    occurredAt: string;
    reservationCode?: string | null;
    reservationId?: string | null;
    sourceMemo?: string | null;
    type: string;
    typeLabel: string;
  }>;
  ownerExpenses: string;
  ownerPayout: string;
  ownerPayoutLabel: string;
  paidAt?: string | null;
  periodEnd: string;
  periodLabel: string;
  periodStart: string;
  propertyName: string;
  reviewedAt?: string | null;
  status: OwnerSettlementStatus;
  statusLabel: string;
  taxes: string;
};

export type OwnerPortalSnapshot = {
  financeSummary: OwnerFinanceSummary;
  metrics: OwnerPortalMetric[];
  ownerName: string;
  periodLabel: string;
  properties: OwnerProperty[];
  reservations: OwnerReservation[];
  settlements: OwnerSettlement[];
  settlementItems: OwnerSettlementItem[];
  summary: string;
  tasks: OwnerTask[];
  upcomingStays: OwnerUpcomingStay[];
};

export const ownerPortalSnapshot: OwnerPortalSnapshot = {
  ownerName: "Propietario KUQUBA",
  periodLabel: "Agosto 2026",
  summary:
    "Vista dev para revisar propiedades asignadas, estancias proximas, pendientes operativos, contratos y finanzas owner desde liquidaciones persistidas.",
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
      hint: "1 firmado, 1 pendiente",
      label: "Contratos",
      value: "1 pendiente"
    },
    {
      hint: "Lista para revision - 01 Ago - 31 Ago 2026",
      label: "Saldo owner",
      value: "Q5,075.00"
    }
  ],
  financeSummary: {
    adjustments: "0.00",
    cleaningFees: "425.00",
    currency: "GTQ",
    generatedAt: "2026-08-28T00:00:00.000Z",
    grossAccommodation: "6200.00",
    kuqubaServiceFees: "496.00",
    lineCount: 5,
    ownerExpenses: "250.00",
    ownerPayout: "5075.00",
    ownerPayoutLabel: "Q5,075.00",
    paidAt: null,
    periodLabel: "01 Ago - 31 Ago 2026",
    propertyCount: 1,
    status: "READY_FOR_REVIEW",
    statusLabel: "Lista para revision",
    taxes: "854.00"
  },
  properties: [
    {
      id: "atitlan-villa-luz",
      name: "Casa Brisa del Paredon",
      location: "El Paredon",
      image: "/images/pacific-paredon-beach-house.png",
      imageAlt: "Casa de playa con terraza frente a El Paredon",
      status: "active",
      statusLabel: "Operativa",
      contract: {
        id: "contract-atitlan-v1",
        currentVersion: 1,
        status: "ACTIVE",
        statusLabel: "Contrato activo",
        title: "Contrato KUQUBA v1 - Casa Brisa del Paredon",
        summary: "Administracion profesional para Casa Brisa del Paredon en El Paredon.",
        startsOn: "2026-01-01T00:00:00.000Z",
        endsOn: "2026-12-31T00:00:00.000Z",
        issuedAt: "2025-12-15T00:00:00.000Z",
        signedAt: "2025-12-20T00:00:00.000Z",
        signatureProvider: "seed_dev_signature",
        signatureProviderRef: "DEV-SIGN-ATITLAN-SEED",
        canAcceptDev: false,
        terms: [
          { label: "Participacion owner", value: "Por definir" },
          { label: "Participacion KUQUBA", value: "Por definir" },
          { label: "Vigencia", value: "01 Ene 2026 - 31 Dic 2026" },
          { label: "Culminacion", value: "31 Dic 2026" }
        ],
        versions: [
          {
            id: "contract-version-atitlan-v1",
            version: 1,
            title: "Contrato KUQUBA v1 - Casa Brisa del Paredon",
            summary: "Administracion profesional para Casa Brisa del Paredon en El Paredon.",
            createdAt: "2025-12-15T00:00:00.000Z",
            issuedAt: "2025-12-15T00:00:00.000Z"
          }
        ]
      },
      contractStage: "Contrato activo y firmado el 20 Dic 2025",
      estimatedRevenue: {
        confirmedCount: 2,
        currency: "GTQ",
        estimatedOwnerPayout: "5084.00",
        grossConfirmed: "6200.00",
        label: "2 confirmada(s)"
      },
      reservations: [],
      requestedBlocks: [],
      units: [{ id: "unit-atitlan-main", name: "Villa completa" }],
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
      name: "Villa Arena Negra",
      location: "Monterrico",
      image: "/images/pacific-family-villa.png",
      imageAlt: "Villa familiar con piscina y terraza en Monterrico",
      status: "attention",
      statusLabel: "Atencion",
      contract: {
        id: "contract-antigua-v1",
        currentVersion: 1,
        status: "ISSUED",
        statusLabel: "Pendiente de firma",
        title: "Contrato KUQUBA v1 - Villa Arena Negra",
        summary: "Administracion profesional para Villa Arena Negra en Monterrico.",
        startsOn: "2026-08-01T00:00:00.000Z",
        endsOn: null,
        issuedAt: "2026-08-15T00:00:00.000Z",
        signedAt: null,
        signatureProvider: null,
        signatureProviderRef: null,
        canAcceptDev: true,
        terms: [
          { label: "Participacion owner", value: "Por definir" },
          { label: "Participacion KUQUBA", value: "Por definir" },
          { label: "Vigencia", value: "01 Ago 2026 - Indefinida" },
          { label: "Culminacion", value: "Indefinida" }
        ],
        versions: [
          {
            id: "contract-version-antigua-v1",
            version: 1,
            title: "Contrato KUQUBA v1 - Villa Arena Negra",
            summary: "Administracion profesional para Villa Arena Negra en Monterrico.",
            createdAt: "2026-08-15T00:00:00.000Z",
            issuedAt: "2026-08-15T00:00:00.000Z"
          }
        ]
      },
      contractStage: "Contrato emitido y pendiente de aceptacion dev del propietario",
      estimatedRevenue: {
        confirmedCount: 0,
        currency: "GTQ",
        estimatedOwnerPayout: "0.00",
        grossConfirmed: "0.00",
        label: "Sin reservas confirmadas"
      },
      reservations: [],
      requestedBlocks: [],
      units: [{ id: "unit-antigua-main", name: "Casa completa" }],
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
      property: "Casa Brisa del Paredon",
      status: "Preparacion previa",
      traveler: "Familia Rivera"
    },
    {
      date: "28 Ago",
      property: "Casa Brisa del Paredon",
      status: "Propuesta aceptada",
      traveler: "Grupo privado"
    },
    {
      date: "02 Sep",
      property: "Casa Brisa del Paredon",
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
      property: "Villa Arena Negra",
      due: "Esta semana",
      priority: "medium",
      ownerAction: true
    },
    {
      id: "task-maintenance-atitlan",
      title: "Revisar mantenimiento preventivo de terraza",
      property: "Casa Brisa del Paredon",
      due: "Programado por KUQUBA",
      priority: "medium",
      ownerAction: false
    },
    {
      id: "task-photo-antigua",
      title: "Preparar sesion de fotografia",
      property: "Villa Arena Negra",
      due: "Sin fecha final",
      priority: "low",
      ownerAction: false
    }
  ],
  reservations: [],
  settlements: [
    {
      id: "settlement-atitlan-2026-08",
      propertyName: "Casa Brisa del Paredon",
      periodLabel: "01 Ago - 31 Ago 2026",
      periodStart: "2026-08-01T00:00:00.000Z",
      periodEnd: "2026-08-31T00:00:00.000Z",
      status: "READY_FOR_REVIEW",
      statusLabel: "Lista para revision",
      currency: "GTQ",
      grossAccommodation: "6200.00",
      cleaningFees: "425.00",
      taxes: "854.00",
      kuqubaServiceFees: "496.00",
      ownerExpenses: "250.00",
      adjustments: "0.00",
      ownerPayout: "5075.00",
      ownerPayoutLabel: "Q5,075.00",
      generatedAt: "2026-08-28T00:00:00.000Z",
      reviewedAt: "2026-08-28T00:00:00.000Z",
      approvedAt: null,
      paidAt: null,
      lineItems: [
        {
          id: "settlement-line-accommodation",
          label: "Alojamiento confirmado KQB-PAREDON-20260824",
          type: "ACCOMMODATION",
          typeLabel: "Ingreso alojamiento",
          amount: "6200.00",
          currency: "GTQ",
          occurredAt: "2026-08-24T00:00:00.000Z",
          reservationCode: "KQB-PAREDON-20260824",
          sourceMemo: "seed owner finance"
        },
        {
          id: "settlement-line-service",
          label: "Servicio KUQUBA",
          type: "KUQUBA_SERVICE_FEE",
          typeLabel: "Servicio KUQUBA",
          amount: "496.00",
          currency: "GTQ",
          occurredAt: "2026-08-24T00:00:00.000Z",
          reservationCode: "KQB-PAREDON-20260824",
          sourceMemo: "seed owner finance"
        },
        {
          id: "settlement-line-expense",
          label: "Mantenimiento preventivo terraza",
          type: "OWNER_EXPENSE",
          typeLabel: "Gasto owner",
          amount: "250.00",
          currency: "GTQ",
          occurredAt: "2026-08-26T00:00:00.000Z",
          reservationCode: null,
          sourceMemo: "seed owner finance"
        }
      ]
    }
  ],
  settlementItems: [
    {
      label: "Reservas conciliadas",
      status: "En revision",
      detail: "Una liquidacion owner dev esta lista para revision."
    },
    {
      label: "Gastos operativos",
      status: "Pendiente",
      detail: "Mantenimiento y servicios se muestran como lineas financieras separadas."
    },
    {
      label: "Documentos",
      status: "2 pendientes",
      detail: "Datos fiscales e inventario sensible requieren confirmacion."
    }
  ]
};
