# Guest Billing Model

Version: 1.0
Date: September 2026

## Purpose

This document maps the functional guest billing model into the current KUQUBA codebase. The goal is to keep the guest checkout simple while preserving an internal financial breakdown that can later feed payments, invoicing, ledger, owner settlements, and accounting.

## Core Principle

A guest makes one payment for a reservation, but that payment is not automatically KUQUBA revenue. Each monetary component must keep its source, tax treatment, beneficiary, and settlement intent.

Conceptually:

```text
Guest payment != KUQUBA revenue
```

## Implemented Base

The current implementation adds these primitives:

- `ChargeDefinition`: configurable catalog of concepts that can be charged or tracked.
- `TaxRule`: configurable fiscal rules with rate, applicability, responsible party, and metadata.
- `StayQuoteCharge`: concrete charges calculated for a quote.
- `ReservationCharge`: quote charges copied to the reservation at hold creation.
- `FinancialAllocation`: internal distribution of reservation charges by beneficiary.
- `financialSnapshot`: JSON snapshot stored on quotes and reservations to preserve the exact pricing model and rule values used at that time.

## Initial Concepts

The public catalog seed creates these organization-level concepts:

- `ACCOMMODATION`: lodging value, distributed by active contract split.
- `CLEANING`: operational cleaning service, initially liquidable to owner.
- `DIGITAL_PLATFORM_FEE`: KUQUBA platform and digital management fee.
- `PAYMENT_PROCESSING_FEE`: prepared internal processing cost, currently zero and not guest visible.

The initial public catalog contracts use a 65 percent owner and 35 percent KUQUBA split. The quote engine snapshots this split when the quote is created, and the reservation copies that snapshot when a hold is created.

## Initial Taxes

The seed includes:

- `GT_IVA_ESTIMATED`: active 12 percent estimated tax rule for accommodation, services, and digital platform fee.
- `GT_INGUAT_PREPARED`: inactive placeholder for future INGUAT handling once fiscal base, rate, and responsible party are confirmed.

The current public quote still uses `RatePlan.taxBps` for the guest-facing estimate, while `TaxRule` provides the configurable data foundation for the ERP module.

## Reservation Flow

When a public guest requests a quote:

1. Availability and rate plan are checked.
2. Guest-facing charges are calculated.
3. Internal allocations are calculated.
4. A financial snapshot is saved on `StayQuote`.
5. Visible line items are returned to the guest.

When a hold is created:

1. The quote charges are copied to `ReservationCharge`.
2. The quote financial snapshot is copied to `Reservation`.
3. `FinancialAllocation` rows are created for owner, KUQUBA, and taxes.
4. Legal and stay-rule acceptance data remains attached to the reservation.

When dev payment is confirmed:

1. The payment moves to `SUCCEEDED`.
2. The reservation moves to `CONFIRMED`.
3. Ledger entries are created from `FinancialAllocation` when available.
4. Older reservations without allocations still fall back to the previous quote-based ledger entries.

## Next ERP Steps

Recommended next increments:

- Admin screens for charge definitions and tax rules.
- Property/unit overrides for service fees, cleaning, and additional services.
- Additional service catalog with provider/owner/KUQUBA distribution rules.
- Payment gateway integration with processor fee reconciliation.
- Owner settlement generation from allocation and ledger data.
- Fiscal review for IVA, INGUAT, invoice ownership, and withholding rules in Guatemala.