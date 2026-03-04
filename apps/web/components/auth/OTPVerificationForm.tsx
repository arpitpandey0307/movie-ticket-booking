'use client';

import { useState, useEffect } from 'react';
import OTPInput from './OTPInput';

interface OTPVerificationFormProps {
  onVerify: (otp: string) => Promise<void>;
  onResend: () => Promise<void>;
  expiryMinutes?: number;
  title?: string;
  description?: string;
}

export default function OTPVerificationForm({
  onVerify,
  onResend,
  expiryMinutes = 10,
  title = 'Verify Your Email',
  description = 'Enter the 6-digit code sent to your email',
}: OTPVerificationFormProps) {
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [timeLeft, setTimeLeft] = useState(expiryMinutes * 60); // in seconds
  const [canResend, setCanResend] = useState(false);
  const [resending, setResending] = useState(false);

  // Countdown timer
  useEffect(() => {
    if (timeLeft <= 0) {
      setCanResend(true);
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    
    if (otp.length !== 6) {
      setError('Please enter all 6 digits');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await onVerify(otp);
    } catch (err: any) {
      setError(err.message || 'Invalid verification code');
      setOtp(''); // Clear OTP on error
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    setError('');

    try {
      await onResend();
      setTimeLeft(expiryMinutes * 60); // Reset timer
      setCanResend(false);
      setOtp(''); // Clear OTP
    } catch (err: any) {
      setError(err.message || 'Failed to resend code');
    } finally {
      setResending(false);
    }
  };

  // Auto-submit when all digits are entered
  useEffect(() => {
    if (otp.length === 6 && !loading) {
      handleSubmit();
    }
  }, [otp]);

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-6">
          <div className="mx-auto w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
            <svg
              className="w-8 h-8 text-indigo-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{title}</h2>
          <p className="text-gray-600">{description}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <OTPInput
              value={otp}
              onChange={setOtp}
              disabled={loading || timeLeft === 0}
              error={!!error}
            />
            {error && (
              <p className="mt-2 text-sm text-red-600 text-center">{error}</p>
            )}
          </div>

          <div className="text-center">
            {timeLeft > 0 ? (
              <p className="text-sm text-gray-600">
                Code expires in{' '}
                <span className="font-semibold text-indigo-600">
                  {formatTime(timeLeft)}
                </span>
              </p>
            ) : (
              <p className="text-sm text-red-600 font-semibold">
                Code expired
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || otp.length !== 6 || timeLeft === 0}
            className="w-full bg-indigo-600 text-white py-3 px-4 rounded-lg font-semibold
                     hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2
                     disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg
                  className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Verifying...
              </span>
            ) : (
              'Verify Code'
            )}
          </button>

          <div className="text-center">
            <button
              type="button"
              onClick={handleResend}
              disabled={!canResend || resending}
              className="text-sm text-indigo-600 hover:text-indigo-700 font-medium
                       disabled:text-gray-400 disabled:cursor-not-allowed"
            >
              {resending ? 'Sending...' : "Didn't receive code? Resend"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
