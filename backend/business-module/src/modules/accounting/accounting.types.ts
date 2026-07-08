// src/modules/accounting/accounting.types.ts

export type AccountType = 'ASSET' | 'LIABILITY' | 'INCOME' | 'EXPENSE';
export type NormalBalance = 'DEBIT' | 'CREDIT';
export type ReferenceType = 
    | 'DISBURSEMENT'
    | 'EMI_COLLECTION'
    | 'PROCESSING_FEE'
    | 'PENAL_INTEREST'
    | 'FORECLOSURE'
    | 'NPA_PROVISION'
    | 'WRITE_OFF'
    | 'AGENT_COMMISSION';

export interface GlAccount {
    id:            string;
    code:          string;
    name:          string;
    type:          AccountType;
    normalBalance: NormalBalance;
    isActive:      boolean;
    createdAt:     Date;
    updatedAt:     Date;
}

export interface JournalEntry {
    id:            string;
    entryDate:     Date;
    referenceType: ReferenceType;
    referenceId:   string;
    debitAccount:  string;
    creditAccount: string;
    amount:        number;
    narration:     string;
    postedBy:      string;
    createdAt:     Date;
}

export interface CreateJournalEntryInput {
    entryDate:     Date;
    referenceType: ReferenceType;
    referenceId:   string;
    debitAccount:  string;
    creditAccount: string;
    amount:        number;
    narration:     string;
    postedBy:      string;
}

export interface LedgerQueryInput {
    accountCode?: string;
    fromDate?:    Date;
    toDate?:      Date;
    referenceType?: ReferenceType;
    page:         number;
    limit:        number;
}

export interface AccountBalance {
    code:          string;
    name:          string;
    type:          AccountType;
    totalDebits:   number;
    totalCredits:  number;
    balance:       number;
}