import { Capacitor } from '@capacitor/core';

/**
 * Returns the base API URL depending on the running environment:
 * - Native mobile (Capacitor iOS/Android): defaults to "https://lleno-porfa.vercel.app" or PUBLIC_API_URL.
 * - Web/PWA on Vercel: returns "" so relative paths (/api/...) are dispatched directly to the same origin.
 */
export const getApiBaseUrl = (): string => {
  if (typeof window !== 'undefined') {
    const customUrl = (import.meta as any).env?.PUBLIC_API_URL;
    if (customUrl) {
      return customUrl.replace(/\/$/, '');
    }
    if (Capacitor.isNativePlatform()) {
      return 'https://lleno-porfa.vercel.app';
    }
  }
  return '';
};

/**
 * Prepends the base API URL to a given relative API route (e.g. '/api/stations').
 */
export const apiUrl = (endpoint: string): string => {
  const base = getApiBaseUrl();
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${base}${path}`;
};
