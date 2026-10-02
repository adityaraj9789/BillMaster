-- BillMaster Supabase PostgreSQL Schema
-- Complete production schema for AI-assisted shop billing & catalog learning

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. BUSINESS PROFILE
CREATE TABLE IF NOT EXISTS business (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_name TEXT NOT NULL,
    shop_name_marathi TEXT,
    owner_name TEXT NOT NULL,
    address TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    gstin TEXT,
    state_code TEXT DEFAULT '27',
    state_name TEXT DEFAULT 'Maharashtra',
    logo_url TEXT,
    invoice_prefix TEXT DEFAULT 'BM-',
    starting_number INTEGER DEFAULT 1001,
    default_gst NUMERIC(5,2) DEFAULT 18.00,
    upi_id TEXT,
    paper_size TEXT DEFAULT 'A4',
    language TEXT DEFAULT 'mr', -- 'en', 'mr', 'mixed'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. PRODUCTS MASTER
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    name_marathi TEXT,
    brand TEXT,
    model TEXT,
    category TEXT DEFAULT 'General',
    sku TEXT UNIQUE,
    hsn_code TEXT,
    unit TEXT DEFAULT 'Nos', -- 'Nos', 'Pcs', 'Rl', 'm', 'kg', 'bundle', 'unit'
    selling_price NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    purchase_price NUMERIC(12,2) DEFAULT 0.00,
    gst_percent NUMERIC(5,2) NOT NULL DEFAULT 18.00,
    stock INTEGER NOT NULL DEFAULT 0,
    minimum_stock INTEGER DEFAULT 5,
    description TEXT,
    image_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast product search
CREATE INDEX IF NOT EXISTS idx_products_name ON products USING GIN (to_tsvector('simple', name));
CREATE INDEX IF NOT EXISTS idx_products_sku ON products (sku);
CREATE INDEX IF NOT EXISTS idx_products_category ON products (category);

-- 3. PRODUCT ALIASES (Multilingual & Shopkeeper Shorthand)
CREATE TABLE IF NOT EXISTS product_aliases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    alias TEXT NOT NULL,
    language TEXT DEFAULT 'mixed', -- 'en', 'mr', 'mixed'
    alias_type TEXT DEFAULT 'shorthand', -- 'shorthand', 'misspelling', 'brand_abbrev', 'spoken'
    confirmed BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(product_id, alias)
);

CREATE INDEX IF NOT EXISTS idx_product_aliases_alias ON product_aliases (LOWER(alias));

-- 4. PRODUCT PRICE HISTORY (Never overwrite historical invoice prices)
CREATE TABLE IF NOT EXISTS product_price_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    old_price NUMERIC(12,2) NOT NULL,
    new_price NUMERIC(12,2) NOT NULL,
    changed_at TIMESTAMPTZ DEFAULT NOW(),
    source_bill_id UUID,
    note TEXT
);

CREATE INDEX IF NOT EXISTS idx_price_history_product_id ON product_price_history (product_id);

-- 5. CUSTOMERS (Bahi Khata Accounts)
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    name_marathi TEXT,
    phone TEXT,
    address TEXT,
    city TEXT,
    gstin TEXT,
    email TEXT,
    customer_type TEXT DEFAULT 'retail', -- 'retail', 'b2b', 'contractor'
    total_purchases NUMERIC(12,2) DEFAULT 0.00,
    pending_credit NUMERIC(12,2) DEFAULT 0.00,
    last_purchase_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers (phone);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers (LOWER(name));

-- 6. BILLS (Tax Invoices, Estimates, Rough Slips)
CREATE TABLE IF NOT EXISTS bills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_number TEXT NOT NULL UNIQUE,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT,
    customer_address TEXT,
    customer_gstin TEXT,
    bill_date DATE NOT NULL DEFAULT CURRENT_DATE,
    subtotal NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    discount NUMERIC(12,2) DEFAULT 0.00,
    cgst NUMERIC(12,2) DEFAULT 0.00,
    sgst NUMERIC(12,2) DEFAULT 0.00,
    igst NUMERIC(12,2) DEFAULT 0.00,
    gst NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    round_off NUMERIC(6,2) DEFAULT 0.00,
    grand_total NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    payment_mode TEXT DEFAULT 'cash', -- 'cash', 'upi', 'credit', 'neft', 'card'
    status TEXT NOT NULL DEFAULT 'verified', -- 'verified', 'needs_review', 'cancelled', 'draft'
    source TEXT DEFAULT 'manual_pos', -- 'scan', 'manual_pos', 'duplicate'
    scan_file_url TEXT,
    unverified_reason TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bills_date ON bills (bill_date DESC);
CREATE INDEX IF NOT EXISTS idx_bills_invoice ON bills (invoice_number);
CREATE INDEX IF NOT EXISTS idx_bills_customer ON bills (customer_id);
CREATE INDEX IF NOT EXISTS idx_bills_status ON bills (status);

-- 7. BILL ITEMS (Historical Immutable Snapshot)
CREATE TABLE IF NOT EXISTS bill_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bill_id UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    product_name_snapshot TEXT NOT NULL,
    product_name_marathi TEXT,
    brand_snapshot TEXT,
    sku_snapshot TEXT,
    hsn_snapshot TEXT,
    quantity NUMERIC(10,2) NOT NULL DEFAULT 1.00,
    unit TEXT DEFAULT 'Nos',
    unit_price NUMERIC(12,2) NOT NULL,
    gst_percent NUMERIC(5,2) NOT NULL DEFAULT 18.00,
    cgst_amount NUMERIC(12,2) DEFAULT 0.00,
    sgst_amount NUMERIC(12,2) DEFAULT 0.00,
    total NUMERIC(12,2) NOT NULL,
    confidence TEXT DEFAULT 'looks_correct', -- 'looks_correct', 'needs_review', 'uncertain'
    uncertainty_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bill_items_bill ON bill_items (bill_id);
CREATE INDEX IF NOT EXISTS idx_bill_items_product ON bill_items (product_id);

-- 8. SCAN RECORDS & REVIEW DATA
CREATE TABLE IF NOT EXISTS scan_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bill_id UUID REFERENCES bills(id) ON DELETE SET NULL,
    source_file_url TEXT,
    image_base64 TEXT,
    raw_extracted_json JSONB,
    processing_status TEXT DEFAULT 'pending_review', -- 'pending_review', 'verified', 'rejected'
    items_count INTEGER DEFAULT 0,
    uncertain_fields_count INTEGER DEFAULT 0,
    ocr_language_detected TEXT DEFAULT 'mr_en',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ
);

-- 9. SHOPKEEPER SHORTHAND MAPPINGS
CREATE TABLE IF NOT EXISTS shorthand_mappings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shorthand TEXT NOT NULL UNIQUE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    confirmation_count INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shorthand_lookup ON shorthand_mappings (LOWER(shorthand));

-- 10. PRODUCT BUNDLES
CREATE TABLE IF NOT EXISTS product_bundles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS product_bundle_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bundle_id UUID NOT NULL REFERENCES product_bundles(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity NUMERIC(10,2) NOT NULL DEFAULT 1.00
);

-- Automatic Trigger for Product Price History
CREATE OR REPLACE FUNCTION record_product_price_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.selling_price IS DISTINCT FROM NEW.selling_price THEN
        INSERT INTO product_price_history (product_id, old_price, new_price, changed_at, note)
        VALUES (NEW.id, OLD.selling_price, NEW.selling_price, NOW(), 'Price updated via catalog master');
    END IF;
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_product_price_update ON products;
CREATE TRIGGER trg_product_price_update
BEFORE UPDATE ON products
FOR EACH ROW
EXECUTE FUNCTION record_product_price_change();

-- ROW LEVEL SECURITY (RLS)
ALTER TABLE business ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE bill_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE shorthand_mappings ENABLE ROW LEVEL SECURITY;

-- Default permissive policy for authenticated / anon shopkeeper usage
CREATE POLICY "Public full access to business" ON business FOR ALL USING (true);
CREATE POLICY "Public full access to products" ON products FOR ALL USING (true);
CREATE POLICY "Public full access to product_aliases" ON product_aliases FOR ALL USING (true);
CREATE POLICY "Public full access to price_history" ON product_price_history FOR ALL USING (true);
CREATE POLICY "Public full access to customers" ON customers FOR ALL USING (true);
CREATE POLICY "Public full access to bills" ON bills FOR ALL USING (true);
CREATE POLICY "Public full access to bill_items" ON bill_items FOR ALL USING (true);
CREATE POLICY "Public full access to scan_records" ON scan_records FOR ALL USING (true);
CREATE POLICY "Public full access to shorthand_mappings" ON shorthand_mappings FOR ALL USING (true);
