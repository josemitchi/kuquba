export type GuestReservationStatus = "HOLD" | "PENDING_PAYMENT" | "CONFIRMED" | "CANCELLED" | "COMPLETED" | "EXPIRED";
export type GuestPaymentStatus = "PENDING" | "SUCCEEDED" | "FAILED" | "EXPIRED";
export type GuestReservationTone = "success" | "warning" | "neutral" | "danger";

export type GuestMetric = {
  hint: string;
  label: string;
  value: string;
};

export type GuestPayment = {
  amount: string;
  confirmedAt: string | null;
  currency: string;
  expiresAt: string | null;
  failedAt: string | null;
  failureReason: string | null;
  id: string;
  provider: string;
  providerRef: string;
  status: GuestPaymentStatus;
  statusLabel: string;
};
export type GuestArrivalInfo = {
  checkInWindow: string;
  checkOutTime: string;
  destination: string;
  instructions: string[];
  readinessLabel: string;
};

export type GuestConfirmationInfo = {
  documentLabel: string;
  documentStatus: string;
  reference: string;
  sections: string[];
  shareable: boolean;
  statusLabel: string;
};

export type GuestReservation = {
  arrival: GuestArrivalInfo;
  arrivalDate: string;
  confirmation: GuestConfirmationInfo;
  currency: string;
  departureDate: string;
  expiresAt: string | null;
  id: string;
  isActionable: boolean;
  nights: number;
  payment: GuestPayment | null;
  propertyDestination: string;
  propertyName: string;
  propertyImageAlt: string;
  propertyImageUrl: string;
  reservationCode: string;
  source: string;
  status: GuestReservationStatus;
  statusLabel: string;
  statusTone: GuestReservationTone;
  total: string;
  unitName: string;
};

export type GuestPortalSnapshot = {
  governance: string[];
  guestName: string;
  metrics: GuestMetric[];
  nextStay: GuestReservation | null;
  reservations: GuestReservation[];
  summary: string;
};
