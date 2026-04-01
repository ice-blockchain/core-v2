package io.ion.ionconnectproxy

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.asRequestBody
import okhttp3.RequestBody.Companion.toRequestBody
import okio.buffer
import okio.sink
import org.json.JSONObject
import java.io.File
import java.net.InetSocketAddress
import java.net.Proxy
import kotlin.concurrent.thread

class IonConnectProxyModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        const val NAME = "IonConnectProxy"
        init {
            System.loadLibrary("tonutils-proxy")
            System.loadLibrary("ion-connect-proxy-jni")
        }
    }

    private var proxyPort: Int = 0
    private val proxyClient: OkHttpClient by lazy {
        OkHttpClient.Builder()
            .proxy(Proxy(Proxy.Type.HTTP, InetSocketAddress("127.0.0.1", proxyPort)))
            .build()
    }

    override fun getName(): String = NAME

    // JNI declarations
    private external fun nativeStartProxy(port: Int): String
    private external fun nativeStartProxyWithConfig(port: Int, configJSON: String): String
    private external fun nativeStopProxy(): String

    // Lifecycle

    @ReactMethod
    fun startProxy(port: Double, promise: Promise) {
        thread {
            val result = nativeStartProxy(port.toInt())
            proxyPort = port.toInt()
            promise.resolve(result)
        }
    }

    @ReactMethod
    fun startProxyWithConfig(port: Double, configJSON: String, promise: Promise) {
        thread {
            val result = nativeStartProxyWithConfig(port.toInt(), configJSON)
            proxyPort = port.toInt()
            promise.resolve(result)
        }
    }

    @ReactMethod
    fun stopProxy(promise: Promise) {
        thread {
            val result = nativeStopProxy()
            promise.resolve(result)
        }
    }

    // HTTP bridge

    @ReactMethod
    fun proxyRequest(method: String, url: String, headersJSON: String, body: String, promise: Promise) {
        thread {
            try {
                val requestBody = if (body.isNotEmpty()) {
                    body.toRequestBody("application/json".toMediaTypeOrNull())
                } else null
                val request = buildRequest(url, method, headersJSON, requestBody)
                val response = proxyClient.newCall(request).execute()
                promise.resolve(buildResponseJSON(response))
            } catch (e: Exception) {
                promise.reject("PROXY_ERROR", e.message, e)
            }
        }
    }

    @ReactMethod
    fun proxyUpload(url: String, filePath: String, headersJSON: String, promise: Promise) {
        thread {
            try {
                val file = File(filePath)
                val requestBody = file.asRequestBody("application/octet-stream".toMediaTypeOrNull())
                val request = buildRequest(url, "POST", headersJSON, requestBody)
                val response = proxyClient.newCall(request).execute()
                promise.resolve(buildResponseJSON(response))
            } catch (e: Exception) {
                promise.reject("PROXY_ERROR", e.message, e)
            }
        }
    }

    @ReactMethod
    fun proxyDownload(url: String, destPath: String, headersJSON: String, promise: Promise) {
        thread {
            try {
                val request = buildRequest(url, "GET", headersJSON, null)
                val response = proxyClient.newCall(request).execute()
                val dest = File(destPath)
                response.body?.let { body ->
                    dest.sink().buffer().use { sink -> sink.writeAll(body.source()) }
                }
                promise.resolve(buildResponseJSON(response, skipBody = true))
            } catch (e: Exception) {
                promise.reject("PROXY_ERROR", e.message, e)
            }
        }
    }

    // Helpers

    private fun buildRequest(url: String, method: String, headersJSON: String, body: okhttp3.RequestBody?): Request {
        val builder = Request.Builder().url(url)
        try {
            val headers = JSONObject(headersJSON)
            headers.keys().forEach { key -> builder.addHeader(key, headers.getString(key)) }
        } catch (_: Exception) { /* ignore malformed headers */ }
        builder.method(method, body)
        return builder.build()
    }

    private fun buildResponseJSON(response: okhttp3.Response, skipBody: Boolean = false): String {
        val headers = JSONObject()
        response.headers.forEach { (name, value) -> headers.put(name, value) }
        val result = JSONObject()
        result.put("status", response.code)
        result.put("headers", headers)
        result.put("body", if (skipBody) "" else (response.body?.string() ?: ""))
        return result.toString()
    }
}
