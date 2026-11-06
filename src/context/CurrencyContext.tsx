import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// ─── Currency definitions with realistic exchange rates ───────────────────────
// Base unit = THB (Thai Baht = 1.0)
// When a user selects another currency, numbers are dynamically converted.

export interface CurrencyDef {
  code: string;         // ISO 4217 code, e.g. "THB", "USD"
  symbol: string;       // Short symbol, e.g. "฿", "$"
  name: string;         // Display name
  locale: string;       // BCP 47 locale for toLocaleString
  decimals: number;     // Decimal places (0 for JPY/KRW/VND/IDR/TWD, 2 for others)
  symbolAfter: boolean; // true → "1,000฿", false → "$1,000"
  rateFromBase: number; // Conversion rate: 1 THB in this currency
}

export const CURRENCIES: CurrencyDef[] = [
  { code: 'THB', symbol: '฿',  name: 'Thai Baht',          locale: 'th-TH', decimals: 2, symbolAfter: true,  rateFromBase: 1.0     },
  { code: 'USD', symbol: '$',  name: 'US Dollar',          locale: 'en-US', decimals: 2, symbolAfter: false, rateFromBase: 0.028   },
  { code: 'EUR', symbol: '€',  name: 'Euro',               locale: 'de-DE', decimals: 2, symbolAfter: true,  rateFromBase: 0.026   },
  { code: 'GBP', symbol: '£',  name: 'British Pound',      locale: 'en-GB', decimals: 2, symbolAfter: false, rateFromBase: 0.022   },
  { code: 'JPY', symbol: '¥',  name: 'Japanese Yen',       locale: 'ja-JP', decimals: 0, symbolAfter: false, rateFromBase: 4.30    },
  { code: 'KRW', symbol: '₩',  name: 'Korean Won',         locale: 'ko-KR', decimals: 0, symbolAfter: false, rateFromBase: 38.5    },
  { code: 'CNY', symbol: '¥',  name: 'Chinese Yuan',       locale: 'zh-CN', decimals: 2, symbolAfter: false, rateFromBase: 0.20    },
  { code: 'VND', symbol: '₫',  name: 'Vietnamese Dong',    locale: 'vi-VN', decimals: 0, symbolAfter: true,  rateFromBase: 720.0   },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar',   locale: 'en-SG', decimals: 2, symbolAfter: false, rateFromBase: 0.038   },
  { code: 'MYR', symbol: 'RM', name: 'Malaysian Ringgit',  locale: 'ms-MY', decimals: 2, symbolAfter: false, rateFromBase: 0.13    },
  { code: 'IDR', symbol: 'Rp', name: 'Indonesian Rupiah',  locale: 'id-ID', decimals: 0, symbolAfter: false, rateFromBase: 450.0   },
  { code: 'PHP', symbol: '₱',  name: 'Philippine Peso',    locale: 'en-PH', decimals: 2, symbolAfter: false, rateFromBase: 1.65    },
  { code: 'INR', symbol: '₹',  name: 'Indian Rupee',       locale: 'en-IN', decimals: 2, symbolAfter: false, rateFromBase: 2.40    },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar',  locale: 'en-AU', decimals: 2, symbolAfter: false, rateFromBase: 0.043   },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar',    locale: 'en-CA', decimals: 2, symbolAfter: false, rateFromBase: 0.039   },
  { code: 'CHF', symbol: 'Fr', name: 'Swiss Franc',        locale: 'de-CH', decimals: 2, symbolAfter: true,  rateFromBase: 0.025   },
  { code: 'HKD', symbol: 'HK$',name: 'Hong Kong Dollar',   locale: 'zh-HK', decimals: 2, symbolAfter: false, rateFromBase: 0.22    },
  { code: 'TWD', symbol: 'NT$',name: 'Taiwan Dollar',      locale: 'zh-TW', decimals: 0, symbolAfter: false, rateFromBase: 0.90    },
];

export const DEFAULT_CURRENCY = CURRENCIES[0]; // THB

const STORAGE_KEY = 'spr_currency_code';

// ─── Mathematical conversion helpers ──────────────────────────────────────────

export function convertFromBase(amount: number, currency: CurrencyDef): number {
  if (isNaN(amount) || amount === 0) return 0;
  return amount * (currency.rateFromBase || 1.0);
}

export function convertToBase(amount: number, currency: CurrencyDef): number {
  if (isNaN(amount) || amount === 0) return 0;
  const rate = currency.rateFromBase || 1.0;
  return rate === 0 ? amount : amount / rate;
}

// ─── Formatter helpers (Standalone & Context) ─────────────────────────────────

export function formatCurrencyWith(amount: number, currency: CurrencyDef): string {
  if (isNaN(amount)) return currency.symbolAfter ? `0${currency.symbol}` : `${currency.symbol}0`;

  // Dynamic conversion: scale amount from base THB into selected currency unit
  const converted = amount * (currency.rateFromBase || 1.0);
  const absAmount = Math.abs(converted);

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
  if (isNaN(amount)) return currency.symbolAfter ? `0${currency.symbol}` : `${currency.symbol}0`;

  const converted = amount * (currency.rateFromBase || 1.0);
  const absAmount = Math.abs(converted);
  const sign = amount < 0 ? '-' : '';
  const sym = currency.symbol;
  const after = currency.symbolAfter;

  const fmt = (val: string) => (after ? `${sign}${val}${sym}` : `${sign}${sym}${val}`);

  if (absAmount >= 1_000_000_000) return fmt(`${(absAmount / 1_000_000_000).toFixed(1)}B`);
  if (absAmount >= 1_000_000)     return fmt(`${(absAmount / 1_000_000).toFixed(1)}M`);
  if (absAmount >= 1_000)         return fmt(`${(absAmount / 1_000).toFixed(0)}K`);
  return formatCurrencyWith(amount, currency);
}

// ─── Context ─────────────────────────────────────────────────────────────────

export interface CurrencyContextType {
  currency: CurrencyDef;
  setCurrency: (currency: CurrencyDef) => void;
  formatCurrency: (amount: number) => string;
  formatCurrencyCompact: (amount: number) => string;
  convertFromBase: (amount: number) => number;
  convertToBase: (amount: number) => number;
}

const CurrencyContext = createContext<CurrencyContextType>({
  currency: DEFAULT_CURRENCY,
  setCurrency: () => {},
  formatCurrency: (amount) => formatCurrencyWith(amount, DEFAULT_CURRENCY),
  formatCurrencyCompact: (amount) => formatCurrencyCompactWith(amount, DEFAULT_CURRENCY),
  convertFromBase: (amount) => convertFromBase(amount, DEFAULT_CURRENCY),
  convertToBase: (amount) => convertToBase(amount, DEFAULT_CURRENCY),
});

// ─── Storage helpers (web falls back to localStorage) ─────────────────────────

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

  const convertFromBaseFn = useCallback(
    (amount: number) => convertFromBase(amount, currency),
    [currency]
  );

  const convertToBaseFn = useCallback(
    (amount: number) => convertToBase(amount, currency),
    [currency]
  );

  return (
    <CurrencyContext.Provider
      value={{
        currency,
        setCurrency,
        formatCurrency,
        formatCurrencyCompact,
        convertFromBase: convertFromBaseFn,
        convertToBase: convertToBaseFn,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  return useContext(CurrencyContext);
}
