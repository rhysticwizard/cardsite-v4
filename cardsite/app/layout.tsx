import React from "react";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Navigation } from "@/components/ui/navigation";
import { Sidebar } from "@/components/ui/sidebar";
import { Providers } from "./providers";

import { ServiceWorkerRegistration } from "@/components/service-worker-registration";
import { StagewiseToolbar } from "@stagewise/toolbar-next";
import { ReactPlugin } from "@stagewise-plugins/react";

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
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#1f2937" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-black`}
      >
        <Providers>
          <Navigation />
          <div className="flex">
            <Sidebar />
            <main className="ml-32 min-h-screen w-full">
              {children}
            </main>
          </div>
          <ServiceWorkerRegistration />
          <StagewiseToolbar 
            config={{
              plugins: [ReactPlugin]
            }}
          />
        </Providers>
      </body>
    </html>
  );
}
