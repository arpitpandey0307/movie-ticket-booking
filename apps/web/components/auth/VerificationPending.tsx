'use client';

import Link from 'next/link';

interface VerificationPendingProps {
  email: string;
  onResend?: () => Promise<void>;
}

export default function VerificationPending({
  email,
  onResend,
}: VerificationPendingProps) {
  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
            <svg
              className="w-8 h-8 text-yellow-600"
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
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Verification Pending
          </h2>
          <p className="text-gray-600 mb-6">
            We've sent a verification code to <strong>{email}</strong>. Please check
            your inbox and verify your email to continue.
          </p>
          <Link
            href="/verify-email"
            className="inline-block bg-indigo-600 text-white py-3 px-6 rounded-lg font-semibold
                     hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2
                     transition-colors"
          >
            Verify Email Now
          </Link>
        </div>
      </div>
    </div>
  );
}
