package one.lme.earth;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.view.WindowInsets;
import android.webkit.*;
import android.widget.*;
import org.json.JSONObject;
import org.json.JSONTokener;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

/** Online companion: retains the production HTTPS origin and its existing authentication. */
public final class MainActivity extends Activity {
    private static final String HOME = "https://earth.lme.one/";
    private static final int SAVE_BACKUP = 17;
    private WebView web;
    private ProgressBar progress;
    private LinearLayout error;
    private String pendingBackup;
    private boolean failed;

    private boolean trusted(String url) {
        if (url == null) return false;
        Uri uri = Uri.parse(url);
        return "https".equals(uri.getScheme()) && "earth.lme.one".equals(uri.getHost())
            && (uri.getPort() == -1 || uri.getPort() == 443) && uri.getUserInfo() == null;
    }

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(Color.rgb(247,246,240));
        if (Build.VERSION.SDK_INT >= 30) {
            getWindow().setDecorFitsSystemWindows(false);
            root.setOnApplyWindowInsetsListener((v, insets) -> {
                android.graphics.Insets safe = insets.getInsets(WindowInsets.Type.systemBars() | WindowInsets.Type.displayCutout() | WindowInsets.Type.ime());
                v.setPadding(safe.left, safe.top, safe.right, safe.bottom);
                return insets;
            });
        }
        LinearLayout bar = new LinearLayout(this);
        bar.setGravity(Gravity.CENTER_VERTICAL);
        TextView title = new TextView(this);
        title.setText("  ◎  地球 Online");
        title.setTextColor(Color.rgb(62,91,75));
        title.setTextSize(16);
        bar.addView(title, new LinearLayout.LayoutParams(0, dp(44), 1));
        Button menu = new Button(this);
        menu.setText("更多");
        menu.setContentDescription("应用菜单");
        bar.addView(menu, new LinearLayout.LayoutParams(dp(76), dp(44)));
        menu.setOnClickListener(v -> new AlertDialog.Builder(this).setTitle("地球 Online")
            .setItems(new String[]{"导出我的记录", "重新加载页面", "用浏览器打开", "关于安装版"}, (dialog, item) -> {
                if (item == 0) exportBackup();
                if (item == 1) new AlertDialog.Builder(this).setMessage("重新加载前，请确认正在编辑的内容已保存。")
                    .setNegativeButton("继续编辑", null).setPositiveButton("重新加载", (d,w) -> web.reload()).show();
                if (item == 2) external(HOME);
                if (item == 3) new AlertDialog.Builder(this).setTitle("地球 Online · 0.1.0")
                    .setMessage("在自己的时区里，慢慢生活。\n\n这是联网安装版，与网页使用同一个云端账号。首次需要登录；AI 配置仅保留在本应用。浏览器里的游客记录和密钥不会自动迁移。\n\n卸载或清除应用数据前，请先同步或导出备份。")
                    .setPositiveButton("知道了", null).show();
            }).show());
        root.addView(bar);
        progress = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal);
        root.addView(progress, new LinearLayout.LayoutParams(-1, dp(2)));
        FrameLayout content = new FrameLayout(this);
        root.addView(content, new LinearLayout.LayoutParams(-1, 0, 1));
        web = new WebView(this);
        web.setBackgroundColor(Color.rgb(247,246,240));
        content.addView(web, new FrameLayout.LayoutParams(-1,-1));
        error = new LinearLayout(this);
        error.setOrientation(LinearLayout.VERTICAL);
        error.setGravity(Gravity.CENTER);
        error.setPadding(dp(28),dp(28),dp(28),dp(28));
        error.setBackgroundColor(Color.rgb(247,246,240));
        TextView message = new TextView(this);
        message.setText("暂时没能打开这个小世界\n\n请检查网络后重试。应用里的本机记录没有被清除。");
        message.setTextSize(17);
        message.setGravity(Gravity.CENTER);
        error.addView(message);
        Button retry = new Button(this);
        retry.setText("再试一次");
        retry.setOnClickListener(v -> web.loadUrl(HOME));
        error.addView(retry);
        error.setVisibility(View.GONE);
        content.addView(error,new FrameLayout.LayoutParams(-1,-1));
        setContentView(root);
        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setSupportMultipleWindows(false);
        settings.setUserAgentString(settings.getUserAgentString() + " EarthOnlineAndroid/0.1.0");
        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(web, false);
        web.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                String url = request.getUrl().toString();
                if (trusted(url)) return false;
                if (request.isForMainFrame() && request.hasGesture()) external(url);
                return true;
            }
            @Override public void onPageStarted(WebView view, String url, android.graphics.Bitmap icon) {
                failed = false;
                error.setVisibility(View.GONE);
                progress.setVisibility(View.VISIBLE);
            }
            @Override public void onPageFinished(WebView view, String url) {
                progress.setVisibility(View.GONE);
                if (!failed) error.setVisibility(View.GONE);
                CookieManager.getInstance().flush();
            }
            @Override public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError failure) {
                if (request.isForMainFrame()) showError();
            }
            @Override public void onReceivedHttpError(WebView view, WebResourceRequest request, WebResourceResponse response) {
                if (request.isForMainFrame() && response.getStatusCode() >= 400) showError();
            }
            @Override public void onReceivedSslError(WebView view, SslErrorHandler handler, android.net.http.SslError problem) {
                handler.cancel();
                showError();
            }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override public void onProgressChanged(WebView view, int value) { progress.setProgress(value); }
            @Override public boolean onJsAlert(WebView view, String url, String message, JsResult result) {
                new AlertDialog.Builder(MainActivity.this).setMessage(message).setPositiveButton("知道了",(d,w)->result.confirm())
                    .setOnCancelListener(d->result.cancel()).show(); return true;
            }
            @Override public boolean onJsConfirm(WebView view, String url, String message, JsResult result) {
                new AlertDialog.Builder(MainActivity.this).setMessage(message).setPositiveButton("确定",(d,w)->result.confirm())
                    .setNegativeButton("取消",(d,w)->result.cancel()).setOnCancelListener(d->result.cancel()).show(); return true;
            }
        });
        // The site exports only world JSON via blob URLs. Reconstruct that same public
        // export schema in the main frame; no JavascriptInterface or arbitrary file bridge.
        web.setDownloadListener((url, ua, disposition, mime, length) -> {
            if (url.startsWith("blob:https://earth.lme.one/") && trusted(web.getUrl())) exportBackup();
            else Toast.makeText(this,"请使用应用菜单中的导出我的记录",Toast.LENGTH_LONG).show();
        });
        if (state == null || web.restoreState(state) == null) web.loadUrl(HOME);
    }

    private int dp(int value) { return Math.round(value * getResources().getDisplayMetrics().density); }
    private void showError() { failed = true; error.setVisibility(View.VISIBLE); progress.setVisibility(View.GONE); }
    private void external(String url) {
        Uri uri = Uri.parse(url);
        if (!"https".equals(uri.getScheme()) && !"mailto".equals(uri.getScheme())) return;
        try { startActivity(new Intent(Intent.ACTION_VIEW, uri).addCategory(Intent.CATEGORY_BROWSABLE)); }
        catch (android.content.ActivityNotFoundException e) { Toast.makeText(this,"没有找到可打开此链接的应用",Toast.LENGTH_LONG).show(); }
    }

    private void exportBackup() {
        if (!trusted(web.getUrl()) || pendingBackup != null) return;
        web.evaluateJavascript("(()=>{try{if(!window.EarthAccount)return null;return JSON.stringify({format:'earth-online-backup-v2',exportedAt:new Date().toISOString(),world:window.EarthAccount.current()});}catch(e){return null;}})()", value -> {
            try {
                Object decoded = new JSONTokener(value).nextValue();
                if (!(decoded instanceof String) || ((String)decoded).length() > 400000) throw new Exception();
                JSONObject backup = new JSONObject((String)decoded);
                if (!"earth-online-backup-v2".equals(backup.getString("format"))) throw new Exception();
                backup.getJSONObject("world");
                pendingBackup = backup.toString(2);
                Intent save = new Intent(Intent.ACTION_CREATE_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE)
                    .setType("application/json").putExtra(Intent.EXTRA_TITLE,"地球Online-我的世界.json");
                startActivityForResult(save, SAVE_BACKUP);
            } catch (Exception e) {
                pendingBackup = null;
                Toast.makeText(this,"暂时无法导出，请等待页面加载完成后再试",Toast.LENGTH_LONG).show();
            }
        });
    }
    @Override protected void onActivityResult(int request, int result, Intent data) {
        super.onActivityResult(request,result,data);
        if (request != SAVE_BACKUP) return;
        String backup = pendingBackup;
        pendingBackup = null;
        if (result != RESULT_OK || data == null || data.getData() == null) return;
        if (backup == null) { Toast.makeText(this,"导出已中断，请重试",Toast.LENGTH_LONG).show(); return; }
        try (OutputStream stream = getContentResolver().openOutputStream(data.getData(),"wt")) {
            if (stream == null) throw new Exception();
            stream.write(backup.getBytes(StandardCharsets.UTF_8));
            Toast.makeText(this,"备份已保存（不包含 AI 密钥）",Toast.LENGTH_LONG).show();
        } catch (Exception e) { Toast.makeText(this,"没有保存成功，请换一个位置重试",Toast.LENGTH_LONG).show(); }
    }
    @Override protected void onSaveInstanceState(Bundle state) { super.onSaveInstanceState(state); web.saveState(state); }
    @Override protected void onPause() { super.onPause(); CookieManager.getInstance().flush(); web.onPause(); }
    @Override protected void onResume() { super.onResume(); if(web!=null) web.onResume(); }
    @Override public void onBackPressed() {
        if (trusted(web.getUrl())) {
            web.evaluateJavascript("(()=>{const d=document.querySelector('dialog[open]');if(!d)return false;const b=d.querySelector('button[aria-label=\"关闭\"]');if(b){b.click();return true;}return false;})()", closed -> {
                if (!"true".equals(closed)) { if(web.canGoBack()) web.goBack(); else moveTaskToBack(true); }
            });
        } else if (web.canGoBack()) web.goBack(); else moveTaskToBack(true);
    }
    @Override protected void onDestroy() { web.destroy(); super.onDestroy(); }
}
