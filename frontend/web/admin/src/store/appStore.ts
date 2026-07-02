import { create } from 'zustand';
import dayjs from 'dayjs';
import { MOCK } from '../data/mock';
import { calcEmi } from '../utils/format';
import type {
  AppNotification, AuditLog, EmiRow, LoanAccount, LoanApplication, PortalUser,
  Repayment, LoanCharge, RiskGrade, Role,
  Branch, Agent, ProductConfig, GoldCollateral, PropertyDetails,
} from '../types';

export type GoldAppraisalInput = Omit<GoldCollateral, 'valuedBy' | 'appraisedAt'>;
export type PropertyAppraisalInput = Omit<PropertyDetails, 'valuedBy' | 'appraisedAt'>;

let seq = 9000;
const uid = (p: string): string => `${p}-${++seq}`;

export interface CreditDecisionInput {
  decision: 'APPROVED' | 'REJECTED' | 'RETURNED';
  riskGrade: RiskGrade;
  remarks: string;
  reason?: string;
  approvedAmount?: number;
  approvedTenure?: number;
  approvedRate?: number;
}

interface Actor {
  name: string;
  role: Role | string;
}

interface AppState {
  applications: LoanApplication[];
  loans: LoanAccount[];
  users: PortalUser[];
  auditLogs: AuditLog[];
  notifications: AppNotification[];
  repayments: Repayment[];
  charges: LoanCharge[];
  branches: Branch[];
  agents: Agent[];
  productConfigs: ProductConfig[];

  // application workflow
  pickForReview: (appId: string, actor: Actor) => void;
  creditDecision: (appId: string, input: CreditDecisionInput, actor: Actor) => void;
  financeVerify: (appId: string, actor: Actor) => void;
  setupEmandate: (appId: string, mode: 'Net Banking' | 'Debit Card' | 'Aadhaar', actor: Actor) => void;
  refreshEmandate: (appId: string, actor: Actor) => void;
  disburse: (appId: string, mode: 'NEFT' | 'RTGS' | 'IMPS', actor: Actor) => string | undefined;

  // collections
  logCollectionNote: (loanNumber: string, note: string, ptpDate: string | undefined, actor: Actor) => void;
  recordPayment: (loanNumber: string, amount: number, mode: Repayment['mode'], actor: Actor) => void;

  // collateral appraisal (ops)
  saveGoldAppraisal: (appId: string, data: GoldAppraisalInput, actor: Actor) => void;
  savePropertyAppraisal: (appId: string, data: PropertyAppraisalInput, actor: Actor) => void;

  // users
  addUser: (user: Omit<PortalUser, 'id' | 'createdAt'>, actor: Actor) => void;
  updateUser: (id: string, patch: Partial<PortalUser>, actor: Actor) => void;
  toggleUserStatus: (id: string, actor: Actor) => void;

  // branches
  addBranch: (branch: Omit<Branch, 'id'>, actor: Actor) => void;
  updateBranch: (id: string, patch: Partial<Branch>, actor: Actor) => void;
  toggleBranchStatus: (id: string, actor: Actor) => void;

  // agents
  addAgent: (agent: Omit<Agent, 'id'>, actor: Actor) => void;
  updateAgent: (id: string, patch: Partial<Agent>, actor: Actor) => void;
  toggleAgentStatus: (id: string, actor: Actor) => void;

  // product configuration
  updateProductConfig: (key: ProductConfig['key'], patch: Partial<ProductConfig>, actor: Actor) => void;

  // notifications
  markAllRead: () => void;

  logAudit: (entry: Omit<AuditLog, 'id' | 'at' | 'ip'>) => void;
}

const nowIso = (): string => new Date().toISOString();
const IP = '10.24.8.112';

export const useAppStore = create<AppState>((set, get) => {
  const audit = (entry: Omit<AuditLog, 'id' | 'at' | 'ip'>): void => {
    set((s) => ({
      auditLogs: [{ ...entry, id: uid('AUD'), at: nowIso(), ip: IP }, ...s.auditLogs],
    }));
  };

  const patchApp = (appId: string, fn: (app: LoanApplication) => LoanApplication): void => {
    set((s) => ({
      applications: s.applications.map((a) => (a.id === appId ? fn({ ...a }) : a)),
    }));
  };

  const pushTimeline = (
    app: LoanApplication, stage: string, title: string, actor: Actor, remarks?: string, description?: string,
  ): LoanApplication => ({
    ...app,
    updatedAt: nowIso(),
    timeline: [
      ...app.timeline,
      { id: uid('TL'), stage, title, actor: actor.name, role: String(actor.role), at: nowIso(), remarks, description },
    ],
  });

  return {
    applications: MOCK.applications,
    loans: MOCK.loans,
    users: MOCK.portalUsers,
    auditLogs: MOCK.auditLogs,
    notifications: MOCK.notifications,
    repayments: MOCK.repayments,
    charges: MOCK.charges,
    branches: MOCK.branches,
    agents: MOCK.agents,
    productConfigs: MOCK.productConfigs,

    pickForReview: (appId, actor) => {
      patchApp(appId, (app) => {
        const next = pushTimeline(app, 'CREDIT_PICKED', 'Picked for Credit Review', actor, undefined, 'Application assigned to credit queue');
        next.status = 'CREDIT_PENDING';
        return next;
      });
      const app = get().applications.find((a) => a.id === appId);
      audit({ user: actor.name, role: String(actor.role), module: 'Credit', action: 'Picked for Review', entity: app?.appNumber ?? appId, oldValue: 'SUBMITTED', newValue: 'CREDIT_PENDING' });
    },

    creditDecision: (appId, input, actor) => {
      patchApp(appId, (app) => {
        const decision = input.decision;
        const status = decision === 'APPROVED' ? 'CREDIT_APPROVED' : decision === 'REJECTED' ? 'CREDIT_REJECTED' : 'CREDIT_RETURNED';
        let next = { ...app, status } as LoanApplication;
        next.creditDecision = {
          decidedBy: actor.name,
          decidedAt: nowIso(),
          riskGrade: input.riskGrade,
          decision,
          approvedAmount: input.approvedAmount,
          approvedTenure: input.approvedTenure,
          approvedRate: input.approvedRate,
          reason: input.reason,
          remarks: input.remarks,
        };
        next = pushTimeline(
          next, 'CREDIT_DECISION',
          `Credit ${decision.charAt(0)}${decision.slice(1).toLowerCase()}`,
          actor, input.remarks,
          decision === 'APPROVED'
            ? `Approved ₹${(input.approvedAmount ?? app.loan.amount).toLocaleString('en-IN')} @ ${input.approvedRate ?? app.loan.interestRate}% for ${input.approvedTenure ?? app.loan.tenureMonths} months · Risk Grade ${input.riskGrade}`
            : input.reason,
        );
        return next;
      });
      const app = get().applications.find((a) => a.id === appId);
      audit({ user: actor.name, role: String(actor.role), module: 'Credit', action: `Credit ${input.decision}`, entity: app?.appNumber ?? appId, oldValue: 'CREDIT_PENDING', newValue: input.decision });
    },

    financeVerify: (appId, actor) => {
      patchApp(appId, (app) => {
        const approved = app.creditDecision?.approvedAmount ?? app.loan.amount;
        const lt = app.loanType;
        const processingFee = Math.round((approved * (lt === 'HOUSING' ? 0.01 : lt === 'GOLD' ? 0.005 : 0.025)) / 100) * 100;
        const gst = Math.round(processingFee * 0.18);
        const insurance = lt === 'CDL' ? Math.round(approved * 0.012) : lt === 'HOUSING' ? Math.round(approved * 0.004) : 0;
        const stampDuty = lt === 'HOUSING' ? 600 : 100;
        const documentation = lt === 'HOUSING' ? 1500 : 250;
        let next: LoanApplication = {
          ...app,
          status: 'FINANCE_PENDING',
          finance: app.finance ?? {
            fees: { processingFee, gst, insurance, stampDuty, documentation },
            netDisbursement: approved - processingFee - gst - insurance - stampDuty - documentation,
            bank: {
              accountName: app.customer.name,
              accountNumber: String(Math.floor(10000000000 + Math.random() * 89999999999)),
              ifsc: 'HDFC0004321',
              bankName: 'HDFC Bank',
              branch: app.customer.currentAddress.city,
              pennyDropStatus: 'SUCCESS',
            },
            emandate: { status: 'NOT_SETUP' },
          },
        };
        next.finance = { ...next.finance!, verifiedBy: actor.name, verifiedAt: nowIso() };
        next = pushTimeline(next, 'FINANCE_VERIFIED', 'Finance Verification Completed', actor, undefined, 'Approved amount, fees and beneficiary bank account verified (penny-drop success)');
        return next;
      });
      const app = get().applications.find((a) => a.id === appId);
      audit({ user: actor.name, role: String(actor.role), module: 'Finance', action: 'Finance Verification', entity: app?.appNumber ?? appId, oldValue: 'CREDIT_APPROVED', newValue: 'FINANCE_PENDING' });
    },

    setupEmandate: (appId, mode, actor) => {
      patchApp(appId, (app) => {
        if (!app.finance) return app;
        let next: LoanApplication = {
          ...app,
          status: 'EMANDATE_PENDING',
          finance: {
            ...app.finance,
            emandate: {
              status: 'PENDING',
              bank: app.finance.bank.bankName,
              maxAmount: Math.ceil((app.loan.emi * 1.05) / 100) * 100,
              frequency: 'Monthly',
              mode,
            },
          },
        };
        next = pushTimeline(next, 'EMANDATE', 'E-Mandate Registration Initiated', actor, undefined, `NACH mandate sent to customer via ${mode} authentication`);
        return next;
      });
      const app = get().applications.find((a) => a.id === appId);
      audit({ user: actor.name, role: String(actor.role), module: 'Finance', action: 'E-Mandate Initiated', entity: app?.appNumber ?? appId, oldValue: 'FINANCE_PENDING', newValue: 'EMANDATE_PENDING' });
    },

    refreshEmandate: (appId, actor) => {
      patchApp(appId, (app) => {
        if (!app.finance || app.finance.emandate.status !== 'PENDING') return app;
        const umrn = `NACH${Math.floor(10000000 + Math.random() * 89999999)}UMRN`;
        let next: LoanApplication = {
          ...app,
          finance: {
            ...app.finance,
            emandate: { ...app.finance.emandate, status: 'ACTIVE', umrn, registeredAt: nowIso() },
          },
        };
        next = pushTimeline(next, 'EMANDATE', 'E-Mandate Registered (NPCI)', actor, undefined, `Customer authenticated successfully · UMRN ${umrn}`);
        return next;
      });
      const app = get().applications.find((a) => a.id === appId);
      audit({ user: actor.name, role: String(actor.role), module: 'Finance', action: 'E-Mandate Activated', entity: app?.appNumber ?? appId, oldValue: 'PENDING', newValue: 'ACTIVE' });
    },

    disburse: (appId, mode, actor) => {
      const state = get();
      const app = state.applications.find((a) => a.id === appId);
      if (!app || !app.finance || app.finance.emandate.status !== 'ACTIVE') return undefined;

      const principal = app.creditDecision?.approvedAmount ?? app.loan.amount;
      const rate = app.creditDecision?.approvedRate ?? app.loan.interestRate;
      const tenure = app.creditDecision?.approvedTenure ?? app.loan.tenureMonths;
      const emi = calcEmi(principal, rate, tenure);
      const loanNumber = `FNLN-${app.loanType}-${String(86000 + state.loans.length).padStart(5, '0')}`;
      const utr = `${mode}R5${Math.floor(2026000000 + Math.random() * 999999)}`;

      // amortization
      let due = dayjs().add(1, 'month').date(5);
      if (due.diff(dayjs(), 'day') < 18) due = due.add(1, 'month');
      const r = rate / 12 / 100;
      let balance = principal;
      const schedule: EmiRow[] = [];
      for (let s = 1; s <= tenure; s++) {
        const interest = Math.round(balance * r);
        const prin = s === tenure ? balance : Math.min(balance, emi - interest);
        balance = Math.max(0, balance - prin);
        schedule.push({
          seq: s,
          dueDate: due.add(s - 1, 'month').format('YYYY-MM-DD'),
          principal: prin,
          interest,
          emi: s === tenure ? prin + interest : emi,
          balance,
          status: 'UPCOMING',
        });
      }

      const newLoan: LoanAccount = {
        loanNumber,
        applicationId: app.id,
        appNumber: app.appNumber,
        customerName: app.customer.name,
        mobile: app.customer.mobile,
        loanType: app.loanType,
        principal,
        interestRate: rate,
        tenureMonths: tenure,
        emi,
        disbursedOn: nowIso(),
        firstEmiDate: schedule[0]!.dueDate,
        nextDueDate: schedule[0]!.dueDate,
        paidCount: 0,
        outstandingPrincipal: principal,
        overdueAmount: 0,
        dpd: 0,
        status: 'ACTIVE',
        collectionStatus: 'NORMAL',
        collectionNotes: [],
        branch: app.branch,
        schedule,
      };

      patchApp(appId, (a) => {
        let next: LoanApplication = {
          ...a,
          status: 'DISBURSED',
          loanNumber,
          finance: {
            ...a.finance!,
            disbursement: { utr, mode, date: nowIso(), amount: a.finance!.netDisbursement, processedBy: actor.name },
          },
        };
        next = pushTimeline(next, 'DISBURSED', 'Loan Disbursed', actor, undefined, `Net ₹${a.finance!.netDisbursement.toLocaleString('en-IN')} credited via ${mode} · UTR ${utr} · Loan A/c ${loanNumber}`);
        return next;
      });
      set((s) => ({ loans: [newLoan, ...s.loans] }));
      audit({ user: actor.name, role: String(actor.role), module: 'Finance', action: 'Loan Disbursed', entity: app.appNumber, oldValue: 'EMANDATE_PENDING', newValue: 'DISBURSED' });
      return loanNumber;
    },

    logCollectionNote: (loanNumber, note, ptpDate, actor) => {
      set((s) => ({
        loans: s.loans.map((l) =>
          l.loanNumber === loanNumber
            ? {
                ...l,
                collectionStatus: ptpDate ? 'PTP' : l.collectionStatus === 'NORMAL' ? 'FOLLOW_UP' : l.collectionStatus,
                collectionNotes: [{ at: nowIso(), by: actor.name, note, ptpDate }, ...l.collectionNotes],
              }
            : l,
        ),
      }));
      audit({ user: actor.name, role: String(actor.role), module: 'Collections', action: ptpDate ? 'PTP Recorded' : 'Follow-up Logged', entity: loanNumber, newValue: note });
    },

    recordPayment: (loanNumber, amount, mode, actor) => {
      const target = get().loans.find((l) => l.loanNumber === loanNumber);
      if (target) {
        set((s) => ({
          repayments: [
            {
              id: uid('RPT'),
              loanNumber,
              customerName: target.customerName,
              loanType: target.loanType,
              date: nowIso(),
              amount,
              mode,
              reference: `${mode === 'E-MANDATE' ? 'NACH' : 'TXN'}${Math.floor(100000000 + Math.random() * 899999999)}`,
              status: 'SUCCESS',
              type: target.status === 'NPA' ? 'RECOVERY' : 'EMI',
            },
            ...s.repayments,
          ],
        }));
      }
      set((s) => ({
        loans: s.loans.map((l) => {
          if (l.loanNumber !== loanNumber) return l;
          const schedule = l.schedule.map((row) => ({ ...row }));
          let remaining = amount;
          let paidCount = l.paidCount;
          for (const row of schedule) {
            if (row.status === 'OVERDUE' || row.status === 'DUE') {
              if (remaining >= row.emi) {
                remaining -= row.emi;
                row.status = 'PAID';
                row.paidOn = dayjs().format('YYYY-MM-DD');
                row.paidAmount = row.emi;
                paidCount += 1;
              } else break;
            }
          }
          const firstUnpaid = schedule.find((row) => row.status !== 'PAID');
          const overdueAmount = schedule.filter((row) => row.status === 'OVERDUE').reduce((sum, row) => sum + row.emi, 0);
          const dpd = firstUnpaid && firstUnpaid.status === 'OVERDUE' ? dayjs().diff(dayjs(firstUnpaid.dueDate), 'day') : 0;
          const closed = schedule.every((row) => row.status === 'PAID');
          return {
            ...l,
            schedule,
            paidCount,
            overdueAmount,
            dpd,
            status: closed ? 'CLOSED' : dpd > 90 ? 'NPA' : dpd > 0 ? 'OVERDUE' : 'ACTIVE',
            collectionStatus: dpd > 0 ? l.collectionStatus : 'NORMAL',
            outstandingPrincipal: paidCount === 0 ? l.principal : schedule[Math.max(0, paidCount - 1)]?.balance ?? l.outstandingPrincipal,
            nextDueDate: firstUnpaid?.dueDate,
            lastPaymentDate: nowIso(),
            lastPaymentAmount: amount,
          };
        }),
      }));
      const isNpa = get().loans.find((l) => l.loanNumber === loanNumber)?.status === 'NPA';
      audit({ user: actor.name, role: String(actor.role), module: 'Collections', action: isNpa ? 'Recovery Payment' : 'Payment Recorded', entity: loanNumber, newValue: `₹${amount.toLocaleString('en-IN')} via ${mode}` });
    },

    saveGoldAppraisal: (appId, data, actor) => {
      patchApp(appId, (app) => {
        const gold: GoldCollateral = { ...data, valuedBy: actor.name, appraisedAt: nowIso() };
        let next: LoanApplication = {
          ...app,
          collateral: { ...app.collateral, gold },
        };
        next = pushTimeline(next, 'APPRAISAL', 'Gold Appraisal Recorded', actor, undefined,
          `${data.netWeightGrams}g net @ ${data.purityKarat}K · valuation ₹${data.valuation.toLocaleString('en-IN')} · LTV ${data.ltv}%`);
        return next;
      });
      const app = get().applications.find((a) => a.id === appId);
      audit({ user: actor.name, role: String(actor.role), module: 'Appraisals', action: 'Gold Appraisal', entity: app?.appNumber ?? appId, newValue: `₹${data.valuation.toLocaleString('en-IN')} @ ${data.ltv}% LTV` });
    },

    savePropertyAppraisal: (appId, data, actor) => {
      patchApp(appId, (app) => {
        const property: PropertyDetails = { ...data, valuedBy: actor.name, appraisedAt: nowIso() };
        let next: LoanApplication = {
          ...app,
          collateral: { ...app.collateral, property },
        };
        next = pushTimeline(next, 'APPRAISAL', 'Property Assessment Recorded', actor, undefined,
          `${data.type} · market value ₹${data.marketValue.toLocaleString('en-IN')} · LTV ${data.ltv}%`);
        return next;
      });
      const app = get().applications.find((a) => a.id === appId);
      audit({ user: actor.name, role: String(actor.role), module: 'Appraisals', action: 'Property Assessment', entity: app?.appNumber ?? appId, newValue: `₹${data.marketValue.toLocaleString('en-IN')} @ ${data.ltv}% LTV` });
    },

    addUser: (user, actor) => {
      const id = uid('USR');
      set((s) => ({ users: [...s.users, { ...user, id, createdAt: nowIso() }] }));
      audit({ user: actor.name, role: String(actor.role), module: 'User Management', action: 'User Created', entity: user.email, newValue: `${user.name} · ${user.role}` });
    },

    updateUser: (id, patch, actor) => {
      const before = get().users.find((u) => u.id === id);
      set((s) => ({ users: s.users.map((u) => (u.id === id ? { ...u, ...patch } : u)) }));
      audit({ user: actor.name, role: String(actor.role), module: 'User Management', action: 'User Updated', entity: before?.email ?? id, oldValue: before?.role, newValue: patch.role ?? before?.role });
    },

    toggleUserStatus: (id, actor) => {
      const before = get().users.find((u) => u.id === id);
      const next = before?.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
      set((s) => ({ users: s.users.map((u) => (u.id === id ? { ...u, status: next } : u)) }));
      audit({ user: actor.name, role: String(actor.role), module: 'User Management', action: next === 'ACTIVE' ? 'User Activated' : 'User Deactivated', entity: before?.email ?? id, oldValue: before?.status, newValue: next });
    },

    addBranch: (branch, actor) => {
      const id = uid('BR');
      set((s) => ({ branches: [...s.branches, { ...branch, id }] }));
      audit({ user: actor.name, role: String(actor.role), module: 'Branches', action: 'Branch Created', entity: branch.code, newValue: branch.name });
    },

    updateBranch: (id, patch, actor) => {
      const before = get().branches.find((b) => b.id === id);
      set((s) => ({ branches: s.branches.map((b) => (b.id === id ? { ...b, ...patch } : b)) }));
      audit({ user: actor.name, role: String(actor.role), module: 'Branches', action: 'Branch Updated', entity: before?.code ?? id, newValue: patch.name ?? before?.name });
    },

    toggleBranchStatus: (id, actor) => {
      const before = get().branches.find((b) => b.id === id);
      const next = before?.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
      set((s) => ({ branches: s.branches.map((b) => (b.id === id ? { ...b, status: next } : b)) }));
      audit({ user: actor.name, role: String(actor.role), module: 'Branches', action: next === 'ACTIVE' ? 'Branch Activated' : 'Branch Deactivated', entity: before?.code ?? id, oldValue: before?.status, newValue: next });
    },

    addAgent: (agent, actor) => {
      const id = uid('AGT');
      set((s) => ({ agents: [...s.agents, { ...agent, id }] }));
      audit({ user: actor.name, role: String(actor.role), module: 'Agents', action: 'Agent Onboarded', entity: agent.code, newValue: `${agent.name} · ${agent.territory}` });
    },

    updateAgent: (id, patch, actor) => {
      const before = get().agents.find((a) => a.id === id);
      set((s) => ({ agents: s.agents.map((a) => (a.id === id ? { ...a, ...patch } : a)) }));
      audit({ user: actor.name, role: String(actor.role), module: 'Agents', action: 'Agent Updated', entity: before?.code ?? id, newValue: patch.territory ?? before?.territory });
    },

    toggleAgentStatus: (id, actor) => {
      const before = get().agents.find((a) => a.id === id);
      const next = before?.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
      set((s) => ({ agents: s.agents.map((a) => (a.id === id ? { ...a, status: next } : a)) }));
      audit({ user: actor.name, role: String(actor.role), module: 'Agents', action: next === 'ACTIVE' ? 'Agent Activated' : 'Agent Deactivated', entity: before?.code ?? id, oldValue: before?.status, newValue: next });
    },

    updateProductConfig: (key, patch, actor) => {
      set((s) => ({ productConfigs: s.productConfigs.map((p) => (p.key === key ? { ...p, ...patch } : p)) }));
      audit({ user: actor.name, role: String(actor.role), module: 'Settings', action: `Updated ${key} Product Config`, entity: 'Product Config', newValue: Object.keys(patch).join(', ') });
    },

    markAllRead: () => set((s) => ({ notifications: s.notifications.map((n) => ({ ...n, read: true })) })),

    logAudit: audit,
  };
});
