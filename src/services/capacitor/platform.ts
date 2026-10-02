import { Capacitor } from '@capacitor/core';

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
