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
      self.proxyPort = UInt16(port)
      resolve(result)
    }
  }

  @objc func startProxyWithConfig(_ port: Double, configJSON: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    Self.queue.async {
      let cConfig = strdup(configJSON)
      let result = callGoFunction(StartProxyWithConfig(UInt16(port), cConfig))
      free(cConfig)
      self.proxyPort = UInt16(port)
      resolve(result)
    }
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
    let raw = buildRawHttpRequest(method: method, url: url, headersJSON: headersJSON, body: body)
    sendRawProxyRequest(rawHttp: raw, resolve: resolve, reject: reject)
  }

  @objc func proxyUpload(_ url: String, filePath: String, headersJSON: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    guard let fileData = FileManager.default.contents(atPath: filePath) else {
      reject("PROXY_ERROR", "File not found: \(filePath)", nil); return
    }
    let fileBody = String(data: fileData, encoding: .utf8) ?? ""
    let raw = buildRawHttpRequest(method: "POST", url: url, headersJSON: headersJSON, body: fileBody)
    sendRawProxyRequest(rawHttp: raw, resolve: resolve, reject: reject)
  }

  @objc func proxyDownload(_ url: String, destPath: String, headersJSON: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    let raw = buildRawHttpRequest(method: "GET", url: url, headersJSON: headersJSON, body: "")
    let conn = NWConnection(host: "127.0.0.1", port: NWEndpoint.Port(rawValue: proxyPort)!, using: .tcp)
    conn.stateUpdateHandler = { state in
      if case .failed(let error) = state { reject("PROXY_ERROR", error.localizedDescription, nil) }
    }
    conn.start(queue: Self.queue)
    conn.send(content: raw.data(using: .utf8), completion: .contentProcessed { error in
      if let error = error { reject("PROXY_ERROR", error.localizedDescription, nil); conn.cancel(); return }
      self.receiveFullResponse(conn: conn) { result in
        conn.cancel()
        switch result {
        case .failure(let error): reject("PROXY_ERROR", error.localizedDescription, nil)
        case .success(let responseData):
          let dest = URL(fileURLWithPath: destPath)
          let (status, headers, _) = self.parseHttpResponse(responseData)
          do {
            try self.extractBody(from: responseData).write(to: dest)
            let json = self.encodeResponseJSON(status: status, headers: headers, body: "")
            resolve(json)
          } catch { reject("PROXY_ERROR", error.localizedDescription, nil) }
        }
      }
    })
  }

  // MARK: - Raw TCP Proxy

  private func buildRawHttpRequest(method: String, url: String, headersJSON: String, body: String) -> String {
    let host = URL(string: url)?.host ?? ""
    var lines = ["\(method) \(url) HTTP/1.1", "Host: \(host)"]
    if let data = headersJSON.data(using: .utf8),
       let headers = try? JSONSerialization.jsonObject(with: data) as? [String: String] {
      for (key, value) in headers { lines.append("\(key): \(value)") }
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
      if case .failed(let error) = state { reject("PROXY_ERROR", error.localizedDescription, nil) }
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

  private func receiveFullResponse(conn: NWConnection, accumulated: Data = Data(), completion: @escaping (Result<Data, Error>) -> Void) {
    conn.receive(minimumIncompleteLength: 1, maximumLength: 65536) { content, _, isComplete, error in
      var buffer = accumulated
      if let content = content { buffer.append(content) }
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
