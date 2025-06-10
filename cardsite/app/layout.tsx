import React from "react";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Navigation } from "@/components/ui/navigation";
import { Sidebar } from "@/components/ui/sidebar";
import { Providers } from "./providers";
import { EmailVerificationBanner } from "@/components/auth/email-verification-banner";
import { MonitoringDashboard } from "@/components/monitoring-dashboard";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MTG Community Hub - Magic: The Gathering Cards, Decks & More",
  description: "The ultimate Magic: The Gathering community platform. Build decks, trade cards, watch streams, and stay up to date with the latest MTG news and content.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-black`}
      >
        <Providers>
          <Navigation />
          <EmailVerificationBanner />
          <div className="flex">
            <Sidebar />
            <main className="ml-32 pt-16 min-h-screen w-full">
              {children}
            </main>
          </div>
          <MonitoringDashboard />
        </Providers>
      </body>
    </html>
  );
}
