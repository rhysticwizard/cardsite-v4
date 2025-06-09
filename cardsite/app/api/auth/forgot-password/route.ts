import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db/index'
import { users, verificationTokens } from '@/lib/db/schema'
import { eq, sql } from 'drizzle-orm'
import { z } from 'zod'
import { nanoid } from 'nanoid'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate input
    const result = forgotPasswordSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0].message },
        { status: 400 }
      )
    }

    const { email } = result.data

    // Check if user exists
    const existingUser = await db.select({ 
      id: users.id, 
      email: users.email, 
      username: users.username 
    })
      .from(users)
      .where(sql`lower(${users.email}) = lower(${email})`)
      .limit(1)

    // Always return success for security (don't reveal if email exists)
    if (existingUser.length === 0) {
      return NextResponse.json(
        { message: 'If an account with that email exists, we\'ve sent a password reset link.' },
        { status: 200 }
      )
    }

    const user = existingUser[0]

    // Generate reset token
    const resetToken = nanoid(32)
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour from now

    // Delete any existing reset tokens for this email
    await db.delete(verificationTokens)
      .where(eq(verificationTokens.identifier, user.email))

    // Store new reset token
    await db.insert(verificationTokens).values({
      identifier: user.email,
      token: resetToken,
      expires: expiresAt,
    })

    // Create reset URL
    const resetUrl = `${process.env.NEXTAUTH_URL}/auth/reset-password?token=${resetToken}`

    // Send password reset email
    try {
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL!,
        to: user.email,
        subject: 'Reset your MTG Hub password',
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Reset your password</title>
            </head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #1e3a8a 0%, #7c3aed 100%); padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 30px;">
                <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">MTG Community Hub</h1>
                <p style="color: #e0e7ff; margin: 10px 0 0 0; font-size: 16px;">Password Reset Request</p>
              </div>
              
              <div style="background: #f8fafc; padding: 30px; border-radius: 12px; margin-bottom: 30px;">
                <h2 style="color: #1e293b; margin: 0 0 20px 0; font-size: 24px;">Reset your password</h2>
                <p style="color: #475569; margin: 0 0 20px 0; font-size: 16px;">
                  Hi ${user.username},
                </p>
                <p style="color: #475569; margin: 0 0 20px 0; font-size: 16px;">
                  We received a request to reset the password for your MTG Hub account. If you didn't make this request, you can safely ignore this email.
                </p>
                <p style="color: #475569; margin: 0 0 30px 0; font-size: 16px;">
                  To reset your password, click the button below:
                </p>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); color: white; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">Reset Password</a>
                </div>
                
                <p style="color: #64748b; font-size: 14px; margin: 20px 0 0 0;">
                  This link will expire in 1 hour for your security.
                </p>
              </div>
              
              <div style="border-top: 1px solid #e2e8f0; padding-top: 20px;">
                <p style="color: #64748b; font-size: 14px; margin: 0 0 10px 0;">
                  If the button doesn't work, you can copy and paste this link:
                </p>
                <p style="color: #3b82f6; font-size: 14px; word-break: break-all; margin: 0 0 20px 0;">
                  ${resetUrl}
                </p>
                <p style="color: #64748b; font-size: 14px; margin: 0;">
                  If you didn't request this password reset, please ignore this email. Your account is secure.
                </p>
              </div>
            </body>
          </html>
        `,
      })
    } catch (emailError) {
      console.error('Failed to send reset email:', emailError)
      return NextResponse.json(
        { error: 'Failed to send reset email. Please try again later.' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { message: 'If an account with that email exists, we\'ve sent a password reset link.' },
      { status: 200 }
    )

  } catch (error) {
    console.error('Forgot password error:', error)
    return NextResponse.json(
      { error: 'Something went wrong. Please try again later.' },
      { status: 500 }
    )
  }
} 