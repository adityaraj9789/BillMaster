import React from 'react';
import { Bill, BusinessProfile, Product } from '../types';

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
  language: 'en' | 'mr' | 'mixed';
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
}) => {
  const currentDateFormatted = new Date().toLocaleDateString('en-IN', {
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
          <h1 className="text-2xl font-bold tracking-tight text-on-surface">Overview</h1>
          <p className="text-sm text-on-surface-variant mt-0.5">{currentDateFormatted}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary-container text-on-secondary-container text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-secondary"></span>
            Register Open
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
              <span className="text-lg font-bold block leading-tight">Scan Physical Bill</span>
              <span className="text-xs opacity-90 block mt-0.5">कच्चे बिल किंवा पावती स्कॅन करा</span>
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
              <span className="text-lg font-bold block leading-tight">Create New Bill</span>
              <span className="text-xs text-on-primary-container block mt-0.5">नवीन बिल बनवा • POS Counter</span>
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
              Today's Sales (आजची विक्री)
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
              {metrics.todayBillsCount} {metrics.todayBillsCount === 1 ? 'Bill' : 'Bills'} recorded today
            </span>
          </div>

          <div className="pt-3 border-t border-surface-container-high flex items-center justify-between text-xs text-on-surface-variant">
            <span>Average: ₹{metrics.avgBillAmount.toLocaleString('en-IN')}/bill</span>
            <span>
              {metrics.todayBillsCount > 0
                ? `Cash ${metrics.cashPercent}% • Digital ${metrics.upiPercent}%`
                : 'No transactions yet'}
            </span>
          </div>
        </div>

        {/* Catalog Items Card */}
        <div className="rounded-2xl bg-surface-container p-6 flex flex-col justify-between border border-surface-container-high">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
              Catalogue Items (कॅटलॉग)
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
              {metrics.totalAliasesLearned} verified Marathi & shorthand aliases
            </span>
          </div>

          <div className="pt-3 border-t border-surface-container-high flex items-center justify-between text-xs text-secondary font-semibold">
            <span>{metrics.totalCustomers} Customers registered</span>
            <span>Active Ledger</span>
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
                {metrics.billsNeedingReviewCount} {metrics.billsNeedingReviewCount === 1 ? 'Bill Needs' : 'Bills Need'} Review (तपासणी हवी)
              </span>
              <p className="text-sm text-on-error-container/90 mt-0.5">
                {metrics.billsNeedingReview[0]?.unverified_reason ||
                  'Ambiguous handwriting or unread rate detected.'}
              </p>
            </div>
          </div>
          <button
            onClick={() => onReviewPendingClick(metrics.billsNeedingReview[0]?.id)}
            className="h-11 px-5 rounded-xl bg-error text-on-error text-sm font-bold flex items-center gap-2 active:scale-95 transition-transform shrink-0"
            type="button"
          >
            <span>Review Now</span>
            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          </button>
        </div>
      )}

      {/* Frequently Billed Products */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-on-surface">
            Fast Moving Products (वारंवार लागणारे सामान)
          </h2>
          <span className="text-xs text-on-surface-variant">Tap to add</span>
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
                  {prod.name}
                </span>
                <span className="text-sm font-bold text-secondary mt-2 block">
                  ₹{prod.selling_price.toLocaleString('en-IN')}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl bg-surface-container-low p-6 text-center flex flex-col items-center justify-center gap-2 border border-surface-container">
            <p className="text-sm font-semibold text-on-surface">No products added yet</p>
            <p className="text-xs text-on-surface-variant max-w-sm">
              Add products or scan a bill to quickly populate your fast-moving catalogue.
            </p>
            <button
              onClick={onAddProductClick}
              className="mt-2 h-10 px-4 rounded-xl bg-primary text-on-primary text-xs font-bold"
              type="button"
            >
              + Add Product
            </button>
          </div>
        )}
      </div>

      {/* Recent Bills */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-on-surface">Recent Bills (ताजी बिले)</h2>
          <button
            onClick={onViewAllRecords}
            className="text-sm font-semibold text-primary hover:underline flex items-center gap-0.5"
            type="button"
          >
            <span>View All</span>
            <span className="material-symbols-outlined text-[16px]">chevron_right</span>
          </button>
        </div>

        {recentBills.length > 0 ? (
          <div className="flex flex-col gap-3">
            {recentBills.slice(0, 4).map((bill) => {
              const isReview = bill.status === 'needs_review';

              return (
                <div
                  key={bill.id}
                  className={`p-5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    isReview
                      ? 'bg-error-container/30 border-error/20'
                      : 'bg-surface-container-lowest border-surface-container'
                  }`}
                >
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-base text-on-surface">
                        {bill.customer_name}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-surface-container text-xs font-semibold text-on-surface-variant uppercase">
                        {bill.payment_mode === 'credit' ? 'Udhar' : bill.payment_mode}
                      </span>
                      {isReview && (
                        <span className="px-2 py-0.5 rounded-full bg-error text-on-error text-xs font-bold">
                          Needs Review
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-on-surface-variant mt-1">
                      #{bill.invoice_number} • {bill.bill_date} {bill.time_str || ''} • {bill.items.length} {bill.items.length === 1 ? 'item' : 'items'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                    <div className="text-left sm:text-right">
                      <span className="text-xl font-bold text-on-surface block">
                        ₹{bill.grand_total.toLocaleString('en-IN')}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {isReview ? (
                        <button
                          onClick={() => onReviewPendingClick(bill.id)}
                          className="h-10 px-4 rounded-xl bg-error text-on-error text-xs font-bold flex items-center gap-1 active:scale-95"
                          type="button"
                        >
                          <span className="material-symbols-outlined text-[16px]">edit</span>
                          <span>Fix</span>
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={() => onShareBill(bill)}
                            className="w-10 h-10 rounded-xl bg-surface-container hover:bg-surface-container-high flex items-center justify-center text-on-surface-variant transition-colors"
                            title="Share on WhatsApp"
                            type="button"
                          >
                            <span className="material-symbols-outlined text-[18px]">share</span>
                          </button>
                          <button
                            onClick={() => onPrintBill(bill)}
                            className="w-10 h-10 rounded-xl bg-surface-container hover:bg-surface-container-high flex items-center justify-center text-on-surface-variant transition-colors"
                            title="Print"
                            type="button"
                          >
                            <span className="material-symbols-outlined text-[18px]">print</span>
                          </button>
                          <button
                            onClick={() => onViewBillDetails(bill)}
                            className="w-10 h-10 rounded-xl bg-surface-container hover:bg-surface-container-high flex items-center justify-center text-on-surface-variant transition-colors"
                            title="View PDF"
                            type="button"
                          >
                            <span className="material-symbols-outlined text-[18px]">visibility</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl bg-surface-container-low p-8 text-center flex flex-col items-center justify-center gap-2 border border-surface-container">
            <span className="material-symbols-outlined text-[32px] text-on-surface-variant opacity-50">
              receipt_long
            </span>
            <p className="text-base font-semibold text-on-surface">No bills yet</p>
            <p className="text-sm text-on-surface-variant max-w-sm">
              Create your first bill or scan an existing physical bill to begin your ledger.
            </p>
            <div className="flex gap-3 mt-3">
              <button
                onClick={onNewBillClick}
                className="h-11 px-5 rounded-xl bg-primary text-on-primary text-sm font-bold active:scale-95"
                type="button"
              >
                Create Bill
              </button>
              <button
                onClick={onScanClick}
                className="h-11 px-5 rounded-xl bg-secondary text-on-secondary text-sm font-bold active:scale-95"
                type="button"
              >
                Scan Bill
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
