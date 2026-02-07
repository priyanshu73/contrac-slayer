"use client"

import { useLanguage } from '@/hooks/useLanguage';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTranslations } from 'next-intl';

const LANGUAGE_OPTIONS = {
  en: { name: 'English', flag: '🇺🇸' },
  es: { name: 'Español (México)', flag: '🇲🇽' }
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
            {isChanging ? (
              t('changing')
            ) : (
              <span className="flex items-center gap-2">
                <span className="text-lg leading-none" aria-hidden>{LANGUAGE_OPTIONS[currentLocale].flag}</span>
                {LANGUAGE_OPTIONS[currentLocale].name}
              </span>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {supportedLocales.map((locale) => (
            <SelectItem key={locale} value={locale}>
              <span className="flex items-center gap-2">
                <span className="text-lg leading-none" aria-hidden>{LANGUAGE_OPTIONS[locale].flag}</span>
                {LANGUAGE_OPTIONS[locale].name}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
