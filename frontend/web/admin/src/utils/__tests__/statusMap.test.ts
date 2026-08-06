import { describe, expect, it } from 'vitest';
import { statusLabel, toBackendStatus, toDisplayStatus } from '../statusMap';

describe('statusMap', () => {
  it('maps backend statuses to their correct display states', () => {
    expect(toDisplayStatus('KYC_REJECTED')).toBe('CREDIT_REJECTED');
    expect(toDisplayStatus('NPA')).toBe('NPA');
    expect(toDisplayStatus('WRITTEN_OFF')).toBe('CLOSED');
  });

  it('maps display filters back to all matching backend statuses', () => {
    expect(toBackendStatus('CREDIT_PENDING')).toContain('PROPERTY_ASSESSMENT');
    expect(toBackendStatus('CLOSED')).toEqual(['CLOSED', 'WRITTEN_OFF']);
    expect(statusLabel.ESIGN_PENDING).toBe('eSign Pending');
  });
});
