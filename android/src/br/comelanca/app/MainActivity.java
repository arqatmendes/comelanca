package br.comelanca.app;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.Charset;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;

/**
 * Comelança: o app (pasta assets/www) roda num WebView servido pela origem segura
 * https://appassets.androidplatform.net/, sem acesso a arquivos do aparelho.
 */
public class MainActivity extends Activity {
    private static final String ASSET_HOST = "appassets.androidplatform.net";
    private static final String START_URL = "https://" + ASSET_HOST + "/www/index.html";
    private static final String[] HTTP_ALLOWED = { "tudogostoso.com.br", "receitas.globo.com", "alimentandocomamor.com.br" };
    private static final int MAX_BYTES = 3 * 1024 * 1024;
    private static final int FILE_REQ = 41;
    private static final int SAVE_REQ = 42;

    private WebView web;
    private volatile boolean destroyed = false;
    private ValueCallback<Uri[]> fileCallback;
    private String pendingSave;
    private SharedPreferences prefs;

    @Override
    protected void onCreate(Bundle b) {
        super.onCreate(b);
        prefs = getSharedPreferences("comelanca", MODE_PRIVATE);
        web = new WebView(this);
        web.setBackgroundColor(0xFFFBF8F2);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setAllowFileAccessFromFileURLs(false);
        s.setAllowUniversalAccessFromFileURLs(false);
        web.addJavascriptInterface(new Bridge(), "NativeHttp");
        web.setWebViewClient(new Client());
        web.setWebChromeClient(new Chrome());
        setContentView(web);

        if (!prefs.getBoolean("migrated_v13", false)) {
            // Versões até 1.2 guardavam os dados na origem file://. Lê uma última vez e depois desliga o acesso a arquivos.
            s.setAllowFileAccess(true);
            web.loadUrl("file:///android_asset/www/migrate.html");
        } else {
            s.setAllowFileAccess(false);
            web.loadUrl(START_URL);
        }
    }

    @Override
    protected void onDestroy() {
        destroyed = true;
        if (web != null) { web.removeJavascriptInterface("NativeHttp"); web.destroy(); }
        super.onDestroy();
    }

    @Override
    public void onBackPressed() {
        web.evaluateJavascript("window.onAndroidBack ? window.onAndroidBack() : false", new ValueCallback<String>() {
            public void onReceiveValue(String value) {
                if (!"true".equals(value)) finish();
            }
        });
    }

    private void js(final String code) {
        runOnUiThread(new Runnable() { public void run() { if (!destroyed && web != null) web.evaluateJavascript(code, null); } });
    }

    private void openExternal(Uri uri) {
        String sch = uri.getScheme();
        if (!"https".equalsIgnoreCase(sch) && !"http".equalsIgnoreCase(sch)) return; // ignora mailto:, intent:, javascript: etc.
        try {
            startActivity(new Intent(Intent.ACTION_VIEW, uri));
        } catch (ActivityNotFoundException e) {
            js("window.__toast && window.__toast('Não há navegador para abrir o link')");
        } catch (Exception ignored) { }
    }

    // ---------- Servidor local dos arquivos do app ----------
    private static final Map<String, String> MIME;
    static {
        Map<String, String> m = new HashMap<String, String>();
        m.put("html", "text/html"); m.put("js", "text/javascript"); m.put("css", "text/css");
        m.put("json", "application/json"); m.put("webmanifest", "application/manifest+json");
        m.put("png", "image/png"); m.put("svg", "image/svg+xml"); m.put("woff2", "font/woff2"); m.put("txt", "text/plain");
        MIME = Collections.unmodifiableMap(m);
    }

    private WebResourceResponse asset(Uri uri) {
        String path = uri.getPath();
        if (path == null || path.contains("..")) return notFound();
        if (path.startsWith("/")) path = path.substring(1);
        if (path.endsWith("/")) path += "index.html";
        if (!path.startsWith("www/")) return notFound();
        String ext = path.substring(path.lastIndexOf('.') + 1).toLowerCase();
        String mime = MIME.containsKey(ext) ? MIME.get(ext) : "application/octet-stream";
        try {
            InputStream in = getAssets().open(path);
            WebResourceResponse r = new WebResourceResponse(mime, "UTF-8", in);
            Map<String, String> h = new HashMap<String, String>();
            h.put("Cache-Control", "no-cache");
            r.setResponseHeaders(h);
            return r;
        } catch (Exception e) {
            return notFound();
        }
    }

    private WebResourceResponse notFound() {
        return new WebResourceResponse("text/plain", "UTF-8", 404, "Not Found", new HashMap<String, String>(), new java.io.ByteArrayInputStream(new byte[0]));
    }

    class Client extends WebViewClient {
        @Override
        public WebResourceResponse shouldInterceptRequest(WebView v, WebResourceRequest req) {
            Uri u = req.getUrl();
            if (ASSET_HOST.equalsIgnoreCase(u.getHost())) return asset(u);
            return null;
        }

        // API 24+ (sem @Override porque o projeto compila contra a API 23)
        public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest req) {
            return handle(req.getUrl());
        }

        @Override
        @SuppressWarnings("deprecation")
        public boolean shouldOverrideUrlLoading(WebView v, String url) {
            return handle(Uri.parse(url));
        }

        private boolean handle(Uri u) {
            if (ASSET_HOST.equalsIgnoreCase(u.getHost())) return false;
            if ("file".equals(u.getScheme()) && !prefs.getBoolean("migrated_v13", false)) return false;
            openExternal(u);
            return true;
        }
    }

    class Chrome extends WebChromeClient {
        @Override
        public boolean onShowFileChooser(WebView v, ValueCallback<Uri[]> cb, FileChooserParams params) {
            if (fileCallback != null) fileCallback.onReceiveValue(null);
            fileCallback = cb;
            boolean pdf = false;
            String[] types = params.getAcceptTypes();
            if (types != null) for (String t : types) if (t != null && t.toLowerCase().contains("pdf")) pdf = true;
            Intent i = new Intent(Intent.ACTION_GET_CONTENT);
            i.addCategory(Intent.CATEGORY_OPENABLE);
            i.setType(pdf ? "application/pdf" : "*/*");
            try {
                startActivityForResult(Intent.createChooser(i, pdf ? "Escolha o cardápio (PDF)" : "Escolha o arquivo"), FILE_REQ);
            } catch (Exception e) {
                fileCallback = null;
                return false;
            }
            return true;
        }
    }

    @Override
    protected void onActivityResult(int req, int res, Intent data) {
        if (req == FILE_REQ) {
            if (fileCallback != null) {
                Uri[] r = null;
                if (res == RESULT_OK && data != null && data.getData() != null) r = new Uri[]{ data.getData() };
                fileCallback.onReceiveValue(r);
                fileCallback = null;
            }
            return;
        }
        if (req == SAVE_REQ) {
            boolean ok = false;
            if (res == RESULT_OK && data != null && data.getData() != null && pendingSave != null) {
                OutputStream out = null;
                try {
                    out = getContentResolver().openOutputStream(data.getData());
                    out.write(pendingSave.getBytes("UTF-8"));
                    ok = true;
                } catch (Exception ignored) {
                } finally {
                    try { if (out != null) out.close(); } catch (Exception ignored) { }
                }
            }
            pendingSave = null;
            js("window.__onNativeFileSaved && window.__onNativeFileSaved(" + ok + ")");
            return;
        }
        super.onActivityResult(req, res, data);
    }

    private static boolean allowedHost(String host) {
        if (host == null) return false;
        host = host.toLowerCase();
        for (String d : HTTP_ALLOWED) if (host.equals(d) || host.endsWith("." + d)) return true;
        return false;
    }

    private File migrationFile() { return new File(getFilesDir(), "migration.json"); }

    class Bridge {
        /** Busca uma página de receitas (só nos sites permitidos). */
        @JavascriptInterface
        public void get(final String id, final String url) {
            new Thread(new Runnable() { public void run() {
                String result;
                boolean ok = false;
                HttpURLConnection c = null;
                try {
                    URL u = new URL(url);
                    if (!"https".equals(u.getProtocol()) || !allowedHost(u.getHost())) throw new Exception("site não permitido");
                    c = (HttpURLConnection) u.openConnection();
                    c.setConnectTimeout(15000);
                    c.setReadTimeout(20000);
                    c.setInstanceFollowRedirects(true);
                    c.setRequestProperty("User-Agent", "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Mobile Safari/537.36");
                    c.setRequestProperty("Accept-Language", "pt-BR,pt;q=0.9");
                    int code = c.getResponseCode();
                    if (!allowedHost(c.getURL().getHost())) throw new Exception("redirecionado para outro site");
                    InputStream in = code >= 400 ? c.getErrorStream() : c.getInputStream();
                    ByteArrayOutputStream out = new ByteArrayOutputStream();
                    byte[] buf = new byte[8192];
                    int n, total = 0;
                    if (in != null) {
                        while ((n = in.read(buf)) > 0) {
                            total += n;
                            if (total > MAX_BYTES) break; // limite de tamanho
                            out.write(buf, 0, n);
                        }
                        in.close();
                    }
                    result = new String(out.toByteArray(), charsetOf(c.getContentType()));
                    ok = code < 400;
                } catch (Exception e) {
                    result = String.valueOf(e.getMessage());
                } finally {
                    if (c != null) c.disconnect();
                }
                js("window.__nativeHttpDone && window.__nativeHttpDone(" + q(id) + "," + ok + "," + q(result) + ")");
            }}).start();
        }

        @JavascriptInterface
        public void share(final String text) {
            runOnUiThread(new Runnable() { public void run() {
                try {
                    Intent i = new Intent(Intent.ACTION_SEND);
                    i.setType("text/plain");
                    i.putExtra(Intent.EXTRA_TEXT, text.length() > 100000 ? text.substring(0, 100000) : text);
                    startActivity(Intent.createChooser(i, "Compartilhar"));
                } catch (Exception ignored) { }
            }});
        }

        /** Salva um arquivo (backup) onde a pessoa escolher. */
        @JavascriptInterface
        public void saveFile(final String name, final String text) {
            runOnUiThread(new Runnable() { public void run() {
                pendingSave = text;
                Intent i = new Intent(Intent.ACTION_CREATE_DOCUMENT);
                i.addCategory(Intent.CATEGORY_OPENABLE);
                i.setType("application/json");
                i.putExtra(Intent.EXTRA_TITLE, name);
                try {
                    startActivityForResult(i, SAVE_REQ);
                } catch (Exception e) {
                    pendingSave = null;
                    js("window.__onNativeFileSaved && window.__onNativeFileSaved(false)");
                }
            }});
        }

        /** Chamado por migrate.html (origem antiga file://) com os dados guardados até a versão 1.2. */
        @JavascriptInterface
        public void migrate(final String data) {
            runOnUiThread(new Runnable() { public void run() {
                if (prefs.getBoolean("migrated_v13", false)) return;
                try {
                    if (data != null && data.length() > 0) {
                        FileOutputStream out = new FileOutputStream(migrationFile());
                        out.write(data.getBytes("UTF-8"));
                        out.close();
                    }
                } catch (Exception ignored) { }
                prefs.edit().putBoolean("migrated_v13", true).apply();
                web.getSettings().setAllowFileAccess(false);
                web.loadUrl(START_URL);
            }});
        }

        /** Entrega (uma única vez) os dados migrados para a nova origem. */
        @JavascriptInterface
        public String takeMigration() {
            File f = migrationFile();
            if (!f.exists()) return "";
            try {
                FileInputStream in = new FileInputStream(f);
                ByteArrayOutputStream out = new ByteArrayOutputStream();
                byte[] buf = new byte[8192];
                int n;
                while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
                in.close();
                f.delete();
                return new String(out.toByteArray(), "UTF-8");
            } catch (Exception e) {
                return "";
            }
        }
    }

    static Charset charsetOf(String contentType) {
        if (contentType != null) {
            for (String part : contentType.split(";")) {
                part = part.trim();
                if (part.toLowerCase().startsWith("charset=")) {
                    try { return Charset.forName(part.substring(8).replace("\"", "").trim()); } catch (Exception ignored) { }
                }
            }
        }
        return Charset.forName("UTF-8");
    }

    static String q(String s) {
        if (s == null) s = "";
        StringBuilder sb = new StringBuilder("\"");
        for (int i = 0; i < s.length(); i++) {
            char ch = s.charAt(i);
            switch (ch) {
                case '"': sb.append("\\\""); break;
                case '\\': sb.append("\\\\"); break;
                case '\n': sb.append("\\n"); break;
                case '\r': sb.append("\\r"); break;
                case '\t': sb.append("\\t"); break;
                case ' ': sb.append("\\u2028"); break;
                case ' ': sb.append("\\u2029"); break;
                default:
                    if (ch < 0x20 || ch == '<') sb.append(String.format("\\u%04x", (int) ch));
                    else sb.append(ch);
            }
        }
        return sb.append("\"").toString();
    }
}
