import { BillItem } from '../../types';

export interface CalculationResult {
  taxableSubtotal: number;
  discountAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalGst: number;
  rawTotal: number;
  roundOff: number;
  grandTotal: number;
  items: BillItem[];
  amountInWordsEn: string;
  amountInWordsMr: string;
}

/**
 * Deterministic financial calculator for GST billing with high precision.
 * Prevents floating-point precision issues by rounding cents accurately.
 */
export function round2(num: number): number {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

export function calculateBillTotals(
  items: Array<Omit<BillItem, 'total'> & { total?: number }>,
  discountPercent = 0,
  isInterState = false
): CalculationResult {
  let taxableSubtotal = 0;
  let totalCgst = 0;
  let totalSgst = 0;
  let totalIgst = 0;

  const calculatedItems: BillItem[] = items.map((item, idx) => {
    const qty = Number(item.quantity) || 0;
    const rate = Number(item.unit_price) || 0;
    const gstRate = Number(item.gst_percent) || 0;

    const baseLine = round2(qty * rate);
    taxableSubtotal += baseLine;

    const gstAmount = round2((baseLine * gstRate) / 100);

    let cgstAmount = 0;
    let sgstAmount = 0;

    if (isInterState) {
      totalIgst += gstAmount;
    } else {
      cgstAmount = round2(gstAmount / 2);
      sgstAmount = round2(gstAmount - cgstAmount); // balance to prevent odd rounding
      totalCgst += cgstAmount;
      totalSgst += sgstAmount;
    }

    const itemTotal = round2(baseLine + gstAmount);

    return {
      ...item,
      id: item.id || `item-${Date.now()}-${idx}`,
      quantity: qty,
      unit_price: rate,
      gst_percent: gstRate,
      cgst_amount: cgstAmount,
      sgst_amount: sgstAmount,
      total: itemTotal,
      confidence: item.confidence || 'looks_correct',
    };
  });

  taxableSubtotal = round2(taxableSubtotal);
  const discountAmount = round2((taxableSubtotal * (Number(discountPercent) || 0)) / 100);
  const adjustedTaxable = Math.max(0, round2(taxableSubtotal - discountAmount));

  // If discount applied, proportionately calculate GST
  const discountRatio = taxableSubtotal > 0 ? adjustedTaxable / taxableSubtotal : 1;
  const finalCgst = round2(totalCgst * discountRatio);
  const finalSgst = round2(totalSgst * discountRatio);
  const finalIgst = round2(totalIgst * discountRatio);
  const totalGst = round2(finalCgst + finalSgst + finalIgst);

  const rawTotal = round2(adjustedTaxable + totalGst);
  const roundedGrandTotal = Math.round(rawTotal);
  const roundOff = round2(roundedGrandTotal - rawTotal);

  return {
    taxableSubtotal,
    discountAmount,
    cgst: finalCgst,
    sgst: finalSgst,
    igst: finalIgst,
    totalGst,
    rawTotal,
    roundOff,
    grandTotal: roundedGrandTotal,
    items: calculatedItems,
    amountInWordsEn: numberToWordsEnglish(roundedGrandTotal),
    amountInWordsMr: numberToWordsMarathi(roundedGrandTotal),
  };
}

/**
 * Convert number to English currency words (Indian numbering system)
 */
export function numberToWordsEnglish(num: number): string {
  if (num === 0) return 'Zero Rupees Only';

  const units = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convertBelowHundred(n: number): string {
    if (n < 20) return units[n];
    return `${tens[Math.floor(n / 10)]} ${units[n % 10]}`.trim();
  }

  function convertBelowThousand(n: number): string {
    if (n >= 100) {
      return `${units[Math.floor(n / 100)]} Hundred ${convertBelowHundred(n % 100)}`.trim();
    }
    return convertBelowHundred(n);
  }

  let words = '';
  const crore = Math.floor(num / 10000000);
  let remainder = num % 10000000;

  const lakh = Math.floor(remainder / 100000);
  remainder = remainder % 100000;

  const thousand = Math.floor(remainder / 1000);
  remainder = remainder % 1000;

  if (crore > 0) words += `${convertBelowHundred(crore)} Crore `;
  if (lakh > 0) words += `${convertBelowHundred(lakh)} Lakh `;
  if (thousand > 0) words += `${convertBelowHundred(thousand)} Thousand `;
  if (remainder > 0) words += `${convertBelowThousand(remainder)} `;

  return `${words.trim()} Rupees Only`;
}

/**
 * Convert number to Marathi currency words
 */
export function numberToWordsMarathi(num: number): string {
  if (num === 0) return 'शून्य रुपये फक्त';

  // Common spoken currency amounts in Marathi
  const unitsMr: { [key: number]: string } = {
    1: 'एक', 2: 'दोन', 3: 'तीन', 4: 'चार', 5: 'पाच', 6: 'सहा', 7: 'सात', 8: 'आठ', 9: 'नऊ', 10: 'दहा',
    11: 'अकरा', 12: 'बारा', 13: 'तेरा', 14: 'चौदा', 15: 'पंधरा', 16: 'सोळा', 17: 'सतरा', 18: 'अठरा', 19: 'एकोणीस', 20: 'वीस',
    21: 'एकवीस', 22: 'बावीस', 23: 'तेवीस', 24: 'चोवीस', 25: 'पंचवीस', 26: 'सव्वीस', 27: 'सत्तावीस', 28: 'अठ्ठावीस', 29: 'एकोणतीस', 30: 'तीस',
    31: 'एकतीस', 32: 'बत्तीस', 33: 'तेहेतीस', 34: 'चौतीस', 35: 'पस्तीस', 36: 'छत्तीस', 37: 'सदतीस', 38: 'अडतीस', 39: 'एकेचाळीस', 40: 'चाळीस',
    41: 'एक्केचाळीस', 42: 'बेचाळीस', 43: 'त्रेचाळीस', 44: 'चव्वेचाळीस', 45: 'पंचेचाळीस', 46: 'शेहेचाळीस', 47: 'सत्तेचाळीस', 48: 'अठ्ठेचाळीस', 49: 'एकोणपन्नास', 50: 'पन्नास',
    60: 'साठ', 70: 'सत्तर', 80: 'ऐंशी', 81: 'एक्याऐंशी', 90: 'नव्वद'
  };

  const hundredsMr: { [key: number]: string } = {
    1: 'एकशे', 2: 'दोनशे', 3: 'तीनशे', 4: 'चारशे', 5: 'पाचशे', 6: 'सहाशे', 7: 'सातशे', 8: 'आठशे', 9: 'नऊशे'
  };

  let str = '';
  const crore = Math.floor(num / 10000000);
  let remainder = num % 10000000;

  const lakh = Math.floor(remainder / 100000);
  remainder = remainder % 100000;

  const thousand = Math.floor(remainder / 1000);
  remainder = remainder % 1000;

  const hundred = Math.floor(remainder / 100);
  const rest = remainder % 100;

  if (crore > 0) str += `${unitsMr[crore] || crore} कोटी `;
  if (lakh > 0) str += `${unitsMr[lakh] || lakh} लाख `;
  if (thousand > 0) str += `${unitsMr[thousand] || thousand} हजार `;
  if (hundred > 0) str += `${hundredsMr[hundred] || (hundred + 'शे')} `;
  if (rest > 0) str += `${unitsMr[rest] || rest} `;

  return `${str.trim()} रुपये फक्त`;
}
