import React, { useState } from 'react';
import { Bill, BillItem, Product } from '../types';
import { calculateBillTotals } from '../services/billing/calculator';
import { db } from '../services/db/repository';

interface ReviewPendingBillsPageProps {
  bill: Bill;
  allProducts: Product[];
  onBack: () => void;
  onSaveConfirmedBill: (updatedBill: Bill) => void;
  onDiscard: () => void;
  onAddProductToCatalogue?: (product: Omit<Product, 'id' | 'created_at' | 'updated_at'>) => void;
}

export const ReviewPendingBillsPage: React.FC<ReviewPendingBillsPageProps> = ({
  bill,
  allProducts,
  onBack,
  onSaveConfirmedBill,
  onDiscard,
  onAddProductToCatalogue,
}) => {
  const [items, setItems] = useState<BillItem[]>(bill.items || []);
  const [customerName, setCustomerName] = useState(bill.customer_name);
  const [customerPhone, setCustomerPhone] = useState(bill.customer_phone || '');
  const [customerAddress, setCustomerAddress] = useState(bill.customer_address || '');
  const [customerGstin, setCustomerGstin] = useState(bill.customer_gstin || '');
  const [invoiceNumber, setInvoiceNumber] = useState(bill.invoice_number);
  const [billDate, setBillDate] = useState(bill.bill_date);

  const [isEditingCustomer, setIsEditingCustomer] = useState(false);
  const [showSlipMobile, setShowSlipMobile] = useState(true);
  const [selectedProductPickerIdx, setSelectedProductPickerIdx] = useState<number | null>(null);
  const [editingItemIdx, setEditingItemIdx] = useState<number | null>(null);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Recalculate totals dynamically
  const calculation = calculateBillTotals(items);
  const uncertainItems = items.filter((i) => i.confidence !== 'looks_correct');
  const verifiedItems = items.filter((i) => i.confidence === 'looks_correct');

  const showNotification = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2500);
  };

  // Resolve an item using a catalogue suggestion or match
  const handleApplySuggestion = (index: number, newTitle: string, newRate: number, prodId?: string) => {
    const updated = [...items];
    const item = updated[index];
    const qty = item.quantity || 1;
    const rate = newRate > 0 ? newRate : item.unit_price;

    updated[index] = {
      ...item,
      product_id: prodId || item.product_id,
      product_name_snapshot: newTitle,
      unit_price: rate,
      total: (qty * rate * (100 + item.gst_percent)) / 100,
      confidence: 'looks_correct',
      uncertainty_reason: undefined,
    };
    setItems(updated);
    showNotification(`Matched: ${newTitle}`);
  };

  // Select an existing catalogue product
  const handleSelectProduct = (index: number, product: Product) => {
    const updated = [...items];
    const item = updated[index];
    const qty = item.quantity || 1;

    updated[index] = {
      ...item,
      product_id: product.id,
      product_name_snapshot: product.name,
      product_name_marathi: product.name_marathi,
      unit_price: product.selling_price,
      sku_snapshot: product.sku,
      hsn_snapshot: product.hsn_code,
      gst_percent: product.gst_percent,
      total: (qty * product.selling_price * (100 + product.gst_percent)) / 100,
      confidence: 'looks_correct',
      uncertainty_reason: undefined,
    };
    setItems(updated);
    setSelectedProductPickerIdx(null);
    showNotification(`Selected: ${product.name}`);
  };

  // Add the extracted item as a NEW product into the catalogue
  const handleCreateNewProductFromItem = (index: number) => {
    const item = items[index];
    const newProd = db.addProduct({
      name: item.product_name_snapshot,
      name_marathi: item.product_name_marathi,
      brand: item.brand_snapshot || undefined,
      category: 'General Hardware',
      sku: `SKU-${Date.now().toString().slice(-6)}`,
      unit: item.unit || 'Nos',
      selling_price: item.unit_price > 0 ? item.unit_price : 100,
      gst_percent: item.gst_percent || 18,
      stock: 10,
      minimum_stock: 5,
      aliases: item.original_text && item.original_text !== item.product_name_snapshot
        ? [{
            id: `al-${Date.now()}`,
            product_id: '',
            alias: item.original_text,
            language: 'mixed',
            alias_type: 'shorthand',
            confirmed: true,
            created_at: new Date().toISOString()
          }]
        : [],
    });

    if (onAddProductToCatalogue) {
      onAddProductToCatalogue(newProd);
    }

    // Automatically link item to new product
    handleSelectProduct(index, newProd);
    showNotification(`Saved "${newProd.name}" to Catalogue!`);
  };

  // Update item field directly
  const handleUpdateItemField = (index: number, updates: Partial<BillItem>) => {
    const updated = [...items];
    const current = updated[index];
    const merged = { ...current, ...updates };

    const qty = merged.quantity || 1;
    const rate = merged.unit_price || 0;
    const gst = merged.gst_percent || 18;
    merged.total = (qty * rate * (100 + gst)) / 100;

    if (merged.unit_price > 0 && merged.product_name_snapshot.trim()) {
      merged.confidence = 'looks_correct';
      merged.uncertainty_reason = undefined;
    }

    updated[index] = merged;
    setItems(updated);
  };

  // Remove item
  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  // Add missing line item
  const handleAddLineItem = () => {
    const newItem: BillItem = {
      id: `manual-item-${Date.now()}`,
      product_name_snapshot: 'New Item',
      quantity: 1,
      unit: 'Nos',
      unit_price: 0,
      gst_percent: 18,
      total: 0,
      confidence: 'uncertain',
      uncertainty_reason: 'Please enter item title and rate.',
    };
    setItems([...items, newItem]);
    setEditingItemIdx(items.length);
  };

  // Save confirmed bill to database
  const handleConfirmAndSave = () => {
    if (items.length === 0) {
      showNotification('Please keep at least 1 item in the bill');
      return;
    }

    const finalBill: Bill = {
      ...bill,
      invoice_number: invoiceNumber || bill.invoice_number,
      bill_date: billDate || bill.bill_date,
      customer_name: customerName.trim() || 'Counter Cash Sale (किरकोळ ग्राहक)',
      customer_phone: customerPhone.trim() || '',
      customer_address: customerAddress.trim() || '',
      customer_gstin: customerGstin.trim() || '',
      items: calculation.items,
      subtotal: calculation.taxableSubtotal,
      discount: calculation.discountAmount,
      cgst: calculation.cgst,
      sgst: calculation.sgst,
      igst: calculation.igst,
      gst: calculation.totalGst,
      round_off: calculation.roundOff,
      grand_total: calculation.grandTotal,
      status: 'verified',
      unverified_reason: undefined,
    };

    onSaveConfirmedBill(finalBill);
  };

  // Filter catalogue for search
  const filteredCatalogue = allProducts.filter((p) => {
    if (!catalogSearch.trim()) return true;
    const q = catalogSearch.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.name_marathi?.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q) ||
      p.aliases?.some((a) => a.alias.toLowerCase().includes(q))
    );
  });

  return (
    <div className="flex flex-col w-full max-w-6xl mx-auto space-y-6 pb-36">
      {/* Toast */}
      {toastMsg && (
        <div className="fixed top-20 left-4 right-4 z-50 max-w-md mx-auto p-3.5 rounded-xl bg-inverse-surface text-inverse-on-surface shadow-xl flex items-center gap-2">
          <span className="material-symbols-outlined text-secondary-fixed text-[20px]">
            check_circle
          </span>
          <span className="text-sm font-semibold flex-1 truncate">{toastMsg}</span>
        </div>
      )}

      {/* Top Navigation Bar */}
      <div className="flex items-center justify-between pb-3 border-b border-surface-container">
        <button
          onClick={onBack}
          className="min-h-[44px] px-3 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface flex items-center gap-2 text-sm font-semibold active:scale-98 transition-transform"
          type="button"
        >
          <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          <span>Back</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="text-base sm:text-lg font-bold text-on-surface">Review & Confirm Bill</span>
          <span className="px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-container text-xs font-bold">
            AI Scan
          </span>
        </div>

        <button
          onClick={onDiscard}
          className="min-h-[44px] px-3.5 rounded-xl text-error hover:bg-error-container/40 text-sm font-semibold transition-colors"
          type="button"
        >
          Discard
        </button>
      </div>

      {/* Verification Status Banner */}
      <div
        className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
          uncertainItems.length > 0
            ? 'bg-amber-500/10 border-amber-500/30 text-on-surface'
            : 'bg-secondary-container/50 border-secondary/30 text-on-surface'
        }`}
      >
        <div className="flex items-start gap-3">
          <span
            className={`material-symbols-outlined text-[24px] shrink-0 mt-0.5 ${
              uncertainItems.length > 0 ? 'text-amber-600' : 'text-secondary'
            }`}
          >
            {uncertainItems.length > 0 ? 'warning' : 'task_alt'}
          </span>
          <div>
            <h2 className="font-bold text-sm sm:text-base">
              {uncertainItems.length > 0
                ? `${uncertainItems.length} ${
                    uncertainItems.length === 1 ? 'field needs' : 'fields need'
                  } verification`
                : 'All fields verified & ready to save in Ledger!'}
            </h2>
            <p className="text-xs sm:text-sm text-on-surface-variant mt-0.5">
              {uncertainItems.length > 0
                ? 'Check highlighted rates or products below before saving.'
                : 'All line items, rates, and customer data confirmed.'}
            </p>
          </div>
        </div>

        {uncertainItems.length > 0 && (
          <span className="px-3 py-1 rounded-full bg-amber-500 text-white font-bold text-xs shrink-0 self-end sm:self-auto">
            Action Needed
          </span>
        )}
      </div>

      {/* Responsive Two-Panel Layout (Side-by-side on desktop/tablet, stacked on mobile) */}
      <div className="flex flex-col lg:grid lg:grid-cols-12 gap-6 w-full">
        {/* Left Column: Physical Bill Scan (Sticky on Desktop, Collapsible on Mobile) */}
        <div className="lg:col-span-5 flex flex-col gap-3">
          <div className="bg-surface-container-lowest rounded-2xl p-4 border border-surface-container shadow-xs lg:sticky lg:top-24">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-secondary">
                  document_scanner
                </span>
                <span className="font-bold text-sm text-on-surface">Original Physical Bill</span>
              </div>
              <button
                onClick={() => setShowSlipMobile(!showSlipMobile)}
                className="lg:hidden text-xs text-primary font-bold flex items-center gap-0.5"
                type="button"
              >
                <span>{showSlipMobile ? 'Collapse' : 'Expand'}</span>
                <span className="material-symbols-outlined text-[16px]">
                  {showSlipMobile ? 'expand_less' : 'expand_more'}
                </span>
              </button>
            </div>

            {bill.scan_file_url ? (
              <div
                className={`relative rounded-xl overflow-hidden bg-black/5 border border-surface-container transition-all ${
                  showSlipMobile ? 'block' : 'hidden lg:block'
                }`}
              >
                <img
                  src={bill.scan_file_url}
                  alt="Original Physical Bill"
                  className="w-full max-h-[380px] lg:max-h-[560px] object-contain mx-auto"
                />
              </div>
            ) : (
              <div className="p-8 text-center text-on-surface-variant text-sm bg-surface-container rounded-xl">
                <span className="material-symbols-outlined text-[32px] block mb-1 opacity-50">
                  receipt
                </span>
                No image preview available
              </div>
            )}

            <p className="text-[11px] text-on-surface-variant text-center mt-2 hidden lg:block">
              Verify ink handwriting on the bill against extracted data on the right.
            </p>
          </div>
        </div>

        {/* Right Column: Extracted Information & Human Verification */}
        <div className="lg:col-span-7 flex flex-col gap-5">
          {/* Header Metadata Section (Invoice #, Date, Customer) */}
          <div className="bg-surface-container-lowest rounded-2xl p-4 sm:p-5 border border-surface-container shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-surface-container">
              <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                Bill Header Information
              </span>
              <button
                onClick={() => setIsEditingCustomer(!isEditingCustomer)}
                className="text-xs text-secondary font-bold flex items-center gap-1 hover:underline"
                type="button"
              >
                <span className="material-symbols-outlined text-[16px]">
                  {isEditingCustomer ? 'check' : 'edit'}
                </span>
                <span>{isEditingCustomer ? 'Done' : 'Edit Header'}</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-on-surface-variant block mb-1">Invoice Number</label>
                {isEditingCustomer ? (
                  <input
                    type="text"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-surface-container text-sm font-semibold outline-none"
                  />
                ) : (
                  <span className="text-sm font-bold text-on-surface block truncate">
                    #{invoiceNumber}
                  </span>
                )}
              </div>

              <div>
                <label className="text-xs text-on-surface-variant block mb-1">Date</label>
                {isEditingCustomer ? (
                  <input
                    type="date"
                    value={billDate}
                    onChange={(e) => setBillDate(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-surface-container text-sm font-semibold outline-none"
                  />
                ) : (
                  <span className="text-sm font-bold text-on-surface block truncate">
                    {billDate}
                  </span>
                )}
              </div>
            </div>

            <div>
              <label className="text-xs text-on-surface-variant block mb-1">Customer / Party Name</label>
              {isEditingCustomer ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Customer Name"
                    className="w-full h-10 px-3 rounded-xl bg-surface-container text-sm font-semibold outline-none"
                  />
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="Phone (+91...)"
                    className="w-full h-10 px-3 rounded-xl bg-surface-container text-sm outline-none"
                  />
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-bold text-on-surface block">
                      {customerName || 'Counter Cash Sale (किरकोळ ग्राहक)'}
                    </span>
                    {customerPhone && (
                      <span className="text-xs text-on-surface-variant block">
                        Phone: {customerPhone}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Section: Items Needing Attention (Priority on Mobile & Desktop) */}
          {uncertainItems.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-600 text-[20px]">warning</span>
                <h3 className="text-sm font-bold text-on-surface uppercase tracking-wide">
                  Requires Confirmation ({uncertainItems.length})
                </h3>
              </div>

              <div className="space-y-3">
                {items.map((item, idx) => {
                  if (item.confidence === 'looks_correct') return null;

                  return (
                    <div
                      key={item.id}
                      className="p-4 sm:p-5 rounded-2xl bg-surface-container-lowest border-2 border-amber-500/40 shadow-xs space-y-3"
                    >
                      {/* Original Inscribed Text */}
                      {item.original_text && (
                        <div className="flex items-center gap-1.5 text-xs text-on-surface-variant bg-surface-container-low px-2.5 py-1 rounded-lg self-start">
                          <span className="material-symbols-outlined text-[15px]">edit_note</span>
                          <span>Original Ink: <strong>"{item.original_text}"</strong></span>
                        </div>
                      )}

                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-base text-on-surface leading-tight">
                            {item.product_name_snapshot}
                          </h4>
                          {item.product_name_marathi && (
                            <span className="text-xs text-on-surface-variant block mt-0.5">
                              {item.product_name_marathi}
                            </span>
                          )}
                          <p className="text-xs font-semibold text-amber-700 mt-1">
                            {item.uncertainty_reason || 'Uncertain item or rate.'}
                          </p>
                        </div>

                        <div className="text-left sm:text-right shrink-0">
                          <span className="text-lg font-bold text-on-surface block">
                            ₹{item.unit_price > 0 ? (item.quantity * item.unit_price).toLocaleString('en-IN') : 'Rate Missing'}
                          </span>
                          <span className="text-xs text-on-surface-variant block">
                            {item.quantity} {item.unit} @ ₹{item.unit_price}/unit
                          </span>
                        </div>
                      </div>

                      {/* Action Grid for Item: Use Suggestion, Catalogue, Add New, or Edit */}
                      <div className="pt-2 border-t border-surface-container flex flex-wrap items-center gap-2">
                        {item.suggested_product_name && (
                          <button
                            onClick={() =>
                              handleApplySuggestion(
                                idx,
                                item.suggested_product_name!,
                                item.suggested_rate || item.unit_price,
                                item.suggested_product_id
                              )
                            }
                            className="h-10 px-3.5 rounded-xl bg-secondary text-on-secondary text-xs font-bold flex items-center gap-1.5 active:scale-98 transition-transform"
                            type="button"
                          >
                            <span className="material-symbols-outlined text-[16px]">check</span>
                            <span>Use Match ({item.suggested_product_name})</span>
                          </button>
                        )}

                        <button
                          onClick={() => setSelectedProductPickerIdx(idx)}
                          className="h-10 px-3.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-bold flex items-center gap-1.5 active:scale-98 transition-transform"
                          type="button"
                        >
                          <span className="material-symbols-outlined text-[16px]">inventory_2</span>
                          <span>Choose from Catalogue</span>
                        </button>

                        <button
                          onClick={() => handleCreateNewProductFromItem(idx)}
                          className="h-10 px-3.5 rounded-xl bg-primary text-on-primary text-xs font-bold flex items-center gap-1.5 active:scale-98 transition-transform"
                          type="button"
                        >
                          <span className="material-symbols-outlined text-[16px]">add</span>
                          <span>+ Save as New Product</span>
                        </button>

                        <button
                          onClick={() => setEditingItemIdx(idx)}
                          className="h-10 px-3.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface-variant text-xs font-semibold flex items-center gap-1.5"
                          type="button"
                        >
                          <span className="material-symbols-outlined text-[16px]">edit</span>
                          <span>Edit Details</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Section: Verified Items */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary text-[20px]">
                  check_circle
                </span>
                <h3 className="text-sm font-bold text-on-surface uppercase tracking-wide">
                  Verified Line Items ({verifiedItems.length})
                </h3>
              </div>
              <button
                onClick={handleAddLineItem}
                className="text-xs text-primary font-bold flex items-center gap-1 hover:underline"
                type="button"
              >
                <span className="material-symbols-outlined text-[16px]">add</span>
                <span>+ Add Item</span>
              </button>
            </div>

            {verifiedItems.length > 0 ? (
              <div className="space-y-2.5">
                {items.map((item, idx) => {
                  if (item.confidence !== 'looks_correct') return null;

                  return (
                    <div
                      key={item.id}
                      className="p-4 rounded-2xl bg-surface-container-lowest border border-surface-container shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm text-on-surface">
                            {item.product_name_snapshot}
                          </span>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-container text-[11px] font-bold">
                            <span className="material-symbols-outlined text-[12px]">verified</span>
                            Confirmed
                          </span>
                        </div>
                        {item.product_name_marathi && (
                          <span className="text-xs text-on-surface-variant block mt-0.5">
                            {item.product_name_marathi}
                          </span>
                        )}
                        <span className="text-xs text-on-surface-variant block mt-0.5">
                          {item.quantity} {item.unit} × ₹{item.unit_price.toLocaleString('en-IN')} (GST {item.gst_percent}%)
                        </span>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                        <span className="text-base font-bold text-on-surface">
                          ₹{(item.quantity * item.unit_price).toLocaleString('en-IN')}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setEditingItemIdx(idx)}
                            className="w-9 h-9 rounded-xl bg-surface-container hover:bg-surface-container-high flex items-center justify-center text-on-surface-variant"
                            type="button"
                            title="Edit Item"
                          >
                            <span className="material-symbols-outlined text-[18px]">edit</span>
                          </button>
                          <button
                            onClick={() => handleRemoveItem(idx)}
                            className="w-9 h-9 rounded-xl bg-surface-container hover:bg-error-container text-on-surface-variant hover:text-error flex items-center justify-center"
                            type="button"
                            title="Remove Item"
                          >
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-6 rounded-2xl bg-surface-container-low text-center text-xs text-on-surface-variant border border-surface-container">
                All items require confirmation above. Confirm them to proceed.
              </div>
            )}
          </div>

          {/* Billing Calculation Summary */}
          <div className="bg-surface-container-lowest rounded-2xl p-5 border border-surface-container shadow-xs space-y-2.5">
            <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant block mb-2">
              Billing Totals Breakdown
            </span>
            <div className="flex justify-between text-sm text-on-surface-variant">
              <span>Taxable Subtotal (करपात्र रक्कम)</span>
              <span>₹{calculation.taxableSubtotal.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between text-sm text-on-surface-variant">
              <span>Total GST (CGST + SGST)</span>
              <span>₹{calculation.totalGst.toLocaleString('en-IN')}</span>
            </div>
            {calculation.roundOff !== 0 && (
              <div className="flex justify-between text-sm text-on-surface-variant">
                <span>Round Off (पूर्णांक)</span>
                <span>₹{calculation.roundOff.toFixed(2)}</span>
              </div>
            )}
            <div className="pt-2 border-t border-surface-container flex justify-between items-baseline">
              <span className="text-base font-bold text-on-surface">Grand Total (एकूण बिल)</span>
              <span className="text-2xl font-bold text-on-surface">
                ₹{calculation.grandTotal.toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Bottom Confirmation Bar (High Visibility on Mobile and Desktop) */}
      <div className="fixed bottom-0 inset-x-0 bg-surface/95 backdrop-blur-md p-4 border-t border-surface-container-high z-40 shadow-lg">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <div className="flex flex-col">
            <span className="text-xs text-on-surface-variant font-medium">Estimated Bill Total</span>
            <span className="text-xl sm:text-2xl font-bold text-on-surface">
              ₹{calculation.grandTotal.toLocaleString('en-IN')}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onDiscard}
              className="h-12 px-4 sm:px-6 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface text-sm font-bold active:scale-98 transition-transform"
              type="button"
            >
              Discard
            </button>
            <button
              onClick={handleConfirmAndSave}
              className="h-12 px-6 sm:px-8 rounded-xl bg-secondary text-on-secondary text-sm font-bold flex items-center gap-2 active:scale-98 transition-transform shadow-md"
              type="button"
            >
              <span className="material-symbols-outlined text-[20px]">task_alt</span>
              <span>Save & Confirm to Ledger</span>
            </button>
          </div>
        </div>
      </div>

      {/* Product Catalogue Picker Modal */}
      {selectedProductPickerIdx !== null && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-4">
          <div className="bg-surface rounded-2xl w-full max-w-lg max-h-[85vh] p-5 shadow-2xl flex flex-col">
            <div className="flex justify-between items-center pb-3 border-b border-surface-container">
              <h3 className="font-bold text-base text-on-surface">Choose Product from Catalogue</h3>
              <button
                onClick={() => setSelectedProductPickerIdx(null)}
                className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface"
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="py-3">
              <input
                type="search"
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
                placeholder="Search products, brands, or SKU..."
                className="w-full h-11 px-3.5 rounded-xl bg-surface-container text-sm outline-none font-medium"
                autoFocus
              />
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 py-1">
              {filteredCatalogue.length > 0 ? (
                filteredCatalogue.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => handleSelectProduct(selectedProductPickerIdx, p)}
                    className="w-full p-3 rounded-xl bg-surface-container-low hover:bg-surface-container text-left flex justify-between items-center transition-colors"
                    type="button"
                  >
                    <div>
                      <span className="font-bold text-sm text-on-surface block">{p.name}</span>
                      <span className="text-xs text-on-surface-variant block mt-0.5">
                        {p.sku} • {p.unit}
                      </span>
                    </div>
                    <span className="text-sm font-bold text-secondary">
                      ₹{p.selling_price.toLocaleString('en-IN')}
                    </span>
                  </button>
                ))
              ) : (
                <div className="text-center py-8 text-on-surface-variant text-sm">
                  No matching products in catalogue.
                  <div className="mt-3">
                    <button
                      onClick={() => {
                        handleCreateNewProductFromItem(selectedProductPickerIdx);
                        setSelectedProductPickerIdx(null);
                      }}
                      className="h-10 px-4 rounded-xl bg-primary text-on-primary text-xs font-bold"
                      type="button"
                    >
                      + Save this Item as New Product
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Item Details Modal / Sheet */}
      {editingItemIdx !== null && items[editingItemIdx] && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-4">
          <div className="bg-surface rounded-2xl w-full max-w-md p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-2 border-b border-surface-container">
              <h3 className="font-bold text-base text-on-surface">Edit Item Details</h3>
              <button
                onClick={() => setEditingItemIdx(null)}
                className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface"
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-on-surface-variant block mb-1">Product Title</label>
                <input
                  type="text"
                  value={items[editingItemIdx].product_name_snapshot}
                  onChange={(e) =>
                    handleUpdateItemField(editingItemIdx, {
                      product_name_snapshot: e.target.value,
                    })
                  }
                  className="w-full h-11 px-3 rounded-xl bg-surface-container text-sm font-medium outline-none"
                />
              </div>

              <div>
                <label className="text-xs text-on-surface-variant block mb-1">Marathi Script (Optional)</label>
                <input
                  type="text"
                  value={items[editingItemIdx].product_name_marathi || ''}
                  onChange={(e) =>
                    handleUpdateItemField(editingItemIdx, {
                      product_name_marathi: e.target.value,
                    })
                  }
                  placeholder="उदा. ५ HP मोटर"
                  className="w-full h-11 px-3 rounded-xl bg-surface-container text-sm outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-on-surface-variant block mb-1">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    value={items[editingItemIdx].quantity}
                    onChange={(e) =>
                      handleUpdateItemField(editingItemIdx, {
                        quantity: parseFloat(e.target.value) || 1,
                      })
                    }
                    className="w-full h-11 px-3 rounded-xl bg-surface-container text-sm font-medium outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-on-surface-variant block mb-1">Unit</label>
                  <input
                    type="text"
                    value={items[editingItemIdx].unit}
                    onChange={(e) =>
                      handleUpdateItemField(editingItemIdx, {
                        unit: e.target.value,
                      })
                    }
                    className="w-full h-11 px-3 rounded-xl bg-surface-container text-sm outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-on-surface-variant block mb-1">Rate (₹ per unit) *</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={items[editingItemIdx].unit_price || ''}
                    onChange={(e) =>
                      handleUpdateItemField(editingItemIdx, {
                        unit_price: parseFloat(e.target.value) || 0,
                      })
                    }
                    placeholder="Enter rate"
                    className="w-full h-11 px-3 rounded-xl bg-surface-container text-sm font-bold text-on-surface outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-on-surface-variant block mb-1">GST %</label>
                  <select
                    value={items[editingItemIdx].gst_percent}
                    onChange={(e) =>
                      handleUpdateItemField(editingItemIdx, {
                        gst_percent: parseFloat(e.target.value) || 18,
                      })
                    }
                    className="w-full h-11 px-3 rounded-xl bg-surface-container text-sm outline-none"
                  >
                    <option value="0">0%</option>
                    <option value="5">5%</option>
                    <option value="12">12%</option>
                    <option value="18">18%</option>
                    <option value="28">28%</option>
                  </select>
                </div>
              </div>
            </div>

            <button
              onClick={() => setEditingItemIdx(null)}
              className="w-full h-12 rounded-xl bg-primary text-on-primary text-sm font-bold active:scale-98 transition-transform"
              type="button"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
