// src/modules/emi/emi.calculator.ts
//
// All monetary arithmetic uses integer paise internally to eliminate
// floating-point drift. Results are converted back to rupees at the
// boundary. This is the same technique used by RBI-regulated payment systems.
//
// Invariants that must hold for every schedule this module produces:
//   1. SUM(principalComponent) === principal  (to the paisa)
//   2. SUM(emiAmount) === totalPayable        (to the paisa)
//   3. outstandingAfter[last] === 0.00
//   4. emiAmount[i] === principalComponent[i] + interestComponent[i]  for all i
//   5. Each emiAmount === monthlyEmi EXCEPT the last (absorbs rounding residual)

import type { AmortizationEntry, AmortizationSchedule } from './emi.types';
import type { Rupees } from '@/types/common.types';
import { addMonths } from '@/types/common.types';

// ─── Paisa helpers ─────────────────────────────────────────────────────────────

/** Convert rupees to integer paisa — eliminates all floating-point issues */
function toPaisa(rupees: Rupees): number {
    // Math.round first to handle 0.4999999999 style drift from upstream calcs
    return Math.round(rupees * 100);
}

/** Convert integer paisa back to rupees with exactly 2 decimal places */
function toRupees(paisa: number): Rupees {
    return Math.round(paisa) / 100;
}

// ─── Monthly rate from annual percentage ──────────────────────────────────────

function monthlyRate(annualRatePct: number): number {
    return annualRatePct / 12 / 100;
}

// ─── EMI formula ───────────────────────────────────────────────────────────────
//
// Reducing balance: PMT = P × r(1+r)^n / ((1+r)^n − 1)
//
// Special cases:
//   r = 0  → equal principal instalments (interest-free loan)
//   n = 1  → single bullet payment of full principal + one period's interest

export function computeMonthlyEmi(
    principal: Rupees,
    annualRatePct: number,
    tenureMonths: number,
): Rupees {
    if (tenureMonths <= 0) throw new Error('Tenure must be > 0');
    if (principal <= 0) throw new Error('Principal must be > 0');
    if (annualRatePct < 0) throw new Error('Interest rate cannot be negative');

    const r = monthlyRate(annualRatePct);

    let emiRupees: number;

    if (r === 0) {
        emiRupees = principal / tenureMonths;
    } else if (tenureMonths === 1) {
        emiRupees = principal * (1 + r);
    } else {
        const power = Math.pow(1 + r, tenureMonths);
        emiRupees = (principal * r * power) / (power - 1);
    }

    // Ceiling to nearest paisa — customer never underpays by rounding
    // The last EMI absorbs any accumulated rounding surplus
    return Math.ceil(emiRupees * 100) / 100;
}

// ─── Full amortization schedule ────────────────────────────────────────────────

export function buildAmortizationSchedule(params: {
    loanAccountId: string;
    principal: Rupees;
    annualRatePct: number;
    tenureMonths: number;
    disbursementDate: Date;
    firstEmiDate?: Date;   // Defaults to disbursementDate + 1 month
}): AmortizationSchedule {
    const {
        loanAccountId,
        principal,
        annualRatePct,
        tenureMonths,
        disbursementDate,
    } = params;

    const emi = computeMonthlyEmi(principal, annualRatePct, tenureMonths);
    const firstEmiDate = params.firstEmiDate ?? addMonths(disbursementDate, 1);
    const r = monthlyRate(annualRatePct);

    // Work in integer paisa throughout
    let outstandingPaisa = toPaisa(principal);
    const emiPaisa = toPaisa(emi);

    const entries: AmortizationEntry[] = [];
    let totalPrincipalPaisa = 0;
    let totalInterestPaisa = 0;

    for (let i = 1; i <= tenureMonths; i++) {
        // Interest on outstanding principal at start of this period
        // Using Math.round here (not ceil) — interest is exact, not rounded up
        const interestPaisa = Math.round(outstandingPaisa * r);
        let principalPaisa = emiPaisa - interestPaisa;
        let thisEmiPaisa = emiPaisa;

        if (i === tenureMonths) {
            // Last EMI: pay exactly the outstanding balance
            // This absorbs all accumulated rounding residual
            principalPaisa = outstandingPaisa;
            thisEmiPaisa = principalPaisa + interestPaisa;
        }

        // Prevent negative outstanding from floating-point accumulation
        const newOutstandingPaisa = Math.max(0, outstandingPaisa - principalPaisa);

        const dueDate = addMonths(firstEmiDate, i - 1);

        entries.push({
            emiNumber: i,
            dueDate,
            emiAmount: toRupees(thisEmiPaisa),
            principalComponent: toRupees(principalPaisa),
            interestComponent: toRupees(interestPaisa),
            outstandingAfter: toRupees(newOutstandingPaisa),
        });

        totalPrincipalPaisa += principalPaisa;
        totalInterestPaisa += interestPaisa;
        outstandingPaisa = newOutstandingPaisa;
    }

    // ── Invariant assertions ─────────────────────────────────────────────────────
    // These should never fail. If they do, there's a bug in the calculator.
    // Keeping them in production catches regressions immediately.
    const principalPaisa = toPaisa(principal);
    if (totalPrincipalPaisa !== principalPaisa) {
        throw new Error(
            `Amortization invariant violated: ` +
            `sum(principal) ${toRupees(totalPrincipalPaisa)} ≠ ` +
            `loan principal ${principal}. ` +
            `Diff: ${toRupees(Math.abs(totalPrincipalPaisa - principalPaisa))} paisa`,
        );
    }

    const totalPayable = toRupees(
        entries.reduce((sum, e) => sum + toPaisa(e.emiAmount), 0),
    );

    return {
        loanAccountId,
        principal,
        annualRatePct,
        tenureMonths,
        disbursementDate,
        firstEmiDate,
        monthlyEmi: emi,
        totalPayable,
        totalInterest: toRupees(totalInterestPaisa),
        totalPrincipal: toRupees(totalPrincipalPaisa),
        entries,
    };
}

// ─── Overdue penalty calculation ──────────────────────────────────────────────
//
// RBI-compliant penal interest on overdue principal.
// Applied per day, not per month — daily accrual prevents cliff-edge incentives.

export function computeDailyOverduePenalty(
    overdueAmount: Rupees,
    annualPenaltyRatePct: number,
): Rupees {
    const dailyRate = annualPenaltyRatePct / 365 / 100;
    return Math.ceil(overdueAmount * dailyRate * 100) / 100;
}

// ─── Tiered overdue penalty (gold loans) ───────────────────────────────────────
//
// Per client's CAM sheet: penal rate escalates by days-overdue bracket,
// rather than one flat annual rate for the whole overdue period.

export function computeTieredOverduePenalty(
    overdueAmount: Rupees,
    daysOverdue: number,
    slabs: { maxDays: number; annualRatePct: number }[],
): Rupees {
    const slab = slabs.find(s => daysOverdue <= s.maxDays) ?? slabs[slabs.length - 1]!;
    return computeDailyOverduePenalty(overdueAmount, slab.annualRatePct);
}



// ─── Bounce penalty ────────────────────────────────────────────────────────────

export function computeBouncePenalty(
    emiAmount: Rupees,
    bounceRatePct: number,   // Typically 2%
): Rupees {
    return Math.ceil(emiAmount * (bounceRatePct / 100) * 100) / 100;
}

// ─── Foreclosure calculation ───────────────────────────────────────────────────
//
// Calculates the lump-sum amount needed to close the loan early on a given date.
// Includes:
//   1. Outstanding principal as of the settlement date
//   2. Accrued interest from last EMI date to settlement date (pro-rata)
//   3. Foreclosure fee (if applicable)
//   4. Any accumulated penalties

export function computeForeclosureAmount(params: {
    outstandingPrincipal: Rupees;
    annualRatePct: number;
    lastEmiDate: Date;       // Date of last paid EMI
    settlementDate: Date;
    foreclosureFeePct: number;     // e.g. 2% foreclosure fee
    accumulatedPenalty: Rupees;
    // Minimum interest rule ("10 days interest or ₹500, whichever is
    // higher") is a Gold-Loan-specific rule per this function's own
    // original comment — but it was being applied unconditionally to
    // EVERY caller, including CDL (via the shared getForeclosureQuote),
    // where the client's spec states foreclosure is simply "5% of
    // principal outstanding + GST", nothing about a minimum-interest
    // floor. For a small CDL loan foreclosed early, a flat ₹500 floor
    // could be a disproportionate share of the real payoff. No default —
    // every caller must say explicitly which product's rules apply,
    // rather than silently inheriting gold loan's floor.
    applyMinimumInterestFloor: boolean;
}): {
    outstandingPrincipal: Rupees;
    accruedInterest: Rupees;
    foreclosureFee: Rupees;
    foreclosureFeeGst: Rupees;
    penalty: Rupees;
    total: Rupees;
} {
    const {
        outstandingPrincipal,
        annualRatePct,
        lastEmiDate,
        settlementDate,
        foreclosureFeePct,
        accumulatedPenalty,
        applyMinimumInterestFloor,
    } = params;

    // Pro-rata daily interest from last EMI to settlement date
    const daysSinceLastEmi = Math.max(
        0,
        Math.floor(
            (settlementDate.getTime() - lastEmiDate.getTime()) / (1000 * 60 * 60 * 24),
        ),
    );

    const dailyRate = annualRatePct / 365 / 100;
    const rawAccruedInterest = toRupees(
        Math.ceil(toPaisa(outstandingPrincipal) * dailyRate * daysSinceLastEmi),
    );

    // Minimum interest rule for Gold Loans — 10 days interest or ₹500,
    // whichever is higher. Only applied when the caller says so.
    let accruedInterest = rawAccruedInterest;
    if (applyMinimumInterestFloor) {
        const tenDaysInterest = toRupees(
            Math.ceil(toPaisa(outstandingPrincipal) * dailyRate * 10),
        );
        const minimumInterest = Math.max(tenDaysInterest, 500);
        accruedInterest = Math.max(rawAccruedInterest, minimumInterest);
    }

    const foreclosureFee = toRupees(
        Math.ceil(toPaisa(outstandingPrincipal) * (foreclosureFeePct / 100)),
    );

    // GST at 18% on foreclosure fee (per client requirements)
    const foreclosureFeeGst = toRupees(
        Math.ceil(toPaisa(foreclosureFee) * 0.18),
    );

    const total = toRupees(
        toPaisa(outstandingPrincipal) +
        toPaisa(accruedInterest) +
        toPaisa(foreclosureFee) +
        toPaisa(foreclosureFeeGst) +
        toPaisa(accumulatedPenalty),
    );

    return {
        outstandingPrincipal,
        accruedInterest,
        foreclosureFee,
        foreclosureFeeGst,
        penalty: accumulatedPenalty,
        total,
    };
}

// ─── Annual Percentage Rate (APR) ──────────────────────────────────────────────
//
// RBI Digital Lending Guidelines require the Key Fact Statement (KFS) to
// disclose the "all-in cost" APR — the effective annual rate once processing
// fee and other upfront charges are netted against the disbursed amount.
// This is always ≥ the nominal interest rate shown to the customer.
//
// Solved via Newton-Raphson on the reducing-balance PMT equation, using the
// *net* disbursed amount (principal − upfront charges) against the EMI that
// was actually computed on the *gross* principal.

export function computeApr(params: {
    principal: Rupees;
    monthlyEmi: Rupees;
    tenureMonths: number;
    upfrontCharges: Rupees;   // processing fee + GST + any other charges deducted at disbursal
}): number {
    const { principal, monthlyEmi, tenureMonths, upfrontCharges } = params;
    const netDisbursed = principal - upfrontCharges;

    if (netDisbursed <= 0) {
        throw new Error('Net disbursed amount must be > 0 after upfront charges');
    }

    let r = 0.01; // initial guess: 1% monthly
    for (let i = 0; i < 100; i++) {
        const power = Math.pow(1 + r, tenureMonths);
        const f = (netDisbursed * r * power) / (power - 1) - monthlyEmi;
        const df = netDisbursed * (
            (power * (1 + r * tenureMonths) - power) / Math.pow(power - 1, 2)
        );
        if (df === 0) break;
        const rNew = r - f / df;
        if (Math.abs(rNew - r) < 1e-10) { r = rNew; break; }
        r = rNew;
    }

    return Math.round(r * 12 * 100 * 100) / 100; // annualized %, 2 decimal places
}

// ─── Cooling-off / Look-up Period ──────────────────────────────────────────────
//
// RBI Digital Lending Guidelines, 2022: borrower may exit the loan within the
// cooling-off period by paying principal + proportionate interest, WITHOUT any
// penalty or foreclosure fee. This is stricter than a normal foreclosure — no
// foreclosure fee, no GST on fee, no penalty charges, no minimum-interest floor.
//
// ⚠️ ASSUMPTION (no client policy confirmed yet): window is measured from
// disbursement date. Revisit if client specifies a different start point
// (e.g. eSign date) — see COOLING_OFF_PERIOD_DAYS in config/nbfc.constants.ts.

export function isWithinCoolingOffPeriod(
    disbursedAt: Date,
    asOfDate: Date,
    coolingOffPeriodDays: number,
): boolean {
    const daysSinceDisbursement = Math.floor(
        (asOfDate.getTime() - disbursedAt.getTime()) / (1000 * 60 * 60 * 24),
    );
    return daysSinceDisbursement >= 0 && daysSinceDisbursement <= coolingOffPeriodDays;
}

export function computeCoolingOffPayoff(params: {
    outstandingPrincipal: Rupees;
    annualRatePct: number;
    disbursedAt: Date;
    exitDate: Date;
}): {
    outstandingPrincipal: Rupees;
    accruedInterest: Rupees;
    total: Rupees;
} {
    const { outstandingPrincipal, annualRatePct, disbursedAt, exitDate } = params;

    const daysElapsed = Math.max(
        0,
        Math.floor((exitDate.getTime() - disbursedAt.getTime()) / (1000 * 60 * 60 * 24)),
    );

    const dailyRate = annualRatePct / 365 / 100;
    const accruedInterest = toRupees(
        Math.ceil(toPaisa(outstandingPrincipal) * dailyRate * daysElapsed),
    );

    const total = toRupees(toPaisa(outstandingPrincipal) + toPaisa(accruedInterest));

    return { outstandingPrincipal, accruedInterest, total };
}

// ─── Partial payment allocation ────────────────────────────────────────────────
//
// When a customer pays a partial amount (less than full EMI),
// allocate in order: penalty → interest → principal
// This is the RBI-standard allocation sequence.

export function allocatePartialPayment(params: {
    paymentAmount: Rupees;
    penaltyDue: Rupees;
    interestDue: Rupees;
    principalDue: Rupees;
}): {
    penaltySettled: Rupees;
    interestSettled: Rupees;
    principalSettled: Rupees;
    shortfall: Rupees;
    fullySettled: boolean;
} {
    let remainingPaisa = toPaisa(params.paymentAmount);

    // 1. Settle penalty first
    const penaltyPaisa = toPaisa(params.penaltyDue);
    const penaltySettled = Math.min(remainingPaisa, penaltyPaisa);
    remainingPaisa -= penaltySettled;

    // 2. Settle interest
    const interestPaisa = toPaisa(params.interestDue);
    const interestSettled = Math.min(remainingPaisa, interestPaisa);
    remainingPaisa -= interestSettled;

    // 3. Settle principal
    const principalPaisa = toPaisa(params.principalDue);
    const principalSettled = Math.min(remainingPaisa, principalPaisa);
    remainingPaisa -= principalSettled;

    const totalDuePaisa = penaltyPaisa + interestPaisa + principalPaisa;
    const shortfallPaisa = Math.max(
        0,
        totalDuePaisa - toPaisa(params.paymentAmount),
    );

    return {
        penaltySettled: toRupees(penaltySettled),
        interestSettled: toRupees(interestSettled),
        principalSettled: toRupees(principalSettled),
        shortfall: toRupees(shortfallPaisa),
        fullySettled: shortfallPaisa === 0,
    };
}

// ─── Exports for testing ───────────────────────────────────────────────────────
// These internal helpers are exported for unit test access.
// They are not part of the public API surface.

export const _internal = {
    toPaisa,
    toRupees,
    monthlyRate,
} as const;
