import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db/index'
import { users, verificationTokens } from '@/lib/db/schema'
import { eq, sql, and } from 'drizzle-orm'
import { z } from 'zod'
import { nanoid } from 'nanoid'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

const sendVerificationSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate input
    const result = sendVerificationSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0].message },
        { status: 400 }
      )
    }

    const { email } = result.data

    // Check if user exists and is not already verified
    const existingUser = await db.select({ 
      id: users.id, 
      email: users.email, 
      name: users.name,
      emailVerified: users.emailVerified 
    })
      .from(users)
      .where(sql`lower(${users.email}) = lower(${email})`)
      .limit(1)

    if (existingUser.length === 0) {
      // Don't reveal if email exists for security
      return NextResponse.json(
        { message: 'If an account with that email exists, we\'ve sent a verification link.' },
        { status: 200 }
      )
    }

    const user = existingUser[0]

    // Check if already verified
    if (user.emailVerified) {
      return NextResponse.json(
        { error: 'This email address is already verified.' },
        { status: 400 }
      )
    }

    // Generate verification token
    const verificationToken = nanoid(32)
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now

    // Delete any existing verification tokens for this email
    await db.delete(verificationTokens)
      .where(eq(verificationTokens.identifier, user.email))

    // Store new verification token
    await db.insert(verificationTokens).values({
      identifier: user.email,
      token: verificationToken,
      expires: expiresAt,
    })

    // Send verification email
    const verificationUrl = `${process.env.NEXTAUTH_URL}/auth/verify-email?token=${verificationToken}`
    
    try {
      await resend.emails.send({
        from: 'CardSite <noreply@cardsite.com>',
        to: [user.email],
        subject: 'Verify your CardSite email address',
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Verify your email</title>
            </head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                <h1 style="color: white; margin: 0; font-size: 28px;">CardSite</h1>
                <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">MTG Community Hub</p>
              </div>
              
              <div style="background: white; padding: 40px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                <h2 style="color: #333; margin-top: 0;">Welcome to CardSite!</h2>
                
                <p>Hi ${user.name || 'there'},</p>
                
                <p>Thanks for joining CardSite! To complete your account setup and start building your MTG collection, please verify your email address by clicking the button below:</p>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${verificationUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">Verify Email Address</a>
                </div>
                
                <p style="color: #666; font-size: 14px;">This link will expire in 24 hours for security reasons.</p>
                
                <div style="background: #f8f9fa; border-left: 4px solid #667eea; padding: 15px; margin: 20px 0;">
                  <h3 style="margin: 0 0 10px 0; color: #333; font-size: 16px;">What's next?</h3>
                  <p style="margin: 0; color: #666; font-size: 14px;">Once verified, you'll be able to:</p>
                  <ul style="margin: 10px 0 0 0; color: #666; font-size: 14px;">
                    <li>Build and manage your MTG collection</li>
                    <li>Create and share deck lists</li>
                    <li>Connect with other MTG players</li>
                    <li>Track card prices and market trends</li>
                  </ul>
                </div>
                
                <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                
                <p style="color: #999; font-size: 12px;">
                  If the button doesn't work, copy and paste this link into your browser:<br>
                  <a href="${verificationUrl}" style="color: #667eea; word-break: break-all;">${verificationUrl}</a>
                </p>
                
                <p style="color: #999; font-size: 12px; margin-top: 30px;">
                  This email was sent to ${user.email}. If you didn't create an account with CardSite, you can safely ignore this email.
                </p>
              </div>
            </body>
          </html>
        `,
      })
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError)
      return NextResponse.json(
        { error: 'Failed to send verification email. Please try again later.' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { message: 'Verification email sent! Please check your inbox and click the link to verify your account.' },
      { status: 200 }
    )

  } catch (error) {
    console.error('Send verification error:', error)
    return NextResponse.json(
      { error: 'Something went wrong. Please try again later.' },
      { status: 500 }
    )
  }
} 