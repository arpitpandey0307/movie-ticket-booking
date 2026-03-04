'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import OTPVerificationForm from '@/components/auth/OTPVerificationForm';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth.store';

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setAuth = useAuthStore((state) => state.setAuth);
  
  const userId = searchParams.get('userId');
  const email = searchParams.get('email');
  const type = searchParams.get('type') || 'signup'; // signup or login

  const [error, setError] = useState('');

  useEffect(() => {
    if (!userId) {
      router.push('/login');
    }
  }, [userId, router]);

  const handleVerify = async (otp: string) => {
    try {
      const endpoint =
        type === 'signup' ? '/api/auth/verify-signup' : '/api/auth/verify-login';

      const response = await apiClient.post(endpoint, {
        userId,
        otp,
      });

      if (response.data.success) {
        const { user, token } = response.data.data;
        setAuth(user, token);
        router.push('/');
      }
    } catch (err: any) {
      throw new Error(
        err.response?.data?.error?.message || 'Verification failed'
      );
    }
  };

  const handleResend = async () => {
    try {
      const response = await apiClient.post('/api/auth/resend-otp', {
        userId,
        type: type.toUpperCase(),
      });

      if (!response.data.success) {
        throw new Error('Failed to resend code');
      }
    } catch (err: any) {
      throw new Error(
        err.response?.data?.error?.message || 'Failed to resend code'
      );
    }
  };

  if (!userId) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <OTPVerificationForm
        onVerify={handleVerify}
        onResend={handleResend}
        title={type === 'signup' ? 'Verify Your Email' : 'Verify Your Login'}
        description={
          email
            ? `Enter the 6-digit code sent to ${email}`
            : 'Enter the 6-digit code sent to your email'
        }
      />
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading...</div>}>
      <VerifyEmailContent />
    </Suspense>
  );
}
