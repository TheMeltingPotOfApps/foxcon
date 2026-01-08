'use client';

import { useEffect } from 'react';

export function ChunkErrorHandler() {
  useEffect(() => {
    // Handle chunk loading errors by reloading the page
    const handleError = (e: ErrorEvent) => {
      if (
        (e.message && e.message.includes('Loading chunk')) ||
        (e.message && e.message.includes('ChunkLoadError')) ||
        (e.filename && e.filename.includes('chunk'))
      ) {
        console.warn('Chunk loading error detected, reloading page...');
        // Only reload if it's a chunk error
        if (e.message.includes('chunk') || e.filename.includes('chunk')) {
          window.location.reload();
        }
      }
    };

    // Handle unhandled promise rejections for chunk errors
    const handleRejection = (e: PromiseRejectionEvent) => {
      if (
        e.reason &&
        ((e.reason.message && e.reason.message.includes('Loading chunk')) ||
          (e.reason.message && e.reason.message.includes('ChunkLoadError')) ||
          e.reason.name === 'ChunkLoadError')
      ) {
        console.warn('Chunk loading error in promise, reloading page...');
        window.location.reload();
      }
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);

  return null;
}

