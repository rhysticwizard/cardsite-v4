'use client';

import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { SessionProvider } from 'next-auth/react';

/**
 * Smart cache configuration for MTG card data
 */
function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Card-optimized caching strategy
        staleTime: 1000 * 60 * 60 * 2, // 2 hours - cards rarely change
        gcTime: 1000 * 60 * 60 * 4, // 4 hours - keep card data longer
        refetchOnWindowFocus: false, // Don't refetch on focus
        refetchOnMount: false, // Use cache if available
        refetchOnReconnect: false, // Don't refetch on reconnect
        retry: (failureCount, error: any) => {
          // Don't retry on 404s (card not found)
          if (error?.status === 404) return false;
          // Retry up to 2 times for other errors
          return failureCount < 2;
        },
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
        
        // Enable background refetching for better UX
        refetchInterval: false, // Disable automatic background refetch
        refetchIntervalInBackground: false,
      },
      mutations: {
        retry: 1,
        retryDelay: 1000,
      },
    },
    
    // Global error handling
    mutationCache: undefined, // Use default
    queryCache: undefined, // Use default
  });
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(createQueryClient);

  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        {children}
        {/* React Query DevTools - only in development */}
        {process.env.NODE_ENV === 'development' && (
          <ReactQueryDevtools 
            initialIsOpen={false}
          />
        )}
      </QueryClientProvider>
    </SessionProvider>
  );
} 