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
  }): Promise<{ success: boolean; error?: string }>;
}

export const SunSystemsNative = registerPlugin<SunSystemsNativePlugin>('SunSystemsNative');

export const isNativeApp = (): boolean => {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
};
