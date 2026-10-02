import React, { useState } from 'react';
import { Bill, BillItem, Product } from '../types';
import { calculateBillTotals } from '../services/billing/calculator';

interface ReviewPendingBillsPageProps {
  bill: Bill;
  allProducts: Product[];
  onBack: () => void;
  onSaveConfirmedBill: (updatedBill: Bill) => void;
  onDiscard: () => void;
}

export const ReviewPendingBillsPage: React.FC<ReviewPendingBillsPageProps> = ({
  bill,
  allProducts,
  onBack,
  onSaveConfirmedBill,
  onDiscard,
}) => {
  const [showSlip, setShowSlip] = useState(true);
  const [items, setItems] = useState<BillItem[]>(bill.items || []);
  const [customerName, setCustomerName] = useState(bill.customer_name);
  const [customerPhone, setCustomerPhone] = useState(bill.customer_phone || '');
  const [isEditingCustomer, setIsEditingCustomer] = useState(false);
  const [enteredRates, setEnteredRates] = useState<{ [index: number]: string }>({});
  const [showProductPickerIndex, setShowProductPickerIndex] = useState<number | null>(null);

  // Recalculate totals on item change
  const calculation = calculateBillTotals(items);
  const unresolvedCount = items.filter((i) => i.confidence !== 'looks_correct').length;

  const handleResolveSuggestion = (index: number, newTitle: string, newRate: number, prodId?: string) => {
    const updated = [...items];
    updated[index] = {
      ...updated[index],
      product_id: prodId || updated[index].product_id,
      product_name_snapshot: newTitle,
      unit_price: newRate,
      confidence: 'looks_correct',
      uncertainty_reason: undefined,
    };
    setItems(updated);
  };

  const handleSaveRate = (index: number) => {
    const rateVal = parseFloat(enteredRates[index] || '') || 0;
    if (rateVal <= 0) return;

    const updated = [...items];
    updated[index] = {
      ...updated[index],
      unit_price: rateVal,
      confidence: 'looks_correct',
      uncertainty_reason: undefined,
    };
    setItems(updated);
  };

  const handleSelectCatalogueProduct = (index: number, product: Product) => {
    const updated = [...items];
    updated[index] = {
      ...updated[index],
      product_id: product.id,
      product_name_snapshot: product.name,
      product_name_marathi: product.name_marathi,
      unit_price: product.selling_price,
      sku_snapshot: product.sku,
      hsn_snapshot: product.hsn_code,
      confidence: 'looks_correct',
      uncertainty_reason: undefined,
    };
    setItems(updated);
    setShowProductPickerIndex(null);
  };

  const handleAddLineItem = () => {
    const newItem: BillItem = {
      id: `item-added-${Date.now()}`,
      product_name_snapshot: 'New Item',
      quantity: 1,
      unit: 'Nos',
      unit_price: 0,
      gst_percent: 18,
      total: 0,
      confidence: 'looks_correct',
    };
    setItems([...items, newItem]);
  };

  const handleSaveBill = () => {
    const finalBill: Bill = {
      ...bill,
      customer_name: customerName,
      customer_phone: customerPhone,
      items: calculation.items,
      subtotal: calculation.taxableSubtotal,
      cgst: calculation.cgst,
      sgst: calculation.sgst,
      gst: calculation.totalGst,
      round_off: calculation.roundOff,
      grand_total: calculation.grandTotal,
      status: 'verified',
      unverified_reason: undefined,
    };
    onSaveConfirmedBill(finalBill);
  };

  return (
    <div className="flex flex-col w-full pb-32 space-y-space-md max-w-4xl mx-auto">
      {/* Top Navigation Bar with Back Button */}
      <div className="flex items-center justify-between pb-2 border-b border-surface-container-high">
        <button
          onClick={onBack}
          className="min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center text-on-surface hover:bg-surface-container transition-colors"
          type="button"
          aria-label="Back"
        >
          <span className="material-symbols-outlined text-[24px]">arrow_back</span>
        </button>
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-secondary text-[24px]">verified</span>
          <h1 className="font-headline-sm text-headline-sm text-on-surface">Review Pending Bills</h1>
        </div>
        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-on-primary">
          <span className="material-symbols-outlined text-[18px]">person</span>
        </div>
      </div>

      {/* Attention Alert Bar */}
      <aside
        className={`w-full p-space-md rounded-xl shadow-sm flex items-center justify-between gap-space-sm transition-all duration-300 ${
          unresolvedCount > 0
            ? 'bg-tertiary-fixed text-on-tertiary-fixed'
            : 'bg-secondary-fixed text-on-secondary-fixed'
        }`}
        id="alert-banner"
      >
        <div className="flex items-center gap-space-xs min-w-0">
          <span
            className="material-symbols-outlined text-[22px] shrink-0"
            style={{ color: unresolvedCount > 0 ? '#2f1500' : '#006c4a' }}
          >
            {unresolvedCount > 0 ? 'warning' : 'task_alt'}
          </span>
          <div className="min-w-0">
            <p className="font-label-lg text-label-lg font-bold truncate">
              {unresolvedCount > 0
                ? `${unresolvedCount} fields need your attention`
                : 'All fields verified & ready to save'}
            </p>
            <p className="font-label-sm text-label-sm opacity-90 truncate">
              {unresolvedCount > 0
                ? 'कृपया सेव्ह करण्यापूर्वी तपासा (Verify before save)'
                : 'सर्व नोंदी अचूक आहेत • Ready to save in Ledger'}
            </p>
          </div>
        </div>
        {unresolvedCount > 0 && (
          <button
            onClick={() => {
              const el = document.getElementById('issue-item-first');
              el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }}
            className="shrink-0 bg-tertiary-container text-tertiary-fixed px-space-md py-space-xs rounded-lg font-label-md text-label-md flex items-center gap-1 active:opacity-80 transition-opacity"
            type="button"
          >
            <span>Fix Next</span>
            <span className="material-symbols-outlined text-[16px]">arrow_downward</span>
          </button>
        )}
      </aside>

      {/* Scanned Bill Reference Preview */}
      {bill.scan_file_url && (
        <section className="w-full bg-surface-container-low rounded-xl p-space-md shadow-sm space-y-space-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-space-xs">
              <span className="material-symbols-outlined text-secondary text-[20px]">document_scanner</span>
              <span className="font-label-lg text-label-lg text-on-surface">Original Physical Bill</span>
            </div>
            <button
              onClick={() => setShowSlip(!showSlip)}
              className="text-secondary font-label-md text-label-md flex items-center gap-0.5 active:opacity-75"
              type="button"
            >
              <span>{showSlip ? 'Hide Slip' : 'Show Slip'}</span>
              <span className="material-symbols-outlined text-[18px]">
                {showSlip ? 'expand_less' : 'expand_more'}
              </span>
            </button>
          </div>

          {showSlip && (
            <div className="relative overflow-hidden rounded-lg bg-surface-container">
              <img
                className="w-full max-h-56 object-contain bg-black/40 rounded transition-all duration-300"
                src={bill.scan_file_url}
                alt="Physical bill scan preview"
              />
            </div>
          )}
        </section>
      )}

      {/* Extracted Metadata Chips */}
      <section className="w-full bg-surface-container-lowest rounded-xl p-space-md shadow-sm space-y-space-sm">
        <div className="flex items-center justify-between">
          <span className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">
            Bill Header Data
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed font-label-sm text-label-sm font-bold">
            <span className="material-symbols-outlined text-[13px]">check_circle</span>
            Header Parsed
          </span>
        </div>

        <div className="grid grid-cols-2 gap-space-sm">
          <div className="bg-surface-container-low p-space-sm rounded-lg flex flex-col justify-center">
            <span className="font-label-sm text-label-sm text-on-surface-variant">Bill Number (बिल क्र.)</span>
            <div className="flex items-center justify-between mt-0.5">
              <span className="font-body-bold text-body-bold text-on-surface">{bill.invoice_number}</span>
              <span className="material-symbols-outlined text-secondary text-[16px]">verified</span>
            </div>
          </div>
          <div className="bg-surface-container-low p-space-sm rounded-lg flex flex-col justify-center">
            <span className="font-label-sm text-label-sm text-on-surface-variant">Date (तारीख)</span>
            <div className="flex items-center justify-between mt-0.5">
              <span className="font-body-bold text-body-bold text-on-surface">{bill.bill_date}</span>
              <span className="material-symbols-outlined text-secondary text-[16px]">verified</span>
            </div>
          </div>
        </div>

        <div className="bg-surface-container-low p-space-sm rounded-lg flex items-center justify-between gap-space-sm">
          <div className="min-w-0 flex-1">
            <span className="font-label-sm text-label-sm text-on-surface-variant">Customer (ग्राहक)</span>
            {isEditingCustomer ? (
              <div className="flex flex-col gap-1 mt-1">
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="px-2 py-1 bg-surface rounded text-on-surface text-body-bold outline-none"
                  placeholder="Customer Name"
                />
                <input
                  type="text"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="px-2 py-1 bg-surface rounded text-on-surface text-label-md outline-none"
                  placeholder="Phone"
                />
              </div>
            ) : (
              <>
                <p className="font-body-bold text-body-bold text-on-surface truncate">{customerName}</p>
                <p className="font-label-sm text-label-sm text-on-surface-variant truncate">
                  {customerPhone ? `Phone: ${customerPhone}` : 'Tap edit to add phone or change name'}
                </p>
              </>
            )}
          </div>
          <button
            onClick={() => setIsEditingCustomer(!isEditingCustomer)}
            className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface active:bg-surface-variant transition-colors shrink-0"
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">
              {isEditingCustomer ? 'check' : 'edit'}
            </span>
          </button>
        </div>
      </section>

      {/* Items Review Header */}
      <div className="flex items-center justify-between pt-space-xs px-space-xs">
        <div className="flex items-center gap-space-xs">
          <span className="font-headline-sm text-headline-sm text-on-surface">Extracted Items</span>
          <span className="bg-surface-container-high text-on-surface font-label-md text-label-md px-2 py-0.5 rounded-full font-bold">
            {items.length} {items.length === 1 ? 'item' : 'items'}
          </span>
        </div>
        <span className="font-label-sm text-label-sm text-on-surface-variant">Tap any field to edit</span>
      </div>

      {/* Line Item Cards */}
      <div className="space-y-space-md">
        {items.map((item, index) => {
          const isNeedsReview = item.confidence === 'needs_review';
          const isUncertain = item.confidence === 'uncertain';

          return (
            <article
              key={item.id}
              id={isNeedsReview || isUncertain ? 'issue-item-first' : undefined}
              className={`w-full bg-surface-container-lowest rounded-xl p-space-md shadow-sm space-y-space-sm ${
                isNeedsReview || isUncertain ? 'ring-2 ring-tertiary-fixed' : ''
              }`}
            >
              <div className="flex items-start justify-between gap-space-sm">
                <div className="min-w-0 flex-1">
                  {item.original_text && (
                    <div className="flex items-center gap-1 text-on-tertiary-fixed-variant">
                      <span className="material-symbols-outlined text-[15px]">edit_note</span>
                      <span className="font-label-sm text-label-sm">Original Inscribed Ink</span>
                    </div>
                  )}
                  <h2 className="font-body-bold text-body-bold text-on-surface leading-tight">
                    {item.product_name_snapshot}
                  </h2>
                  {item.product_name_marathi && (
                    <p className="font-label-md text-label-md text-on-surface-variant">
                      {item.product_name_marathi}
                    </p>
                  )}
                </div>

                {/* Status Badge */}
                {item.confidence === 'looks_correct' && (
                  <span className="shrink-0 inline-flex items-center gap-1 bg-secondary-fixed text-on-secondary-fixed px-2 py-1 rounded font-label-sm text-label-sm font-bold">
                    <span className="material-symbols-outlined text-[14px]">check</span>
                    Looks correct
                  </span>
                )}
                {isNeedsReview && (
                  <span className="shrink-0 inline-flex items-center gap-1 bg-tertiary-fixed text-tertiary-container px-2 py-1 rounded font-label-sm text-label-sm font-bold">
                    <span className="material-symbols-outlined text-[14px]">warning</span>
                    Needs review
                  </span>
                )}
                {isUncertain && (
                  <span className="shrink-0 inline-flex items-center gap-1 bg-error-container text-on-error-container px-2 py-1 rounded font-label-sm text-label-sm font-bold">
                    <span className="material-symbols-outlined text-[14px]">help</span>
                    Could not read rate
                  </span>
                )}
              </div>

              {/* Line item details row */}
              <div className="grid grid-cols-3 gap-space-xs pt-space-xs">
                <div className="bg-surface-container-low p-space-xs rounded text-center">
                  <span className="font-label-sm text-label-sm text-on-surface-variant block">Qty</span>
                  <span className="font-body-bold text-body-bold text-on-surface">
                    {item.quantity} {item.unit}
                  </span>
                </div>
                <div className="bg-surface-container-low p-space-xs rounded text-center">
                  <span className="font-label-sm text-label-sm text-on-surface-variant block">Rate</span>
                  <span className="font-body-bold text-body-bold text-on-surface">
                    {item.unit_price > 0 ? `₹${item.unit_price.toLocaleString('en-IN')}` : 'Unread'}
                  </span>
                </div>
                <div className="bg-surface-container-low p-space-xs rounded text-center">
                  <span className="font-label-sm text-label-sm text-on-surface-variant block">GST</span>
                  <span className="font-body-bold text-body-bold text-on-surface">{item.gst_percent}%</span>
                </div>
              </div>

              {/* Line Total */}
              <div className="flex items-center justify-between pt-space-xs">
                <span className="font-label-md text-label-md text-on-surface-variant">Line Total</span>
                <span className="font-currency-numeral text-currency-numeral text-on-surface">
                  ₹{(item.quantity * item.unit_price).toLocaleString('en-IN')}
                </span>
              </div>

              {/* If Needs Review: Suggestion Box */}
              {isNeedsReview && (
                <div className="bg-surface-container p-space-sm rounded-lg space-y-space-xs mt-2">
                  <div className="flex items-start gap-space-xs">
                    <span className="material-symbols-outlined text-secondary text-[18px] shrink-0 mt-0.5">
                      auto_awesome
                    </span>
                    <div className="min-w-0">
                      <p className="font-label-sm text-label-sm text-on-surface font-semibold">
                        AI Match Suggestion
                      </p>
                      <p className="font-body-md text-body-md text-on-surface-variant">
                        {item.uncertainty_reason || 'Item specification or model unclear.'}{' '}
                        {item.suggested_product_name && (
                          <span className="font-semibold text-on-surface">
                            Suggested: {item.suggested_product_name}
                            {item.suggested_rate ? ` (₹${item.suggested_rate})` : ''}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-space-xs pt-space-xs">
                    {item.suggested_product_name && (
                      <button
                        onClick={() =>
                          handleResolveSuggestion(
                            index,
                            item.suggested_product_name!,
                            item.suggested_rate || item.unit_price,
                            item.suggested_product_id
                          )
                        }
                        className="bg-secondary text-on-secondary px-space-sm py-1.5 rounded-lg font-label-md text-label-md flex items-center gap-1 active:opacity-90 font-bold"
                        type="button"
                      >
                        <span className="material-symbols-outlined text-[16px]">check</span>
                        Use Suggestion
                      </button>
                    )}
                    {allProducts.length > 0 && (
                      <button
                        onClick={() => setShowProductPickerIndex(index)}
                        className="bg-surface-container-highest text-on-surface px-space-sm py-1.5 rounded-lg font-label-md text-label-md active:bg-surface-variant font-semibold"
                        type="button"
                      >
                        Choose from Catalogue
                      </button>
                    )}
                    <button
                      onClick={() => {
                        const updated = [...items];
                        updated[index].confidence = 'looks_correct';
                        setItems(updated);
                      }}
                      className="bg-surface-container-low text-on-surface-variant px-space-sm py-1.5 rounded-lg font-label-sm text-label-sm active:bg-surface-container"
                      type="button"
                    >
                      Keep as Extracted
                    </button>
                  </div>
                </div>
              )}

              {/* If Uncertain: Rate Entry Input */}
              {isUncertain && (
                <div className="bg-surface-container-low p-space-sm rounded-lg space-y-space-xs mt-2">
                  <span className="font-label-sm text-label-sm text-on-surface-variant">
                    Enter Rate per {item.unit} (दर टाका):
                  </span>
                  <div className="flex items-center gap-space-sm">
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 font-headline-sm text-headline-sm text-on-surface-variant">
                        ₹
                      </span>
                      <input
                        type="number"
                        inputMode="numeric"
                        value={enteredRates[index] || ''}
                        onChange={(e) =>
                          setEnteredRates({ ...enteredRates, [index]: e.target.value })
                        }
                        placeholder="Enter price"
                        className="w-full h-12 pl-8 pr-3 rounded-lg bg-surface-container-lowest text-on-surface font-currency-numeral text-currency-numeral outline-none focus:bg-surface-container-high transition-colors"
                      />
                    </div>
                    <button
                      onClick={() => handleSaveRate(index)}
                      className="h-12 px-space-md bg-primary text-on-primary rounded-lg font-label-lg text-label-lg active:opacity-90 transition-opacity font-bold"
                      type="button"
                    >
                      Save
                    </button>
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </div>

      {/* Manual Add Row Option */}
      <button
        onClick={handleAddLineItem}
        className="w-full py-space-sm bg-surface-container-low text-on-surface rounded-xl font-label-lg text-label-lg flex items-center justify-center gap-space-xs active:bg-surface-container transition-colors font-semibold"
        type="button"
      >
        <span className="material-symbols-outlined text-[20px]">add</span>
        Add Missing Line Item (आणखी आयटम जोडा)
      </button>

      {/* Sticky Bottom Verification Action Dock */}
      <div className="fixed bottom-0 inset-x-0 bg-surface-container-lowest/95 backdrop-blur-md p-space-md shadow-2xl z-40 border-t border-surface-container">
        <div className="max-w-md mx-auto space-y-space-sm">
          <div className="flex items-baseline justify-between px-space-xs">
            <div className="flex flex-col">
              <span className="font-label-sm text-label-sm text-on-surface-variant uppercase">
                Estimated Total (एकूण रक्कम)
              </span>
              <span className="font-label-sm text-label-sm text-secondary font-medium">
                All taxes & discounts included
              </span>
            </div>
            <div className="text-right">
              <span className="font-display-lg text-display-lg text-on-surface font-bold">
                ₹{calculation.grandTotal.toLocaleString('en-IN')}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-5 gap-space-sm">
            <button
              onClick={onDiscard}
              className="col-span-2 h-12 bg-surface-container text-on-surface-variant rounded-xl font-label-lg text-label-lg flex items-center justify-center gap-1 active:bg-surface-variant transition-colors"
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
              Discard
            </button>
            <button
              onClick={handleSaveBill}
              className="col-span-3 h-12 bg-secondary text-on-secondary rounded-xl font-headline-sm text-headline-sm flex items-center justify-center gap-space-xs shadow-md active:bg-on-secondary-fixed-variant transition-all font-bold"
              type="button"
            >
              <span className="material-symbols-outlined text-[20px]">task_alt</span>
              <span>Save (जतन करा)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Product Picker Modal */}
      {showProductPickerIndex !== null && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-4">
          <div className="bg-surface rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col p-4 shadow-2xl">
            <div className="flex justify-between items-center pb-2 border-b border-surface-container">
              <h3 className="font-headline-sm text-headline-sm">Select Product from Catalogue</h3>
              <button
                onClick={() => setShowProductPickerIndex(null)}
                className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
            <div className="overflow-y-auto space-y-2 py-3 flex-1">
              {allProducts.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleSelectCatalogueProduct(showProductPickerIndex, p)}
                  className="w-full text-left p-3 rounded-xl bg-surface-container hover:bg-surface-container-high flex justify-between items-center"
                  type="button"
                >
                  <div className="flex flex-col">
                    <span className="font-body-bold text-on-surface">{p.name}</span>
                    <span className="font-label-sm text-on-surface-variant">
                      {p.sku} • {p.category}
                    </span>
                  </div>
                  <span className="font-currency-numeral text-secondary font-bold">
                    ₹{p.selling_price.toLocaleString('en-IN')}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
