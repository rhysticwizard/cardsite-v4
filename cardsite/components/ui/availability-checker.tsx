import React, { useState, useEffect } from 'react'
import { Check, X, Loader2 } from 'lucide-react'

interface AvailabilityCheckerProps {
  value: string
  type: 'username' | 'email'
  isValid?: boolean
  className?: string
}

export function AvailabilityChecker({ value, type, isValid = true, className = '' }: AvailabilityCheckerProps) {
  const [isChecking, setIsChecking] = useState(false)
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Don't check if value is empty or invalid
    if (!value || !isValid) {
      setIsAvailable(null)
      setError(null)
      return
    }

    // Debounce the API call
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
    }, 500) // 500ms debounce

    return () => clearTimeout(timeoutId)
  }, [value, type, isValid])

  if (!value || !isValid) {
    return null
  }

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
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