import React from 'react';
import { Product, ProductPriceHistory } from '../../types';

interface PriceLogModalProps {
  product: Product;
  priceHistory: ProductPriceHistory[];
  onClose: () => void;
}

export const PriceLogModal: React.FC<PriceLogModalProps> = ({
  product,
  priceHistory,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-4">
      <div className="bg-surface rounded-2xl w-full max-w-md p-5 shadow-2xl max-h-[80vh] flex flex-col">
        <div className="flex justify-between items-center pb-3 border-b border-surface-container">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary text-[22px]">history</span>
            <h2 className="font-headline-sm text-headline-sm text-on-surface">Price Change History</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface"
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <div className="py-3 flex-1 overflow-y-auto space-y-3">
          <div className="bg-surface-container-low p-3 rounded-xl">
            <span className="font-label-sm text-on-surface-variant block uppercase">Product:</span>
            <span className="font-body-bold text-on-surface">{product.name}</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="font-label-md text-on-surface-variant">Current Selling Price:</span>
              <span className="font-currency-numeral text-secondary font-bold">
                ₹{product.selling_price.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <span className="font-label-sm text-on-surface-variant block uppercase font-bold">
              Historical Changes Log ({priceHistory.length}):
            </span>

            {priceHistory.length > 0 ? (
              priceHistory.map((ph) => {
                const diff = ph.new_price - ph.old_price;
                return (
                  <div key={ph.id} className="p-3 bg-surface-container-lowest rounded-xl shadow-xs border border-surface-container">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="font-currency-numeral text-[16px] text-on-surface-variant line-through">
                          ₹{ph.old_price.toLocaleString('en-IN')}
                        </span>
                        <span className="material-symbols-outlined text-[16px] text-on-surface-variant">
                          arrow_forward
                        </span>
                        <span className="font-currency-numeral text-[16px] text-on-surface font-bold">
                          ₹{ph.new_price.toLocaleString('en-IN')}
                        </span>
                      </div>
                      <span className={`font-label-sm px-2 py-0.5 rounded font-bold ${diff >= 0 ? 'bg-secondary-container text-on-secondary-container' : 'bg-error-container text-on-error-container'}`}>
                        {diff >= 0 ? `+₹${diff.toLocaleString('en-IN')}` : `-₹${Math.abs(diff).toLocaleString('en-IN')}`}
                      </span>
                    </div>
                    <div className="flex justify-between items-center mt-1 text-[11px] text-on-surface-variant">
                      <span>{new Date(ph.changed_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      <span>{ph.note || 'Catalog price update'}</span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-6 text-on-surface-variant text-label-md">
                <span className="material-symbols-outlined text-[32px] block mb-1 opacity-50">sell</span>
                Initial catalog price maintained. No historical changes recorded.
              </div>
            )}
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full h-11 rounded-xl bg-surface-container text-on-surface font-label-md font-bold mt-2"
          type="button"
        >
          Close Log
        </button>
      </div>
    </div>
  );
};
