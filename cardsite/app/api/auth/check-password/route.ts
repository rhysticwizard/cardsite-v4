import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'

interface BreachResult {
  isBreached: boolean
  breachCount: number
}

// Server-side HIBP check with k-anonymity
async function checkPasswordBreach(password: string): Promise<BreachResult> {
  try {
    // Generate SHA-1 hash using Node.js crypto
    const hash = createHash('sha1').update(password).digest('hex').toUpperCase()
    
    // Use k-anonymity: only send first 5 characters
    const prefix = hash.substring(0, 5)
    const suffix = hash.substring(5)
    
    // Call HIBP API
    const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: {
        'User-Agent': 'CardSite-MTG-Community-Hub'
      }
    })
    
    if (!response.ok) {
      // Fail open for availability
      return { isBreached: false, breachCount: 0 }
    }
    
    const text = await response.text()
    const lines = text.split('\n')
    
    // Check if our password's suffix appears in the response
    for (const line of lines) {
      const [lineSuffix, countStr] = line.split(':')
      if (lineSuffix === suffix) {
        const breachCount = parseInt(countStr, 10)
        return { isBreached: true, breachCount }
      }
    }
    
    return { isBreached: false, breachCount: 0 }
    
  } catch (error) {
    // Fail open - don't block if HIBP is down
    return { isBreached: false, breachCount: 0 }
  }
}

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json()
    
    if (!password || typeof password !== 'string') {
      return NextResponse.json(
        { error: 'Password is required' },
        { status: 400 }
      )
    }

    const result = await checkPasswordBreach(password)
    
    return NextResponse.json(result)

  } catch (error) {
    return NextResponse.json(
      { isBreached: false, breachCount: 0 }
    )
  }
} 