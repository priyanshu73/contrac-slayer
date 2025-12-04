"use client"

import { useLanguageContext } from '@/contexts/LanguageContext';

export function useLanguage() {
  return useLanguageContext();
}
