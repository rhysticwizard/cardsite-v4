import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { db } from './db/index'
import { users } from './db/schema'
import bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'

// Simplified auth configuration without encryption and complex features
export const simpleAuthOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        try {
          // Simple database lookup without encryption
          const foundUser = await db.select().from(users).where(eq(users.email, credentials.email)).limit(1)
          
          if (foundUser.length === 0 || !foundUser[0].password) {
            return null
          }
          
          const passwordMatch = await bcrypt.compare(credentials.password, foundUser[0].password)
          
          if (!passwordMatch) {
            return null
          }

          return {
            id: foundUser[0].id,
            email: foundUser[0].email,
            name: foundUser[0].name,
            image: foundUser[0].image,
            emailVerified: foundUser[0].emailVerified,
          }
        } catch (error) {
          console.error('Simple auth error:', error)
          return null
        }
      }
    })
  ],
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/auth/signin',
  },
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.email = user.email
        token.name = user.name
        token.image = user.image
        token.emailVerified = user.emailVerified
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string
        session.user.email = token.email as string
        session.user.name = token.name as string | null
        session.user.image = token.image as string | null
        session.user.emailVerified = token.emailVerified as Date | null
      }
      return session
    }
  }
} 