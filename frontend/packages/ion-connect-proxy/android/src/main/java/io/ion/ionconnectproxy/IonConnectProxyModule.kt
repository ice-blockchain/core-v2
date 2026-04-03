package io.ion.ionconnectproxy

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import org.json.JSONObject
import java.io.File
import java.net.InetSocketAddress
import java.net.Socket
import java.net.URL
import kotlin.concurrent.thread

class IonConnectProxyModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        const val NAME = "IonConnectProxy"
        private const val MAX_RESPONSE_SIZE = 10 * 1024 * 1024
        init {
            System.loadLibrary("tonutils-proxy")
            System.loadLibrary("ion-connect-proxy-jni")
        }
    }

    private var proxyPort: Int = 0

    override fun getName(): String = NAME

    // JNI declarations
    private external fun nativeStartProxy(port: Int): String
    private external fun nativeStartProxyWithConfig(port: Int, configJSON: String): String
    private external fun nativeStopProxy(): String

    // Lifecycle

    @ReactMethod
    fun startProxy(port: Double, promise: Promise) {
        thread {
            try {
                val result = nativeStartProxy(port.toInt())
                if (result.startsWith("ERR:")) {
                    promise.reject("PROXY_START_FAILED", result); return@thread
                }
                proxyPort = port.toInt()
                awaitPortListening(proxyPort, promise, result)
            } catch (e: UnsatisfiedLinkError) {
                promise.reject("PROXY_UNSUPPORTED_ABI", "Native proxy library not available for this device architecture", e)
            }
        }
    }

    @ReactMethod
    fun startProxyWithConfig(port: Double, configJSON: String, promise: Promise) {
        thread {
            try {
                val result = nativeStartProxyWithConfig(port.toInt(), configJSON)
                if (result.startsWith("ERR:")) {
                    promise.reject("PROXY_START_FAILED", result); return@thread
                }
                proxyPort = port.toInt()
                awaitPortListening(proxyPort, promise, result)
            } catch (e: UnsatisfiedLinkError) {
                promise.reject("PROXY_UNSUPPORTED_ABI", "Native proxy library not available for this device architecture", e)
            }
        }
    }

    private fun awaitPortListening(port: Int, promise: Promise, result: String) {
        val maxAttempts = 60
        val delayMs = 500L
        for (i in 1..maxAttempts) {
            try {
                Socket().use { socket ->
                    socket.connect(InetSocketAddress("127.0.0.1", port), 1000)
                }
                promise.resolve(result)
                return
            } catch (_: Exception) {
                Thread.sleep(delayMs)
            }
        }
        promise.reject("PROXY_START_TIMEOUT", "Proxy not listening on port $port after ${maxAttempts * delayMs / 1000}s. StartProxy returned: \"$result\"")
    }

    @ReactMethod
    fun stopProxy(promise: Promise) {
        thread {
            val result = nativeStopProxy()
            promise.resolve(result)
        }
    }

    // Health check

    @ReactMethod
    fun checkProxy(promise: Promise) {
        thread {
            try {
                Socket().use { socket ->
                    socket.connect(InetSocketAddress("127.0.0.1", proxyPort), 2000)
                }
                promise.resolve(true)
            } catch (_: Exception) {
                promise.resolve(false)
            }
        }
    }

    // HTTP bridge

    @ReactMethod
    fun proxyRequest(method: String, url: String, headersJSON: String, body: String, promise: Promise) {
        thread {
            try {
                val raw = buildRawHttpRequest(method, url, headersJSON, body)
                val responseData = sendRawProxyRequest(raw)
                val (status, headers, responseBody) = parseHttpResponse(responseData)
                promise.resolve(encodeResponseJSON(status, headers, responseBody))
            } catch (e: Exception) {
                promise.reject("PROXY_ERROR", e.message, e)
            }
        }
    }

    @ReactMethod
    fun proxyUpload(url: String, filePath: String, headersJSON: String, promise: Promise) {
        thread {
            try {
                assertSandboxPath(filePath)
                val fileBody = File(filePath).readText()
                val raw = buildRawHttpRequest("POST", url, headersJSON, fileBody)
                val responseData = sendRawProxyRequest(raw)
                val (status, headers, responseBody) = parseHttpResponse(responseData)
                promise.resolve(encodeResponseJSON(status, headers, responseBody))
            } catch (e: Exception) {
                promise.reject("PROXY_ERROR", e.message, e)
            }
        }
    }

    @ReactMethod
    fun proxyDownload(url: String, destPath: String, headersJSON: String, promise: Promise) {
        thread {
            try {
                assertSandboxPath(destPath)
                val raw = buildRawHttpRequest("GET", url, headersJSON, "")
                val responseBytes = sendRawProxyRequestBytes(raw)
                val separatorIndex = findHeaderEnd(responseBytes)
                val headerPart = String(responseBytes, 0, separatorIndex)
                val bodyPart = responseBytes.copyOfRange(separatorIndex + 4, responseBytes.size)
                File(destPath).writeBytes(bodyPart)
                val (status, headers, _) = parseHttpResponse(headerPart)
                promise.resolve(encodeResponseJSON(status, headers, ""))
            } catch (e: Exception) {
                promise.reject("PROXY_ERROR", e.message, e)
            }
        }
    }

    // Input validation

    private fun containsCRLF(value: String): Boolean {
        return value.contains("\r") || value.contains("\n")
    }

    private fun assertSandboxPath(path: String) {
        val resolved = File(path).canonicalPath
        val cacheDir = reactApplicationContext.cacheDir.canonicalPath + File.separator
        val filesDir = reactApplicationContext.filesDir.canonicalPath + File.separator
        require(resolved.startsWith(cacheDir) || resolved.startsWith(filesDir)) {
            "Path outside app sandbox"
        }
    }

    // Raw TCP proxy helpers

    private fun buildRawHttpRequest(method: String, url: String, headersJSON: String, body: String): String {
        require(!containsCRLF(method) && !containsCRLF(url)) { "Invalid characters in request parameters" }
        val host = URL(url).host ?: ""
        val lines = mutableListOf("$method $url HTTP/1.1", "Host: $host")
        try {
            val headers = JSONObject(headersJSON)
            headers.keys().forEach { key ->
                val value = headers.getString(key)
                require(!containsCRLF(key) && !containsCRLF(value)) { "Invalid characters in header" }
                lines.add("$key: $value")
            }
        } catch (e: IllegalArgumentException) {
            throw e
        } catch (e: Exception) {
            android.util.Log.w("IonConnectProxy", "Failed to parse headers JSON", e)
        }
        if (body.isNotEmpty()) lines.add("Content-Length: ${body.toByteArray().size}")
        lines.add("Connection: close")
        lines.add("")
        var raw = lines.joinToString("\r\n") + "\r\n"
        if (body.isNotEmpty()) raw += body
        return raw
    }

    private fun sendRawProxyRequest(rawHttp: String): String {
        return String(sendRawProxyRequestBytes(rawHttp))
    }

    private fun sendRawProxyRequestBytes(rawHttp: String): ByteArray {
        Socket().use { socket ->
            socket.connect(InetSocketAddress("127.0.0.1", proxyPort), 10_000)
            socket.soTimeout = 30_000
            socket.getOutputStream().write(rawHttp.toByteArray())
            socket.getOutputStream().flush()
            return readBytesWithLimit(socket.getInputStream(), MAX_RESPONSE_SIZE)
        }
    }

    private fun readBytesWithLimit(input: java.io.InputStream, maxSize: Int): ByteArray {
        val buffer = java.io.ByteArrayOutputStream()
        val chunk = ByteArray(65536)
        var totalRead = 0
        while (true) {
            val bytesRead = input.read(chunk)
            if (bytesRead == -1) break
            totalRead += bytesRead
            if (totalRead > maxSize) throw Exception("Response exceeded $maxSize bytes")
            buffer.write(chunk, 0, bytesRead)
        }
        return buffer.toByteArray()
    }

    private fun parseHttpResponse(raw: String): Triple<Int, Map<String, String>, String> {
        val headerEnd = raw.indexOf("\r\n\r\n")
        if (headerEnd == -1) return Triple(0, emptyMap(), raw)
        val headerSection = raw.substring(0, headerEnd)
        val body = raw.substring(headerEnd + 4)
        val lines = headerSection.split("\r\n")
        val status = parseStatusCode(lines.firstOrNull() ?: "")
        val headers = mutableMapOf<String, String>()
        for (line in lines.drop(1)) {
            val colonIndex = line.indexOf(':')
            if (colonIndex != -1) {
                headers[line.substring(0, colonIndex).trim()] = line.substring(colonIndex + 1).trim()
            }
        }
        return Triple(status, headers, body)
    }

    private fun parseStatusCode(statusLine: String): Int {
        val parts = statusLine.split(" ", limit = 3)
        return if (parts.size >= 2) parts[1].toIntOrNull() ?: 0 else 0
    }

    private fun findHeaderEnd(data: ByteArray): Int {
        val separator = "\r\n\r\n".toByteArray()
        for (i in 0..data.size - separator.size) {
            if (data[i] == separator[0] && data[i + 1] == separator[1] &&
                data[i + 2] == separator[2] && data[i + 3] == separator[3]) return i
        }
        return data.size
    }

    private fun encodeResponseJSON(status: Int, headers: Map<String, String>, body: String): String {
        val headersJson = JSONObject()
        headers.forEach { (key, value) -> headersJson.put(key, value) }
        val result = JSONObject()
        result.put("status", status)
        result.put("headers", headersJson)
        result.put("body", body)
        return result.toString()
    }
}
