import { create } from 'zustand';

interface SeatLock {
  id: string;
  showtimeSeatId: string;
  expiresAt: string;
}

interface SeatLockState {
  locks: SeatLock[];
  lockExpiryTimestamp: number | null;
  setLocks: (locks: SeatLock[]) => void;
  clearLocks: () => void;
  isExpired: () => boolean;
}

export const useSeatLockStore = create<SeatLockState>((set, get) => ({
  locks: [],
  lockExpiryTimestamp: null,

  setLocks: (locks: SeatLock[]) => {
    if (locks.length === 0) {
      set({ locks: [], lockExpiryTimestamp: null });
      return;
    }

    // Find earliest expiry (all locks should have same expiry, but be defensive)
    const earliestExpiry = locks.reduce((earliest, lock) => {
      const lockExpiry = new Date(lock.expiresAt).getTime();
      return lockExpiry < earliest ? lockExpiry : earliest;
    }, new Date(locks[0].expiresAt).getTime());

    set({
      locks,
      lockExpiryTimestamp: earliestExpiry,
    });
  },

  clearLocks: () => {
    set({ locks: [], lockExpiryTimestamp: null });
  },

  isExpired: () => {
    const { lockExpiryTimestamp } = get();
    if (!lockExpiryTimestamp) return false;
    return Date.now() >= lockExpiryTimestamp;
  },
}));
