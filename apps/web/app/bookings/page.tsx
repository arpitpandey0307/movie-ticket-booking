'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';

interface Booking {
  id: string;
  bookingCode: string;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED';
  totalAmount: number;
  createdAt: string;
  showtime: {
    startTime: string;
    movie: {
      title: string;
      posterUrl: string;
    };
    screen: {
      name: string;
      theater: {
        name: string;
        city: string;
      };
    };
  };
  bookingSeats: Array<{
    showtimeSeat: {
      seat: {
        row: string;
        number: number;
      };
    };
  }>;
  payment?: {
    status: string;
  };
}

export default function BookingsPage() {
  const router = useRouter();
  const { token, user } = useAuthStore();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      router.push('/login?redirect=/bookings');
      return;
    }

    fetchBookings();
  }, [token, router]);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/bookings`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch bookings');
      }

      const data = await response.json();
      setBookings(data.bookings);
    } catch (err: any) {
      setError(err.message || 'Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      CONFIRMED: 'bg-green-100 text-green-800',
      PENDING: 'bg-yellow-100 text-yellow-800',
      CANCELLED: 'bg-red-100 text-red-800',
    };

    return (
      <span
        className={`px-3 py-1 rounded-full text-xs font-semibold ${
          styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-800'
        }`}
      >
        {status}
      </span>
    );
  };

  const formatSeats = (seats: Booking['bookingSeats']) => {
    return seats
      .map((bs) => `${bs.showtimeSeat.seat.row}${bs.showtimeSeat.seat.number}`)
      .join(', ');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your bookings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Bookings</h1>
          <p className="text-gray-600 mt-2">
            View and manage your movie ticket bookings
          </p>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && bookings.length === 0 && (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"
              />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900">
              No bookings yet
            </h3>
            <p className="mt-2 text-gray-500">
              Start by browsing movies and booking your first show!
            </p>
            <button
              onClick={() => router.push('/')}
              className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Browse Movies
            </button>
          </div>
        )}

        {/* Bookings List */}
        <div className="space-y-4">
          {bookings.map((booking) => (
            <div
              key={booking.id}
              className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => router.push(`/booking/${booking.id}`)}
            >
              <div className="p-6">
                <div className="flex items-start justify-between">
                  {/* Left: Movie Info */}
                  <div className="flex gap-4 flex-1">
                    <img
                      src={booking.showtime.movie.posterUrl}
                      alt={booking.showtime.movie.title}
                      className="w-20 h-28 object-cover rounded"
                    />
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {booking.showtime.movie.title}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        {booking.showtime.screen.theater.name},{' '}
                        {booking.showtime.screen.theater.city}
                      </p>
                      <p className="text-sm text-gray-600">
                        {booking.showtime.screen.name}
                      </p>
                      <div className="mt-3 flex items-center gap-4 text-sm">
                        <span className="text-gray-700">
                          <strong>Date:</strong>{' '}
                          {formatDate(booking.showtime.startTime)}
                        </span>
                        <span className="text-gray-700">
                          <strong>Time:</strong>{' '}
                          {formatTime(booking.showtime.startTime)}
                        </span>
                      </div>
                      <div className="mt-2 text-sm text-gray-700">
                        <strong>Seats:</strong> {formatSeats(booking.bookingSeats)}
                      </div>
                    </div>
                  </div>

                  {/* Right: Status & Details */}
                  <div className="text-right">
                    <div className="mb-3">{getStatusBadge(booking.status)}</div>
                    <p className="text-sm text-gray-600 mb-1">
                      Booking Code
                    </p>
                    <p className="text-lg font-mono font-semibold text-gray-900">
                      {booking.bookingCode}
                    </p>
                    <p className="text-2xl font-bold text-gray-900 mt-3">
                      ${(booking.totalAmount / 100).toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {booking.bookingSeats.length}{' '}
                      {booking.bookingSeats.length === 1 ? 'ticket' : 'tickets'}
                    </p>
                  </div>
                </div>

                {/* Footer: Booked Date */}
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-xs text-gray-500">
                    Booked on {formatDate(booking.createdAt)} at{' '}
                    {formatTime(booking.createdAt)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
