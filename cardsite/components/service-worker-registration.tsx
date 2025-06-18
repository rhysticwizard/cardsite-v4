'use client';

import { useEffect } from 'react';

export function ServiceWorkerRegistration() {
  useEffect(() => {
    // Only register service worker in production and if supported
    if (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      process.env.NODE_ENV === 'production'
    ) {
      registerServiceWorker();
    }
  }, []);

  const registerServiceWorker = async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none'
      });

      // Listen for updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // Optionally show a notification to the user about the update
            }
          });
        }
      });

      // Listen for controlling service worker changes
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        // Optionally reload the page to ensure consistency
      });

    } catch (error) {
      // Service worker registration failed
    }
  };

  // Expose service worker utilities to window for debugging
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      // Add service worker debugging utilities
      (window as any).swUtils = {
        async getCacheStats() {
          if (navigator.serviceWorker.controller) {
            const messageChannel = new MessageChannel();
            
            return new Promise((resolve) => {
              messageChannel.port1.onmessage = (event) => {
                resolve(event.data);
              };
              
              navigator.serviceWorker.controller!.postMessage(
                { type: 'CACHE_STATS' },
                [messageChannel.port2]
              );
            });
          }
        },
        
        async clearExpiredCache() {
          if (navigator.serviceWorker.controller) {
            const messageChannel = new MessageChannel();
            
            return new Promise((resolve) => {
              messageChannel.port1.onmessage = (event) => {
                resolve(event.data);
              };
              
              navigator.serviceWorker.controller!.postMessage(
                { type: 'CLEAR_CACHE' },
                [messageChannel.port2]
              );
            });
          }
        },
        
        async unregister() {
          const registrations = await navigator.serviceWorker.getRegistrations();
          for (const registration of registrations) {
            await registration.unregister();
          }
        }
      };
    }
  }, []);

  return null; // This component doesn't render anything
} 