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

const log = createModuleLogger('pdf.service');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function inr(amount: number): string {
    return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
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
};