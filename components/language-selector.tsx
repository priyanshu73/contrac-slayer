"use client"

import { useLanguage } from '@/hooks/useLanguage';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTranslations } from 'next-intl';

const LANGUAGE_NAMES = {
  en: 'English',
  es: 'Español (México)'
} as const;

export function LanguageSelector() {
  const { currentLocale, supportedLocales, changeLanguage, isChanging } = useLanguage();
  const t = useTranslations('settings');

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
        {t('language')}
      </label>
      <Select
        value={currentLocale}
        onValueChange={(value) => changeLanguage(value as 'en' | 'es')}
        disabled={isChanging}
      >
        <SelectTrigger className="w-full">
          <SelectValue>
            {isChanging ? t('changing') : LANGUAGE_NAMES[currentLocale]}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {supportedLocales.map((locale) => (
            <SelectItem key={locale} value={locale}>
              {LANGUAGE_NAMES[locale]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
