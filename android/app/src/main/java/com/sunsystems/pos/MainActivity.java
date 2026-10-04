package com.sunsystems.pos;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(SunSystemsNativePlugin.class);
        super.onCreate(savedInstanceState);
    }
}
