import React from 'react';
import { t } from '../services/i18n/translations';

export type NavTab = 'dashboard' | 'products-catalogue' | 'scan-bill' | 'new-bill' | 'bills-records';

interface BottomNavProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  language?: 'en' | 'mr' | 'mixed';
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onSelectTab, language = 'en' }) => {
  const currentLang = language === 'mr' ? 'mr' : 'en';

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 pb-safe bg-surface/90 backdrop-blur-xl shadow-[0_-2px_12px_rgba(0,0,0,0.06)] no-print">
      <div className="flex justify-around items-center h-20 px-2 max-w-lg mx-auto">
        {/* Home */}
        <button
          onClick={() => onSelectTab('dashboard')}
          className={`flex flex-col items-center justify-center min-w-[48px] min-h-[48px] py-1 transition-all gap-0.5 ${
            activeTab === 'dashboard'
              ? 'text-primary font-bold'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
          type="button"
        >
          <span
            className="material-symbols-outlined text-[24px]"
            style={{ fontVariationSettings: activeTab === 'dashboard' ? "'FILL' 1" : "'FILL' 0" }}
          >
            home
          </span>
          <span className="font-label-sm text-label-sm">{t('nav_home', currentLang)}</span>
        </button>

        {/* Products */}
        <button
          onClick={() => onSelectTab('products-catalogue')}
          className={`flex flex-col items-center justify-center min-w-[48px] min-h-[48px] py-1 transition-all gap-0.5 ${
            activeTab === 'products-catalogue'
              ? 'text-primary font-bold'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
          type="button"
        >
          <span
            className="material-symbols-outlined text-[24px]"
            style={{ fontVariationSettings: activeTab === 'products-catalogue' ? "'FILL' 1" : "'FILL' 0" }}
          >
            inventory_2
          </span>
          <span className="font-label-sm text-label-sm">{t('nav_products', currentLang)}</span>
        </button>

        {/* Primary Scan Button (Elevated) */}
        <button
          onClick={() => onSelectTab('scan-bill')}
          className="flex flex-col items-center justify-center min-w-[56px] min-h-[56px] -mt-5 rounded-full bg-primary text-on-primary shadow-lg hover:bg-on-primary-fixed-variant transition-transform active:scale-95 gap-0.5"
          aria-label="Scan Bill"
          type="button"
        >
          <span className="material-symbols-outlined text-[26px]">document_scanner</span>
          <span className="font-label-sm text-[10px] text-on-primary font-bold">{t('nav_scan', currentLang)}</span>
        </button>

        {/* New Bill */}
        <button
          onClick={() => onSelectTab('new-bill')}
          className={`flex flex-col items-center justify-center min-w-[48px] min-h-[48px] py-1 transition-all gap-0.5 ${
            activeTab === 'new-bill'
              ? 'text-primary font-bold'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
          type="button"
        >
          <span
            className="material-symbols-outlined text-[24px]"
            style={{ fontVariationSettings: activeTab === 'new-bill' ? "'FILL' 1" : "'FILL' 0" }}
          >
            point_of_sale
          </span>
          <span className="font-label-sm text-label-sm">{t('nav_new_bill', currentLang)}</span>
        </button>

        {/* Records */}
        <button
          onClick={() => onSelectTab('bills-records')}
          className={`flex flex-col items-center justify-center min-w-[48px] min-h-[48px] py-1 transition-all gap-0.5 ${
            activeTab === 'bills-records'
              ? 'text-primary font-bold'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
          type="button"
        >
          <span
            className="material-symbols-outlined text-[24px]"
            style={{ fontVariationSettings: activeTab === 'bills-records' ? "'FILL' 1" : "'FILL' 0" }}
          >
            receipt_long
          </span>
          <span className="font-label-sm text-label-sm">{t('nav_records', currentLang)}</span>
        </button>
      </div>
    </nav>
  );
};
