import { Bill, BillItem, BusinessProfile, Customer, Product, ProductPriceHistory, ShorthandMapping } from '../../types';

const STORAGE_KEY_PREFIX = 'billmaster_clean_';

// Initial default shop profile (clean, ready for shopkeeper customization)
const DEFAULT_BUSINESS: BusinessProfile = {
  id: 'biz-001',
  shop_name: 'BillMaster Shop',
  shop_name_marathi: '',
  owner_name: '',
  address: '',
  phone: '',
  email: '',
  gstin: '',
  state_code: '27',
  state_name: 'Maharashtra',
  invoice_prefix: 'BM-',
  starting_number: 1001,
  default_gst: 18,
  upi_id: '',
  paper_size: 'A4',
  language: 'mixed',
};

type Listener = () => void;

class Repository {
  private business: BusinessProfile = DEFAULT_BUSINESS;
  private products: Product[] = [];
  private customers: Customer[] = [];
  private bills: Bill[] = [];
  private priceHistory: ProductPriceHistory[] = [];
  private shorthandMappings: ShorthandMapping[] = [];
  private listeners: Set<Listener> = new Set();
  private initialized = false;

  constructor() {
    this.init();
  }

  private init() {
    if (typeof window === 'undefined') return;

    try {
      // Clear any legacy demo data from previous storage keys
      localStorage.removeItem('billmaster_biz');
      localStorage.removeItem('billmaster_prods');
      localStorage.removeItem('billmaster_custs');
      localStorage.removeItem('billmaster_bills');
      localStorage.removeItem('billmaster_history');
      localStorage.removeItem('billmaster_shorthand');

      const storedBiz = localStorage.getItem(`${STORAGE_KEY_PREFIX}biz`);
      this.business = storedBiz ? JSON.parse(storedBiz) : DEFAULT_BUSINESS;

      const storedProds = localStorage.getItem(`${STORAGE_KEY_PREFIX}prods`);
      this.products = storedProds ? JSON.parse(storedProds) : [];

      const storedCusts = localStorage.getItem(`${STORAGE_KEY_PREFIX}custs`);
      this.customers = storedCusts ? JSON.parse(storedCusts) : [];

      const storedBills = localStorage.getItem(`${STORAGE_KEY_PREFIX}bills`);
      this.bills = storedBills ? JSON.parse(storedBills) : [];

      const storedHistory = localStorage.getItem(`${STORAGE_KEY_PREFIX}history`);
      this.priceHistory = storedHistory ? JSON.parse(storedHistory) : [];

      const storedShorthand = localStorage.getItem(`${STORAGE_KEY_PREFIX}shorthand`);
      this.shorthandMappings = storedShorthand ? JSON.parse(storedShorthand) : [];

      this.initialized = true;
    } catch (e) {
      console.warn('LocalStorage error, starting fresh with empty state', e);
      this.business = DEFAULT_BUSINESS;
      this.products = [];
      this.customers = [];
      this.bills = [];
      this.priceHistory = [];
      this.shorthandMappings = [];
      this.initialized = true;
    }
  }

  private save() {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(`${STORAGE_KEY_PREFIX}biz`, JSON.stringify(this.business));
      localStorage.setItem(`${STORAGE_KEY_PREFIX}prods`, JSON.stringify(this.products));
      localStorage.setItem(`${STORAGE_KEY_PREFIX}custs`, JSON.stringify(this.customers));
      localStorage.setItem(`${STORAGE_KEY_PREFIX}bills`, JSON.stringify(this.bills));
      localStorage.setItem(`${STORAGE_KEY_PREFIX}history`, JSON.stringify(this.priceHistory));
      localStorage.setItem(`${STORAGE_KEY_PREFIX}shorthand`, JSON.stringify(this.shorthandMappings));
    } catch (e) {
      console.error('Failed to save to localStorage', e);
    }
    this.notify();
  }

  public subscribe(listener: Listener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((l) => l());
  }

  // BUSINESS
  public getBusiness(): BusinessProfile {
    return { ...this.business };
  }

  public updateBusiness(updates: Partial<BusinessProfile>): BusinessProfile {
    this.business = { ...this.business, ...updates, updated_at: new Date().toISOString() };
    this.save();
    return this.getBusiness();
  }

  // PRODUCTS
  public getProducts(): Product[] {
    return [...this.products];
  }

  public getProductById(id: string): Product | undefined {
    return this.products.find((p) => p.id === id);
  }

  public addProduct(product: Omit<Product, 'id' | 'created_at' | 'updated_at'>): Product {
    const newProduct: Product = {
      ...product,
      id: `prod-${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      aliases: product.aliases || []
    };
    this.products.unshift(newProduct);
    this.save();
    return newProduct;
  }

  public updateProduct(id: string, updates: Partial<Product>, sourceBillId?: string): Product | null {
    const idx = this.products.findIndex((p) => p.id === id);
    if (idx === -1) return null;

    const current = this.products[idx];
    if (updates.selling_price && updates.selling_price !== current.selling_price) {
      // Record immutable price history
      this.priceHistory.unshift({
        id: `ph-${Date.now()}`,
        product_id: id,
        old_price: current.selling_price,
        new_price: updates.selling_price,
        changed_at: new Date().toISOString(),
        source_bill_id: sourceBillId,
        note: `Price updated from ₹${current.selling_price} to ₹${updates.selling_price}`
      });
    }

    const updated = {
      ...current,
      ...updates,
      updated_at: new Date().toISOString()
    };
    this.products[idx] = updated;
    this.save();
    return updated;
  }

  public deleteProduct(id: string): boolean {
    const lenBefore = this.products.length;
    this.products = this.products.filter((p) => p.id !== id);
    if (this.products.length !== lenBefore) {
      this.save();
      return true;
    }
    return false;
  }

  public addProductAlias(productId: string, aliasStr: string, language: 'en' | 'mr' | 'mixed' = 'mixed'): boolean {
    const prod = this.getProductById(productId);
    if (!prod) return false;

    const trimmed = aliasStr.trim();
    if (!trimmed) return false;

    if (!prod.aliases) prod.aliases = [];
    if (prod.aliases.some((a) => a.alias.toLowerCase() === trimmed.toLowerCase())) return false;

    prod.aliases.push({
      id: `al-${Date.now()}`,
      product_id: productId,
      alias: trimmed,
      language,
      alias_type: 'shorthand',
      confirmed: true,
      created_at: new Date().toISOString()
    });

    this.save();
    return true;
  }

  public removeProductAlias(productId: string, aliasId: string): boolean {
    const prod = this.getProductById(productId);
    if (!prod || !prod.aliases) return false;

    prod.aliases = prod.aliases.filter((a) => a.id !== aliasId);
    this.save();
    return true;
  }

  public getPriceHistory(productId: string): ProductPriceHistory[] {
    return this.priceHistory.filter((h) => h.product_id === productId);
  }

  // CUSTOMERS
  public getCustomers(): Customer[] {
    return [...this.customers];
  }

  public getCustomerById(id: string): Customer | undefined {
    return this.customers.find((c) => c.id === id);
  }

  public addCustomer(cust: Omit<Customer, 'id' | 'total_purchases' | 'created_at' | 'updated_at'>): Customer {
    const newCust: Customer = {
      ...cust,
      id: `cust-${Date.now()}`,
      total_purchases: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    this.customers.unshift(newCust);
    this.save();
    return newCust;
  }

  public updateCustomer(id: string, updates: Partial<Customer>): Customer | null {
    const idx = this.customers.findIndex((c) => c.id === id);
    if (idx === -1) return null;

    const updated = { ...this.customers[idx], ...updates, updated_at: new Date().toISOString() };
    this.customers[idx] = updated;
    this.save();
    return updated;
  }

  // BILLS
  public getBills(): Bill[] {
    return [...this.bills];
  }

  public getBillById(id: string): Bill | undefined {
    return this.bills.find((b) => b.id === id);
  }

  public getNextInvoiceNumber(): string {
    const prefix = this.business.invoice_prefix || 'BM-';
    const nums = this.bills
      .map((b) => {
        const clean = b.invoice_number.replace(prefix, '').replace('#', '');
        const parsed = parseInt(clean, 10);
        return isNaN(parsed) ? 0 : parsed;
      })
      .filter((n) => n > 0);

    const highest = nums.length > 0 ? Math.max(...nums) : (this.business.starting_number || 1000) - 1;
    return `${prefix}${highest + 1}`;
  }

  public saveBill(billData: Omit<Bill, 'id' | 'created_at' | 'updated_at'> & { id?: string }): Bill {
    const id = billData.id || `bill-${Date.now()}`;
    const invoiceNumber = billData.invoice_number || this.getNextInvoiceNumber();

    const existingIdx = this.bills.findIndex((b) => b.id === id);
    const billToSave: Bill = {
      ...billData,
      id,
      invoice_number: invoiceNumber,
      time_str: billData.time_str || new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      created_at: existingIdx >= 0 ? this.bills[existingIdx].created_at : new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (existingIdx >= 0) {
      this.bills[existingIdx] = billToSave;
    } else {
      this.bills.unshift(billToSave);
    }

    // Update customer total purchases & last purchased date
    if (billToSave.customer_id) {
      const cust = this.getCustomerById(billToSave.customer_id);
      if (cust) {
        this.updateCustomer(cust.id, {
          total_purchases: (cust.total_purchases || 0) + billToSave.grand_total,
          last_purchase_at: billToSave.bill_date
        });
      }
    } else if (billToSave.customer_name && billToSave.customer_name.trim() !== 'Counter Cash Sale (किरकोळ ग्राहक)') {
      // Auto-register customer if not existing
      const existing = this.customers.find((c) => c.name.toLowerCase() === billToSave.customer_name.toLowerCase());
      if (!existing) {
        this.addCustomer({
          name: billToSave.customer_name,
          phone: billToSave.customer_phone || '',
          address: billToSave.customer_address,
          gstin: billToSave.customer_gstin,
        });
      }
    }

    // Deduct stock for verified bills
    if (billToSave.status === 'verified') {
      billToSave.items.forEach((item) => {
        if (item.product_id) {
          const prod = this.getProductById(item.product_id);
          if (prod && prod.stock !== undefined) {
            this.updateProduct(prod.id, {
              stock: Math.max(0, prod.stock - Number(item.quantity || 1)),
              last_billed_price: item.unit_price,
              last_billed_date: billToSave.bill_date
            });
          }
        }
      });
    }

    this.save();
    return billToSave;
  }

  public updateBillStatus(billId: string, status: Bill['status'], updatedItems?: BillItem[]): Bill | null {
    const idx = this.bills.findIndex((b) => b.id === billId);
    if (idx === -1) return null;

    const current = this.bills[idx];
    const items = updatedItems || current.items;

    const hasUncertain = items.some((i) => i.confidence !== 'looks_correct');
    const finalStatus = hasUncertain ? 'needs_review' : status;

    const updated: Bill = {
      ...current,
      status: finalStatus,
      unverified_reason: finalStatus === 'verified' ? undefined : current.unverified_reason,
      items,
      updated_at: new Date().toISOString()
    };

    this.bills[idx] = updated;
    this.save();
    return updated;
  }

  public duplicateBill(billId: string): Bill | null {
    const orig = this.getBillById(billId);
    if (!orig) return null;

    const newInvoiceNumber = this.getNextInvoiceNumber();
    const today = new Date().toISOString().split('T')[0];

    const duplicatedBill: Bill = {
      ...orig,
      id: `bill-${Date.now()}`,
      invoice_number: newInvoiceNumber,
      bill_date: today,
      time_str: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      source: 'duplicate',
      status: 'verified',
      items: orig.items.map((item, idx) => ({
        ...item,
        id: `bi-dup-${Date.now()}-${idx}`
      })),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    this.bills.unshift(duplicatedBill);
    this.save();
    return duplicatedBill;
  }

  // SHORTHAND LEARNING
  public getShorthandMappings(): ShorthandMapping[] {
    return [...this.shorthandMappings];
  }

  public learnShorthand(shorthand: string, productId: string): void {
    const clean = shorthand.trim().toLowerCase();
    if (!clean) return;

    const existing = this.shorthandMappings.find((s) => s.shorthand.toLowerCase() === clean && s.product_id === productId);
    const prod = this.getProductById(productId);

    if (existing) {
      existing.confirmation_count += 1;
      existing.updated_at = new Date().toISOString();
    } else {
      this.shorthandMappings.push({
        id: `sh-${Date.now()}`,
        shorthand: clean,
        product_id: productId,
        product_name: prod?.name,
        confirmation_count: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }

    if (prod && !prod.aliases?.some((a) => a.alias.toLowerCase() === clean)) {
      this.addProductAlias(productId, shorthand, 'mixed');
    }

    this.save();
  }

  public matchProduct(queryText: string): { product?: Product; confidence: 'exact' | 'alias' | 'shorthand' | 'partial' | 'none'; score: number } {
    if (!queryText || !queryText.trim() || this.products.length === 0) {
      return { confidence: 'none', score: 0 };
    }

    const q = queryText.trim().toLowerCase();

    // 1. Shorthand mappings
    const shorthandMatch = this.shorthandMappings.find((s) => s.shorthand.toLowerCase() === q);
    if (shorthandMatch) {
      const prod = this.getProductById(shorthandMatch.product_id);
      if (prod) return { product: prod, confidence: 'shorthand', score: 0.95 };
    }

    // 2. Exact name or SKU
    const exact = this.products.find(
      (p) => p.name.toLowerCase() === q || p.sku.toLowerCase() === q || (p.name_marathi && p.name_marathi.toLowerCase() === q)
    );
    if (exact) return { product: exact, confidence: 'exact', score: 1.0 };

    // 3. Aliases
    for (const p of this.products) {
      if (p.aliases) {
        for (const a of p.aliases) {
          if (a.alias.toLowerCase() === q) {
            return { product: p, confidence: 'alias', score: 0.9 };
          }
        }
      }
    }

    // 4. Token substring matching
    const qTokens = q.split(/\s+/).filter((t) => t.length > 2);
    let bestProduct: Product | undefined;
    let maxMatch = 0;

    for (const p of this.products) {
      const targetStr = `${p.name} ${p.name_marathi || ''} ${p.brand || ''} ${p.sku} ${p.aliases?.map((a) => a.alias).join(' ') || ''}`.toLowerCase();
      let matchCount = 0;
      for (const t of qTokens) {
        if (targetStr.includes(t)) matchCount++;
      }
      if (matchCount > maxMatch) {
        maxMatch = matchCount;
        bestProduct = p;
      }
    }

    if (bestProduct && maxMatch >= 2) {
      return { product: bestProduct, confidence: 'partial', score: Math.min(0.8, maxMatch * 0.25) };
    }

    return { confidence: 'none', score: 0 };
  }

  // REAL DATABASE METRICS ONLY (ZERO DEMO DATA)
  public getDashboardMetrics() {
    const today = new Date().toISOString().split('T')[0];
    const todayBills = this.bills.filter((b) => b.bill_date === today);

    const todaySales = todayBills.reduce((acc, b) => acc + (b.status !== 'cancelled' ? b.grand_total : 0), 0);
    const billsNeedingReview = this.bills.filter((b) => b.status === 'needs_review');

    const totalAliases = this.products.reduce((acc, p) => acc + (p.aliases?.length || 0), 0);

    const cashBills = todayBills.filter((b) => b.payment_mode === 'cash');
    const cashTotal = cashBills.reduce((acc, b) => acc + b.grand_total, 0);
    const cashPercent = todaySales > 0 ? Math.round((cashTotal / todaySales) * 100) : 0;
    const upiPercent = todaySales > 0 ? 100 - cashPercent : 0;

    return {
      todaySales,
      todayBillsCount: todayBills.length,
      totalProducts: this.products.length,
      totalCustomers: this.customers.length,
      billsNeedingReviewCount: billsNeedingReview.length,
      billsNeedingReview,
      totalAliasesLearned: totalAliases,
      cashPercent,
      upiPercent,
      avgBillAmount: todayBills.length > 0 ? Math.round(todaySales / todayBills.length) : 0
    };
  }
}

export const db = new Repository();
