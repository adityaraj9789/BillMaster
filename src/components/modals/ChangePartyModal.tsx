import React, { useState } from 'react';
import { Customer } from '../../types';

interface ChangePartyModalProps {
  customers: Customer[];
  onSelectCustomer: (customer: Customer) => void;
  onAddCustomer: (customer: Omit<Customer, 'id' | 'total_purchases' | 'created_at' | 'updated_at'>) => void;
  onClose: () => void;
}

export const ChangePartyModal: React.FC<ChangePartyModalProps> = ({
  customers,
  onSelectCustomer,
  onAddCustomer,
  onClose,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddingNew, setIsAddingNew] = useState(false);

  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newGstin, setNewGstin] = useState('');
  const [newType, setNewType] = useState<Customer['customer_type']>('retail');

  const filtered = customers.filter((c) => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.phone.includes(q) ||
      c.address?.toLowerCase().includes(q) ||
      c.gstin?.toLowerCase().includes(q)
    );
  });

  const handleCreateCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newPhone.trim()) return;

    onAddCustomer({
      name: newName.trim(),
      phone: newPhone.trim(),
      address: newAddress.trim() || undefined,
      gstin: newGstin.trim() || undefined,
      customer_type: newType,
    });
    setIsAddingNew(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-4">
      <div className="bg-surface rounded-2xl w-full max-w-lg max-h-[85vh] p-5 shadow-2xl flex flex-col">
        <div className="flex justify-between items-center pb-3 border-b border-surface-container">
          <h2 className="font-headline-sm text-headline-sm text-on-surface">
            {isAddingNew ? '+ New Customer (नवीन ग्राहक)' : 'Select Customer (ग्राहक निवडा)'}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface"
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {isAddingNew ? (
          <form onSubmit={handleCreateCustomer} className="py-3 space-y-3 overflow-y-auto flex-1">
            <div>
              <label className="font-label-sm text-on-surface-variant block mb-1">Customer / Shop Name *</label>
              <input
                type="text"
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Ramesh Patil / Samarth Agro"
                className="w-full h-11 px-3 bg-surface-container rounded-xl outline-none text-body-md"
                autoFocus
              />
            </div>

            <div>
              <label className="font-label-sm text-on-surface-variant block mb-1">Phone Number *</label>
              <input
                type="tel"
                required
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder="+91 98220 XXXXX"
                className="w-full h-11 px-3 bg-surface-container rounded-xl outline-none text-body-md"
              />
            </div>

            <div>
              <label className="font-label-sm text-on-surface-variant block mb-1">Address / Village</label>
              <input
                type="text"
                value={newAddress}
                onChange={(e) => setNewAddress(e.target.value)}
                placeholder="e.g. Market Yard, Baramati"
                className="w-full h-11 px-3 bg-surface-container rounded-xl outline-none text-body-md"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-label-sm text-on-surface-variant block mb-1">GSTIN (Optional)</label>
                <input
                  type="text"
                  value={newGstin}
                  onChange={(e) => setNewGstin(e.target.value.toUpperCase())}
                  placeholder="27AABCS1429B1Z0"
                  className="w-full h-11 px-3 bg-surface-container rounded-xl outline-none text-body-md font-mono"
                />
              </div>
              <div>
                <label className="font-label-sm text-on-surface-variant block mb-1">Type</label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value as any)}
                  className="w-full h-11 px-3 bg-surface-container rounded-xl outline-none text-body-md"
                >
                  <option value="retail">Retail (किरकोळ)</option>
                  <option value="b2b">Regular B2B</option>
                  <option value="contractor">Contractor / Fitter</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 pt-3">
              <button
                type="button"
                onClick={() => setIsAddingNew(false)}
                className="flex-1 h-11 rounded-xl bg-surface-container text-on-surface font-label-md"
              >
                Back to List
              </button>
              <button
                type="submit"
                className="flex-1 h-11 rounded-xl bg-primary text-on-primary font-label-md font-bold"
              >
                Save Customer
              </button>
            </div>
          </form>
        ) : (
          <div className="py-3 flex flex-col flex-1 overflow-hidden space-y-3">
            <div className="flex items-center gap-2">
              <input
                type="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by customer name, phone, or village..."
                className="flex-1 h-11 px-3 bg-surface-container rounded-xl outline-none text-body-md"
                autoFocus
              />
              <button
                onClick={() => setIsAddingNew(true)}
                className="h-11 px-3 rounded-xl bg-primary text-on-primary font-label-sm font-bold flex items-center gap-1 shrink-0"
                type="button"
              >
                <span className="material-symbols-outlined text-[16px]">add</span>
                <span>+ New</span>
              </button>
            </div>

            <div className="overflow-y-auto space-y-2 flex-1">
              {filtered.map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    onSelectCustomer(c);
                    onClose();
                  }}
                  className="w-full text-left p-3 rounded-xl bg-surface-container-low hover:bg-surface-container flex items-center justify-between transition-colors"
                  type="button"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center font-bold text-label-md shrink-0">
                      {c.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="font-body-bold text-on-surface truncate">{c.name}</span>
                      <span className="font-label-sm text-on-surface-variant truncate">
                        {c.phone} {c.address ? `• ${c.address}` : ''}
                      </span>
                    </div>
                  </div>
                  {c.customer_type === 'b2b' && (
                    <span className="px-2 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed text-[10px] font-bold shrink-0">
                      B2B
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
