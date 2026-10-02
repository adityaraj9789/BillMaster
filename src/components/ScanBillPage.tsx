import React, { useState, useRef } from 'react';
import { Bill } from '../types';

interface ScanBillPageProps {
  onScanComplete: (scannedBill: Partial<Bill>, imagePreview?: string) => void;
  onManualTypeClick: () => void;
}

export const ScanBillPage: React.FC<ScanBillPageProps> = ({
  onScanComplete,
  onManualTypeClick,
}) => {
  const [mode, setMode] = useState<'single' | 'batch'>('single');
  const [torchOn, setTorchOn] = useState(false);
  const [gridOn, setGridOn] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pipelineStep, setPipelineStep] = useState(0); // 0 = idle, 1 = reading, 2 = extracting, 3 = matching, 4 = complete
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const handleCaptureClick = () => {
    setErrorMessage(null);
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleGalleryClick = () => {
    setErrorMessage(null);
    if (galleryInputRef.current) {
      galleryInputRef.current.click();
    }
  };

  const processImageFile = async (file: File) => {
    setIsProcessing(true);
    setPipelineStep(1);
    setErrorMessage(null);

    const reader = new FileReader();
    reader.onerror = () => {
      setIsProcessing(false);
      setPipelineStep(0);
      setErrorMessage('Failed to read image file. Please try again.');
    };

    reader.onload = async () => {
      const base64Data = reader.result as string;

      setPipelineStep(2);

      try {
        const response = await fetch('/api/scan-bill', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageBase64: base64Data,
            mimeType: file.type || 'image/jpeg',
          }),
        });

        setPipelineStep(3);

        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            setPipelineStep(4);
            const extracted = result.data;

            const billData: Partial<Bill> = {
              invoice_number: extracted.invoice_number || `INV-${Math.floor(1000 + Math.random() * 9000)}`,
              bill_date: extracted.bill_date || new Date().toISOString().split('T')[0],
              customer_name: extracted.customer?.name || 'Counter Customer (ग्राहक)',
              customer_phone: extracted.customer?.phone || '',
              customer_address: extracted.customer?.address || '',
              customer_gstin: extracted.customer?.gstin || '',
              status: extracted.uncertain_fields_count > 0 ? 'needs_review' : 'verified',
              source: 'scan',
              scan_file_url: base64Data,
              items: extracted.items.map((item: any, idx: number) => ({
                id: `scanned-item-${idx}`,
                original_text: item.original_text || item.normalized_name,
                product_name_snapshot: item.normalized_name,
                product_name_marathi: item.name_marathi || '',
                brand_snapshot: item.brand || '',
                quantity: item.quantity || 1,
                unit: item.unit || 'Nos',
                unit_price: item.unit_price || 0,
                gst_percent: item.gst_percent || 18,
                total: (item.quantity || 1) * (item.unit_price || 0),
                confidence: item.confidence || 'looks_correct',
                uncertainty_reason: item.uncertainty_reason || '',
                suggested_product_name: item.suggested_product_name,
                suggested_rate: item.suggested_rate,
              })),
            };

            setTimeout(() => {
              setIsProcessing(false);
              onScanComplete(billData, base64Data);
            }, 600);
            return;
          }
        }

        const errJson = await response.json().catch(() => null);
        throw new Error(errJson?.message || 'Could not extract bill content from this photo.');
      } catch (err: any) {
        setIsProcessing(false);
        setPipelineStep(0);
        setErrorMessage(
          err.message || 'Could not read text from this image. Please upload a clear photo or type manually.'
        );
      }
    };

    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processImageFile(e.target.files[0]);
    }
  };

  return (
    <div className="flex flex-col w-full gap-space-md max-w-4xl mx-auto">
      {/* Hidden file inputs for Camera and Gallery picker */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Live Detection Coach Pill */}
      <div className="w-full bg-surface-container-high rounded-xl p-space-sm flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-space-xs min-w-0">
          <span className="material-symbols-outlined text-[20px] text-secondary shrink-0">
            lightbulb
          </span>
          <p className="font-label-md text-label-md text-on-surface truncate">
            <span>हात स्थिर ठेवा</span> •{' '}
            <span className="text-on-surface-variant">Hold steady & avoid harsh shadows on bill</span>
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0 px-2.5 py-1 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-label-sm font-bold">
          <span className="w-2 h-2 rounded-full bg-secondary"></span>
          <span>Auto-Edge</span>
        </div>
      </div>

      {/* Error Message if image unreadable */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-error-container text-on-error-container flex items-start justify-between gap-3 shadow-sm">
          <div className="flex items-start gap-2 min-w-0">
            <span className="material-symbols-outlined text-[22px] text-error shrink-0">error</span>
            <div className="flex flex-col">
              <span className="font-body-bold text-body-bold">Image Recognition Alert</span>
              <p className="font-body-md text-body-md mt-0.5">{errorMessage}</p>
            </div>
          </div>
          <button
            onClick={onManualTypeClick}
            className="px-3 py-1.5 rounded-lg bg-error text-on-error font-label-sm font-bold shrink-0 active:scale-95"
            type="button"
          >
            Enter Manually
          </button>
        </div>
      )}

      {/* Camera Viewfinder Stage */}
      <div
        className="relative w-full aspect-[3/4] max-h-[460px] rounded-xl overflow-hidden bg-primary-container shadow-md flex items-center justify-center select-none"
        id="cameraViewport"
      >
        {/* Camera Texture Background */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary-container/90 via-transparent to-primary-container/95 z-10 pointer-events-none"></div>

        {/* Counter Grid overlay */}
        {gridOn && (
          <div className="absolute inset-0 z-15 pointer-events-none grid grid-cols-3 grid-rows-3 opacity-20">
            <div className="border-r border-b border-white"></div>
            <div className="border-r border-b border-white"></div>
            <div className="border-b border-white"></div>
            <div className="border-r border-b border-white"></div>
            <div className="border-r border-b border-white"></div>
            <div className="border-b border-white"></div>
            <div className="border-r border-white"></div>
            <div className="border-r border-white"></div>
            <div></div>
          </div>
        )}

        {/* Interactive targeting surface */}
        <div className="relative w-[85%] h-[85%] rounded-lg border-2 border-dashed border-white/30 flex flex-col items-center justify-center p-6 text-center z-15">
          <div className="w-16 h-16 rounded-full bg-surface/10 backdrop-blur-md flex items-center justify-center text-secondary-fixed mb-3">
            <span className="material-symbols-outlined text-[36px]">document_scanner</span>
          </div>
          <h3 className="font-headline-sm text-headline-sm text-white font-bold mb-1">
            Scan Physical Bill (पावती)
          </h3>
          <p className="font-body-md text-white/80 max-w-xs text-sm">
            Align Marathi or English bill inside this frame and tap the shutter below to capture.
          </p>
        </div>

        {/* Active High-Contrast Targeting Corners (Green Bounding Box) */}
        <div className="absolute w-[88%] h-[90%] pointer-events-none z-20 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div className="w-8 h-8 rounded-tl-lg bg-transparent flex items-start justify-start">
              <div className="w-full h-1.5 bg-secondary-fixed rounded-full shadow-[0_0_8px_rgba(133,248,196,0.9)]"></div>
              <div className="w-1.5 h-8 bg-secondary-fixed rounded-full -ml-1.5 shadow-[0_0_8px_rgba(133,248,196,0.9)]"></div>
            </div>
            <div className="w-8 h-8 rounded-tr-lg bg-transparent flex items-start justify-end">
              <div className="w-1.5 h-8 bg-secondary-fixed rounded-full -mr-1.5 shadow-[0_0_8px_rgba(133,248,196,0.9)]"></div>
              <div className="w-full h-1.5 bg-secondary-fixed rounded-full shadow-[0_0_8px_rgba(133,248,196,0.9)]"></div>
            </div>
          </div>

          {/* Horizontal AI Laser Scan Line (animates while processing) */}
          <div
            className={`w-full h-1 bg-gradient-to-r from-transparent via-secondary-fixed to-transparent shadow-[0_0_12px_#68dba9] ${
              isProcessing ? 'opacity-100 animate-pulse' : 'opacity-40'
            }`}
          ></div>

          <div className="flex justify-between items-end">
            <div className="w-8 h-8 rounded-bl-lg bg-transparent flex items-end justify-start">
              <div className="w-full h-1.5 bg-secondary-fixed rounded-full shadow-[0_0_8px_rgba(133,248,196,0.9)]"></div>
              <div className="w-1.5 h-8 bg-secondary-fixed rounded-full -ml-1.5 shadow-[0_0_8px_rgba(133,248,196,0.9)]"></div>
            </div>
            <div className="w-8 h-8 rounded-br-lg bg-transparent flex items-end justify-end">
              <div className="w-1.5 h-8 bg-secondary-fixed rounded-full -mr-1.5 shadow-[0_0_8px_rgba(133,248,196,0.9)]"></div>
              <div className="w-full h-1.5 bg-secondary-fixed rounded-full shadow-[0_0_8px_rgba(133,248,196,0.9)]"></div>
            </div>
          </div>
        </div>

        {/* Viewport Toolbar (Floating Inside Lens) */}
        <div className="absolute top-3 inset-x-3 z-30 flex items-center justify-between pointer-events-auto">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/70 backdrop-blur-md text-on-primary font-label-md text-label-md">
            <span className="w-2 h-2 rounded-full bg-secondary-fixed"></span>
            <span>Marathi + English OCR Active</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTorchOn(!torchOn)}
              className={`w-10 h-10 rounded-full backdrop-blur-md flex items-center justify-center transition-transform active:scale-90 ${
                torchOn ? 'bg-secondary-container text-on-secondary-container' : 'bg-primary/70 text-on-primary'
              }`}
              type="button"
              aria-label="Toggle Torch"
            >
              <span className="material-symbols-outlined text-[20px]">
                {torchOn ? 'flashlight_off' : 'flashlight_on'}
              </span>
            </button>
            <button
              onClick={() => setGridOn(!gridOn)}
              className={`w-10 h-10 rounded-full backdrop-blur-md flex items-center justify-center transition-transform active:scale-90 ${
                gridOn ? 'bg-secondary-container text-on-secondary-container' : 'bg-primary/70 text-on-primary'
              }`}
              type="button"
              aria-label="Toggle Counter Grid"
            >
              <span className="material-symbols-outlined text-[20px]">grid_4x4</span>
            </button>
          </div>
        </div>
      </div>

      {/* Real-Time AI Extraction Pipeline Drawer */}
      <div className="w-full bg-surface-container rounded-xl p-space-md flex flex-col gap-space-sm shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-space-xs">
            <span className="material-symbols-outlined text-[18px] text-secondary">psychology</span>
            <span className="font-headline-sm text-headline-sm text-on-surface">Bill Recognition Pipeline</span>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-surface-container-high font-label-sm text-label-sm text-on-surface font-bold">
            {pipelineStep > 0 ? `${pipelineStep} of 4 Active` : 'Ready'}
          </span>
        </div>

        {/* Pipeline Stages */}
        <div className="flex flex-col gap-2 pt-1">
          <div className="flex items-center justify-between p-2 rounded-lg bg-surface-container-lowest">
            <div className="flex items-center gap-space-sm min-w-0">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${pipelineStep >= 1 ? 'bg-secondary-container text-on-secondary-container' : 'bg-surface-container text-on-surface-variant'}`}>
                <span className="material-symbols-outlined text-[16px]">
                  {pipelineStep >= 1 ? 'check' : 'document_scanner'}
                </span>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-body-bold text-body-bold text-on-surface truncate">
                  1. Read Marathi & English Ink
                </span>
                <span className="font-label-sm text-label-sm text-on-surface-variant">
                  Detects Devanagari handwriting & printed fonts
                </span>
              </div>
            </div>
            <span className="font-label-sm text-label-sm px-2 py-0.5 rounded bg-surface-container text-on-surface-variant font-bold">
              {pipelineStep >= 1 ? '100%' : 'Standby'}
            </span>
          </div>

          <div className="flex items-center justify-between p-2 rounded-lg bg-surface-container-lowest">
            <div className="flex items-center gap-space-sm min-w-0">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${pipelineStep >= 2 ? 'bg-secondary-container text-on-secondary-container' : 'bg-surface-container text-on-surface-variant'}`}>
                <span className="material-symbols-outlined text-[16px]">
                  {pipelineStep >= 2 ? 'check' : 'calculate'}
                </span>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-body-bold text-body-bold text-on-surface truncate">
                  2. Quantities & Rates Parsing
                </span>
                <span className="font-label-sm text-label-sm text-on-surface-variant">
                  Extracts numerals, rates, and units
                </span>
              </div>
            </div>
            <span className="font-label-sm text-label-sm px-2 py-0.5 rounded bg-surface-container text-on-surface-variant font-bold">
              {pipelineStep >= 2 ? '100%' : 'Standby'}
            </span>
          </div>

          <div className="flex items-center justify-between p-2 rounded-lg bg-surface-container-lowest">
            <div className="flex items-center gap-space-sm min-w-0">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${pipelineStep >= 3 ? 'bg-secondary-container text-on-secondary-container' : 'bg-surface-container text-on-surface-variant'}`}>
                <span className="material-symbols-outlined text-[16px]">
                  {pipelineStep >= 3 ? (pipelineStep === 3 ? 'sync' : 'check') : 'inventory_2'}
                </span>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-body-bold text-body-bold text-on-surface truncate">
                  3. Matching Shop Catalogue
                </span>
                <span className="font-label-sm text-label-sm text-on-surface-variant">
                  Matches confirmed products, aliases & shorthand
                </span>
              </div>
            </div>
            <span className="font-label-sm text-label-sm px-2 py-0.5 rounded bg-surface-container text-on-surface-variant font-bold">
              {pipelineStep >= 3 ? (pipelineStep === 3 ? 'Scanning...' : 'Done') : 'Standby'}
            </span>
          </div>
        </div>

        {/* Assurance Trust Note */}
        <div className="flex items-start gap-2 p-2 rounded-lg bg-surface-container-low text-on-surface-variant">
          <span className="material-symbols-outlined text-[18px] text-on-surface-variant shrink-0 mt-0.5">
            verified_user
          </span>
          <p className="font-label-sm text-label-sm">
            <strong className="text-on-surface">पूर्ण नियंत्रण:</strong> AI saves typing time. You will verify and
            edit each price on screen before adding to your ledger.
          </p>
        </div>
      </div>

      {/* Bottom Capture Interaction Station */}
      <div className="w-full pt-1 flex flex-col gap-space-sm pb-6">
        {/* Batch / Single Switcher */}
        <div className="flex p-1 rounded-xl bg-surface-container-high">
          <button
            onClick={() => setMode('single')}
            className={`flex-1 min-h-[40px] rounded-lg font-label-md text-label-md flex items-center justify-center gap-1 transition-all ${
              mode === 'single'
                ? 'bg-surface-container-lowest text-on-surface shadow-sm font-bold'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">description</span>
            <span>Single Bill (एक पावती)</span>
          </button>
          <button
            onClick={() => setMode('batch')}
            className={`flex-1 min-h-[40px] rounded-lg font-label-md text-label-md flex items-center justify-center gap-1 transition-all ${
              mode === 'batch'
                ? 'bg-surface-container-lowest text-on-surface shadow-sm font-bold'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">filter_none</span>
            <span>Batch Mode (अनेक पावत्या)</span>
          </button>
        </div>

        {/* Shutter & Actions */}
        <div className="flex items-center justify-around px-space-md py-3 bg-surface-container-low rounded-xl">
          <button
            onClick={handleGalleryClick}
            className="flex flex-col items-center gap-1 min-w-[56px] min-h-[56px] justify-center text-on-surface hover:text-secondary transition-all active:scale-95"
            type="button"
          >
            <div className="w-12 h-12 rounded-xl bg-surface-container-high flex items-center justify-center text-on-surface">
              <span className="material-symbols-outlined text-[24px]">folder_open</span>
            </div>
            <span className="font-label-sm text-[10px] text-on-surface-variant font-semibold">
              PDF / Gallery
            </span>
          </button>

          {/* Primary Tactile Shutter */}
          <button
            onClick={handleCaptureClick}
            disabled={isProcessing}
            className="relative w-20 h-20 rounded-full bg-primary flex items-center justify-center shadow-lg transition-transform active:scale-95 group"
            aria-label="Capture Bill Document"
            type="button"
          >
            <span className="absolute inset-0 rounded-full bg-secondary-container opacity-30 scale-105 group-active:scale-110 transition-transform"></span>
            <span className="w-16 h-16 rounded-full bg-surface-container-lowest flex items-center justify-center group-hover:scale-102 transition-transform">
              <span className="material-symbols-outlined text-[32px] text-primary">
                {isProcessing ? 'hourglass_top' : 'photo_camera'}
              </span>
            </span>
          </button>

          {/* Manual Type */}
          <button
            onClick={onManualTypeClick}
            className="flex flex-col items-center gap-1 min-w-[56px] min-h-[56px] justify-center text-on-surface hover:text-secondary transition-all active:scale-95"
            type="button"
          >
            <div className="w-12 h-12 rounded-xl bg-surface-container-high flex items-center justify-center text-on-surface">
              <span className="material-symbols-outlined text-[24px]">dialpad</span>
            </div>
            <span className="font-label-sm text-[10px] text-on-surface-variant font-semibold">
              Manual Type
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
