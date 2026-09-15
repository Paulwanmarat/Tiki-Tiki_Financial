import * as SecureStore from 'expo-secure-store';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.41:3000';

async function fetchWithAuth(endpoint: string, options: RequestInit = {}) {
  const token = await SecureStore.getItemAsync('userToken');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMsg = 'An error occurred';
    try {
      const errorData = await response.json();
      errorMsg = errorData.error || errorMsg;
    } catch (e) {
      // Ignore parsing errors
    }
    throw new Error(errorMsg);
  }

  return response.json();
}

export async function setSetting(
  db: any,
  userId: string,
  key: string,
  value: string
): Promise<void> {
  // To avoid writing a specific single-key endpoint on the backend, 
  // we just use the PUT /api/settings which takes an object of keys.
  await fetchWithAuth('/api/settings', {
    method: 'PUT',
    body: JSON.stringify({ [key]: value }),
  });
}

export async function getSetting(
  db: any,
  userId: string,
  key: string
): Promise<string | null> {
  const settings = await fetchWithAuth('/api/settings');
  return settings[key] || null;
}
