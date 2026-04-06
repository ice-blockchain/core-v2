import Foundation
import Network

@objc(TonStorage)
class TonStorageImpl: NSObject {

  private static let queue = DispatchQueue(label: "io.ion.tonstorage", qos: .userInitiated)
  private var apiPort: UInt16 = 0

  // MARK: - Lifecycle

  @objc func startStorage(
    _ apiPort: Double,
    dbPath: String,
    globalConfigJSON: String,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    guard apiPort.isFinite, apiPort >= 1, apiPort <= 65535 else {
      reject("STORAGE_START_FAILED", "ERR: Invalid port \(apiPort)", nil); return
    }
    Self.queue.async {
      let resolvedPath = Self.resolveDbPath(dbPath)
      guard Self.isPathWithinSandbox(resolvedPath) else {
        reject("STORAGE_START_FAILED", "ERR: dbPath escapes app sandbox", nil); return
      }
      try? FileManager.default.createDirectory(atPath: resolvedPath, withIntermediateDirectories: true)
      let cDbPath = strdup(resolvedPath)
      let cConfig = globalConfigJSON.isEmpty ? nil : strdup(globalConfigJSON)
      let result = Self.callGoFunction(StartStorage(UInt16(apiPort), cDbPath, cConfig))
      free(cDbPath)
      if let cConfig = cConfig { free(cConfig) }
      if result.hasPrefix("ERR:") {
        reject("STORAGE_START_FAILED", result, nil); return
      }
      self.apiPort = UInt16(apiPort)
      self.awaitPortListening(port: self.apiPort, result: result, resolve: resolve, reject: reject)
    }
  }

  private func awaitPortListening(
    port: UInt16,
    result: String,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    let maxAttempts = 60
    let delayUs: UInt32 = 500_000
    for _ in 1...maxAttempts {
      var addr = sockaddr_in()
      addr.sin_len = UInt8(MemoryLayout<sockaddr_in>.size)
      addr.sin_family = sa_family_t(AF_INET)
      addr.sin_port = port.bigEndian
      addr.sin_addr.s_addr = inet_addr("127.0.0.1")
      let fd = socket(AF_INET, SOCK_STREAM, 0)
      guard fd >= 0 else { usleep(delayUs); continue }
      let connected = withUnsafePointer(to: &addr) {
        $0.withMemoryRebound(to: sockaddr.self, capacity: 1) {
          connect(fd, $0, socklen_t(MemoryLayout<sockaddr_in>.size))
        }
      }
      close(fd)
      if connected == 0 { resolve(result); return }
      usleep(delayUs)
    }
    reject(
      "STORAGE_START_TIMEOUT",
      "Storage not listening on port \(port) after \(maxAttempts / 2)s",
      nil
    )
  }

  @objc func stopStorage(
    _ resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    Self.queue.async {
      let result = Self.callGoFunction(StopStorage())
      if result.hasPrefix("ERR:") {
        reject("STORAGE_STOP_FAILED", result, nil)
      } else {
        resolve(result)
      }
    }
  }

  // MARK: - Path Resolution & Validation

  private static func resolveDbPath(_ path: String) -> String {
    if path.hasPrefix("/") { return path }
    let cacheDir = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask).first!.path
    return (cacheDir as NSString).appendingPathComponent(path)
  }

  private static func isPathWithinSandbox(_ path: String) -> Bool {
    let resolved = (path as NSString).standardizingPath
    let homeDir = (NSHomeDirectory() as NSString).standardizingPath
    return resolved.hasPrefix(homeDir + "/")
  }

  // MARK: - Health Check

  @objc func checkStorage(
    _ resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    Self.queue.async {
      guard self.apiPort > 0 else { resolve(false); return }
      self.performHealthCheck(port: self.apiPort, resolve: resolve)
    }
  }

  private func performHealthCheck(port: UInt16, resolve: @escaping RCTPromiseResolveBlock) {
    let conn = NWConnection(host: "127.0.0.1", port: NWEndpoint.Port(rawValue: port)!, using: .tcp)
    var resolved = false
    conn.stateUpdateHandler = { state in
      guard !resolved else { return }
      if case .ready = state {
        resolved = true; conn.cancel(); resolve(true)
      } else if case .failed = state {
        resolved = true; conn.cancel(); resolve(false)
      }
    }
    conn.start(queue: Self.queue)
    Self.queue.asyncAfter(deadline: .now() + 2) {
      guard !resolved else { return }
      resolved = true; conn.cancel(); resolve(false)
    }
  }

  // MARK: - Go Bridge

  private static func callGoFunction(_ ptr: UnsafeMutablePointer<CChar>?) -> String {
    guard let ptr = ptr else { return "" }
    let result = String(cString: ptr)
    free(ptr)
    return result
  }
}
