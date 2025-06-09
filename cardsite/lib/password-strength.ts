export interface PasswordStrength {
  score: number // 0-4 (very weak to very strong)
  label: string
  color: string
  suggestions: string[]
  hasUppercase: boolean
  hasLowercase: boolean
  hasNumbers: boolean
  hasSpecialChars: boolean
  hasMinLength: boolean
  isBreached?: boolean
  breachCount?: number
}

// Tiny fallback for when HIBP API is unavailable
const fallbackTerriblePasswords = [
  'password', '123456', 'qwerty', 'admin'
]

// In-memory cache for HIBP results (in production, use Redis)
const hibpCache = new Map<string, { isBreached: boolean; breachCount: number; timestamp: number }>()
const CACHE_DURATION = 24 * 60 * 60 * 1000 // 24 hours

async function checkPasswordBreach(password: string): Promise<{ isBreached: boolean; breachCount: number }> {
  try {
    // Generate SHA-1 hash of password
    const encoder = new TextEncoder()
    const data = encoder.encode(password)
    const hashBuffer = await crypto.subtle.digest('SHA-1', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase()
    
    // Check cache first
    const cached = hibpCache.get(hashHex)
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return { isBreached: cached.isBreached, breachCount: cached.breachCount }
    }
    
    // Use k-anonymity: only send first 5 characters
    const prefix = hashHex.substring(0, 5)
    const suffix = hashHex.substring(5)
    
    // Call HIBP API with k-anonymity
    const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: {
        'User-Agent': 'CardSite-MTG-Community-Hub'
      }
    })
    
    if (!response.ok) {
      throw new Error(`HIBP API error: ${response.status}`)
    }
    
    const text = await response.text()
    const lines = text.split('\n')
    
    // Check if our password's suffix appears in the response
    for (const line of lines) {
      const [lineSuffix, countStr] = line.split(':')
      if (lineSuffix === suffix) {
        const breachCount = parseInt(countStr, 10)
        // Cache result
        hibpCache.set(hashHex, { isBreached: true, breachCount, timestamp: Date.now() })
        return { isBreached: true, breachCount }
      }
    }
    
    // Not found in breaches
    hibpCache.set(hashHex, { isBreached: false, breachCount: 0, timestamp: Date.now() })
    return { isBreached: false, breachCount: 0 }
    
  } catch (error) {
    // HIBP API unavailable, fallback to local check
    const lowerPassword = password.toLowerCase()
    const isBreached = fallbackTerriblePasswords.some(terrible => lowerPassword === terrible)
    return { isBreached, breachCount: isBreached ? 999999 : 0 }
  }
}

export async function calculatePasswordStrength(password: string): Promise<PasswordStrength> {
  let score = 0
  const suggestions: string[] = []

  // Check basic requirements
  const hasUppercase = /[A-Z]/.test(password)
  const hasLowercase = /[a-z]/.test(password)
  const hasNumbers = /[0-9]/.test(password)
  const hasSpecialChars = /[@$!%*?&]/.test(password)
  const hasMinLength = password.length >= 8

  // Traditional scoring system - complexity rules do the heavy lifting
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

  // Length bonus for extra security
  if (password.length >= 12) score += 0.5
  if (password.length >= 16) score += 0.5

  // Check against HaveIBeenPwned database
  const breachCheck = await checkPasswordBreach(password)
  let isBreached = breachCheck.isBreached
  let breachCount = breachCheck.breachCount

  if (isBreached) {
    if (breachCount > 100000) {
      score = Math.max(0, score - 4) // Massive penalty for highly breached passwords
      suggestions.push('This password is commonly used - choose a different one')
    } else if (breachCount > 1000) {
      score = Math.max(0, score - 3)
      suggestions.push('Choose a less common password')
    } else {
      score = Math.max(0, score - 2)
      suggestions.push('Choose a less common password')
    }
  }

  // Check for excessive repeated characters (basic usability check)
  if (/(.)\1{3,}/.test(password)) {
    score -= 0.5
    suggestions.push('Avoid too many repeating characters')
  }

  // Normalize score to 0-4
  score = Math.max(0, Math.min(4, score))

  // Determine label and color based on traditional standards
  let label: string
  let color: string

  if (isBreached) {
    label = 'Weak'
    color = 'bg-red-500'
  } else if (score >= 4) {
    label = 'Very Strong'
    color = 'bg-green-500'
  } else if (score >= 3) {
    label = 'Strong'
    color = 'bg-green-400'
  } else if (score >= 2) {
    label = 'Moderate'
    color = 'bg-yellow-500'
  } else if (score >= 1) {
    label = 'Weak'
    color = 'bg-orange-500'
  } else {
    label = 'Very Weak'
    color = 'bg-red-500'
  }

  return {
    score,
    label,
    color,
    suggestions,
    hasUppercase,
    hasLowercase,
    hasNumbers,
    hasSpecialChars,
    hasMinLength,
    isBreached,
    breachCount
  }
}

// Synchronous version for immediate feedback (without HIBP check)
export function calculatePasswordStrengthSync(password: string): PasswordStrength {
  let score = 0
  const suggestions: string[] = []

  // Check basic requirements
  const hasUppercase = /[A-Z]/.test(password)
  const hasLowercase = /[a-z]/.test(password)
  const hasNumbers = /[0-9]/.test(password)
  const hasSpecialChars = /[@$!%*?&]/.test(password)
  const hasMinLength = password.length >= 8

  // Traditional scoring system
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

  // Length bonus
  if (password.length >= 12) score += 0.5
  if (password.length >= 16) score += 0.5

  // Quick check against fallback list
  const lowerPassword = password.toLowerCase()
  const isLocallyTerrible = fallbackTerriblePasswords.some(terrible => lowerPassword === terrible)
  
  if (isLocallyTerrible) {
    score = Math.max(0, score - 3)
    suggestions.push('Choose a different password')
  }

  // Check for excessive repeated characters
  if (/(.)\1{3,}/.test(password)) {
    score -= 0.5
    suggestions.push('Avoid too many repeating characters')
  }

  // Normalize score to 0-4
  score = Math.max(0, Math.min(4, score))

  let label: string
  let color: string

  if (score >= 4) {
    label = 'Very Strong'
    color = 'bg-green-500'
  } else if (score >= 3) {
    label = 'Strong'
    color = 'bg-green-400'
  } else if (score >= 2) {
    label = 'Moderate'
    color = 'bg-yellow-500'
  } else if (score >= 1) {
    label = 'Weak'
    color = 'bg-orange-500'
  } else {
    label = 'Very Weak'
    color = 'bg-red-500'
  }

  return {
    score,
    label,
    color,
    suggestions,
    hasUppercase,
    hasLowercase,
    hasNumbers,
    hasSpecialChars,
    hasMinLength,
    isBreached: false,
    breachCount: 0
  }
}

 