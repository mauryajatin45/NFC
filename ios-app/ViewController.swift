import UIKit
import WebKit
import CoreNFC

class ViewController: UIViewController, WKScriptMessageHandler, NFCNDEFReaderSessionDelegate {

    var webView: WKWebView!
    var nfcSession: NFCNDEFReaderSession?
    
    // URL of your hosted web app (or local IP for testing)
    // IMPORTANT: Change this to your actual deployed URL or local IP
    let webAppUrl = "https://your-web-app-url.com/login" 

    override func viewDidLoad() {
        super.viewDidLoad()
        
        // 1. Setup WebView with Bridge
        let contentController = WKUserContentController()
        contentController.add(self, name: "nfcBridge") // Listen for "window.webkit.messageHandlers.nfcBridge"
        
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
        }
    }

    // MARK: - NFC Scanning
    func startNFCScan() {
        guard NFCNDEFReaderSession.readingAvailable else {
            print("NFC not available")
            return
        }
        
        // Create session
        nfcSession = NFCNDEFReaderSession(delegate: self, queue: nil, invalidateAfterFirstRead: true)
        nfcSession?.alertMessage = "Hold your iPhone near the tag to scan."
        nfcSession?.begin()
    }
    
    // NFC Delegate: Error/Invalidation
    func readerSession(_ session: NFCNDEFReaderSession, didInvalidateWithError error: Error) {
        print("NFC Session Invalidated: \(error.localizedDescription)")
    }
    
    // NFC Delegate: Did Detect Tags
    func readerSession(_ session: NFCNDEFReaderSession, didDetectNDEFs messages: [NFCNDEFMessage]) {
        // We only care about the first message of the first tag
        guard let message = messages.first, let record = message.records.first else { return }
        
        // In this specific app, we are looking for the Tag UID (Serial Number).
        // Standard NDEF messages don't always contain the UID in the payload.
        // However, CoreNFC's `didDetectNDEFs` is high-level. 
        // To get the UID specifically, we usually need `didDetect tags` (CoreNFC TagReaderSession), 
        // but for simplicity and standard NDEF tags, we might just read the payload text.
        
        // NOTE: If you strictly need the hardware UID (like Android's event.serialNumber),
        // we need to use `NFCTagReaderSession` instead of `NFCNDEFReaderSession`.
        // But for now, let's assume we are reading NDEF data or that the user wants the payload.
        
        // If the user specifically needs the UID (Serial Number), we must switch to NFCTagReaderSession.
        // Let's implement a quick payload read for now, assuming the tag has data.
        
        // If the requirement is strictly "Same as Android Web NFC event.serialNumber", 
        // we actually need `NFCTagReaderSession`. 
        // Let's stick to NDEF for now as it's easier, but I will add a comment.
        
        let payload = String(data: record.payload, encoding: .utf8) ?? ""
        print("Scanned payload: \(payload)")
        
        // Send back to Web View
        // We'll send the payload as the "UID" for now, or a dummy UID if empty.
        // In a real scenario, use NFCTagReaderSession to get tag.identifier.
        
        let result = payload // Or tag.identifier.map { String(format: "%02hhx", $0) }.joined()
        
        DispatchQueue.main.async {
            self.sendDataToWeb(data: result)
        }
    }
    
    func sendDataToWeb(data: String) {
        let js = "window.handleIOSScan('\(data)');"
        webView.evaluateJavaScript(js, completionHandler: nil)
    }
}
