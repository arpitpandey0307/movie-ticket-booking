'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { SeatGrid } from '@/components/ui/SeatGrid';
import { BookPanel } from '@/components/ui/BookPanel';
import { LockCountdown } from '@/components/ui/LockCountdown';
import { useAuthStore } from '@/store/auth.store';
import { useSeatLockStore } from '@/store/seat-lock.store';

export default function ShowtimePage() {
  const { id } = useParams();
  const router = useRouter();
  const { token } = useAuthStore();
  const { setLocks, clearLocks, locks } = useSeatLockStore();
  
  const [showtime, setShowtime] = useState<any>(null);
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [lockingSeats, setLockingSeats] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expiryMessage, setExpiryMessage] = useState<string | null>(null);

  const fetchShowtime = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/showtimes/${id}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch showtime');
      }
      
      const data = await response.json();
      setShowtime(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Fetch user's active locks on mount (page refresh recovery)
  const fetchUserLocks = async () => {
    if (!token) return;

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/seat-locks/my-locks`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.locks && data.locks.length > 0) {
          // Filter locks for this showtime
          const showtimeLocks = data.locks.filter((lock: any) => {
            // Check if lock belongs to this showtime
            return showtime?.showtimeSeats.some((seat: any) => seat.id === lock.showtimeSeatId);
          });

          if (showtimeLocks.length > 0) {
            setLocks(showtimeLocks);
            // Set selected seats based on locks
            setSelectedSeats(showtimeLocks.map((lock: any) => lock.showtimeSeatId));
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch user locks:', err);
    }
  };

  useEffect(() => {
    if (id) {
      fetchShowtime();
    }
  }, [id]);

  useEffect(() => {
    if (showtime && token) {
      fetchUserLocks();
    }
  }, [showtime, token]);

  const handleLockSeats = async () => {
    if (!token) {
      alert('Please login to continue');
      router.push('/login');
      return;
    }

    if (selectedSeats.length === 0) {
      alert('Please select at least one seat');
      return;
    }

    setLockingSeats(true);
    setExpiryMessage(null);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/seat-locks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          showtimeSeatIds: selectedSeats,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        alert(`Failed to lock seats: ${error.message || error.error || 'Unknown error'}`);
        setLockingSeats(false);
        return;
      }

      const data = await response.json();
      setLocks(data.locks);
      fetchShowtime(); // Refresh to show locked seats
    } catch (err) {
      alert('Network error - failed to lock seats');
      console.error(err);
    } finally {
      setLockingSeats(false);
    }
  };

  const handleExpiry = () => {
    setExpiryMessage('Your seat reservation expired. Please reselect seats.');
    clearLocks();
    setSelectedSeats([]);
    fetchShowtime(); // Refresh to show seats as available again
  };

  const handleLockSuccess = () => {
    clearLocks();
    setSelectedSeats([]);
    setExpiryMessage(null);
    fetchShowtime();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading showtime...</p>
        </div>
      </div>
    );
  }

  if (error || !showtime) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 text-lg">{error || 'Showtime not found'}</p>
          <button
            onClick={() => router.push('/')}
            className="mt-4 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const hasActiveLocks = locks.length > 0;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <button
            onClick={() => router.back()}
            className="text-indigo-600 hover:text-indigo-800 mb-4 flex items-center gap-2"
          >
            ← Back
          </button>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{showtime.movie.title}</h1>
          <div className="text-gray-600 space-y-1">
            <p className="font-semibold">{showtime.screen.theater.name}</p>
            <p>{showtime.screen.name}</p>
            <p>
              {formatDate(showtime.startTime)} at {formatTime(showtime.startTime)}
            </p>
          </div>
        </div>

        {/* Countdown Timer */}
        {hasActiveLocks && (
          <div className="mb-8">
            <LockCountdown onExpiry={handleExpiry} />
          </div>
        )}

        {/* Expiry Message */}
        {expiryMessage && (
          <div className="mb-8 bg-red-50 border-2 border-red-500 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <svg
                className="w-6 h-6 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="text-red-800 font-semibold">{expiryMessage}</p>
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Seat Legend</h2>
          <div className="flex flex-wrap gap-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-green-500 rounded"></div>
              <span className="text-sm text-gray-700">Available</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded"></div>
              <span className="text-sm text-gray-700">Selected</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-yellow-400 rounded"></div>
              <span className="text-sm text-gray-700">Locked</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gray-400 rounded"></div>
              <span className="text-sm text-gray-700">Booked</span>
            </div>
          </div>
        </div>

        {/* Seat Grid */}
        <div className="bg-white rounded-lg shadow-md p-8 mb-8">
          <div className="mb-6 text-center">
            <div className="inline-block bg-gray-800 text-white px-12 py-2 rounded-t-lg">
              SCREEN
            </div>
          </div>
          <SeatGrid
            seats={showtime.showtimeSeats}
            selectedSeats={selectedSeats}
            setSelectedSeats={setSelectedSeats}
          />
        </div>

        {/* Lock Seats Button (only show if no active locks) */}
        {!hasActiveLocks && selectedSeats.length > 0 && (
          <div className="mb-8">
            <button
              onClick={handleLockSeats}
              disabled={lockingSeats}
              className="w-full bg-indigo-600 text-white px-8 py-4 rounded-lg font-semibold hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {lockingSeats ? 'Locking Seats...' : `Lock ${selectedSeats.length} Seat${selectedSeats.length > 1 ? 's' : ''}`}
            </button>
          </div>
        )}

        {/* Book Panel (only show if locks are active) */}
        {hasActiveLocks && (
          <BookPanel 
            selectedSeats={selectedSeats} 
            showtimeId={id as string}
            onLockSuccess={handleLockSuccess} 
          />
        )}
      </div>
    </div>
  );
}
