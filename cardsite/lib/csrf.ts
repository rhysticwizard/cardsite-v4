// Add necessary React imports for the hook and HOC
import { useState, useEffect, useCallback } from 'react'
import React from 'react'

// 🛡️ CSRF Protection Utilities for Client-Side Usage

/**
 * Retrieves the CSRF token from the response headers
 * This token is automatically set by the middleware for authenticated users
 */
export function getCSRFToken(): string | null {
  // Check if we're in a browser environment
  if (typeof window === 'undefined') return null
  
  // Try to get from meta tag first (if we set it there)
  const metaToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
  if (metaToken) return metaToken
  
  // Try to get from a previous response header stored in sessionStorage
  const storedToken = sessionStorage.getItem('csrf-token')
  if (storedToken) return storedToken
  
  return null
}

/**
 * Fetches a fresh CSRF token from the server
 * This makes a GET request to any protected endpoint to get the token from headers
 */
export async function fetchCSRFToken(): Promise<string | null> {
  try {
    const response = await fetch('/api/auth/session', {
      method: 'GET',
      credentials: 'same-origin',
    })
    
    const token = response.headers.get('X-CSRF-Token')
    if (token && typeof window !== 'undefined') {
      // Store for future use
      sessionStorage.setItem('csrf-token', token)
      return token
    }
  } catch (error) {
    console.warn('Failed to fetch CSRF token:', error)
  }
  
  return null
}

/**
 * Enhanced fetch wrapper that automatically includes CSRF tokens
 * Use this instead of regular fetch for authenticated API calls
 */
export async function secureApiRequest(
  url: string, 
  options: RequestInit = {}
): Promise<Response> {
  // Get or fetch CSRF token
  let csrfToken = getCSRFToken()
  
  // If no token found and this is a state-changing request, fetch one
  if (!csrfToken && options.method && !['GET', 'HEAD', 'OPTIONS'].includes(options.method.toUpperCase())) {
    csrfToken = await fetchCSRFToken()
  }
  
  // Prepare headers
  const headers = new Headers(options.headers)
  
  // Add CSRF token if available and needed
  if (csrfToken && options.method && !['GET', 'HEAD', 'OPTIONS'].includes(options.method.toUpperCase())) {
    headers.set('x-csrf-token', csrfToken)
  }
  
  // Ensure credentials are included for session cookies
  const enhancedOptions: RequestInit = {
    ...options,
    headers,
    credentials: options.credentials || 'same-origin',
  }
  
  try {
    const response = await fetch(url, enhancedOptions)
    
    // Store any new CSRF token from response headers
    const newToken = response.headers.get('X-CSRF-Token')
    if (newToken && newToken !== csrfToken && typeof window !== 'undefined') {
      sessionStorage.setItem('csrf-token', newToken)
    }
    
    return response
  } catch (error) {
    console.error('Secure API request failed:', error)
    throw error
  }
}

/**
 * React hook for managing CSRF tokens
 * Returns the current token and a function to refresh it
 */
export function useCSRFToken() {
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  
  const refreshToken = useCallback(async () => {
    setIsLoading(true)
    try {
      const newToken = await fetchCSRFToken()
      setToken(newToken)
    } catch (error) {
      console.warn('Failed to refresh CSRF token:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])
  
  useEffect(() => {
    // Try to get existing token
    const existingToken = getCSRFToken()
    if (existingToken) {
      setToken(existingToken)
    } else {
      // Fetch a new one if none exists
      refreshToken()
    }
  }, [refreshToken])
  
  return { token, refreshToken, isLoading }
}

/**
 * Higher-order component that provides CSRF protection
 * Wraps components and provides CSRF token context
 */
export function withCSRFProtection<P extends Record<string, unknown>>(
  WrappedComponent: React.ComponentType<P & { csrfToken?: string }>
) {
  return function CSRFProtectedComponent(props: P) {
    const { token } = useCSRFToken()
    
    return React.createElement(WrappedComponent, { ...props, csrfToken: token || undefined })
  }
} 