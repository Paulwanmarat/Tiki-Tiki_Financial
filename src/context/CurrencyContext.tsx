import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// ─── Currency definitions ─────────────────────────────────────────────────────

export interface CurrencyDef {
  code: string;       // ISO 4217 code, e.g. "THB"
  symbol: string;     // Short symbol, e.g. "฿"
  name: string;       // Display name
  locale: string;     // BCP 47 locale for toLocaleString
  decimals: number;   // Decimal places to show (0 for VND/KRW/JPY, 2 for others)
  symbolAfter: boolean; // true → "1,000฿", false → "$1,000"
}

export const CURRENCIES: CurrencyDef[] = [
  { code: 'THB', symbol: '฿',  name: 'Thai Baht',          locale: 'th-TH', decimals: 2, symbolAfter: true  },
  { code: 'USD', symbol: '$',  name: 'US Dollar',          locale: 'en-US', decimals: 2, symbolAfter: false },
  { code: 'EUR', symbol: '€',  name: 'Euro',               locale: 'de-DE', decimals: 2, symbolAfter: true  },
  { code: 'GBP', symbol: '£',  name: 'British Pound',      locale: 'en-GB', decimals: 2, symbolAfter: false },
  { code: 'JPY', symbol: '¥',  name: 'Japanese Yen',       locale: 'ja-JP', decimals: 0, symbolAfter: false },
  { code: 'KRW', symbol: '₩',  name: 'Korean Won',         locale: 'ko-KR', decimals: 0, symbolAfter: false },
  { code: 'CNY', symbol: '¥',  name: 'Chinese Yuan',       locale: 'zh-CN', decimals: 2, symbolAfter: false },
  { code: 'VND', symbol: '₫',  name: 'Vietnamese Dong',    locale: 'vi-VN', decimals: 0, symbolAfter: true  },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar',   locale: 'en-SG', decimals: 2, symbolAfter: false },
  { code: 'MYR', symbol: 'RM', name: 'Malaysian Ringgit',  locale: 'ms-MY', decimals: 2, symbolAfter: false },
  { code: 'IDR', symbol: 'Rp', name: 'Indonesian Rupiah',  locale: 'id-ID', decimals: 0, symbolAfter: false },
  { code: 'PHP', symbol: '₱',  name: 'Philippine Peso',    locale: 'en-PH', decimals: 2, symbolAfter: false },
  { code: 'INR', symbol: '₹',  name: 'Indian Rupee',       locale: 'en-IN', decimals: 2, symbolAfter: false },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar',  locale: 'en-AU', decimals: 2, symbolAfter: false },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar',    locale: 'en-CA', decimals: 2, symbolAfter: false },
  { code: 'CHF', symbol: 'Fr', name: 'Swiss Franc',        locale: 'de-CH', decimals: 2, symbolAfter: true  },
  { code: 'HKD', symbol: 'HK$',name: 'Hong Kong Dollar',  locale: 'zh-HK', decimals: 2, symbolAfter: false },
  { code: 'TWD', symbol: 'NT$',name: 'Taiwan Dollar',      locale: 'zh-TW', decimals: 0, symbolAfter: false },
];

export const DEFAULT_CURRENCY = CURRENCIES[0]; // THB

const STORAGE_KEY = 'spr_currency_code';

// ─── Formatter helpers (standalone, used by context) ─────────────────────────

export function formatCurrencyWith(amount: number, currency: CurrencyDef): string {
  if (isNaN(amount)) return currency.symbolAfter ? `0${currency.symbol}` : `${currency.symbol}0`;

  const absAmount = Math.abs(amount);
  const formatted = absAmount.toLocaleString(currency.locale, {
    minimumFractionDigits: currency.decimals,
    maximumFractionDigits: currency.decimals,
  });
  const sign = amount < 0 ? '-' : '';

  return currency.symbolAfter
    ? `${sign}${formatted}${currency.symbol}`
    : `${sign}${currency.symbol}${formatted}`;
}

export function formatCurrencyCompactWith(amount: number, currency: CurrencyDef): string {
  const absAmount = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';
  const sym = currency.symbol;
  const after = currency.symbolAfter;

  const fmt = (val: string) => after ? `${sign}${val}${sym}` : `${sign}${sym}${val}`;

  if (absAmount >= 1_000_000_000) return fmt(`${(absAmount / 1_000_000_000).toFixed(1)}B`);
  if (absAmount >= 1_000_000)     return fmt(`${(absAmount / 1_000_000).toFixed(1)}M`);
  if (absAmount >= 1_000)         return fmt(`${(absAmount / 1_000).toFixed(0)}K`);
  return formatCurrencyWith(amount, currency);
}

// ─── Context ─────────────────────────────────────────────────────────────────

interface CurrencyContextType {
  currency: CurrencyDef;
  setCurrency: (currency: CurrencyDef) => void;
  formatCurrency: (amount: number) => string;
  formatCurrencyCompact: (amount: number) => string;
}

const CurrencyContext = createContext<CurrencyContextType>({
  currency: DEFAULT_CURRENCY,
  setCurrency: () => {},
  formatCurrency: (amount) => formatCurrencyWith(amount, DEFAULT_CURRENCY),
  formatCurrencyCompact: (amount) => formatCurrencyCompactWith(amount, DEFAULT_CURRENCY),
});

// ─── Secure store helpers (web falls back to localStorage) ───────────────────

async function loadCurrencyCode(): Promise<string | null> {
  try {
    if (Platform.OS === 'web') {
      return typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    }
    return await SecureStore.getItemAsync(STORAGE_KEY);
  } catch {
    return null;
  }
}

async function saveCurrencyCode(code: string): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, code);
      return;
    }
    await SecureStore.setItemAsync(STORAGE_KEY, code);
  } catch {}
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrencyState] = useState<CurrencyDef>(DEFAULT_CURRENCY);

  useEffect(() => {
    loadCurrencyCode().then((code) => {
      if (code) {
        const found = CURRENCIES.find((c) => c.code === code);
        if (found) setCurrencyState(found);
      }
    });
  }, []);

  const setCurrency = useCallback((c: CurrencyDef) => {
    setCurrencyState(c);
    saveCurrencyCode(c.code);
  }, []);

  const formatCurrency = useCallback(
    (amount: number) => formatCurrencyWith(amount, currency),
    [currency]
  );

  const formatCurrencyCompact = useCallback(
    (amount: number) => formatCurrencyCompactWith(amount, currency),
    [currency]
  );

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, formatCurrency, formatCurrencyCompact }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  return useContext(CurrencyContext);
}

