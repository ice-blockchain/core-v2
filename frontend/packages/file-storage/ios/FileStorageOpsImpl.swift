import Foundation

@objc(FileStorageOps)
class FileStorageOpsImpl: NSObject {

  private static let queue = DispatchQueue(label: "io.ion.filestorage", qos: .userInitiated)
  private let fileManager = FileManager.default

  // MARK: - Path Validation

  private static func sandboxedPath(_ path: String) -> String? {
    let absolute: String
    if (path as NSString).isAbsolutePath {
      absolute = path
    } else {
      let cacheDir = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask).first!.path
      absolute = (cacheDir as NSString).appendingPathComponent(path)
    }
    let resolved = (absolute as NSString).standardizingPath
    let homeDir = (NSHomeDirectory() as NSString).standardizingPath
    guard resolved.hasPrefix(homeDir + "/") else { return nil }
    return resolved
  }

  // MARK: - File Checks

  @objc func exists(
    _ path: String,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    Self.queue.async {
      guard let safe = Self.sandboxedPath(path) else { reject("FILE_INVALID_PATH", "Path outside sandbox", nil); return }
      resolve(self.fileManager.fileExists(atPath: safe))
    }
  }

  @objc func deleteFile(
    _ path: String,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    Self.queue.async {
      guard let safe = Self.sandboxedPath(path) else { reject("FILE_INVALID_PATH", "Path outside sandbox", nil); return }
      do {
        if self.fileManager.fileExists(atPath: safe) {
          try self.fileManager.removeItem(atPath: safe)
        }
        resolve(nil)
      } catch {
        reject("FILE_DELETE_FAILED", "Delete failed", error)
      }
    }
  }

  @objc func getFileSize(
    _ path: String,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    Self.queue.async {
      guard let safe = Self.sandboxedPath(path) else { reject("FILE_INVALID_PATH", "Path outside sandbox", nil); return }
      do {
        let attrs = try self.fileManager.attributesOfItem(atPath: safe)
        let size = (attrs[.size] as? NSNumber)?.int64Value ?? 0
        resolve(size)
      } catch {
        reject("FILE_SIZE_FAILED", "Failed to get file size", error)
      }
    }
  }

  // MARK: - File Operations

  @objc func moveFile(
    _ sourcePath: String,
    destinationPath: String,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    Self.queue.async {
      guard let safeSrc = Self.sandboxedPath(sourcePath), let safeDst = Self.sandboxedPath(destinationPath) else {
        reject("FILE_INVALID_PATH", "Path outside sandbox", nil); return
      }
      do {
        let destDir = (safeDst as NSString).deletingLastPathComponent
        if !self.fileManager.fileExists(atPath: destDir) {
          try self.fileManager.createDirectory(atPath: destDir, withIntermediateDirectories: true)
        }
        if self.fileManager.fileExists(atPath: safeDst) {
          try self.fileManager.removeItem(atPath: safeDst)
        }
        try self.fileManager.moveItem(atPath: safeSrc, toPath: safeDst)
        resolve(nil)
      } catch {
        reject("FILE_MOVE_FAILED", "Move failed", error)
      }
    }
  }

  // MARK: - Download

  @objc func downloadToFile(
    _ url: String,
    destinationPath: String,
    headersJSON: String,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    guard let fileUrl = URL(string: url), Self.isAllowedScheme(fileUrl) else {
      reject("DOWNLOAD_FAILED", "Invalid or disallowed URL", nil); return
    }
    guard let safeDst = Self.sandboxedPath(destinationPath) else {
      reject("FILE_INVALID_PATH", "Destination outside sandbox", nil); return
    }
    Self.queue.async {
      self.executeDownload(url: fileUrl, destinationPath: safeDst, headersJSON: headersJSON, resolve: resolve, reject: reject)
    }
  }

  private static func isAllowedScheme(_ url: URL) -> Bool {
    guard let scheme = url.scheme?.lowercased() else { return false }
    return scheme == "https" || scheme == "http"
  }

  private func executeDownload(
    url: URL,
    destinationPath: String,
    headersJSON: String,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    var request = URLRequest(url: url)
    request.timeoutInterval = 300
    Self.applyHeaders(&request, headersJSON: headersJSON)

    let destDir = (destinationPath as NSString).deletingLastPathComponent
    do {
      try fileManager.createDirectory(atPath: destDir, withIntermediateDirectories: true, attributes: nil)
    } catch {
      reject("DOWNLOAD_FAILED", "Failed to create destination directory", error); return
    }

    let semaphore = DispatchSemaphore(value: 0)
    var downloadError: Error?

    let task = URLSession.shared.downloadTask(with: request) { tempUrl, response, error in
      defer { semaphore.signal() }
      if let error = error { downloadError = error; return }
      guard let tempUrl = tempUrl else {
        downloadError = NSError(domain: "FileStorageOps", code: -1, userInfo: [NSLocalizedDescriptionKey: "No file returned"]); return
      }
      guard let httpResponse = response as? HTTPURLResponse, (200...299).contains(httpResponse.statusCode) else {
        let code = (response as? HTTPURLResponse)?.statusCode ?? 0
        downloadError = NSError(domain: "FileStorageOps", code: code, userInfo: [NSLocalizedDescriptionKey: "HTTP \(code)"]); return
      }
      do {
        let dest = URL(fileURLWithPath: destinationPath)
        if self.fileManager.fileExists(atPath: destinationPath) { try self.fileManager.removeItem(at: dest) }
        try self.fileManager.moveItem(at: tempUrl, to: dest)
      } catch { downloadError = error }
    }
    task.resume()
    semaphore.wait()

    if let error = downloadError {
      reject("DOWNLOAD_FAILED", "Download failed", error)
    } else {
      resolve(nil)
    }
  }

  private static func applyHeaders(_ request: inout URLRequest, headersJSON: String) {
    guard let data = headersJSON.data(using: .utf8),
          let headers = try? JSONSerialization.jsonObject(with: data) as? [String: String] else { return }
    for (key, value) in headers { request.setValue(value, forHTTPHeaderField: key) }
  }
}
