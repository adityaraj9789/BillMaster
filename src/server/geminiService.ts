import { GoogleGenAI, Type } from '@google/genai';
import { ExtractedBillSchema, ExtractedBill } from '../types';

let genAIInstance: GoogleGenAI | null = null;

function getGenAI(): GoogleGenAI {
  if (!genAIInstance) {
    const apiKey = process.env.GEMINI_API_KEY || '';
    genAIInstance = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return genAIInstance;
}

export async function processBillImageWithGemini(
  base64Data: string,
  mimeType = 'image/jpeg'
): Promise<ExtractedBill> {
  const ai = getGenAI();

  const prompt = `
You are the document extraction engine for BillMaster, an AI billing system used in Indian physical retail and trade hardware shops (Maharashtra).
Your job is to analyze this scanned physical bill or photo of an invoice/rough slip (कच्ची पावती / बिल).

IMPORTANT INSTRUCTIONS:
1. SCRIPT & LANGUAGE:
   - The bill may contain handwritten Marathi (देवनागरी), handwritten English, printed Marathi, printed English, or mixed.
   - Numerals may be Marathi/Devanagari (०, १, २, ३, ४, ५, ६, ७, ८, ९) or English (0-9). Convert Marathi numerals accurately to standard numbers.
   - Do NOT invent or hallucinate missing information. If brand or model is not explicitly written, leave brand as null.

2. LINE ITEMS:
   - Extract every line item:
     * original_text: The verbatim text as written on the slip (e.g. "शिवम ५ HP मोटर", "1hp mot + starter", "कटआउट 32A").
     * normalized_name: Clean, readable product title combining the description (e.g. "Shivam 5HP Submersible Motor", "1HP Motor + Starter").
     * name_marathi: Marathi text if available.
     * brand: Brand name if mentioned (e.g. "Shivam", "Finolex", "Kirloskar", "L&T", "Supreme"), else null.
     * category: "Motors & Pumps", "Cables & Wire", "Pipes & Fittings", "Electricals", or "General".
     * quantity: Numerical quantity (number).
     * unit: "Nos", "Pcs", "Rl", "m", "kg", "bundle", etc.
     * unit_price: Rate per unit (number). If rate is unclear or unreadable, set to 0.
     * gst_percent: GST % if stated, else 18.
     * confidence:
         - "looks_correct": Clear, legible, rate and quantity obvious.
         - "needs_review": Ambiguous shorthand, combined items (e.g. "1hp motor + starter"), or unclear model.
         - "uncertain": Cursive, smudged ink, or missing rate/price.
     * uncertainty_reason: Explain briefly in human-friendly terms if confidence is "needs_review" or "uncertain".
     * suggested_product_name: Suggest best standard catalog name if ambiguous.
     * suggested_rate: Recommended standard rate if rate was unreadable.

3. HEADER DATA:
   - invoice_number: Invoice or bill number if present (e.g. "1842", "INV-1042"), else null.
   - bill_date: Date in YYYY-MM-DD format if readable, else null.
   - customer:
     * name: Customer name or shop name if indicated.
     * phone: 10-digit phone number if visible.
     * address: Customer location/address.
     * gstin: 15-character GSTIN if B2B bill.

4. SAFETY:
   - Return structured JSON matching the requested schema.
   - Never invent or fabricate data.
`;

  const cleanBase64 = base64Data.replace(/^data:image\/[a-z]+;base64,/, '');

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: {
        parts: [
          {
            inlineData: {
              data: cleanBase64,
              mimeType,
            },
          },
          { text: prompt },
        ],
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            invoice_number: { type: Type.STRING },
            bill_date: { type: Type.STRING },
            customer: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                phone: { type: Type.STRING },
                address: { type: Type.STRING },
                gstin: { type: Type.STRING },
              },
            },
            items: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  original_text: { type: Type.STRING },
                  normalized_name: { type: Type.STRING },
                  name_marathi: { type: Type.STRING },
                  brand: { type: Type.STRING },
                  category: { type: Type.STRING },
                  hsn_code: { type: Type.STRING },
                  quantity: { type: Type.NUMBER },
                  unit: { type: Type.STRING },
                  unit_price: { type: Type.NUMBER },
                  gst_percent: { type: Type.NUMBER },
                  confidence: { type: Type.STRING },
                  uncertainty_reason: { type: Type.STRING },
                  suggested_product_name: { type: Type.STRING },
                  suggested_rate: { type: Type.NUMBER },
                },
                required: ['normalized_name', 'quantity', 'unit_price'],
              },
            },
            subtotal: { type: Type.NUMBER },
            discount: { type: Type.NUMBER },
            gst: { type: Type.NUMBER },
            grand_total: { type: Type.NUMBER },
            notes: { type: Type.STRING },
            uncertain_fields_count: { type: Type.INTEGER },
            detected_language: { type: Type.STRING },
          },
          required: ['items'],
        },
      },
    });

    const text = response.text || '{}';
    const parsed = JSON.parse(text);

    // Validate with Zod
    const validated = ExtractedBillSchema.parse(parsed);

    // Count uncertain fields
    const uncertainCount = validated.items.filter(
      (item) => item.confidence === 'needs_review' || item.confidence === 'uncertain'
    ).length;

    validated.uncertain_fields_count = uncertainCount;
    return validated;
  } catch (error) {
    console.error('Gemini vision extraction failed:', error);
    throw error;
  }
}
