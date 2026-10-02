import React, { useState, useMemo } from 'react';
import { Bill } from '../types';

interface BillsRecordsPageProps {
  bills: Bill[];
  onReviewBill: (billId: string) => void;
  onDuplicateBill: (billId: string) => void;
  onPrintBill: (bill: Bill) => void;
  onShareBill: (bill: Bill) => void;
  onExportTally: () => void;
  onViewBillDetails: (bill: Bill) => void;
  onNewBillClick?: () => void;
  onScanClick?: () => void;
}

export const BillsRecordsPage: React.FC<BillsRecordsPageProps> = ({
  bills,
  onReviewBill,
  onDuplicateBill,
  onPrintBill,
  onShareBill,
  onExportTally,
  onNewBillClick,
  onScanClick,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState<string>('all');

  const filteredBills = useMemo(() => {
    return bills.filter((b) => {
      // Filter tab
      if (filterMode === 'review' && b.status !== 'needs_review') return false;
      if (filterMode === 'udhar' && b.payment_mode !== 'credit') return false;
      if (filterMode === 'upi' && b.payment_mode !== 'upi' && b.payment_mode !== 'neft') return false;
      if (filterMode === 'cash' && b.payment_mode !== 'cash') return false;

      // Search
      if (!searchTerm.trim()) return true;
      const q = searchTerm.toLowerCase();
      return (
        b.invoice_number.toLowerCase().includes(q) ||
        b.customer_name.toLowerCase().includes(q) ||
        b.customer_phone?.includes(q) ||
        b.items.some((i) => i.product_name_snapshot.toLowerCase().includes(q))
      );
    });
  }, [bills, filterMode, searchTerm]);

  // Aggregate totals
  const totalAmount = bills.reduce((sum, b) => sum + (b.status !== 'cancelled' ? b.grand_total : 0), 0);
  const cashAmount = bills
    .filter((b) => b.payment_mode === 'cash')
    .reduce((sum, b) => sum + b.grand_total, 0);
  const upiAmount = bills
    .filter((b) => b.payment_mode === 'upi' || b.payment_mode === 'neft')
    .reduce((sum, b) => sum + b.grand_total, 0);
  const creditAmount = bills
    .filter((b) => b.payment_mode === 'credit')
    .reduce((sum, b) => sum + b.grand_total, 0);

  const pendingReviewBills = bills.filter((b) => b.status === 'needs_review');

  return (
    <div className="flex flex-col w-full pb-8 space-y-4 max-w-4xl mx-auto">
      {/* Top Ledger Snapshot / Summary */}
      <section className="bg-surface-container-lowest rounded-xl shadow-sm p-space-md flex flex-col gap-3">
        {/* Header with bilingual title & report action */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-headline-sm text-headline-sm text-on-surface">खातेवही नोंद</span>
              <span className="font-label-md text-label-md text-on-surface-variant font-normal">
                (Ledger Records)
              </span>
            </div>
            <span className="font-label-sm text-label-sm text-on-surface-variant tracking-normal">
              {bills.length} Bills Recorded
            </span>
          </div>
          {bills.length > 0 && (
            <button
              onClick={onExportTally}
              className="min-h-[44px] px-3 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface flex items-center gap-1.5 font-label-md text-label-md transition-colors active:scale-95 shrink-0 font-bold"
              type="button"
            >
              <span className="material-symbols-outlined text-[18px] text-secondary">
                sim_card_download
              </span>
              <span>Tally / Excel</span>
            </button>
          )}
        </div>

        {/* Total Collected Metric Hero */}
        <div className="bg-surface-container-low rounded-lg p-3 flex flex-col gap-2">
          <div className="flex items-baseline justify-between">
            <span className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider font-semibold">
              Total Billing (एकूण व्यवहार)
            </span>
            {bills.length > 0 && (
              <span className="font-label-sm text-label-sm text-secondary font-bold inline-flex items-center gap-0.5">
                <span className="material-symbols-outlined text-[14px]">trending_up</span>Live Ledger
              </span>
            )}
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-display-lg text-display-lg text-on-surface font-bold tracking-tight">
              ₹{totalAmount.toLocaleString('en-IN')}
              <span className="text-headline-sm text-on-surface-variant font-normal">.00</span>
            </span>
          </div>

          {/* Payment Breakdown Pill Strip */}
          <div className="grid grid-cols-3 gap-1.5 pt-1">
            <div className="bg-surface-container-lowest rounded p-2 flex flex-col">
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-secondary shrink-0"></span>
                <span className="font-label-sm text-[10px] text-on-surface-variant truncate">
                  रोख (Cash)
                </span>
              </div>
              <span className="font-label-md text-label-md text-on-surface font-bold truncate mt-0.5">
                ₹{cashAmount.toLocaleString('en-IN')}
              </span>
            </div>
            <div className="bg-surface-container-lowest rounded p-2 flex flex-col">
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-primary-fixed-dim shrink-0"></span>
                <span className="font-label-sm text-[10px] text-on-surface-variant truncate">
                  UPI / बँक
                </span>
              </div>
              <span className="font-label-md text-label-md text-on-surface font-bold truncate mt-0.5">
                ₹{upiAmount.toLocaleString('en-IN')}
              </span>
            </div>
            <div className="bg-surface-container-lowest rounded p-2 flex flex-col">
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-error shrink-0"></span>
                <span className="font-label-sm text-[10px] text-on-surface-variant truncate">
                  उधार (Credit)
                </span>
              </div>
              <span className="font-label-md text-label-md text-error font-bold truncate mt-0.5">
                ₹{creditAmount.toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        </div>

        {/* Verification Banner Pill if unverified bills exist */}
        {pendingReviewBills.length > 0 && (
          <div className="bg-tertiary-fixed rounded-lg p-2.5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="material-symbols-outlined text-[20px] text-on-tertiary-container shrink-0">
                warning_amber
              </span>
              <div className="flex flex-col min-w-0">
                <span className="font-label-md text-label-md text-on-tertiary-fixed font-bold truncate">
                  {pendingReviewBills.length} Bills Need Verification
                </span>
                <span className="font-label-sm text-label-sm text-on-tertiary-fixed-variant truncate">
                  AI स्कॅन केलेल्या पावत्यांची तपासणी शिल्लक आहे
                </span>
              </div>
            </div>
            <button
              onClick={() => onReviewBill(pendingReviewBills[0].id)}
              className="min-h-[40px] px-2.5 rounded bg-tertiary text-on-tertiary font-label-md text-label-md shrink-0 active:scale-95 transition-transform flex items-center gap-1 font-bold"
              type="button"
            >
              <span>पहा</span>
              <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
            </button>
          </div>
        )}
      </section>

      {bills.length > 0 ? (
        <>
          {/* Search & Date Filter Bar */}
          <section className="flex flex-col gap-2">
            <div className="relative w-full">
              <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-on-surface-variant">
                <span className="material-symbols-outlined text-[20px]">search</span>
              </span>
              <input
                type="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search Bill #, Customer, Phone, or Item..."
                className="w-full h-12 pl-10 pr-10 rounded-xl bg-surface-container-lowest text-on-surface placeholder:text-on-surface-variant font-body-md text-body-md shadow-sm outline-none focus:bg-surface-container-low transition-colors"
              />
              <button
                onClick={() => setSearchTerm('')}
                className="absolute inset-y-0 right-2 flex items-center px-1 text-on-surface-variant hover:text-on-surface"
                type="button"
              >
                <span className="material-symbols-outlined text-[20px]">tune</span>
              </button>
            </div>

            <div className="flex items-center justify-between gap-2 px-1">
              <span className="font-label-sm text-label-sm text-on-surface-variant">
                Showing {filteredBills.length} of {bills.length} bills
              </span>
            </div>

            {/* Filter Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 -mx-margin px-margin no-scrollbar">
              <button
                onClick={() => setFilterMode('all')}
                className={`min-h-[38px] px-3.5 rounded-full font-label-md text-label-md shrink-0 flex items-center gap-1 shadow-sm ${
                  filterMode === 'all'
                    ? 'bg-primary text-on-primary font-bold'
                    : 'bg-surface-container-lowest hover:bg-surface-container text-on-surface'
                }`}
                type="button"
              >
                <span>सर्व All</span>
                <span className="px-1.5 py-0.2 rounded-full bg-surface-container text-on-surface text-[10px] font-bold">
                  {bills.length}
                </span>
              </button>

              <button
                onClick={() => setFilterMode('today')}
                className={`min-h-[38px] px-3.5 rounded-full font-label-md text-label-md shrink-0 flex items-center gap-1 shadow-sm ${
                  filterMode === 'today'
                    ? 'bg-primary text-on-primary font-bold'
                    : 'bg-surface-container-lowest hover:bg-surface-container text-on-surface'
                }`}
                type="button"
              >
                <span>आज Today</span>
              </button>

              {pendingReviewBills.length > 0 && (
                <button
                  onClick={() => setFilterMode('review')}
                  className={`min-h-[38px] px-3 rounded-full font-label-md text-label-md shrink-0 flex items-center gap-1 shadow-sm font-bold ${
                    filterMode === 'review'
                      ? 'bg-primary text-on-primary'
                      : 'bg-tertiary-fixed text-on-tertiary-fixed'
                  }`}
                  type="button"
                >
                  <span className="material-symbols-outlined text-[16px] text-on-tertiary-container">error</span>
                  <span>Review ⚠️</span>
                  <span className="px-1.5 py-0.2 rounded-full bg-error text-on-error text-[10px]">
                    {pendingReviewBills.length}
                  </span>
                </button>
              )}

              <button
                onClick={() => setFilterMode('udhar')}
                className={`min-h-[38px] px-3.5 rounded-full font-label-md text-label-md shrink-0 flex items-center gap-1 shadow-sm ${
                  filterMode === 'udhar'
                    ? 'bg-primary text-on-primary font-bold'
                    : 'bg-surface-container-lowest hover:bg-surface-container text-on-surface'
                }`}
                type="button"
              >
                <span>उधार Udhar</span>
                <span className="px-1.5 py-0.2 rounded-full bg-error-container text-on-error-container text-[10px]">
                  {bills.filter((b) => b.payment_mode === 'credit').length}
                </span>
              </button>

              <button
                onClick={() => setFilterMode('upi')}
                className={`min-h-[38px] px-3.5 rounded-full font-label-md text-label-md shrink-0 shadow-sm ${
                  filterMode === 'upi'
                    ? 'bg-primary text-on-primary font-bold'
                    : 'bg-surface-container-lowest hover:bg-surface-container text-on-surface'
                }`}
                type="button"
              >
                <span>UPI / Online</span>
              </button>

              <button
                onClick={() => setFilterMode('cash')}
                className={`min-h-[38px] px-3.5 rounded-full font-label-md text-label-md shrink-0 shadow-sm ${
                  filterMode === 'cash'
                    ? 'bg-primary text-on-primary font-bold'
                    : 'bg-surface-container-lowest hover:bg-surface-container text-on-surface'
                }`}
                type="button"
              >
                <span>रोख Cash</span>
              </button>
            </div>
          </section>

          {/* Bills Cards List */}
          <section className="flex flex-col gap-3">
            {filteredBills.map((bill) => {
              const isReview = bill.status === 'needs_review';

              return (
                <article
                  key={bill.id}
                  className="bg-surface-container-lowest rounded-xl shadow-sm p-space-md flex flex-col gap-2.5"
                >
                  {isReview && (
                    <div className="bg-tertiary-fixed rounded-lg p-2.5 flex items-start gap-2">
                      <span className="material-symbols-outlined text-[20px] text-on-tertiary-container shrink-0 mt-0.5">
                        warning
                      </span>
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-label-md text-label-md text-on-tertiary-fixed font-bold">
                            1 Ambiguous Item (तपासणी हवी)
                          </span>
                          <span className="px-1.5 py-0.2 rounded bg-surface-container-lowest text-on-tertiary-container font-label-sm text-[9px] font-bold">
                            AI Slip
                          </span>
                        </div>
                        <span className="font-label-sm text-label-sm text-on-tertiary-fixed-variant mt-0.5">
                          {bill.unverified_reason || 'Requires rate or item confirmation before filing.'}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-label-lg text-label-lg text-on-surface font-bold">
                          #{bill.invoice_number}
                        </span>
                        <span className="font-label-sm text-label-sm text-on-surface-variant">
                          • {bill.bill_date} {bill.time_str || ''}
                        </span>
                      </div>
                      <span className="font-body-bold text-body-bold text-on-surface truncate">
                        {bill.customer_name}
                      </span>
                      <span className="font-label-md text-label-md text-on-surface-variant truncate">
                        {bill.customer_address || 'Walk-in'} • {bill.customer_phone}
                      </span>
                    </div>
                    <div className="flex flex-col items-end shrink-0">
                      <span className="font-currency-numeral text-currency-numeral text-on-surface">
                        {isReview ? '~' : ''}₹{bill.grand_total.toLocaleString('en-IN')}
                        <span className="text-label-sm text-on-surface-variant font-normal">.00</span>
                      </span>
                      <span
                        className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full font-label-sm text-[10px] font-bold mt-1 ${
                          bill.payment_mode === 'credit'
                            ? 'bg-error-container text-on-error-container'
                            : bill.payment_mode === 'upi'
                            ? 'bg-secondary-container text-on-secondary-container'
                            : 'bg-surface-container text-on-surface-variant'
                        }`}
                      >
                        {bill.payment_mode === 'upi' && <span className="material-symbols-outlined text-[12px]">check_circle</span>}
                        {bill.payment_mode === 'credit' ? 'उधार Credit' : bill.payment_mode.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  {/* Items Summary */}
                  <div className="bg-surface-container-low rounded-lg p-2 flex flex-col gap-1">
                    <div className="flex items-center justify-between text-on-surface-variant font-label-sm text-label-sm">
                      <span>{bill.items.length} वस्तू (Items)</span>
                      <span className={isReview ? 'text-error font-semibold' : 'text-on-secondary-fixed-variant font-semibold'}>
                        {isReview ? '⚠ Needs Review' : '✓ Verified Bill'}
                      </span>
                    </div>
                    <p className="font-body-md text-body-md text-on-surface truncate">
                      {bill.items.map((i) => i.product_name_snapshot).join(', ')}
                    </p>
                  </div>

                  {/* Action buttons */}
                  {isReview ? (
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => onReviewBill(bill.id)}
                        className="min-h-[48px] flex-1 px-3 rounded-lg bg-primary text-on-primary font-label-lg text-label-lg flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-transform font-bold"
                        type="button"
                      >
                        <span className="material-symbols-outlined text-[20px] text-tertiary-fixed">
                          edit_document
                        </span>
                        <span>Fix & Confirm (दुरुस्त करा)</span>
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between pt-1 gap-1.5">
                      <button
                        onClick={() => onShareBill(bill)}
                        className="min-h-[44px] flex-1 px-2 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface flex items-center justify-center gap-1 font-label-md text-label-md active:scale-95 transition-transform font-semibold"
                        title="Share via WhatsApp"
                        type="button"
                      >
                        <span className="material-symbols-outlined text-[18px] text-secondary">chat</span>
                        <span>WhatsApp</span>
                      </button>
                      <button
                        onClick={() => onPrintBill(bill)}
                        className="min-h-[44px] flex-1 px-2 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface flex items-center justify-center gap-1 font-label-md text-label-md active:scale-95 transition-transform font-semibold"
                        title="Print Invoice"
                        type="button"
                      >
                        <span className="material-symbols-outlined text-[18px] text-on-surface-variant">print</span>
                        <span>Print</span>
                      </button>
                      <button
                        onClick={() => onDuplicateBill(bill.id)}
                        className="min-h-[44px] px-3 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface flex items-center justify-center gap-1 font-label-md text-label-md active:scale-95 transition-transform font-semibold"
                        title="Duplicate bill for new customer"
                        type="button"
                      >
                        <span className="material-symbols-outlined text-[18px] text-on-surface-variant">
                          content_copy
                        </span>
                        <span>कच्चा</span>
                      </button>
                    </div>
                  )}
                </article>
              );
            })}
          </section>
        </>
      ) : (
        /* Empty State */
        <div className="rounded-2xl bg-surface-container-low p-8 text-center flex flex-col items-center justify-center gap-3 py-12 border border-surface-container">
          <div className="w-16 h-16 rounded-2xl bg-surface-container flex items-center justify-center text-primary">
            <span className="material-symbols-outlined text-[36px]">receipt_long</span>
          </div>
          <h3 className="font-headline-md text-headline-md text-on-surface">No bills yet</h3>
          <p className="font-body-md text-on-surface-variant max-w-md">
            Create your first bill or scan an existing physical bill to begin your digital ledger.
          </p>
          <div className="flex items-center gap-3 mt-4">
            {onNewBillClick && (
              <button
                onClick={onNewBillClick}
                className="h-12 px-5 rounded-xl bg-primary text-on-primary font-label-lg font-bold flex items-center gap-2 shadow-md active:scale-95 transition-all"
                type="button"
              >
                <span className="material-symbols-outlined text-[20px]">add_shopping_cart</span>
                <span>+ Create New Bill</span>
              </button>
            )}
            {onScanClick && (
              <button
                onClick={onScanClick}
                className="h-12 px-5 rounded-xl bg-secondary text-on-secondary font-label-lg font-bold flex items-center gap-2 shadow-md active:scale-95 transition-all"
                type="button"
              >
                <span className="material-symbols-outlined text-[20px]">photo_camera</span>
                <span>Scan Bill</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
