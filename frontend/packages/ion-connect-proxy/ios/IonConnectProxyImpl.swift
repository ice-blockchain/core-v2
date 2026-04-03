import Foundation
import Network

@objc(IonConnectProxy)
class IonConnectProxyImpl: NSObject {

  private static let queue = DispatchQueue(label: "io.ion.ionconnectproxy", qos: .userInitiated)
  private var proxyPort: UInt16 = 0

  // MARK: - Lifecycle

  @objc func startProxy(_ port: Double, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    Self.queue.async {
      let result = callGoFunction(StartProxy(UInt16(port)))
      if result.hasPrefix("ERR:") {
        reject("PROXY_START_FAILED", result, nil); return
      }
      self.proxyPort = UInt16(port)
      self.awaitPortListening(port: self.proxyPort, result: result, resolve: resolve, reject: reject)
    }
  }

  @objc func startProxyWithConfig(_ port: Double, configJSON: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    Self.queue.async {
      let cConfig = strdup(configJSON)
      let result = callGoFunction(StartProxyWithConfig(UInt16(port), cConfig))
      free(cConfig)
      if result.hasPrefix("ERR:") {
        reject("PROXY_START_FAILED", result, nil); return
      }
      self.proxyPort = UInt16(port)
      self.awaitPortListening(port: self.proxyPort, result: result, resolve: resolve, reject: reject)
    }
  }

  private func awaitPortListening(port: UInt16, result: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
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
        $0.withMemoryRebound(to: sockaddr.self, capacity: 1) { connect(fd, $0, socklen_t(MemoryLayout<sockaddr_in>.size)) }
      }
      close(fd)
      if connected == 0 { resolve(result); return }
      usleep(delayUs)
    }
    reject("PROXY_START_TIMEOUT", "Proxy not listening on port \(port) after \(maxAttempts / 2)s. StartProxy returned: \"\(result)\"", nil)
  }

  @objc func stopProxy(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    Self.queue.async {
      let result = callGoFunction(StopProxy())
      resolve(result)
    }
  }

  // MARK: - Health Check

  @objc func checkProxy(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    guard proxyPort > 0 else { resolve(false); return }
    let port = proxyPort
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

  // MARK: - HTTP Bridge

  @objc func proxyRequest(_ method: String, url: String, headersJSON: String, body: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    guard let raw = buildRawHttpRequest(method: method, url: url, headersJSON: headersJSON, body: body) else {
      reject("PROXY_ERROR", "Invalid characters in request parameters", nil); return
    }
    let (safeResolve, safeReject) = Self.makeSettledGuards(resolve: resolve, reject: reject)
    sendRawProxyRequest(rawHttp: raw, resolve: safeResolve, reject: safeReject)
  }

  @objc func proxyUpload(_ url: String, filePath: String, headersJSON: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    do { try assertSandboxPath(filePath) } catch {
      reject("PROXY_ERROR", "File path outside app sandbox", nil); return
    }
    guard let fileData = FileManager.default.contents(atPath: filePath) else {
      reject("PROXY_ERROR", "File not found", nil); return
    }
    let fileBody = String(data: fileData, encoding: .utf8) ?? ""
    guard let raw = buildRawHttpRequest(method: "POST", url: url, headersJSON: headersJSON, body: fileBody) else {
      reject("PROXY_ERROR", "Invalid characters in request parameters", nil); return
    }
    let (safeResolve, safeReject) = Self.makeSettledGuards(resolve: resolve, reject: reject)
    sendRawProxyRequest(rawHttp: raw, resolve: safeResolve, reject: safeReject)
  }

  @objc func proxyDownload(_ url: String, destPath: String, headersJSON: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    do { try assertSandboxPath(destPath) } catch {
      reject("PROXY_ERROR", "Destination path outside app sandbox", nil); return
    }
    guard let raw = buildRawHttpRequest(method: "GET", url: url, headersJSON: headersJSON, body: "") else {
      reject("PROXY_ERROR", "Invalid characters in request parameters", nil); return
    }
    let (safeResolve, safeReject) = Self.makeSettledGuards(resolve: resolve, reject: reject)
    let conn = NWConnection(host: "127.0.0.1", port: NWEndpoint.Port(rawValue: proxyPort)!, using: .tcp)
    conn.stateUpdateHandler = { state in
      if case .failed(let error) = state { safeReject("PROXY_ERROR", error.localizedDescription, nil); conn.cancel() }
    }
    conn.start(queue: Self.queue)
    conn.send(content: raw.data(using: .utf8), completion: .contentProcessed { error in
      if let error = error { safeReject("PROXY_ERROR", error.localizedDescription, nil); conn.cancel(); return }
      self.receiveFullResponse(conn: conn) { result in
        conn.cancel()
        switch result {
        case .failure(let error): safeReject("PROXY_ERROR", error.localizedDescription, nil)
        case .success(let responseData):
          let dest = URL(fileURLWithPath: destPath)
          let (status, headers, _) = self.parseHttpResponse(responseData)
          do {
            try self.extractBody(from: responseData).write(to: dest)
            let json = self.encodeResponseJSON(status: status, headers: headers, body: "")
            safeResolve(json)
          } catch { safeReject("PROXY_ERROR", error.localizedDescription, nil) }
        }
      }
    })
  }

  // MARK: - Promise Safety

  private static func makeSettledGuards(
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) -> (RCTPromiseResolveBlock, RCTPromiseRejectBlock) {
    var settled = false
    let safeResolve: RCTPromiseResolveBlock = { value in
      guard !settled else { return }; settled = true; resolve(value)
    }
    let safeReject: RCTPromiseRejectBlock = { code, msg, err in
      guard !settled else { return }; settled = true; reject(code, msg, err)
    }
    return (safeResolve, safeReject)
  }

  // MARK: - Input Validation

  private static func containsCRLF(_ value: String) -> Bool {
    return value.contains("\r") || value.contains("\n")
  }

  private func assertSandboxPath(_ path: String) throws {
    let resolved = (path as NSString).resolvingSymlinksInPath
    let tmpDir = NSTemporaryDirectory()
    let cachePath = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask).first?.path ?? ""
    let cacheDir = cachePath.hasSuffix("/") ? cachePath : cachePath + "/"
    guard resolved.hasPrefix(tmpDir) || resolved.hasPrefix(cacheDir) else {
      throw NSError(domain: "IonConnectProxy", code: -1, userInfo: [NSLocalizedDescriptionKey: "Path outside app sandbox"])
    }
  }

  // MARK: - Raw TCP Proxy

  private func buildRawHttpRequest(method: String, url: String, headersJSON: String, body: String) -> String? {
    if Self.containsCRLF(method) || Self.containsCRLF(url) { return nil }
    let host = URL(string: url)?.host ?? ""
    var lines = ["\(method) \(url) HTTP/1.1", "Host: \(host)"]
    if let data = headersJSON.data(using: .utf8),
       let headers = try? JSONSerialization.jsonObject(with: data) as? [String: String] {
      for (key, value) in headers {
        if Self.containsCRLF(key) || Self.containsCRLF(value) { return nil }
        lines.append("\(key): \(value)")
      }
    }
    if !body.isEmpty { lines.append("Content-Length: \(body.utf8.count)") }
    lines.append("Connection: close")
    lines.append("")
    var raw = lines.joined(separator: "\r\n") + "\r\n"
    if !body.isEmpty { raw += body }
    return raw
  }

  private func sendRawProxyRequest(rawHttp: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    let conn = NWConnection(host: "127.0.0.1", port: NWEndpoint.Port(rawValue: proxyPort)!, using: .tcp)
    conn.stateUpdateHandler = { state in
      if case .failed(let error) = state { reject("PROXY_ERROR", error.localizedDescription, nil); conn.cancel() }
    }
    conn.start(queue: Self.queue)
    conn.send(content: rawHttp.data(using: .utf8), completion: .contentProcessed { error in
      if let error = error { reject("PROXY_ERROR", error.localizedDescription, nil); conn.cancel(); return }
      self.receiveFullResponse(conn: conn) { result in
        conn.cancel()
        switch result {
        case .failure(let error): reject("PROXY_ERROR", error.localizedDescription, nil)
        case .success(let data):
          let (status, headers, body) = self.parseHttpResponse(data)
          resolve(self.encodeResponseJSON(status: status, headers: headers, body: body))
        }
      }
    })
  }

  private static let maxResponseSize = 10 * 1024 * 1024

  private func receiveFullResponse(conn: NWConnection, accumulated: Data = Data(), completion: @escaping (Result<Data, Error>) -> Void) {
    conn.receive(minimumIncompleteLength: 1, maximumLength: 65536) { content, _, isComplete, error in
      var buffer = accumulated
      if let content = content { buffer.append(content) }
      if buffer.count > Self.maxResponseSize {
        completion(.failure(NSError(domain: "IonConnectProxy", code: -1, userInfo: [NSLocalizedDescriptionKey: "Response exceeded \(Self.maxResponseSize) bytes"])))
        return
      }
      if isComplete || error != nil {
        if buffer.isEmpty, let error = error { completion(.failure(error)) } else { completion(.success(buffer)) }
        return
      }
      self.receiveFullResponse(conn: conn, accumulated: buffer, completion: completion)
    }
  }

  // MARK: - HTTP Response Parsing

  private func parseHttpResponse(_ data: Data) -> (Int, [String: String], String) {
    guard let raw = String(data: data, encoding: .utf8) else { return (0, [:], "") }
    guard let headerEnd = raw.range(of: "\r\n\r\n") else { return (0, [:], raw) }
    let headerSection = String(raw[raw.startIndex..<headerEnd.lowerBound])
    let body = String(raw[headerEnd.upperBound...])
    let lines = headerSection.components(separatedBy: "\r\n")
    let status = parseStatusCode(lines.first ?? "")
    var headers: [String: String] = [:]
    for line in lines.dropFirst() {
      if let colonIndex = line.firstIndex(of: ":") {
        let key = String(line[line.startIndex..<colonIndex]).trimmingCharacters(in: .whitespaces)
        let value = String(line[line.index(after: colonIndex)...]).trimmingCharacters(in: .whitespaces)
        headers[key] = value
      }
    }
    return (status, headers, body)
  }

  private func parseStatusCode(_ statusLine: String) -> Int {
    let parts = statusLine.split(separator: " ", maxSplits: 2)
    guard parts.count >= 2 else { return 0 }
    return Int(parts[1]) ?? 0
  }

  private func extractBody(from data: Data) -> Data {
    guard let range = data.range(of: Data("\r\n\r\n".utf8)) else { return data }
    return data.subdata(in: range.upperBound..<data.endIndex)
  }

  private func encodeResponseJSON(status: Int, headers: [String: String], body: String) -> String {
    let result: [String: Any] = ["status": status, "headers": headers, "body": body]
    guard let jsonData = try? JSONSerialization.data(withJSONObject: result) else { return "{}" }
    return String(data: jsonData, encoding: .utf8) ?? "{}"
  }
}

private func callGoFunction(_ ptr: UnsafeMutablePointer<CChar>?) -> String {
  guard let ptr = ptr else { return "" }
  let result = String(cString: ptr)
  free(ptr)
  return result
}
