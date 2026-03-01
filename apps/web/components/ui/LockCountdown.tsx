'use client';

import { useEffect, useState } from 'react';
import { useSeatLockStore } from '@/store/seat-lock.store';

interface LockCountdownProps {
  onExpiry: () => void;
}

export function LockCountdown({ onExpiry }: LockCountdownProps) {
  const { lockExpiryTimestamp, isExpired } = useSeatLockStore();
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [hasExpired, setHasExpired] = useState(false);

  useEffect(() => {
    if (!lockExpiryTimestamp) {
      setTimeRemaining(0);
      return;
    }

    // Initial calculation
    const remaining = lockExpiryTimestamp - Date.now();
    setTimeRemaining(Math.max(0, remaining));

    // Set up interval to update every second
    const interval = setInterval(() => {
      const now = Date.now();
      const remaining = lockExpiryTimestamp - now;

      if (remaining <= 0) {
        setTimeRemaining(0);
        if (!hasExpired) {
          setHasExpired(true);
          onExpiry();
        }
        clearInterval(interval);
      } else {
        setTimeRemaining(remaining);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [lockExpiryTimestamp, onExpiry, hasExpired]);

  if (!lockExpiryTimestamp || timeRemaining === 0) {
    return null;
  }

  const minutes = Math.floor(timeRemaining / 60000);
  const seconds = Math.floor((timeRemaining % 60000) / 1000);

  const isUrgent = timeRemaining < 120000; // Less than 2 minutes

  return (
    <div
      className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
        isUrgent
          ? 'bg-red-50 border-2 border-red-500 animate-pulse'
          : 'bg-blue-50 border-2 border-blue-500'
      }`}
    >
      <svg
        className={`w-5 h-5 ${isUrgent ? 'text-red-600' : 'text-blue-600'}`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <div>
        <p className={`text-sm font-semibold ${isUrgent ? 'text-red-800' : 'text-blue-800'}`}>
          Seats reserved for:
        </p>
        <p className={`text-2xl font-mono font-bold ${isUrgent ? 'text-red-900' : 'text-blue-900'}`}>
          {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
        </p>
      </div>
    </div>
  );
}
