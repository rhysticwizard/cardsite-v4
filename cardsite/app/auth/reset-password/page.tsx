'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, Eye, EyeOff, CheckCircle, ArrowLeft, Loader2, Check, X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

// Enhanced Password Strength Component with HIBP (identical to signup page)
function PasswordStrength({ password }: { password: string }) {
  const [hibpResult, setHibpResult] = React.useState<{ isBreached: boolean; breachCount: number } | null>(null)
  const [isCheckingHibp, setIsCheckingHibp] = React.useState(false)
  const [hibpCheckCompleted, setHibpCheckCompleted] = React.useState(false)

  // Debounced HIBP check
  React.useEffect(() => {
    if (!password || password.length < 8) {
      setHibpResult(null)
      setHibpCheckCompleted(false)
      setIsCheckingHibp(false)
      return
    }

    // Show spinner immediately when 8+ characters
    setIsCheckingHibp(true)
    setHibpCheckCompleted(false)
    
    const timeoutId = setTimeout(async () => {
      try {
        const response = await fetch('/api/auth/check-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password })
        })
        
        if (response.ok) {
          const result = await response.json()
          setHibpResult({ isBreached: result.isBreached, breachCount: result.breachCount })
        } else {
          setHibpResult({ isBreached: false, breachCount: 0 })
        }
      } catch (error) {
        console.warn('HIBP check failed:', error)
        setHibpResult({ isBreached: false, breachCount: 0 })
      } finally {
        setIsCheckingHibp(false)
        setHibpCheckCompleted(true)
      }
    }, 1000)

    return () => clearTimeout(timeoutId)
  }, [password])

  if (!password) return null

  // Immediate validation for requirements
  const hasMinLength = password.length >= 8
  const hasUppercase = /[A-Z]/.test(password)
  const hasLowercase = /[a-z]/.test(password)
  const hasNumbers = /[0-9]/.test(password)
  const hasSpecialChars = /[@$!%*?&]/.test(password)

  const calculateStrength = (pwd: string) => {
    let score = 0
    const suggestions: string[] = []

    // Step 1: Calculate base complexity score (0-5 points)
    const hasMinLength = pwd.length >= 8
    const hasUppercase = /[A-Z]/.test(pwd)
    const hasLowercase = /[a-z]/.test(pwd)
    const hasNumbers = /[0-9]/.test(pwd)
    const hasSpecialChars = /[@$!%*?&]/.test(pwd)

    if (hasMinLength) score += 1
    else suggestions.push('Use at least 8 characters')

    if (hasUppercase) score += 1
    else suggestions.push('Add uppercase letters (A-Z)')

    if (hasLowercase) score += 1
    else suggestions.push('Add lowercase letters (a-z)')

    if (hasNumbers) score += 1
    else suggestions.push('Add numbers (0-9)')

    if (hasSpecialChars) score += 1
    else suggestions.push('Add special characters (@$!%*?&)')

    // Length bonus (max +1 point)
    if (pwd.length >= 12) score += 0.5
    if (pwd.length >= 16) score += 0.5

    // Step 2: Check for basic weak patterns (before HIBP)
    const universallyTerriblePasswords = ['password', '123456', 'qwerty', 'admin']
    const lowerPwd = pwd.toLowerCase()
    const isLocallyTerrible = universallyTerriblePasswords.some(terrible => lowerPwd === terrible)
    
    if (isLocallyTerrible) {
      suggestions.push('Choose a different password')
    }

    // Check for excessive repeated characters
    if (/(.)\1{3,}/.test(pwd)) {
      score -= 0.5
      suggestions.push('Avoid too many repeating characters')
    }

    // Step 3: Determine final status based on HIBP results
    let finalScore = score
    let isWeakDueToBreach = false

    if (hibpResult?.isBreached) {
      isWeakDueToBreach = true
      if (hibpResult.breachCount > 100000) {
        suggestions.push('This password is commonly used - choose a different one')
      } else {
        suggestions.push('Choose a less common password')
      }
    } else if (isLocallyTerrible) {
      isWeakDueToBreach = true
    }

    // If breached or locally terrible, cap at weak level
    if (isWeakDueToBreach) {
      finalScore = Math.min(finalScore, 1) // Max "Weak" level
    }

    finalScore = Math.max(0, Math.min(4, finalScore))

     // Step 4: Assign labels based on final score and breach status
     let label: string, color: string
     
     if (isWeakDueToBreach) {
       label = 'Weak'
       color = 'bg-red-500'
     } else if (finalScore >= 4) {
       label = 'Very Strong'
       color = 'bg-green-500'
     } else if (finalScore >= 3) {
       label = 'Strong'  
       color = 'bg-green-400'
     } else if (finalScore >= 2) {
       label = 'Moderate'
       color = 'bg-yellow-500'
     } else if (finalScore >= 1) {
       label = 'Weak'
       color = 'bg-orange-500'
     } else {
       label = 'Very Weak'
       color = 'bg-red-500'
     }

     return { score: finalScore, label, color, suggestions }
  }

  const strength = calculateStrength(password)

  // Only calculate final strength after HIBP check completes  
  const finalStrength = hibpCheckCompleted ? calculateStrength(password) : null

  return (
    <div className="mt-2 space-y-2">
      {/* Immediate Requirements Feedback */}
      <div className="text-xs text-gray-400 space-y-1">
        <div className="flex items-center justify-between">
          <span>Password Requirements</span>
          {isCheckingHibp && (
            <div className="flex items-center space-x-1">
              <div className="animate-spin h-3 w-3 border border-gray-400 border-t-transparent rounded-full"></div>
              <span className="text-xs">Checking security...</span>
            </div>
          )}
        </div>
        
        <div className="space-y-1">
          <div className={`flex items-center space-x-1 ${hasMinLength ? 'text-green-400' : 'text-gray-400'}`}>
            <span className="text-xs">{hasMinLength ? '✓' : '○'}</span>
            <span className="text-xs">At least 8 characters</span>
          </div>
          <div className={`flex items-center space-x-1 ${hasUppercase ? 'text-green-400' : 'text-gray-400'}`}>
            <span className="text-xs">{hasUppercase ? '✓' : '○'}</span>
            <span className="text-xs">Uppercase letter</span>
          </div>
          <div className={`flex items-center space-x-1 ${hasLowercase ? 'text-green-400' : 'text-gray-400'}`}>
            <span className="text-xs">{hasLowercase ? '✓' : '○'}</span>
            <span className="text-xs">Lowercase letter</span>
          </div>
          <div className={`flex items-center space-x-1 ${hasNumbers ? 'text-green-400' : 'text-gray-400'}`}>
            <span className="text-xs">{hasNumbers ? '✓' : '○'}</span>
            <span className="text-xs">Number</span>
          </div>
          <div className={`flex items-center space-x-1 ${hasSpecialChars ? 'text-green-400' : 'text-gray-400'}`}>
            <span className="text-xs">{hasSpecialChars ? '✓' : '○'}</span>
            <span className="text-xs">Special character (@$!%*?&)</span>
          </div>
        </div>
      </div>

      {/* Final Strength Assessment (only after HIBP completes) */}
      {finalStrength && (
        <div className="space-y-2 pt-2 border-t border-gray-700">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">Overall Strength</span>
            <span className={`text-xs font-medium ${
              finalStrength.score >= 3 ? 'text-green-400' : 
              finalStrength.score >= 2 ? 'text-yellow-400' : 
              'text-red-400'
            }`}>
              {finalStrength.label}
            </span>
          </div>
          
          <div className="grid grid-cols-4 gap-1">
            {Array.from({ length: 4 }, (_, index) => {
              const isActive = index < Math.ceil(finalStrength.score)
              return (
                <div
                  key={index}
                  className={`h-2 rounded-sm transition-colors duration-200 ${
                    isActive ? finalStrength.color : 'bg-gray-600'
                  }`}
                />
              )
            })}
          </div>
          
          {finalStrength.suggestions.length > 0 && (
            <div className="space-y-1">
              {finalStrength.suggestions.map((suggestion: string, index: number) => (
                <p key={index} className="text-xs text-gray-400">
                  • {suggestion}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const resetPasswordSchema = z.object({
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(64, 'Password must be less than 64 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, 
      'Password must contain: uppercase letter, lowercase letter, number, and special character (@$!%*?&)'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type ResetPasswordForm = z.infer<typeof resetPasswordSchema>;

function ResetPasswordContent() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  const router = useRouter();
  const searchParams = useSearchParams();

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<ResetPasswordForm>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const password = watch('password', '');

  useEffect(() => {
    const tokenParam = searchParams.get('token');
    if (!tokenParam) {
      setError('Invalid reset link. Please request a new password reset.');
      return;
    }
    setToken(tokenParam);
    
    // Skip verification for test token (development only)
    if (tokenParam === 'test-token-123' && process.env.NODE_ENV === 'development') {
      // Skip the verification step for testing UI
      return;
    }
  }, [searchParams]);

  const onSubmit = async (data: ResetPasswordForm) => {
    if (!token) {
      setError('Invalid reset token.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Handle test token (development only)
      if (token === 'test-token-123' && process.env.NODE_ENV === 'development') {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        setIsSuccess(true);
        return;
      }

      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          password: data.password,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setIsSuccess(true);
      } else {
        setError(result.error || 'Something went wrong. Please try again.');
      }
    } catch (err) {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-gray-900/95 border border-gray-800 shadow-2xl">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <CardTitle className="text-2xl font-bold text-white">Password reset successful</CardTitle>
            <CardDescription className="text-base text-gray-400">
              Your password has been updated. You can now sign in with your new password.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => router.push('/auth/signin')}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium py-3"
            >
              Continue to sign in
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!token && error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-black to-gray-900 p-4">
        <Card className="w-full max-w-md bg-gray-900/95 border border-gray-800 shadow-2xl">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-white">Invalid reset link</CardTitle>
            <CardDescription className="text-base text-gray-400">
              This password reset link is invalid or has expired.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-red-900/50 border border-red-800 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-4 w-4 text-red-400" />
                <p className="text-sm text-red-300">{error}</p>
              </div>
            </div>
            
            <div className="flex flex-col space-y-3">
              <Link href="/auth/forgot-password">
                <Button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white">
                  Request new reset link
                </Button>
              </Link>
              
              <Link href="/auth/signin">
                <Button variant="ghost" className="w-full text-gray-300 hover:text-white hover:bg-gray-800">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to sign in
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-black to-gray-900 p-4">
      <Card className="w-full max-w-md bg-gray-900/95 border border-gray-800 shadow-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-white">Reset your password</CardTitle>
          <CardDescription className="text-base text-gray-400">
            Enter your new password below.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <div className="bg-red-900/50 border border-red-800 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="h-4 w-4 text-red-400" />
                  <p className="text-sm text-red-300">{error}</p>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-300">New password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your new password"
                  {...register('password')}
                  className={`bg-gray-800 border-gray-700 text-white placeholder-gray-400 pr-10 ${
                    errors.password ? 'border-red-500 focus:border-red-500' : 'focus:border-blue-500'
                  }`}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-white"
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-sm text-red-400">{errors.password.message}</p>
              )}
            </div>

            {/* Password Strength Indicator */}
            {password && (
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                <PasswordStrength password={password} />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-gray-300">Confirm new password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Confirm your new password"
                  {...register('confirmPassword')}
                  className={`bg-gray-800 border-gray-700 text-white placeholder-gray-400 pr-10 ${
                    errors.confirmPassword ? 'border-red-500 focus:border-red-500' : 'focus:border-blue-500'
                  }`}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-white"
                  disabled={isLoading}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-sm text-red-400">{errors.confirmPassword.message}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium py-3"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Updating password...
                </>
              ) : (
                'Update password'
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <Link href="/auth/signin">
              <Button variant="ghost" className="text-sm text-gray-400 hover:text-white hover:bg-gray-800">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to sign in
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-black to-gray-900 p-4">
      <Card className="w-full max-w-md bg-gray-900/95 border border-gray-800 shadow-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <Loader2 className="h-6 w-6 text-blue-600 animate-spin" />
          </div>
          <CardTitle className="text-2xl font-bold text-white">Loading...</CardTitle>
          <CardDescription className="text-base text-gray-400">
            Please wait while we load the password reset page.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ResetPasswordContent />
    </Suspense>
  );
} 