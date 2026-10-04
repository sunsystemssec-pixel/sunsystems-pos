package com.sunsystems.pos;

import android.content.Intent;
import android.net.Uri;
import android.util.Base64;
import androidx.annotation.NonNull;
import androidx.biometric.BiometricManager;
import androidx.biometric.BiometricPrompt;
import androidx.core.content.ContextCompat;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileOutputStream;
import java.util.concurrent.Executor;

@CapacitorPlugin(name = "SunSystemsNative")
public class SunSystemsNativePlugin extends Plugin {

    @PluginMethod
    public void isBiometricAvailable(PluginCall call) {
        JSObject ret = new JSObject();
        try {
            BiometricManager biometricManager = BiometricManager.from(getContext());
            int canAuth = biometricManager.canAuthenticate(
                BiometricManager.Authenticators.BIOMETRIC_STRONG | BiometricManager.Authenticators.BIOMETRIC_WEAK
            );

            if (canAuth == BiometricManager.BIOMETRIC_SUCCESS) {
                ret.put("available", true);
                ret.put("reason", "SUCCESS");
            } else if (canAuth == BiometricManager.BIOMETRIC_ERROR_NONE_ENROLLED) {
                ret.put("available", false);
                ret.put("reason", "NONE_ENROLLED");
            } else if (canAuth == BiometricManager.BIOMETRIC_ERROR_NO_HARDWARE) {
                ret.put("available", false);
                ret.put("reason", "NO_HARDWARE");
            } else {
                ret.put("available", false);
                ret.put("reason", "UNAVAILABLE_" + canAuth);
            }
        } catch (Exception e) {
            ret.put("available", false);
            ret.put("reason", e.getMessage());
        }
        call.resolve(ret);
    }

    @PluginMethod
    public void authenticateBiometric(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            try {
                BiometricManager biometricManager = BiometricManager.from(getContext());
                int canAuth = biometricManager.canAuthenticate(
                    BiometricManager.Authenticators.BIOMETRIC_STRONG | BiometricManager.Authenticators.BIOMETRIC_WEAK
                );

                if (canAuth == BiometricManager.BIOMETRIC_ERROR_NONE_ENROLLED) {
                    JSObject ret = new JSObject();
                    ret.put("success", false);
                    ret.put("error", "No fingerprints enrolled on device. Please register fingerprint in Android Settings.");
                    call.resolve(ret);
                    return;
                } else if (canAuth == BiometricManager.BIOMETRIC_ERROR_NO_HARDWARE) {
                    JSObject ret = new JSObject();
                    ret.put("success", false);
                    ret.put("error", "No biometric sensor detected on this device.");
                    call.resolve(ret);
                    return;
                } else if (canAuth != BiometricManager.BIOMETRIC_SUCCESS) {
                    JSObject ret = new JSObject();
                    ret.put("success", false);
                    ret.put("error", "Biometric authentication currently unavailable.");
                    call.resolve(ret);
                    return;
                }

                String title = call.getString("title", "Sun Systems Biometric Login");
                String subtitle = call.getString("subtitle", "Touch the fingerprint sensor to log in");
                String negativeButtonText = call.getString("negativeButtonText", "Use PIN");

                BiometricPrompt.PromptInfo promptInfo = new BiometricPrompt.PromptInfo.Builder()
                    .setTitle(title)
                    .setSubtitle(subtitle)
                    .setNegativeButtonText(negativeButtonText)
                    .build();

                Executor executor = ContextCompat.getMainExecutor(getActivity());
                BiometricPrompt biometricPrompt = new BiometricPrompt(getActivity(), executor, new BiometricPrompt.AuthenticationCallback() {
                    @Override
                    public void onAuthenticationSucceeded(@NonNull BiometricPrompt.AuthenticationResult result) {
                        super.onAuthenticationSucceeded(result);
                        JSObject ret = new JSObject();
                        ret.put("success", true);
                        call.resolve(ret);
                    }

                    @Override
                    public void onAuthenticationError(int errorCode, @NonNull CharSequence errString) {
                        super.onAuthenticationError(errorCode, errString);
                        JSObject ret = new JSObject();
                        ret.put("success", false);
                        ret.put("error", errString.toString());
                        call.resolve(ret);
                    }

                    @Override
                    public void onAuthenticationFailed() {
                        super.onAuthenticationFailed();
                    }
                });

                biometricPrompt.authenticate(promptInfo);
            } catch (Exception e) {
                JSObject ret = new JSObject();
                ret.put("success", false);
                ret.put("error", e.getMessage());
                call.resolve(ret);
            }
        });
    }

    @PluginMethod
    public void sharePdf(PluginCall call) {
        try {
            String base64Data = call.getString("base64Data");
            String fileName = call.getString("fileName", "Invoice.pdf");
            String caption = call.getString("caption", "Sun Systems Invoice");
            String phone = call.getString("phone", "");

            if (base64Data == null || base64Data.isEmpty()) {
                call.reject("Base64 PDF data is missing");
                return;
            }

            if (base64Data.contains(",")) {
                base64Data = base64Data.substring(base64Data.indexOf(",") + 1);
            }

            byte[] pdfBytes = Base64.decode(base64Data, Base64.DEFAULT);

            File cacheDir = getContext().getCacheDir();
            File pdfFile = new File(cacheDir, fileName);
            FileOutputStream fos = new FileOutputStream(pdfFile);
            fos.write(pdfBytes);
            fos.flush();
            fos.close();

            Uri fileUri = FileProvider.getUriForFile(
                getContext(),
                getContext().getPackageName() + ".fileprovider",
                pdfFile
            );

            Intent shareIntent = new Intent(Intent.ACTION_SEND);
            shareIntent.setType("application/pdf");
            shareIntent.putExtra(Intent.EXTRA_STREAM, fileUri);
            if (caption != null && !caption.isEmpty()) {
                shareIntent.putExtra(Intent.EXTRA_TEXT, caption);
            }
            shareIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);

            boolean launchedDirect = false;
            if (phone != null && !phone.trim().isEmpty()) {
                try {
                    String cleanPhone = phone.replaceAll("[^0-9]", "");
                    if (cleanPhone.length() == 10) {
                        cleanPhone = "91" + cleanPhone;
                    }
                    shareIntent.setPackage("com.whatsapp");
                    shareIntent.putExtra("jid", cleanPhone + "@s.whatsapp.net");
                    getActivity().startActivity(shareIntent);
                    launchedDirect = true;
                } catch (Exception waEx) {
                    shareIntent.setPackage(null);
                    shareIntent.removeExtra("jid");
                }
            }

            if (!launchedDirect) {
                Intent chooser = Intent.createChooser(shareIntent, "Share Invoice PDF");
                chooser.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                getActivity().startActivity(chooser);
            }

            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            JSObject ret = new JSObject();
            ret.put("success", false);
            ret.put("error", e.getMessage());
            call.resolve(ret);
        }
    }

    @PluginMethod
    public void print(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            try {
                android.print.PrintManager printManager = (android.print.PrintManager) getActivity().getSystemService(android.content.Context.PRINT_SERVICE);
                if (printManager == null) {
                    JSObject ret = new JSObject();
                    ret.put("success", false);
                    ret.put("error", "Print service not available on this device");
                    call.resolve(ret);
                    return;
                }

                String jobName = call.getString("jobName", "SunSystems_Invoice_" + System.currentTimeMillis());
                android.print.PrintDocumentAdapter printAdapter = getBridge().getWebView().createPrintDocumentAdapter(jobName);

                android.print.PrintAttributes printAttributes = new android.print.PrintAttributes.Builder()
                    .setMediaSize(android.print.PrintAttributes.MediaSize.ISO_A4)
                    .setColorMode(android.print.PrintAttributes.COLOR_MODE_COLOR)
                    .setMinMargins(android.print.PrintAttributes.Margins.NO_MARGINS)
                    .build();

                printManager.print(jobName, printAdapter, printAttributes);

                JSObject ret = new JSObject();
                ret.put("success", true);
                call.resolve(ret);
            } catch (Exception e) {
                JSObject ret = new JSObject();
                ret.put("success", false);
                ret.put("error", e.getMessage());
                call.resolve(ret);
            }
        });
    }
}
