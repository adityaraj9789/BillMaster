import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

export const isNativePlatform = Capacitor.isNativePlatform();
export const platform = Capacitor.getPlatform(); // 'web', 'android', 'ios'

export function isAndroid(): boolean {
  if (isNativePlatform && platform === 'android') return true;
  if (typeof navigator !== 'undefined' && /android/i.test(navigator.userAgent)) return true;
  return false;
}

export function isMobileOrTablet(): boolean {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < 1024 || /android|iphone|ipad|ipod/i.test(navigator.userAgent);
}

export interface CapturedBillPhoto {
  dataUrl: string;
  webPath?: string;
  format: string;
}

/**
 * Capture a physical bill image using the official @capacitor/camera plugin.
 * Works seamlessly in Capacitor Android/iOS shells and modern browsers.
 */
export async function captureBillWithCapacitor(
  source: 'camera' | 'photos' = 'camera'
): Promise<CapturedBillPhoto | null> {
  try {
    const photo = await Camera.getPhoto({
      quality: 90,
      allowEditing: false,
      resultType: CameraResultType.DataUrl,
      source: source === 'camera' ? CameraSource.Camera : CameraSource.Photos,
      saveToGallery: false,
      promptLabelHeader: 'Scan Physical Bill',
      promptLabelPhoto: 'From Gallery / Files',
      promptLabelPicture: 'Take Photo of Bill',
    });

    if (!photo.dataUrl && !photo.webPath) return null;

    return {
      dataUrl: photo.dataUrl || photo.webPath!,
      webPath: photo.webPath,
      format: photo.format,
    };
  } catch (err: any) {
    console.warn('Capacitor camera dismissed or failed:', err);
    return null;
  }
}

/**
 * Check and request camera permissions through Capacitor.
 */
export async function requestCapacitorCameraPermission(): Promise<boolean> {
  try {
    const check = await Camera.checkPermissions();
    if (check.camera === 'granted') return true;
    const request = await Camera.requestPermissions({ permissions: ['camera'] });
    return request.camera === 'granted';
  } catch (err) {
    console.warn('Capacitor permission check/request error:', err);
    return true; // Let user attempt getPhoto
  }
}

export async function shareInvoice(billNumber: string, customerPhone: string, textSummary: string) {
  // If native navigator.share is available and supported
  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({
        title: `Bill ${billNumber}`,
        text: textSummary,
      });
      return true;
    } catch {
      // User cancelled or share failed, fallback to WhatsApp
    }
  }

  // Fallback to WhatsApp URL
  const cleanPhone = customerPhone.replace(/[^0-9]/g, '');
  const encodedText = encodeURIComponent(textSummary);
  const waUrl = cleanPhone && cleanPhone.length >= 10
    ? `https://wa.me/${cleanPhone.startsWith('91') ? cleanPhone : '91' + cleanPhone}?text=${encodedText}`
    : `https://wa.me/?text=${encodedText}`;

  window.open(waUrl, '_blank');
  return true;
}
