package id.komsi.rupalibrary.admin

import android.annotation.SuppressLint
import android.app.Activity
import android.content.Intent
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.net.Uri
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.Gravity
import android.view.View
import android.webkit.CookieManager
import android.webkit.SslErrorHandler
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Button
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.TextView
import android.widget.Toast
import android.webkit.ValueCallback
import android.webkit.WebChromeClient.FileChooserParams
import android.net.http.SslError

class MainActivity : Activity() {
    private lateinit var webView: WebView
    private lateinit var progress: ProgressBar
    private lateinit var offlinePanel: LinearLayout
    private var uploadCallback: ValueCallback<Array<Uri>>? = null
    private val lime = Color.rgb(216, 243, 106)
    private val ink = Color.rgb(17, 19, 21)
    private val handler = Handler(Looper.getMainLooper())

    companion object {
        private const val DASHBOARD_URL = "https://vanzpro123.github.io/Komsi-Rupa-Library-/"
        private const val FILE_PICKER_REQUEST = 4102
        private val TRUSTED_HOSTS = setOf(
            "vanzpro123.github.io",
            "odcxkypwvhmpliuntmdc.supabase.co",
            "accounts.google.com"
        )
    }

    private fun dp(value: Int): Int = (value * resources.displayMetrics.density).toInt()

    private fun roundedBackground(color: Int, radius: Int): GradientDrawable =
        GradientDrawable().apply { setColor(color); cornerRadius = dp(radius).toFloat() }

    private fun label(text: String, size: Float, color: Int, bold: Boolean = false): TextView =
        TextView(this).apply {
            this.text = text
            textSize = size
            setTextColor(color)
            if (bold) setTypeface(typeface, Typeface.BOLD)
            gravity = Gravity.CENTER_VERTICAL
        }

    private fun navButton(title: String, icon: String, action: () -> Unit): TextView =
        TextView(this).apply {
            text = "$icon\n$title"
            textSize = 11f
            setTextColor(Color.rgb(220, 222, 218))
            gravity = Gravity.CENTER
            isClickable = true
            isFocusable = true
            setPadding(dp(4), dp(5), dp(4), dp(5))
            setOnClickListener { action() }
            layoutParams = LinearLayout.LayoutParams(0, -1, 1f)
        }

    private fun runPageAction(script: String) {
        webView.evaluateJavascript(script, null)
    }

    private fun openDashboard() {
        runPageAction("document.querySelector('#adminOpen')?.click();")
        handler.postDelayed({
            runPageAction("document.querySelector('#adminStats')?.scrollIntoView({behavior:'smooth',block:'start'});")
        }, 650)
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.statusBarColor = ink
        window.navigationBarColor = ink

        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundColor(Color.WHITE)
        }

        val header = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            setPadding(dp(18), 0, dp(16), 0)
            setBackgroundColor(ink)
            layoutParams = LinearLayout.LayoutParams(-1, dp(62))
        }
        val brand = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER_VERTICAL
            layoutParams = LinearLayout.LayoutParams(0, -1, 1f)
            addView(label("KOMSI RUPA", 16f, Color.WHITE, true))
            addView(label("ADMIN LIBRARY  ·  RUANG KARYA", 9f, lime, true))
        }
        header.addView(brand)
        header.addView(TextView(this).apply {
            text = "ADMIN"
            textSize = 10f
            setTextColor(ink)
            setTypeface(typeface, Typeface.BOLD)
            gravity = Gravity.CENTER
            setPadding(dp(12), dp(7), dp(12), dp(7))
            background = roundedBackground(lime, 20)
        })

        val contentFrame = FrameLayout(this).apply {
            layoutParams = LinearLayout.LayoutParams(-1, 0, 1f)
        }
        webView = WebView(this)
        progress = ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal).apply {
            isIndeterminate = false
            max = 100
            progressTintList = android.content.res.ColorStateList.valueOf(Color.rgb(216, 243, 106))
            progressBackgroundTintList = android.content.res.ColorStateList.valueOf(Color.TRANSPARENT)
        }
        offlinePanel = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            setPadding(dp(32), dp(32), dp(32), dp(32))
            setBackgroundColor(Color.WHITE)
            visibility = View.GONE
            addView(TextView(this@MainActivity).apply {
                text = "Koneksi belum tersedia"
                textSize = 20f
                setTextColor(ink)
                gravity = Gravity.CENTER
                setTypeface(typeface, Typeface.BOLD)
            })
            addView(TextView(this@MainActivity).apply {
                text = "Periksa internet kamu, lalu coba muat dashboard kembali."
                textSize = 14f
                setTextColor(Color.DKGRAY)
                gravity = Gravity.CENTER
                setPadding(0, dp(12), 0, dp(20))
            })
            addView(Button(this@MainActivity).apply {
                text = "Coba lagi"
                setOnClickListener {
                    visibility = View.GONE
                    webView.loadUrl(DASHBOARD_URL)
                }
            })
        }
        contentFrame.addView(webView, FrameLayout.LayoutParams(-1, -1))
        contentFrame.addView(progress, FrameLayout.LayoutParams(-1, dp(3), Gravity.TOP))
        contentFrame.addView(offlinePanel, FrameLayout.LayoutParams(-1, -1))

        val bottomNav = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER
            setBackgroundColor(ink)
            setPadding(dp(5), dp(3), dp(5), dp(3))
            layoutParams = LinearLayout.LayoutParams(-1, dp(64))
        }
        bottomNav.addView(navButton("Beranda", "⌂") {
            runPageAction("window.scrollTo({top:0,behavior:'smooth'});")
        })
        bottomNav.addView(navButton("Dashboard", "▦") { openDashboard() })
        bottomNav.addView(navButton("Notifikasi", "♧") {
            runPageAction("document.querySelector('#notificationOpen')?.click();")
        })
        bottomNav.addView(navButton("Akun", "◎") {
            runPageAction("document.querySelector('#adminOpen')?.click();")
        })

        root.addView(header)
        root.addView(contentFrame)
        root.addView(bottomNav)
        setContentView(root)

        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            loadsImagesAutomatically = true
            javaScriptCanOpenWindowsAutomatically = false
            setSupportMultipleWindows(false)
            mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
            allowFileAccess = false
            allowContentAccess = true
            cacheMode = WebSettings.LOAD_DEFAULT
            userAgentString = "$userAgentString KOMSIAdminAndroid/2.0"
        }
        CookieManager.getInstance().apply {
            setAcceptCookie(true)
            setAcceptThirdPartyCookies(webView, true)
        }
        webView.setBackgroundColor(Color.WHITE)
        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                val uri = request.url
                if (uri.scheme == "https" && uri.host in TRUSTED_HOSTS) return false
                return try {
                    startActivity(Intent(Intent.ACTION_VIEW, uri))
                    true
                } catch (_: Exception) {
                    Toast.makeText(this@MainActivity, "Tautan tidak dapat dibuka", Toast.LENGTH_SHORT).show()
                    true
                }
            }
            override fun onPageStarted(view: WebView, url: String?, favicon: android.graphics.Bitmap?) {
                progress.visibility = View.VISIBLE
                offlinePanel.visibility = View.GONE
            }
            override fun onPageFinished(view: WebView, url: String?) {
                progress.visibility = View.GONE
                offlinePanel.visibility = View.GONE
            }
            override fun onReceivedError(view: WebView, request: WebResourceRequest, error: WebResourceError) {
                if (request.isForMainFrame) {
                    progress.visibility = View.GONE
                    offlinePanel.visibility = View.VISIBLE
                }
            }
            override fun onReceivedSslError(view: WebView, handler: SslErrorHandler, error: SslError) {
                handler.cancel()
            }
        }
        webView.webChromeClient = object : WebChromeClient() {
            override fun onProgressChanged(view: WebView, newProgress: Int) {
                progress.progress = newProgress
                progress.visibility = if (newProgress >= 100) View.GONE else View.VISIBLE
            }
            override fun onShowFileChooser(
                view: WebView,
                filePathCallback: ValueCallback<Array<Uri>>,
                fileChooserParams: FileChooserParams
            ): Boolean {
                uploadCallback?.onReceiveValue(null)
                uploadCallback = filePathCallback
                return try {
                    startActivityForResult(fileChooserParams.createIntent(), FILE_PICKER_REQUEST)
                    true
                } catch (_: Exception) {
                    uploadCallback = null
                    false
                }
            }
        }

        if (savedInstanceState == null) webView.loadUrl(DASHBOARD_URL)
        else webView.restoreState(savedInstanceState)
    }

    @Deprecated("Deprecated by Android API; retained for WebView file chooser compatibility")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == FILE_PICKER_REQUEST) {
            val result = if (resultCode == Activity.RESULT_OK && data != null)
                FileChooserParams.parseResult(resultCode, data) else null
            uploadCallback?.onReceiveValue(result)
            uploadCallback = null
        }
    }

    override fun onSaveInstanceState(outState: Bundle) {
        webView.saveState(outState)
        super.onSaveInstanceState(outState)
    }

    @Deprecated("Use system back navigation")
    override fun onBackPressed() {
        if (::webView.isInitialized && webView.canGoBack()) webView.goBack()
        else super.onBackPressed()
    }

    override fun onDestroy() {
        uploadCallback?.onReceiveValue(null)
        uploadCallback = null
        handler.removeCallbacksAndMessages(null)
        if (::webView.isInitialized) {
            webView.stopLoading()
            webView.destroy()
        }
        super.onDestroy()
    }
}
