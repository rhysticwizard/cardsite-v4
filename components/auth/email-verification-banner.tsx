'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, Mail, X, CheckCircle } from 'lucide-react';
import { useSession } from 'next-auth/react';

// Compact notification component for the dropdown
export function EmailVerificationNotification() {
  const { data: session } = useSession();
  const [isHidden, setIsHidden] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Don't show if user is verified, not signed in, or notification is hidden
  if (!session?.user || session.user.emailVerified || isHidden) {
    return null;
  }

  const handleResendEmail = async () => {
    if (!session.user.email) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/send-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: session.user.email }),
      });

      const result = await response.json();

      if (response.ok) {
        setIsSuccess(true);
        setTimeout(() => setIsSuccess(false), 5000); // Hide success message after 5 seconds
      } else {
        setError(result.error || 'Failed to send verification email');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="px-3 py-2 bg-green-50 border border-green-200 rounded-md mb-2">
        <div className="flex items-center space-x-2">
          <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-green-800">Verification email sent!</p>
            <p className="text-xs text-green-700">Check your inbox for the link.</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsHidden(true)}
            className="text-green-600 hover:text-green-800 p-1 h-auto"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-3 py-2 bg-blue-50 border border-blue-200 rounded-md mb-2">
      <div className="flex items-start space-x-2">
        <Mail className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-blue-800">Please verify your email</p>
          <p className="text-xs text-blue-700 mb-2">Check your inbox or resend verification.</p>
          {error && (
            <p className="text-xs text-red-600 mb-1">{error}</p>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleResendEmail}
            disabled={isLoading}
            className="text-blue-600 border-blue-300 hover:bg-blue-100 text-xs h-6 px-2"
          >
            {isLoading ? 'Sending...' : 'Resend'}
          </Button>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsHidden(true)}
          className="text-blue-600 hover:text-blue-800 p-1 h-auto"
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

// Original banner component (for backward compatibility)
export function EmailVerificationBanner() {
  const { data: session } = useSession();
  const [isHidden, setIsHidden] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Don't show if user is verified, not signed in, or banner is hidden
  if (!session?.user || session.user.emailVerified || isHidden) {
    return null;
  }

  const handleResendEmail = async () => {
    if (!session.user.email) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/send-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: session.user.email }),
      });

      const result = await response.json();

      if (response.ok) {
        setIsSuccess(true);
        setTimeout(() => setIsSuccess(false), 5000); // Hide success message after 5 seconds
      } else {
        setError(result.error || 'Failed to send verification email');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="bg-green-50 border-b border-green-200 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <div>
              <p className="text-sm font-medium text-green-800">
                Verification email sent!
              </p>
              <p className="text-sm text-green-700">
                Check your inbox and click the link to verify your account.
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsHidden(true)}
            className="text-green-600 hover:text-green-800"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-blue-50 border-b border-blue-200 px-4 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Mail className="h-5 w-5 text-blue-600" />
          <div>
            <p className="text-sm font-medium text-blue-800">
              Please verify your email address
            </p>
            <p className="text-sm text-blue-700">
              Check your inbox for a verification link, or click to resend.
            </p>
            {error && (
              <p className="text-sm text-red-600 mt-1">{error}</p>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleResendEmail}
            disabled={isLoading}
            className="text-blue-600 border-blue-300 hover:bg-blue-100"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600 mr-1"></div>
                Sending...
              </>
            ) : (
              'Resend email'
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsHidden(true)}
            className="text-blue-600 hover:text-blue-800"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
} 