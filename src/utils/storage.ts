import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

/**
 * Universal cross-platform token storage:
 * - On Web: uses window.localStorage
 * - On Native (iOS/Android): uses expo-secure-store
 */

export const getTokenSafe = async (key: string = 'userToken'): Promise<string | null> => {
  if (Platform.OS === 'web') {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
      return null;
    } catch {
      return null;
    }
  } else {
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  }
};

export const setTokenSafe = async (key: string, value: string): Promise<void> => {
  if (Platform.OS === 'web') {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
      }
    } catch {
      // Ignore storage errors on private browsing
    }
  } else {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch (e) {
      console.warn('SecureStore setItem failed:', e);
    }
  }
};

export const removeTokenSafe = async (key: string): Promise<void> => {
  if (Platform.OS === 'web') {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      }
    } catch {
      // Ignore
    }
  } else {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (e) {
      console.warn('SecureStore deleteItem failed:', e);
    }
  }
};

