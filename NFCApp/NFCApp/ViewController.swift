import UIKit
import WebKit
import CoreNFC

// Added WKNavigationDelegate to handle loading errors
class ViewController: UIViewController, WKScriptMessageHandler, NFCTagReaderSessionDelegate, WKNavigationDelegate {

    var webView: WKWebView!
    var tagSession: NFCTagReaderSession?
    var urlToWrite: String? // Store URL for NFC writing
    var isWriteMode: Bool = false // Track if we're in write mode
    
    // URL of your hosted web app
    let webAppUrl = "https://warehouse-bee05.web.app/"

    override func viewDidLoad() {
        super.viewDidLoad()
        
        // --- 1. CONFIGURATION ---
        let contentController = WKUserContentController()
        contentController.add(self, name: "nfcBridge")      // Listen for NFC reading
        contentController.add(self, name: "nfcWriteBridge") // Listen for NFC writing
        
        let config = WKWebViewConfiguration()
        config.userContentController = contentController
        
        // --- 2. SETUP WEBVIEW WITH AUTO LAYOUT ---
        webView = WKWebView(frame: .zero, configuration: config)
        
        // Enable Debug Logging
        webView.navigationDelegate = self
        
        // Turn off manual frame sizing (Auto Layout)
        webView.translatesAutoresizingMaskIntoConstraints = false
        
        // --- 3. DARK MODE FIX (Force White Background) ---
        // This ensures the screen isn't black even if the website is transparent
        view.backgroundColor = .white
        webView.backgroundColor = .white
        webView.isOpaque = false
        
        // Add to view
        view.addSubview(webView)
        
        // --- 4. CONSTRAINTS (Fill Screen) ---
        NSLayoutConstraint.activate([
            webView.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor), // Use Safe Area
            webView.bottomAnchor.constraint(equalTo: view.bottomAnchor),
            webView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            webView.trailingAnchor.constraint(equalTo: view.trailingAnchor)
        ])
        
        // --- 5. LOAD APP ---
        print("🚀 Attempting to load: \(webAppUrl)")
        if let url = URL(string: webAppUrl) {
            let request = URLRequest(url: url)
            webView.load(request)
        }
    }

    // MARK: - WKNavigationDelegate (Debug Logs)
    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        print("✅ WEBVIEW LOADED SUCCESSFULLY")
    }
    
    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        print("❌ WEBVIEW FAILED TO LOAD: \(error.localizedDescription)")
    }

    // MARK: - WKScriptMessageHandler
    // Receive messages from JavaScript
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        if message.name == "nfcBridge", let body = message.body as? String {
            if body == "startScan" {
                startNFCScan()
            }
        } else if message.name == "nfcWriteBridge", let urlString = message.body as? String {
            // Received URL to write to NFC tag
            startNFCWrite(url: urlString)
        }
    }

    // MARK: - NFC Scanning (Read Mode)
    func startNFCScan() {
        guard NFCTagReaderSession.readingAvailable else {
            print("NFC not available")
            return
        }
        
        isWriteMode = false
        tagSession = NFCTagReaderSession(pollingOption: .iso14443, delegate: self)
        tagSession?.alertMessage = "Hold your iPhone near the tag to scan."
        tagSession?.begin()
    }
    
    // MARK: - NFC Writing (Write Mode)
    func startNFCWrite(url: String) {
        guard NFCTagReaderSession.readingAvailable else {
            sendWriteResult(success: false, error: "NFC not available on this device")
            return
        }
        
        isWriteMode = true
        urlToWrite = url
        tagSession = NFCTagReaderSession(pollingOption: .iso14443, delegate: self)
        tagSession?.alertMessage = "Hold iPhone near the tag to write."
        tagSession?.begin()
    }
    
    // MARK: - NFCTagReaderSessionDelegate
    
    func tagReaderSessionDidBecomeActive(_ session: NFCTagReaderSession) {
        print("NFC session became active")
    }
    
    func tagReaderSession(_ session: NFCTagReaderSession, didInvalidateWithError error: Error) {
        print("NFC Session Invalidated: \(error.localizedDescription)")
    }
    
    func tagReaderSession(_ session: NFCTagReaderSession, didDetect tags: [NFCTag]) {
        guard let tag = tags.first else {
            session.invalidate(errorMessage: "No tag detected")
            return
        }
        
        // Connect to the tag
        session.connect(to: tag) { error in
            if let error = error {
                session.invalidate(errorMessage: "Connection error: \(error.localizedDescription)")
                if self.isWriteMode {
                    self.sendWriteResult(success: false, error: error.localizedDescription)
                }
                return
            }
            
            // Check if it's an NDEF tag
            guard case let .miFare(mifareTag) = tag else {
                session.invalidate(errorMessage: "Unsupported tag type")
                if self.isWriteMode {
                    self.sendWriteResult(success: false, error: "Unsupported tag type")
                }
                return
            }
            
            if self.isWriteMode {
                // WRITE MODE: Write URL to tag
                self.writeToTag(session: session, tag: mifareTag)
            } else {
                // READ MODE: Get tag UID
                self.readFromTag(session: session, tag: mifareTag)
            }
        }
    }
    
    // MARK: - Read Tag UID
    func readFromTag(session: NFCTagReaderSession, tag: NFCMiFareTag) {
        // Get the actual hardware UID
        let tagIdentifier = tag.identifier
        let uidString = tagIdentifier.map { String(format: "%02x", $0) }.joined(separator: ":")
        
        print("✅ Tag UID: \(uidString)")
        
        session.alertMessage = "✅ Tag scanned!"
        session.invalidate()
        
        // Send UID to web app
        DispatchQueue.main.async {
            self.sendDataToWeb(data: uidString)
        }
    }
    
    // MARK: - Write to Tag
    func writeToTag(session: NFCTagReaderSession, tag: NFCMiFareTag) {
        guard let urlString = self.urlToWrite else {
            session.invalidate(errorMessage: "No URL to write")
            sendWriteResult(success: false, error: "No URL specified")
            return
        }
        
        // Query NDEF status
        tag.queryNDEFStatus { status, capacity, error in
            if let error = error {
                session.invalidate(errorMessage: "NDEF query failed")
                self.sendWriteResult(success: false, error: error.localizedDescription)
                return
            }
            
            // Check if tag is writable
            guard status == .readWrite else {
                session.invalidate(errorMessage: "Tag is not writable")
                self.sendWriteResult(success: false, error: "Tag is read-only or not formatted")
                return
            }
            
            // Create NDEF URI payload
            guard let payload = NFCNDEFPayload.wellKnownTypeURIPayload(string: urlString) else {
                session.invalidate(errorMessage: "Invalid URL format")
                self.sendWriteResult(success: false, error: "Invalid URL format")
                return
            }
            
            let message = NFCNDEFMessage(records: [payload])
            
            // Write to tag
            tag.writeNDEF(message) { error in
                if let error = error {
                    session.invalidate(errorMessage: "Write failed: \(error.localizedDescription)")
                    self.sendWriteResult(success: false, error: error.localizedDescription)
                } else {
                    session.alertMessage = "✅ Write successful!"
                    session.invalidate()
                    self.sendWriteResult(success: true, error: nil)
                }
            }
        }
        
        // Clear URL after write attempt
        self.urlToWrite = nil
        self.isWriteMode = false
    }
    
    // MARK: - Send Results to Web
    func sendDataToWeb(data: String) {
        let js = "window.handleIOSScan('\(data)');"
        webView.evaluateJavaScript(js, completionHandler: nil)
    }
    
    func sendWriteResult(success: Bool, error: String?) {
        DispatchQueue.main.async {
            let successStr = success ? "true" : "false"
            let errorParam = error != nil ? ", '\(error!)'" : ""
            let js = "window.handleIOSWriteResult(\(successStr)\(errorParam));"
            self.webView.evaluateJavaScript(js, completionHandler: nil)
        }
    }
}
