import api from '../../api/api';
import type { IEMIService } from '../interfaces/IEMIService';
import type { Loan, EMISchedule, LoanSummary } from '@/src/entities/loan';

export const realEMIService: IEMIService = {
  async getEMISchedule(loanId: string): Promise<EMISchedule[]> {
    const response = await api.get<EMISchedule[]>(`/loans/${loanId}/emi`);
    return response.data;
  },

  async getActiveLoans(): Promise<Loan[]> {
    const response = await api.get<Loan[]>('/loans/active');
    return response.data;
  },

  async getLoanSummary(loanId: string): Promise<LoanSummary> {
    const response = await api.get<LoanSummary>(`/loans/${loanId}/summary`);
    return response.data;
  },
};
