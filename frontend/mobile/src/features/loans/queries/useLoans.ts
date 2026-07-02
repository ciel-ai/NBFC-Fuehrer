import { useQuery } from '@tanstack/react-query';
import { useServices } from '@/src/core/services/ServiceProvider';
import type { Loan } from '@/src/entities/loan';

export function useLoans() {
  const { loanService } = useServices();

  return useQuery<Loan[], Error>({
    queryKey: ['activeLoans'],
    queryFn: () => loanService.getActiveLoans(),
  });
}
