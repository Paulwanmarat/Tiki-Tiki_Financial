import { getTokenSafe } from '@/utils/storage';
import { Platform } from 'react-native';
import { LOCAL_API_URL } from '../ai/client';

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

    if (Platform.OS === 'web') {
      const res = await fetch(imageUri);
      const blob = await res.blob();
      formData.append('image', blob, filename);
    } else {
      formData.append('image', {
        uri: Platform.OS === 'ios' && !imageUri.startsWith('file://') ? `file://${imageUri}` : imageUri,
        name: filename,
        type,
      } as any);
    }

    const token = await getTokenSafe('userToken');

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

export interface SlipScanResult {
  reference_number: string;
  amount?: number | null;
  sender_name?: string;
  channel?: string;
  transfer_time?: string;
  slip_url?: string;
}

/**
 * Uploads bank transfer slip image and automatically extracts reference number,
 * amount, sender, and channel via AI Vision OCR.
 */
export async function scanBankSlip(imageUri: string): Promise<SlipScanResult> {
  try {
    const formData = new FormData();
    const filename = imageUri.split('/').pop() || 'bank_slip.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : `image/jpeg`;

    if (Platform.OS === 'web') {
      const res = await fetch(imageUri);
      const blob = await res.blob();
      formData.append('image', blob, filename);
    } else {
      formData.append('image', {
        uri: Platform.OS === 'ios' && !imageUri.startsWith('file://') ? `file://${imageUri}` : imageUri,
        name: filename,
        type,
      } as any);
    }

    const token = await getTokenSafe('userToken');

    const response = await fetch(`${LOCAL_API_URL}/api/ocr/scan-slip`, {
      method: 'POST',
      body: formData,
      headers: {
        'Accept': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Failed to scan bank slip');
    }

    return data;
  } catch (error: any) {
    console.warn('scanBankSlip warning:', error?.message);
    return { reference_number: '' };
  }
}
