import { fetchWithAuth } from '@/services/ai/client';

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
