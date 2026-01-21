import { useState, useEffect } from 'react';

/**
 * Hydration-safe timestamp formatting utility
 * Ensures consistent formatting between server and client
 */

export function formatTimestamp(timestamp: Date): string {
  // Use UTC to ensure consistent formatting between server and client
  return timestamp.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'UTC'
  });
}

/**
 * Alternative approach using useEffect for client-only rendering
 * This completely avoids server-client mismatches
 */
export function useFormattedTimestamp(timestamp: Date): string {
  const [formattedTime, setFormattedTime] = useState('');

  useEffect(() => {
    // Format on client side only after hydration
    setFormattedTime(timestamp.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    }));
  }, [timestamp]);

  return formattedTime;
}