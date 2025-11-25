import { useState } from "react";

export default function TestConnection() {
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  
  const API_BASE = import.meta.env.VITE_API_BASE_URL || "https://shopifyapp.terzettoo.com";

  const testConnection = async () => {
    setLoading(true);
    setResult("Testing...\n");
    
    try {
      setResult(prev => prev + `\n📍 API URL: ${API_BASE}\n`);
      setResult(prev => prev + `\n🔄 Attempting fetch to: ${API_BASE}/api/photos/upload\n`);
      
      // Try OPTIONS request first (CORS preflight)
      const optionsResponse = await fetch(`${API_BASE}/api/photos/upload`, {
        method: "OPTIONS",
      });
      
      setResult(prev => prev + `\n✅ OPTIONS response: ${optionsResponse.status}\n`);
      
      // Try a simple POST with minimal data
      const formData = new FormData();
      formData.append("test", "true");
      
      const response = await fetch(`${API_BASE}/api/photos/upload`, {
        method: "POST",
        body: formData,
      });
      
      setResult(prev => prev + `\n📊 POST response status: ${response.status}\n`);
      setResult(prev => prev + `\n📝 Response headers:\n`);
      response.headers.forEach((value, key) => {
        setResult(prev => prev + `  ${key}: ${value}\n`);
      });
      
      const text = await response.text();
      setResult(prev => prev + `\n📄 Response body: ${text}\n`);
      
      if (response.ok) {
        setResult(prev => prev + `\n✅ Connection successful!`);
      } else {
        setResult(prev => prev + `\n⚠️ Server responded but with error`);
      }
      
    } catch (error: any) {
      setResult(prev => prev + `\n❌ Error: ${error.message}\n`);
      setResult(prev => prev + `\n🔍 This usually means:\n`);
      setResult(prev => prev + `  1. Server is not running\n`);
      setResult(prev => prev + `  2. Wrong URL\n`);
      setResult(prev => prev + `  3. CORS blocking request\n`);
      setResult(prev => prev + `  4. Network connectivity issue\n`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card animate-fade-in">
      <div className="text-center">
        <h1 className="header-title">🔧 Connection Test</h1>
        <p className="header-subtitle">Test API connectivity</p>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <p><strong>API Base URL:</strong></p>
        <code style={{ 
          display: 'block', 
          padding: '8px', 
          background: '#f5f5f5', 
          borderRadius: '4px',
          wordBreak: 'break-all'
        }}>
          {API_BASE}
        </code>
      </div>

      <button
        onClick={testConnection}
        disabled={loading}
        className="btn btn-primary"
        style={{ width: '100%', marginBottom: '20px' }}
      >
        {loading ? "Testing..." : "🧪 Test Connection"}
      </button>

      {result && (
        <div style={{
          background: '#1e1e1e',
          color: '#00ff00',
          padding: '16px',
          borderRadius: '8px',
          fontFamily: 'monospace',
          fontSize: '12px',
          whiteSpace: 'pre-wrap',
          maxHeight: '400px',
          overflowY: 'auto'
        }}>
          {result}
        </div>
      )}

      <div style={{ marginTop: '20px', padding: '12px', background: '#fff3cd', borderRadius: '6px' }}>
        <strong>💡 Troubleshooting:</strong>
        <ul style={{ margin: '8px 0', paddingLeft: '20px', fontSize: '14px' }}>
          <li>Make sure Shopify app is running: <code>npm run dev</code></li>
          <li>Check .env file has correct URL</li>
          <li>For local testing, both apps should use same protocol (http/https)</li>
          <li>CORS headers must be enabled on server</li>
        </ul>
      </div>
    </div>
  );
}
