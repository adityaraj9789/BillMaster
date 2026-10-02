import React, { useState, useMemo } from 'react';
import { Product } from '../types';

interface ProductsCataloguePageProps {
  products: Product[];
  onAddProductClick: () => void;
  onEditProduct: (product: Product) => void;
  onViewPriceLog: (product: Product) => void;
  onTeachAlias: (product: Product) => void;
  onDeleteAlias: (productId: string, aliasId: string) => void;
  onAddToBill: (product: Product) => void;
  onScanClick: () => void;
}

export const ProductsCataloguePage: React.FC<ProductsCataloguePageProps> = ({
  products,
  onAddProductClick,
  onEditProduct,
  onViewPriceLog,
  onTeachAlias,
  onDeleteAlias,
  onAddToBill,
  onScanClick,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const categories = ['All', 'Motors & Pumps', 'Cables & Wire', 'Pipes & Fittings', 'Low Stock'];

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // Category filter
      if (selectedCategory === 'Low Stock') {
        if (p.stock > p.minimum_stock) return false;
      } else if (selectedCategory !== 'All' && p.category !== selectedCategory) {
        return false;
      }

      // Search query filter
      if (!searchTerm.trim()) return true;
      const q = searchTerm.toLowerCase();

      const matchName = p.name.toLowerCase().includes(q);
      const matchMr = p.name_marathi?.toLowerCase().includes(q);
      const matchSku = p.sku.toLowerCase().includes(q);
      const matchBrand = p.brand?.toLowerCase().includes(q);
      const matchAlias = p.aliases?.some((a) => a.alias.toLowerCase().includes(q));

      return matchName || matchMr || matchSku || matchBrand || matchAlias;
    });
  }, [products, searchTerm, selectedCategory]);

  return (
    <div className="flex flex-col w-full gap-space-lg max-w-4xl mx-auto">
      {/* Scan & Learn Intelligence Banner */}
      <div className="relative overflow-hidden rounded-xl bg-surface-container-high p-space-md shadow-sm">
        <div className="flex items-start gap-space-md">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary-container text-on-secondary-container">
            <span className="material-symbols-outlined text-[22px]">auto_awesome</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-space-xs">
              <span className="font-headline-sm text-headline-sm text-on-surface">Scan & Learn Active</span>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed font-label-sm text-label-sm font-bold">
                AI v2.4
              </span>
            </div>
            <p className="font-body-md text-body-md text-on-surface-variant mt-0.5">
              Every verified bill automatically teaches BillMaster new handwriting styles, dialect spellings, and
              shop shorthand abbreviations.
            </p>
          </div>
        </div>
      </div>

      {products.length > 0 ? (
        <>
          {/* Search & Filter Dock */}
          <div className="flex flex-col gap-space-sm">
            {/* Bilingual Search Field */}
            <div className="relative flex items-center w-full">
              <div className="absolute left-3.5 flex items-center pointer-events-none text-on-surface-variant">
                <span className="material-symbols-outlined text-[20px]">search</span>
              </div>
              <input
                type="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                id="catalogue-search"
                placeholder="Search by English, मराठी, Brand, SKU or Shorthand..."
                className="w-full h-12 pl-11 pr-14 rounded-xl bg-surface-container text-on-surface font-body-md text-body-md placeholder:text-on-surface-variant placeholder:opacity-75 focus:outline-none focus:bg-surface-container-high shadow-sm transition-colors"
              />
              <button
                onClick={() => setSearchTerm(searchTerm ? '' : 'मोटर')}
                type="button"
                className="absolute right-2 h-8 px-2.5 rounded-lg bg-surface-variant text-on-surface flex items-center gap-1 font-label-sm text-label-sm shadow-sm active:scale-95 transition-transform"
                title="Marathi filter"
              >
                <span className="material-symbols-outlined text-[16px]">mic</span>
                <span>मराठी</span>
              </button>
            </div>

            {/* Filter Chips Scrollable Row */}
            <div className="flex items-center gap-space-xs overflow-x-auto no-scrollbar py-0.5">
              {categories.map((cat) => {
                const isSelected = selectedCategory === cat;
                const count =
                  cat === 'All'
                    ? products.length
                    : cat === 'Low Stock'
                    ? products.filter((p) => p.stock <= p.minimum_stock).length
                    : products.filter((p) => p.category === cat).length;

                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    type="button"
                    className={`shrink-0 px-3 py-2 rounded-xl font-label-md text-label-md transition-colors flex items-center gap-1 shadow-sm ${
                      isSelected
                        ? 'bg-primary text-on-primary font-bold'
                        : cat === 'Low Stock' && count > 0
                        ? 'bg-error-container text-on-error-container'
                        : 'bg-surface-container hover:bg-surface-container-high text-on-surface-variant'
                    }`}
                  >
                    {cat === 'Low Stock' && <span className="material-symbols-outlined text-[14px]">warning</span>}
                    <span>{cat}</span>
                    <span className="text-[10px] opacity-80">({count})</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Inventory Ledger Status Counter */}
          <div className="flex items-center justify-between px-0.5">
            <div className="flex items-center gap-space-xs">
              <span className="font-body-bold text-body-bold text-on-surface">Learned Inventory</span>
              <span className="px-2 py-0.5 rounded-full bg-surface-container-highest text-on-surface font-label-sm text-label-sm font-bold">
                {filteredProducts.length} of {products.length} Showing
              </span>
            </div>
            <div className="flex items-center gap-1 text-on-surface-variant font-label-md text-label-md">
              <span className="material-symbols-outlined text-[16px]">sort</span>
              <span>Recent Bill Match</span>
            </div>
          </div>

          {/* Product List */}
          <div className="space-y-space-md">
            {filteredProducts.map((prod) => (
              <div
                key={prod.id}
                className="flex flex-col rounded-xl bg-surface-container-lowest p-space-md shadow-sm gap-space-md"
              >
                <div className="flex items-start justify-between gap-space-sm">
                  <div className="flex items-start gap-space-md min-w-0 flex-1">
                    <div className="relative w-16 h-16 rounded-xl bg-surface-container-low shrink-0 overflow-hidden flex items-center justify-center">
                      {prod.image_url ? (
                        <img
                          src={prod.image_url}
                          alt={prod.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="material-symbols-outlined text-secondary text-[28px]">
                          inventory_2
                        </span>
                      )}
                    </div>

                    <div className="flex flex-col min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-headline-sm text-headline-sm text-on-surface leading-snug">
                          {prod.name}
                        </span>
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-label-sm font-bold">
                          <span className="material-symbols-outlined text-[13px] mr-0.5">verified</span>{' '}
                          AI Auto-Trained
                        </span>
                      </div>
                      {prod.name_marathi && (
                        <span className="font-body-md text-body-md text-on-surface-variant font-medium mt-0.5">
                          {prod.name_marathi}
                        </span>
                      )}
                      <div className="flex items-center gap-2 mt-1 text-on-surface-variant font-label-md text-label-md flex-wrap">
                        <span>
                          SKU: <strong className="text-on-surface">{prod.sku}</strong>
                        </span>
                        <span>•</span>
                        <span>
                          GST: <strong className="text-on-surface">{prod.gst_percent}%</strong>
                        </span>
                        <span>•</span>
                        <span className={prod.stock <= prod.minimum_stock ? 'text-error font-bold' : 'text-secondary font-bold'}>
                          {prod.stock} In Stock
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="font-currency-numeral text-currency-numeral text-on-surface">
                      ₹{prod.selling_price.toLocaleString('en-IN')}
                    </div>
                    <span className="font-label-sm text-label-sm text-on-surface-variant">
                      per {prod.unit}
                    </span>
                  </div>
                </div>

                {/* Price History Pill */}
                <div className="flex items-center gap-2 rounded-xl bg-surface-container-low px-3 py-2 text-on-surface">
                  <span className="material-symbols-outlined text-[18px] text-secondary shrink-0">
                    trending_up
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-label-md text-label-md truncate">
                      Current rate <strong className="text-on-surface">₹{prod.selling_price.toLocaleString('en-IN')}</strong>
                      {prod.last_billed_date && ` • Last billed on ${prod.last_billed_date}`}
                    </p>
                  </div>
                </div>

                {/* Learned Shorthand / Aliases Tag Strip */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-label-sm text-label-sm text-on-surface-variant flex items-center gap-1 font-bold">
                      <span className="material-symbols-outlined text-[14px]">psychology</span>
                      LEARNED OCR ALIASES ({prod.aliases?.length || 0})
                    </span>
                    <button
                      onClick={() => onTeachAlias(prod)}
                      className="font-label-sm text-label-sm text-secondary hover:underline font-bold"
                      type="button"
                    >
                      + Teach Alias
                    </button>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {prod.aliases && prod.aliases.length > 0 ? (
                      prod.aliases.map((al) => (
                        <span
                          key={al.id}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface-container font-label-md text-label-md text-on-surface shadow-xs"
                        >
                          <span>{al.alias}</span>
                          <button
                            onClick={() => onDeleteAlias(prod.id, al.id)}
                            className="material-symbols-outlined text-[12px] text-on-surface-variant hover:text-error"
                            type="button"
                            aria-label="Remove alias"
                          >
                            close
                          </button>
                        </span>
                      ))
                    ) : (
                      <span className="font-label-sm text-on-surface-variant italic">
                        No aliases yet. Tap "+ Teach Alias" or scan a bill to auto-learn.
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Action Footer */}
                <div className="flex items-center justify-between pt-1 gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onEditProduct(prod)}
                      className="h-10 px-3.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-label-md flex items-center gap-1.5 shadow-sm active:scale-95 transition-transform font-semibold"
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[16px]">edit</span>
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => onViewPriceLog(prod)}
                      className="h-10 px-3.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-label-md flex items-center gap-1.5 shadow-sm active:scale-95 transition-transform font-semibold"
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[16px]">history</span>
                      <span>Price Log</span>
                    </button>
                  </div>
                  <button
                    onClick={() => onAddToBill(prod)}
                    className="h-10 px-4 rounded-xl bg-primary text-on-primary font-label-md text-label-md flex items-center gap-1.5 shadow-sm active:scale-95 transition-transform font-bold"
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[18px]">add_shopping_cart</span>
                    <span>+ Add to Bill</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        /* Empty State */
        <div className="rounded-2xl bg-surface-container-low p-8 text-center flex flex-col items-center justify-center gap-3 py-12 border border-surface-container">
          <div className="w-16 h-16 rounded-2xl bg-surface-container flex items-center justify-center text-secondary">
            <span className="material-symbols-outlined text-[36px]">inventory_2</span>
          </div>
          <h3 className="font-headline-md text-headline-md text-on-surface">No products yet</h3>
          <p className="font-body-md text-on-surface-variant max-w-md">
            Scan an old bill to start building your catalogue automatically with AI, or add your first product manually.
          </p>
          <div className="flex items-center gap-3 mt-4">
            <button
              onClick={onAddProductClick}
              className="h-12 px-5 rounded-xl bg-primary text-on-primary font-label-lg font-bold flex items-center gap-2 shadow-md active:scale-95 transition-all"
              type="button"
            >
              <span className="material-symbols-outlined text-[20px]">add</span>
              <span>+ Add Product Manually</span>
            </button>
            <button
              onClick={onScanClick}
              className="h-12 px-5 rounded-xl bg-secondary text-on-secondary font-label-lg font-bold flex items-center gap-2 shadow-md active:scale-95 transition-all"
              type="button"
            >
              <span className="material-symbols-outlined text-[20px]">photo_camera</span>
              <span>Scan Bill & Learn</span>
            </button>
          </div>
        </div>
      )}

      {/* Manual Add Sticky/Floating Prompt */}
      {products.length > 0 && (
        <div className="pt-2 pb-6">
          <button
            onClick={onAddProductClick}
            className="w-full h-12 rounded-xl bg-primary hover:bg-on-primary-fixed-variant text-on-primary font-body-bold text-body-bold flex items-center justify-center gap-2 shadow-md active:scale-[0.99] transition-all"
            type="button"
          >
            <span className="material-symbols-outlined text-[22px]">add_box</span>
            <span>+ Add Product Manually</span>
          </button>
          <p className="font-label-sm text-label-sm text-center text-on-surface-variant mt-2">
            Tip: Or simply snap a wholesale invoice via{' '}
            <button onClick={onScanClick} className="text-secondary font-bold hover:underline" type="button">
              "Scan"
            </button>{' '}
            to auto-import products with AI.
          </p>
        </div>
      )}
    </div>
  );
};
