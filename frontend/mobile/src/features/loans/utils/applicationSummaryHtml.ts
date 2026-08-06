import {
  ornamentNetWeight,
  ornamentTotals,
  ornamentTypeLabel,
  type OrnamentEntry,
} from '@/src/features/sales/config/ornaments';

// ---------------------------------------------------------------------------
// Customer-facing Credit Approval Memo (CAM) summary — rendered to PDF via
// expo-print. Follows the client's 11-module CAM structure exactly. Modules
// that are filled by the branch (Gold Valuation) or credit team (Credit
// Approval) are shown as clearly-labelled pending sections so the document
// structure matches the CAM without fabricating internal data.
// ---------------------------------------------------------------------------

export interface SummaryData {
  flow: 'gold' | 'cdl';
  params: Record<string, string | undefined>;
  ornaments: OrnamentEntry[];
}

export interface SummarySection {
  title: string;
  rows: [string, string][];
  /** Shown instead of / below rows for branch- or credit-completed modules. */
  note?: string;
}

const esc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const inr = (v: string | number | undefined): string => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? '₹' + Math.round(n).toLocaleString('en-IN') : '—';
};

const val = (v: string | undefined): string => (v && v.trim() ? v.trim() : '—');

const maskAccount = (v: string | undefined): string =>
  v && v.length >= 4 ? `•••• ${v.slice(-4)}` : '—';

const maskAadhaar = (v: string | undefined): string =>
  v && v.replace(/\D/g, '').length === 12 ? `XXXX XXXX ${v.replace(/\D/g, '').slice(-4)}` : '—';

/** Age from a DD/MM/YYYY or ISO date string. */
function ageFrom(dob: string | undefined): string {
  if (!dob) return '—';
  let d: Date | null = null;
  const m = dob.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
  else {
    const parsed = new Date(dob);
    if (!Number.isNaN(parsed.getTime())) d = parsed;
  }
  if (!d) return '—';
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  const md = today.getMonth() - d.getMonth();
  if (md < 0 || (md === 0 && today.getDate() < d.getDate())) age -= 1;
  return age >= 0 && age < 120 ? `${age} yrs` : '—';
}

const repaymentLabel = (v: string | undefined): string =>
  v === 'emi' ? 'Monthly EMI' : v === 'interest_only' ? 'Interest only' : v === 'bullet' ? 'Bullet repayment' : '—';

export function buildSummarySections(data: SummaryData): SummarySection[] {
  const { flow, params: p, ornaments } = data;
  const sections: SummarySection[] = [];

  // ── 1. Customer Information ──
  sections.push({
    title: '1. Customer Information',
    rows: [
      ['Customer ID', val(p.customerId)],
      ['Loan Number', val(p.loanNumber || p.applicationId)],
      ['Customer Name', val(p.fullName)],
      ["Father's Name", val(p.fatherName)],
      ["Mother's Maiden Name", val(p.motherMaidenName)],
      ['Date of Birth', val(p.dob)],
      ['Age', ageFrom(p.dob)],
      ['Gender', val(p.gender)],
      ['Marital Status', val(p.maritalStatus)],
      ['Customer Type', val(p.customerType || p.customerCategory)],
      ['PAN', val(p.pan)],
      ['Aadhaar', maskAadhaar(p.aadhaar)],
      ['Email', val(p.email)],
      ['Mobile', val(p.phone)],
      [
        'Existing Loan',
        p.hasExistingLoan === 'yes'
          ? `Yes${p.existingLender ? ` — ${val(p.existingLender)}` : ''}${p.existingOutstanding ? ` (${inr(p.existingOutstanding)})` : ''}`
          : 'None declared',
      ],
    ],
  });

  // ── 2. Address ──
  sections.push({
    title: '2. Address',
    rows: [
      ['Present Address', val(p.addrLine1)],
      ['Landmark', val(p.addrLandmark)],
      ['City', val(p.addrCity)],
      ['State', val(p.addrState)],
      ['PIN', val(p.addrPin)],
      ['Years Staying', val(p.addrYears)],
      ['Residential Status', val(p.residenceType)],
      [
        'Permanent Address',
        p.permSame === 'yes'
          ? 'Same as present'
          : `${val(p.permLine1)}, ${val(p.permCity)}, ${val(p.permState)} — ${val(p.permPin)}`,
      ],
    ],
  });

  // ── 3. Co-Applicant ──
  if (p.hasCoApplicant === 'yes') {
    sections.push({
      title: '3. Co-Applicant',
      rows: [
        ['Co-Borrower', val(p.coName)],
        ['Relationship', val(p.coRelation)],
        ['Mobile', val(p.coMobile)],
        ['PAN', val(p.coPan)],
      ],
    });
  } else {
    sections.push({ title: '3. Co-Applicant', rows: [], note: 'No co-applicant added to this loan.' });
  }

  // ── 4. Employment ──
  sections.push({
    title: '4. Employment',
    rows: [
      ['Company Type', val(p.companyType)],
      ['Industry', val(p.industry)],
      ['Employer / Business', val(p.employer)],
      ['Monthly Income', inr(p.monthlyIncome)],
      ['Years in Job / Business', val(p.yearsInJob)],
    ],
  });

  // ── 5. Banking ──
  if (p.accountNumber || p.bankName) {
    sections.push({
      title: '5. Banking',
      rows: [
        ['Bank', val(p.bankName)],
        ['Account Holder', val(p.accountName)],
        ['Account Number', maskAccount(p.accountNumber)],
        ['IFSC', val(p.ifsc)],
        ['Account Type', val(p.accountType)],
      ],
    });
  } else {
    sections.push({ title: '5. Banking', rows: [], note: 'Disbursal bank account to be provided.' });
  }

  if (flow === 'gold') {
    // ── 6. Gold Ornament Entry ──
    if (ornaments.length > 0) {
      const t = ornamentTotals(ornaments);
      sections.push({
        title: '6. Gold Ornaments',
        rows: [
          ...ornaments.map(
            (o, i) =>
              [
                `${i + 1}. ${ornamentTypeLabel(o.ornamentType)}`,
                `${o.itemCount} pc · ${o.purity}K · gross ${o.grossWeight} g · net ${ornamentNetWeight(o)} g`,
              ] as [string, string],
          ),
          ['Total', `${t.items} pc · gross ${t.gross} g · net ${t.net} g`],
        ],
      });
    } else {
      sections.push({ title: '6. Gold Ornaments', rows: [], note: 'No ornaments declared.' });
    }

    // ── 7. Gold Valuation (branch) ──
    sections.push({
      title: '7. Gold Valuation',
      rows: [['Estimated Gold Value', inr(p.goldValue)]],
      note: 'Final gold rate, net value, LTV, eligible loan and valuer details are recorded by the branch appraiser during your visit.',
    });
  }

  // ── 8. Loan Details ──
  const loanRows: [string, string][] =
    flow === 'gold'
      ? [
          ['Loan Type', 'Gold Loan'],
          ['Purpose', val(p.purpose) === '—' ? 'Personal' : val(p.purpose)],
          ['Scheme', val(p.scheme) === '—' ? 'Standard Gold Loan' : val(p.scheme)],
          ['ROI', p.interestRate ? `${p.interestRate}% p.a.` : '0.88% per month'],
          ['Tenure', p.tenure ? `${p.tenure} months` : '—'],
          ['Requested Amount', inr(p.loanAmount)],
          ['Repayment', repaymentLabel(p.repaymentType)],
        ]
      : [
          ['Loan Type', 'Consumer Durable Loan'],
          ['Product', val(p.productName)],
          ['Purpose', val(p.productName) === '—' ? 'Appliance purchase' : `Purchase of ${val(p.productName)}`],
          ['Product Value', inr(p.productValue)],
          ['Loan Amount', inr(p.loanAmount)],
          ['ROI', p.interestRate ? `${p.interestRate}% p.a.` : '—'],
          ['Tenure', p.tenure ? `${p.tenure} months` : '—'],
          ['EMI', inr(p.emi)],
          ['Processing Fee', inr(p.processingFee)],
        ];
  sections.push({ title: '8. Loan Details', rows: loanRows });

  // ── 9. Nominee & Documents ──
  const docList: string[] = [];
  if (p.pan) docList.push('PAN (verified)');
  if (p.aadhaar) docList.push('Aadhaar (e-KYC)');
  if (flow === 'gold') {
    if (ornaments.some((o) => o.photoUri)) docList.push('Gold ornament photos');
    if (p.bankProofUri) docList.push('Bank proof');
    if (p.invoiceUri) docList.push('Purchase invoice');
  }
  sections.push({
    title: '9. Nominee & Documents',
    rows: [
      ['Nominee Name', val(p.nomineeName)],
      ['Nominee Relationship', val(p.nomineeRelation)],
      ['Documents Submitted', docList.length ? docList.join(', ') : '—'],
    ],
  });

  // ── 10. Credit Approval (credit team) ──
  sections.push({
    title: '10. Credit Approval',
    rows: [],
    note: 'TVR, CPV, deviations and the final approval (Branch Manager / Operations) are recorded by the credit team after assessment. The sanctioned amount and terms are shared in the Key Facts Statement.',
  });

  return sections;
}

export function buildSummaryHtml(data: SummaryData): string {
  const generatedAt = new Date().toLocaleString('en-IN', { hour12: true });
  const body = buildSummarySections(data)
    .map((s) => {
      const rows = s.rows.map(([l, v]) => `<tr><td class="l">${esc(l)}</td><td class="v">${esc(v)}</td></tr>`).join('');
      const note = s.note ? `<p class="pending">${esc(s.note)}</p>` : '';
      return `<h2>${esc(s.title)}</h2>${rows ? `<table>${rows}</table>` : ''}${note}`;
    })
    .join('');

  return `<!DOCTYPE html><html><head><meta charset="utf-8"/>
<style>
  body { font-family: -apple-system, Roboto, 'Segoe UI', sans-serif; color: #1f2937; padding: 28px; font-size: 12px; }
  .brand { display: flex; justify-content: space-between; align-items: baseline; border-bottom: 3px solid #156FE8; padding-bottom: 10px; }
  .brand h1 { color: #156FE8; font-size: 20px; margin: 0; }
  .brand span { color: #6b7280; font-size: 11px; }
  h2 { font-size: 12.5px; color: #156FE8; margin: 16px 0 5px; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 5px 8px; border-bottom: 1px solid #e5e7eb; vertical-align: top; }
  td.l { color: #6b7280; width: 40%; }
  td.v { color: #111827; font-weight: 600; }
  .pending { color: #6b7280; font-style: italic; font-size: 11px; margin: 4px 0 0; }
  .note { margin-top: 22px; padding: 10px 12px; background: #f3f4f6; border-radius: 8px; color: #6b7280; font-size: 10.5px; line-height: 1.5; }
</style></head><body>
  <div class="brand"><h1>Fuehrer NBFC</h1><span>Credit Approval Memo (Application Copy) · ${esc(generatedAt)}</span></div>
  ${body}
  <div class="note">
    This is your copy of the Credit Approval Memo based on the details you submitted. It is not a
    sanction letter or loan agreement. Sections completed by the branch (gold valuation) and the
    credit team (approval) are marked accordingly. Final loan terms — sanctioned amount, interest
    rate and charges — are communicated after credit approval in the Key Facts Statement.
  </div>
</body></html>`;
}
