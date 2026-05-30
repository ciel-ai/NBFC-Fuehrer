import api from '../../api/api';
import type { ILoanService } from '../interfaces/ILoanService';
import type { Loan, EMISchedule, LoanApplication, ApplyLoanResponse } from '@/src/entities/loan';

export const realLoanService: ILoanService = {
  async getActiveLoans() {
    const response = await api.get<Loan[]>('/loans/active');
    return response.data;
  },

  async getLoanById(id) {
    const response = await api.get<Loan>(`/loans/${id}`);
    return response.data;
  },

  async getEMISchedule(loanId) {
    const response = await api.get<EMISchedule[]>(`/loans/${loanId}/emi`);
    return response.data;
  },

  async applyLoan(application) {
    const response = await api.post<ApplyLoanResponse>('/loans/apply', application);
    return response.data;
  },

  async registerGoldLoanNotification(userId) {
    await api.post('/loans/gold/notify', { userId });
  },
};
