package com.sunsystems.pos;

import android.Manifest;
import android.content.pm.PackageManager;
import android.os.Bundle;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private static final int PERMISSION_REQUEST_RECORD_AUDIO = 201;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(SunSystemsNativePlugin.class);
        super.onCreate(savedInstanceState);

        // Proactively request RECORD_AUDIO permission if not yet granted
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this, new String[]{
                Manifest.permission.RECORD_AUDIO,
                Manifest.permission.MODIFY_AUDIO_SETTINGS
            }, PERMISSION_REQUEST_RECORD_AUDIO);
        }
    }
}
