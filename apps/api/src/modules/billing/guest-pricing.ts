import { Prisma } from "@prisma/client";

type MoneyValue = Prisma.Decimal | string | number | { toString(): string };

type GuestRatePlan = {
  baseNightlyRate: MoneyValue;
  cleaningFee: MoneyValue;
  currency: string;
  serviceFeeBps: number;
  taxBps: number;
  weekendNightlyRate: MoneyValue | null;
};

type GuestContractTerms = {
  id: string;
  kuqubaShareBps: number;
  ownerId: string;
  ownerShareBps: number;
} | null;

type GuestChargeCategory =
  | "ACCOMMODATION"
  | "SERVICE"
  | "DIGITAL_PLATFORM"
  | "PAYMENT_PROCESSING"
  | "TAX"
  | "DISCOUNT"
  | "ADJUSTMENT";

type GuestBeneficiaryType =
  | "OWNER"
  | "KUQUBA"
  | "PROVIDER"
  | "PAYMENT_PROCESSOR"
  | "TAX_AUTHORITY"
  | "GUEST";

type GuestLedgerEntryType = Prisma.LedgerEntryCreateManyInput["type"];

export type GuestQuoteCharge = {
  amount: string;
  category: GuestChargeCategory;
  code: string;
  currency: string;
  guestVisible: boolean;
  label: string;
  metadata?: Prisma.InputJsonObject;
  sortOrder: number;
  taxable: boolean;
};

export type GuestTaxLine = {
  amount: string;
  appliesToChargeCodes: string[];
  baseAmount: string;
  code: string;
  label: string;
  rateBps: number;
  responsibleParty: GuestBeneficiaryType;
};

export type GuestFinancialAllocationSnapshot = {
  amount: string;
  beneficiaryName?: string;
  beneficiaryRef?: string;
  beneficiaryType: GuestBeneficiaryType;
  currency: string;
  ledgerEntryType: GuestLedgerEntryType;
  memo?: string;
  settlementEligible: boolean;
  shareBps?: number;
  sourceChargeCode?: string;
};

export type GuestFinancialSnapshot = {
  allocations: GuestFinancialAllocationSnapshot[];
  charges: GuestQuoteCharge[];
  contract: {
    id: string;
    kuqubaShareBps: number;
    ownerId: string;
    ownerShareBps: number;
  } | null;
  currency: string;
  generatedAt: string;
  pricingModel: "guest_single_payment_internal_distribution";
  rules: {
    accommodationSplit: {
      kuqubaShareBps: number;
      ownerShareBps: number;
      source: "active_contract" | "default";
    };
    cleaningDistribution: "OWNER_100";
    digitalPlatformFeeBps: number;
    paymentProcessingFeeBps: number;
    taxBps: number;
  };
  taxes: GuestTaxLine[];
  totals: {
    cleaningFee: string;
    guestChargeTotal: string;
    kuqubaRevenue: string;
    nightlySubtotal: string;
    ownerPayable: string;
    paymentProcessingCost: string;
    serviceFee: string;
    tax: string;
    taxPayable: string;
    total: string;
  };
  version: "guest-billing-v1";
};

export type GuestQuoteFinancials = {
  charges: GuestQuoteCharge[];
  cleaningFee: string;
  currency: string;
  lineItems: Array<{ amount: string; key: string; label: string }>;
  nightlySubtotal: string;
  serviceFee: string;
  snapshot: GuestFinancialSnapshot;
  tax: string;
  total: string;
};

const defaultOwnerShareBps = 6500;
const defaultKuqubaShareBps = 3500;
const paymentProcessingFeeBps = 0;

export function buildGuestQuoteFinancials(input: {
  activeContract: GuestContractTerms;
  arrivalDate: Date;
  generatedAt?: Date;
  nights: number;
  ratePlan: GuestRatePlan;
}): GuestQuoteFinancials {
  const currency = input.ratePlan.currency;
  const baseNightlyRateCents = toCents(input.ratePlan.baseNightlyRate);
  const weekendNightlyRateCents = input.ratePlan.weekendNightlyRate
    ? toCents(input.ratePlan.weekendNightlyRate)
    : baseNightlyRateCents;
  let nightlySubtotalCents = 0;

  for (let nightIndex = 0; nightIndex < input.nights; nightIndex += 1) {
    const stayNight = addUtcDays(input.arrivalDate, nightIndex);
    nightlySubtotalCents += isWeekendNight(stayNight)
      ? weekendNightlyRateCents
      : baseNightlyRateCents;
  }

  const cleaningFeeCents = toCents(input.ratePlan.cleaningFee);
  const serviceFeeCents = calculateBps(
    nightlySubtotalCents + cleaningFeeCents,
    input.ratePlan.serviceFeeBps
  );
  const paymentProcessingCostCents = calculateBps(
    nightlySubtotalCents + cleaningFeeCents + serviceFeeCents,
    paymentProcessingFeeBps
  );
  const charges = buildCharges({
    cleaningFeeCents,
    currency,
    nightlySubtotalCents,
    paymentProcessingCostCents,
    serviceFeeCents
  });
  const taxableSubtotalCents = charges.reduce(
    (total, charge) => total + (charge.taxable ? toCents(charge.amount) : 0),
    0
  );
  const taxCents = calculateBps(taxableSubtotalCents, input.ratePlan.taxBps);
  const totalCents = nightlySubtotalCents + cleaningFeeCents + serviceFeeCents + taxCents;
  const shareConfig = normalizeContractShare(input.activeContract);
  const ownerAccommodationCents = calculateBps(nightlySubtotalCents, shareConfig.ownerShareBps);
  const kuqubaAccommodationCents = nightlySubtotalCents - ownerAccommodationCents;
  const ownerPayableCents = ownerAccommodationCents + cleaningFeeCents;
  const kuqubaRevenueCents = kuqubaAccommodationCents + serviceFeeCents;
  const taxes =
    taxCents > 0
      ? [
          {
            amount: amountFromCents(taxCents),
            appliesToChargeCodes: charges.filter((charge) => charge.taxable).map((charge) => charge.code),
            baseAmount: amountFromCents(taxableSubtotalCents),
            code: "ESTIMATED_TAX",
            label: "Impuestos estimados",
            rateBps: input.ratePlan.taxBps,
            responsibleParty: "TAX_AUTHORITY" as const
          }
        ]
      : [];
  const allocations = buildAllocations({
    cleaningFeeCents,
    currency,
    kuqubaAccommodationCents,
    kuqubaRevenueCents,
    ownerAccommodationCents,
    ownerId: input.activeContract?.ownerId ?? null,
    serviceFeeCents,
    shareConfig,
    taxCents
  });
  const snapshot: GuestFinancialSnapshot = {
    allocations,
    charges,
    contract: input.activeContract
      ? {
          id: input.activeContract.id,
          kuqubaShareBps: input.activeContract.kuqubaShareBps,
          ownerId: input.activeContract.ownerId,
          ownerShareBps: input.activeContract.ownerShareBps
        }
      : null,
    currency,
    generatedAt: (input.generatedAt ?? new Date()).toISOString(),
    pricingModel: "guest_single_payment_internal_distribution",
    rules: {
      accommodationSplit: {
        kuqubaShareBps: shareConfig.kuqubaShareBps,
        ownerShareBps: shareConfig.ownerShareBps,
        source: shareConfig.source
      },
      cleaningDistribution: "OWNER_100",
      digitalPlatformFeeBps: input.ratePlan.serviceFeeBps,
      paymentProcessingFeeBps,
      taxBps: input.ratePlan.taxBps
    },
    taxes,
    totals: {
      cleaningFee: amountFromCents(cleaningFeeCents),
      guestChargeTotal: amountFromCents(totalCents),
      kuqubaRevenue: amountFromCents(kuqubaRevenueCents),
      nightlySubtotal: amountFromCents(nightlySubtotalCents),
      ownerPayable: amountFromCents(ownerPayableCents),
      paymentProcessingCost: amountFromCents(paymentProcessingCostCents),
      serviceFee: amountFromCents(serviceFeeCents),
      tax: amountFromCents(taxCents),
      taxPayable: amountFromCents(taxCents),
      total: amountFromCents(totalCents)
    },
    version: "guest-billing-v1"
  };

  return {
    charges,
    cleaningFee: amountFromCents(cleaningFeeCents),
    currency,
    lineItems: buildGuestLineItems(snapshot),
    nightlySubtotal: amountFromCents(nightlySubtotalCents),
    serviceFee: amountFromCents(serviceFeeCents),
    snapshot,
    tax: amountFromCents(taxCents),
    total: amountFromCents(totalCents)
  };
}

export function buildZeroGuestQuoteFinancials(currency: string): GuestQuoteFinancials {
  const snapshot: GuestFinancialSnapshot = {
    allocations: [],
    charges: [],
    contract: null,
    currency,
    generatedAt: new Date().toISOString(),
    pricingModel: "guest_single_payment_internal_distribution",
    rules: {
      accommodationSplit: {
        kuqubaShareBps: defaultKuqubaShareBps,
        ownerShareBps: defaultOwnerShareBps,
        source: "default"
      },
      cleaningDistribution: "OWNER_100",
      digitalPlatformFeeBps: 0,
      paymentProcessingFeeBps,
      taxBps: 0
    },
    taxes: [],
    totals: {
      cleaningFee: "0.00",
      guestChargeTotal: "0.00",
      kuqubaRevenue: "0.00",
      nightlySubtotal: "0.00",
      ownerPayable: "0.00",
      paymentProcessingCost: "0.00",
      serviceFee: "0.00",
      tax: "0.00",
      taxPayable: "0.00",
      total: "0.00"
    },
    version: "guest-billing-v1"
  };

  return {
    charges: [],
    cleaningFee: "0.00",
    currency,
    lineItems: [],
    nightlySubtotal: "0.00",
    serviceFee: "0.00",
    snapshot,
    tax: "0.00",
    total: "0.00"
  };
}

export function buildStayQuoteChargeInputs(
  charges: GuestQuoteCharge[]
): Prisma.StayQuoteChargeCreateWithoutStayQuoteInput[] {
  return charges.map((charge) => ({
    amount: charge.amount,
    category: charge.category,
    code: charge.code,
    currency: charge.currency,
    guestVisible: charge.guestVisible,
    label: charge.label,
    metadata: charge.metadata ?? Prisma.JsonNull,
    sortOrder: charge.sortOrder,
    taxable: charge.taxable
  }));
}

export function buildReservationChargeInputs(input: {
  quoteCharges: Array<{
    amount: { toString(): string };
    category: GuestChargeCategory;
    code: string;
    currency: string;
    guestVisible: boolean;
    id: string;
    label: string;
    metadata: Prisma.JsonValue | null;
    sortOrder: number;
    taxable: boolean;
  }>;
}): Prisma.ReservationChargeCreateWithoutReservationInput[] {
  return input.quoteCharges.map((charge) => ({
    amount: charge.amount.toString(),
    category: charge.category,
    code: charge.code,
    currency: charge.currency,
    guestVisible: charge.guestVisible,
    label: charge.label,
    metadata: (charge.metadata ?? Prisma.JsonNull) as Prisma.InputJsonValue,
    sortOrder: charge.sortOrder,
    sourceQuoteChargeId: charge.id,
    taxable: charge.taxable
  }));
}

export function buildFinancialAllocationInputs(input: {
  financialSnapshot: Prisma.JsonValue | null;
  reservationCharges: Array<{ code: string; id: string }>;
  reservationId: string;
}): Prisma.FinancialAllocationCreateManyInput[] {
  const snapshot = readGuestFinancialSnapshot(input.financialSnapshot);

  if (!snapshot) {
    return [];
  }

  const chargeIdByCode = new Map(input.reservationCharges.map((charge) => [charge.code, charge.id]));

  return snapshot.allocations
    .filter((allocation) => Number(allocation.amount) > 0)
    .map((allocation) => ({
      amount: allocation.amount,
      beneficiaryName: allocation.beneficiaryName ?? null,
      beneficiaryRef: allocation.beneficiaryRef ?? null,
      beneficiaryType: allocation.beneficiaryType,
      currency: allocation.currency,
      ledgerEntryType: allocation.ledgerEntryType,
      memo: allocation.memo ?? null,
      reservationChargeId: allocation.sourceChargeCode
        ? (chargeIdByCode.get(allocation.sourceChargeCode) ?? null)
        : null,
      reservationId: input.reservationId,
      settlementEligible: allocation.settlementEligible,
      shareBps: allocation.shareBps ?? null,
      sourceChargeCode: allocation.sourceChargeCode ?? null
    }));
}

export function buildLedgerEntriesFromFinancialAllocations(input: {
  allocations: Array<{
    amount: { toString(): string };
    beneficiaryName: string | null;
    beneficiaryType: string;
    currency: string;
    ledgerEntryType: GuestLedgerEntryType;
    memo: string | null;
    reservationId: string;
    sourceChargeCode: string | null;
  }>;
  ledgerAccountId: string;
  paymentProviderRef: string;
  reservationId: string;
}): Prisma.LedgerEntryCreateManyInput[] {
  const baseMemo = "Payment checkout " + input.paymentProviderRef;

  return input.allocations
    .filter((allocation) => Number(allocation.amount.toString()) > 0)
    .map((allocation) => ({
      amount: allocation.amount.toString(),
      currency: allocation.currency,
      ledgerAccountId: input.ledgerAccountId,
      memo: allocation.memo ?? buildAllocationMemo(baseMemo, allocation),
      reservationId: input.reservationId,
      type: allocation.ledgerEntryType
    }));
}

export function toFinancialSnapshotInput(
  snapshot: GuestFinancialSnapshot
): Prisma.InputJsonValue {
  return snapshot as unknown as Prisma.InputJsonValue;
}

function buildCharges(input: {
  cleaningFeeCents: number;
  currency: string;
  nightlySubtotalCents: number;
  paymentProcessingCostCents: number;
  serviceFeeCents: number;
}) {
  const charges: GuestQuoteCharge[] = [
    {
      amount: amountFromCents(input.nightlySubtotalCents),
      category: "ACCOMMODATION",
      code: "ACCOMMODATION",
      currency: input.currency,
      guestVisible: true,
      label: "Hospedaje",
      metadata: {
        basis: "nights"
      },
      sortOrder: 10,
      taxable: true
    }
  ];

  if (input.cleaningFeeCents > 0) {
    charges.push({
      amount: amountFromCents(input.cleaningFeeCents),
      category: "SERVICE",
      code: "CLEANING",
      currency: input.currency,
      guestVisible: true,
      label: "Limpieza",
      metadata: {
        serviceType: "cleaning"
      },
      sortOrder: 20,
      taxable: true
    });
  }

  if (input.serviceFeeCents > 0) {
    charges.push({
      amount: amountFromCents(input.serviceFeeCents),
      category: "DIGITAL_PLATFORM",
      code: "DIGITAL_PLATFORM_FEE",
      currency: input.currency,
      guestVisible: true,
      label: "Medios digitales",
      metadata: {
        internalComponents: ["DIGITAL_PLATFORM_FEE"]
      },
      sortOrder: 30,
      taxable: true
    });
  }

  if (input.paymentProcessingCostCents > 0) {
    charges.push({
      amount: amountFromCents(input.paymentProcessingCostCents),
      category: "PAYMENT_PROCESSING",
      code: "PAYMENT_PROCESSING_FEE",
      currency: input.currency,
      guestVisible: false,
      label: "Procesamiento electronico",
      metadata: {
        internalCost: true
      },
      sortOrder: 40,
      taxable: false
    });
  }

  return charges;
}

function buildAllocations(input: {
  cleaningFeeCents: number;
  currency: string;
  kuqubaAccommodationCents: number;
  kuqubaRevenueCents: number;
  ownerAccommodationCents: number;
  ownerId: string | null;
  serviceFeeCents: number;
  shareConfig: {
    kuqubaShareBps: number;
    ownerShareBps: number;
    source: "active_contract" | "default";
  };
  taxCents: number;
}): GuestFinancialAllocationSnapshot[] {
  const allocations: GuestFinancialAllocationSnapshot[] = [
    {
      amount: amountFromCents(input.ownerAccommodationCents),
      beneficiaryRef: input.ownerId ?? undefined,
      beneficiaryType: "OWNER",
      currency: input.currency,
      ledgerEntryType: "OWNER_SHARE",
      memo: "Participacion propietario sobre hospedaje",
      settlementEligible: true,
      shareBps: input.shareConfig.ownerShareBps,
      sourceChargeCode: "ACCOMMODATION"
    },
    {
      amount: amountFromCents(input.kuqubaAccommodationCents),
      beneficiaryName: "KUQUBA",
      beneficiaryType: "KUQUBA",
      currency: input.currency,
      ledgerEntryType: "KUQUBA_SHARE",
      memo: "Participacion KUQUBA sobre hospedaje",
      settlementEligible: false,
      shareBps: input.shareConfig.kuqubaShareBps,
      sourceChargeCode: "ACCOMMODATION"
    }
  ];

  if (input.cleaningFeeCents > 0) {
    allocations.push({
      amount: amountFromCents(input.cleaningFeeCents),
      beneficiaryRef: input.ownerId ?? undefined,
      beneficiaryType: "OWNER",
      currency: input.currency,
      ledgerEntryType: "CLEANING",
      memo: "Limpieza por liquidar segun regla inicial",
      settlementEligible: true,
      shareBps: 10000,
      sourceChargeCode: "CLEANING"
    });
  }

  if (input.serviceFeeCents > 0) {
    allocations.push({
      amount: amountFromCents(input.serviceFeeCents),
      beneficiaryName: "KUQUBA",
      beneficiaryType: "KUQUBA",
      currency: input.currency,
      ledgerEntryType: "KUQUBA_SERVICE_FEE",
      memo: "Medios digitales KUQUBA",
      settlementEligible: false,
      shareBps: 10000,
      sourceChargeCode: "DIGITAL_PLATFORM_FEE"
    });
  }

  if (input.taxCents > 0) {
    allocations.push({
      amount: amountFromCents(input.taxCents),
      beneficiaryName: "Autoridad fiscal",
      beneficiaryType: "TAX_AUTHORITY",
      currency: input.currency,
      ledgerEntryType: "TAX",
      memo: "Impuestos estimados por pagar",
      settlementEligible: false,
      shareBps: 10000,
      sourceChargeCode: "ESTIMATED_TAX"
    });
  }

  return allocations.filter((allocation) => Number(allocation.amount) > 0);
}

function buildGuestLineItems(snapshot: GuestFinancialSnapshot) {
  const chargeItems = snapshot.charges
    .filter((charge) => charge.guestVisible && Number(charge.amount) > 0)
    .map((charge) => ({
      amount: charge.amount,
      key: charge.code,
      label: charge.label
    }));
  const taxItems = snapshot.taxes
    .filter((taxLine) => Number(taxLine.amount) > 0)
    .map((taxLine) => ({
      amount: taxLine.amount,
      key: taxLine.code,
      label: taxLine.label
    }));

  return [...chargeItems, ...taxItems];
}

function normalizeContractShare(contract: GuestContractTerms): {
  kuqubaShareBps: number;
  ownerShareBps: number;
  source: "active_contract" | "default";
} {
  if (
    contract &&
    contract.ownerShareBps >= 0 &&
    contract.kuqubaShareBps >= 0 &&
    contract.ownerShareBps + contract.kuqubaShareBps === 10000
  ) {
    return {
      kuqubaShareBps: contract.kuqubaShareBps,
      ownerShareBps: contract.ownerShareBps,
      source: "active_contract"
    };
  }

  return {
    kuqubaShareBps: defaultKuqubaShareBps,
    ownerShareBps: defaultOwnerShareBps,
    source: "default"
  };
}

function readGuestFinancialSnapshot(value: Prisma.JsonValue | null | undefined) {
  if (!isRecord(value)) {
    return null;
  }

  if (value.version !== "guest-billing-v1" || !Array.isArray(value.allocations)) {
    return null;
  }

  return value as unknown as GuestFinancialSnapshot;
}

function buildAllocationMemo(
  baseMemo: string,
  allocation: {
    beneficiaryName: string | null;
    beneficiaryType: string;
    sourceChargeCode: string | null;
  }
) {
  const destination = allocation.beneficiaryName ?? allocation.beneficiaryType;
  const source = allocation.sourceChargeCode ? " - " + allocation.sourceChargeCode : "";

  return baseMemo + " - " + destination + source;
}

function calculateBps(amountCents: number, bps: number) {
  return Math.round((amountCents * bps) / 10000);
}

function toCents(value: MoneyValue | null | undefined) {
  if (value === null || typeof value === "undefined") {
    return 0;
  }

  return Math.round(Number(value.toString()) * 100);
}

function amountFromCents(cents: number) {
  return (cents / 100).toFixed(2);
}

function addUtcDays(date: Date, days: number) {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);

  return result;
}

function isWeekendNight(date: Date) {
  const day = date.getUTCDay();

  return day === 5 || day === 6;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}