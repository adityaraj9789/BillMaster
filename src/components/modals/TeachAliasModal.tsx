import React, { useState } from 'react';
import { Product } from '../../types';

interface TeachAliasModalProps {
  product: Product;
  onSaveAlias: (productId: string, alias: string, language: 'en' | 'mr' | 'mixed') => void;
  onClose: () => void;
}

export const TeachAliasModal: React.FC<TeachAliasModalProps> = ({
  product,
  onSaveAlias,
  onClose,
}) => {
  const [alias, setAlias] = useState('');
  const [language, setLanguage] = useState<'en' | 'mr' | 'mixed'>('mixed');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!alias.trim()) return;
    onSaveAlias(product.id, alias.trim(), language);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-4">
      <div className="bg-surface rounded-2xl w-full max-w-md p-5 shadow-2xl">
        <div className="flex justify-between items-center pb-3 border-b border-surface-container">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary text-[22px]">psychology</span>
            <h2 className="font-headline-sm text-headline-sm text-on-surface">Teach OCR Alias</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface"
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <div className="py-3">
          <div className="bg-surface-container-low p-3 rounded-xl mb-4">
            <span className="font-label-sm text-on-surface-variant block uppercase">Selected Product:</span>
            <span className="font-body-bold text-on-surface">{product.name}</span>
            <span className="font-label-sm text-secondary block mt-0.5">
              {product.sku} • ₹{product.selling_price.toLocaleString('en-IN')}
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="font-label-sm text-on-surface-variant block mb-1">
                Shorthand / Handwriting Alias (मराठी किंवा English) *
              </label>
              <input
                type="text"
                required
                value={alias}
                onChange={(e) => setAlias(e.target.value)}
                placeholder="उदा. 1hp mot, कटआउट 32A, शिवम ५"
                className="w-full h-11 px-3 bg-surface-container rounded-xl outline-none text-body-md"
                autoFocus
              />
            </div>

            <div>
              <label className="font-label-sm text-on-surface-variant block mb-1">Script / Language</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setLanguage('mixed')}
                  className={`h-9 rounded-lg font-label-md transition-all ${
                    language === 'mixed'
                      ? 'bg-primary text-on-primary font-bold'
                      : 'bg-surface-container text-on-surface-variant'
                  }`}
                >
                  Mixed (मराठी + En)
                </button>
                <button
                  type="button"
                  onClick={() => setLanguage('mr')}
                  className={`h-9 rounded-lg font-label-md transition-all ${
                    language === 'mr'
                      ? 'bg-primary text-on-primary font-bold'
                      : 'bg-surface-container text-on-surface-variant'
                  }`}
                >
                  मराठी
                </button>
                <button
                  type="button"
                  onClick={() => setLanguage('en')}
                  className={`h-9 rounded-lg font-label-md transition-all ${
                    language === 'en'
                      ? 'bg-primary text-on-primary font-bold'
                      : 'bg-surface-container text-on-surface-variant'
                  }`}
                >
                  English
                </button>
              </div>
            </div>

            <p className="font-label-sm text-on-surface-variant leading-relaxed">
              When this term is detected on future physical bills, BillMaster will instantly match it to this product.
            </p>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 h-11 rounded-xl bg-surface-container text-on-surface font-label-md"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 h-11 rounded-xl bg-secondary text-on-secondary font-label-md font-bold"
              >
                Save & Learn
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
