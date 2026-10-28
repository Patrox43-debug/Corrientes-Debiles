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
import java.io.IOException;
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
        setupSwipeRefresh();
        setupBackNavigation();

        hideErrorScreen();
        webView.loadUrl(APP_URL);
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
                    boolean cameraGranted = permissions.getOrDefault(Manifest.permission.CAMERA, false);
                    if (cameraGranted && currentPermissionRequest != null) {
                        currentPermissionRequest.grant(currentPermissionRequest.getResources());
                        currentPermissionRequest = null;
                    }
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
        settings.setLoadWithOverviewMode(true);
        settings.setUseWideViewPort(true);
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        settings.setMediaPlaybackRequiresUserGesture(false);

        webView.setBackgroundColor(ContextCompat.getColor(this, R.color.app_bg_dark));
        swipeRefreshLayout.setBackgroundColor(ContextCompat.getColor(this, R.color.app_bg_dark));

        String defaultUa = settings.getUserAgentString();
        settings.setUserAgentString(defaultUa + " CDmantencion_Android_App/1.0");

        CookieManager cookieManager = CookieManager.getInstance();
        cookieManager.setAcceptCookie(true);
        cookieManager.setAcceptThirdPartyCookies(webView, true);

        webView.addJavascriptInterface(new AndroidBridge(), "AndroidBridge");

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                String path = uri.getPath();

                if (path == null || path.equals("/") || path.equals("/index.html")) {
                    WebResourceResponse resp = getAssetResponse("index.html", "text/html");
                    if (resp != null) return resp;
                } else if (path.startsWith("/static/")) {
                    String assetPath = path.substring(1);
                    int qIdx = assetPath.indexOf('?');
                    if (qIdx != -1) {
                        assetPath = assetPath.substring(0, qIdx);
                    }
                    String mime = getMimeType(assetPath);
                    WebResourceResponse response = getAssetResponse(assetPath, mime);
                    if (response != null) {
                        return response;
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
                if (request.isForMainFrame() && !request.getUrl().toString().contains("mantencion.cfelbc.cl")) {
                    showErrorScreen();
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
                currentPermissionRequest = request;
                if (ContextCompat.checkSelfPermission(MainActivity.this, Manifest.permission.CAMERA)
                        == PackageManager.PERMISSION_GRANTED) {
                    request.grant(request.getResources());
                    currentPermissionRequest = null;
                } else {
                    permissionsLauncher.launch(new String[]{Manifest.permission.CAMERA});
                }
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
        Toast.makeText(this, "Descargando actualización de CDmantencion...", Toast.LENGTH_SHORT).show();

        new Thread(() -> {
            InputStream input = null;
            FileOutputStream output = null;
            HttpURLConnection connection = null;

            try {
                String currentUrl = apkUrl;
                int redirectCount = 0;
                while (redirectCount < 5) {
                    URL u = new URL(currentUrl);
                    connection = (HttpURLConnection) u.openConnection();
                    connection.setInstanceFollowRedirects(true);
                    connection.setConnectTimeout(20000);
                    connection.setReadTimeout(30000);
                    connection.setRequestProperty("User-Agent", "Mozilla/5.0 CDmantencion-Android-Updater");

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
                        throw new IOException("El servidor respondió con código HTTP " + status);
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

                File apkFile = new File(downloadDir, "cdmantencion_update.apk");
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
                    if (now - lastReportTime > 200) {
                        if (fileLength > 0) {
                            int percent = (int) (total * 100 / fileLength);
                            reportDownloadProgress(percent, String.format(Locale.US, "Descargando: %d%% (%.1f / %.1f MB)", percent, total / (1024.0 * 1024.0), fileLength / (1024.0 * 1024.0)));
                        } else {
                            reportDownloadProgress(50, String.format(Locale.US, "Descargando: %.1f MB", total / (1024.0 * 1024.0)));
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
                    Toast.makeText(MainActivity.this, "Descarga completada. Abriendo instalador...", Toast.LENGTH_SHORT).show();
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
            if (webView != null) {
                String safeMsg = JSONObject.quote(message != null ? message : "");
                String script = "if (window.app && window.app.onUpdateDownloadProgress) { window.app.onUpdateDownloadProgress(" + percent + ", " + safeMsg + "); }";
                webView.evaluateJavascript(script, null);
            }
        });
    }

    private void reportDownloadError(String errorMsg) {
        runOnUiThread(() -> {
            Toast.makeText(MainActivity.this, "Error de actualización: " + errorMsg, Toast.LENGTH_LONG).show();
            if (webView != null) {
                String safeMsg = JSONObject.quote(errorMsg != null ? errorMsg : "Error desconocido");
                String script = "if (window.app && window.app.onUpdateDownloadError) { window.app.onUpdateDownloadError(" + safeMsg + "); }";
                webView.evaluateJavascript(script, null);
            }
        });
    }
}
