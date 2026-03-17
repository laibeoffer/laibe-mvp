/**
 * Generates a UUID v4 string.
 * Uses crypto.randomUUID if available, otherwise falls back to a custom implementation.
 */
function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older browsers
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

const DEVICE_ID_KEY = 'laibe_device_id';

/**
 * Gets the current device ID from localStorage.
 * If it doesn't exist, generates a new one, saves it, and returns it.
 * This device ID can be used for anonymous project drafts.
 * 
 * @returns {string} The unique device ID
 */
export function getDeviceId(): string {
  // Check if we are in a browser environment (Next.js SSR safety)
  if (typeof window === 'undefined') {
    return ''; // Or throw an error, but returning empty/null is safer for SSR
  }

  try {
    let deviceId = localStorage.getItem(DEVICE_ID_KEY);

    if (!deviceId) {
      deviceId = generateUUID();
      localStorage.setItem(DEVICE_ID_KEY, deviceId);
    }

    return deviceId;
  } catch (error) {
    console.warn('Failed to access localStorage for device ID, generating a temporary one in memory.', error);
    // Return a temporary one if localStorage is blocked (e.g., incognito mode restrictions)
    return generateUUID();
  }
}
