/**
 * Centralized API configuration for the Jarvis Dashboard.
 * 
 * In development, we use the local Vite proxy (/local-api).
 * In production, we point directly to the Railway-deployed backend.
 */

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ||
    (import.meta.env.PROD
        ? 'https://api-llm-production.up.railway.app'
        : '');

/**
 * Helper to build full API URLs.
 * If the path starts with '/', it will be appended to the base URL.
 * 
 * @param path The relative API path (e.g., '/library/generate' or '/models/xxx.stl')
 * @returns The full URL or proxy path
 */
export const getApiUrl = (path: string): string => {
    const base = API_BASE_URL;

    // If we are in dev and NO VITE_API_BASE_URL is set, we use the proxy prefix
    if (import.meta.env.DEV && !import.meta.env.VITE_API_BASE_URL) {
        return `/local-api${path.startsWith('/') ? '' : '/'}${path}`;
    }

    // Otherwise, use the explicit base URL
    return `${base}${path.startsWith('/') ? '' : '/'}${path}`;
};
