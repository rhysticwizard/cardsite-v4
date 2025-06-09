# Environment Setup Guide

## 🚀 Quick Setup

1. **Create `.env.local` file in the `cardsite` directory**
2. **Copy the template below and fill in real values**
3. **Restart your dev server**

## 📝 .env.local Template

```bash
# NextAuth.js Configuration
NEXTAUTH_URL=http://localhost:3010
NEXTAUTH_SECRET=your_generated_secret_here

# Discord OAuth Setup (Working ✅)
DISCORD_CLIENT_ID=your_discord_client_id_here
DISCORD_CLIENT_SECRET=your_discord_client_secret_here

# Google OAuth Setup (Ready for configuration)
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here

# Database (Supabase PostgreSQL)
DATABASE_URL=postgresql://postgres:password@host:port/database
```

## 🔧 Discord OAuth Setup ✅

1. **Go to:** https://discord.com/developers/applications
2. **Create New Application** → Name it "MTG Hub Local"
3. **OAuth2 → General**
4. **Add Redirect URI:** `http://localhost:3010/api/auth/callback/discord`
5. **Copy Client ID & Secret** to `.env.local`

## 🔧 Google OAuth Setup

1. **Go to:** https://console.cloud.google.com/apis/credentials
2. **Create Project** or select existing
3. **Enable APIs & Services** → Search for "Google+ API" → Enable
4. **Create Credentials** → OAuth 2.0 Client ID → Web Application
5. **Add Redirect URI:** `http://localhost:3010/api/auth/callback/google`
6. **Copy Client ID & Secret** to `.env.local`

## ✅ Test OAuth

After setup:
1. `npm run dev`
2. Go to sign-in page
3. Click "Continue with Discord" or "Continue with Google"
4. Should redirect to OAuth provider and back

## 🤔 Why Separate Files?

- `.env.local` = Your personal secrets (gitignored)
- `.env.example` = Team template (committed)
- `.env.development` = Shared dev config (committed)
- `.env.production` = Production secrets (gitignored)

This way teams can share setup instructions without exposing real credentials! 