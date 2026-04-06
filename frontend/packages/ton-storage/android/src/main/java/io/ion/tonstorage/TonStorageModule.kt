package io.ion.tonstorage

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.io.File
import java.net.InetSocketAddress
import java.net.Socket
import kotlin.concurrent.thread

class TonStorageModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        const val NAME = "TonStorage"
        init {
            System.loadLibrary("tonutils-storage")
            System.loadLibrary("ton-storage-jni")
        }
    }

    @Volatile private var apiPort: Int = 0

    override fun getName(): String = NAME

    // JNI declarations
    private external fun nativeStartStorage(apiPort: Int, dbPath: String, globalConfigJSON: String): String
    private external fun nativeStopStorage(): String
    private external fun nativeCheckStorage(): String

    // Lifecycle

    @ReactMethod
    fun startStorage(apiPort: Double, dbPath: String, globalConfigJSON: String, promise: Promise) {
        val port = apiPort.toInt()
        if (port < 1 || port > 65535) {
            promise.reject("STORAGE_START_FAILED", "ERR: Invalid port $port"); return
        }
        thread {
            try {
                val resolvedPath = resolveDbPath(dbPath)
                if (!isPathWithinSandbox(resolvedPath)) {
                    promise.reject("STORAGE_START_FAILED", "ERR: dbPath escapes app sandbox"); return@thread
                }
                File(resolvedPath).mkdirs()
                val result = nativeStartStorage(port, resolvedPath, globalConfigJSON)
                if (result.startsWith("ERR:")) {
                    promise.reject("STORAGE_START_FAILED", result); return@thread
                }
                this.apiPort = port
                awaitPortListening(this.apiPort, promise, result)
            } catch (e: UnsatisfiedLinkError) {
                promise.reject(
                    "STORAGE_UNSUPPORTED_ABI",
                    "Native storage library not available for this device architecture",
                    e
                )
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
        promise.reject(
            "STORAGE_START_TIMEOUT",
            "Storage not listening on port $port after ${maxAttempts * delayMs / 1000}s"
        )
    }

    @ReactMethod
    fun stopStorage(promise: Promise) {
        thread {
            val result = nativeStopStorage()
            if (result.startsWith("ERR:")) {
                promise.reject("STORAGE_STOP_FAILED", result)
            } else {
                promise.resolve(result)
            }
        }
    }

    // Path resolution & validation

    private fun resolveDbPath(path: String): String {
        if (path.startsWith("/")) return path
        return File(reactApplicationContext.cacheDir, path).absolutePath
    }

    private fun isPathWithinSandbox(path: String): Boolean {
        val canonical = File(path).canonicalPath
        val dataDir = File(reactApplicationContext.applicationInfo.dataDir).canonicalPath
        return canonical.startsWith("$dataDir/")
    }

    // Health check

    @ReactMethod
    fun checkStorage(promise: Promise) {
        thread {
            try {
                Socket().use { socket ->
                    socket.connect(InetSocketAddress("127.0.0.1", apiPort), 2000)
                }
                promise.resolve(true)
            } catch (_: Exception) {
                promise.resolve(false)
            }
        }
    }
}
