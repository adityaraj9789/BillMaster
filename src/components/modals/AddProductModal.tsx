import React, { useState } from 'react';
import { Product } from '../../types';

interface AddProductModalProps {
  initialProduct?: Product | null;
  onSave: (product: Omit<Product, 'id' | 'created_at' | 'updated_at'>) => void;
  onClose: () => void;
}

export const AddProductModal: React.FC<AddProductModalProps> = ({
  initialProduct,
  onSave,
  onClose,
}) => {
  const [name, setName] = useState(initialProduct?.name || '');
  const [nameMarathi, setNameMarathi] = useState(initialProduct?.name_marathi || '');
  const [brand, setBrand] = useState(initialProduct?.brand || '');
  const [category, setCategory] = useState(initialProduct?.category || 'Motors & Pumps');
  const [sku, setSku] = useState(initialProduct?.sku || `SKU-${Date.now().toString().slice(-6)}`);
  const [hsn, setHsn] = useState(initialProduct?.hsn_code || '841370');
  const [unit, setUnit] = useState(initialProduct?.unit || 'Nos');
  const [sellingPrice, setSellingPrice] = useState(initialProduct?.selling_price?.toString() || '0');
  const [gstPercent, setGstPercent] = useState(initialProduct?.gst_percent?.toString() || '18');
  const [stock, setStock] = useState(initialProduct?.stock?.toString() || '10');
  const [description, setDescription] = useState(initialProduct?.description || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSave({
      name: name.trim(),
      name_marathi: nameMarathi.trim() || undefined,
      brand: brand.trim() || undefined,
      category,
      sku: sku.trim(),
      hsn_code: hsn.trim() || undefined,
      unit,
      selling_price: parseFloat(sellingPrice) || 0,
      gst_percent: parseFloat(gstPercent) || 18,
      stock: parseInt(stock, 10) || 0,
      minimum_stock: 5,
      description: description.trim() || undefined,
      aliases: initialProduct?.aliases || [],
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-4">
      <div className="bg-surface rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col p-5 shadow-2xl overflow-y-auto">
        <div className="flex justify-between items-center pb-3 border-b border-surface-container">
          <h2 className="font-headline-sm text-headline-sm text-on-surface">
            {initialProduct ? 'Edit Product' : '+ Add Product to Catalogue'}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface hover:bg-surface-container-high"
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div>
            <label className="font-label-sm text-on-surface-variant block mb-1">
              Product Title (English) *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Shivam 5HP Submersible Motor"
              className="w-full h-11 px-3 bg-surface-container rounded-xl outline-none text-body-md"
            />
          </div>

          <div>
            <label className="font-label-sm text-on-surface-variant block mb-1">
              मराठी नाव (Marathi Script Title)
            </label>
            <input
              type="text"
              value={nameMarathi}
              onChange={(e) => setNameMarathi(e.target.value)}
              placeholder="उदा. शिवम ५ HP सबमर्सिबल मोटर"
              className="w-full h-11 px-3 bg-surface-container rounded-xl outline-none text-body-md"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-label-sm text-on-surface-variant block mb-1">Brand</label>
              <input
                type="text"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="Shivam / Kirloskar"
                className="w-full h-11 px-3 bg-surface-container rounded-xl outline-none text-body-md"
              />
            </div>
            <div>
              <label className="font-label-sm text-on-surface-variant block mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full h-11 px-3 bg-surface-container rounded-xl outline-none text-body-md"
              >
                <option value="Motors & Pumps">Motors & Pumps</option>
                <option value="Cables & Wire">Cables & Wire</option>
                <option value="Pipes & Fittings">Pipes & Fittings</option>
                <option value="Electricals">Electricals</option>
                <option value="General Hardware">General Hardware</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="font-label-sm text-on-surface-variant block mb-1">Selling Rate (₹) *</label>
              <input
                type="number"
                required
                value={sellingPrice}
                onChange={(e) => setSellingPrice(e.target.value)}
                className="w-full h-11 px-3 bg-surface-container rounded-xl outline-none text-body-md"
              />
            </div>
            <div>
              <label className="font-label-sm text-on-surface-variant block mb-1">GST %</label>
              <select
                value={gstPercent}
                onChange={(e) => setGstPercent(e.target.value)}
                className="w-full h-11 px-3 bg-surface-container rounded-xl outline-none text-body-md"
              >
                <option value="0">0%</option>
                <option value="5">5%</option>
                <option value="12">12%</option>
                <option value="18">18%</option>
                <option value="28">28%</option>
              </select>
            </div>
            <div>
              <label className="font-label-sm text-on-surface-variant block mb-1">Unit</label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full h-11 px-3 bg-surface-container rounded-xl outline-none text-body-md"
              >
                <option value="Nos">Nos</option>
                <option value="Pcs">Pcs</option>
                <option value="m">m (meter)</option>
                <option value="Rl">Rl (roll)</option>
                <option value="Bundle">Bundle</option>
                <option value="kg">kg</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-label-sm text-on-surface-variant block mb-1">SKU Code</label>
              <input
                type="text"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                className="w-full h-11 px-3 bg-surface-container rounded-xl outline-none text-body-md"
              />
            </div>
            <div>
              <label className="font-label-sm text-on-surface-variant block mb-1">Initial Stock</label>
              <input
                type="number"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                className="w-full h-11 px-3 bg-surface-container rounded-xl outline-none text-body-md"
              />
            </div>
          </div>

          <div>
            <label className="font-label-sm text-on-surface-variant block mb-1">Specifications / Notes</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. 1 Year Coil Warranty, ISI Pure Copper"
              className="w-full h-11 px-3 bg-surface-container rounded-xl outline-none text-body-md"
            />
          </div>

          <div className="pt-3 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-12 rounded-xl bg-surface-container text-on-surface font-label-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 h-12 rounded-xl bg-primary text-on-primary font-label-lg font-bold"
            >
              {initialProduct ? 'Update Product' : 'Save to Master'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
