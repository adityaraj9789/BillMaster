import { z } from 'zod';

export type ConfidenceStatus = 'looks_correct' | 'needs_review' | 'uncertain';
export type PaymentMode = 'cash' | 'upi' | 'credit' | 'neft' | 'card';
export type BillStatus = 'verified' | 'needs_review' | 'cancelled' | 'draft';
export type LanguageMode = 'en' | 'mr' | 'mixed';
export type PaperSize = 'A4' | 'A5' | 'thermal_58' | 'thermal_80';

export interface BusinessProfile {
  id: string;
  shop_name: string;
  shop_name_marathi?: string;
  owner_name: string;
  address: string;
  phone: string;
  email?: string;
  gstin?: string;
  state_code: string;
  state_name: string;
  logo_url?: string;
  invoice_prefix: string;
  starting_number: number;
  default_gst: number;
  upi_id?: string;
  paper_size: PaperSize;
  language: LanguageMode;
  created_at?: string;
  updated_at?: string;
}

export interface Product {
  id: string;
  name: string;
  name_marathi?: string;
  brand?: string;
  model?: string;
  category: string;
  sku: string;
  hsn_code?: string;
  unit: string;
  selling_price: number;
  purchase_price?: number;
  gst_percent: number;
  stock: number;
  minimum_stock: number;
  description?: string;
  image_url?: string;
  aliases?: ProductAlias[];
  last_billed_price?: number;
  last_billed_date?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ProductAlias {
  id: string;
  product_id: string;
  alias: string;
  language: 'en' | 'mr' | 'mixed';
  alias_type: 'shorthand' | 'misspelling' | 'brand_abbrev' | 'spoken';
  confirmed: boolean;
  created_at?: string;
}

export interface ProductPriceHistory {
  id: string;
  product_id: string;
  old_price: number;
  new_price: number;
  changed_at: string;
  source_bill_id?: string;
  note?: string;
}

export interface Customer {
  id: string;
  name: string;
  name_marathi?: string;
  phone: string;
  address?: string;
  city?: string;
  gstin?: string;
  email?: string;
  customer_type?: 'retail' | 'b2b' | 'contractor';
  total_purchases: number;
  pending_credit?: number;
  last_purchase_at?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface BillItem {
  id: string;
  bill_id?: string;
  product_id?: string;
  original_text?: string;
  product_name_snapshot: string;
  product_name_marathi?: string;
  brand_snapshot?: string;
  sku_snapshot?: string;
  hsn_snapshot?: string;
  quantity: number;
  unit: string;
  unit_price: number;
  gst_percent: number;
  cgst_amount?: number;
  sgst_amount?: number;
  total: number;
  confidence: ConfidenceStatus;
  uncertainty_reason?: string;
  suggested_product_id?: string;
  suggested_product_name?: string;
  suggested_rate?: number;
  crop_image_url?: string;
}

export interface Bill {
  id: string;
  invoice_number: string;
  customer_id?: string;
  customer_name: string;
  customer_phone?: string;
  customer_address?: string;
  customer_gstin?: string;
  bill_date: string;
  time_str?: string;
  subtotal: number;
  discount: number;
  cgst: number;
  sgst: number;
  igst: number;
  gst: number;
  round_off: number;
  grand_total: number;
  payment_mode: PaymentMode;
  status: BillStatus;
  source: 'scan' | 'manual_pos' | 'duplicate';
  scan_file_url?: string;
  unverified_reason?: string;
  notes?: string;
  items: BillItem[];
  created_at?: string;
  updated_at?: string;
}

export interface ShorthandMapping {
  id: string;
  shorthand: string;
  product_id: string;
  product_name?: string;
  confirmation_count: number;
  created_at?: string;
  updated_at?: string;
}

// Zod Schema for strict validation of Gemini AI Bill Extraction
export const ExtractedItemSchema = z.object({
  original_text: z.string().default(''),
  normalized_name: z.string(),
  name_marathi: z.string().optional().nullable(),
  brand: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  hsn_code: z.string().optional().nullable(),
  quantity: z.number().default(1),
  unit: z.string().default('Nos'),
  unit_price: z.number().default(0),
  gst_percent: z.number().default(18),
  confidence: z.enum(['looks_correct', 'needs_review', 'uncertain']).default('looks_correct'),
  uncertainty_reason: z.string().optional().nullable(),
  suggested_product_name: z.string().optional().nullable(),
  suggested_rate: z.number().optional().nullable(),
});

export const ExtractedBillSchema = z.object({
  invoice_number: z.string().optional().nullable(),
  bill_date: z.string().optional().nullable(),
  customer: z.object({
    name: z.string().optional().nullable(),
    phone: z.string().optional().nullable(),
    address: z.string().optional().nullable(),
    gstin: z.string().optional().nullable(),
  }).optional().nullable(),
  items: z.array(ExtractedItemSchema).default([]),
  subtotal: z.number().optional().nullable(),
  discount: z.number().optional().nullable(),
  gst: z.number().optional().nullable(),
  grand_total: z.number().optional().nullable(),
  notes: z.string().optional().nullable(),
  uncertain_fields_count: z.number().default(0),
  detected_language: z.string().default('mr_en'),
});

export type ExtractedBill = z.infer<typeof ExtractedBillSchema>;
export type ExtractedItem = z.infer<typeof ExtractedItemSchema>;
