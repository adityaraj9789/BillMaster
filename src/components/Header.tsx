import React from 'react';
import { BusinessProfile } from '../types';
import { t } from '../services/i18n/translations';

interface HeaderProps {
  business: BusinessProfile;
  language: 'en' | 'mr' | 'mixed';
  onToggleLanguage: () => void;
  unreadCount?: number;
  onOpenNotifications: () => void;
  onOpenSettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  business,
  language,
  onToggleLanguage,
  unreadCount = 0,
  onOpenNotifications,
  onOpenSettings,
}) => {
  const currentLang = language === 'mr' ? 'mr' : 'en';

  return (
    <header className="fixed top-0 inset-x-0 z-40 bg-surface/95 backdrop-blur-md border-b border-surface-container-high pt-safe">
      <div className="h-16 sm:h-18 px-3.5 sm:px-6 flex items-center justify-between gap-2 sm:gap-4 max-w-5xl mx-auto w-full">
        {/* Brand & Shop identity */}
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-primary-container flex items-center justify-center shrink-0 shadow-xs">
            <span className="material-symbols-outlined text-[20px] sm:text-[22px] text-secondary-fixed">
              receipt_long
            </span>
          </div>

          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="text-base sm:text-lg text-on-surface font-bold tracking-tight">
                {t('app_name', currentLang)}
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-container text-[11px] font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
                {t('offline_ready', currentLang)}
              </span>
            </div>
            <span className="text-xs sm:text-sm text-on-surface-variant truncate">
              {currentLang === 'mr' ? (business.shop_name_marathi || business.shop_name) : (business.shop_name || business.shop_name_marathi)}
            </span>
          </div>
        </div>

        {/* Header Right Action Group */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Bilingual Toggle Button */}
          <button
            onClick={onToggleLanguage}
            className="h-10 px-3 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface flex items-center gap-1.5 font-label-md text-sm transition-all active:scale-95 border border-surface-container-highest shadow-xs"
            title={currentLang === 'mr' ? 'Switch to English' : 'मराठीमध्ये बदला'}
            type="button"
          >
            <span className="material-symbols-outlined text-[18px] text-secondary">
              translate
            </span>
            <span className="font-bold text-xs sm:text-sm">
              {currentLang === 'mr' ? 'English' : 'मराठी'}
            </span>
          </button>

          {/* Notifications Button */}
          <button
            onClick={onOpenNotifications}
            className="relative w-10 h-10 flex items-center justify-center rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface-variant transition-colors active:scale-98"
            aria-label="Pending review notifications"
            type="button"
          >
            <span className="material-symbols-outlined text-[20px]">notifications</span>
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-error text-on-error font-label-sm text-[10px] flex items-center justify-center leading-none font-bold">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Settings / Profile Button */}
          <button
            onClick={onOpenSettings}
            className="w-10 h-10 rounded-xl bg-surface-container hover:bg-surface-container-high flex items-center justify-center text-on-surface transition-colors active:scale-98"
            title="Shop Profile & Settings"
            type="button"
          >
            <span className="material-symbols-outlined text-[20px]">settings</span>
          </button>
        </div>
      </div>
    </header>
  );
};
