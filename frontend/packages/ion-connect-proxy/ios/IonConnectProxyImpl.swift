import Foundation

@objc(IonConnectProxy)
class IonConnectProxyImpl: NSObject {

  private static let queue = DispatchQueue(label: "io.ion.ionconnectproxy", qos: .userInitiated)
  private var proxyPort: UInt16 = 0
  private let proxySession = URLSession(configuration: .default)

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

  // MARK: - HTTP Bridge

  @objc func proxyRequest(_ method: String, url: String, headersJSON: String, body: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    guard var request = buildProxyRequest(url) else { reject("PROXY_ERROR", "Invalid URL: \(url)", nil); return }
    request.httpMethod = method
    applyHeaders(headersJSON, to: &request)
    if !body.isEmpty { request.httpBody = body.data(using: .utf8) }
    proxySession.dataTask(with: request) { data, response, error in
      if let error = error { reject("PROXY_ERROR", error.localizedDescription, error); return }
      resolve(self.buildResponseJSON(data: data, response: response))
    }.resume()
  }

  @objc func proxyUpload(_ url: String, filePath: String, headersJSON: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    guard var request = buildProxyRequest(url) else { reject("PROXY_ERROR", "Invalid URL: \(url)", nil); return }
    request.httpMethod = "POST"
    applyHeaders(headersJSON, to: &request)
    let fileURL = URL(fileURLWithPath: filePath)
    proxySession.uploadTask(with: request, fromFile: fileURL) { data, response, error in
      if let error = error { reject("PROXY_ERROR", error.localizedDescription, error); return }
      resolve(self.buildResponseJSON(data: data, response: response))
    }.resume()
  }

  @objc func proxyDownload(_ url: String, destPath: String, headersJSON: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    guard var request = buildProxyRequest(url) else { reject("PROXY_ERROR", "Invalid URL: \(url)", nil); return }
    request.httpMethod = "GET"
    applyHeaders(headersJSON, to: &request)
    proxySession.downloadTask(with: request) { tempURL, response, error in
      if let error = error { reject("PROXY_ERROR", error.localizedDescription, error); return }
      guard let tempURL = tempURL else { reject("PROXY_ERROR", "No file downloaded", nil); return }
      do {
        let dest = URL(fileURLWithPath: destPath)
        try FileManager.default.moveItem(at: tempURL, to: dest)
        resolve(self.buildResponseJSON(data: nil, response: response))
      } catch {
        reject("PROXY_ERROR", error.localizedDescription, error)
      }
    }.resume()
  }

  // MARK: - Helpers

  private func buildProxyRequest(_ url: String) -> URLRequest? {
    guard let original = URL(string: url) else { return nil }
    let path = original.path.isEmpty ? "/" : original.path
    let query = original.query.map { "?\($0)" } ?? ""
    guard let proxyURL = URL(string: "http://127.0.0.1:\(proxyPort)\(path)\(query)") else { return nil }
    var request = URLRequest(url: proxyURL)
    if let host = original.host { request.setValue(host, forHTTPHeaderField: "Host") }
    return request
  }

  private func applyHeaders(_ headersJSON: String, to request: inout URLRequest) {
    guard let data = headersJSON.data(using: .utf8),
          let headers = try? JSONSerialization.jsonObject(with: data) as? [String: String] else { return }
    for (key, value) in headers { request.setValue(value, forHTTPHeaderField: key) }
  }

  private func buildResponseJSON(data: Data?, response: URLResponse?) -> String {
    let httpResponse = response as? HTTPURLResponse
    let status = httpResponse?.statusCode ?? 0
    let headers = (httpResponse?.allHeaderFields as? [String: String]) ?? [:]
    let body = data.flatMap { String(data: $0, encoding: .utf8) } ?? ""
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
