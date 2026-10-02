import React, { useState } from 'react';
import { BusinessProfile } from '../../types';

interface SettingsModalProps {
  business: BusinessProfile;
  onSave: (updates: Partial<BusinessProfile>) => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  business,
  onSave,
  onClose,
}) => {
  const [shopName, setShopName] = useState(business.shop_name);
  const [shopNameMr, setShopNameMr] = useState(business.shop_name_marathi || '');
  const [ownerName, setOwnerName] = useState(business.owner_name);
  const [address, setAddress] = useState(business.address);
  const [phone, setPhone] = useState(business.phone);
  const [email, setEmail] = useState(business.email || '');
  const [gstin, setGstin] = useState(business.gstin || '');
  const [upiId, setUpiId] = useState(business.upi_id || '');
  const [prefix, setPrefix] = useState(business.invoice_prefix || 'BM-');
  const [startingNum, setStartingNum] = useState(business.starting_number?.toString() || '1001');
  const [paperSize, setPaperSize] = useState(business.paper_size || 'A4');
  const [language, setLanguage] = useState(business.language || 'mixed');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      shop_name: shopName.trim() || 'BillMaster Shop',
      shop_name_marathi: shopNameMr.trim(),
      owner_name: ownerName.trim(),
      address: address.trim(),
      phone: phone.trim(),
      email: email.trim() || undefined,
      gstin: gstin.trim() || undefined,
      upi_id: upiId.trim() || undefined,
      invoice_prefix: prefix.trim() || 'BM-',
      starting_number: parseInt(startingNum, 10) || 1001,
      paper_size: paperSize as any,
      language: language as any,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-4">
      <div className="bg-surface rounded-2xl w-full max-w-lg max-h-[90vh] p-5 shadow-2xl flex flex-col overflow-y-auto">
        <div className="flex justify-between items-center pb-3 border-b border-surface-container">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[22px]">store</span>
            <h2 className="font-headline-sm text-headline-sm text-on-surface">Shop Profile & Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface"
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 py-3">
          <div className="border-b border-surface-container pb-3">
            <span className="font-label-sm text-secondary font-bold uppercase tracking-wider block mb-2">
              Shop Information
            </span>

            <div className="space-y-3">
              <div>
                <label className="font-label-sm text-on-surface-variant block mb-1">Shop Name (English) *</label>
                <input
                  type="text"
                  required
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  className="w-full h-11 px-3 bg-surface-container rounded-xl outline-none text-body-md"
                />
              </div>

              <div>
                <label className="font-label-sm text-on-surface-variant block mb-1">दुकानाचे मराठी नाव</label>
                <input
                  type="text"
                  value={shopNameMr}
                  onChange={(e) => setShopNameMr(e.target.value)}
                  className="w-full h-11 px-3 bg-surface-container rounded-xl outline-none text-body-md"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-label-sm text-on-surface-variant block mb-1">Owner Name</label>
                  <input
                    type="text"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    placeholder="Owner / Proprietor"
                    className="w-full h-11 px-3 bg-surface-container rounded-xl outline-none text-body-md"
                  />
                </div>
                <div>
                  <label className="font-label-sm text-on-surface-variant block mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91..."
                    className="w-full h-11 px-3 bg-surface-container rounded-xl outline-none text-body-md"
                  />
                </div>
              </div>

              <div>
                <label className="font-label-sm text-on-surface-variant block mb-1">Shop Address</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full h-11 px-3 bg-surface-container rounded-xl outline-none text-body-md"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-label-sm text-on-surface-variant block mb-1">GSTIN</label>
                  <input
                    type="text"
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value.toUpperCase())}
                    className="w-full h-11 px-3 bg-surface-container rounded-xl outline-none text-body-md font-mono"
                  />
                </div>
                <div>
                  <label className="font-label-sm text-on-surface-variant block mb-1">UPI ID for QR</label>
                  <input
                    type="text"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    placeholder="shop@upi"
                    className="w-full h-11 px-3 bg-surface-container rounded-xl outline-none text-body-md font-mono"
                  />
                </div>
              </div>
            </div>
          </div>

          <div>
            <span className="font-label-sm text-secondary font-bold uppercase tracking-wider block mb-2">
              Invoice & Printing Preferences
            </span>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-label-sm text-on-surface-variant block mb-1">Invoice Prefix</label>
                <input
                  type="text"
                  value={prefix}
                  onChange={(e) => setPrefix(e.target.value)}
                  className="w-full h-11 px-3 bg-surface-container rounded-xl outline-none text-body-md font-mono font-bold"
                />
              </div>
              <div>
                <label className="font-label-sm text-on-surface-variant block mb-1">Paper Size</label>
                <select
                  value={paperSize}
                  onChange={(e) => setPaperSize(e.target.value as any)}
                  className="w-full h-11 px-3 bg-surface-container rounded-xl outline-none text-body-md font-semibold"
                >
                  <option value="A4">A4 (Standard GST Bill)</option>
                  <option value="A5">A5 (Half Page Slip)</option>
                  <option value="thermal_80">Thermal 80mm Counter</option>
                  <option value="thermal_58">Thermal 58mm Pocket</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-11 rounded-xl bg-surface-container text-on-surface font-label-md"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 h-11 rounded-xl bg-primary text-on-primary font-label-md font-bold"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
