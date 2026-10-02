import jsPDF from 'jspdf';
import { Bill, BusinessProfile } from '../../types';
import { numberToWordsEnglish, numberToWordsMarathi } from '../billing/calculator';

/**
 * Generate a professional GST Tax Invoice PDF adhering to Indian GST standards.
 */
export function generateInvoicePDF(bill: Bill, business: BusinessProfile, format: 'A4' | 'A5' = 'A4'): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: format === 'A5' ? 'a5' : 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 12;
  const contentWidth = pageWidth - margin * 2;

  let y = margin;

  // Header Title & Tax Invoice Badge
  doc.setFillColor(19, 27, 46); // Primary Navy #131b2e
  doc.rect(margin, y, contentWidth, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('TAX INVOICE / GST पावती', margin + 4, y + 5.5);
  doc.setFontSize(8);
  doc.text('ORIGINAL FOR RECIPIENT', pageWidth - margin - 4, y + 5.5, { align: 'right' });

  y += 12;

  // Shop Details
  doc.setTextColor(11, 28, 48);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(business.shop_name, margin, y);

  y += 5;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(69, 70, 77);
  doc.text(business.address, margin, y);

  y += 4;
  doc.text(`Phone: ${business.phone}  |  Email: ${business.email || 'contact@shreesamarth.in'}`, margin, y);

  y += 4;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(11, 28, 48);
  doc.text(`GSTIN: ${business.gstin || '27AAAAA0000A1Z5'}  |  State: ${business.state_name} (Code: ${business.state_code})`, margin, y);

  // QR Box placeholder on top right
  const qrSize = 22;
  const qrX = pageWidth - margin - qrSize;
  const qrY = y - 16;
  doc.setDrawColor(198, 198, 205);
  doc.rect(qrX, qrY, qrSize, qrSize);
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text('UPI PAY QR', qrX + qrSize / 2, qrY + 11, { align: 'center' });
  doc.text(business.upi_id || 'samarth@upi', qrX + qrSize / 2, qrY + 16, { align: 'center' });

  y += 8;
  doc.setDrawColor(211, 228, 254);
  doc.line(margin, y, pageWidth - margin, y);

  y += 5;

  // Invoice & Customer Information 2-Column Grid
  const colW = contentWidth / 2;

  // Left: Customer (Billed To)
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 100, 100);
  doc.text('BILLED TO (CUSTOMER):', margin, y);

  doc.setFontSize(9.5);
  doc.setTextColor(11, 28, 48);
  doc.text(bill.customer_name || 'Counter Cash Sale', margin, y + 4.5);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(69, 70, 77);
  doc.text(bill.customer_address || 'Walk-in Retail', margin, y + 8.5);
  doc.text(`Phone: ${bill.customer_phone || 'N/A'}`, margin, y + 12.5);
  if (bill.customer_gstin) {
    doc.setFont('helvetica', 'bold');
    doc.text(`GSTIN: ${bill.customer_gstin}`, margin, y + 16.5);
  }

  // Right: Invoice Meta
  const rightX = margin + colW + 4;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 100, 100);
  doc.text('INVOICE DETAILS:', rightX, y);

  doc.setFontSize(9);
  doc.setTextColor(11, 28, 48);
  doc.text(`Invoice No: ${bill.invoice_number}`, rightX, y + 4.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`Invoice Date: ${bill.bill_date} ${bill.time_str || ''}`, rightX, y + 8.5);
  doc.text(`Payment Mode: ${bill.payment_mode.toUpperCase()}`, rightX, y + 12.5);
  doc.text(`Place of Supply: ${business.state_code} - ${business.state_name}`, rightX, y + 16.5);

  y += 22;

  // Items Table Header
  doc.setFillColor(229, 238, 255); // surface-container #e5eeff
  doc.rect(margin, y, contentWidth, 7, 'F');
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(19, 27, 46);

  const colX = {
    sr: margin + 2,
    desc: margin + 10,
    hsn: margin + 74,
    qty: margin + 98,
    rate: margin + 118,
    gst: margin + 142,
    amount: pageWidth - margin - 2
  };

  doc.text('#', colX.sr, y + 4.8);
  doc.text('Description of Goods / Services', colX.desc, y + 4.8);
  doc.text('HSN', colX.hsn, y + 4.8);
  doc.text('Qty', colX.qty, y + 4.8, { align: 'right' });
  doc.text('Rate', colX.rate, y + 4.8, { align: 'right' });
  doc.text('GST %', colX.gst, y + 4.8, { align: 'right' });
  doc.text('Total (INR)', colX.amount, y + 4.8, { align: 'right' });

  y += 8;

  // Line items
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);

  bill.items.forEach((item, index) => {
    doc.setTextColor(11, 28, 48);
    doc.text(String(index + 1), colX.sr, y + 4);

    const desc = item.product_name_snapshot;
    const truncatedDesc = desc.length > 38 ? desc.substring(0, 36) + '...' : desc;
    doc.text(truncatedDesc, colX.desc, y + 4);

    doc.setTextColor(69, 70, 77);
    doc.text(item.hsn_snapshot || '8413', colX.hsn, y + 4);
    doc.text(`${item.quantity} ${item.unit || 'Nos'}`, colX.qty, y + 4, { align: 'right' });
    doc.text(`₹${item.unit_price.toLocaleString('en-IN')}`, colX.rate, y + 4, { align: 'right' });
    doc.text(`${item.gst_percent}%`, colX.gst, y + 4, { align: 'right' });
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(11, 28, 48);
    doc.text(`₹${item.total.toLocaleString('en-IN')}`, colX.amount, y + 4, { align: 'right' });
    doc.setFont('helvetica', 'normal');

    y += 6.5;
  });

  y += 2;
  doc.setDrawColor(211, 228, 254);
  doc.line(margin, y, pageWidth - margin, y);

  y += 4;

  // Totals Breakdown
  const totalBoxW = 75;
  const totalBoxX = pageWidth - margin - totalBoxW;

  doc.setFontSize(8.5);
  doc.setTextColor(69, 70, 77);
  doc.text('Taxable Subtotal:', totalBoxX, y);
  doc.text(`₹${bill.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, pageWidth - margin, y, { align: 'right' });

  y += 4.5;
  doc.text('CGST (Central Tax):', totalBoxX, y);
  doc.text(`₹${(bill.cgst || bill.gst / 2).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, pageWidth - margin, y, { align: 'right' });

  y += 4.5;
  doc.text('SGST (State Tax):', totalBoxX, y);
  doc.text(`₹${(bill.sgst || bill.gst / 2).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, pageWidth - margin, y, { align: 'right' });

  if (bill.round_off !== 0) {
    y += 4.5;
    doc.text('Round Off:', totalBoxX, y);
    doc.text(`₹${bill.round_off.toFixed(2)}`, pageWidth - margin, y, { align: 'right' });
  }

  y += 6;
  doc.setFillColor(0, 108, 74); // secondary emerald #006c4a
  doc.rect(totalBoxX - 2, y - 4.5, totalBoxW + 2, 7.5, 'F');
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('Grand Total:', totalBoxX, y);
  doc.text(`₹${bill.grand_total.toLocaleString('en-IN')}`, pageWidth - margin - 2, y, { align: 'right' });

  // Amount In Words (Left side of totals)
  const wordsY = y - 18;
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(19, 27, 46);
  doc.text('Amount in Words:', margin, wordsY);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(69, 70, 77);
  const wordsEn = numberToWordsEnglish(bill.grand_total);
  const wordsEnLines = doc.splitTextToSize(wordsEn, colW - 5);
  doc.text(wordsEnLines, margin, wordsY + 4);

  // Terms and Signature at bottom
  const bottomY = pageHeight - margin - 20;

  doc.setDrawColor(211, 228, 254);
  doc.line(margin, bottomY, pageWidth - margin, bottomY);

  doc.setFontSize(7);
  doc.setTextColor(100, 100, 100);
  doc.setFont('helvetica', 'bold');
  doc.text('Terms & Conditions:', margin, bottomY + 4);
  doc.setFont('helvetica', 'normal');
  doc.text('1. Goods once sold will not be taken back without original bill.', margin, bottomY + 7.5);
  doc.text('2. Motors and electrical parts subject to manufacturer warranty terms only.', margin, bottomY + 11);
  doc.text('3. Subject to Baramati Jurisdiction.', margin, bottomY + 14.5);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(19, 27, 46);
  doc.text(`For ${business.shop_name}`, pageWidth - margin, bottomY + 7, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.text('[ Digitally Signed / Verified ]', pageWidth - margin, bottomY + 12, { align: 'right' });
  doc.text('Authorized Signatory', pageWidth - margin, bottomY + 15.5, { align: 'right' });

  return doc;
}

export function downloadInvoicePDF(bill: Bill, business: BusinessProfile, format: 'A4' | 'A5' = 'A4'): void {
  const doc = generateInvoicePDF(bill, business, format);
  const filename = `${bill.invoice_number}_${(bill.customer_name || 'Bill').replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
  doc.save(filename);
}

export function printInvoiceDocument(): void {
  window.print();
}
