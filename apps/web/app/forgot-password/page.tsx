'use client';

import { useRouter } from 'next/navigation';
import ForgotPasswordForm from '@/components/auth/ForgotPasswordForm';
import { apiClient } from '@/lib/api-client';

export default function ForgotPasswordPage() {
  const router = useRouter();

  const handleSubmit = async (email: string) => {
    try {
      const response = await apiClient.post('/api/auth/forgot-password', {
        email,
      });

      if (response.data.success) {
        // Redirect to reset password page with email
        router.push(`/reset-password?email=${encodeURIComponent(email)}`);
      }
    } catch (err: any) {
      throw new Error(
        err.response?.data?.error?.message || 'Failed to send reset code'
      );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <ForgotPasswordForm onSubmit={handleSubmit} />
    </div>
  );
}
