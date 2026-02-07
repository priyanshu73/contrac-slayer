"use client"

import { useTranslations } from 'next-intl'

/**
 * Mobile phone mockup showing iMessage-style conversation.
 * Illustrates "text-based, no app downloads" — clients use their built-in
 * Messages app; no separate app install required.
 */
export function PhoneMessagePreview() {
  const t = useTranslations('landing')
  return (
    <div className="relative mx-auto w-[312px] sm:w-[344px] md:w-[377px]">
      {/* Phone frame */}
      <div className="relative bg-white rounded-[2.5rem] p-1.5 sm:p-2 shadow-2xl border-[8px] border-gray-800 dark:border-gray-700">
        {/* Notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-5 sm:h-6 bg-gray-800 dark:bg-gray-700 rounded-b-2xl z-10" />

        {/* Screen */}
        <div className="relative overflow-hidden rounded-[1.75rem] sm:rounded-[2rem] bg-gray-50 dark:bg-gray-900 aspect-[9/19] min-h-[492px]">
          {/* Header */}
          <div className="flex justify-between items-center px-5 py-3.5 border-b border-gray-200/80 dark:border-gray-700/80">
            <span className="font-semibold text-lg text-gray-900 dark:text-gray-100">{t('phoneAppName')}</span>
            <span className="text-base text-blue-600 dark:text-blue-400">{t('phoneMessages')}</span>
          </div>

          {/* Conversation */}
          <div className="px-3 py-3 pb-20 space-y-2.5 overflow-y-auto" style={{ maxHeight: "calc(100% - 100px)" }}>
            {/* Incoming - Contractor.AI */}
            <div className="flex justify-start">
              <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-gray-200 dark:bg-gray-700 px-3 py-2">
                <p className="text-base text-gray-900 dark:text-gray-100 leading-relaxed">
                  {t('phoneBubble1')}{" "}
                  <span className="text-blue-600 dark:text-blue-400 underline">{t('phoneUploadLink')}</span>
                </p>
              </div>
            </div>

            {/* Outgoing - User */}
            <div className="flex justify-end">
              <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-blue-500 px-3 py-2">
                <p className="text-base text-white leading-relaxed">{t('phoneBubble2')}</p>
              </div>
            </div>

            {/* Incoming - Booking */}
            <div className="flex justify-start">
              <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-gray-200 dark:bg-gray-700 px-3 py-2">
                <p className="text-base text-gray-900 dark:text-gray-100 leading-relaxed">
                  {t('phoneBubble3')}{" "}
                  <span className="text-blue-600 dark:text-blue-400 underline">{t('phoneBookingLink')}</span>
                </p>
              </div>
            </div>

            {/* Incoming - Confirmation */}
            <div className="flex justify-start">
              <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-gray-200 dark:bg-gray-700 px-3 py-2">
                <p className="text-base text-gray-900 dark:text-gray-100 leading-relaxed">
                  {t('phoneBubble4')}
                </p>
              </div>
            </div>
          </div>

          {/* iMessage-style input */}
          <div className="absolute bottom-0 left-0 right-0 flex items-center gap-2 px-3 pb-4 pt-2 bg-gray-50 dark:bg-gray-900 border-t border-gray-200/80 dark:border-gray-700/80">
            <div className="flex-1 rounded-2xl bg-gray-200 dark:bg-gray-700 px-4 py-2.5">
              <span className="text-base text-gray-500 dark:text-gray-400">{t('phoneInputLabel')}</span>
            </div>
            <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
