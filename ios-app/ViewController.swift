import UIKit
import WebKit
import CoreNFC

class ViewController: UIViewController, WKScriptMessageHandler, NFCTagReaderSessionDelegate {

    var webView: WKWebView!
    var tagSession: NFCTagReaderSession?
    var urlToWrite: String? // Store URL for NFC writing
    var isWriteMode: Bool = false // Track if we're in write mode
    
    // URL of your hosted web app (or local IP for testing)
    // IMPORTANT: Change this to your actual deployed URL or local IP
    let webAppUrl = "https://your-web-app-url.com/login" 

    override func viewDidLoad() {
        super.viewDidLoad()
        
        // 1. Setup WebView with Bridges
        let contentController = WKUserContentController()
        contentController.add(self, name: "nfcBridge") // Listen for NFC reading
        contentController.add(self, name: "nfcWriteBridge") // Listen for NFC writing
        
        let config = WKWebViewConfiguration()
        config.userContentController = contentController
        
        webView = WKWebView(frame: view.bounds, configuration: config)
        webView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        view.addSubview(webView)
        
        // 2. Load the Web App
        if let url = URL(string: webAppUrl) {
            let request = URLRequest(url: url)
            webView.load(request)
        }
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
        // Get the actual hardware UID (like Android's serialNumber)
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
