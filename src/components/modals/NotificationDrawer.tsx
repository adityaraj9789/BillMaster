import React from 'react';
import { Bill } from '../../types';

interface NotificationDrawerProps {
  pendingBills: Bill[];
  onReviewBill: (billId: string) => void;
  onClose: () => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  pendingBills,
  onReviewBill,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-4">
      <div className="bg-surface rounded-2xl w-full max-w-md p-5 shadow-2xl max-h-[80vh] flex flex-col">
        <div className="flex justify-between items-center pb-3 border-b border-surface-container">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary text-[22px]">notifications</span>
            <h2 className="font-headline-sm text-headline-sm text-on-surface">Alerts & Actions</h2>
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
          {pendingBills.length > 0 ? (
            <div className="space-y-2">
              <span className="font-label-sm text-error font-bold uppercase tracking-wider block">
                Pending Verification ({pendingBills.length})
              </span>
              {pendingBills.map((b) => (
                <div
                  key={b.id}
                  className="p-3 bg-error-container/40 rounded-xl border border-error-container flex flex-col gap-2"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-body-bold text-on-surface">#{b.invoice_number}</span>
                      <p className="font-label-md text-on-surface-variant">{b.customer_name}</p>
                    </div>
                    <span className="font-currency-numeral text-on-surface font-bold">
                      ~₹{b.grand_total.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <p className="font-label-sm text-error">
                    {b.unverified_reason || 'Handwritten Marathi cursive detected requiring price confirmation.'}
                  </p>
                  <button
                    onClick={() => {
                      onReviewBill(b.id);
                      onClose();
                    }}
                    className="h-9 px-3 bg-error text-on-error rounded-lg font-label-md font-bold self-start flex items-center gap-1 active:scale-95"
                    type="button"
                  >
                    <span>Review Bill Now</span>
                    <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-on-surface-variant">
              <span className="material-symbols-outlined text-[36px] text-secondary block mb-1">
                check_circle
              </span>
              <p className="font-body-bold text-on-surface">All bills verified</p>
              <p className="font-label-sm mt-1">No pending ambiguity or unread rates.</p>
            </div>
          )}

          <div className="pt-2 border-t border-surface-container">
            <span className="font-label-sm text-on-surface-variant font-bold uppercase tracking-wider block mb-2">
              System Sync Status
            </span>
            <div className="p-3 bg-surface-container-low rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary text-[20px]">cloud_done</span>
                <div className="flex flex-col">
                  <span className="font-body-bold text-label-md">Local Storage & Cloud Ledger</span>
                  <span className="font-label-sm text-on-surface-variant">Active & Ready</span>
                </div>
              </div>
              <span className="w-2.5 h-2.5 rounded-full bg-secondary"></span>
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full h-11 rounded-xl bg-surface-container text-on-surface font-label-md font-bold mt-2"
          type="button"
        >
          Close
        </button>
      </div>
    </div>
  );
};
