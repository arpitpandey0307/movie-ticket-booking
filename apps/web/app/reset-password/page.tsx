'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import OTPVerificationForm from '@/components/auth/OTPVerificationForm';
import ResetPasswordForm from '@/components/auth/ResetPasswordForm';
import { apiClient } from '@/lib/api-client';

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const email = searchParams.get('email');
  const [step, setStep] = useState<'verify' | 'reset'>('verify');
  const [resetToken, setResetToken] = useState('');

  useEffect(() => {
    if (!email) {
      router.push('/forgot-password');
    }
  }, [email, router]);

  const handleVerifyOTP = async (otp: string) => {
    try {
      const response = await apiClient.post('/api/auth/verify-reset-otp', {
        email,
        otp,
      });

      if (response.data.success) {
        setResetToken(response.data.data.resetToken);
        setStep('reset');
      }
    } catch (err: any) {
      throw new Error(
        err.response?.data?.error?.message || 'Verification failed'
      );
    }
  };

  const handleResendOTP = async () => {
    try {
      const response = await apiClient.post('/api/auth/forgot-password', {
        email,
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

  const handleResetPassword = async (newPassword: string) => {
    try {
      const response = await apiClient.post('/api/auth/reset-password', {
        resetToken,
        newPassword,
      });

      if (!response.data.success) {
        throw new Error('Failed to reset password');
      }
    } catch (err: any) {
      throw new Error(
        err.response?.data?.error?.message || 'Failed to reset password'
      );
    }
  };

  if (!email) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      {step === 'verify' ? (
        <OTPVerificationForm
          onVerify={handleVerifyOTP}
          onResend={handleResendOTP}
          title="Verify Reset Code"
          description={`Enter the 6-digit code sent to ${email}`}
        />
      ) : (
        <ResetPasswordForm
          resetToken={resetToken}
          onSubmit={handleResetPassword}
        />
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading...</div>}>
      <ResetPasswordContent />
    </Suspense>
  );
}
