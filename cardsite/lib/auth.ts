import { NextAuthOptions } from 'next-auth'
import { DrizzleAdapter } from '@auth/drizzle-adapter'
import GoogleProvider from 'next-auth/providers/google'
import DiscordProvider from 'next-auth/providers/discord'
import CredentialsProvider from 'next-auth/providers/credentials'
import { db } from './db/index'
import { users, accounts, sessions, verificationTokens } from './db/schema'
import bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
      emailVerified?: Date | null
    }
  }
  
  interface User {
    emailVerified?: Date | null
  }
}

export const authOptions: NextAuthOptions = {
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Please enter both email and password')
        }

        try {
          const user = await db.select().from(users).where(eq(users.email, credentials.email)).limit(1)
          
          if (user.length === 0 || !user[0].password) {
            // Don't reveal whether email exists (security best practice)
            throw new Error('Invalid credentials')
          }

          const foundUser = user[0]
          const passwordMatch = await bcrypt.compare(credentials.password, foundUser.password!)

          if (!passwordMatch) {
            throw new Error('Invalid credentials')
          }

          return {
            id: foundUser.id,
            email: foundUser.email,
            name: foundUser.name,
            image: foundUser.image,
            emailVerified: foundUser.emailVerified,
          }
        } catch (error) {
          // Don't expose error details to user for security
          throw new Error('Invalid credentials')
        }
      }
    }),
    // OAuth Providers - Always include for production readiness
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    }),
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID || '',
      clientSecret: process.env.DISCORD_CLIENT_SECRET || '',
      authorization: {
        params: {
          scope: 'identify email',
        },
      },
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  callbacks: {
    async session({ session, token }) {
      if (session.user && token) {
        session.user.id = token.id as string
        session.user.emailVerified = token.emailVerified as Date | null
      }
      return session
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.emailVerified = user.emailVerified
      }
      return token
    },
  },
  events: {
    async createUser({ user }) {
      
    },
  },
} 