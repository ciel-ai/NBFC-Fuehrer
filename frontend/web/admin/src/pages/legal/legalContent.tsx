import { BRAND } from '../../theme/tokens';

/* ============================================================================
 * Legal document content — DRAFT SCAFFOLD.
 *
 * These are the section structures an Indian NBFC's public policies need. The
 * body text is PLACEHOLDER and must be replaced with counsel-approved copy
 * before publication — every page renders a visible "pending legal review"
 * banner (see LegalPage.tsx) so a draft can never be mistaken for the real
 * thing. Nothing here states a binding fact (retention windows, fees, CIN);
 * those are left as bracketed prompts for legal to fill.
 * ==========================================================================*/

export interface LegalSection {
  heading: string;
  body: string[];
}

export interface LegalDoc {
  slug: string;
  title: string;
  summary: string;
  sections: LegalSection[];
}

const ENTITY = BRAND.legalName;

export const LEGAL_ORDER = ['privacy', 'terms', 'refund', 'cookies'] as const;
export type LegalSlug = (typeof LEGAL_ORDER)[number];

export const LEGAL_LABEL: Record<LegalSlug, string> = {
  privacy: 'Privacy Policy',
  terms: 'Terms & Conditions',
  refund: 'Refund Policy',
  cookies: 'Cookies Policy',
};

export const LEGAL_DOCS: Record<LegalSlug, LegalDoc> = {
  privacy: {
    slug: 'privacy',
    title: 'Privacy Policy',
    summary: `How ${ENTITY} collects, uses, stores, and protects the personal and financial information of borrowers and staff.`,
    sections: [
      {
        heading: 'Information we collect',
        body: [
          '[Draft] List the categories collected — identity (KYC), contact, financial, device, and location data — and the point of collection (application, servicing, support).',
        ],
      },
      {
        heading: 'How we use your information',
        body: [
          '[Draft] State the lawful purposes: credit assessment, disbursal and servicing, fraud prevention, regulatory reporting, and communication. Confirm no purpose beyond those disclosed.',
        ],
      },
      {
        heading: 'Sharing & disclosure',
        body: [
          '[Draft] Name the categories of recipients — credit bureaus, payment and KYC partners, statutory authorities — and the basis for each. Confirm data is not sold.',
        ],
      },
      {
        heading: 'Data retention',
        body: [
          '[Draft] State retention periods per data category, aligned to RBI and KYC record-keeping norms. Describe deletion and anonymisation on expiry.',
        ],
      },
      {
        heading: 'Security',
        body: [
          '[Draft] Describe encryption in transit and at rest, access controls, and the breach-notification process.',
        ],
      },
      {
        heading: 'Your rights',
        body: [
          '[Draft] Access, correction, and grievance rights under the Digital Personal Data Protection Act, 2023, and how to exercise them.',
        ],
      },
      {
        heading: 'Grievance officer',
        body: [
          `[Draft] Name, designation, address, and contact of the Grievance Officer for ${ENTITY}, and the escalation path to the RBI Ombudsman.`,
        ],
      },
    ],
  },
  terms: {
    slug: 'terms',
    title: 'Terms & Conditions',
    summary: `The rules governing use of the ${BRAND.name} platform and the lending services offered by ${ENTITY}.`,
    sections: [
      {
        heading: 'Acceptance of terms',
        body: [
          '[Draft] State that using the platform constitutes acceptance, and that continued use after changes constitutes acceptance of the revised terms.',
        ],
      },
      {
        heading: 'Eligibility',
        body: [
          '[Draft] Age, residency, and KYC requirements to hold an account or apply for credit.',
        ],
      },
      {
        heading: 'Accounts & security',
        body: [
          '[Draft] Responsibility for credentials, OTP confidentiality, and reporting unauthorised use.',
        ],
      },
      {
        heading: 'Loan terms',
        body: [
          '[Draft] Reference the sanction letter / key-fact statement as the binding commercial terms — interest, tenure, charges, and prepayment — for each product.',
        ],
      },
      {
        heading: 'Acceptable use',
        body: ['[Draft] Prohibited conduct: fraud, scraping, reverse engineering, and misuse.'],
      },
      {
        heading: 'Limitation of liability',
        body: ['[Draft] Standard limitations, carve-outs, and indemnity, as advised by counsel.'],
      },
      {
        heading: 'Governing law & disputes',
        body: [
          '[Draft] Governing law, jurisdiction, and the grievance-redressal ladder ending at the RBI Ombudsman.',
        ],
      },
    ],
  },
  refund: {
    slug: 'refund',
    title: 'Refund Policy',
    summary: `When and how amounts collected by ${ENTITY} are refunded — covering fees, over-collection, and failed transactions.`,
    sections: [
      {
        heading: 'Scope',
        body: [
          '[Draft] Which payments this covers — processing fees, EMI over-collection, duplicate debits, and cancelled disbursals.',
        ],
      },
      {
        heading: 'Refund eligibility',
        body: ['[Draft] The conditions under which a refund is due, and those under which it is not.'],
      },
      {
        heading: 'Timelines',
        body: [
          '[Draft] Processing time per method (NACH reversal, UPI, bank transfer), stated in working days.',
        ],
      },
      {
        heading: 'How to request a refund',
        body: ['[Draft] The channel, the information required, and the reference a customer receives.'],
      },
      {
        heading: 'Failed & disputed transactions',
        body: [
          '[Draft] Handling of payment-gateway failures and chargebacks, aligned to RBI turnaround-time (TAT) norms.',
        ],
      },
    ],
  },
  cookies: {
    slug: 'cookies',
    title: 'Cookies Policy',
    summary: `The cookies and similar technologies the ${BRAND.name} platform uses, and how to control them.`,
    sections: [
      {
        heading: 'What cookies are',
        body: ['[Draft] A plain-language explanation of cookies and similar local storage.'],
      },
      {
        heading: 'How we use them',
        body: [
          '[Draft] Group by purpose — strictly necessary (session, security), preferences, and analytics.',
        ],
      },
      {
        heading: 'Cookies we set',
        body: [
          '[Draft] A table of each cookie: name, purpose, and lifetime. This console uses session storage for authentication and local storage for table preferences.',
        ],
      },
      {
        heading: 'Third-party cookies',
        body: ['[Draft] Any analytics or partner cookies, with links to their policies.'],
      },
      {
        heading: 'Managing cookies',
        body: [
          '[Draft] How to control cookies via browser settings and any in-product preference centre.',
        ],
      },
    ],
  },
};
