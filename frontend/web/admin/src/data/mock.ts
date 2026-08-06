import dayjs from 'dayjs';
import type {
  Address, AppDocument, AppNotification, AppStatus, AuditLog, BureauAccount,
  BureauReport, CustomerProfile, EmiRow, KycInfo, LoanAccount, LoanApplication, LoanType,
  PortalUser, Repayment, LoanCharge, TimelineEvent, RiskGrade, CollectionStatus,
  Branch, Agent, ProductConfig, LoanMandate, MandateStatus, MigrationOrigin,
} from '../types';
import { calcEmi } from '../utils/format';

// ─── Deterministic PRNG so data is stable per day ───────────────────────────
let seed = 20260612;
const rnd = (): number => {
  seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const ri = (min: number, max: number): number => Math.floor(rnd() * (max - min + 1)) + min;
const rf = (min: number, max: number): number => rnd() * (max - min) + min;
const pick = <T,>(arr: T[]): T => arr[Math.floor(rnd() * arr.length)]!;
const chance = (p: number): boolean => rnd() < p;
const round100 = (n: number): number => Math.round(n / 100) * 100;

const NOW = dayjs();
const at = (daysAgo: number, hour = ri(9, 18), minute = ri(0, 59)): string =>
  NOW.subtract(daysAgo, 'day').hour(hour).minute(minute).second(ri(0, 59)).toISOString();

// ─── Pools ──────────────────────────────────────────────────────────────────
const MALE = ['Aarav Sharma', 'Rohan Verma', 'Vikram Singh', 'Siddharth Roy', 'Arjun Nair', 'Karan Mehta', 'Rajesh Kumar', 'Amit Patil', 'Suresh Reddy', 'Manoj Gupta', 'Deepak Joshi', 'Nikhil Bansal', 'Harish Iyer', 'Sanjay Mishra', 'Pradeep Yadav', 'Ashok Chauhan', 'Ravi Shankar', 'Gaurav Saxena', 'Imran Shaikh', 'Joseph Thomas', 'Mohit Aggarwal', 'Ramesh Pillai', 'Vivek Tiwari', 'Anand Kulkarni'];
const FEMALE = ['Priya Patel', 'Ananya Iyer', 'Sneha Kulkarni', 'Kavita Krishnan', 'Neha Bansal', 'Pooja Hegde', 'Divya Menon', 'Ritu Agarwal', 'Sunita Devi', 'Meena Kumari', 'Lakshmi Narayan', 'Swati Deshmukh', 'Farah Khan', 'Anjali Saxena', 'Rekha Sharma', 'Shilpa Rao', 'Nandini Gowda', 'Asha Patil'];
const FATHERS = ['Ramesh', 'Suresh', 'Mahesh', 'Dinesh', 'Rajendra', 'Surendra', 'Mohan', 'Sohan', 'Prakash', 'Omprakash', 'Jagdish', 'Harilal'];
const BRANCHES = ['Mumbai Andheri', 'Delhi Karol Bagh', 'Bengaluru Koramangala', 'Chennai T Nagar', 'Hyderabad Banjara Hills', 'Pune FC Road', 'Jaipur MI Road', 'Lucknow Hazratganj'];
const CITIES: { city: string; state: string }[] = [
  { city: 'Mumbai', state: 'Maharashtra' }, { city: 'Delhi', state: 'Delhi' },
  { city: 'Bengaluru', state: 'Karnataka' }, { city: 'Chennai', state: 'Tamil Nadu' },
  { city: 'Hyderabad', state: 'Telangana' }, { city: 'Pune', state: 'Maharashtra' },
  { city: 'Jaipur', state: 'Rajasthan' }, { city: 'Lucknow', state: 'Uttar Pradesh' },
];
const EMPLOYERS = ['Tata Consultancy Services', 'Reliance Retail Ltd', 'Infosys Ltd', 'HDFC Bank Ltd', 'Larsen & Toubro', 'Wipro Ltd', 'Big Bazaar Franchise', 'Apollo Hospitals', 'Maruti Suzuki Dealer', 'State Electricity Board', 'Self-Owned Kirana Store', 'Textile Trading Firm'];
const DESIGNATIONS = ['Senior Executive', 'Assistant Manager', 'Sales Officer', 'Technician', 'Accountant', 'Supervisor', 'Proprietor', 'Team Lead', 'Operations Executive', 'Store Manager'];
const SALES_AGENTS = [
  { name: 'Rahul Khanna', code: 'FSA-021' }, { name: 'Sneha Jain', code: 'FSA-034' },
  { name: 'Vinod Pawar', code: 'FSA-008' }, { name: 'Akash Dubey', code: 'FSA-052' },
  { name: 'Priyanka Das', code: 'FSA-047' }, { name: 'Mohammed Asif', code: 'FSA-019' },
];
const BANKS = ['HDFC Bank', 'ICICI Bank', 'State Bank of India', 'Axis Bank', 'Kotak Mahindra Bank', 'Bank of Baroda', 'Punjab National Bank'];
const LENDERS = ['HDFC Bank', 'Bajaj Finance', 'ICICI Bank', 'SBI Cards', 'Axis Bank', 'Tata Capital', 'Home Credit', 'IDFC First Bank'];

const PURPOSES: Record<LoanType, string[]> = {
  CDL: ['Smartphone Purchase', 'Laptop Purchase', '55" LED Television', 'Refrigerator', 'Split Air Conditioner', 'Washing Machine', 'Modular Furniture', 'Two-Wheeler Accessories'],
  GOLD: ['Medical Emergency', 'Business Working Capital', 'Education Fees', 'Agricultural Inputs', 'Wedding Expenses', 'Personal Use'],
  HOUSING: ['Flat Purchase', 'Self Construction', 'Home Renovation', 'Plot + Construction', 'Balance Transfer + Top-up'],
};
const SCHEMES: Record<LoanType, string[]> = {
  CDL: ['CDL Swift 0% Down', 'CDL Festive 10/2', 'CDL Standard EMI'],
  GOLD: ['Gold Shakti 12M', 'Gold Max LTV 75', 'Gold Flexi Bullet'],
  HOUSING: ['Griha Aashray Prime', 'Griha Aashray PMAY', 'Griha Aashray Standard'],
};

const CREDIT_OFFICERS: Record<LoanType, string> = { CDL: 'Rohit Malhotra', GOLD: 'Kavita Krishnan', HOUSING: 'Arjun Mehta' };
const FINANCE_OFFICERS: Record<LoanType, string> = { CDL: 'Shruti Desai', GOLD: 'Manoj Pillai', HOUSING: 'Neha Bansal' };

// ─── Builders ───────────────────────────────────────────────────────────────
let idSeq = 1000;
const nextId = (): number => ++idSeq;

const genAddress = (cityIdx: number): Address => {
  const c = CITIES[cityIdx % CITIES.length]!;
  return {
    line1: `${ri(1, 999)}, ${pick(['Shanti Niwas', 'Green Park CHS', 'Sai Residency', 'Laxmi Apartments', 'Gokul Heights', 'Surya Enclave'])}`,
    line2: pick(['Near Bus Depot', 'Opp. City Mall', 'Main Market Road', 'Sector ' + ri(2, 62), 'Station Road']),
    city: c.city,
    state: c.state,
    pincode: String(ri(110001, 695615)),
    residenceType: pick(['Owned', 'Rented', 'Family Owned']),
    yearsAtAddress: ri(1, 18),
  };
};

const genCustomer = (i: number, loanType: LoanType): CustomerProfile => {
  const gender: 'Male' | 'Female' = chance(0.62) ? 'Male' : 'Female';
  const name = gender === 'Male' ? MALE[i % MALE.length]! : FEMALE[i % FEMALE.length]!;
  const age = ri(23, 58);
  const cityIdx = ri(0, CITIES.length - 1);
  const monthlyIncome =
    loanType === 'HOUSING' ? round100(ri(35_000, 150_000)) :
    loanType === 'GOLD' ? round100(ri(15_000, 80_000)) : round100(ri(18_000, 65_000));
  const obligations = round100(monthlyIncome * rf(0.05, 0.35));
  const empType: CustomerProfile['employment']['type'] =
    loanType === 'GOLD' && chance(0.4)
      ? 'Self-Employed'
      : pick<CustomerProfile['employment']['type']>(['Salaried', 'Salaried', 'Salaried', 'Self-Employed', 'Business Owner']);
  return {
    name,
    dob: NOW.subtract(age, 'year').subtract(ri(0, 360), 'day').format('YYYY-MM-DD'),
    age,
    gender,
    maritalStatus: pick(['Married', 'Married', 'Single']),
    fatherOrSpouseName: `${pick(FATHERS)} ${name.split(' ').slice(-1)[0]}`,
    mobile: `9${ri(630000000, 998999999)}`,
    altMobile: chance(0.4) ? `8${ri(630000000, 998999999)}` : undefined,
    email: name.toLowerCase().replace(/[^a-z]+/g, '.') + ri(2, 99) + '@gmail.com',
    dependents: ri(0, 4),
    currentAddress: genAddress(cityIdx),
    permanentAddress: chance(0.6) ? genAddress(cityIdx) : genAddress(cityIdx + 3),
    employment: {
      type: empType,
      employer: empType === 'Salaried' ? pick(EMPLOYERS.slice(0, 10)) : pick(EMPLOYERS.slice(8)),
      designation: pick(DESIGNATIONS),
      yearsInJob: ri(1, 14),
      officialEmail: empType === 'Salaried' && chance(0.6) ? name.split(' ')[0]!.toLowerCase() + '@' + 'work.co.in' : undefined,
    },
    income: { monthlyIncome, otherIncome: chance(0.35) ? round100(ri(2000, 15000)) : 0, existingObligations: obligations, foir: 0 },
  };
};

const genKyc = (verified: boolean): KycInfo => ({
  aadhaarMasked: `XXXX XXXX ${ri(1000, 9999)}`,
  aadhaarVerified: verified || chance(0.7),
  aadhaarVerifiedAt: verified ? at(ri(2, 20)) : undefined,
  panNumber: `${'ABCDEFGHJK'[ri(0, 9)]}${'ABCDEFGHJK'[ri(0, 9)]}${'ABCDEFGHJK'[ri(0, 9)]}P${'ABCDEFGHJK'[ri(0, 9)]}${ri(1000, 9999)}${'ABCDEFGHJKLMNPR'[ri(0, 14)]}`,
  panVerified: verified || chance(0.8),
  panNameMatch: ri(88, 100),
  ckycNumber: chance(0.75) ? String(ri(10000000000000, 99999999999999)) : undefined,
  videoKycStatus: verified ? 'COMPLETED' : pick(['COMPLETED', 'COMPLETED', 'PENDING']),
  livenessScore: ri(82, 99),
});

const genDocuments = (loanType: LoanType, appAge: number, allVerified: boolean): AppDocument[] => {
  const make = (name: string, category: AppDocument['category'], forceVerified?: boolean): AppDocument => {
    const status = allVerified || forceVerified ? 'VERIFIED' : (chance(0.7) ? 'VERIFIED' : chance(0.75) ? 'PENDING' : 'REJECTED');
    return {
      id: `DOC-${nextId()}`,
      name,
      category,
      fileName: name.toLowerCase().replace(/[^a-z0-9]+/g, '_') + pick(['.pdf', '.jpg', '.pdf']),
      sizeKB: ri(120, 4200),
      uploadedAt: at(appAge + ri(0, 1)),
      status,
      remarks: status === 'REJECTED' ? pick(['Image blurred — re-upload required', 'Document expired', 'Name mismatch with application']) : undefined,
    };
  };
  const docs: AppDocument[] = [
    make('Aadhaar Card', 'KYC', allVerified),
    make('PAN Card', 'KYC', allVerified),
    make('Customer Photograph', 'KYC', true),
    make('Bank Statement (6 months)', 'Banking'),
  ];
  if (loanType === 'CDL') docs.push(make('Salary Slip (3 months)', 'Income'), make('Product Proforma Invoice', 'Other'));
  if (loanType === 'GOLD') docs.push(make('Gold Valuation Certificate', 'Collateral', true), make('Gold Items Photograph', 'Collateral', true));
  if (loanType === 'HOUSING') docs.push(make('Salary Slip (3 months)', 'Income'), make('Sale Agreement', 'Collateral'), make('Property Valuation Report', 'Collateral'), make('Title Deed & EC', 'Collateral'), make('Approved Building Plan', 'Collateral'));
  return docs;
};

const genBureau = (scoreBand: [number, number]): BureauReport => {
  const score = ri(scoreBand[0], scoreBand[1]);
  const total = ri(2, 9);
  const active = Math.min(total, ri(1, 5));
  const accounts: BureauAccount[] = Array.from({ length: Math.min(total, 5) }, () => {
    const sanctioned = round100(ri(30_000, 900_000));
    const status = pick(['Active', 'Active', 'Closed', score < 640 && chance(0.4) ? 'Written-Off' : 'Closed']) as BureauAccount['status'];
    return {
      lender: pick(LENDERS),
      type: pick(['Personal Loan', 'Consumer Loan', 'Credit Card', 'Two-Wheeler Loan', 'Gold Loan']),
      sanctioned,
      outstanding: status === 'Active' ? round100(sanctioned * rf(0.1, 0.8)) : 0,
      openedOn: at(ri(200, 2400)),
      status,
    };
  });
  const history: BureauReport['paymentHistory'] = Array.from({ length: 24 }, () =>
    score >= 730 ? (chance(0.97) ? 'ON_TIME' : 'DELAYED')
    : score >= 660 ? (chance(0.88) ? 'ON_TIME' : chance(0.8) ? 'DELAYED' : 'MISSED')
    : chance(0.7) ? 'ON_TIME' : chance(0.55) ? 'DELAYED' : 'MISSED');
  return {
    score,
    reportDate: at(ri(1, 12)),
    enquiries6m: score < 660 ? ri(3, 9) : ri(0, 4),
    totalAccounts: total,
    activeAccounts: active,
    overdueAccounts: score < 640 ? ri(1, 3) : 0,
    oldestAccountYears: ri(1, 12),
    paymentHistory: history,
    accounts,
  };
};

const loanParams = (loanType: LoanType): { amount: number; tenure: number; rate: number } => {
  if (loanType === 'CDL') return { amount: round100(ri(15_000, 240_000)), tenure: pick([6, 9, 12, 18, 24]), rate: rf(14, 21) };
  if (loanType === 'GOLD') return { amount: round100(ri(40_000, 900_000)), tenure: pick([6, 12, 12, 24, 36]), rate: rf(9.5, 14) };
  return { amount: round100(ri(600_000, 3_500_000)), tenure: pick([120, 144, 180, 240]), rate: rf(8.75, 11.5) };
};

const STAGE_FLOW: { stage: string; title: string }[] = [
  { stage: 'SUBMITTED', title: 'Application Submitted' },
  { stage: 'CREDIT_PICKED', title: 'Picked for Credit Review' },
  { stage: 'CREDIT_DECISION', title: 'Credit Decision' },
  { stage: 'FINANCE_VERIFIED', title: 'Finance Verification' },
  { stage: 'EMANDATE', title: 'E-Mandate Registration' },
  { stage: 'DISBURSED', title: 'Loan Disbursed' },
];

interface AppSpec {
  loanType: LoanType;
  status: AppStatus;
  ageDays: number;          // application created N days ago
  decidedToday?: boolean;   // credit decision stamped today
  mandateActive?: boolean;  // for EMANDATE_PENDING
  riskGrade?: RiskGrade;
}

const genApplication = (i: number, spec: AppSpec): LoanApplication => {
  const { loanType, status, ageDays } = spec;
  const customer = genCustomer(i, loanType);
  const { amount, tenure, rate } = loanParams(loanType);
  const emi = calcEmi(amount, rate, tenure);
  customer.income.foir = Math.min(92, Math.round(((customer.income.existingObligations + emi) / (customer.income.monthlyIncome + customer.income.otherIncome)) * 100));

  const isRejected = status === 'CREDIT_REJECTED';
  const pastCredit = ['CREDIT_APPROVED', 'FINANCE_PENDING', 'EMANDATE_PENDING', 'DISBURSED', 'ACTIVE', 'CLOSED'].includes(status);
  const bureau = genBureau(isRejected ? [560, 648] : pastCredit ? [690, 812] : [598, 790]);
  const seqNum = 100 + i;
  const appNumber = `FN-${loanType}-2026-${String(seqNum).padStart(4, '0')}`;
  const createdAt = at(ageDays, ri(9, 13));
  const creditOfficer = CREDIT_OFFICERS[loanType];
  const finOfficer = FINANCE_OFFICERS[loanType];
  const branch = pick(BRANCHES);
  const agent = pick(SALES_AGENTS);

  // timeline
  const timeline: TimelineEvent[] = [{
    id: `TL-${nextId()}`, stage: 'SUBMITTED', title: STAGE_FLOW[0]!.title,
    description: `Application sourced via mobile app by ${agent.name}`,
    actor: agent.name, role: 'Sales', at: createdAt,
  }];
  const pushTl = (stage: string, title: string, actor: string, role: string, when: string, remarks?: string) =>
    timeline.push({ id: `TL-${nextId()}`, stage, title, actor, role, at: when, remarks });

  const statusOrder: AppStatus[] = ['SUBMITTED', 'CREDIT_PENDING', 'CREDIT_APPROVED', 'FINANCE_PENDING', 'EMANDATE_PENDING', 'DISBURSED'];
  const reached = (s: AppStatus): boolean => {
    if (status === 'CREDIT_REJECTED' || status === 'CREDIT_RETURNED') return s === 'SUBMITTED' || s === 'CREDIT_PENDING';
    return statusOrder.indexOf(statusOrder.includes(status) ? status : 'DISBURSED') >= statusOrder.indexOf(s);
  };

  if (reached('CREDIT_PENDING') && status !== 'SUBMITTED')
    pushTl('CREDIT_PICKED', 'Picked for Credit Review', creditOfficer, 'Credit', at(Math.max(0, ageDays - 1), 10));

  let creditDecision: LoanApplication['creditDecision'];
  if (status === 'CREDIT_REJECTED' || status === 'CREDIT_RETURNED' || reached('CREDIT_APPROVED')) {
    const decision = status === 'CREDIT_REJECTED' ? 'REJECTED' : status === 'CREDIT_RETURNED' ? 'RETURNED' : 'APPROVED';
    const decidedAt = spec.decidedToday ? at(0, ri(9, 12)) : at(Math.max(0, ageDays - 2), 15);
    const grade: RiskGrade = spec.riskGrade ?? (decision === 'APPROVED' ? (bureau.score >= 760 ? 'A' : bureau.score >= 710 ? 'B' : 'C') : 'D');
    creditDecision = {
      decidedBy: creditOfficer,
      decidedAt,
      riskGrade: grade,
      decision,
      approvedAmount: decision === 'APPROVED' ? (chance(0.8) ? amount : round100(amount * rf(0.8, 0.95))) : undefined,
      approvedTenure: decision === 'APPROVED' ? tenure : undefined,
      approvedRate: decision === 'APPROVED' ? Number(rate.toFixed(2)) : undefined,
      reason: decision === 'REJECTED' ? pick(['Low bureau score', 'FOIR above policy norms', 'Adverse payment history', 'Unverifiable income']) :
        decision === 'RETURNED' ? pick(['Incomplete documents', 'Income proof required', 'KYC name mismatch — clarification needed']) : undefined,
      remarks: decision === 'APPROVED' ? 'Profile meets credit policy. Income & obligations verified.' :
        decision === 'REJECTED' ? 'Does not meet minimum credit policy norms.' : 'Returned to sales for rectification.',
    };
    pushTl('CREDIT_DECISION', `Credit ${decision.charAt(0) + decision.slice(1).toLowerCase()}`, creditOfficer, 'Credit', decidedAt, creditDecision.reason ?? creditDecision.remarks);
  }

  // finance block
  let finance: LoanApplication['finance'];
  if (reached('FINANCE_PENDING') && creditDecision?.decision === 'APPROVED') {
    const approved = creditDecision.approvedAmount ?? amount;
    const processingFee = round100(approved * (loanType === 'HOUSING' ? 0.01 : loanType === 'GOLD' ? 0.005 : 0.025));
    const gst = Math.round(processingFee * 0.18);
    const insurance = loanType === 'CDL' ? round100(approved * 0.012) : loanType === 'HOUSING' ? round100(approved * 0.004) : 0;
    const stampDuty = loanType === 'HOUSING' ? 600 : 100;
    const documentation = loanType === 'HOUSING' ? 1500 : 250;
    const verifiedAt = at(Math.max(0, ageDays - 3), 11);
    finance = {
      fees: { processingFee, gst, insurance, stampDuty, documentation },
      netDisbursement: approved - processingFee - gst - insurance - stampDuty - documentation,
      bank: {
        accountName: customer.name,
        accountNumber: String(ri(10000000000, 99999999999)),
        ifsc: `${pick(['HDFC', 'ICIC', 'SBIN', 'UTIB', 'KKBK'])}000${ri(1000, 9999)}`,
        bankName: pick(BANKS),
        branch: customer.currentAddress.city,
        pennyDropStatus: 'SUCCESS',
      },
      emandate: { status: 'NOT_SETUP' },
      verifiedBy: finOfficer,
      verifiedAt,
    };
    if (status !== 'FINANCE_PENDING' || chance(0.5))
      pushTl('FINANCE_VERIFIED', 'Finance Verification Completed', finOfficer, 'Finance', verifiedAt, 'Bank account penny-drop successful. Fee structure applied.');
  }

  if (finance && reached('EMANDATE_PENDING')) {
    const active = status !== 'EMANDATE_PENDING' || !!spec.mandateActive;
    const regAt = at(Math.max(0, ageDays - 4), 12);
    finance.emandate = {
      status: active ? 'ACTIVE' : 'PENDING',
      umrn: active ? `NACH${ri(10000000, 99999999)}UMRN` : undefined,
      bank: finance.bank.bankName,
      maxAmount: Math.ceil((emi * 1.05) / 100) * 100,
      frequency: 'Monthly',
      registeredAt: active ? regAt : undefined,
      mode: pick(['Net Banking', 'Debit Card', 'Aadhaar']),
    };
    pushTl('EMANDATE', active ? 'E-Mandate Registered (NPCI)' : 'E-Mandate Registration Initiated', finOfficer, 'Finance', regAt, active ? `UMRN ${finance.emandate.umrn}` : 'Awaiting customer authentication');
  }

  const app: LoanApplication = {
    id: `APP-${seqNum}`,
    appNumber,
    loanType,
    status,
    customer,
    kyc: genKyc(pastCredit),
    documents: genDocuments(loanType, ageDays, pastCredit),
    bureau,
    loan: { amount, tenureMonths: tenure, interestRate: Number(rate.toFixed(2)), purpose: pick(PURPOSES[loanType]), emi, scheme: pick(SCHEMES[loanType]) },
    collateral: loanType === 'GOLD' ? {
      gold: (() => {
        const ltv = rf(0.6, 0.75);
        const valuation = round100(amount / ltv);
        const ratePerGram = 7420;
        const net = Number((valuation / ratePerGram).toFixed(1));
        return {
          netWeightGrams: net,
          grossWeightGrams: Number((net * rf(1.04, 1.12)).toFixed(1)),
          purityKarat: pick([22, 22, 20, 18]) as 18 | 20 | 22,
          ratePerGram,
          valuation,
          ltv: Math.round(ltv * 100),
          items: [
            { description: 'Gold Chain', weightGrams: Number((net * 0.45).toFixed(1)) },
            { description: 'Gold Bangles (2)', weightGrams: Number((net * 0.35).toFixed(1)) },
            { description: 'Gold Ring', weightGrams: Number((net * 0.2).toFixed(1)) },
          ],
          valuedBy: 'Shree Mahalaxmi Appraisers',
        };
      })(),
    } : loanType === 'HOUSING' ? {
      property: {
        type: pick(['Flat', 'Flat', 'Independent House', 'Row House']),
        address: `${genAddress(ri(0, 7)).line1}, ${customer.currentAddress.city}`,
        marketValue: round100(amount / rf(0.55, 0.8)),
        ltv: ri(55, 80),
        builder: chance(0.6) ? pick(['Shubh Developers', 'Akshaya Homes', 'Prestige Affordable', 'Lodha Crown']) : undefined,
        constructionStage: pick(['Ready to Move', 'Under Construction — 70%', 'Completed', 'Under Construction — 40%']),
      },
    } : undefined,
    source: pick(['Mobile App', 'Mobile App', 'Mobile App', 'Branch', 'DSA']),
    createdBy: agent.name,
    createdByCode: agent.code,
    branch,
    createdAt,
    updatedAt: timeline[timeline.length - 1]!.at,
    creditDecision,
    finance,
    timeline,
  };
  return app;
};

// ─── Loan account from a disbursed application ──────────────────────────────
interface LoanSpec {
  profile: 'ACTIVE' | 'DISBURSED_TODAY' | 'DUE_TODAY' | 'OVERDUE' | 'NPA' | 'CLOSED';
  dpd?: number;
  monthsAgo: number; // disbursed N months ago
  paidRatio?: number;
  /** Brought over from the legacy book by the data migration. */
  migrated?: boolean;
  /** Force a mandate state; by default it is derived from the loan's health. */
  mandate?: MandateStatus | 'NONE';
}

// Mandate health follows the loan's payment behaviour: a healthy account has a
// live mandate, a bouncing one has a mandate that is failing, and a closed
// account's mandate is cancelled at closure. Overridable per spec.
const derivedMandateStatus = (
  profile: LoanSpec['profile'],
  dpd: number,
): MandateStatus => {
  if (profile === 'CLOSED') return 'CANCELLED';
  if (profile === 'NPA') return 'FAILED';
  if (profile === 'OVERDUE') return dpd > 30 ? 'FAILED' : 'ACTIVE';
  return 'ACTIVE';
};

let loanSeq = 850;
const allRepayments: Repayment[] = [];
const allCharges: LoanCharge[] = [];

const genLoan = (app: LoanApplication, spec: LoanSpec): LoanAccount => {
  const loanNumber = `FNLN-${app.loanType}-${String(++loanSeq).padStart(5, '0')}`;
  const principal = app.creditDecision?.approvedAmount ?? app.loan.amount;
  const rate = app.creditDecision?.approvedRate ?? app.loan.interestRate;
  const tenure = app.creditDecision?.approvedTenure ?? app.loan.tenureMonths;
  const emi = calcEmi(principal, rate, tenure);

  const disbursedOn = spec.profile === 'DISBURSED_TODAY'
    ? NOW.hour(11).minute(ri(5, 50)).toISOString()
    : at(spec.monthsAgo * 30 + ri(0, 12), 14);
  const disb = dayjs(disbursedOn);

  // stamp disbursement on the application
  app.status = 'DISBURSED';
  app.loanNumber = loanNumber;
  if (app.finance) {
    app.finance.disbursement = {
      utr: `${pick(['HDFC', 'ICIC', 'SBIN'])}R5${ri(2026000000, 2026999999)}`,
      mode: principal >= 200000 ? 'RTGS' : pick(['NEFT', 'IMPS']),
      date: disbursedOn,
      amount: app.finance.netDisbursement,
      processedBy: FINANCE_OFFICERS[app.loanType],
    };
  }
  app.timeline.push({
    id: `TL-${nextId()}`, stage: 'DISBURSED', title: 'Loan Disbursed',
    description: `Net amount credited via ${app.finance?.disbursement?.mode ?? 'NEFT'} · UTR ${app.finance?.disbursement?.utr ?? ''}`,
    actor: FINANCE_OFFICERS[app.loanType], role: 'Finance', at: disbursedOn,
  });
  app.updatedAt = disbursedOn;

  // amortization schedule — EMI on the 5th of each month
  let firstEmi = disb.add(1, 'month').date(5);
  if (firstEmi.diff(disb, 'day') < 18) firstEmi = firstEmi.add(1, 'month');
  const r = rate / 12 / 100;
  let balance = principal;
  const schedule: EmiRow[] = [];
  for (let s = 1; s <= tenure; s++) {
    const interest = Math.round(balance * r);
    const prin = s === tenure ? balance : Math.min(balance, emi - interest);
    balance = Math.max(0, balance - prin);
    schedule.push({
      seq: s,
      dueDate: firstEmi.add(s - 1, 'month').format('YYYY-MM-DD'),
      principal: prin,
      interest,
      emi: s === tenure ? prin + interest : emi,
      balance,
      status: 'UPCOMING',
    });
  }

  // mark paid/overdue per profile
  const elapsed = schedule.filter((row) => dayjs(row.dueDate).isBefore(NOW, 'day')).length;
  let paidCount: number;
  let dpd = 0;
  let loanStatus: LoanAccount['status'] = 'ACTIVE';
  let collectionStatus: CollectionStatus = 'NORMAL';

  switch (spec.profile) {
    case 'CLOSED':
      paidCount = tenure; loanStatus = 'CLOSED'; break;
    case 'NPA': {
      dpd = spec.dpd ?? ri(95, 160);
      const missed = Math.min(elapsed, Math.max(3, Math.ceil(dpd / 30)));
      paidCount = Math.max(0, elapsed - missed);
      loanStatus = 'NPA';
      collectionStatus = pick(['LEGAL', 'FIELD_VISIT']);
      break;
    }
    case 'OVERDUE': {
      dpd = spec.dpd ?? ri(4, 60);
      const missed = Math.max(1, Math.ceil(dpd / 30));
      paidCount = Math.max(0, elapsed - missed);
      loanStatus = 'OVERDUE';
      collectionStatus = pick(['FOLLOW_UP', 'PTP', 'FIELD_VISIT']);
      break;
    }
    case 'DUE_TODAY': {
      paidCount = elapsed;
      break;
    }
    default:
      paidCount = spec.paidRatio !== undefined ? Math.min(elapsed, Math.round(tenure * spec.paidRatio)) : elapsed;
  }
  paidCount = Math.max(0, Math.min(paidCount, tenure));

  const repayments: Repayment[] = [];
  const charges: LoanCharge[] = [];

  // processing fee charge at disbursal
  if (app.finance) {
    charges.push({
      id: `CHG-${nextId()}`, loanNumber, customerName: app.customer.name, loanType: app.loanType,
      date: disbursedOn, type: 'PROCESSING_FEE',
      amount: app.finance.fees.processingFee, gst: app.finance.fees.gst, status: 'PAID',
    });
  }

  for (let s = 0; s < paidCount; s++) {
    const row = schedule[s]!;
    const late = chance(0.12);
    const paidOn = dayjs(row.dueDate).add(late ? ri(1, 6) : 0, 'day');
    row.status = 'PAID';
    row.paidOn = paidOn.format('YYYY-MM-DD');
    row.paidAmount = row.emi;
    repayments.push({
      id: `RPT-${nextId()}`, loanNumber, customerName: app.customer.name, loanType: app.loanType,
      date: paidOn.hour(8).minute(ri(0, 59)).toISOString(),
      amount: row.emi, mode: chance(0.78) ? 'E-MANDATE' : pick(['UPI', 'UPI', 'NEFT', 'CASH']),
      reference: `${chance(0.78) ? 'NACH' : 'TXN'}${ri(100000000, 999999999)}`,
      emiSeq: row.seq, status: 'SUCCESS', type: 'EMI',
    });
    if (late) {
      repayments.push({
        id: `RPT-${nextId()}`, loanNumber, customerName: app.customer.name, loanType: app.loanType,
        date: dayjs(row.dueDate).hour(8).toISOString(), amount: row.emi, mode: 'E-MANDATE',
        reference: `NACH${ri(100000000, 999999999)}`, emiSeq: row.seq, status: 'BOUNCED', type: 'EMI',
      });
      charges.push({
        id: `CHG-${nextId()}`, loanNumber, customerName: app.customer.name, loanType: app.loanType,
        date: dayjs(row.dueDate).add(1, 'day').toISOString(), type: 'BOUNCE_CHARGE',
        amount: 500, gst: 90, status: chance(0.7) ? 'PAID' : 'UNPAID',
      });
    }
  }

  // overdue rows
  let overdueAmount = 0;
  for (let s = paidCount; s < elapsed; s++) {
    const row = schedule[s]!;
    row.status = 'OVERDUE';
    overdueAmount += row.emi;
    repayments.push({
      id: `RPT-${nextId()}`, loanNumber, customerName: app.customer.name, loanType: app.loanType,
      date: dayjs(row.dueDate).hour(8).toISOString(), amount: row.emi, mode: 'E-MANDATE',
      reference: `NACH${ri(100000000, 999999999)}`, emiSeq: row.seq, status: 'BOUNCED', type: 'EMI',
    });
    charges.push({
      id: `CHG-${nextId()}`, loanNumber, customerName: app.customer.name, loanType: app.loanType,
      date: dayjs(row.dueDate).add(1, 'day').toISOString(), type: pick(['BOUNCE_CHARGE', 'PENAL_INTEREST']),
      amount: pick([500, 750, Math.round(row.emi * 0.02)]), gst: 90, status: 'UNPAID',
    });
  }

  // due today / next due
  let nextDueDate: string | undefined;
  if (loanStatus !== 'CLOSED') {
    if (spec.profile === 'DUE_TODAY' && paidCount < tenure) {
      const row = schedule[paidCount]!;
      row.dueDate = NOW.format('YYYY-MM-DD');
      row.status = 'DUE';
      nextDueDate = row.dueDate;
    } else {
      const firstUnpaid = schedule.find((row) => row.status !== 'PAID');
      nextDueDate = firstUnpaid?.dueDate;
      if (firstUnpaid && firstUnpaid.status === 'OVERDUE') {
        dpd = Math.max(dpd, NOW.diff(dayjs(firstUnpaid.dueDate), 'day'));
      }
    }
  }

  // recovery payments on NPA
  if (loanStatus === 'NPA' && chance(0.8)) {
    repayments.push({
      id: `RPT-${nextId()}`, loanNumber, customerName: app.customer.name, loanType: app.loanType,
      date: at(ri(2, 18), 15), amount: round100(emi * rf(0.4, 1.2)), mode: pick(['CASH', 'UPI']),
      reference: `RCVR${ri(100000, 999999)}`, status: 'SUCCESS', type: 'RECOVERY',
    });
  }
  if (loanStatus === 'CLOSED' && chance(0.5)) {
    charges.push({
      id: `CHG-${nextId()}`, loanNumber, customerName: app.customer.name, loanType: app.loanType,
      date: dayjs(schedule[tenure - 1]!.dueDate).toISOString(), type: 'FORECLOSURE_CHARGE',
      amount: round100(principal * 0.02), gst: round100(principal * 0.02 * 0.18), status: 'PAID',
    });
  }

  allRepayments.push(...repayments);
  allCharges.push(...charges);

  const successPayments = repayments.filter((p) => p.status === 'SUCCESS');
  const lastPay = successPayments[successPayments.length - 1];

  // ── e-NACH mandate (survives disbursement — this is what staff need to see on
  //    a LIVE loan, and what the finance queue only ever showed pre-disbursal) ──
  const mandateStatus = spec.mandate === 'NONE'
    ? 'NOT_SETUP'
    : spec.mandate ?? derivedMandateStatus(spec.profile, dpd);

  const nachPresentations = repayments.filter((p) => p.mode === 'E-MANDATE');
  const lastPresentation = nachPresentations[nachPresentations.length - 1];
  // Trailing run of bounces, newest-first — the "this mandate is dying" signal.
  let consecutiveFailures = 0;
  for (let i = nachPresentations.length - 1; i >= 0; i--) {
    if (nachPresentations[i]!.status !== 'BOUNCED') break;
    consecutiveFailures++;
  }

  const bank = app.finance?.bank;
  const acctNo = bank?.accountNumber ?? String(ri(10000000000, 99999999999));
  const mandate: LoanMandate | undefined = mandateStatus === 'NOT_SETUP'
    ? { status: 'NOT_SETUP', bankName: bank?.bankName ?? '—', accountMasked: '—', maxAmount: 0, consecutiveFailures: 0 }
    : {
        umrn: app.finance?.emandate.umrn ?? `${pick(['HDFC', 'ICIC', 'SBIN', 'UTIB'])}${ri(1000000000000, 9999999999999)}`,
        status: mandateStatus,
        bankName: bank?.bankName ?? pick(BANKS),
        accountMasked: `XXXX${acctNo.slice(-4)}`,
        ifsc: bank?.ifsc,
        // NPCI mandates are registered with headroom over the EMI so a
        // penalty-inclusive presentation is not rejected on the ceiling.
        maxAmount: round100(emi * 1.5),
        debitDay: dayjs(schedule[0]!.dueDate).date(),
        registeredOn: dayjs(disbursedOn).subtract(ri(1, 4), 'day').toISOString(),
        validTill: dayjs(schedule[tenure - 1]!.dueDate).add(2, 'month').format('YYYY-MM-DD'),
        lastDebitOn: lastPresentation?.date,
        lastDebitStatus: lastPresentation
          ? lastPresentation.status === 'SUCCESS' ? 'SUCCESS' : 'FAILED'
          : undefined,
        failureReason: consecutiveFailures > 0
          ? pick(['Insufficient funds', 'Account frozen', 'Mandate not registered at destination bank'])
          : undefined,
        consecutiveFailures,
      };

  // ── Legacy-book provenance. Only the oldest accounts predate this platform. ──
  const migratedFrom: MigrationOrigin | undefined = spec.migrated
    ? {
        system: 'Finnone (legacy LMS)',
        legacyLoanNumber: `LGCY/${app.loanType}/${ri(100000, 999999)}`,
        migratedOn: at(ri(20, 45), 2),
        batchRef: 'MIG-2026-03',
      }
    : undefined;
  const outstandingPrincipal = paidCount >= tenure ? 0 : schedule[Math.max(0, paidCount - 1)]?.balance ?? principal;

  if (loanStatus === 'CLOSED') app.status = 'CLOSED';
  else if (dayjs(disbursedOn).isBefore(NOW.subtract(25, 'day'))) app.status = 'ACTIVE';

  return {
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
    disbursedOn,
    firstEmiDate: schedule[0]!.dueDate,
    nextDueDate,
    paidCount,
    outstandingPrincipal: paidCount === 0 ? principal : outstandingPrincipal,
    overdueAmount,
    dpd: loanStatus === 'CLOSED' ? 0 : dpd,
    status: loanStatus,
    collectionStatus: loanStatus === 'ACTIVE' ? 'NORMAL' : collectionStatus,
    collectionNotes: loanStatus === 'OVERDUE' || loanStatus === 'NPA' ? [{
      at: at(ri(1, 6), 16),
      by: 'Collections Desk',
      note: pick(['Customer promised payment by weekend.', 'Phone unreachable — field visit scheduled.', 'Partial payment committed.', 'Legal notice drafted.']),
      ptpDate: chance(0.5) ? NOW.add(ri(1, 6), 'day').format('YYYY-MM-DD') : undefined,
    }] : [],
    lastPaymentDate: lastPay?.date,
    lastPaymentAmount: lastPay?.amount,
    branch: app.branch,
    schedule,
    mandate,
    migratedFrom,
  };
};

// ─── Dataset assembly ───────────────────────────────────────────────────────

const APP_SPECS: AppSpec[] = [
  // SUBMITTED (6)
  { loanType: 'CDL', status: 'SUBMITTED', ageDays: 0 },
  { loanType: 'CDL', status: 'SUBMITTED', ageDays: 1 },
  { loanType: 'GOLD', status: 'SUBMITTED', ageDays: 0 },
  { loanType: 'GOLD', status: 'SUBMITTED', ageDays: 2 },
  { loanType: 'HOUSING', status: 'SUBMITTED', ageDays: 1 },
  { loanType: 'HOUSING', status: 'SUBMITTED', ageDays: 3 },
  // CREDIT_PENDING (9)
  { loanType: 'CDL', status: 'CREDIT_PENDING', ageDays: 1 },
  { loanType: 'CDL', status: 'CREDIT_PENDING', ageDays: 2 },
  { loanType: 'CDL', status: 'CREDIT_PENDING', ageDays: 4 },
  { loanType: 'GOLD', status: 'CREDIT_PENDING', ageDays: 1 },
  { loanType: 'GOLD', status: 'CREDIT_PENDING', ageDays: 3 },
  { loanType: 'GOLD', status: 'CREDIT_PENDING', ageDays: 5 },
  { loanType: 'HOUSING', status: 'CREDIT_PENDING', ageDays: 2 },
  { loanType: 'HOUSING', status: 'CREDIT_PENDING', ageDays: 6 },
  { loanType: 'HOUSING', status: 'CREDIT_PENDING', ageDays: 8 },
  // CREDIT_RETURNED (3)
  { loanType: 'CDL', status: 'CREDIT_RETURNED', ageDays: 5 },
  { loanType: 'GOLD', status: 'CREDIT_RETURNED', ageDays: 7 },
  { loanType: 'HOUSING', status: 'CREDIT_RETURNED', ageDays: 9 },
  // CREDIT_REJECTED (6, three today)
  { loanType: 'CDL', status: 'CREDIT_REJECTED', ageDays: 3, decidedToday: true },
  { loanType: 'GOLD', status: 'CREDIT_REJECTED', ageDays: 2, decidedToday: true },
  { loanType: 'HOUSING', status: 'CREDIT_REJECTED', ageDays: 4, decidedToday: true },
  { loanType: 'CDL', status: 'CREDIT_REJECTED', ageDays: 12 },
  { loanType: 'GOLD', status: 'CREDIT_REJECTED', ageDays: 16 },
  { loanType: 'HOUSING', status: 'CREDIT_REJECTED', ageDays: 21 },
  // CREDIT_APPROVED today (3)
  { loanType: 'CDL', status: 'CREDIT_APPROVED', ageDays: 2, decidedToday: true, riskGrade: 'A' },
  { loanType: 'GOLD', status: 'CREDIT_APPROVED', ageDays: 3, decidedToday: true, riskGrade: 'B' },
  { loanType: 'HOUSING', status: 'CREDIT_APPROVED', ageDays: 5, decidedToday: true, riskGrade: 'A' },
  // FINANCE_PENDING (6)
  { loanType: 'CDL', status: 'FINANCE_PENDING', ageDays: 4 },
  { loanType: 'CDL', status: 'FINANCE_PENDING', ageDays: 6 },
  { loanType: 'GOLD', status: 'FINANCE_PENDING', ageDays: 5 },
  { loanType: 'GOLD', status: 'FINANCE_PENDING', ageDays: 7 },
  { loanType: 'HOUSING', status: 'FINANCE_PENDING', ageDays: 9 },
  { loanType: 'HOUSING', status: 'FINANCE_PENDING', ageDays: 11 },
  // EMANDATE_PENDING (6 — one active mandate per type, ready to disburse)
  { loanType: 'CDL', status: 'EMANDATE_PENDING', ageDays: 6, mandateActive: true },
  { loanType: 'CDL', status: 'EMANDATE_PENDING', ageDays: 8 },
  { loanType: 'GOLD', status: 'EMANDATE_PENDING', ageDays: 7, mandateActive: true },
  { loanType: 'GOLD', status: 'EMANDATE_PENDING', ageDays: 9 },
  { loanType: 'HOUSING', status: 'EMANDATE_PENDING', ageDays: 10, mandateActive: true },
  { loanType: 'HOUSING', status: 'EMANDATE_PENDING', ageDays: 12 },
];

const LOAN_SPECS: { app: AppSpec; loan: LoanSpec }[] = [
  // CDL
  { app: { loanType: 'CDL', status: 'DISBURSED', ageDays: 130 }, loan: { profile: 'ACTIVE', monthsAgo: 4 } },
  { app: { loanType: 'CDL', status: 'DISBURSED', ageDays: 4 }, loan: { profile: 'DISBURSED_TODAY', monthsAgo: 0 } },
  { app: { loanType: 'CDL', status: 'DISBURSED', ageDays: 100 }, loan: { profile: 'DUE_TODAY', monthsAgo: 3 } },
  { app: { loanType: 'CDL', status: 'DISBURSED', ageDays: 160 }, loan: { profile: 'OVERDUE', monthsAgo: 5, dpd: 12 } },
  // Pre-platform accounts carried over by the legacy migration.
  { app: { loanType: 'CDL', status: 'DISBURSED', ageDays: 400 }, loan: { profile: 'NPA', monthsAgo: 13, dpd: 124, migrated: true } },
  { app: { loanType: 'CDL', status: 'DISBURSED', ageDays: 560 }, loan: { profile: 'CLOSED', monthsAgo: 18, migrated: true } },
  // GOLD
  { app: { loanType: 'GOLD', status: 'DISBURSED', ageDays: 90 }, loan: { profile: 'ACTIVE', monthsAgo: 3 } },
  { app: { loanType: 'GOLD', status: 'DISBURSED', ageDays: 5 }, loan: { profile: 'DISBURSED_TODAY', monthsAgo: 0 } },
  { app: { loanType: 'GOLD', status: 'DISBURSED', ageDays: 130 }, loan: { profile: 'DUE_TODAY', monthsAgo: 4 } },
  { app: { loanType: 'GOLD', status: 'DISBURSED', ageDays: 200 }, loan: { profile: 'OVERDUE', monthsAgo: 6, dpd: 35 } },
  // Migrated with no mandate re-registered yet — the case the recurring-payment
  // continuity work exists to surface. Staff must be able to see this.
  { app: { loanType: 'GOLD', status: 'DISBURSED', ageDays: 260 }, loan: { profile: 'ACTIVE', monthsAgo: 8, migrated: true, mandate: 'NONE' } },
  { app: { loanType: 'GOLD', status: 'DISBURSED', ageDays: 540 }, loan: { profile: 'CLOSED', monthsAgo: 17, migrated: true } },
  // HOUSING
  { app: { loanType: 'HOUSING', status: 'DISBURSED', ageDays: 170 }, loan: { profile: 'ACTIVE', monthsAgo: 5 } },
  { app: { loanType: 'HOUSING', status: 'DISBURSED', ageDays: 80 }, loan: { profile: 'ACTIVE', monthsAgo: 2 } },
  { app: { loanType: 'HOUSING', status: 'DISBURSED', ageDays: 140 }, loan: { profile: 'DUE_TODAY', monthsAgo: 4 } },
  { app: { loanType: 'HOUSING', status: 'DISBURSED', ageDays: 230 }, loan: { profile: 'OVERDUE', monthsAgo: 7, dpd: 58 } },
  { app: { loanType: 'HOUSING', status: 'DISBURSED', ageDays: 380 }, loan: { profile: 'NPA', monthsAgo: 12, dpd: 97 } },
  { app: { loanType: 'HOUSING', status: 'DISBURSED', ageDays: 60 }, loan: { profile: 'ACTIVE', monthsAgo: 1 } },
];

const applications: LoanApplication[] = [];
const loans: LoanAccount[] = [];

APP_SPECS.forEach((specItem, i) => applications.push(genApplication(i, specItem)));
LOAN_SPECS.forEach(({ app: appSpec, loan: loanSpec }, i) => {
  const app = genApplication(APP_SPECS.length + i, appSpec);
  applications.push(app);
  loans.push(genLoan(app, loanSpec));
});

applications.sort((a, b) => dayjs(b.createdAt).valueOf() - dayjs(a.createdAt).valueOf());
loans.sort((a, b) => dayjs(b.disbursedOn).valueOf() - dayjs(a.disbursedOn).valueOf());

// ─── Portal users ───────────────────────────────────────────────────────────
const portalUsers: PortalUser[] = [
  { id: 'USR-001', name: 'Sudhanshu Shekhar', phone: '9800000001', email: 'admin@fuehrer-nbfc.in', branch: 'Head Office — Mumbai', role: 'ADMIN', status: 'ACTIVE', lastLoginAt: at(0, 9), createdAt: at(520) },
  { id: 'USR-002', name: 'Rohit Malhotra', phone: '9810012001', email: 'rohit.m@fuehrer-nbfc.in', branch: 'Mumbai Andheri', role: 'CREDIT_CDL', status: 'ACTIVE', lastLoginAt: at(0, 10), createdAt: at(410) },
  { id: 'USR-003', name: 'Kavita Krishnan', phone: '9810012002', email: 'kavita.k@fuehrer-nbfc.in', branch: 'Chennai T Nagar', role: 'CREDIT_GOLD', status: 'ACTIVE', lastLoginAt: at(1, 17), createdAt: at(390) },
  { id: 'USR-004', name: 'Arjun Mehta', phone: '9810012003', email: 'arjun.m@fuehrer-nbfc.in', branch: 'Pune FC Road', role: 'CREDIT_HOUSING', status: 'ACTIVE', lastLoginAt: at(0, 11), createdAt: at(355) },
  { id: 'USR-005', name: 'Shruti Desai', phone: '9820013001', email: 'shruti.d@fuehrer-nbfc.in', branch: 'Mumbai Andheri', role: 'FINANCE_CDL', status: 'ACTIVE', lastLoginAt: at(0, 12), createdAt: at(340) },
  { id: 'USR-006', name: 'Manoj Pillai', phone: '9820013002', email: 'manoj.p@fuehrer-nbfc.in', branch: 'Hyderabad Banjara Hills', role: 'FINANCE_GOLD', status: 'ACTIVE', lastLoginAt: at(2, 16), createdAt: at(310) },
  { id: 'USR-007', name: 'Neha Bansal', phone: '9820013003', email: 'neha.b@fuehrer-nbfc.in', branch: 'Delhi Karol Bagh', role: 'FINANCE_HOUSING', status: 'ACTIVE', lastLoginAt: at(0, 9), createdAt: at(290) },
  { id: 'USR-008', name: 'Devika Rao', phone: '9810012044', email: 'devika.r@fuehrer-nbfc.in', branch: 'Bengaluru Koramangala', role: 'CREDIT_CDL', status: 'INACTIVE', lastLoginAt: at(44, 15), createdAt: at(260) },
  { id: 'USR-009', name: 'Sameer Kulkarni', phone: '9820013055', email: 'sameer.k@fuehrer-nbfc.in', branch: 'Pune FC Road', role: 'FINANCE_HOUSING', status: 'INACTIVE', lastLoginAt: at(60, 12), createdAt: at(230) },
  // Sales field agents — provisioned by Admin, sign in on the mobile app only
  { id: 'USR-010', name: 'Rahul Khanna', phone: '9830014001', email: 'rahul.k@fuehrer-nbfc.in', branch: 'Mumbai Andheri', role: 'SALES_CDL', status: 'ACTIVE', lastLoginAt: at(0, 8), createdAt: at(400) },
  { id: 'USR-011', name: 'Sneha Jain', phone: '9830014002', email: 'sneha.j@fuehrer-nbfc.in', branch: 'Jaipur MI Road', role: 'SALES_GOLD', status: 'ACTIVE', lastLoginAt: at(0, 9), createdAt: at(370) },
  { id: 'USR-012', name: 'Vinod Pawar', phone: '9830014003', email: 'vinod.p@fuehrer-nbfc.in', branch: 'Pune FC Road', role: 'SALES_HOUSING', status: 'ACTIVE', lastLoginAt: at(1, 18), createdAt: at(350) },
  { id: 'USR-013', name: 'Akash Dubey', phone: '9830014004', email: 'akash.d@fuehrer-nbfc.in', branch: 'Lucknow Hazratganj', role: 'SALES_CDL', status: 'ACTIVE', lastLoginAt: at(0, 10), createdAt: at(300) },
  { id: 'USR-014', name: 'Priyanka Das', phone: '9830014005', email: 'priyanka.d@fuehrer-nbfc.in', branch: 'Chennai T Nagar', role: 'SALES_GOLD', status: 'ACTIVE', lastLoginAt: at(2, 11), createdAt: at(280) },
  { id: 'USR-015', name: 'Mohammed Asif', phone: '9830014006', email: 'asif.m@fuehrer-nbfc.in', branch: 'Hyderabad Banjara Hills', role: 'SALES_HOUSING', status: 'INACTIVE', lastLoginAt: at(38, 16), createdAt: at(250) },
];

// ─── Audit logs ─────────────────────────────────────────────────────────────
const IPS = ['10.24.8.112', '10.24.8.117', '172.16.4.21', '172.16.4.33', '10.24.9.05', '103.156.22.41'];
const auditLogs: AuditLog[] = [];
applications.forEach((app) => {
  app.timeline.forEach((tl) => {
    auditLogs.push({
      id: `AUD-${nextId()}`,
      at: tl.at,
      user: tl.actor,
      role: tl.role,
      module: tl.stage === 'SUBMITTED' ? 'Applications' : tl.stage.startsWith('CREDIT') ? 'Credit' : tl.stage === 'DISBURSED' || tl.stage === 'EMANDATE' || tl.stage === 'FINANCE_VERIFIED' ? 'Finance' : 'Applications',
      action: tl.title,
      entity: app.appNumber,
      oldValue: tl.stage === 'CREDIT_DECISION' ? 'CREDIT_PENDING' : tl.stage === 'DISBURSED' ? 'EMANDATE_PENDING' : undefined,
      newValue: tl.stage === 'CREDIT_DECISION' ? app.creditDecision?.decision : tl.stage === 'DISBURSED' ? 'DISBURSED' : undefined,
      ip: pick(IPS),
    });
  });
});
portalUsers.slice(0, 7).forEach((u) => {
  auditLogs.push({
    id: `AUD-${nextId()}`, at: u.lastLoginAt ?? at(1), user: u.name, role: u.role,
    module: 'Auth', action: 'User Login', entity: u.email, ip: pick(IPS),
  });
});
auditLogs.push(
  { id: `AUD-${nextId()}`, at: at(2, 18), user: 'Sudhanshu Shekhar', role: 'ADMIN', module: 'Settings', action: 'Updated Processing Fee — CDL', entity: 'Product Config', oldValue: '2.00%', newValue: '2.50%', ip: IPS[0]! },
  { id: `AUD-${nextId()}`, at: at(5, 11), user: 'Sudhanshu Shekhar', role: 'ADMIN', module: 'User Management', action: 'Deactivated User', entity: 'devika.r@fuehrer-nbfc.in', oldValue: 'ACTIVE', newValue: 'INACTIVE', ip: IPS[1]! },
  { id: `AUD-${nextId()}`, at: at(7, 12), user: 'Sudhanshu Shekhar', role: 'ADMIN', module: 'User Management', action: 'Password Reset', entity: 'sameer.k@fuehrer-nbfc.in', ip: IPS[1]! },
);
auditLogs.sort((a, b) => dayjs(b.at).valueOf() - dayjs(a.at).valueOf());

// ─── Notifications ──────────────────────────────────────────────────────────
const submittedToday = applications.filter((a) => a.status === 'SUBMITTED').length;
const notifications: AppNotification[] = [
  { id: 'NTF-1', title: 'New applications received', description: `${submittedToday} applications submitted via mobile app are awaiting credit pickup.`, at: at(0, 10), read: false, type: 'application' },
  { id: 'NTF-2', title: 'E-Mandate registered', description: 'NPCI confirmed mandate registration for 3 applications — ready to disburse.', at: at(0, 9), read: false, type: 'finance' },
  { id: 'NTF-3', title: 'EMI bounce alert', description: 'NACH presentation bounced for 2 accounts. Bounce charges applied.', at: at(0, 8), read: false, type: 'collection' },
  { id: 'NTF-4', title: 'NPA watchlist', description: `${loans.filter((l) => l.status === 'NPA').length} accounts crossed DPD 90 — flagged for recovery.`, at: at(1, 18), read: true, type: 'collection' },
  { id: 'NTF-5', title: 'Disbursement completed', description: 'Two loans disbursed today. UTR references available in the loan ledger.', at: at(0, 12), read: true, type: 'finance' },
  { id: 'NTF-6', title: 'Bureau service degraded', description: 'CIBIL pulls were slow between 02:10–02:35 AM. Auto-retried successfully.', at: at(1, 7), read: true, type: 'system' },
  { id: 'NTF-7', title: 'Credit TAT breach risk', description: '3 applications in credit queue are older than 5 days.', at: at(1, 16), read: true, type: 'credit' },
];

allRepayments.sort((a, b) => dayjs(b.date).valueOf() - dayjs(a.date).valueOf());
allCharges.sort((a, b) => dayjs(b.date).valueOf() - dayjs(a.date).valueOf());

// ─── Branches ───────────────────────────────────────────────────────────────
const ALL_PRODUCTS: LoanType[] = ['CDL', 'GOLD', 'HOUSING'];
const branches: Branch[] = [
  { id: 'BR-001', code: 'HO-MUM', name: 'Head Office — Mumbai', city: 'Mumbai', state: 'Maharashtra', address: '12th Floor, Lotus Corporate Park, Goregaon East, Mumbai 400063', manager: 'Sudhanshu Shekhar', phone: '022 4066 1200', products: ALL_PRODUCTS, openedOn: at(1900), status: 'ACTIVE' },
  { id: 'BR-002', code: 'MUM-AND', name: 'Mumbai Andheri', city: 'Mumbai', state: 'Maharashtra', address: 'Unit 4, Andheri Kurla Road, Andheri East, Mumbai 400059', manager: 'Rohit Malhotra', phone: '022 2836 7788', products: ['CDL', 'GOLD'], openedOn: at(1400), status: 'ACTIVE' },
  { id: 'BR-003', code: 'DEL-KB', name: 'Delhi Karol Bagh', city: 'New Delhi', state: 'Delhi', address: '9 Ajmal Khan Road, Karol Bagh, New Delhi 110005', manager: 'Neha Bansal', phone: '011 4155 3300', products: ['CDL', 'HOUSING'], openedOn: at(1250), status: 'ACTIVE' },
  { id: 'BR-004', code: 'BLR-KOR', name: 'Bengaluru Koramangala', city: 'Bengaluru', state: 'Karnataka', address: '80 Feet Road, 4th Block, Koramangala, Bengaluru 560034', manager: 'Devika Rao', phone: '080 4123 6600', products: ALL_PRODUCTS, openedOn: at(1100), status: 'ACTIVE' },
  { id: 'BR-005', code: 'CHN-TN', name: 'Chennai T Nagar', city: 'Chennai', state: 'Tamil Nadu', address: 'Usman Road, T Nagar, Chennai 600017', manager: 'Kavita Krishnan', phone: '044 4855 9900', products: ['GOLD'], openedOn: at(980), status: 'ACTIVE' },
  { id: 'BR-006', code: 'HYD-BJH', name: 'Hyderabad Banjara Hills', city: 'Hyderabad', state: 'Telangana', address: 'Road No. 12, Banjara Hills, Hyderabad 500034', manager: 'Manoj Pillai', phone: '040 4023 1177', products: ['GOLD', 'HOUSING'], openedOn: at(860), status: 'ACTIVE' },
  { id: 'BR-007', code: 'PUN-FC', name: 'Pune FC Road', city: 'Pune', state: 'Maharashtra', address: 'Fergusson College Road, Shivajinagar, Pune 411004', manager: 'Arjun Mehta', phone: '020 4120 8844', products: ['CDL', 'HOUSING'], openedOn: at(720), status: 'ACTIVE' },
  { id: 'BR-008', code: 'JAI-MI', name: 'Jaipur MI Road', city: 'Jaipur', state: 'Rajasthan', address: 'Mirza Ismail Road, Jaipur 302001', manager: 'Sneha Jain', phone: '0141 405 6600', products: ['CDL', 'GOLD'], openedOn: at(540), status: 'ACTIVE' },
  { id: 'BR-009', code: 'LKO-HZ', name: 'Lucknow Hazratganj', city: 'Lucknow', state: 'Uttar Pradesh', address: 'Hazratganj, Lucknow 226001', manager: 'Akash Dubey', phone: '0522 400 7711', products: ['CDL'], openedOn: at(300), status: 'INACTIVE' },
];

// ─── Field / DSA agents (commissions & territories) ─────────────────────────
const agentSourced = (code: string): number => applications.filter((a) => a.createdByCode === code).length;
const agents: Agent[] = [
  { id: 'AGT-001', code: 'FSA-021', name: 'Rahul Khanna', phone: '9830014001', email: 'rahul.k@fuehrer-nbfc.in', branch: 'Mumbai Andheri', territory: 'Mumbai West', products: ['CDL'], commissionRate: 1.5, status: 'ACTIVE', joinedOn: at(400), sourced: agentSourced('FSA-021'), disbursedValue: 4820000, commissionEarned: 62300, commissionPending: 10850 },
  { id: 'AGT-002', code: 'FSA-034', name: 'Sneha Jain', phone: '9830014002', email: 'sneha.j@fuehrer-nbfc.in', branch: 'Jaipur MI Road', territory: 'Jaipur Central', products: ['GOLD'], commissionRate: 0.8, status: 'ACTIVE', joinedOn: at(370), sourced: agentSourced('FSA-034'), disbursedValue: 3110000, commissionEarned: 21400, commissionPending: 4600 },
  { id: 'AGT-003', code: 'FSA-008', name: 'Vinod Pawar', phone: '9830014003', email: 'vinod.p@fuehrer-nbfc.in', branch: 'Pune FC Road', territory: 'Pune East', products: ['HOUSING'], commissionRate: 1.0, status: 'ACTIVE', joinedOn: at(350), sourced: agentSourced('FSA-008'), disbursedValue: 9650000, commissionEarned: 84200, commissionPending: 18700 },
  { id: 'AGT-004', code: 'FSA-052', name: 'Akash Dubey', phone: '9830014004', email: 'akash.d@fuehrer-nbfc.in', branch: 'Lucknow Hazratganj', territory: 'Lucknow North', products: ['CDL'], commissionRate: 1.5, status: 'ACTIVE', joinedOn: at(300), sourced: agentSourced('FSA-052'), disbursedValue: 2240000, commissionEarned: 29800, commissionPending: 6900 },
  { id: 'AGT-005', code: 'FSA-047', name: 'Priyanka Das', phone: '9830014005', email: 'priyanka.d@fuehrer-nbfc.in', branch: 'Chennai T Nagar', territory: 'Chennai South', products: ['GOLD'], commissionRate: 0.8, status: 'ACTIVE', joinedOn: at(280), sourced: agentSourced('FSA-047'), disbursedValue: 1870000, commissionEarned: 12900, commissionPending: 3100 },
  { id: 'AGT-006', code: 'FSA-019', name: 'Mohammed Asif', phone: '9830014006', email: 'asif.m@fuehrer-nbfc.in', branch: 'Hyderabad Banjara Hills', territory: 'Hyderabad West', products: ['HOUSING'], commissionRate: 1.0, status: 'INACTIVE', joinedOn: at(250), sourced: agentSourced('FSA-019'), disbursedValue: 0, commissionEarned: 0, commissionPending: 0 },
];

// ─── Product configuration (LTV limits, rate bands) ─────────────────────────
const productConfigs: ProductConfig[] = [
  { key: 'CDL', product: 'Consumer Durable Loan', minAmount: 10000, maxAmount: 250000, minRate: 14, maxRate: 21, maxTenure: 24, processingFeePct: 2.5, active: true },
  { key: 'GOLD', product: 'Gold Loan', minAmount: 25000, maxAmount: 1000000, minRate: 9.5, maxRate: 14, maxTenure: 36, processingFeePct: 0.5, maxLtv: 75, active: true },
  { key: 'HOUSING', product: 'Affordable Housing Loan', minAmount: 500000, maxAmount: 3500000, minRate: 8.75, maxRate: 11.5, maxTenure: 240, processingFeePct: 1.0, maxLtv: 80, active: true },
];

export const MOCK = {
  applications, loans, portalUsers, auditLogs, notifications,
  repayments: allRepayments, charges: allCharges,
  branches, agents, productConfigs,
};

// ─── Login directory (demo) ─────────────────────────────────────────────────
export const DEMO_ADMIN = { username: 'admin', password: 'admin@123', user: portalUsers[0]! };
export const OTP_CODE = '123456';
export const findOtpUser = (phone: string, family: 'CREDIT' | 'FINANCE'): PortalUser | undefined =>
  portalUsers.find((u) => u.phone === phone && u.role.startsWith(family) && u.status === 'ACTIVE');

/** Any registered user for this phone — used to explain *why* a web login was rejected. */
export const findUserByPhone = (phone: string): PortalUser | undefined =>
  portalUsers.find((u) => u.phone === phone);
