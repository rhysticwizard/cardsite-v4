'use client';

import React, { useState } from 'react';
import { signIn } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Icons } from '../../../components/ui/icons';
import { useRouter } from 'next/navigation';
import { AlertCircle, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Check, X, Loader2 } from 'lucide-react';

// Traditional password complexity schema
const signUpSchema = z.object({
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be less than 30 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens'),
  email: z.string().email('Please enter a valid email'),
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

// Schema for sign-in with minimal validation (for security)
const signInSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

type SignUpForm = z.infer<typeof signUpSchema>;
type SignInForm = z.infer<typeof signInSchema>;

// Inline Availability Checker Component
function AvailabilityChecker({ value, type, isValid = true }: { value: string, type: 'username' | 'email', isValid?: boolean }) {
  const [isChecking, setIsChecking] = React.useState(false)
  const [isAvailable, setIsAvailable] = React.useState<boolean | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!value) {
      setIsAvailable(null)
      setError(null)
      return
    }

    // For email, only check availability if format is valid (silent validation)
    if (type === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(value)) {
        setIsAvailable(null)
        setError(null)
        return // Don't show error, just don't check availability
      }
    }

    // Don't check if other validation failed
    if (!isValid) {
      setIsAvailable(null)
      setError(null)
      return
    }

    const timeoutId = setTimeout(async () => {
      setIsChecking(true)
      setError(null)

      try {
        const params = new URLSearchParams()
        params.set(type, value)
        
        const response = await fetch(`/api/auth/check-availability?${params}`)
        const data = await response.json()

        if (response.ok) {
          const available = type === 'username' ? data.usernameAvailable : data.emailAvailable
          setIsAvailable(available)
        } else {
          setError(data.error || 'Check failed')
        }
      } catch (err) {
        setError('Network error')
      } finally {
        setIsChecking(false)
      }
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [value, type, isValid])

  if (!value) return null

  return (
    <div className="flex items-center space-x-2">
      {isChecking ? (
        <div className="flex items-center space-x-1 text-gray-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-xs">Checking...</span>
        </div>
      ) : isAvailable === true ? (
        <div className="flex items-center space-x-1 text-green-400">
          <Check className="h-4 w-4" />
          <span className="text-xs">Available</span>
        </div>
      ) : isAvailable === false ? (
        <div className="flex items-center space-x-1 text-red-400">
          <X className="h-4 w-4" />
          <span className="text-xs">
            {type === 'username' ? 'Username taken' : 'Email already in use'}
          </span>
        </div>
      ) : error ? (
        <div className="flex items-center space-x-1 text-orange-400">
          <X className="h-4 w-4" />
          <span className="text-xs">{error}</span>
        </div>
      ) : null}
    </div>
  )
}

// Enhanced Password Strength Component with HIBP
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
        // Simple HIBP check without importing the library
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
    }, 1000) // 1 second debounce

    return () => clearTimeout(timeoutId)
  }, [password])

  if (!password) return null

  // Immediate validation for requirements (no scoring yet)
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

  const strengthBars = Array.from({ length: 4 }, (_, index) => {
    const isActive = index < Math.ceil(strength.score)
    return (
      <div
        key={index}
        className={`h-2 rounded-sm transition-colors duration-200 ${
          isActive ? strength.color : 'bg-gray-600'
        }`}
      />
    )
  })

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

export default function SignInPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);

  const signUpForm = useForm<SignUpForm>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const signInForm = useForm<SignInForm>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmitSignUp = async (data: SignUpForm) => {
    setIsLoading(true);
    setError('');

    try {
              const response = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: data.username,
            email: data.email,
            password: data.password,
          }),
        });

      if (response.ok) {
        // Auto sign in after successful signup
        const result = await signIn('credentials', {
          email: data.email,
          password: data.password,
          redirect: false,
        });

        if (result?.error) {
          setError('Account created but sign in failed. Please try signing in manually.');
        } else {
          router.push('/');
        }
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to create account');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    }
    
    setIsLoading(false);
  };

  const onSubmitSignIn = async (data: SignInForm) => {
    setIsLoading(true);
    setError('');

    const result = await signIn('credentials', {
      email: data.email,
      password: data.password,
      redirect: false,
    });

    if (result?.error) {
      // Generic error message for security (don't reveal if email exists)
      setError('Invalid credentials. Please check your email and password.');
    } else {
      router.push('/');
    }
    
    setIsLoading(false);
  };

  const toggleMode = () => {
    setIsSignUp(!isSignUp);
    setError('');
    signUpForm.reset();
    signInForm.reset();
  };

  const handleProviderSignIn = (providerId: string) => {
    signIn(providerId, { 
      callbackUrl: '/',
      redirect: true 
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-gray-900/95 border border-gray-800 shadow-2xl">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center mb-4">
            <Icons.logo className="w-6 h-6 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold text-white">
            {isSignUp ? 'Create Account' : 'Welcome Back'}
          </CardTitle>
          <CardDescription className="text-gray-400">
            {isSignUp ? 'Join the MTG Hub community' : 'Sign in to your MTG Hub account'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="flex items-center space-x-2 text-red-400 bg-red-400/10 border border-red-400/20 rounded-md p-3">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          <form onSubmit={isSignUp ? signUpForm.handleSubmit(onSubmitSignUp) : signInForm.handleSubmit(onSubmitSignIn)} className="space-y-4">
            {isSignUp && (
              <div className="space-y-2">
                <Label htmlFor="username" className="text-gray-300">Username</Label>
                <Input
                  id="username"
                  type="text"
                  {...signUpForm.register('username')}
                  placeholder="Choose a unique username"
                  className="bg-gray-800 border-gray-700 text-white placeholder-gray-400"
                  disabled={isLoading}
                />
                <AvailabilityChecker 
                  value={signUpForm.watch('username') || ''} 
                  type="username"
                  isValid={!signUpForm.formState.errors.username}
                />
                {signUpForm.formState.errors.username && (
                  <p className="text-red-400 text-sm">{signUpForm.formState.errors.username.message}</p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-300">Email</Label>
              <Input
                id="email"
                type="email"
                {...(isSignUp ? signUpForm.register('email') : signInForm.register('email'))}
                placeholder="your@email.com"
                className="bg-gray-800 border-gray-700 text-white placeholder-gray-400"
                disabled={isLoading}
              />
              {/* Industry standard: Show email availability like GitHub/Twitter */}
              {isSignUp && (
                <AvailabilityChecker 
                  value={signUpForm.watch('email') || ''} 
                  type="email"
                  isValid={!signUpForm.formState.errors.email}
                />
              )}
              {isSignUp && signUpForm.formState.errors.email && (
                <p className="text-red-400 text-sm">{signUpForm.formState.errors.email.message}</p>
              )}
              {!isSignUp && signInForm.formState.errors.email && (
                <p className="text-red-400 text-sm">{signInForm.formState.errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-300">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  {...(isSignUp ? signUpForm.register('password') : signInForm.register('password'))}
                  placeholder={isSignUp ? "Create a strong password (min 8 characters)" : "Your password"}
                  className="bg-gray-800 border-gray-700 text-white placeholder-gray-400 pr-10"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
                              {/* Password validation for sign-up mode */}
                {isSignUp && (
                  <PasswordStrength 
                    password={signUpForm.watch('password') || ''}
                  />
                )}
              {/* Only show detailed password errors for sign-up mode */}
              {isSignUp && signUpForm.formState.errors.password && (
                <p className="text-red-400 text-sm">{signUpForm.formState.errors.password.message}</p>
              )}
              {/* Show generic error for sign-in mode */}
              {!isSignUp && signInForm.formState.errors.password && (
                <p className="text-red-400 text-sm">{signInForm.formState.errors.password.message}</p>
              )}
              
              {/* Forgot Password Link - Only show in sign-in mode */}
              {!isSignUp && (
                <div className="text-right">
                  <Link href="/auth/forgot-password" className="text-sm text-blue-400 hover:text-blue-300 transition-colors">
                    Forgot your password?
                  </Link>
                </div>
              )}
            </div>

            {isSignUp && (
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-gray-300">Confirm Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    {...signUpForm.register('confirmPassword')}
                    placeholder="Confirm your password"
                    className="bg-gray-800 border-gray-700 text-white placeholder-gray-400 pr-10"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {signUpForm.formState.errors.confirmPassword && (
                  <p className="text-red-400 text-sm">{signUpForm.formState.errors.confirmPassword.message}</p>
                )}
              </div>
            )}

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium py-3"
              disabled={isLoading}
            >
              {isLoading 
                ? (isSignUp ? 'Creating Account...' : 'Signing In...') 
                : (isSignUp ? 'Create Account' : 'Sign In')
              }
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-gray-700" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-gray-900 px-2 text-gray-400">
                {isSignUp ? 'Or sign up with' : 'Or continue with'}
              </span>
            </div>
          </div>

          <Button
            onClick={() => handleProviderSignIn('google')}
            variant="outline"
            className="w-full bg-white hover:bg-gray-100 text-gray-900 border-gray-300 font-medium py-3"
            disabled={isLoading}
          >
            <Icons.google className="mr-2 h-5 w-5" />
            {isSignUp ? 'Sign up with Google' : 'Continue with Google'}
          </Button>
          
          <Button
            onClick={() => handleProviderSignIn('discord')}
            className="w-full bg-[#5865F2] hover:bg-[#4752C4] text-white font-medium py-3"
            disabled={isLoading}
          >
            <Icons.discord className="mr-2 h-5 w-5" />
            {isSignUp ? 'Sign up with Discord' : 'Continue with Discord'}
          </Button>

          <div className="text-center space-y-2">
            <button
              onClick={toggleMode}
              className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
            >
              {isSignUp 
                ? 'Already have an account? Sign in' 
                : "Don't have an account? Sign up"
              }
            </button>
            <br />
            <button
              onClick={() => router.push('/')}
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              ← Back to Home
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 