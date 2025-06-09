'use client';

import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SessionProvider } from 'next-auth/react';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 60, // 1 hour - much longer caching!
            gcTime: 1000 * 60 * 60 * 2, // 2 hours - keep in memory longer
            refetchOnWindowFocus: false, // Don't refetch on focus
            refetchOnMount: false, // Use cache if available
            refetchOnReconnect: false, // Don't refetch on reconnect
            retry: 1, // Less retries = faster failures
            retryDelay: 1000, // Faster retry
          },
        },
      })
  );

  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </SessionProvider>
  );
} 