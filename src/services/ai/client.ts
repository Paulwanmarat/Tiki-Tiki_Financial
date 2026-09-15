import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const isAndroid = Platform.OS === 'android';
// Prefer EXPO_PUBLIC_API_URL from .env. If not set, use 10.0.2.2 for Android Emulator, localhost for iOS/Web.
// For a physical device, you MUST set EXPO_PUBLIC_API_URL=http://<your-lan-ip>:3000 in your root .env file.
const DEFAULT_URL = isAndroid ? 'http://10.0.2.2:3000' : 'http://localhost:3000';
export const LOCAL_API_URL = process.env.EXPO_PUBLIC_API_URL || DEFAULT_URL;

export const AI_CONFIG = {
  baseUrl: `${LOCAL_API_URL}/api`,
  timeout: 15000, // 15 seconds
};

export async function askAiApi(messages: { role: string; content: string }[], systemInstruction?: string): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), AI_CONFIG.timeout);
  const token = await SecureStore.getItemAsync('userToken');

  try {
    const response = await fetch(`${AI_CONFIG.baseUrl}/ai/ask`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        messages,
        systemInstruction,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to connect to AI service');
    }

    const data = await response.json();
    return data.reply;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('AI service request timed out');
    }
    throw error;
  }
}

export async function checkAiBackendStatus(): Promise<boolean> {
  try {
    const response = await fetch(`${AI_CONFIG.baseUrl.replace('/api', '')}/health`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    return response.ok;
  } catch (e) {
    return false;
  }
}

export async function getMenuRecommendations(menuItems: { name: string, price: number }[], budget: number): Promise<string> {
  const systemInstruction = `You are an expert financial assistant. The user is at a restaurant and has a budget of ${budget}. They have scanned the menu and here are the extracted items and prices:
${JSON.stringify(menuItems, null, 2)}

Provide a concise, value-for-money recommendation. Do not just pick the cheapest item. Consider:
1. What fits best within their budget.
2. The best value option.
3. Suggest 2-3 specific items or combinations they can afford.
Format your response nicely with markdown.`;

  return askAiApi([{ role: 'user', content: 'What should I order based on my budget and this menu?' }], systemInstruction);
}
