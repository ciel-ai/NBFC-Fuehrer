import { useState, useRef, useEffect, useCallback } from 'react';
import { OTP_RESEND_TIMER } from '@/src/core/utils/constants';

interface OTPTimerResult {
  secondsLeft: number;
  canResend: boolean;
  restart: () => void;
}

export function useOTPTimer(
  initialSeconds: number = OTP_RESEND_TIMER
): OTPTimerResult {
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds);

const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);  const initialRef = useRef(initialSeconds);

  // ✅ Always clear safely
  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // ✅ Start timer (safe, no duplicates)
  const startTimer = useCallback((seconds: number) => {
    clearTimer();

    setSecondsLeft(seconds);

    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearTimer();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [clearTimer]);

  // ✅ Run only once on mount
  useEffect(() => {
    startTimer(initialRef.current);

    return () => {
      clearTimer();
    };
  }, [startTimer, clearTimer]);

  // ✅ Stable restart (no dependency issues)
  const restart = useCallback(() => {
    startTimer(initialRef.current);
  }, [startTimer]);

  return {
    secondsLeft,
    canResend: secondsLeft === 0,
    restart,
  };
}
