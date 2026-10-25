import { registerPlugin, Capacitor } from '@capacitor/core';

export interface SunSystemsNativePlugin {
  isBiometricAvailable(): Promise<{ available: boolean; reason?: string }>;
  authenticateBiometric(options?: {
    title?: string;
    subtitle?: string;
    negativeButtonText?: string;
  }): Promise<{ success: boolean; error?: string }>;
  sharePdf(options: {
    base64Data: string;
    fileName: string;
    caption?: string;
    phone?: string;
  }): Promise<{ success: boolean; error?: string }>;
  print(options?: {
    jobName?: string;
    base64Data?: string;
    fileName?: string;
  }): Promise<{ success: boolean; error?: string }>;
  openWhatsAppDirect?(options: {
    phone: string;
    text: string;
  }): Promise<{ success: boolean; error?: string }>;
  requestMicPermission?(): Promise<{ granted: boolean }>;
  isSpeechRecognitionAvailable?(): Promise<{ available: boolean }>;
  startSpeechRecognition?(options: {
    language?: string;
  }): Promise<{ success: boolean; transcript?: string; error?: string; cancelled?: boolean }>;
  stopSpeechRecognition?(): Promise<{ stopped: boolean; success?: boolean }>;
  openAppSettings?(): Promise<{ success: boolean }>;
}

export const SunSystemsNative = registerPlugin<SunSystemsNativePlugin>('SunSystemsNative');

export const isNativeApp = (): boolean => {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
};
