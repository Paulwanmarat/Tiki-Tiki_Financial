import { LOCAL_API_URL } from '../ai/client';
import * as SecureStore from 'expo-secure-store';

export interface MenuItem {
  id: string;
  name: string;
  price: number;
  description?: string;
}

export class OCRError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OCRError';
  }
}

/**
 * Uploads an image to the backend OCR proxy to extract menu items.
 * If the API is not configured on the backend, it will throw an OCRError.
 */
export async function scanMenuImage(imageUri: string): Promise<MenuItem[]> {
  try {
    const formData = new FormData();
    
    // We append the file to the form data
    const filename = imageUri.split('/').pop() || 'menu.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : `image`;

    formData.append('image', {
      uri: imageUri,
      name: filename,
      type,
    } as any);

    const token = await SecureStore.getItemAsync('userToken');

    const response = await fetch(`${LOCAL_API_URL}/api/ocr/scan`, {
      method: 'POST',
      body: formData,
      headers: {
        'Accept': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        // Note: fetch will set the correct Content-Type with boundary for FormData
      },
    });

    const data = await response.json();

    if (!response.ok) {
      if (response.status === 501 || response.status === 503) {
        throw new OCRError(data.message || 'OCR API is not configured.');
      }
      throw new Error(data.error || 'Failed to scan image');
    }

    return data.items || [];
  } catch (error: any) {
    if (error instanceof OCRError) {
      throw error;
    }
    console.error('scanMenuImage error:', error);
    throw new Error('Failed to connect to the OCR backend. Make sure the server is running.');
  }
}
