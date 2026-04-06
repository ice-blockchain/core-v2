package io.ion.filestorage

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import org.json.JSONObject
import java.io.File
import java.io.FileOutputStream
import java.net.HttpURLConnection
import java.net.URL
import kotlin.concurrent.thread

class FileStorageOpsModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        const val NAME = "FileStorageOps"
        private val ALLOWED_SCHEMES = setOf("https", "http")
    }

    override fun getName(): String = NAME

    private fun sandboxedPath(path: String): String? {
        val file = if (path.startsWith("/")) File(path) else File(reactApplicationContext.cacheDir, path)
        val canonical = file.canonicalPath
        val dataDir = File(reactApplicationContext.applicationInfo.dataDir).canonicalPath
        if (!canonical.startsWith("$dataDir/")) return null
        return canonical
    }

    @ReactMethod
    fun exists(path: String, promise: Promise) {
        thread {
            val safe = sandboxedPath(path) ?: run { promise.reject("FILE_INVALID_PATH", "Path outside sandbox"); return@thread }
            promise.resolve(File(safe).exists())
        }
    }

    @ReactMethod
    fun deleteFile(path: String, promise: Promise) {
        thread {
            val safe = sandboxedPath(path) ?: run { promise.reject("FILE_INVALID_PATH", "Path outside sandbox"); return@thread }
            try {
                val file = File(safe)
                if (file.exists()) file.delete()
                promise.resolve(null)
            } catch (e: Exception) {
                promise.reject("FILE_DELETE_FAILED", e.message, e)
            }
        }
    }

    @ReactMethod
    fun getFileSize(path: String, promise: Promise) {
        thread {
            val safe = sandboxedPath(path) ?: run { promise.reject("FILE_INVALID_PATH", "Path outside sandbox"); return@thread }
            try {
                val file = File(safe)
                if (!file.exists()) {
                    promise.reject("FILE_NOT_FOUND", "File not found")
                    return@thread
                }
                promise.resolve(file.length().toDouble())
            } catch (e: Exception) {
                promise.reject("FILE_SIZE_FAILED", e.message, e)
            }
        }
    }

    @ReactMethod
    fun moveFile(sourcePath: String, destinationPath: String, promise: Promise) {
        thread {
            val safeSrc = sandboxedPath(sourcePath) ?: run { promise.reject("FILE_INVALID_PATH", "Path outside sandbox"); return@thread }
            val safeDst = sandboxedPath(destinationPath) ?: run { promise.reject("FILE_INVALID_PATH", "Path outside sandbox"); return@thread }
            try {
                val source = File(safeSrc)
                val dest = File(safeDst)
                dest.parentFile?.mkdirs()
                if (dest.exists()) dest.delete()
                if (!source.renameTo(dest)) {
                    source.copyTo(dest, overwrite = true)
                    source.delete()
                }
                promise.resolve(null)
            } catch (e: Exception) {
                promise.reject("FILE_MOVE_FAILED", e.message, e)
            }
        }
    }

    @ReactMethod
    fun downloadToFile(url: String, destinationPath: String, headersJSON: String, promise: Promise) {
        thread {
            try {
                val parsedUrl = URL(url)
                if (parsedUrl.protocol !in ALLOWED_SCHEMES) {
                    promise.reject("DOWNLOAD_FAILED", "Disallowed URL scheme: ${parsedUrl.protocol}"); return@thread
                }
                val safeDst = sandboxedPath(destinationPath) ?: run {
                    promise.reject("FILE_INVALID_PATH", "Destination outside sandbox"); return@thread
                }
                executeDownload(parsedUrl, safeDst, headersJSON)
                promise.resolve(null)
            } catch (e: Exception) {
                promise.reject("DOWNLOAD_FAILED", e.message, e)
            }
        }
    }

    private fun executeDownload(url: URL, destinationPath: String, headersJSON: String) {
        val dest = File(destinationPath)
        dest.parentFile?.mkdirs()
        val temp = File(dest.parentFile, "${dest.name}.tmp-${System.nanoTime()}")

        val connection = url.openConnection() as HttpURLConnection
        connection.connectTimeout = 30_000
        connection.readTimeout = 300_000
        applyHeaders(connection, headersJSON)

        try {
            val code = connection.responseCode
            if (code !in 200..299) throw Exception("HTTP $code")
            connection.inputStream.use { input ->
                FileOutputStream(temp).use { output -> input.copyTo(output) }
            }
            if (dest.exists()) dest.delete()
            if (!temp.renameTo(dest)) throw Exception("Failed to rename temp file to destination")
        } catch (e: Exception) {
            temp.delete()
            throw e
        } finally {
            connection.disconnect()
        }
    }

    private fun applyHeaders(connection: HttpURLConnection, headersJSON: String) {
        try {
            val headers = JSONObject(headersJSON)
            headers.keys().forEach { key ->
                connection.setRequestProperty(key, headers.getString(key))
            }
        } catch (_: Exception) {}
    }
}
