import React from 'react';
import { Bill, BusinessProfile, Product } from '../types';
import { t } from '../services/i18n/translations';

interface DashboardPageProps {
  business: BusinessProfile;
  metrics: {
    todaySales: number;
    todayBillsCount: number;
    totalProducts: number;
    totalCustomers: number;
    billsNeedingReviewCount: number;
    billsNeedingReview: Bill[];
    totalAliasesLearned: number;
    cashPercent: number;
    upiPercent: number;
    avgBillAmount: number;
  };
  recentBills: Bill[];
  fastMovingProducts: Product[];
  onScanClick: () => void;
  onNewBillClick: () => void;
  onViewAllRecords: () => void;
  onReviewPendingClick: (billId?: string) => void;
  onQuickAddItem: (product: Product) => void;
  onAddProductClick: () => void;
  onShareBill: (bill: Bill) => void;
  onPrintBill: (bill: Bill) => void;
  onViewBillDetails: (bill: Bill) => void;
  language?: 'en' | 'mr' | 'mixed';
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  metrics,
  recentBills,
  fastMovingProducts,
  onScanClick,
  onNewBillClick,
  onViewAllRecords,
  onReviewPendingClick,
  onQuickAddItem,
  onAddProductClick,
  onShareBill,
  onPrintBill,
  onViewBillDetails,
  language = 'en',
}) => {
  const currentLang = language === 'mr' ? 'mr' : 'en';

  const currentDateFormatted = new Date().toLocaleDateString(currentLang === 'mr' ? 'mr-IN' : 'en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  return (
    <div className="flex flex-col w-full gap-8 max-w-4xl mx-auto py-2">
      {/* Top Section Header: Clean, Professional, No Greetings */}
      <div className="flex items-center justify-between pb-1 border-b border-surface-container">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-on-surface">
            {t('overview', currentLang)}
          </h1>
          <p className="text-sm text-on-surface-variant mt-0.5">{currentDateFormatted}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary-container text-on-secondary-container text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-secondary"></span>
            {t('register_open', currentLang)}
          </span>
        </div>
      </div>

      {/* Primary Action Buttons: Large, Spacious, Clear Touch Targets */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Scan Physical Bill */}
        <button
          onClick={onScanClick}
          className="min-h-[72px] rounded-2xl bg-secondary text-on-secondary px-6 py-4 flex items-center justify-between shadow-sm hover:opacity-95 active:scale-[0.99] transition-all text-left"
          type="button"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-on-secondary text-secondary flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[28px]">photo_camera</span>
            </div>
            <div>
              <span className="text-lg font-bold block leading-tight">
                {t('scan_physical_bill', currentLang)}
              </span>
              <span className="text-xs opacity-90 block mt-0.5">
                {t('scan_bill_desc', currentLang)}
              </span>
            </div>
          </div>
          <span className="material-symbols-outlined text-[24px]">chevron_right</span>
        </button>

        {/* Quick New Bill */}
        <button
          onClick={onNewBillClick}
          className="min-h-[72px] rounded-2xl bg-primary text-on-primary px-6 py-4 flex items-center justify-between shadow-sm hover:opacity-95 active:scale-[0.99] transition-all text-left"
          type="button"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-surface-container-high text-primary flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[28px]">add_shopping_cart</span>
            </div>
            <div>
              <span className="text-lg font-bold block leading-tight">
                {t('create_new_bill', currentLang)}
              </span>
              <span className="text-xs text-on-primary-container block mt-0.5">
                {t('create_new_bill_desc', currentLang)}
              </span>
            </div>
          </div>
          <span className="material-symbols-outlined text-[24px]">chevron_right</span>
        </button>
      </div>

      {/* Key Metrics: Spacious, Uncluttered */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Today's Sales Card */}
        <div className="rounded-2xl bg-surface-container p-6 flex flex-col justify-between border border-surface-container-high">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
              {t('todays_sales', currentLang)}
            </span>
            <div className="w-9 h-9 rounded-xl bg-surface-container-high flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-[20px]">payments</span>
            </div>
          </div>

          <div className="my-4">
            <span className="text-3xl sm:text-4xl font-bold tracking-tight text-on-surface block">
              ₹{metrics.todaySales.toLocaleString('en-IN')}
            </span>
            <span className="text-sm font-semibold text-secondary mt-1 block">
              {metrics.todayBillsCount} {t('bills_recorded_today', currentLang)}
            </span>
          </div>

          <div className="pt-3 border-t border-surface-container-high flex items-center justify-between text-xs text-on-surface-variant">
            <span>{t('average', currentLang)}: ₹{metrics.avgBillAmount.toLocaleString('en-IN')}/bill</span>
            <span>
              {metrics.todayBillsCount > 0
                ? `${t('cash', currentLang)} ${metrics.cashPercent}% • ${t('upi', currentLang)} ${metrics.upiPercent}%`
                : currentLang === 'mr' ? 'कोणतेही व्यवहार नाहीत' : 'No transactions yet'}
            </span>
          </div>
        </div>

        {/* Catalog Items Card */}
        <div className="rounded-2xl bg-surface-container p-6 flex flex-col justify-between border border-surface-container-high">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
              {t('catalog_items', currentLang)}
            </span>
            <div className="w-9 h-9 rounded-xl bg-surface-container-high flex items-center justify-center text-secondary">
              <span className="material-symbols-outlined text-[20px]">inventory_2</span>
            </div>
          </div>

          <div className="my-4">
            <span className="text-3xl sm:text-4xl font-bold tracking-tight text-on-surface block">
              {metrics.totalProducts}
            </span>
            <span className="text-sm text-on-surface-variant mt-1 block">
              {metrics.totalAliasesLearned} {currentLang === 'mr' ? 'मराठी व शॉर्टहँड टोपणनावे शिकवली' : 'verified Marathi & shorthand aliases'}
            </span>
          </div>

          <div className="pt-3 border-t border-surface-container-high flex items-center justify-between text-xs text-secondary font-semibold">
            <span>{metrics.totalCustomers} {currentLang === 'mr' ? 'ग्राहक नोंदवले' : 'Customers registered'}</span>
            <span>{currentLang === 'mr' ? 'खतावणी सक्रिय' : 'Active Ledger'}</span>
          </div>
        </div>
      </div>

      {/* Review Banner if any bills need attention */}
      {metrics.billsNeedingReviewCount > 0 && (
        <div className="rounded-2xl bg-error-container p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-error/20">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-on-error flex items-center justify-center shrink-0 text-error">
              <span className="material-symbols-outlined text-[24px]">edit_note</span>
            </div>
            <div>
              <span className="text-base font-bold text-on-error-container block">
                {metrics.billsNeedingReviewCount} {currentLang === 'mr' ? 'बिलांची तपासणी आवश्यक आहे' : 'Bills Need Review'}
              </span>
              <p className="text-sm text-on-error-container/90 mt-0.5">
                {metrics.billsNeedingReview[0]?.unverified_reason ||
                  (currentLang === 'mr' ? 'अस्पष्ट अक्षर किंवा दर आढळला आहे.' : 'Ambiguous handwriting or unread rate detected.')}
              </p>
            </div>
          </div>
          <button
            onClick={() => onReviewPendingClick(metrics.billsNeedingReview[0]?.id)}
            className="h-11 px-5 rounded-xl bg-error text-on-error text-sm font-bold flex items-center gap-2 active:scale-95 transition-transform shrink-0"
            type="button"
          >
            <span>{currentLang === 'mr' ? 'आताच तपासा' : 'Review Now'}</span>
            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          </button>
        </div>
      )}

      {/* Frequently Billed Products */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-on-surface">
            {t('fast_moving', currentLang)}
          </h2>
          <span className="text-xs text-on-surface-variant">
            {currentLang === 'mr' ? 'क्लिक करून बिलात जोडा' : 'Tap to add'}
          </span>
        </div>

        {fastMovingProducts.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {fastMovingProducts.map((prod) => (
              <button
                key={prod.id}
                onClick={() => onQuickAddItem(prod)}
                className="p-4 rounded-xl bg-surface-container-low hover:bg-surface-container border border-surface-container text-left transition-colors flex flex-col justify-between min-h-[96px] active:scale-98"
                type="button"
              >
                <span className="font-semibold text-sm text-on-surface line-clamp-2">
                  {currentLang === 'mr' ? (prod.name_marathi || prod.name) : prod.name}
                </span>
                <span className="text-sm font-bold text-secondary mt-2 block">
                  ₹{prod.selling_price.toLocaleString('en-IN')}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl bg-surface-container-low p-6 text-center flex flex-col items-center justify-center gap-2 border border-surface-container">
            <p className="text-sm font-semibold text-on-surface">
              {t('no_products_yet', currentLang)}
            </p>
            <p className="text-xs text-on-surface-variant max-w-sm">
              {t('no_products_sub', currentLang)}
            </p>
            <button
              onClick={onAddProductClick}
              className="mt-2 h-10 px-4 rounded-xl bg-primary text-on-primary text-xs font-bold"
              type="button"
            >
              {t('add_first_product', currentLang)}
            </button>
          </div>
        )}
      </div>

      {/* Recent Bills */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-on-surface">
            {t('recent_bills', currentLang)}
          </h2>
          <button
            onClick={onViewAllRecords}
            className="text-sm font-semibold text-primary hover:underline flex items-center gap-0.5"
            type="button"
          >
            <span>{t('view_all_records', currentLang)}</span>
            <span className="material-symbols-outlined text-[16px]">chevron_right</span>
          </button>
        </div>

        {recentBills.length > 0 ? (
          <div className="space-y-3">
            {recentBills.slice(0, 5).map((bill) => (
              <div
                key={bill.id}
                className="p-4 rounded-xl bg-surface-container-low border border-surface-container flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs hover:border-surface-container-high transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
                      bill.status === 'verified'
                        ? 'bg-secondary-container text-on-secondary-container'
                        : 'bg-error-container text-on-error-container'
                    }`}
                  >
                    {bill.status === 'verified' ? '✓' : '!'}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-on-surface">
                        #{bill.invoice_number}
                      </span>
                      <span className="text-xs text-on-surface-variant truncate">
                        {bill.customer_name}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          bill.status === 'verified'
                            ? 'bg-secondary-container text-on-secondary-container'
                            : 'bg-error-container text-on-error-container'
                        }`}
                      >
                        {bill.status === 'verified'
                          ? t('verified', currentLang)
                          : t('needs_review', currentLang)}
                      </span>
                    </div>

                    <div className="text-xs text-on-surface-variant mt-0.5">
                      <span>{bill.bill_date}</span>
                      <span className="mx-1.5">•</span>
                      <span>
                        {bill.items.length}{' '}
                        {bill.items.length === 1
                          ? (currentLang === 'mr' ? 'वस्तू' : 'item')
                          : (currentLang === 'mr' ? 'वस्तू' : 'items')}
                      </span>
                      <span className="mx-1.5">•</span>
                      <span className="uppercase font-semibold">{bill.payment_mode}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-0 border-surface-container">
                  <span className="font-bold text-base text-on-surface">
                    ₹{bill.grand_total.toLocaleString('en-IN')}
                  </span>

                  <div className="flex items-center gap-1.5">
                    {bill.status !== 'verified' ? (
                      <button
                        onClick={() => onReviewPendingClick(bill.id)}
                        className="h-9 px-3 rounded-lg bg-error text-on-error text-xs font-bold active:scale-95 transition-transform"
                        type="button"
                      >
                        {currentLang === 'mr' ? 'दुरुस्त करा' : 'Review'}
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => onShareBill(bill)}
                          className="w-9 h-9 rounded-lg bg-surface-container hover:bg-surface-container-high flex items-center justify-center text-secondary active:scale-95 transition-transform"
                          title="Share on WhatsApp"
                          type="button"
                        >
                          <span className="material-symbols-outlined text-[18px]">chat</span>
                        </button>
                        <button
                          onClick={() => onPrintBill(bill)}
                          className="w-9 h-9 rounded-lg bg-surface-container hover:bg-surface-container-high flex items-center justify-center text-on-surface-variant active:scale-95 transition-transform"
                          title="Print"
                          type="button"
                        >
                          <span className="material-symbols-outlined text-[18px]">print</span>
                        </button>
                        <button
                          onClick={() => onViewBillDetails(bill)}
                          className="w-9 h-9 rounded-lg bg-surface-container hover:bg-surface-container-high flex items-center justify-center text-on-surface-variant active:scale-95 transition-transform"
                          title="PDF"
                          type="button"
                        >
                          <span className="material-symbols-outlined text-[18px]">download</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl bg-surface-container-low p-8 text-center flex flex-col items-center justify-center gap-2 border border-surface-container">
            <span className="material-symbols-outlined text-[36px] text-on-surface-variant opacity-60">
              receipt_long
            </span>
            <p className="text-sm font-semibold text-on-surface">
              {t('no_bills_yet', currentLang)}
            </p>
            <p className="text-xs text-on-surface-variant max-w-sm">
              {t('no_bills_sub', currentLang)}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <button
                onClick={onScanClick}
                className="h-10 px-4 rounded-xl bg-secondary text-on-secondary text-xs font-bold"
                type="button"
              >
                {t('scan_physical_bill', currentLang)}
              </button>
              <button
                onClick={onNewBillClick}
                className="h-10 px-4 rounded-xl bg-primary text-on-primary text-xs font-bold"
                type="button"
              >
                {t('create_first_bill', currentLang)}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
