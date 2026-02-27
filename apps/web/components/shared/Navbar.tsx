'use client';

import Link from 'next/link';
import { useAuthStore } from '@/store/auth.store';
import { useRouter } from 'next/navigation';

export default function Navbar() {
  const { isAuthenticated, user, logout } = useAuthStore();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <nav className="bg-indigo-600 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="text-xl font-bold">
              🎬 MovieBooking
            </Link>
            <div className="ml-10 flex items-center space-x-4">
              <Link href="/movies" className="hover:text-indigo-200">
                Movies
              </Link>
              {isAuthenticated && user?.role === 'ADMIN' && (
                <Link href="/admin" className="hover:text-indigo-200">
                  Admin
                </Link>
              )}
              {isAuthenticated && user?.role === 'THEATER_OWNER' && (
                <Link href="/theater-owner" className="hover:text-indigo-200">
                  My Theaters
                </Link>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {isAuthenticated ? (
              <>
                <span className="text-sm">
                  {user?.firstName} {user?.lastName}
                </span>
                <Link href="/bookings" className="hover:text-indigo-200">
                  My Bookings
                </Link>
                <button
                  onClick={handleLogout}
                  className="bg-indigo-700 hover:bg-indigo-800 px-4 py-2 rounded-md"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="hover:text-indigo-200">
                  Login
                </Link>
                <Link
                  href="/signup"
                  className="bg-indigo-700 hover:bg-indigo-800 px-4 py-2 rounded-md"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
