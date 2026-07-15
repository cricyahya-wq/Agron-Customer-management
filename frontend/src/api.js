/**
 * api.js
 * Shared fetch wrapper that automatically attaches the Authorization: Bearer
 * header to every outgoing API request.
 */

const TOKEN = import.meta.env.VITE_API_TOKEN || 'agron_secure_token_2024';

/**
 * Drop-in replacement for fetch() that injects the Bearer token.
 *
 * @param {string} url     - The request URL
 * @param {RequestInit} options - Standard fetch options (method, body, headers, …)
 * @returns {Promise<Response>}
 */
export async function fetchAPI(url, options = {}) {
  const headers = {
    Authorization: `Bearer ${TOKEN}`,
    ...(options.headers || {}),
  };

  return fetch(url, { ...options, headers });
}
