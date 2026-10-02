import React, { useState } from 'react';
import { Bill, BillItem, BusinessProfile, Customer, Product } from '../types';
import { calculateBillTotals } from '../services/billing/calculator';
import { downloadInvoicePDF, printInvoiceDocument } from '../services/pdf/invoice-generator';
import { shareInvoice } from '../services/capacitor/platform';

interface NewBillPageProps {
  business: BusinessProfile;
  customers: Customer[];
  allProducts: Product[];
  currentBill?: Partial<Bill>;
  onSaveBill: (bill: Bill) => void;
  onChangePartyClick: () => void;
  selectedCustomer?: Customer;
}

export const NewBillPage: React.FC<NewBillPageProps> = ({
  business,
  customers,
  allProducts,
  currentBill,
  onSaveBill,
  onChangePartyClick,
  selectedCustomer,
}) => {
  const [customer, setCustomer] = useState<Customer>(
    selectedCustomer ||
      (customers.length > 0
        ? customers[0]
        : {
            id: 'cust-walkin',
            name: 'Counter Cash Sale (किरकोळ ग्राहक)',
            phone: '',
            address: 'Walk-in Retail',
            total_purchases: 0,
          })
  );

  const [invoiceNumber] = useState<string>(
    currentBill?.invoice_number || `${business.invoice_prefix || 'BM-'}${business.starting_number || 1001}`
  );

  const [paymentMode, setPaymentMode] = useState<Bill['payment_mode']>(
    currentBill?.payment_mode || 'cash'
  );

  // Start with empty items list (NO mock items!)
  const [items, setItems] = useState<BillItem[]>(
    currentBill?.items && currentBill.items.length > 0 ? currentBill.items : []
  );

  const [showItemPicker, setShowItemPicker] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showA4Preview, setShowA4Preview] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Manual quick add fields when catalogue is empty
  const [showManualAddForm, setShowManualAddForm] = useState(false);
  const [manualName, setManualName] = useState('');
  const [manualPrice, setManualPrice] = useState('');
  const [manualQty, setManualQty] = useState('1');
  const [manualGst, setManualGst] = useState('18');
  const [manualUnit, setManualUnit] = useState('Nos');

  const calculation = calculateBillTotals(items);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleUpdateQty = (index: number, delta: number) => {
    const updated = [...items];
    const newQty = Math.max(1, updated[index].quantity + delta);
    updated[index] = {
      ...updated[index],
      quantity: newQty,
      total: (newQty * updated[index].unit_price * (100 + updated[index].gst_percent)) / 100,
    };
    setItems(updated);
  };

  const handleRemoveItem = (index: number) => {
    const updated = items.filter((_, i) => i !== index);
    setItems(updated);
  };

  const handleAddItemFromCatalogue = (product: Product) => {
    const existingIndex = items.findIndex((i) => i.product_id === product.id);
    if (existingIndex >= 0) {
      handleUpdateQty(existingIndex, 1);
    } else {
      const newItem: BillItem = {
        id: `bi-added-${Date.now()}`,
        product_id: product.id,
        product_name_snapshot: product.name,
        product_name_marathi: product.name_marathi,
        sku_snapshot: product.sku,
        hsn_snapshot: product.hsn_code,
        quantity: 1,
        unit: product.unit,
        unit_price: product.selling_price,
        gst_percent: product.gst_percent,
        total: (product.selling_price * (100 + product.gst_percent)) / 100,
        confidence: 'looks_correct',
      };
      setItems([...items, newItem]);
    }
    setShowItemPicker(false);
    showToast(`Added: ${product.name}`);
  };

  const handleAddManualItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualName.trim() || !manualPrice) return;

    const rate = parseFloat(manualPrice) || 0;
    const qty = parseFloat(manualQty) || 1;
    const gst = parseFloat(manualGst) || 18;

    const newItem: BillItem = {
      id: `bi-manual-${Date.now()}`,
      product_name_snapshot: manualName.trim(),
      quantity: qty,
      unit: manualUnit,
      unit_price: rate,
      gst_percent: gst,
      total: (qty * rate * (100 + gst)) / 100,
      confidence: 'looks_correct',
    };

    setItems([...items, newItem]);
    setManualName('');
    setManualPrice('');
    setManualQty('1');
    setShowManualAddForm(false);
    showToast(`Added: ${newItem.product_name_snapshot}`);
  };

  const buildFinalBill = (): Bill | null => {
    if (items.length === 0) {
      showToast('Please add at least 1 item to the bill');
      return null;
    }

    return {
      id: currentBill?.id || `bill-${Date.now()}`,
      invoice_number: invoiceNumber,
      customer_id: customer.id,
      customer_name: customer.name,
      customer_phone: customer.phone,
      customer_address: customer.address,
      customer_gstin: customer.gstin,
      bill_date: new Date().toISOString().split('T')[0],
      time_str: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      subtotal: calculation.taxableSubtotal,
      discount: calculation.discountAmount,
      cgst: calculation.cgst,
      sgst: calculation.sgst,
      igst: calculation.igst,
      gst: calculation.totalGst,
      round_off: calculation.roundOff,
      grand_total: calculation.grandTotal,
      payment_mode: paymentMode,
      status: 'verified',
      source: 'manual_pos',
      items: calculation.items,
    };
  };

  const handleShareWhatsApp = async () => {
    const bill = buildFinalBill();
    if (!bill) return;

    onSaveBill(bill);

    const summary = `*${business.shop_name}*\n` +
      `Invoice No: ${bill.invoice_number}\n` +
      `Date: ${bill.bill_date}\n` +
      `Customer: ${bill.customer_name}\n` +
      `Items: ${bill.items.length}\n` +
      `*Grand Total: ₹${bill.grand_total.toLocaleString('en-IN')}*\n` +
      `Thank you for your business!`;

    await shareInvoice(bill.invoice_number, customer.phone, summary);
    showToast('WhatsApp Invoice Shared!');
  };

  const handlePrint = () => {
    const bill = buildFinalBill();
    if (!bill) return;

    onSaveBill(bill);
    printInvoiceDocument();
    showToast('Printing Invoice (A4)...');
  };

  const handleDownloadPDF = () => {
    const bill = buildFinalBill();
    if (!bill) return;

    onSaveBill(bill);
    downloadInvoicePDF(bill, business, business.paper_size === 'A5' ? 'A5' : 'A4');
    showToast('PDF Downloaded Successfully!');
  };

  const handleSaveOnly = () => {
    const bill = buildFinalBill();
    if (!bill) return;
    onSaveBill(bill);
    showToast('Bill saved successfully!');
  };

  const filteredCatalogue = allProducts.filter((p) => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.name_marathi?.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q) ||
      p.aliases?.some((a) => a.alias.toLowerCase().includes(q))
    );
  });

  return (
    <div className="flex flex-col w-full gap-space-lg max-w-4xl mx-auto pb-10">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-24 left-4 right-4 z-50 p-space-md rounded-xl bg-inverse-surface text-inverse-on-surface shadow-xl flex items-center gap-space-sm max-w-md mx-auto transition-opacity duration-200">
          <span className="material-symbols-outlined text-secondary-container text-[20px]">
            check_circle
          </span>
          <span className="font-body-bold text-body-bold flex-1 truncate">{toastMessage}</span>
        </div>
      )}

      {/* Billing Context Header & Mode Switcher */}
      <div className="flex items-center justify-between bg-surface-container p-space-md rounded-xl">
        <div className="flex items-center gap-space-sm min-w-0">
          <span className="material-symbols-outlined text-secondary text-[24px]">receipt_long</span>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-space-xs">
              <span className="font-headline-sm text-headline-sm text-on-surface truncate">
                Tax Invoice
              </span>
              <span className="px-1.5 py-0.5 rounded-full bg-secondary text-on-secondary font-label-sm text-label-sm shrink-0 font-bold">
                #{invoiceNumber}
              </span>
            </div>
            <span className="font-label-md text-label-md text-on-surface-variant truncate">
              {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} • Counter POS #1
            </span>
          </div>
        </div>
        <div className="flex items-center gap-space-xs shrink-0">
          <button
            onClick={() => setShowA4Preview(!showA4Preview)}
            className="min-h-[44px] px-space-md rounded-lg bg-surface text-on-surface hover:bg-surface-container-high flex items-center gap-1 font-label-lg text-label-lg shadow-sm transition-transform active:scale-95"
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">
              {showA4Preview ? 'visibility_off' : 'preview'}
            </span>
            <span>{showA4Preview ? 'Hide A4' : 'A4 Preview'}</span>
          </button>
        </div>
      </div>

      {/* 1. Customer Selector Card */}
      <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex flex-col gap-space-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-space-xs">
            <span className="material-symbols-outlined text-on-surface-variant text-[18px]">
              person_pin
            </span>
            <span className="font-label-sm text-label-sm uppercase text-on-surface-variant font-bold">
              Billed To (ग्राहक तपशील)
            </span>
          </div>
          <button
            onClick={onChangePartyClick}
            className="font-label-sm text-label-sm text-secondary flex items-center gap-0.5 hover:underline font-bold"
            type="button"
          >
            <span className="material-symbols-outlined text-[14px]">swap_horiz</span>
            Change Party
          </button>
        </div>

        <div className="flex items-start gap-space-md bg-surface-container-low p-space-md rounded-lg">
          <div className="w-10 h-10 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center font-bold font-headline-sm shrink-0">
            {customer.name.substring(0, 2).toUpperCase()}
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <div className="flex items-center justify-between gap-space-xs">
              <span className="font-body-bold text-body-bold text-on-surface truncate">
                {customer.name}
              </span>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed font-label-sm text-[10px] font-bold">
                <span className="material-symbols-outlined text-[12px]">verified</span> Customer
              </span>
            </div>
            <span className="font-body-md text-body-md text-on-surface-variant truncate">
              {customer.address || 'Walk-in Retail'}
            </span>
            {customer.phone && (
              <span className="flex items-center gap-1 mt-1 text-label-md text-on-surface-variant">
                <span className="material-symbols-outlined text-[15px]">call</span>
                {customer.phone}
              </span>
            )}
          </div>
        </div>

        {/* Payment mode switcher */}
        <div className="flex items-center gap-2 pt-1 overflow-x-auto no-scrollbar">
          <span className="font-label-sm text-on-surface-variant shrink-0">Payment Mode:</span>
          {(['cash', 'upi', 'credit', 'neft'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setPaymentMode(mode)}
              className={`px-3 py-1 rounded-full font-label-sm text-label-sm uppercase font-bold transition-all ${
                paymentMode === mode
                  ? 'bg-primary text-on-primary shadow-xs'
                  : 'bg-surface-container text-on-surface-variant hover:text-on-surface'
              }`}
              type="button"
            >
              {mode === 'credit' ? 'उधार (Credit)' : mode}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Fast POS Line Items */}
      <div className="flex flex-col gap-space-sm">
        <div className="flex items-center justify-between px-space-xs">
          <div className="flex items-center gap-space-xs">
            <span className="font-headline-sm text-headline-sm text-on-surface">Items (वस्तू सूची)</span>
            <span className="px-2 py-0.5 rounded-full bg-surface-container font-label-sm text-label-sm text-on-surface-variant font-bold">
              {items.length} {items.length === 1 ? 'Item' : 'Items'}
            </span>
          </div>
          <span className="font-label-md text-label-md text-secondary font-medium">GST Auto-Calculated</span>
        </div>

        {items.length > 0 ? (
          items.map((item, index) => {
            const lineTotal = (item.quantity * item.unit_price * (100 + item.gst_percent)) / 100;
            const gstAmount = (item.quantity * item.unit_price * item.gst_percent) / 100;

            return (
              <div
                key={item.id}
                className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex flex-col gap-space-sm"
              >
                <div className="flex justify-between items-start gap-space-sm">
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="font-body-bold text-body-bold text-on-surface truncate">
                      {item.product_name_snapshot}
                    </span>
                    <span className="font-label-md text-label-md text-on-surface-variant">
                      {item.hsn_snapshot ? `HSN: ${item.hsn_snapshot} • ` : ''}GST: {item.gst_percent}%
                    </span>
                  </div>
                  <button
                    onClick={() => handleRemoveItem(index)}
                    className="text-error min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg hover:bg-error-container/20 active:scale-90 transition-transform"
                    type="button"
                    aria-label="Delete item"
                  >
                    <span className="material-symbols-outlined text-[20px]">delete</span>
                  </button>
                </div>

                <div className="flex items-center justify-between pt-space-xs gap-space-sm flex-wrap">
                  <div className="flex items-center gap-space-xs bg-surface-container-low p-1 rounded-lg">
                    <button
                      onClick={() => handleUpdateQty(index, -1)}
                      className="w-8 h-8 rounded bg-surface flex items-center justify-center text-on-surface font-bold shadow-sm active:scale-90 transition-transform"
                      type="button"
                    >
                      -
                    </button>
                    <span className="font-currency-numeral text-currency-numeral px-2 text-on-surface">
                      {item.quantity}
                      {item.unit !== 'Nos' && (
                        <span className="font-label-sm text-label-sm text-on-surface-variant ml-0.5">
                          {item.unit}
                        </span>
                      )}
                    </span>
                    <button
                      onClick={() => handleUpdateQty(index, 1)}
                      className="w-8 h-8 rounded bg-surface flex items-center justify-center text-on-surface font-bold shadow-sm active:scale-90 transition-transform"
                      type="button"
                    >
                      +
                    </button>
                  </div>

                  <div className="flex flex-col text-right">
                    <span className="font-label-sm text-label-sm text-on-surface-variant">
                      @ ₹{item.unit_price.toLocaleString('en-IN')}{item.unit !== 'Nos' ? `/${item.unit}` : ''} + GST ₹{gstAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </span>
                    <span className="font-currency-numeral text-currency-numeral text-on-surface">
                      ₹{lineTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          /* Empty Items State */
          <div className="p-8 rounded-xl bg-surface-container-low text-center flex flex-col items-center justify-center gap-2 border border-dashed border-surface-container-high">
            <span className="material-symbols-outlined text-[32px] text-on-surface-variant opacity-60">
              add_shopping_cart
            </span>
            <p className="font-body-bold text-on-surface">No items in this bill yet</p>
            <p className="font-label-sm text-on-surface-variant max-w-sm">
              Tap "+ Add Item" below to add a product from your catalogue, or type an item manually.
            </p>
          </div>
        )}

        {/* Buttons to Add Item */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button
            onClick={() => setShowItemPicker(true)}
            className="w-full min-h-[50px] bg-surface-container-high hover:bg-surface-variant rounded-xl flex items-center justify-center gap-space-sm text-primary transition-all active:scale-[0.99] font-bold"
            type="button"
          >
            <span className="material-symbols-outlined text-[22px]">inventory_2</span>
            <span className="font-label-lg text-label-lg">Select from Catalogue</span>
          </button>

          <button
            onClick={() => setShowManualAddForm(!showManualAddForm)}
            className="w-full min-h-[50px] bg-surface-container hover:bg-surface-container-high rounded-xl flex items-center justify-center gap-space-sm text-on-surface transition-all active:scale-[0.99] font-bold"
            type="button"
          >
            <span className="material-symbols-outlined text-[22px]">edit</span>
            <span className="font-label-lg text-label-lg">+ Type Item Manually</span>
          </button>
        </div>

        {/* Manual Inline Add Form */}
        {showManualAddForm && (
          <form
            onSubmit={handleAddManualItem}
            className="p-4 rounded-xl bg-surface-container-lowest shadow-sm border border-surface-container flex flex-col gap-3"
          >
            <span className="font-label-sm text-primary font-bold uppercase">Quick Add Line Item</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="text"
                required
                value={manualName}
                onChange={(e) => setManualName(e.target.value)}
                placeholder="Product description / नाव *"
                className="w-full h-11 px-3 bg-surface-container rounded-xl text-body-md outline-none"
                autoFocus
              />
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="number"
                  required
                  value={manualPrice}
                  onChange={(e) => setManualPrice(e.target.value)}
                  placeholder="Rate ₹ *"
                  className="w-full h-11 px-3 bg-surface-container rounded-xl text-body-md outline-none"
                />
                <input
                  type="number"
                  value={manualQty}
                  onChange={(e) => setManualQty(e.target.value)}
                  placeholder="Qty"
                  className="w-full h-11 px-3 bg-surface-container rounded-xl text-body-md outline-none"
                />
                <select
                  value={manualUnit}
                  onChange={(e) => setManualUnit(e.target.value)}
                  className="w-full h-11 px-2 bg-surface-container rounded-xl text-body-md outline-none"
                >
                  <option value="Nos">Nos</option>
                  <option value="Pcs">Pcs</option>
                  <option value="m">m</option>
                  <option value="Rl">Rl</option>
                  <option value="kg">kg</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowManualAddForm(false)}
                className="px-4 py-2 rounded-xl bg-surface-container text-on-surface font-label-md"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-primary text-on-primary font-label-md font-bold"
              >
                Add to Bill
              </button>
            </div>
          </form>
        )}
      </div>

      {/* 3. GST Calculation & Bahi-Khata Bill Summary Card */}
      <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex flex-col gap-space-sm">
        <div className="flex items-center justify-between pb-space-xs">
          <span className="font-headline-sm text-headline-sm text-on-surface">Tax & Amount Breakup</span>
          <span className="font-label-sm text-label-sm bg-surface-container px-2 py-0.5 rounded text-on-surface-variant font-bold">
            Intra-State (MH 27)
          </span>
        </div>

        <div className="flex flex-col gap-1.5 font-body-md text-body-md">
          <div className="flex justify-between text-on-surface-variant">
            <span>Taxable Subtotal (करपात्र मूल्य)</span>
            <span className="font-mono text-on-surface font-semibold">
              ₹{calculation.taxableSubtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex justify-between text-on-surface-variant">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
              Central GST (CGST 9.0%)
            </span>
            <span className="font-mono text-on-surface font-semibold">
              ₹{calculation.cgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex justify-between text-on-surface-variant">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
              State GST (SGST 9.0%)
            </span>
            <span className="font-mono text-on-surface font-semibold">
              ₹{calculation.sgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
          {calculation.roundOff !== 0 && (
            <div className="flex justify-between text-on-surface-variant">
              <span>Round Off (पूर्णांक फरक)</span>
              <span className="font-mono text-error font-semibold">
                {calculation.roundOff > 0 ? '+' : ''}₹{calculation.roundOff.toFixed(2)}
              </span>
            </div>
          )}
        </div>

        {/* Grand Total Highlight Box */}
        <div className="bg-surface-container p-space-md rounded-lg flex flex-col gap-1 mt-space-xs">
          <div className="flex justify-between items-baseline">
            <span className="font-headline-sm text-headline-sm text-on-surface font-bold">Grand Total (एकूण)</span>
            <span className="font-display-lg text-display-lg text-secondary font-bold">
              ₹{calculation.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
          {calculation.grandTotal > 0 && (
            <span className="font-label-md text-label-md text-on-surface-variant italic">
              अक्षरी: {calculation.amountInWordsMr} ({calculation.amountInWordsEn})
            </span>
          )}
        </div>
      </div>

      {/* 4. Formal Indian Business Invoice Preview Sheet (A4 / Thermal Printable View) */}
      {showA4Preview && (
        <div
          className="bg-surface-container-lowest p-space-md rounded-xl shadow-md flex flex-col gap-space-md relative overflow-hidden border border-surface-container-high"
          id="invoice-preview-card"
        >
          <div className="flex items-center justify-between pb-space-xs bg-surface-container-low -mx-space-md -mt-space-md p-space-md">
            <div className="flex items-center gap-space-xs">
              <span className="material-symbols-outlined text-secondary text-[20px]">verified</span>
              <span className="font-label-lg text-label-lg font-bold text-on-surface">
                Official GST Tax Invoice Preview
              </span>
            </div>
            <span className="font-label-sm text-label-sm bg-surface text-secondary px-2 py-0.5 rounded font-bold">
              ORIGINAL FOR RECIPIENT
            </span>
          </div>

          <div className="flex justify-between items-start gap-space-sm pt-space-xs">
            <div className="flex flex-col min-w-0">
              <h2 className="font-headline-md text-headline-md text-on-surface uppercase font-bold tracking-tight">
                {business.shop_name}
              </h2>
              {business.shop_name_marathi && (
                <span className="font-label-md text-label-md text-on-surface font-medium">
                  {business.shop_name_marathi}
                </span>
              )}
              <span className="font-body-md text-body-md text-on-surface-variant mt-1">
                {business.address || 'Market Yard'}
              </span>
              <span className="font-label-md text-label-md text-on-surface-variant">
                Phone: {business.phone}
              </span>
              <div className="flex items-center gap-space-md mt-1 font-label-md text-label-md">
                <span className="font-mono font-bold text-on-surface">
                  GSTIN: {business.gstin || 'Not Provided'}
                </span>
                <span className="text-on-surface-variant">
                  State Code: {business.state_code} ({business.state_name})
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-space-sm bg-surface-container-low p-space-sm rounded-lg font-label-md text-label-md">
            <div>
              <span className="text-on-surface-variant">Invoice No:</span>
              <span className="font-mono font-bold text-on-surface ml-1">{invoiceNumber}</span>
            </div>
            <div className="text-right">
              <span className="text-on-surface-variant">Date:</span>
              <span className="font-bold text-on-surface ml-1">
                {new Date().toLocaleDateString('en-IN')}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 5. Actions */}
      <div className="flex flex-col gap-space-sm">
        <button
          onClick={handleShareWhatsApp}
          disabled={items.length === 0}
          className={`w-full min-h-[56px] rounded-xl font-headline-sm text-headline-sm flex items-center justify-center gap-space-sm shadow-md transition-transform font-bold ${
            items.length > 0
              ? 'bg-secondary text-on-secondary active:scale-[0.98]'
              : 'bg-surface-container text-on-surface-variant opacity-60 cursor-not-allowed'
          }`}
          type="button"
        >
          <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
            <path d="M12.031 2C6.516 2 2.031 6.484 2.031 12c0 1.953.563 3.781 1.531 5.328L2 22l4.828-1.531A9.97 9.97 0 0 0 12.031 22c5.516 0 10-4.484 10-10s-4.484-10-10-10zm5.828 14.281c-.25.703-1.453 1.344-2.016 1.406-.547.063-1.25.094-3.64-0.891-2.859-1.188-4.703-4.094-4.844-4.281-.141-.188-1.172-1.563-1.172-2.984 0-1.422.75-2.125 1.016-2.406.266-.281.578-.359.781-.359.188 0 .391 0 .563.016.188.016.422-.078.656.484.25.594.859 2.094.938 2.25.078.156.125.344.031.547-.078.203-.125.328-.25.484-.125.156-.266.344-.375.469-.125.125-.266.266-.109.531.156.266.688 1.141 1.484 1.844 1.031.922 1.906 1.203 2.188 1.344.281.141.438.125.609-.078.172-.203.734-.859.938-1.156.203-.297.406-.25.688-.141.281.109 1.797.844 2.109 1 .313.156.516.234.594.359.078.125.078.734-.172 1.438z"></path>
          </svg>
          <span>Share Invoice on WhatsApp (व्हॉट्सॲप)</span>
        </button>

        <div className="grid grid-cols-3 gap-space-sm">
          <button
            onClick={handleSaveOnly}
            disabled={items.length === 0}
            className={`min-h-[48px] rounded-xl font-label-lg text-label-lg flex items-center justify-center gap-space-xs transition-colors font-bold ${
              items.length > 0
                ? 'bg-primary text-on-primary active:scale-95'
                : 'bg-surface-container text-on-surface-variant opacity-60 cursor-not-allowed'
            }`}
            type="button"
          >
            <span className="material-symbols-outlined text-[20px]">save</span>
            <span>Save Bill</span>
          </button>
          <button
            onClick={handlePrint}
            disabled={items.length === 0}
            className={`min-h-[48px] rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-label-lg text-label-lg flex items-center justify-center gap-space-xs transition-colors ${
              items.length > 0 ? 'active:scale-95' : 'opacity-60 cursor-not-allowed'
            }`}
            type="button"
          >
            <span className="material-symbols-outlined text-[20px]">print</span>
            <span>Print</span>
          </button>
          <button
            onClick={handleDownloadPDF}
            disabled={items.length === 0}
            className={`min-h-[48px] rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-label-lg text-label-lg flex items-center justify-center gap-space-xs transition-colors ${
              items.length > 0 ? 'active:scale-95' : 'opacity-60 cursor-not-allowed'
            }`}
            type="button"
          >
            <span className="material-symbols-outlined text-[20px]">download</span>
            <span>PDF</span>
          </button>
        </div>
      </div>

      {/* Product Search & Add Modal */}
      {showItemPicker && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-4">
          <div className="bg-surface rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col p-4 shadow-2xl">
            <div className="flex justify-between items-center pb-2 border-b border-surface-container">
              <h3 className="font-headline-sm text-headline-sm">Add Item to Bill</h3>
              <button
                onClick={() => setShowItemPicker(false)}
                className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center"
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
            <div className="py-2">
              <input
                type="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search products by English or मराठी or SKU..."
                className="w-full h-11 px-3 bg-surface-container rounded-xl outline-none"
                autoFocus
              />
            </div>
            <div className="overflow-y-auto space-y-2 py-2 flex-1">
              {filteredCatalogue.length > 0 ? (
                filteredCatalogue.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => handleAddItemFromCatalogue(p)}
                    className="w-full text-left p-3 rounded-xl bg-surface-container-low hover:bg-surface-container flex justify-between items-center"
                    type="button"
                  >
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="font-body-bold text-on-surface truncate">{p.name}</span>
                      <span className="font-label-sm text-on-surface-variant">
                        {p.name_marathi ? `${p.name_marathi} • ` : ''}SKU: {p.sku} • Stock: {p.stock}
                      </span>
                    </div>
                    <span className="font-currency-numeral text-secondary font-bold shrink-0 ml-2">
                      ₹{p.selling_price.toLocaleString('en-IN')}
                    </span>
                  </button>
                ))
              ) : (
                <div className="text-center py-8 text-on-surface-variant">
                  <p className="font-body-bold">No products found in catalogue</p>
                  <p className="font-label-sm mt-1">Use "+ Type Item Manually" on the previous screen to add any item.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
