package cl.cfelbc.cdmantencion;

import android.Manifest;
import android.app.DownloadManager;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.graphics.Color;
import android.graphics.drawable.ColorDrawable;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.provider.MediaStore;
import android.provider.Settings;
import android.content.pm.ResolveInfo;
import android.util.Base64;
import android.media.MediaScannerConnection;
import java.net.HttpURLConnection;
import java.net.URL;
import org.json.JSONObject;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import android.webkit.CookieManager;
import android.webkit.DownloadListener;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.URLUtil;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.Toast;

import java.io.InputStream;
import java.util.HashMap;
import java.util.Map;

import androidx.activity.OnBackPressedCallback;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.content.ContextCompat;
import androidx.core.content.FileProvider;
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout;

import com.google.android.material.button.MaterialButton;

import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;
import java.io.IOException;
import android.content.ContentValues;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

public class MainActivity extends AppCompatActivity {

    private static final String APP_URL = "https://mantencion.cfelbc.cl";

    private WebView webView;
    private ProgressBar progressBar;
    private SwipeRefreshLayout swipeRefreshLayout;
    private LinearLayout errorView;
    private MaterialButton btnRetry;

    private ValueCallback<Uri[]> fileUploadCallback;
    private Uri cameraCaptureUri;
    private long lastBackPressedTime = 0;

    private ActivityResultLauncher<Intent> fileChooserLauncher;
    private ActivityResultLauncher<String[]> permissionsLauncher;
    private ActivityResultLauncher<String> cameraPermissionLauncher;
    private ActivityResultLauncher<Intent> manageUnknownSourcesLauncher;
    private File pendingInstallApk = null;
    private PermissionRequest currentPermissionRequest;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setupStatusBar();
        setContentView(R.layout.activity_main);

        initViews();
        setupLaunchers();
        setupWebView();

        // Limpieza de datos y caché antigua al actualizar de versión para forzar datos limpios
        android.content.SharedPreferences prefs = getSharedPreferences("cd_app_prefs", MODE_PRIVATE);
        int lastCode = prefs.getInt("version_code", 0);
        if (lastCode < 6) {
            webView.clearCache(true);
            try {
                android.webkit.WebStorage.getInstance().deleteAllData();
            } catch (Exception ignored) {}
            prefs.edit().putInt("version_code", 6).apply();
        }

        setupSwipeRefresh();
        setupBackNavigation();

        hideErrorScreen();
        webView.loadUrl(APP_URL);

        // Verificación automática de actualizaciones en GitHub al iniciar la aplicación
        new android.os.Handler(android.os.Looper.getMainLooper()).postDelayed(() -> {
            checkForGitHubUpdate(false);
        }, 3500);
    }

    private void setupStatusBar() {
        Window window = getWindow();
        window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
        window.clearFlags(WindowManager.LayoutParams.FLAG_TRANSLUCENT_STATUS);
        int darkColor = ContextCompat.getColor(this, R.color.app_bg_dark);
        window.setStatusBarColor(darkColor);
        window.setNavigationBarColor(darkColor);
        window.setBackgroundDrawable(new ColorDrawable(darkColor));

        WindowInsetsControllerCompat insetsController = WindowCompat.getInsetsController(window, window.getDecorView());
        if (insetsController != null) {
            insetsController.setAppearanceLightStatusBars(false);
            insetsController.setAppearanceLightNavigationBars(false);
        }
    }

    private void initViews() {
        webView = findViewById(R.id.webView);
        progressBar = findViewById(R.id.progressBar);
        swipeRefreshLayout = findViewById(R.id.swipeRefreshLayout);
        errorView = findViewById(R.id.errorView);
        btnRetry = findViewById(R.id.btnRetry);

        btnRetry.setOnClickListener(v -> {
            hideErrorScreen();
            webView.loadUrl(APP_URL);
        });
    }

    private void setupLaunchers() {
        cameraPermissionLauncher = registerForActivityResult(
                new ActivityResultContracts.RequestPermission(),
                isGranted -> {
                    if (isGranted && currentPermissionRequest != null) {
                        try {
                            currentPermissionRequest.grant(new String[]{PermissionRequest.RESOURCE_VIDEO_CAPTURE});
                        } catch (Exception e) {
                            try { currentPermissionRequest.grant(currentPermissionRequest.getResources()); } catch (Exception ignored) {}
                        }
                    } else if (currentPermissionRequest != null) {
                        currentPermissionRequest.deny();
                    }
                    currentPermissionRequest = null;
                }
        );

        fileChooserLauncher = registerForActivityResult(
                new ActivityResultContracts.StartActivityForResult(),
                result -> {
                    if (fileUploadCallback == null) return;

                    Uri[] results = null;
                    if (result.getResultCode() == RESULT_OK) {
                        if (result.getData() != null && result.getData().getData() != null) {
                            results = new Uri[]{result.getData().getData()};
                        } else if (cameraCaptureUri != null) {
                            results = new Uri[]{cameraCaptureUri};
                        }
                    }

                    fileUploadCallback.onReceiveValue(results);
                    fileUploadCallback = null;
                }
        );

        permissionsLauncher = registerForActivityResult(
                new ActivityResultContracts.RequestMultiplePermissions(),
                permissions -> {
                    launchFileChooserIntent();
                }
        );

        manageUnknownSourcesLauncher = registerForActivityResult(
                new ActivityResultContracts.StartActivityForResult(),
                result -> {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        if (getPackageManager().canRequestPackageInstalls() && pendingInstallApk != null) {
                            launchInstallerIntent(pendingInstallApk);
                            pendingInstallApk = null;
                        }
                    }
                }
        );
    }

    private void setupWebView() {
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setAllowFileAccessFromFileURLs(true);
        settings.setAllowUniversalAccessFromFileURLs(true);
        settings.setLoadWithOverviewMode(true);
        settings.setUseWideViewPort(true);
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setCacheMode(WebSettings.LOAD_NO_CACHE);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        settings.setMediaPlaybackRequiresUserGesture(false);

        int blackBg = ContextCompat.getColor(this, R.color.app_bg_dark);
        webView.setBackgroundColor(blackBg);
        swipeRefreshLayout.setBackgroundColor(blackBg);

        String defaultUa = settings.getUserAgentString();
        settings.setUserAgentString(defaultUa + " CDmantencion_Android_App/1.0");

        CookieManager cookieManager = CookieManager.getInstance();
        cookieManager.setAcceptCookie(true);
        cookieManager.setAcceptThirdPartyCookies(webView, true);

        webView.addJavascriptInterface(new AndroidBridge(), "AndroidBridge");

        final androidx.webkit.WebViewAssetLoader assetLoader = new androidx.webkit.WebViewAssetLoader.Builder()
                .addPathHandler("/assets/", new androidx.webkit.WebViewAssetLoader.AssetsPathHandler(this))
                .build();

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                WebResourceResponse assetLoaderResp = assetLoader.shouldInterceptRequest(request.getUrl());
                if (assetLoaderResp != null) {
                    return assetLoaderResp;
                }

                Uri uri = request.getUrl();
                String path = uri.getPath();
                if (path == null || path.isEmpty()) path = "/";

                String cleanPath = path;
                if (cleanPath.startsWith("/")) {
                    cleanPath = cleanPath.substring(1);
                }
                if (cleanPath.startsWith("android_asset/")) {
                    cleanPath = cleanPath.substring(14);
                }
                if (cleanPath.startsWith("static/")) {
                    cleanPath = cleanPath.substring(7);
                }

                int qIdx = cleanPath.indexOf('?');
                if (qIdx != -1) {
                    cleanPath = cleanPath.substring(0, qIdx);
                }

                if (cleanPath.isEmpty() || cleanPath.equals("index.html")) {
                    WebResourceResponse resp = getAssetResponse("index.html", "text/html");
                    if (resp != null) return resp;
                } else if (!cleanPath.startsWith("api/")) {
                    String mime = getMimeType(cleanPath);
                    WebResourceResponse resp = getAssetResponse(cleanPath, mime);
                    if (resp != null) {
                        return resp;
                    }
                }

                return super.shouldInterceptRequest(view, request);
            }

            @Override
            public void onPageStarted(WebView view, String url, Bitmap favicon) {
                super.onPageStarted(view, url, favicon);
                hideErrorScreen();
                progressBar.setVisibility(View.VISIBLE);
                progressBar.setProgress(10);
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                progressBar.setVisibility(View.GONE);
                swipeRefreshLayout.setRefreshing(false);
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                super.onReceivedError(view, request, error);
                if (request.isForMainFrame()) {
                    // Fallback directo a la versión local embebida con origen HTTPS seguro para permitir cámara WebRTC
                    view.loadUrl("https://appassets.androidplatform.net/assets/index.html");
                }
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                String path = uri.getPath();

                if (path != null && path.endsWith(".apk")) {
                    downloadAndInstallApk(uri.toString());
                    return true;
                }

                if (path != null && (path.endsWith("/pdf") || path.endsWith(".pdf") || path.contains("/pdf/"))) {
                    try {
                        String downloadUrl = uri.toString();
                        if (!downloadUrl.contains("download=")) {
                            downloadUrl += (downloadUrl.contains("?") ? "&" : "?") + "download=true";
                        }
                        DownloadManager.Request dmReq = new DownloadManager.Request(Uri.parse(downloadUrl));
                        String fileName = "Reporte_Mantencion_" + System.currentTimeMillis() + ".pdf";

                        dmReq.setDescription("Descargando reporte oficial CDmantencion...");
                        dmReq.setTitle(fileName);
                        dmReq.setMimeType("application/pdf");
                        dmReq.allowScanningByMediaScanner();
                        dmReq.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
                        dmReq.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, fileName);

                        String cookies = CookieManager.getInstance().getCookie(uri.toString());
                        if (cookies != null) {
                            dmReq.addRequestHeader("Cookie", cookies);
                        }
                        dmReq.addRequestHeader("User-Agent", settings.getUserAgentString());

                        DownloadManager dm = (DownloadManager) getSystemService(Context.DOWNLOAD_SERVICE);
                        if (dm != null) {
                            dm.enqueue(dmReq);
                            Toast.makeText(MainActivity.this, "Descargando reporte PDF...", Toast.LENGTH_SHORT).show();
                            return true;
                        }
                    } catch (Exception e) {
                        try {
                            Intent intent = new Intent(Intent.ACTION_VIEW);
                            intent.setDataAndType(uri, "application/pdf");
                            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                            startActivity(intent);
                            return true;
                        } catch (Exception ignored) {
                        }
                    }
                }

                String host = uri.getHost();
                if (host != null && (host.contains("mantencion.cfelbc.cl") || host.contains("cfelbc.cl") || host.contains("localhost") || host.contains("10.0.2.2"))) {
                    return false;
                }

                String scheme = uri.getScheme();
                if (scheme != null && (scheme.equals("tel") || scheme.equals("mailto") || scheme.equals("whatsapp"))) {
                    try {
                        Intent intent = new Intent(Intent.ACTION_VIEW, uri);
                        startActivity(intent);
                        return true;
                    } catch (Exception ignored) {
                    }
                }

                try {
                    Intent intent = new Intent(Intent.ACTION_VIEW, uri);
                    startActivity(intent);
                    return true;
                } catch (Exception e) {
                    return false;
                }
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onProgressChanged(WebView view, int newProgress) {
                super.onProgressChanged(view, newProgress);
                progressBar.setProgress(newProgress);
                if (newProgress == 100) {
                    progressBar.setVisibility(View.GONE);
                } else if (progressBar.getVisibility() == View.GONE) {
                    progressBar.setVisibility(View.VISIBLE);
                }
            }

            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                MainActivity.this.runOnUiThread(() -> {
                    currentPermissionRequest = request;
                    if (ContextCompat.checkSelfPermission(MainActivity.this, Manifest.permission.CAMERA)
                            == PackageManager.PERMISSION_GRANTED) {
                        try {
                            request.grant(new String[]{PermissionRequest.RESOURCE_VIDEO_CAPTURE});
                        } catch (Exception e) {
                            try { request.grant(request.getResources()); } catch (Exception ignored) {}
                        }
                        currentPermissionRequest = null;
                    } else {
                        cameraPermissionLauncher.launch(Manifest.permission.CAMERA);
                    }
                });
            }

            @Override
            public boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> filePathCallback, FileChooserParams fileChooserParams) {
                if (fileUploadCallback != null) {
                    fileUploadCallback.onReceiveValue(null);
                }
                fileUploadCallback = filePathCallback;

                boolean hasCameraPermission = ContextCompat.checkSelfPermission(MainActivity.this, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED;
                if (!hasCameraPermission) {
                    permissionsLauncher.launch(new String[]{Manifest.permission.CAMERA});
                    return true;
                }

                launchFileChooserIntent();
                return true;
            }
        });

        webView.setDownloadListener(new DownloadListener() {
            @Override
            public void onDownloadStart(String url, String userAgent, String contentDisposition, String mimeType, long contentLength) {
                try {
                    if (url != null && url.startsWith("data:image/")) {
                        String guessedName = "QR_" + System.currentTimeMillis() + ".png";
                        if (contentDisposition != null && contentDisposition.contains("filename=")) {
                            try {
                                guessedName = contentDisposition.split("filename=")[1].split(";")[0].replace("\"", "").replace("'", "").trim();
                            } catch (Exception ignored) {}
                        }
                        new AndroidBridge().saveBase64Image(url, guessedName);
                        return;
                    }

                    if (url.endsWith(".apk") || (mimeType != null && mimeType.contains("vnd.android.package-archive"))) {
                        downloadAndInstallApk(url);
                        return;
                    }

                    DownloadManager.Request request = new DownloadManager.Request(Uri.parse(url));
                    String fileName = URLUtil.guessFileName(url, contentDisposition, mimeType);
                    request.setMimeType(mimeType);

                    String cookies = CookieManager.getInstance().getCookie(url);
                    if (cookies != null) {
                        request.addRequestHeader("Cookie", cookies);
                    }
                    request.addRequestHeader("User-Agent", userAgent);

                    request.setDescription("Descargando archivo...");
                    request.setTitle(fileName);
                    request.allowScanningByMediaScanner();
                    request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
                    request.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, fileName);

                    DownloadManager dm = (DownloadManager) getSystemService(Context.DOWNLOAD_SERVICE);
                    if (dm != null) {
                        dm.enqueue(request);
                        Toast.makeText(getApplicationContext(), "Descarga iniciada: " + fileName, Toast.LENGTH_SHORT).show();
                    }
                } catch (Exception e) {
                    Toast.makeText(getApplicationContext(), "Error al iniciar descarga: " + e.getMessage(), Toast.LENGTH_SHORT).show();
                }
            }
        });
    }

    private void launchFileChooserIntent() {
        Intent takePictureIntent = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
        cameraCaptureUri = null;

        File photoFile = null;
        try {
            String timeStamp = new SimpleDateFormat("yyyyMMdd_HHmmss", Locale.getDefault()).format(new Date());
            String imageFileName = "IMG_" + timeStamp + "_";
            File storageDir = getExternalFilesDir(Environment.DIRECTORY_PICTURES);
            if (storageDir != null) {
                photoFile = File.createTempFile(imageFileName, ".jpg", storageDir);
            }
        } catch (IOException ignored) {
        }

        if (photoFile != null) {
            cameraCaptureUri = FileProvider.getUriForFile(
                    this,
                    getApplicationContext().getPackageName() + ".fileprovider",
                    photoFile
            );
            takePictureIntent.putExtra(MediaStore.EXTRA_OUTPUT, cameraCaptureUri);
        }

        Intent contentSelectionIntent = new Intent(Intent.ACTION_GET_CONTENT);
        contentSelectionIntent.addCategory(Intent.CATEGORY_OPENABLE);
        contentSelectionIntent.setType("*/*");

        Intent chooserIntent = new Intent(Intent.ACTION_CHOOSER);
        chooserIntent.putExtra(Intent.EXTRA_INTENT, contentSelectionIntent);
        chooserIntent.putExtra(Intent.EXTRA_TITLE, "Seleccionar archivo o tomar foto");

        if (cameraCaptureUri != null) {
            chooserIntent.putExtra(Intent.EXTRA_INITIAL_INTENTS, new Intent[]{takePictureIntent});
        }

        fileChooserLauncher.launch(chooserIntent);
    }

    private void setupSwipeRefresh() {
        swipeRefreshLayout.setColorSchemeColors(
                ContextCompat.getColor(this, R.color.primary),
                ContextCompat.getColor(this, R.color.accent)
        );
        swipeRefreshLayout.setOnRefreshListener(() -> {
            if (isNetworkAvailable()) {
                webView.reload();
            } else {
                swipeRefreshLayout.setRefreshing(false);
                Toast.makeText(this, "Sin conexión a Internet", Toast.LENGTH_SHORT).show();
            }
        });

        swipeRefreshLayout.getViewTreeObserver().addOnScrollChangedListener(() -> {
            if (webView != null) {
                swipeRefreshLayout.setEnabled(webView.getScrollY() == 0);
            }
        });
    }

    private void setupBackNavigation() {
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                if (webView != null && webView.canGoBack()) {
                    webView.goBack();
                } else {
                    long currentTime = System.currentTimeMillis();
                    if (currentTime - lastBackPressedTime < 2000) {
                        finish();
                    } else {
                        lastBackPressedTime = currentTime;
                        Toast.makeText(MainActivity.this, "Presiona nuevamente para salir de CDmantencion", Toast.LENGTH_SHORT).show();
                    }
                }
            }
        });
    }

    private boolean isNetworkAvailable() {
        ConnectivityManager cm = (ConnectivityManager) getSystemService(Context.CONNECTIVITY_SERVICE);
        if (cm == null) return false;

        Network network = cm.getActiveNetwork();
        if (network == null) return false;

        NetworkCapabilities capabilities = cm.getNetworkCapabilities(network);
        return capabilities != null && (
                capabilities.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) ||
                capabilities.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR) ||
                capabilities.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET)
        );
    }

    private void showErrorScreen() {
        if (errorView != null && webView != null) {
            errorView.setVisibility(View.VISIBLE);
            webView.setVisibility(View.GONE);
        }
    }

    private void hideErrorScreen() {
        if (errorView != null && webView != null) {
            errorView.setVisibility(View.GONE);
            webView.setVisibility(View.VISIBLE);
        }
    }

    private WebResourceResponse getAssetResponse(String assetPath, String mimeType) {
        try {
            InputStream is = getAssets().open(assetPath);
            Map<String, String> headers = new HashMap<>();
            headers.put("Access-Control-Allow-Origin", "*");
            headers.put("Cache-Control", "no-cache");
            return new WebResourceResponse(mimeType, "UTF-8", 200, "OK", headers, is);
        } catch (Exception e) {
            return null;
        }
    }

    private String getMimeType(String path) {
        if (path.endsWith(".html")) return "text/html";
        if (path.endsWith(".css")) return "text/css";
        if (path.endsWith(".js")) return "application/javascript";
        if (path.endsWith(".json")) return "application/json";
        if (path.endsWith(".svg")) return "image/svg+xml";
        if (path.endsWith(".png")) return "image/png";
        if (path.endsWith(".jpg") || path.endsWith(".jpeg")) return "image/jpeg";
        return "application/octet-stream";
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (webView != null) webView.onResume();
    }

    @Override
    protected void onPause() {
        super.onPause();
        if (webView != null) webView.onPause();
    }

    @Override
    protected void onDestroy() {
        if (webView != null) webView.destroy();
        super.onDestroy();
    }

    private android.app.ProgressDialog updateProgressDialog = null;

    public class AndroidBridge {
        @JavascriptInterface
        public boolean isNativeApp() {
            return true;
        }

        @JavascriptInterface
        public String getAppVersionName() {
            return BuildConfig.VERSION_NAME;
        }

        @JavascriptInterface
        public int getAppVersionCode() {
            return BuildConfig.VERSION_CODE;
        }

        @JavascriptInterface
        public void checkAppUpdate() {
            runOnUiThread(() -> checkForGitHubUpdate(true));
        }

        @JavascriptInterface
        public void startAppUpdate(String downloadUrl) {
            runOnUiThread(() -> downloadAndInstallApk(downloadUrl));
        }

        @JavascriptInterface
        public void reloadApp() {
            runOnUiThread(() -> {
                hideErrorScreen();
                webView.loadUrl(APP_URL);
            });
        }

        @JavascriptInterface
        public boolean hasCameraPermission() {
            return ContextCompat.checkSelfPermission(MainActivity.this, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED;
        }

        @JavascriptInterface
        public void requestCameraPermission() {
            runOnUiThread(() -> {
                if (ContextCompat.checkSelfPermission(MainActivity.this, Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
                    cameraPermissionLauncher.launch(Manifest.permission.CAMERA);
                }
            });
        }

        @JavascriptInterface
        public void saveBase64Image(String base64Data, String fileName) {
            if (base64Data == null || base64Data.isEmpty()) return;

            runOnUiThread(() -> {
                try {
                    String cleanBase64 = base64Data;
                    if (cleanBase64.contains(",")) {
                        cleanBase64 = cleanBase64.substring(cleanBase64.indexOf(",") + 1);
                    }
                    byte[] imageBytes = Base64.decode(cleanBase64, Base64.DEFAULT);

                    String name = (fileName != null && !fileName.trim().isEmpty()) ? fileName.trim() : ("QR_" + System.currentTimeMillis() + ".png");
                    if (!name.toLowerCase().endsWith(".png") && !name.toLowerCase().endsWith(".jpg") && !name.toLowerCase().endsWith(".jpeg")) {
                        name += ".png";
                    }

                    boolean saved = false;

                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                        try {
                            ContentValues values = new ContentValues();
                            values.put(MediaStore.Images.Media.DISPLAY_NAME, name);
                            values.put(MediaStore.Images.Media.MIME_TYPE, "image/png");
                            values.put(MediaStore.Images.Media.RELATIVE_PATH, Environment.DIRECTORY_PICTURES + "/CDmantencion");
                            values.put(MediaStore.Images.Media.IS_PENDING, 1);

                            Uri uri = getContentResolver().insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, values);
                            if (uri != null) {
                                try (OutputStream out = getContentResolver().openOutputStream(uri)) {
                                    if (out != null) {
                                        out.write(imageBytes);
                                        out.flush();
                                    }
                                }
                                values.clear();
                                values.put(MediaStore.Images.Media.IS_PENDING, 0);
                                getContentResolver().update(uri, values, null, null);
                                saved = true;
                            }
                        } catch (Exception qEx) {
                            android.util.Log.w("MainActivity", "Fallo inserción MediaStore Scoped, intentando fallback legacy", qEx);
                        }
                    }

                    if (!saved) {
                        File dir = new File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_PICTURES), "CDmantencion");
                        if (!dir.exists()) dir.mkdirs();
                        File file = new File(dir, name);
                        try (FileOutputStream fos = new FileOutputStream(file)) {
                            fos.write(imageBytes);
                            fos.flush();
                        }
                        MediaScannerConnection.scanFile(MainActivity.this, new String[]{file.getAbsolutePath()}, new String[]{"image/png"}, null);
                        saved = true;
                    }

                    if (saved) {
                        Toast.makeText(MainActivity.this, "✓ Código QR guardado en Galería (Fotos/CDmantencion): " + name, Toast.LENGTH_LONG).show();
                    } else {
                        Toast.makeText(MainActivity.this, "No se pudo guardar la imagen", Toast.LENGTH_SHORT).show();
                    }
                } catch (Exception e) {
                    android.util.Log.e("MainActivity", "Error guardando imagen QR", e);
                    Toast.makeText(MainActivity.this, "Error al guardar código QR: " + e.getMessage(), Toast.LENGTH_SHORT).show();
                }
            });
        }
    }

    private void checkForGitHubUpdate(boolean isManual) {
        if (!isNetworkAvailable()) {
            if (isManual) {
                Toast.makeText(this, "Sin conexión a internet para verificar actualizaciones.", Toast.LENGTH_SHORT).show();
            }
            return;
        }

        new Thread(() -> {
            HttpURLConnection conn = null;
            try {
                // 1. Consultar directamente los releases de GitHub
                URL url = new URL("https://api.github.com/repos/Patrox43-debug/Corrientes-Debiles/releases/latest");
                conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("GET");
                conn.setConnectTimeout(12000);
                conn.setReadTimeout(15000);
                conn.setRequestProperty("Accept", "application/vnd.github.v3+json");
                conn.setRequestProperty("User-Agent", "Mozilla/5.0 CDmantencion-Android-App");

                int code = conn.getResponseCode();
                String tagName = null;
                String downloadUrl = null;
                String releaseNotes = "";

                if (code == HttpURLConnection.HTTP_OK) {
                    InputStream is = conn.getInputStream();
                    java.util.Scanner s = new java.util.Scanner(is).useDelimiter("\\A");
                    String resp = s.hasNext() ? s.next() : "";
                    is.close();

                    JSONObject json = new JSONObject(resp);
                    tagName = json.optString("tag_name", "");
                    releaseNotes = json.optString("body", "");

                    org.json.JSONArray assets = json.optJSONArray("assets");
                    if (assets != null) {
                        String preferredName = "CDmantencion_" + tagName + ".apk";
                        for (int i = 0; i < assets.length(); i++) {
                            JSONObject asset = assets.getJSONObject(i);
                            String assetName = asset.optString("name", "");
                            if (assetName.endsWith(".apk")) {
                                if (downloadUrl == null || assetName.equals(preferredName) || assetName.equals("CDmantencion.apk")) {
                                    downloadUrl = asset.optString("browser_download_url", null);
                                    if (assetName.equals(preferredName)) {
                                        break;
                                    }
                                }
                            }
                        }
                    }
                }

                // Si no se obtuvo URL por los assets, usar la ruta directa de release
                if (downloadUrl == null && tagName != null && !tagName.isEmpty()) {
                    downloadUrl = "https://github.com/Patrox43-debug/Corrientes-Debiles/releases/download/" + tagName + "/CDmantencion_" + tagName + ".apk";
                }
                if (downloadUrl == null) {
                    downloadUrl = "https://github.com/Patrox43-debug/Corrientes-Debiles/releases/latest/download/CDmantencion.apk";
                }

                final String finalTag = tagName;
                final String finalDownloadUrl = downloadUrl;
                final String finalNotes = releaseNotes;

                if (finalTag != null && isNewerVersion(finalTag, BuildConfig.VERSION_NAME)) {
                    runOnUiThread(() -> {
                        showUpdatePromptDialog(finalTag, finalDownloadUrl, finalNotes);
                    });
                } else if (isManual) {
                    runOnUiThread(() -> {
                        Toast.makeText(MainActivity.this, "CDmantencion ya está actualizado (v" + BuildConfig.VERSION_NAME + ").", Toast.LENGTH_SHORT).show();
                    });
                }

            } catch (Exception e) {
                // Si la API de GitHub falla o excede cuota anónima, consultar el endpoint del servidor
                checkServerFallbackForUpdate(isManual);
            } finally {
                if (conn != null) conn.disconnect();
            }
        }).start();
    }

    private void checkServerFallbackForUpdate(boolean isManual) {
        new Thread(() -> {
            HttpURLConnection conn = null;
            try {
                URL url = new URL(APP_URL + "/api/app-version");
                conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("GET");
                conn.setConnectTimeout(8000);
                conn.setReadTimeout(10000);

                if (conn.getResponseCode() == HttpURLConnection.HTTP_OK) {
                    InputStream is = conn.getInputStream();
                    java.util.Scanner s = new java.util.Scanner(is).useDelimiter("\\A");
                    String resp = s.hasNext() ? s.next() : "";
                    is.close();

                    JSONObject json = new JSONObject(resp);
                    String verName = json.optString("version_name", "");
                    String downloadUrl = json.optString("download_url", "https://github.com/Patrox43-debug/Corrientes-Debiles/releases/latest/download/CDmantencion.apk");

                    if (!verName.isEmpty() && isNewerVersion(verName, BuildConfig.VERSION_NAME)) {
                        runOnUiThread(() -> {
                            showUpdatePromptDialog("v" + verName, downloadUrl, "");
                        });
                        return;
                    }
                }

                if (isManual) {
                    runOnUiThread(() -> {
                        Toast.makeText(MainActivity.this, "CDmantencion ya está en la versión más reciente (v" + BuildConfig.VERSION_NAME + ").", Toast.LENGTH_SHORT).show();
                    });
                }

            } catch (Exception ex) {
                if (isManual) {
                    runOnUiThread(() -> {
                        Toast.makeText(MainActivity.this, "No se pudo verificar actualizaciones en este momento.", Toast.LENGTH_SHORT).show();
                    });
                }
            } finally {
                if (conn != null) conn.disconnect();
            }
        }).start();
    }

    private void showUpdatePromptDialog(String newVersion, String downloadUrl, String notes) {
        // Notificar también a la interfaz web si estuviera escuchando
        if (webView != null) {
            String script = String.format(
                    Locale.US,
                    "if (window.app && window.app.onUpdateAvailable) { window.app.onUpdateAvailable({ version: '%s', downloadUrl: '%s' }); }",
                    newVersion.replaceAll("['\"]", ""),
                    downloadUrl.replaceAll("['\"]", "")
            );
            webView.evaluateJavascript(script, null);
        }

        String msg = "Se ha detectado una nueva versión en GitHub: " + newVersion + "\n(Tu versión actual instalada: v" + BuildConfig.VERSION_NAME + ").\n\n¿Deseas descargar e instalar la actualización ahora?";

        new androidx.appcompat.app.AlertDialog.Builder(this)
                .setTitle("⚡ Actualización de CDmantencion")
                .setMessage(msg)
                .setPositiveButton("Actualizar Ahora", (dialog, which) -> {
                    downloadAndInstallApk(downloadUrl, newVersion);
                })
                .setNegativeButton("Más tarde", null)
                .setCancelable(true)
                .show();
    }

    private boolean isNewerVersion(String remoteTag, String currentVersion) {
        if (remoteTag == null || currentVersion == null) return false;
        String cleanRemote = remoteTag.trim().replaceAll("^[vV]", "");
        String cleanCurrent = currentVersion.trim().replaceAll("^[vV]", "");
        if (cleanRemote.equalsIgnoreCase(cleanCurrent)) return false;

        String[] rParts = cleanRemote.split("\\.");
        String[] cParts = cleanCurrent.split("\\.");
        int len = Math.max(rParts.length, cParts.length);
        for (int i = 0; i < len; i++) {
            int r = 0;
            int c = 0;
            try {
                if (i < rParts.length) r = Integer.parseInt(rParts[i].replaceAll("[^0-9]", ""));
            } catch (Exception ignored) {}
            try {
                if (i < cParts.length) c = Integer.parseInt(cParts[i].replaceAll("[^0-9]", ""));
            } catch (Exception ignored) {}
            if (r > c) return true;
            if (r < c) return false;
        }
        return false;
    }

    private void installApkFile(File apkFile) {
        if (apkFile == null || !apkFile.exists()) {
            Toast.makeText(this, "El archivo APK de actualización no existe.", Toast.LENGTH_LONG).show();
            return;
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            if (!getPackageManager().canRequestPackageInstalls()) {
                pendingInstallApk = apkFile;
                Intent intent = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES);
                intent.setData(Uri.parse("package:" + getPackageName()));
                manageUnknownSourcesLauncher.launch(intent);
                return;
            }
        }

        launchInstallerIntent(apkFile);
    }

    private void launchInstallerIntent(File apkFile) {
        try {
            Uri contentUri = FileProvider.getUriForFile(
                    this,
                    getApplicationContext().getPackageName() + ".fileprovider",
                    apkFile
            );

            Intent installIntent = new Intent(Intent.ACTION_VIEW);
            installIntent.setDataAndType(contentUri, "application/vnd.android.package-archive");
            installIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            installIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);

            startActivity(installIntent);
        } catch (Exception e) {
            Toast.makeText(this, "Error al lanzar instalador: " + e.getMessage(), Toast.LENGTH_LONG).show();
        }
    }

    private void downloadAndInstallApk(String apkUrl) {
        downloadAndInstallApk(apkUrl, null);
    }

    private void downloadAndInstallApk(String apkUrl, String targetVersion) {
        if (apkUrl == null || apkUrl.trim().isEmpty()) {
            Toast.makeText(this, "URL de actualización no válida.", Toast.LENGTH_SHORT).show();
            return;
        }

        runOnUiThread(() -> {
            try {
                if (updateProgressDialog != null && updateProgressDialog.isShowing()) {
                    updateProgressDialog.dismiss();
                }
                updateProgressDialog = new android.app.ProgressDialog(MainActivity.this);
                updateProgressDialog.setTitle("Actualizando CDmantencion");
                updateProgressDialog.setMessage("Conectando con GitHub...");
                updateProgressDialog.setProgressStyle(android.app.ProgressDialog.STYLE_HORIZONTAL);
                updateProgressDialog.setMax(100);
                updateProgressDialog.setProgress(0);
                updateProgressDialog.setCancelable(false);
                updateProgressDialog.setCanceledOnTouchOutside(false);
                updateProgressDialog.show();
            } catch (Exception ignored) {}
        });

        new Thread(() -> {
            InputStream input = null;
            FileOutputStream output = null;
            HttpURLConnection connection = null;

            try {
                String currentUrl = apkUrl;
                int redirectCount = 0;
                while (redirectCount < 6) {
                    URL u = new URL(currentUrl);
                    connection = (HttpURLConnection) u.openConnection();
                    connection.setInstanceFollowRedirects(true);
                    connection.setConnectTimeout(25000);
                    connection.setReadTimeout(35000);
                    connection.setRequestProperty("User-Agent", "Mozilla/5.0 (Linux; Android) CDmantencion-Updater");

                    int status = connection.getResponseCode();
                    if (status == HttpURLConnection.HTTP_MOVED_TEMP ||
                        status == HttpURLConnection.HTTP_MOVED_PERM ||
                        status == HttpURLConnection.HTTP_SEE_OTHER ||
                        status == 307 || status == 308) {
                        currentUrl = connection.getHeaderField("Location");
                        connection.disconnect();
                        redirectCount++;
                        continue;
                    }
                    if (status != HttpURLConnection.HTTP_OK) {
                        throw new IOException("Error HTTP " + status + " al descargar APK desde GitHub");
                    }
                    break;
                }

                int fileLength = connection.getContentLength();
                File downloadDir = getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS);
                if (downloadDir == null) {
                    downloadDir = getCacheDir();
                }
                if (!downloadDir.exists()) {
                    downloadDir.mkdirs();
                }

                // Nombrar el archivo con el tag de la versión (ej. CDmantencion_v1.0.10.apk)
                String vClean = (targetVersion != null && !targetVersion.trim().isEmpty())
                        ? (targetVersion.startsWith("v") ? targetVersion : "v" + targetVersion)
                        : ("v" + BuildConfig.VERSION_NAME);
                String apkFileName = "CDmantencion_" + vClean + ".apk";
                File apkFile = new File(downloadDir, apkFileName);
                if (apkFile.exists()) {
                    apkFile.delete();
                }

                input = connection.getInputStream();
                output = new FileOutputStream(apkFile);

                byte[] data = new byte[8192];
                long total = 0;
                int count;
                long lastReportTime = 0;

                while ((count = input.read(data)) != -1) {
                    total += count;
                    output.write(data, 0, count);

                    long now = System.currentTimeMillis();
                    if (now - lastReportTime > 250) {
                        if (fileLength > 0) {
                            int percent = (int) (total * 100 / fileLength);
                            reportDownloadProgress(percent, String.format(Locale.US, "Descargando: %d%% (%.1f / %.1f MB)", percent, total / (1024.0 * 1024.0), fileLength / (1024.0 * 1024.0)));
                        } else {
                            reportDownloadProgress(50, String.format(Locale.US, "Descargando: %.1f MB...", total / (1024.0 * 1024.0)));
                        }
                        lastReportTime = now;
                    }
                }

                output.flush();
                try {
                    output.close();
                    output = null;
                } catch (Exception ignored) {}
                try {
                    if (input != null) {
                        input.close();
                        input = null;
                    }
                } catch (Exception ignored) {}

                try {
                    apkFile.setReadable(true, false);
                } catch (Exception ignored) {}

                reportDownloadProgress(100, "Descarga completada. Abriendo instalador...");

                runOnUiThread(() -> {
                    try {
                        if (updateProgressDialog != null && updateProgressDialog.isShowing()) {
                            updateProgressDialog.dismiss();
                            updateProgressDialog = null;
                        }
                    } catch (Exception ignored) {}
                    installApkFile(apkFile);
                });

            } catch (Exception e) {
                reportDownloadError(e.getMessage());
            } finally {
                try {
                    if (output != null) output.close();
                    if (input != null) input.close();
                } catch (Exception ignored) {}
                if (connection != null) connection.disconnect();
            }
        }).start();
    }

    private void reportDownloadProgress(int percent, String message) {
        runOnUiThread(() -> {
            if (updateProgressDialog != null && updateProgressDialog.isShowing()) {
                updateProgressDialog.setProgress(percent);
                if (message != null) {
                    updateProgressDialog.setMessage(message);
                }
                if (percent >= 100) {
                    updateProgressDialog.dismiss();
                    updateProgressDialog = null;
                }
            }
            if (webView != null) {
                String safeMsg = JSONObject.quote(message != null ? message : "");
                String script = "if (window.app && window.app.onUpdateDownloadProgress) { window.app.onUpdateDownloadProgress(" + percent + ", " + safeMsg + "); }";
                webView.evaluateJavascript(script, null);
            }
        });
    }

    private void reportDownloadError(String errorMsg) {
        runOnUiThread(() -> {
            if (updateProgressDialog != null && updateProgressDialog.isShowing()) {
                updateProgressDialog.dismiss();
                updateProgressDialog = null;
            }
            Toast.makeText(MainActivity.this, "Error de actualización: " + errorMsg, Toast.LENGTH_LONG).show();
            if (webView != null) {
                String safeMsg = JSONObject.quote(errorMsg != null ? errorMsg : "Error desconocido");
                String script = "if (window.app && window.app.onUpdateDownloadError) { window.app.onUpdateDownloadError(" + safeMsg + "); }";
                webView.evaluateJavascript(script, null);
            }
        });
    }
}
