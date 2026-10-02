import { useState, useEffect } from 'react';
import { db } from './services/db/repository';
import { Bill, BusinessProfile, Customer, Product } from './types';
import { Header } from './components/Header';
import { BottomNav, NavTab } from './components/BottomNav';
import { DashboardPage } from './components/DashboardPage';
import { ScanBillPage } from './components/ScanBillPage';
import { ReviewPendingBillsPage } from './components/ReviewPendingBillsPage';
import { ProductsCataloguePage } from './components/ProductsCataloguePage';
import { NewBillPage } from './components/NewBillPage';
import { BillsRecordsPage } from './components/BillsRecordsPage';
import { AddProductModal } from './components/modals/AddProductModal';
import { TeachAliasModal } from './components/modals/TeachAliasModal';
import { PriceLogModal } from './components/modals/PriceLogModal';
import { ChangePartyModal } from './components/modals/ChangePartyModal';
import { SettingsModal } from './components/modals/SettingsModal';
import { NotificationDrawer } from './components/modals/NotificationDrawer';
import { downloadInvoicePDF, printInvoiceDocument } from './services/pdf/invoice-generator';
import { shareInvoice } from './services/capacitor/platform';

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab | 'review-pending-bills'>('dashboard');
  const [business, setBusiness] = useState<BusinessProfile>(db.getBusiness());
  const [products, setProducts] = useState<Product[]>(db.getProducts());
  const [customers, setCustomers] = useState<Customer[]>(db.getCustomers());
  const [bills, setBills] = useState<Bill[]>(db.getBills());
  const [language, setLanguage] = useState<'en' | 'mr' | 'mixed'>(business.language || 'mixed');

  // Currently reviewed or edited bill
  const [selectedBillForReview, setSelectedBillForReview] = useState<Bill | null>(null);
  const [selectedProductForEdit, setSelectedProductForEdit] = useState<Product | null>(null);
  const [selectedProductForAlias, setSelectedProductForAlias] = useState<Product | null>(null);
  const [selectedProductForPriceLog, setSelectedProductForPriceLog] = useState<Product | null>(null);
  const [selectedCustomerForBill, setSelectedCustomerForBill] = useState<Customer | undefined>(undefined);

  // Modals
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [showChangePartyModal, setShowChangePartyModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showNotificationDrawer, setShowNotificationDrawer] = useState(false);

  // Sync state on db changes
  useEffect(() => {
    const unsubscribe = db.subscribe(() => {
      setBusiness(db.getBusiness());
      setProducts(db.getProducts());
      setCustomers(db.getCustomers());
      setBills(db.getBills());
    });
    return unsubscribe;
  }, []);

  const metrics = db.getDashboardMetrics();
  const fastMovingProducts = products.slice(0, 4);

  // Handlers
  const handleToggleLanguage = () => {
    const nextLang = language === 'mixed' ? 'mr' : language === 'mr' ? 'en' : 'mixed';
    setLanguage(nextLang);
    db.updateBusiness({ language: nextLang });
  };

  const handleScanComplete = (scannedBill: Partial<Bill>, _imagePreview?: string) => {
    // Temporary in-memory bill for verification only. NOT saved to database until user confirms!
    const tempBill: Bill = {
      id: `temp-scan-${Date.now()}`,
      invoice_number: scannedBill.invoice_number || db.getNextInvoiceNumber(),
      customer_name: scannedBill.customer_name || 'Counter Cash Sale (किरकोळ ग्राहक)',
      customer_phone: scannedBill.customer_phone || '',
      customer_address: scannedBill.customer_address || '',
      customer_gstin: scannedBill.customer_gstin || '',
      bill_date: scannedBill.bill_date || new Date().toISOString().split('T')[0],
      subtotal: scannedBill.subtotal || 0,
      discount: 0,
      cgst: scannedBill.cgst || 0,
      sgst: scannedBill.sgst || 0,
      igst: 0,
      gst: scannedBill.gst || 0,
      round_off: 0,
      grand_total: scannedBill.grand_total || 0,
      payment_mode: scannedBill.payment_mode || 'cash',
      status: scannedBill.status || 'needs_review',
      source: 'scan',
      scan_file_url: scannedBill.scan_file_url,
      unverified_reason: scannedBill.unverified_reason,
      items: scannedBill.items || [],
    };

    setSelectedBillForReview(tempBill);
    setActiveTab('review-pending-bills');
  };

  const handleSaveConfirmedBill = (confirmedBill: Bill) => {
    const saved = db.saveBill(confirmedBill);

    // If any items had shorthand mappings, learn them!
    confirmedBill.items.forEach((item) => {
      if (item.original_text && item.product_id) {
        db.learnShorthand(item.original_text, item.product_id);
      }
    });

    setSelectedBillForReview(null);
    setActiveTab('bills-records');
  };

  const handleQuickAddItemToNewBill = (product: Product) => {
    // Navigate to new bill and select this product
    setActiveTab('new-bill');
  };

  const handleDuplicateBill = (billId: string) => {
    const duplicated = db.duplicateBill(billId);
    if (duplicated) {
      setActiveTab('bills-records');
    }
  };

  const handleShareBill = async (bill: Bill) => {
    const summary = `*${business.shop_name}*\n` +
      `Invoice No: #${bill.invoice_number}\n` +
      `Date: ${bill.bill_date}\n` +
      `Customer: ${bill.customer_name}\n` +
      `Amount: ₹${bill.grand_total.toLocaleString('en-IN')}\n` +
      `Status: ${bill.status === 'verified' ? 'Verified' : 'Under Review'}`;
    await shareInvoice(bill.invoice_number, bill.customer_phone || '', summary);
  };

  const handlePrintBill = (_bill: Bill) => {
    printInvoiceDocument();
  };

  const handleExportTally = () => {
    // Generate CSV for Tally / Excel export
    const headers = ['Invoice No', 'Date', 'Customer Name', 'Phone', 'Payment Mode', 'Subtotal', 'GST', 'Grand Total', 'Status'];
    const rows = bills.map((b) => [
      b.invoice_number,
      b.bill_date,
      `"${b.customer_name.replace(/"/g, '""')}"`,
      b.customer_phone || '',
      b.payment_mode,
      b.subtotal,
      b.gst,
      b.grand_total,
      b.status,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `BillMaster_Tally_Ledger_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-surface text-on-surface flex flex-col min-h-screen selection:bg-secondary-container selection:text-on-secondary-container">
      {/* Top Universal App Header (except when in detailed bill review) */}
      {activeTab !== 'review-pending-bills' && (
        <Header
          business={business}
          language={language}
          onToggleLanguage={handleToggleLanguage}
          unreadCount={metrics.billsNeedingReviewCount}
          onOpenNotifications={() => setShowNotificationDrawer(true)}
          onOpenSettings={() => setShowSettingsModal(true)}
        />
      )}

      {/* Main Content Area */}
      <main
        className={`flex flex-col relative w-full px-margin bg-surface flex-1 ${
          activeTab !== 'review-pending-bills' ? 'pt-24 pb-28' : 'pt-4 pb-24'
        }`}
      >
        {activeTab === 'dashboard' && (
          <DashboardPage
            business={business}
            metrics={metrics}
            recentBills={bills}
            fastMovingProducts={fastMovingProducts}
            onScanClick={() => setActiveTab('scan-bill')}
            onNewBillClick={() => setActiveTab('new-bill')}
            onViewAllRecords={() => setActiveTab('bills-records')}
            onReviewPendingClick={(billId) => {
              const target = billId ? db.getBillById(billId) : metrics.billsNeedingReview[0];
              if (target) {
                setSelectedBillForReview(target);
                setActiveTab('review-pending-bills');
              }
            }}
            onQuickAddItem={handleQuickAddItemToNewBill}
            onAddProductClick={() => {
              setSelectedProductForEdit(null);
              setShowAddProductModal(true);
            }}
            onShareBill={handleShareBill}
            onPrintBill={handlePrintBill}
            onViewBillDetails={(b) => {
              downloadInvoicePDF(b, business, business.paper_size === 'A5' ? 'A5' : 'A4');
            }}
            language={language}
          />
        )}

        {activeTab === 'scan-bill' && (
          <ScanBillPage
            onScanComplete={handleScanComplete}
            onManualTypeClick={() => setActiveTab('new-bill')}
          />
        )}

        {activeTab === 'review-pending-bills' && selectedBillForReview && (
          <ReviewPendingBillsPage
            bill={selectedBillForReview}
            allProducts={products}
            onBack={() => setActiveTab('dashboard')}
            onSaveConfirmedBill={handleSaveConfirmedBill}
            onDiscard={() => {
              setSelectedBillForReview(null);
              setActiveTab('dashboard');
            }}
            onAddProductToCatalogue={(prod) => {
              db.addProduct(prod);
              setProducts(db.getProducts());
            }}
          />
        )}

        {activeTab === 'products-catalogue' && (
          <ProductsCataloguePage
            products={products}
            onAddProductClick={() => {
              setSelectedProductForEdit(null);
              setShowAddProductModal(true);
            }}
            onEditProduct={(p) => {
              setSelectedProductForEdit(p);
              setShowAddProductModal(true);
            }}
            onViewPriceLog={(p) => {
              setSelectedProductForPriceLog(p);
            }}
            onTeachAlias={(p) => {
              setSelectedProductForAlias(p);
            }}
            onDeleteAlias={(prodId, aliasId) => {
              db.removeProductAlias(prodId, aliasId);
            }}
            onAddToBill={handleQuickAddItemToNewBill}
            onScanClick={() => setActiveTab('scan-bill')}
          />
        )}

        {activeTab === 'new-bill' && (
          <NewBillPage
            business={business}
            customers={customers}
            allProducts={products}
            onSaveBill={(saved) => {
              db.saveBill(saved);
              setActiveTab('bills-records');
            }}
            onChangePartyClick={() => setShowChangePartyModal(true)}
            selectedCustomer={selectedCustomerForBill}
          />
        )}

        {activeTab === 'bills-records' && (
          <BillsRecordsPage
            bills={bills}
            onReviewBill={(billId) => {
              const target = db.getBillById(billId);
              if (target) {
                setSelectedBillForReview(target);
                setActiveTab('review-pending-bills');
              }
            }}
            onDuplicateBill={handleDuplicateBill}
            onPrintBill={handlePrintBill}
            onShareBill={handleShareBill}
            onExportTally={handleExportTally}
            onViewBillDetails={(b) => {
              downloadInvoicePDF(b, business, business.paper_size === 'A5' ? 'A5' : 'A4');
            }}
            onNewBillClick={() => setActiveTab('new-bill')}
            onScanClick={() => setActiveTab('scan-bill')}
          />
        )}
      </main>

      {/* Persistent Bottom Bar Navigation */}
      {activeTab !== 'review-pending-bills' && (
        <BottomNav
          activeTab={activeTab}
          onSelectTab={(tab) => {
            setActiveTab(tab);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />
      )}

      {/* Add / Edit Product Modal */}
      {showAddProductModal && (
        <AddProductModal
          initialProduct={selectedProductForEdit}
          onSave={(prod) => {
            if (selectedProductForEdit) {
              db.updateProduct(selectedProductForEdit.id, prod);
            } else {
              db.addProduct(prod);
            }
          }}
          onClose={() => setShowAddProductModal(false)}
        />
      )}

      {/* Teach OCR Alias Modal */}
      {selectedProductForAlias && (
        <TeachAliasModal
          product={selectedProductForAlias}
          onSaveAlias={(prodId, alias, lang) => {
            db.addProductAlias(prodId, alias, lang);
            db.learnShorthand(alias, prodId);
          }}
          onClose={() => setSelectedProductForAlias(null)}
        />
      )}

      {/* Price Log History Modal */}
      {selectedProductForPriceLog && (
        <PriceLogModal
          product={selectedProductForPriceLog}
          priceHistory={db.getPriceHistory(selectedProductForPriceLog.id)}
          onClose={() => setSelectedProductForPriceLog(null)}
        />
      )}

      {/* Change Party / Customer Modal */}
      {showChangePartyModal && (
        <ChangePartyModal
          customers={customers}
          onSelectCustomer={(c) => {
            setSelectedCustomerForBill(c);
            setShowChangePartyModal(false);
          }}
          onAddCustomer={(newCust) => {
            const created = db.addCustomer(newCust);
            setSelectedCustomerForBill(created);
            setShowChangePartyModal(false);
          }}
          onClose={() => setShowChangePartyModal(false)}
        />
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <SettingsModal
          business={business}
          onSave={(updates) => {
            db.updateBusiness(updates);
            if (updates.language) setLanguage(updates.language);
          }}
          onClose={() => setShowSettingsModal(false)}
        />
      )}

      {/* Notification Drawer */}
      {showNotificationDrawer && (
        <NotificationDrawer
          pendingBills={metrics.billsNeedingReview}
          onReviewBill={(billId) => {
            setShowNotificationDrawer(false);
            const target = db.getBillById(billId);
            if (target) {
              setSelectedBillForReview(target);
              setActiveTab('review-pending-bills');
            }
          }}
          onClose={() => setShowNotificationDrawer(false)}
        />
      )}
    </div>
  );
}
