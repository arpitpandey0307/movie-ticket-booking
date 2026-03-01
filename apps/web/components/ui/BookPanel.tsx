'use client';

import { useAuthStore } from '@/store/auth.store';
import { useSeatLockStore } from '@/store/seat-lock.store';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

type BookPanelProps = {
  selectedSeats: string[];
  showtimeId: string;
  onLockSuccess: () => void;
};

export function BookPanel({ selectedSeats, showtimeId, onLockSuccess }: BookPanelProps) {
  const { isAuthenticated, token } = useAuthStore();
  const { locks, isExpired, clearLocks } = useSeatLockStore();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const hasActiveLocks = locks.length > 0 && !isExpired();

  const handleProceed = async () => {
    if (!isAuthenticated) {
      alert('Please login to continue');
      router.push('/login');
      return;
    }

    if (selectedSeats.length === 0) {
      alert('Please select at least one seat');
      return;
    }

    // Check if locks expired
    if (hasActiveLocks && isExpired()) {
      alert('Your seat reservation has expired. Please reselect seats.');
      clearLocks();
      onLockSuccess();
      return;
    }

    setLoading(true);

    try {
      // Step 1: Create booking (locks should already exist)
      const bookingRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify({
          showtimeId,
          showtimeSeatIds: selectedSeats,
        }),
      });

      if (!bookingRes.ok) {
        const error = await bookingRes.json();
        
        // Check if error is due to expired locks
        if (error.message?.includes('expired') || error.message?.includes('Lock')) {
          alert('Your seat reservation has expired. Please reselect seats.');
          clearLocks();
          onLockSuccess();
          setLoading(false);
          return;
        }

        alert(`Failed to create booking: ${error.message || error.error || 'Unknown error'}`);
        setLoading(false);
        return;
      }

      const { booking } = await bookingRes.json();

      // Clear locks from store
      clearLocks();

      // Redirect to booking page
      router.push(`/booking/${booking.id}`);
    } catch (error) {
      alert('Network error - failed to process booking');
      console.error(error);
      setLoading(false);
    }
  };

  // Disable button if locks expired
  const isDisabled = selectedSeats.length === 0 || loading || (hasActiveLocks && isExpired());

  return (
    <div className="mt-8 p-6 bg-white rounded-lg shadow-md">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">Selected Seats</p>
          <p className="text-2xl font-bold text-gray-900">{selectedSeats.length}</p>
        </div>
        <button
          onClick={handleProceed}
          disabled={isDisabled}
          className="bg-black text-white px-8 py-3 rounded-lg font-semibold hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Processing...' : isAuthenticated ? 'Proceed to Payment' : 'Login to Continue'}
        </button>
      </div>
    </div>
  );
}
