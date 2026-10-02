import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Bill } from '../types';
import { db } from '../services/db/repository';
import { captureBillWithCapacitor } from '../services/capacitor/platform';
import { t } from '../services/i18n/translations';

interface ScanBillPageProps {
  onScanComplete: (scannedBill: Partial<Bill>, imagePreview?: string) => void;
  onManualTypeClick: () => void;
  language?: 'en' | 'mr' | 'mixed';
}

type CameraStatus = 'idle' | 'initializing' | 'active' | 'denied' | 'unsupported' | 'captured';

export const ScanBillPage: React.FC<ScanBillPageProps> = ({
  onScanComplete,
  onManualTypeClick,
  language = 'en',
}) => {
  const currentLang = language === 'mr' ? 'mr' : 'en';
  const [cameraStatus, setCameraStatus] = useState<CameraStatus>('idle');
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pipelineStep, setPipelineStep] = useState(0); // 0=idle, 1=uploading, 2=OCR, 3=matching, 4=done
  const [pipelineMessage, setPipelineMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // Stop camera tracks cleanly
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  // Request permission and start camera stream on user action
  const requestPermissionAndStartCamera = useCallback(async (facing: 'environment' | 'user' = facingMode) => {
    stopCamera();
    setErrorMessage(null);
    setCameraStatus('initializing');

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraStatus('unsupported');
      return;
    }

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: facing },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }

      // Check torch capability
      const videoTrack = stream.getVideoTracks()[0];
      const capabilities = (videoTrack?.getCapabilities && videoTrack.getCapabilities()) as any;
      if (capabilities && capabilities.torch) {
        setHasTorch(true);
      } else {
        setHasTorch(false);
      }

      setCameraStatus('active');
    } catch (err: any) {
      console.warn('Camera access error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraStatus('denied');
      } else {
        setCameraStatus('unsupported');
      }
    }
  }, [facingMode, stopCamera]);

  // Clean up stream on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  // Toggle Torch
  const handleToggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (!track) return;

    try {
      const nextTorch = !torchOn;
      await (track as any).applyConstraints({
        advanced: [{ torch: nextTorch }],
      });
      setTorchOn(nextTorch);
    } catch (e) {
      console.warn('Torch toggle failed:', e);
    }
  };

  // Flip Camera
  const handleFlipCamera = () => {
    const nextFacing = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextFacing);
    requestPermissionAndStartCamera(nextFacing);
  };

  // Capture frame from active video
  const handleCapturePhoto = () => {
    const video = videoRef.current;
    if (!video || cameraStatus !== 'active') return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);

    stopCamera();
    setCapturedImage(dataUrl);
    setCameraStatus('captured');
  };

  // Trigger device camera or gallery capture
  const handleDeviceCameraCapture = async (source: 'camera' | 'photos' = 'camera') => {
    setErrorMessage(null);
    try {
      const result = await captureBillWithCapacitor(source);
      if (result && result.dataUrl) {
        stopCamera();
        setCapturedImage(result.dataUrl);
        setCameraStatus('captured');
        processImage(result.dataUrl, `image/${result.format || 'jpeg'}`);
      } else {
        if (source === 'photos') {
          galleryInputRef.current?.click();
        } else if (cameraStatus !== 'active') {
          requestPermissionAndStartCamera(facingMode);
        }
      }
    } catch (err: any) {
      console.warn('Camera capture cancelled or failed:', err);
      if (source === 'photos') {
        galleryInputRef.current?.click();
      } else if (cameraStatus !== 'active') {
        requestPermissionAndStartCamera(facingMode);
      }
    }
  };

  // Retake photo
  const handleRetake = () => {
    setCapturedImage(null);
    setErrorMessage(null);
    requestPermissionAndStartCamera(facingMode);
  };

  // Process image with Gemini API + catalogue matching
  const processImage = async (dataUrl: string, mimeType = 'image/jpeg') => {
    setIsProcessing(true);
    setPipelineStep(1);
    setPipelineMessage('Uploading bill image...');
    setErrorMessage(null);

    try {
      setPipelineStep(2);
      setPipelineMessage('Reading Marathi & English ink, numerals and totals...');

      const response = await fetch('/api/scan-bill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: dataUrl,
          mimeType,
        }),
      });

      if (!response.ok) {
        const errorJson = await response.json().catch(() => null);
        throw new Error(errorJson?.message || 'Could not extract bill content from this photo.');
      }

      setPipelineStep(3);
      setPipelineMessage('Matching items with your shop product catalogue & shorthand...');

      const result = await response.json();
      if (!result.success || !result.data) {
        throw new Error('AI could not identify items on this bill. Please ensure good lighting and text clarity.');
      }

      const extracted = result.data;

      // Intelligent Product Matching against real database
      const enrichedItems = extracted.items.map((item: any, idx: number) => {
        const matchResult = db.matchProduct(item.normalized_name || item.original_text || '');

        let confidence = item.confidence || 'looks_correct';
        let suggestedProdId: string | undefined = undefined;
        let suggestedProdName: string | undefined = item.suggested_product_name;
        let suggestedRate: number | undefined = item.suggested_rate;
        let reason = item.uncertainty_reason;

        if (matchResult.product) {
          suggestedProdId = matchResult.product.id;
          suggestedProdName = matchResult.product.name;
          suggestedRate = matchResult.product.selling_price;

          if (matchResult.confidence === 'exact' || matchResult.confidence === 'shorthand') {
            confidence = 'looks_correct';
          } else if (matchResult.confidence === 'alias' || matchResult.confidence === 'partial') {
            confidence = 'needs_review';
            reason = `Catalogue match found: "${matchResult.product.name}"`;
          }
        }

        // If rate was unreadable (<= 0), mark as uncertain
        const unitPrice = Number(item.unit_price) || 0;
        if (unitPrice <= 0) {
          confidence = 'uncertain';
          reason = reason || 'Rate unreadable. Please confirm or enter rate.';
        }

        const qty = Number(item.quantity) || 1;
        const rate = unitPrice > 0 ? unitPrice : (suggestedRate || 0);

        return {
          id: `scanned-item-${idx}-${Date.now()}`,
          product_id: suggestedProdId,
          original_text: item.original_text || item.normalized_name,
          product_name_snapshot: item.normalized_name || item.original_text || 'Item',
          product_name_marathi: item.name_marathi || '',
          brand_snapshot: item.brand || '',
          quantity: qty,
          unit: item.unit || 'Nos',
          unit_price: rate,
          gst_percent: Number(item.gst_percent) || 18,
          total: qty * rate,
          confidence,
          uncertainty_reason: reason,
          suggested_product_id: suggestedProdId,
          suggested_product_name: suggestedProdName,
          suggested_rate: suggestedRate,
        };
      });

      setPipelineStep(4);
      setPipelineMessage('Verification ready!');

      const billData: Partial<Bill> = {
        invoice_number: extracted.invoice_number || db.getNextInvoiceNumber(),
        bill_date: extracted.bill_date || new Date().toISOString().split('T')[0],
        customer_name: extracted.customer?.name || 'Counter Cash Sale (किरकोळ ग्राहक)',
        customer_phone: extracted.customer?.phone || '',
        customer_address: extracted.customer?.address || '',
        customer_gstin: extracted.customer?.gstin || '',
        status: enrichedItems.some((i: any) => i.confidence !== 'looks_correct') ? 'needs_review' : 'verified',
        source: 'scan',
        scan_file_url: dataUrl,
        items: enrichedItems,
      };

      setTimeout(() => {
        setIsProcessing(false);
        onScanComplete(billData, dataUrl);
      }, 400);
    } catch (err: any) {
      setIsProcessing(false);
      setPipelineStep(0);
      setErrorMessage(
        err.message || 'Could not read text from this image. Please upload a clear photo or type manually.'
      );
    }
  };

  // Handle file picker selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        stopCamera();
        setCapturedImage(dataUrl);
        setCameraStatus('captured');
        processImage(dataUrl, file.type || 'image/jpeg');
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="flex flex-col w-full max-w-4xl mx-auto space-y-5 pb-10">
      {/* Hidden file inputs for Camera fallback & Gallery/PDF upload */}
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
        accept="image/jpeg,image/png,image/webp,application/pdf"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Screen Title & Quick Actions */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-on-surface">
              {t('scan_title', currentLang)}
            </h1>
            <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-secondary-container text-on-secondary-container text-[11px] font-bold">
              <span className="material-symbols-outlined text-[13px]">document_scanner</span>
              AI Bill Scanner
            </span>
          </div>
          <p className="text-xs sm:text-sm text-on-surface-variant mt-0.5">
            {t('scan_subtitle', currentLang)}
          </p>
        </div>
        <button
          onClick={onManualTypeClick}
          className="h-10 px-3.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-colors"
          type="button"
        >
          <span className="material-symbols-outlined text-[18px]">keyboard</span>
          <span>{t('manual_pos', currentLang)}</span>
        </button>
      </div>

      {/* Error / Alert Message */}
      {errorMessage && (
        <div className="p-4 rounded-2xl bg-error-container text-on-error-container flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs border border-error/20">
          <div className="flex items-start gap-2.5">
            <span className="material-symbols-outlined text-[24px] text-error shrink-0">error</span>
            <div className="flex flex-col">
              <span className="font-bold text-sm">Scan Recognition Alert</span>
              <p className="text-xs sm:text-sm mt-0.5 opacity-90">{errorMessage}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            <button
              onClick={handleRetake}
              className="h-9 px-3 rounded-lg bg-surface text-on-surface text-xs font-bold"
              type="button"
            >
              {t('try_again', currentLang)}
            </button>
            <button
              onClick={onManualTypeClick}
              className="h-9 px-3 rounded-lg bg-error text-on-error text-xs font-bold"
              type="button"
            >
              {t('manual_pos', currentLang)}
            </button>
          </div>
        </div>
      )}

      {/* Camera Viewfinder / Preview Stage */}
      <div className="relative w-full aspect-[4/3] sm:aspect-[16/10] max-h-[480px] rounded-2xl overflow-hidden bg-primary-container shadow-md flex items-center justify-center select-none border border-surface-container-high">
        {/* Active Live Video Stream */}
        {cameraStatus === 'active' && (
          <video
            ref={videoRef}
            playsInline
            autoPlay
            muted
            className="w-full h-full object-cover"
          />
        )}

        {/* Captured Photo / Uploaded Preview */}
        {capturedImage && (
          <img
            src={capturedImage}
            alt="Captured Bill"
            className="w-full h-full object-contain bg-black/80"
          />
        )}

        {/* Initializing Spinner */}
        {cameraStatus === 'initializing' && !capturedImage && (
          <div className="flex flex-col items-center gap-2 text-white p-6">
            <span className="material-symbols-outlined text-[36px] animate-spin">refresh</span>
            <p className="text-sm font-semibold">Requesting camera permission...</p>
          </div>
        )}

        {/* Initial Idle Screen - Asks Permission to Start Camera */}
        {cameraStatus === 'idle' && !capturedImage && (
          <div className="flex flex-col items-center text-center p-6 max-w-md text-white">
            <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center mb-3">
              <span className="material-symbols-outlined text-[36px] text-secondary-fixed">photo_camera</span>
            </div>
            <h3 className="font-bold text-lg">
              {t('start_camera', currentLang)}
            </h3>
            <p className="text-xs sm:text-sm text-white/80 mt-1 mb-5">
              {t('start_camera_prompt', currentLang)}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={() => requestPermissionAndStartCamera(facingMode)}
                className="h-12 px-6 rounded-xl bg-secondary-fixed text-on-secondary-fixed text-sm font-bold flex items-center gap-2 shadow-md active:scale-98 transition-transform"
                type="button"
              >
                <span className="material-symbols-outlined text-[20px]">videocam</span>
                <span>{t('start_camera', currentLang)}</span>
              </button>
              <button
                onClick={() => handleDeviceCameraCapture('photos')}
                className="h-12 px-5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-sm font-semibold flex items-center gap-2 transition-colors"
                type="button"
              >
                <span className="material-symbols-outlined text-[20px]">folder_open</span>
                <span>{t('upload_bill_photo', currentLang)}</span>
              </button>
            </div>
          </div>
        )}

        {/* Camera Permission Denied Screen */}
        {cameraStatus === 'denied' && !capturedImage && (
          <div className="flex flex-col items-center text-center p-6 max-w-md text-white">
            <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center mb-3">
              <span className="material-symbols-outlined text-[32px] text-error">no_photography</span>
            </div>
            <h3 className="font-bold text-base sm:text-lg">
              {t('camera_permission_needed', currentLang)}
            </h3>
            <p className="text-xs sm:text-sm text-white/80 mt-1 mb-4">
              {t('camera_permission_desc', currentLang)}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2.5">
              <button
                onClick={() => requestPermissionAndStartCamera(facingMode)}
                className="h-10 px-4 rounded-xl bg-white text-primary text-xs font-bold flex items-center gap-1.5"
                type="button"
              >
                <span className="material-symbols-outlined text-[16px]">refresh</span>
                <span>{t('retry_permission', currentLang)}</span>
              </button>
              <button
                onClick={() => handleDeviceCameraCapture('photos')}
                className="h-10 px-4 rounded-xl bg-secondary text-on-secondary text-xs font-bold flex items-center gap-1.5"
                type="button"
              >
                <span className="material-symbols-outlined text-[16px]">folder_open</span>
                <span>{t('upload_bill_photo', currentLang)}</span>
              </button>
            </div>
          </div>
        )}

        {/* Camera Unsupported Screen */}
        {cameraStatus === 'unsupported' && !capturedImage && (
          <div className="flex flex-col items-center text-center p-6 max-w-md text-white">
            <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center mb-3">
              <span className="material-symbols-outlined text-[32px] text-secondary">photo_camera</span>
            </div>
            <h3 className="font-bold text-base sm:text-lg">
              {t('upload_bill_photo', currentLang)}
            </h3>
            <p className="text-xs sm:text-sm text-white/80 mt-1 mb-4">
              {t('start_camera_prompt', currentLang)}
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              <button
                onClick={() => handleDeviceCameraCapture('camera')}
                className="h-11 px-5 rounded-xl bg-primary text-on-primary text-sm font-bold flex items-center gap-2"
                type="button"
              >
                <span className="material-symbols-outlined text-[20px]">photo_camera</span>
                <span>{t('take_photo', currentLang)}</span>
              </button>
              <button
                onClick={() => handleDeviceCameraCapture('photos')}
                className="h-11 px-5 rounded-xl bg-secondary text-on-secondary text-sm font-bold flex items-center gap-2"
                type="button"
              >
                <span className="material-symbols-outlined text-[20px]">folder_open</span>
                <span>{t('gallery_files', currentLang)}</span>
              </button>
            </div>
          </div>
        )}

        {/* Viewfinder Overlays when live camera is active */}
        {cameraStatus === 'active' && (
          <>
            {/* Guide targeting frame */}
            <div className="absolute inset-6 sm:inset-10 pointer-events-none rounded-xl border-2 border-dashed border-white/40 flex items-center justify-center">
              <div className="w-full h-full flex flex-col justify-between p-2">
                <div className="flex justify-between">
                  <div className="w-6 h-6 border-t-4 border-l-4 border-secondary-fixed rounded-tl"></div>
                  <div className="w-6 h-6 border-t-4 border-r-4 border-secondary-fixed rounded-tr"></div>
                </div>
                <div className="flex justify-between">
                  <div className="w-6 h-6 border-b-4 border-l-4 border-secondary-fixed rounded-bl"></div>
                  <div className="w-6 h-6 border-b-4 border-r-4 border-secondary-fixed rounded-br"></div>
                </div>
              </div>
            </div>

            {/* Top Toolbar in Camera */}
            <div className="absolute top-3 inset-x-3 z-30 flex items-center justify-between pointer-events-auto">
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-white text-xs font-semibold">
                <span className="w-2 h-2 rounded-full bg-secondary-fixed"></span>
                <span>{t('align_bill', currentLang)}</span>
              </div>

              <div className="flex items-center gap-2">
                {hasTorch && (
                  <button
                    onClick={handleToggleTorch}
                    className={`w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-md transition-colors ${
                      torchOn ? 'bg-secondary text-on-secondary' : 'bg-black/60 text-white'
                    }`}
                    type="button"
                    aria-label="Toggle Flashlight"
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      {torchOn ? 'flashlight_off' : 'flashlight_on'}
                    </span>
                  </button>
                )}

                <button
                  onClick={handleFlipCamera}
                  className="w-10 h-10 rounded-full bg-black/60 text-white flex items-center justify-center backdrop-blur-md transition-colors"
                  type="button"
                  aria-label="Flip Camera"
                >
                  <span className="material-symbols-outlined text-[20px]">flip_camera_android</span>
                </button>
              </div>
            </div>
          </>
        )}

        {/* Processing Overlay during Gemini Call */}
        {isProcessing && (
          <div className="absolute inset-0 z-40 bg-black/75 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-white text-center">
            <span className="material-symbols-outlined text-[44px] text-secondary-fixed animate-spin mb-3">
              progress_activity
            </span>
            <span className="font-bold text-lg mb-1">{t('analyzing_bill', currentLang)}</span>
            <p className="text-sm text-white/80 max-w-sm mb-4">{pipelineMessage}</p>
            <div className="w-48 h-2 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-secondary-fixed transition-all duration-300"
                style={{ width: `${pipelineStep * 25}%` }}
              ></div>
            </div>
          </div>
        )}
      </div>

      {/* Captured Photo Actions: Retake vs Process */}
      {capturedImage && !isProcessing && (
        <div className="p-4 rounded-2xl bg-surface-container border border-surface-container-high flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-[24px] text-secondary">check_circle</span>
            <div>
              <span className="font-bold text-sm text-on-surface block">
                {t('photo_captured', currentLang)}
              </span>
              <span className="text-xs text-on-surface-variant">
                {t('ready_for_extraction', currentLang)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={handleRetake}
              className="flex-1 sm:flex-none h-11 px-4 rounded-xl bg-surface-container-highest text-on-surface text-xs font-bold flex items-center justify-center gap-1.5 active:scale-98 transition-transform"
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">replay</span>
              <span>{t('retake', currentLang)}</span>
            </button>
            <button
              onClick={() => handleDeviceCameraCapture('camera')}
              className="flex-1 sm:flex-none h-11 px-4 rounded-xl bg-surface-container-highest text-on-surface text-xs font-bold flex items-center justify-center gap-1.5 active:scale-98 transition-transform"
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">photo_camera</span>
              <span>{t('new_photo', currentLang)}</span>
            </button>
            <button
              onClick={() => processImage(capturedImage)}
              className="flex-1 sm:flex-none h-11 px-5 rounded-xl bg-primary text-on-primary text-xs font-bold flex items-center justify-center gap-1.5 active:scale-98 transition-transform shadow-sm"
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
              <span>{t('extract_with_ai', currentLang)}</span>
            </button>
          </div>
        </div>
      )}

      {/* Primary Capture & Upload Control Station */}
      {!capturedImage && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-2xl bg-surface-container-low border border-surface-container">
          {/* Gallery / File Picker Button */}
          <button
            onClick={() => handleDeviceCameraCapture('photos')}
            className="w-full sm:w-auto h-12 px-5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface text-sm font-semibold flex items-center justify-center gap-2 transition-colors active:scale-98"
            type="button"
          >
            <span className="material-symbols-outlined text-[22px] text-secondary">photo_library</span>
            <span>{t('gallery_files', currentLang)}</span>
          </button>

          {/* Primary Camera Buttons */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {cameraStatus === 'active' ? (
              <button
                onClick={handleCapturePhoto}
                className="w-full sm:w-auto h-14 px-8 rounded-xl bg-primary text-on-primary font-bold text-base flex items-center justify-center gap-2 shadow-md hover:opacity-95 active:scale-98 transition-all"
                type="button"
              >
                <span className="material-symbols-outlined text-[24px]">photo_camera</span>
                <span>{t('take_photo', currentLang)}</span>
              </button>
            ) : (
              <button
                onClick={() => requestPermissionAndStartCamera(facingMode)}
                className="w-full sm:w-auto h-14 px-8 rounded-xl bg-primary text-on-primary font-bold text-base flex items-center justify-center gap-2 shadow-md hover:opacity-95 active:scale-98 transition-all"
                type="button"
              >
                <span className="material-symbols-outlined text-[24px]">photo_camera</span>
                <span>{t('start_camera', currentLang)}</span>
              </button>
            )}
          </div>

          {/* Manual POS button */}
          <button
            onClick={onManualTypeClick}
            className="w-full sm:w-auto h-12 px-5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface text-sm font-semibold flex items-center justify-center gap-2 transition-colors active:scale-98"
            type="button"
          >
            <span className="material-symbols-outlined text-[20px] text-on-surface-variant">dialpad</span>
            <span>{t('manual_pos', currentLang)}</span>
          </button>
        </div>
      )}

      {/* Trust & Intelligence Note */}
      <div className="p-4 rounded-2xl bg-surface-container-lowest border border-surface-container flex items-start gap-3">
        <span className="material-symbols-outlined text-secondary text-[22px] shrink-0 mt-0.5">
          verified_user
        </span>
        <div className="text-xs text-on-surface-variant space-y-1">
          <p className="font-semibold text-on-surface">
            {t('human_verification_guaranteed', currentLang)}
          </p>
          <p>
            {t('trust_note', currentLang)}
          </p>
        </div>
      </div>
    </div>
  );
};
