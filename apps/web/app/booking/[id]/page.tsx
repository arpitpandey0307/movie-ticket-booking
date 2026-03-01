'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';

export default function BookingPage() {
  const { id } = useParams();
  const router = useRouter();
  const { token } = useAuthStore();
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handlePayment = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/payments/create-intent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify({ bookingId: id }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        alert(`Payment failed: ${errorData.error || errorData.message || 'Unknown error'}`);
        setLoading(false);
        return;
      }

      const { clientSecret } = await response.json();

      // Redirect to Stripe payment page (using test mode URL)
      // In production, you'd use Stripe Elements or Checkout
      alert(`Payment Intent Created!\n\nClient Secret: ${clientSecret}\n\nIn production, this would redirect to Stripe payment UI.\n\nFor now, use Stripe CLI to simulate webhook:\nstripe trigger payment_intent.succeeded`);
      
      setLoading(false);
    } catch (err) {
      alert('Network error - failed to initiate payment');
      console.error(err);
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchBooking = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/bookings/${id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error('Failed to fetch booking');
        }

        const { booking: bookingData } = await response.json();
        setBooking(bookingData);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    if (id && token) {
      fetchBooking();
    }
  }, [id, token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading booking...</p>
        </div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 text-lg">{error || 'Booking not found'}</p>
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

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-gray-900">Booking Confirmation</h1>
            <span
              className={`px-4 py-2 rounded-full text-sm font-semibold ${
                booking.status === 'PENDING'
                  ? 'bg-yellow-100 text-yellow-800'
                  : booking.status === 'CONFIRMED'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
              }`}
            >
              {booking.status}
            </span>
          </div>
          <p className="text-gray-600">Booking Code: <span className="font-mono font-bold">{booking.bookingCode}</span></p>
        </div>

        {/* Movie Details */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Movie Details</h2>
          <div className="space-y-2 text-gray-700">
            <p><span className="font-semibold">Movie:</span> {booking.showtime.movie.title}</p>
            <p><span className="font-semibold">Theater:</span> {booking.showtime.screen.theater.name}</p>
            <p><span className="font-semibold">Screen:</span> {booking.showtime.screen.name}</p>
            <p>
              <span className="font-semibold">Date & Time:</span> {formatDate(booking.showtime.startTime)} at{' '}
              {formatTime(booking.showtime.startTime)}
            </p>
          </div>
        </div>

        {/* Seats */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Selected Seats</h2>
          <div className="flex flex-wrap gap-3">
            {booking.bookingSeats.map((bs: any) => (
              <div
                key={bs.id}
                className="px-4 py-2 bg-indigo-100 text-indigo-800 rounded-lg font-semibold"
              >
                {bs.showtimeSeat.seat.rowLabel}{bs.showtimeSeat.seat.seatNumber}
              </div>
            ))}
          </div>
          <p className="mt-4 text-gray-600">
            Total Seats: <span className="font-bold">{booking.bookingSeats.length}</span>
          </p>
        </div>

        {/* Payment Summary */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Payment Summary</h2>
          <div className="space-y-2">
            {booking.bookingSeats.map((bs: any, index: number) => (
              <div key={bs.id} className="flex justify-between text-gray-700">
                <span>
                  Seat {bs.showtimeSeat.seat.rowLabel}{bs.showtimeSeat.seat.seatNumber} ({bs.showtimeSeat.seat.seatType})
                </span>
                <span>₹{bs.price}</span>
              </div>
            ))}
            <div className="border-t pt-2 mt-2 flex justify-between font-bold text-lg">
              <span>Total Amount</span>
              <span>₹{booking.totalAmount}</span>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="bg-white rounded-lg shadow-md p-6">
          {booking.status === 'PENDING' ? (
            <button
              onClick={handlePayment}
              disabled={loading}
              className="w-full bg-indigo-600 text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-indigo-700 disabled:bg-gray-400 transition-colors"
            >
              {loading ? 'Processing...' : 'Proceed to Payment'}
            </button>
          ) : booking.status === 'CONFIRMED' ? (
            <div className="text-center">
              <p className="text-green-600 font-semibold text-lg mb-4">✓ Booking Confirmed!</p>
              <button
                onClick={() => router.push('/')}
                className="px-8 py-3 bg-gray-200 text-gray-800 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
              >
                Back to Home
              </button>
            </div>
          ) : (
            <div className="text-center">
              <p className="text-red-600 font-semibold text-lg mb-4">Booking Cancelled</p>
              <button
                onClick={() => router.push('/')}
                className="px-8 py-3 bg-gray-200 text-gray-800 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
              >
                Back to Home
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
