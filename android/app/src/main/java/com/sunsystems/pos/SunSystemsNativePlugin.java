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
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.io.IOException;
import java.util.ArrayList;
import java.util.concurrent.Executor;

import android.Manifest;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;
import androidx.core.app.ActivityCompat;

import androidx.activity.result.ActivityResult;
import com.getcapacitor.PermissionState;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

@CapacitorPlugin(
    name = "SunSystemsNative",
    permissions = {
        @Permission(
            alias = "microphone",
            strings = { Manifest.permission.RECORD_AUDIO }
        )
    }
)
public class SunSystemsNativePlugin extends Plugin {

    private SpeechRecognizer speechRecognizer = null;
    private PluginCall activeSpeechCall = null;

    @PluginMethod
    public void requestMicPermission(PluginCall call) {
        if (getPermissionState("microphone") != PermissionState.GRANTED) {
            requestPermissionForAlias("microphone", call, "microphoneCallback");
        } else {
            JSObject ret = new JSObject();
            ret.put("granted", true);
            call.resolve(ret);
        }
    }

    @PluginMethod
    public void openAppSettings(PluginCall call) {
        try {
            Intent intent = new Intent(android.provider.Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
            intent.setData(Uri.parse("package:" + getContext().getPackageName()));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Could not open settings: " + e.getMessage());
        }
    }

    @PluginMethod
    public void isSpeechRecognitionAvailable(PluginCall call) {
        Intent intent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
        PackageManager pm = getContext().getPackageManager();
        boolean available = pm.queryIntentActivities(intent, 0).size() > 0;
        JSObject ret = new JSObject();
        ret.put("available", available);
        call.resolve(ret);
    }

    @PluginMethod
    public void startSpeechRecognition(PluginCall call) {
        if (getPermissionState("microphone") != PermissionState.GRANTED) {
            requestPermissionForAlias("microphone", call, "microphoneCallback");
            return;
        }
        launchSpeechIntent(call);
    }

    @PermissionCallback
    private void microphoneCallback(PluginCall call) {
        if (getPermissionState("microphone") == PermissionState.GRANTED) {
            launchSpeechIntent(call);
        } else {
            JSObject ret = new JSObject();
            ret.put("success", false);
            ret.put("error", "Microphone permission is required. Please grant permission in App Settings.");
            call.resolve(ret);
        }
    }

    private void launchSpeechIntent(PluginCall call) {
        String language = call.getString("language", "en-IN");
        String prompt = "Speak now in English...";
        if ("hi-IN".equals(language)) {
            prompt = "बोलिए (हिन्दी)...";
        } else if ("te-IN".equals(language)) {
            prompt = "మాట్లాడండి (తెలుగు)...";
        }

        Intent intent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
        intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
        intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, language);
        intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_PREFERENCE, language);
        intent.putExtra(RecognizerIntent.EXTRA_ONLY_RETURN_LANGUAGE_PREFERENCE, language);
        intent.putExtra(RecognizerIntent.EXTRA_PROMPT, prompt);
        intent.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 3);

        try {
            startActivityForResult(call, intent, "speechResultCallback");
        } catch (Exception e) {
            JSObject ret = new JSObject();
            ret.put("success", false);
            ret.put("error", "Google Speech recognition is not available on this phone: " + e.getMessage());
            call.resolve(ret);
        }
    }

    @ActivityCallback
    private void speechResultCallback(PluginCall call, ActivityResult result) {
        if (call == null) return;
        if (result.getResultCode() == android.app.Activity.RESULT_OK && result.getData() != null) {
            ArrayList<String> matches = result.getData().getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS);
            if (matches != null && !matches.isEmpty() && matches.get(0) != null && !matches.get(0).trim().isEmpty()) {
                JSObject ret = new JSObject();
                ret.put("success", true);
                ret.put("transcript", matches.get(0).trim());
                call.resolve(ret);
                return;
            }
        }
        JSObject ret = new JSObject();
        ret.put("success", false);
        ret.put("cancelled", true);
        ret.put("error", "No speech recognized or cancelled.");
        call.resolve(ret);
    }

    @PluginMethod
    public void stopSpeechRecognition(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("stopped", true);
        call.resolve(ret);
    }

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
                    try {
                        shareIntent.setPackage("com.whatsapp.w4b");
                        getActivity().startActivity(shareIntent);
                        launchedDirect = true;
                    } catch (Exception wbEx) {
                        shareIntent.setPackage(null);
                        shareIntent.removeExtra("jid");
                    }
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
    public void openWhatsAppDirect(PluginCall call) {
        try {
            String phone = call.getString("phone", "");
            String text = call.getString("text", "");
            String cleanPhone = phone.replaceAll("[^0-9]", "");
            if (cleanPhone.length() == 10) {
                cleanPhone = "91" + cleanPhone;
            }

            String url = "https://api.whatsapp.com/send?phone=" + cleanPhone + "&text=" + java.net.URLEncoder.encode(text, "UTF-8");
            Intent intent = new Intent(Intent.ACTION_VIEW);
            intent.setData(Uri.parse(url));
            intent.setPackage("com.whatsapp");

            try {
                getActivity().startActivity(intent);
            } catch (Exception e1) {
                try {
                    intent.setPackage("com.whatsapp.w4b");
                    getActivity().startActivity(intent);
                } catch (Exception e2) {
                    intent.setPackage(null);
                    getActivity().startActivity(intent);
                }
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
                String base64Data = call.getString("base64Data");
                String fileName = call.getString("fileName", "SunSystems_Invoice.pdf");

                // Standard ISO A4 with standard printable margins for WiFi, Bluetooth and USB printers
                android.print.PrintAttributes printAttributes = new android.print.PrintAttributes.Builder()
                    .setMediaSize(android.print.PrintAttributes.MediaSize.ISO_A4)
                    .setColorMode(android.print.PrintAttributes.COLOR_MODE_COLOR)
                    .build();

                android.print.PrintDocumentAdapter printAdapter;

                if (base64Data != null && !base64Data.trim().isEmpty()) {
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

                    printAdapter = new PdfPrintDocumentAdapter(pdfFile);
                } else {
                    printAdapter = getBridge().getWebView().createPrintDocumentAdapter(jobName);
                }

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

    public static class PdfPrintDocumentAdapter extends android.print.PrintDocumentAdapter {
        private final File pdfFile;

        public PdfPrintDocumentAdapter(File pdfFile) {
            this.pdfFile = pdfFile;
        }

        @Override
        public void onLayout(android.print.PrintAttributes oldAttributes,
                             android.print.PrintAttributes newAttributes,
                             android.os.CancellationSignal cancellationSignal,
                             LayoutResultCallback callback,
                             android.os.Bundle metadata) {
            if (cancellationSignal.isCanceled()) {
                callback.onLayoutCancelled();
                return;
            }
            boolean changed = !newAttributes.equals(oldAttributes);
            android.print.PrintDocumentInfo info = new android.print.PrintDocumentInfo.Builder(pdfFile.getName())
                .setContentType(android.print.PrintDocumentInfo.CONTENT_TYPE_DOCUMENT)
                .setPageCount(1)
                .build();
            callback.onLayoutFinished(info, changed);
        }

        @Override
        public void onWrite(android.print.PageRange[] pages,
                            android.os.ParcelFileDescriptor destination,
                            android.os.CancellationSignal cancellationSignal,
                            WriteResultCallback callback) {
            InputStream input = null;
            OutputStream output = null;
            try {
                input = new FileInputStream(pdfFile);
                output = new FileOutputStream(destination.getFileDescriptor());
                byte[] buffer = new byte[8192];
                int bytesRead;
                while ((bytesRead = input.read(buffer)) > 0) {
                    if (cancellationSignal.isCanceled()) {
                        callback.onWriteCancelled();
                        return;
                    }
                    output.write(buffer, 0, bytesRead);
                }
                callback.onWriteFinished(new android.print.PageRange[]{android.print.PageRange.ALL_PAGES});
            } catch (Exception e) {
                callback.onWriteFailed(e.getMessage());
            } finally {
                try {
                    if (input != null) input.close();
                    if (output != null) output.close();
                } catch (IOException ignored) {}
            }
        }
    }
}
