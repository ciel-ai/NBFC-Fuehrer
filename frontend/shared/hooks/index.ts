// Common hooks (e.g. state timers, media queries, debounce, and query helpers)

import { useState, useEffect } from 'react';

export function useCountdown(initialSeconds: number, onExpire?: () => void) {
  const [seconds, setSeconds] = useState(initialSeconds);

  useEffect(() => {
    if (seconds <= 0) {
      if (onExpire) onExpire();
      return;
    }
    const timer = setInterval(() => {
      setSeconds((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [seconds, onExpire]);

  return {
    seconds,
    reset: (secs: number) => setSeconds(secs),
    isExpired: seconds === 0,
  };
}
