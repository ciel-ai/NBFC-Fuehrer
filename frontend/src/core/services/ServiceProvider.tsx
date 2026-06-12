import React, { createContext, useContext, useMemo } from 'react';

import type { ILoanService } from './interfaces/ILoanService';
import type { IAuthService } from './interfaces/IAuthService';
import type { IKYCService } from './interfaces/IKYCService';
import type { IPaymentService } from './interfaces/IPaymentService';
import type { INotificationService } from './interfaces/INotificationService';
import type { IProfileService } from './interfaces/IProfileService';
import type { IEMIService } from './interfaces/IEMIService';
import type { IGoldLoanService } from './interfaces/IGoldLoanService';
import type { IConsumerDurableLoanService } from './interfaces/IConsumerDurableLoanService';
import type { IHousingLoanService } from './interfaces/IHousingLoanService';
import type { ISalesService } from './interfaces/ISalesService';

import { mockLoanService } from './mocks/mockLoanService';
import { mockAuthService } from './mocks/mockAuthService';
import { mockKYCService } from './mocks/mockKYCService';
import { mockPaymentService } from './mocks/mockPaymentService';
import { mockNotificationService } from './mocks/mockNotificationService';
import { mockProfileService } from './mocks/mockProfileService';
import { mockEMIService } from './mocks/mockEMIService';
import { mockGoldLoanService } from './mocks/mockGoldLoanService';
import { mockConsumerDurableLoanService } from './mocks/mockConsumerDurableLoanService';
import { mockHousingLoanService } from './mocks/mockHousingLoanService';
import { mockSalesService } from './mocks/mockSalesService';

import { realLoanService } from './real/realLoanService';
import { realAuthService } from './real/realAuthService';
import { realKYCService } from './real/realKYCService';
import { realPaymentService } from './real/realPaymentService';
import { realNotificationService } from './real/realNotificationService';
import { realProfileService } from './real/realProfileService';
import { realEMIService } from './real/realEMIService';
import { realGoldLoanService } from './real/realGoldLoanService';
import { realConsumerDurableLoanService } from './real/realConsumerDurableLoanService';
import { realHousingLoanService } from './real/realHousingLoanService';
import { realSalesService } from './real/realSalesService';

import { USE_MOCK } from '../utils/constants';

interface ServiceContextType {
  loanService: ILoanService;
  authService: IAuthService;
  kycService: IKYCService;
  paymentService: IPaymentService;
  notificationService: INotificationService;
  profileService: IProfileService;
  emiService: IEMIService;
  goldLoanService: IGoldLoanService;
  consumerDurableLoanService: IConsumerDurableLoanService;
  housingLoanService: IHousingLoanService;
  salesService: ISalesService;
}

// Initialized as null to prevent silent bugs when consumed outside the provider.
const ServiceContext = createContext<ServiceContextType | null>(null);

interface ServiceProviderProps {
  children: React.ReactNode;
  /** Override specific services for testing or edge cases. */
  services?: Partial<ServiceContextType>;
}

export const ServiceProvider: React.FC<ServiceProviderProps> = ({ children, services }) => {
  const useMock = USE_MOCK;

  const defaultServices = useMemo<ServiceContextType>(
    () => ({
      loanService:         useMock ? mockLoanService         : realLoanService,
      authService:         useMock ? mockAuthService         : realAuthService,
      kycService:          useMock ? mockKYCService          : realKYCService,
      paymentService:      useMock ? mockPaymentService      : realPaymentService,
      notificationService: useMock ? mockNotificationService : realNotificationService,
      profileService:      useMock ? mockProfileService      : realProfileService,
      emiService:          useMock ? mockEMIService          : realEMIService,
      goldLoanService:     useMock ? mockGoldLoanService     : realGoldLoanService,
      consumerDurableLoanService: useMock ? mockConsumerDurableLoanService : realConsumerDurableLoanService,
      housingLoanService:  useMock ? mockHousingLoanService  : realHousingLoanService,
      salesService:        useMock ? mockSalesService        : realSalesService,
    }),
    [useMock],
  );

  const value = useMemo(
    () => ({ ...defaultServices, ...services }),
    [defaultServices, services],
  );

  return (
    <ServiceContext.Provider value={value}>
      {children}
    </ServiceContext.Provider>
  );
};

// Custom hook with strict null check.
export const useServices = (): ServiceContextType => {
  const context = useContext(ServiceContext);
  if (!context) {
    throw new Error(
      'useServices must be used within a ServiceProvider. Did you forget to wrap your app tree?',
    );
  }
  return context;
};
