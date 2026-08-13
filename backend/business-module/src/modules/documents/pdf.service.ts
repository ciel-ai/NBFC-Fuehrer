// src/modules/documents/pdf.service.ts
//
// Generates PDF documents for:
// 1. Payment Receipt
// 2. NOC (No Objection Certificate)
// 3. Loan Statement
// 4. Loan Closure Letter
// 5. Legal Notice

import PDFDocument from 'pdfkit';
import { prisma } from '@/config/database';
import { createModuleLogger } from '@/config/logger';
import { NotFoundError } from '@/errors';
import { computeMonthlyEmi, computeApr } from '@/modules/emi/emi.calculator';
import { NBFC_IDENTITY, INTEREST_METHOD_LABEL, COOLING_OFF_PERIOD_DAYS } from '@/config/nbfc.constants';

const log = createModuleLogger('pdf.service');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function inr(amount: number): string {
    return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
}

function roundToPaisa(amount: number): number {
    return Math.round(amount * 100) / 100;
}

function formatDate(date: Date | string): string {
    return new Date(date).toLocaleDateString('en-IN', {
        day: '2-digit', month: 'long', year: 'numeric',
    });
}

function addHeader(doc: PDFKit.PDFDocument, title: string): void {
    doc.fontSize(20).fillColor('#0F2C4F').text('FUEHRER CAPITAL', { align: 'center' });
    doc.fontSize(10).fillColor('#475569').text('NBFC — RBI Registered', { align: 'center' });
    doc.moveDown(0.5);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#E2E8F0');
    doc.moveDown(0.5);
    doc.fontSize(14).fillColor('#0F2C4F').text(title, { align: 'center' });
    doc.moveDown(1);
}

function addFooter(doc: PDFKit.PDFDocument): void {
    const bottom = doc.page.height - 50;
    doc.moveTo(50, bottom).lineTo(545, bottom).stroke('#E2E8F0');
    doc.fontSize(8).fillColor('#94A3B8')
        .text('This is a system generated document.', 50, bottom + 10, { align: 'center' });
}

function addField(doc: PDFKit.PDFDocument, label: string, value: string): void {
    doc.fontSize(10).fillColor('#475569').text(label, { continued: true, width: 200 });
    doc.fillColor('#1E293B').text(value);
}

// ─── PDF Service ──────────────────────────────────────────────────────────────

export const pdfService = {

    // ── 1. Payment Receipt ────────────────────────────────────────────────────

    async generatePaymentReceipt(paymentId: string): Promise<Buffer> {
        log.info('Generating payment receipt', { paymentId });

        const payment = await prisma.payments.findUnique({
            where: { id: paymentId },
            include: {
                loan_account: {
                    include: { user: { select: { full_name: true, phone: true } } },
                },
            },
        });

        if (!payment) throw new NotFoundError('Payment', paymentId);

        return new Promise((resolve, reject) => {
            const doc = new PDFDocument({ margin: 50, size: 'A4' });
            const chunks: Buffer[] = [];

            doc.on('data', (chunk) => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);

            addHeader(doc, 'PAYMENT RECEIPT');

            doc.fontSize(10).fillColor('#475569');
            addField(doc, 'Receipt No.:', `RCPT-${paymentId.slice(0, 8).toUpperCase()}`);
            addField(doc, 'Date:', formatDate(payment.created_at));
            doc.moveDown(0.5);

            addField(doc, 'Customer Name:', payment.loan_account?.user?.full_name ?? 'N/A');
            addField(doc, 'Phone:', payment.loan_account?.user?.phone ?? 'N/A');
            addField(doc, 'Loan Account No.:', payment.loan_account?.account_number ?? 'N/A');
            doc.moveDown(0.5);

            doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#E2E8F0');
            doc.moveDown(0.5);

            addField(doc, 'Amount Paid:', inr(Number(payment.amount)));
            addField(doc, 'Payment Mode:', payment.channel ?? 'N/A');
            addField(doc, 'Transaction Ref.:', payment.gateway_txn_id ?? 'N/A');
            addField(doc, 'Payment Status:', payment.status);
            doc.moveDown(1);

            doc.fontSize(9).fillColor('#047857')
                .text('Thank you for your payment. Please retain this receipt for your records.', { align: 'center' });

            addFooter(doc);
            doc.end();
        });
    },

    // ── 2. NOC (No Objection Certificate) ────────────────────────────────────

    async generateNoc(loanAccountId: string): Promise<Buffer> {
        log.info('Generating NOC', { loanAccountId });

        const loan = await prisma.loan_accounts.findUnique({
            where: { id: loanAccountId },
            include: {
                user: { select: { full_name: true, phone: true } },
                application: { select: { product_type: true, amount_requested: true } },
            },
        });

        if (!loan) throw new NotFoundError('Loan Account', loanAccountId);

        return new Promise((resolve, reject) => {
            const doc = new PDFDocument({ margin: 50, size: 'A4' });
            const chunks: Buffer[] = [];

            doc.on('data', (chunk) => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);

            addHeader(doc, 'NO OBJECTION CERTIFICATE');

            doc.fontSize(10).fillColor('#1E293B')
                .text(`Date: ${formatDate(new Date())}`, { align: 'right' });
            doc.moveDown(1);

            doc.fontSize(10).fillColor('#475569')
                .text('To Whomsoever It May Concern,');
            doc.moveDown(0.5);

            doc.fontSize(10).fillColor('#1E293B').text(
                `This is to certify that ${loan.user?.full_name ?? 'the borrower'} has successfully repaid the entire loan amount and all associated charges in full. The loan account details are as follows:`,
                { align: 'justify' },
            );
            doc.moveDown(1);

            addField(doc, 'Loan Account No.:', loan.account_number);
            addField(doc, 'Customer Name:', loan.user?.full_name ?? 'N/A');
            addField(doc, 'Phone:', loan.user?.phone ?? 'N/A');
            addField(doc, 'Product:', loan.application?.product_type ?? 'N/A');
            addField(doc, 'Loan Amount:', inr(Number(loan.application?.amount_requested ?? 0)));
            addField(doc, 'Closure Date:', formatDate(new Date()));
            doc.moveDown(1);

            doc.fontSize(10).fillColor('#1E293B').text(
                'We confirm that there are no dues outstanding against the above loan account. This certificate is issued as a No Objection Certificate (NOC) and the borrower is free from all obligations related to this loan.',
                { align: 'justify' },
            );
            doc.moveDown(2);

            doc.fontSize(10).fillColor('#475569').text('Authorized Signatory');
            doc.text('Fuehrer Capital');
            doc.text('NBFC — RBI Registered');

            addFooter(doc);
            doc.end();
        });
    },

    // ── 3. Loan Statement ─────────────────────────────────────────────────────

    async generateLoanStatement(loanAccountId: string): Promise<Buffer> {
        log.info('Generating loan statement', { loanAccountId });

        const loan = await prisma.loan_accounts.findUnique({
            where: { id: loanAccountId },
            include: {
                user:        { select: { full_name: true, phone: true } },
                application: { select: { product_type: true, amount_requested: true, interest_rate: true } },
                emi_schedule: { orderBy: { due_date: 'asc' } },
            },
        });

        if (!loan) throw new NotFoundError('Loan Account', loanAccountId);

        return new Promise((resolve, reject) => {
            const doc = new PDFDocument({ margin: 50, size: 'A4' });
            const chunks: Buffer[] = [];

            doc.on('data', (chunk) => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);

            addHeader(doc, 'LOAN STATEMENT');

            addField(doc, 'Loan Account No.:', loan.account_number);
            addField(doc, 'Customer Name:', loan.user?.full_name ?? 'N/A');
            addField(doc, 'Phone:', loan.user?.phone ?? 'N/A');
            addField(doc, 'Product:', loan.application?.product_type ?? 'N/A');
            addField(doc, 'Loan Amount:', inr(Number(loan.application?.amount_requested ?? 0)));
            addField(doc, 'Interest Rate:', `${loan.application?.interest_rate ?? 0}% p.a.`);
            addField(doc, 'Statement Date:', formatDate(new Date()));
            doc.moveDown(1);

            // EMI table header
            const tableTop = doc.y;
            doc.fontSize(9).fillColor('#FFFFFF')
                .rect(50, tableTop, 495, 20).fill('#0F2C4F');
            doc.fillColor('#FFFFFF')
                .text('#',       55,  tableTop + 5)
                .text('Due Date', 80,  tableTop + 5)
                .text('EMI',      200, tableTop + 5)
                .text('Principal', 270, tableTop + 5)
                .text('Interest', 340, tableTop + 5)
                .text('Balance',  410, tableTop + 5)
                .text('Status',   480, tableTop + 5);

            let y = tableTop + 20;
            loan.emi_schedule.forEach((emi, i) => {
                const bg = i % 2 === 0 ? '#F8FAFC' : '#FFFFFF';
                doc.rect(50, y, 495, 18).fill(bg);
                doc.fontSize(8).fillColor('#1E293B')
                    .text(String(i + 1),              55,  y + 4)
                    .text(formatDate(emi.due_date),   80,  y + 4)
                    .text(inr(Number(emi.emi_amount)), 200, y + 4)
                    .text(inr(Number(emi.principal_component ?? 0)), 270, y + 4)
                    .text(inr(Number(emi.interest_component ?? 0)), 340, y + 4)
                    .text(inr(Number(emi.outstanding_after ?? 0)), 410, y + 4)
                    .text(emi.status,                  480, y + 4);
                y += 18;
            });

            addFooter(doc);
            doc.end();
        });
    },

    // ── 4. Loan Closure Letter ────────────────────────────────────────────────

    async generateClosureLetter(loanAccountId: string): Promise<Buffer> {
        log.info('Generating closure letter', { loanAccountId });

        const loan = await prisma.loan_accounts.findUnique({
            where: { id: loanAccountId },
            include: {
                user:        { select: { full_name: true, phone: true } },
                application: { select: { product_type: true, amount_requested: true } },
            },
        });

        if (!loan) throw new NotFoundError('Loan Account', loanAccountId);

        return new Promise((resolve, reject) => {
            const doc = new PDFDocument({ margin: 50, size: 'A4' });
            const chunks: Buffer[] = [];

            doc.on('data', (chunk) => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);

            addHeader(doc, 'LOAN CLOSURE LETTER');

            doc.fontSize(10).fillColor('#1E293B')
                .text(`Date: ${formatDate(new Date())}`, { align: 'right' });
            doc.moveDown(1);

            doc.fontSize(10).fillColor('#475569').text('Dear Customer,');
            doc.moveDown(0.5);

            doc.fontSize(10).fillColor('#1E293B').text(
                `We are pleased to inform you that your loan account has been successfully closed. All dues have been cleared and the account stands closed as of ${formatDate(new Date())}.`,
                { align: 'justify' },
            );
            doc.moveDown(1);

            addField(doc, 'Customer Name:', loan.user?.full_name ?? 'N/A');
            addField(doc, 'Loan Account No.:', loan.account_number);
            addField(doc, 'Product:', loan.application?.product_type ?? 'N/A');
            addField(doc, 'Original Loan Amount:', inr(Number(loan.application?.amount_requested ?? 0)));
            addField(doc, 'Closure Date:', formatDate(new Date()));
            doc.moveDown(1);

            doc.fontSize(10).fillColor('#1E293B').text(
                'Please retain this letter for your records. For any queries, contact our customer support.',
                { align: 'justify' },
            );
            doc.moveDown(2);

            doc.fontSize(10).fillColor('#475569').text('Yours sincerely,');
            doc.moveDown(0.5);
            doc.text('Authorized Signatory');
            doc.text('Fuehrer Capital');

            addFooter(doc);
            doc.end();
        });
    },

    // ── 5. Legal Notice ───────────────────────────────────────────────────────

    async generateLegalNotice(loanAccountId: string): Promise<Buffer> {
        log.info('Generating legal notice', { loanAccountId });

        const loan = await prisma.loan_accounts.findUnique({
            where: { id: loanAccountId },
            include: {
                user:        { select: { full_name: true, phone: true } },
                application: { select: { product_type: true, amount_requested: true } },
                emi_schedule: {
                    where:   { status: { in: ['OVERDUE', 'BOUNCED'] } },
                    orderBy: { due_date: 'asc' },
                },
            },
        });

        if (!loan) throw new NotFoundError('Loan Account', loanAccountId);

        const totalOverdue = loan.emi_schedule.reduce(
            (sum, e) => sum + Number(e.emi_amount), 0,
        );

        return new Promise((resolve, reject) => {
            const doc = new PDFDocument({ margin: 50, size: 'A4' });
            const chunks: Buffer[] = [];

            doc.on('data', (chunk) => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);

            addHeader(doc, 'LEGAL NOTICE');

            doc.fontSize(10).fillColor('#B91C1C').text('NOTICE', { align: 'center' });
            doc.moveDown(0.5);
            doc.fontSize(10).fillColor('#1E293B')
                .text(`Date: ${formatDate(new Date())}`, { align: 'right' });
            doc.moveDown(1);

            doc.fontSize(10).fillColor('#475569')
                .text(`To,\n${loan.user?.full_name ?? 'The Borrower'}`);
            doc.moveDown(0.5);

            doc.fontSize(10).fillColor('#1E293B').text(
                `SUBJECT: Notice for repayment of outstanding dues against Loan Account No. ${loan.account_number}`,
                { align: 'justify' },
            );
            doc.moveDown(1);

            doc.text(
                `This notice is being issued to you as the borrower in respect of the loan availed from Fuehrer Capital. Despite repeated reminders and follow-ups, you have failed to repay the outstanding dues as per the agreed repayment schedule.`,
                { align: 'justify' },
            );
            doc.moveDown(1);

            addField(doc, 'Loan Account No.:', loan.account_number);
            addField(doc, 'Total Overdue Amount:', inr(totalOverdue));
            addField(doc, 'Overdue EMIs:', String(loan.emi_schedule.length));
            doc.moveDown(1);

            doc.fontSize(10).fillColor('#B91C1C').text(
                'You are hereby directed to clear all outstanding dues within 7 days of receipt of this notice. Failure to do so will compel us to initiate appropriate legal proceedings against you without any further notice.',
                { align: 'justify' },
            );
            doc.moveDown(2);

            doc.fontSize(10).fillColor('#475569').text('For Fuehrer Capital');
            doc.moveDown(0.5);
            doc.text('Authorized Signatory');

            addFooter(doc);
            doc.end();
        });
    },

    // ── 6. Repayment Schedule ─────────────────────────────────────────────────

    async generateRepaymentSchedule(loanAccountId: string): Promise<Buffer> {
        log.info('Generating repayment schedule', { loanAccountId });

        const loan = await prisma.loan_accounts.findUnique({
            where: { id: loanAccountId },
            include: {
                user:         { select: { full_name: true, phone: true } },
                application:  { select: { product_type: true, interest_rate: true, tenure_months: true } },
                emi_schedule: { orderBy: { emi_number: 'asc' } },
            },
        });

        if (!loan) throw new NotFoundError('Loan Account', loanAccountId);

        return new Promise((resolve, reject) => {
            const doc = new PDFDocument({ margin: 50, size: 'A4' });
            const chunks: Buffer[] = [];

            doc.on('data', (chunk) => chunks.push(chunk));
            doc.on('end',  () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);

            addHeader(doc, 'REPAYMENT SCHEDULE');

            addField(doc, 'Loan Account No.:', loan.account_number);
            addField(doc, 'Customer Name:',    loan.user?.full_name ?? 'N/A');
            addField(doc, 'Product:',          loan.application?.product_type ?? 'N/A');
            addField(doc, 'Interest Rate:',    `${loan.application?.interest_rate ?? 0}% p.a.`);
            addField(doc, 'Tenure:',           `${loan.application?.tenure_months ?? 0} months`);
            addField(doc, 'Generated On:',     formatDate(new Date()));
            doc.moveDown(1);

            // Table header
            const tableTop = doc.y;
            doc.fontSize(9).fillColor('#FFFFFF')
                .rect(50, tableTop, 495, 20).fill('#0F2C4F');
            doc.fillColor('#FFFFFF')
                .text('#',          55,  tableTop + 5)
                .text('Due Date',   90,  tableTop + 5)
                .text('EMI',        200, tableTop + 5)
                .text('Principal',  270, tableTop + 5)
                .text('Interest',   340, tableTop + 5)
                .text('Balance',    410, tableTop + 5)
                .text('Status',     480, tableTop + 5);

            let y = tableTop + 20;
            let totalEmi       = 0;
            let totalPrincipal = 0;
            let totalInterest  = 0;

            loan.emi_schedule.forEach((emi, i) => {
                const bg = i % 2 === 0 ? '#F8FAFC' : '#FFFFFF';
                const emiAmt  = Number(emi.emi_amount ?? 0);
                const prinAmt = Number(emi.principal_component ?? 0);
                const intAmt  = Number(emi.interest_component ?? 0);
                const bal     = Number(emi.outstanding_after ?? 0);

                totalEmi       += emiAmt;
                totalPrincipal += prinAmt;
                totalInterest  += intAmt;

                doc.rect(50, y, 495, 18).fill(bg);
                doc.fontSize(8).fillColor('#1E293B')
                    .text(String(i + 1),           55,  y + 4)
                    .text(formatDate(emi.due_date), 90,  y + 4)
                    .text(inr(emiAmt),              200, y + 4)
                    .text(inr(prinAmt),             270, y + 4)
                    .text(inr(intAmt),              340, y + 4)
                    .text(inr(bal),                 410, y + 4)
                    .text(emi.status,               480, y + 4);
                y += 18;

                // Add new page if needed
                if (y > doc.page.height - 80) {
                    doc.addPage();
                    y = 50;
                }
            });

            // Totals row
            doc.rect(50, y, 495, 20).fill('#0F2C4F');
            doc.fontSize(9).fillColor('#FFFFFF')
                .text('TOTAL',          55,  y + 5)
                .text(inr(totalEmi),    200, y + 5)
                .text(inr(totalPrincipal), 270, y + 5)
                .text(inr(totalInterest),  340, y + 5);

            addFooter(doc);
            doc.end();
        });
    },

    // ── 7. Interest Certificate ───────────────────────────────────────────────

    async generateInterestCertificate(
        loanAccountId: string,
        financialYear: string, // e.g. "2025-26"
    ): Promise<Buffer> {
        log.info('Generating interest certificate', { loanAccountId, financialYear });

        const parts = financialYear.split('-');
        const fromDate = new Date(`${parts[0]}-04-01`);
        const toDate   = new Date(`20${parts[1]}-03-31`);

        const loan = await prisma.loan_accounts.findUnique({
            where: { id: loanAccountId },
            include: {
                user:        { select: { full_name: true, phone: true } },
                application: { select: { product_type: true, interest_rate: true } },
                emi_schedule: {
                    where: {
                        due_date: { gte: fromDate, lte: toDate },
                        status:   'PAID',
                    },
                    orderBy: { due_date: 'asc' },
                },
            },
        });

        if (!loan) throw new NotFoundError('Loan Account', loanAccountId);

        const totalInterestPaid = loan.emi_schedule.reduce(
            (sum, e) => sum + Number(e.interest_component ?? 0), 0,
        );

        const totalPrincipalPaid = loan.emi_schedule.reduce(
            (sum, e) => sum + Number(e.principal_component ?? 0), 0,
        );

        return new Promise((resolve, reject) => {
            const doc = new PDFDocument({ margin: 50, size: 'A4' });
            const chunks: Buffer[] = [];

            doc.on('data', (chunk) => chunks.push(chunk));
            doc.on('end',  () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);

            addHeader(doc, 'INTEREST CERTIFICATE');

            doc.fontSize(10).fillColor('#475569')
                .text(`Financial Year: ${financialYear}`, { align: 'right' });
            doc.fontSize(10).fillColor('#1E293B')
                .text(`Date: ${formatDate(new Date())}`, { align: 'right' });
            doc.moveDown(1);

            doc.fontSize(10).fillColor('#475569').text('To Whomsoever It May Concern,');
            doc.moveDown(0.5);

            doc.fontSize(10).fillColor('#1E293B').text(
                `This is to certify that the following interest has been paid by the borrower during the financial year ${financialYear} against the loan account mentioned below:`,
                { align: 'justify' },
            );
            doc.moveDown(1);

            addField(doc, 'Loan Account No.:', loan.account_number);
            addField(doc, 'Customer Name:',    loan.user?.full_name ?? 'N/A');
            addField(doc, 'Phone:',            loan.user?.phone ?? 'N/A');
            addField(doc, 'Product:',          loan.application?.product_type ?? 'N/A');
            addField(doc, 'Interest Rate:',    `${loan.application?.interest_rate ?? 0}% p.a.`);
            addField(doc, 'Financial Year:',   financialYear);
            doc.moveDown(1);

            // Summary box
            doc.rect(50, doc.y, 495, 80).fill('#F8FAFC').stroke('#E2E8F0');
            const boxY = doc.y + 5;
            doc.fontSize(11).fillColor('#0F2C4F')
                .text('Total Interest Paid:', 70, boxY + 10)
                .text(inr(totalInterestPaid), 300, boxY + 10);
            doc.fontSize(11).fillColor('#475569')
                .text('Total Principal Repaid:', 70, boxY + 35)
                .text(inr(totalPrincipalPaid), 300, boxY + 35);
            doc.fontSize(9).fillColor('#94A3B8')
                .text(`(For the period 01 Apr ${financialYear.split('-')[0]} to 31 Mar 20${financialYear.split('-')[1]})`, 70, boxY + 60);

            doc.moveDown(5);
            doc.moveDown(1);

            doc.fontSize(10).fillColor('#1E293B').text(
                'This certificate is issued for income tax purposes under Section 24(b) of the Income Tax Act, 1961.',
                { align: 'justify' },
            );
            doc.moveDown(2);

            doc.fontSize(10).fillColor('#475569').text('Authorized Signatory');
            doc.text('Fuehrer Capital');
            doc.text('NBFC — RBI Registered');

            addFooter(doc);
            doc.end();
        });
    },

    async generateKfs(applicationId: string): Promise<Buffer> {
        log.info('Generating KFS', { applicationId });

        const application = await prisma.loan_applications.findUnique({
            where: { id: applicationId },
            include: {
                user: { select: { full_name: true, phone: true } },
                customer: true,
            },
        });

        if (!application) throw new NotFoundError('Loan Application', applicationId);

        const productType = application.product_type;
        const product = await prisma.loan_products.findUnique({
            where: { product_type: productType },
        });

        const principal = Number(application.approved_amount ?? application.amount_requested);
        const annualRatePct = Number(application.interest_rate ?? product?.min_rate ?? 0);
        const tenureMonths = application.tenure_months;

        const processingFee = Number(application.processing_fee ?? 0);
        const processingFeeGst = Number(application.processing_fee_gst ?? 0);
        const insuranceAmount = product
            ? Math.round(principal * (Number(product.insurance_pct) / 100) * 100) / 100
            : 0;
        const stampDuty = Number(product?.stamp_duty ?? 0);
        const documentationFee = Number(product?.documentation_fee ?? 0);
        const appraiserFee = Number(product?.appraiser_fee ?? 0);
        const incidentalCharges = Number(product?.incidental_charges ?? 0);

        const totalUpfrontCharges = roundToPaisa(
            processingFee + processingFeeGst + insuranceAmount + stampDuty +
            documentationFee + appraiserFee + incidentalCharges,
        );

        const monthlyEmi = application.monthly_emi
            ? Number(application.monthly_emi)
            : computeMonthlyEmi(principal, annualRatePct, tenureMonths);

        const totalRepayable = roundToPaisa(monthlyEmi * tenureMonths);
        const totalInterest = roundToPaisa(totalRepayable - principal);

        let apr = annualRatePct;
        try {
            apr = computeApr({
                principal,
                monthlyEmi,
                tenureMonths,
                upfrontCharges: totalUpfrontCharges,
            });
        } catch (err) {
            log.warn('APR calculation fell back to nominal rate', { applicationId, err });
        }

        const netDisbursedAmount = roundToPaisa(principal - totalUpfrontCharges);

        return new Promise((resolve, reject) => {
            const doc = new PDFDocument({ margin: 50, size: 'A4' });
            const chunks: Buffer[] = [];

            doc.on('data', (chunk) => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);

            addHeader(doc, 'KEY FACT STATEMENT (KFS)');

            doc.fontSize(9).fillColor('#94A3B8')
                .text('Issued pursuant to RBI Digital Lending Guidelines, 2022', { align: 'center' });
            doc.moveDown(1);

            doc.fontSize(11).fillColor('#0F2C4F').text('A. Loan Details');
            doc.moveDown(0.3);
            addField(doc, 'Application Reference No.:', application.reference_number ?? application.id.slice(0, 8).toUpperCase());
            addField(doc, 'Borrower Name:', application.user?.full_name ?? 'N/A');
            addField(doc, 'Phone:', application.user?.phone ?? 'N/A');
            addField(doc, 'Product:', productType);
            addField(doc, 'Date of KFS:', formatDate(new Date()));
            doc.moveDown(0.7);

            doc.fontSize(11).fillColor('#0F2C4F').text('B. Loan Amount & Tenure');
            doc.moveDown(0.3);
            addField(doc, 'Sanctioned Loan Amount:', inr(principal));
            addField(doc, 'Loan Tenure:', `${tenureMonths} months`);
            addField(doc, 'Interest Computation Method:', INTEREST_METHOD_LABEL);
            addField(doc, 'Nominal Interest Rate:', `${annualRatePct.toFixed(2)}% p.a.`);
            addField(doc, 'Annual Percentage Rate (APR):', `${apr.toFixed(2)}% p.a.`);
            doc.fontSize(8).fillColor('#94A3B8')
                .text('APR reflects the all-in effective cost of the loan, including upfront charges.', { indent: 10 });
            doc.moveDown(0.7);

            doc.fontSize(11).fillColor('#0F2C4F').text('C. Itemised Charges');
            doc.moveDown(0.3);
            addField(doc, 'Processing Fee:', inr(processingFee));
            addField(doc, 'Processing Fee GST:', inr(processingFeeGst));
            if (insuranceAmount > 0) addField(doc, 'Insurance Premium:', inr(insuranceAmount));
            if (stampDuty > 0) addField(doc, 'Stamp Duty:', inr(stampDuty));
            if (documentationFee > 0) addField(doc, 'Documentation Fee:', inr(documentationFee));
            if (appraiserFee > 0) addField(doc, 'Appraiser Fee:', inr(appraiserFee));
            if (incidentalCharges > 0) addField(doc, 'Incidental Charges:', inr(incidentalCharges));
            doc.moveDown(0.3);
            addField(doc, 'Total Upfront Charges:', inr(totalUpfrontCharges));
            addField(doc, 'Net Amount Disbursed:', inr(netDisbursedAmount));
            doc.moveDown(0.7);

            doc.fontSize(11).fillColor('#0F2C4F').text('D. Repayment');
            doc.moveDown(0.3);
            addField(doc, 'Monthly Instalment (EMI):', inr(monthlyEmi));
            addField(doc, 'Total Interest Payable:', inr(totalInterest));
            addField(doc, 'Total Amount Repayable:', inr(totalRepayable));
            addField(doc, 'Repayment Mode:', 'Auto-debit (eNACH / UPI Autopay)');
            doc.moveDown(0.7);

            doc.fontSize(11).fillColor('#0F2C4F').text('E. Cooling-off Period');
            doc.moveDown(0.3);
            doc.fontSize(10).fillColor('#1E293B').text(
                `The borrower may exercise the right to exit this loan by repaying the principal and proportionate ` +
                `interest, without any penalty, within ${COOLING_OFF_PERIOD_DAYS} days of loan disbursement.`,
                { align: 'justify' },
            );
            doc.moveDown(0.7);

            doc.fontSize(11).fillColor('#0F2C4F').text('F. Recovery Mechanism & Grievance Redressal');
            doc.moveDown(0.3);
            addField(doc, 'Late Payment / Penal Charges:', 'As per Loan Agreement (see Clause on Charges)');
            addField(doc, 'Grievance Officer:', NBFC_IDENTITY.grievanceOfficer.name);
            addField(doc, 'Grievance Contact (Email):', NBFC_IDENTITY.grievanceOfficer.email);
            addField(doc, 'Grievance Contact (Phone):', NBFC_IDENTITY.grievanceOfficer.phone);
            doc.moveDown(0.7);

            doc.fontSize(11).fillColor('#0F2C4F').text('G. Lender Details');
            doc.moveDown(0.3);
            addField(doc, 'Lender Name:', NBFC_IDENTITY.legalName);
            addField(doc, 'NBFC Registration No.:', NBFC_IDENTITY.registrationNumber);
            addField(doc, 'RBI CoR No.:', NBFC_IDENTITY.rbiCorNumber);
            addField(doc, 'Registered Address:', NBFC_IDENTITY.registeredAddress);

            doc.moveDown(1);
            doc.fontSize(8).fillColor('#94A3B8').text(
                'This Key Fact Statement is a summary for the borrower\'s reference. In the event of any variance between this document and the Loan Agreement, the terms of the Loan Agreement shall prevail.',
                { align: 'justify' },
            );

            addFooter(doc);
            doc.end();
        });
    },

    // ── 9. Gold Loan Agreement ────────────────────────────────────────────────
    //
    // ⚠️ Content is built to a general loan-agreement structure. Actual legal
    // wording is pending client approval — see Consumer_Loan_Pending_Requirements_Document
    // item #31 (Loan Agreement Template). Swap the clause text once confirmed;
    // the data-assembly logic below should not need to change.

    async generateGoldLoanAgreement(applicationId: string): Promise<Buffer> {
        log.info('Generating Gold Loan agreement', { applicationId });

        const application = await prisma.loan_applications.findUnique({
            where: { id: applicationId },
            include: { user: { select: { full_name: true, phone: true } } },
        });

        if (!application) throw new NotFoundError('Loan Application', applicationId);

        const collateral = await prisma.collateral_gold.findUnique({
            where: { loan_id: applicationId },
        });

        const principal = Number(application.approved_amount ?? application.amount_requested);
        const annualRatePct = Number(application.interest_rate ?? 0);
        const tenureMonths = application.tenure_months;

        return new Promise((resolve, reject) => {
            const doc = new PDFDocument({ margin: 50, size: 'A4' });
            const chunks: Buffer[] = [];

            doc.on('data', (chunk) => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);

            addHeader(doc, 'GOLD LOAN AGREEMENT');

            doc.fontSize(9).fillColor('#94A3B8')
                .text('This agreement is executed between the Lender and the Borrower named below.', { align: 'center' });
            doc.moveDown(1);

            doc.fontSize(11).fillColor('#0F2C4F').text('A. Parties');
            doc.moveDown(0.3);
            addField(doc, 'Lender:', NBFC_IDENTITY.legalName);
            addField(doc, 'Borrower Name:', application.user?.full_name ?? 'N/A');
            addField(doc, 'Borrower Phone:', application.user?.phone ?? 'N/A');
            addField(doc, 'Application Reference No.:', application.reference_number ?? application.id.slice(0, 8).toUpperCase());
            addField(doc, 'Date:', formatDate(new Date()));
            doc.moveDown(0.7);

            doc.fontSize(11).fillColor('#0F2C4F').text('B. Loan Terms');
            doc.moveDown(0.3);
            addField(doc, 'Loan Amount:', inr(principal));
            addField(doc, 'Tenure:', `${tenureMonths} months`);
            addField(doc, 'Interest Rate:', `${annualRatePct.toFixed(2)}% p.a. (Reducing Balance)`);
            doc.moveDown(0.7);

            doc.fontSize(11).fillColor('#0F2C4F').text('C. Gold Collateral Pledged');
            doc.moveDown(0.3);
            if (collateral) {
                addField(doc, 'Net Weight:', `${collateral.net_weight_grams} grams`);
                addField(doc, 'Gross Weight:', `${collateral.gross_weight_grams} grams`);
                addField(doc, 'Purity:', `${collateral.purity_karat} Karat`);
                addField(doc, 'Appraised Value:', inr(Number(collateral.valuation)));
            } else {
                addField(doc, 'Gold Appraisal:', 'Not yet recorded');
            }
            doc.moveDown(0.7);

            doc.fontSize(11).fillColor('#0F2C4F').text('D. Terms & Conditions');
            doc.moveDown(0.3);
            doc.fontSize(10).fillColor('#1E293B').text(
                'The Borrower agrees to repay the loan as per the schedule provided separately. ' +
                'The pledged gold shall remain in the custody of the Lender until full repayment. ' +
                'In the event of default, the Lender reserves the right to auction the pledged gold ' +
                'as per the applicable notice period and RBI guidelines, after adjusting for outstanding ' +
                'dues, foreclosure charges, and applicable penalties. Full terms are set out in the ' +
                'Key Fact Statement issued alongside this agreement.',
                { align: 'justify' },
            );
            doc.moveDown(1);

            doc.fontSize(8).fillColor('#94A3B8').text(
                'This document requires digital signature (eSign) by the Borrower to be legally valid. An unsigned copy has no legal effect.',
                { align: 'justify' },
            );

            addFooter(doc);
            doc.end();
        });
    },

    // ── 10. Housing Loan Agreement ────────────────────────────────────────────
    // ⚠️ Content pending client-approved legal wording, same as Gold Loan agreement.

    async generateHousingLoanAgreement(applicationId: string): Promise<Buffer> {
        log.info('Generating Housing Loan agreement', { applicationId });

        const application = await prisma.loan_applications.findUnique({
            where: { id: applicationId },
            include: { user: { select: { full_name: true, phone: true } } },
        });
        if (!application) throw new NotFoundError('Loan Application', applicationId);

        const property = await prisma.collateral_property.findUnique({ where: { loan_id: applicationId } });

        const principal = Number(application.approved_amount ?? application.amount_requested);
        const annualRatePct = Number(application.interest_rate ?? 0);

        return new Promise((resolve, reject) => {
            const doc = new PDFDocument({ margin: 50, size: 'A4' });
            const chunks: Buffer[] = [];
            doc.on('data', (c) => chunks.push(c));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);

            addHeader(doc, 'HOUSING LOAN AGREEMENT');
            doc.moveDown(1);

            doc.fontSize(11).fillColor('#0F2C4F').text('A. Parties');
            doc.moveDown(0.3);
            addField(doc, 'Lender:', NBFC_IDENTITY.legalName);
            addField(doc, 'Borrower Name:', application.user?.full_name ?? 'N/A');
            addField(doc, 'Application Reference No.:', application.reference_number ?? application.id.slice(0, 8).toUpperCase());
            addField(doc, 'Date:', formatDate(new Date()));
            doc.moveDown(0.7);

            doc.fontSize(11).fillColor('#0F2C4F').text('B. Loan Terms');
            doc.moveDown(0.3);
            addField(doc, 'Loan Amount:', inr(principal));
            addField(doc, 'Tenure:', `${application.tenure_months} months`);
            addField(doc, 'Interest Rate:', `${annualRatePct.toFixed(2)}% p.a. (Reducing Balance)`);
            doc.moveDown(0.7);

            doc.fontSize(11).fillColor('#0F2C4F').text('C. Property Mortgaged');
            doc.moveDown(0.3);
            if (property) {
                addField(doc, 'Property Type:', property.property_type);
                addField(doc, 'Address:', property.address);
                addField(doc, 'Market Value:', inr(Number(property.market_value)));
            } else {
                addField(doc, 'Property Details:', 'Not yet recorded');
            }
            doc.moveDown(0.7);

            doc.fontSize(10).fillColor('#1E293B').text(
                'The Borrower mortgages the above property as security for this loan. Full terms are set out in the Key Fact Statement issued alongside this agreement.',
                { align: 'justify' },
            );

            addFooter(doc);
            doc.end();
        });
    },

    // ── 11. Consumer Durable Loan Agreement ───────────────────────────────────
    // ⚠️ Content built to a general loan-agreement structure, same caveat as
    // the Gold/Housing agreements above — legal wording pending client approval.

    async generateCdlLoanAgreement(applicationId: string): Promise<Buffer> {
        log.info('Generating CDL agreement', { applicationId });

        const application = await prisma.loan_applications.findUnique({
            where: { id: applicationId },
            include: { user: { select: { full_name: true, phone: true } } },
        });

        if (!application) throw new NotFoundError('Loan Application', applicationId);

        const principal = Number(application.approved_amount ?? application.amount_requested);
        const annualRatePct = Number(application.interest_rate ?? 0);
        const tenureMonths = application.tenure_months;
        const monthlyEmi = application.monthly_emi
            ? Number(application.monthly_emi)
            : computeMonthlyEmi(principal, annualRatePct, tenureMonths);

        return new Promise((resolve, reject) => {
            const doc = new PDFDocument({ margin: 50, size: 'A4' });
            const chunks: Buffer[] = [];

            doc.on('data', (chunk) => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);

            addHeader(doc, 'CONSUMER DURABLE LOAN AGREEMENT');

            doc.fontSize(9).fillColor('#94A3B8')
                .text('This agreement is executed between the Lender and the Borrower named below.', { align: 'center' });
            doc.moveDown(1);

            doc.fontSize(11).fillColor('#0F2C4F').text('A. Parties');
            doc.moveDown(0.3);
            addField(doc, 'Lender:', NBFC_IDENTITY.legalName);
            addField(doc, 'Borrower Name:', application.user?.full_name ?? 'N/A');
            addField(doc, 'Borrower Phone:', application.user?.phone ?? 'N/A');
            addField(doc, 'Application Reference No.:', application.reference_number ?? application.id.slice(0, 8).toUpperCase());
            addField(doc, 'Date:', formatDate(new Date()));
            doc.moveDown(0.7);

            doc.fontSize(11).fillColor('#0F2C4F').text('B. Loan Terms');
            doc.moveDown(0.3);
            addField(doc, 'Loan Amount:', inr(principal));
            addField(doc, 'Tenure:', `${tenureMonths} months`);
            addField(doc, 'Interest Rate:', `${annualRatePct.toFixed(2)}% p.a. (Reducing Balance)`);
            addField(doc, 'Monthly Instalment (EMI):', inr(monthlyEmi));
            doc.moveDown(0.7);

            doc.fontSize(11).fillColor('#0F2C4F').text('C. Financed Purchase');
            doc.moveDown(0.3);
            // product_name is the item; `purpose` is the fallback for CDL rows
            // written before 20260813010000_add_cdl_product_name, when the
            // product name was stored there. New rows put the loan's actual
            // purpose in that column, so it must not be preferred.
            addField(doc, 'Item Financed:', application.product_name ?? application.purpose ?? 'N/A');
            addField(doc, 'Store Name:', application.store_name ?? 'N/A');
            addField(doc, 'Store City:', application.store_city ?? 'N/A');
            doc.moveDown(0.7);

            doc.fontSize(11).fillColor('#0F2C4F').text('D. Terms & Conditions');
            doc.moveDown(0.3);
            doc.fontSize(10).fillColor('#1E293B').text(
                'The loan amount shall be disbursed directly to the store named above, not to the ' +
                'Borrower, against the purchase described. The Borrower agrees to repay the loan as ' +
                'per the schedule provided separately, via auto-debit (eNACH). In the event of default, ' +
                'the Lender reserves the right to recover outstanding dues, foreclosure charges, and ' +
                'applicable penalties as per RBI guidelines. Full terms are set out in the Key Fact ' +
                'Statement issued alongside this agreement.',
                { align: 'justify' },
            );
            doc.moveDown(1);

            doc.fontSize(8).fillColor('#94A3B8').text(
                'This document requires digital signature (eSign) by the Borrower to be legally valid. An unsigned copy has no legal effect.',
                { align: 'justify' },
            );

            addFooter(doc);
            doc.end();
        });
    },
};