import axios from 'axios';
import { logger } from '../logger/logger';

export interface ParsedApiError {
  message: string;
  code?: string;
  status?: number;
  originalError: unknown;
}

export const parseApiError = (error: unknown): ParsedApiError => {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const data = error.response?.data as any;
    
    let message = data?.message || data?.error || error.message || 'An unexpected API error occurred';
    let code = data?.code || error.code;

    if (status === 401) {
      message = 'Your session has expired. Please log in again.';
      code = 'UNAUTHORIZED';
    } else if (status === 403) {
      message = 'You do not have permission to perform this action.';
      code = 'FORBIDDEN';
    } else if (status === 404) {
      message = 'The requested resource was not found.';
      code = 'NOT_FOUND';
    } else if (status && status >= 500) {
      message = 'We are experiencing server issues. Please try again later.';
      code = 'SERVER_ERROR';
    } else if (error.code === 'ECONNABORTED') {
      message = 'The request timed out. Please check your connection and try again.';
      code = 'TIMEOUT';
    }

    logger.error(`API Error [${status || code}]: ${message}`, { url: error.config?.url, method: error.config?.method });

    return {
      message,
      code,
      status,
      originalError: error,
    };
  }

  // Handle non-Axios errors (e.g., network disconnects caught by fetch, or random exceptions)
  const err = error as Error;
  logger.error('Non-API Error occurred', err);
  return {
    message: err?.message || 'An unknown error occurred',
    code: 'UNKNOWN_ERROR',
    originalError: error,
  };
};
