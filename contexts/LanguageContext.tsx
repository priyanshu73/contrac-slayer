"use client"

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from './AuthContext';

const SUPPORTED_LOCALES = ['en', 'es'] as const;
type SupportedLocale = typeof SUPPORTED_LOCALES[number];

interface LanguageContextType {
  currentLocale: SupportedLocale;
  supportedLocales: typeof SUPPORTED_LOCALES;
  changeLanguage: (locale: SupportedLocale) => Promise<void>;
  isChanging: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const currentLocale = useLocale() as SupportedLocale;
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const [isChanging, setIsChanging] = useState(false);

  // Get stored language preference
  const getStoredLanguage = (): SupportedLocale => {
    if (typeof window === 'undefined') return 'en';
    const stored = localStorage.getItem('preferred-language');
    return SUPPORTED_LOCALES.includes(stored as SupportedLocale) ? (stored as SupportedLocale) : 'en';
  };

  // Store language preference
  const setStoredLanguage = (locale: SupportedLocale) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('preferred-language', locale);
    }
  };

  // Change language function
  const changeLanguage = async (newLocale: SupportedLocale) => {
    if (newLocale === currentLocale || isChanging) return;
    
    setIsChanging(true);
    
    try {
      // Store in localStorage immediately
      setStoredLanguage(newLocale);
      
      // Update user profile if logged in (fire and forget)
      if (user) {
        try {
          await api.updateLanguagePreference(newLocale);
        } catch (error) {
          console.warn('Failed to sync language preference to profile:', error);
        }
      }
      
      // Navigate to the new locale URL
      const newPath = pathname.replace(`/${currentLocale}`, `/${newLocale}`);
      router.push(newPath);
      
    } catch (error) {
      console.error('Failed to change language:', error);
    } finally {
      setIsChanging(false);
    }
  };

  // Sync language on user login/logout
  useEffect(() => {
    if (user && user.preferred_language) {
      const userLang = user.preferred_language as SupportedLocale;
      if (SUPPORTED_LOCALES.includes(userLang) && userLang !== currentLocale) {
        changeLanguage(userLang);
      }
    }
  }, [user, currentLocale]);

  // Initialize language from localStorage on mount
  useEffect(() => {
    if (!user) {
      const storedLang = getStoredLanguage();
      if (storedLang !== currentLocale) {
        changeLanguage(storedLang);
      }
    }
  }, [currentLocale, user]);

  const value: LanguageContextType = {
    currentLocale,
    supportedLocales: SUPPORTED_LOCALES,
    changeLanguage,
    isChanging,
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguageContext() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguageContext must be used within a LanguageProvider');
  }
  return context;
}
