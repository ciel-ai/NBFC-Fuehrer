/**
 * Shared document-upload contract used by every product flow (gold, CDL,
 * housing) for KYC docs, ownership/bank proofs and collateral photos.
 *
 * The mock services echo back a fake hosted URL so the whole capture → upload →
 * preview journey works without a backend. The real services POST multipart to
 * the per-product documents endpoint (see the `real*Service` impls).
 */

/** Logical slot a document fills. Extensible per-flow — keep the common ones typed. */
export type DocumentType =
  | 'kyc_pan'
  | 'kyc_aadhaar'
  | 'selfie'
  | 'gold_photo_front'
  | 'gold_photo_detail'
  | 'ornament_photo'
  | 'bank_proof'
  | 'address_proof'
  | 'income_proof'
  | 'property_document'
  | 'other';

export type DocumentUploadStatus = 'uploaded' | 'failed';

export interface DocumentUploadResult {
  documentId: string;
  applicationId: string;
  /** The logical slot this document filled (echoed back). */
  type: string;
  /** Hosted URL the backend (or mock) assigned to the stored file. */
  url: string;
  status: DocumentUploadStatus;
  uploadedAt: string;
}
