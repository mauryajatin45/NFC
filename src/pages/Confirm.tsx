import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Confirm() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  
  const orderId = localStorage.getItem("currentOrderId");
  const nfcUid = localStorage.getItem("nfcUid");
  const gps = JSON.parse(localStorage.getItem("gps") || "{}");
  const mode = localStorage.getItem("mode");

  const handleSubmit = async () => {
    setLoading(true);
    try {
      // In a real app, this URL should be configurable
      // For local dev, we point to the Shopify App's API proxy or direct URL
      // Since this is a PWA, it might need to point to the public URL of the Shopify App
      const API_BASE = "https://shopifyapp.terzettoo.com"; 
      
      const endpoint = mode === "warehouse" ? "/api/enroll" : "/api/verify";
      
      // Construct payload based on mode
      // For enrollment, we need to send data to OUR Shopify App backend, 
      // which then calls the NFS backend.
      
      const formData = new FormData();
      formData.append("orderId", orderId || "");
      formData.append("nfcUid", nfcUid || "");
      // Generate a fake token for now as per spec it seems to come from tag or generated
      formData.append("nfcToken", "token_" + Math.random().toString(36).substr(2, 9));
      
      // Mock photos for now
      const mockPhotos = [
        "https://via.placeholder.com/150",
        "https://via.placeholder.com/150",
        "https://via.placeholder.com/150",
        "https://via.placeholder.com/150"
      ];
      formData.append("photoUrls", JSON.stringify(mockPhotos));
      
      // Mock hashes
      const mockHashes = ["hash1", "hash2", "hash3", "hash4"];
      formData.append("photoHashes", JSON.stringify(mockHashes));
      
      formData.append("shippingAddressGps", JSON.stringify(gps));
      
      const response = await fetch(`${API_BASE}${endpoint}`, {
        method: "POST",
        body: formData,
      });

      const result = await response.json();
      
      if (result.success) {
        alert("Success!");
        navigate("/home");
      } else {
        alert("Error: " + result.error);
      }
    } catch (error) {
      console.error(error);
      alert("Submission failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card animate-fade-in">
      <div className="text-center">
        <h1 className="header-title">
          Confirm {mode === "warehouse" ? "Enrollment" : "Verification"}
        </h1>
        <p className="header-subtitle">Review details before submitting</p>
      </div>

      <div className="details" style={{
        background: '#f9fafb',
        padding: '16px',
        borderRadius: '8px',
        border: '1px solid var(--border-color)'
      }}>
        <div style={{ marginBottom: '8px' }}>
          <strong style={{ color: 'var(--text-primary)' }}>Order:</strong> 
          <span style={{ float: 'right', color: 'var(--text-secondary)' }}>{orderId}</span>
        </div>
        <div style={{ marginBottom: '8px' }}>
          <strong style={{ color: 'var(--text-primary)' }}>NFC UID:</strong> 
          <span style={{ float: 'right', color: 'var(--text-secondary)' }}>{nfcUid}</span>
        </div>
        <div>
          <strong style={{ color: 'var(--text-primary)' }}>Location:</strong> 
          <span style={{ float: 'right', color: 'var(--text-secondary)' }}>
            {gps.lat?.toFixed(4)}, {gps.lng?.toFixed(4)}
          </span>
        </div>
      </div>
      
      <div className="form-group mt-4">
        <button 
          onClick={handleSubmit} 
          disabled={loading} 
          className="btn btn-primary"
        >
          {loading ? "Submitting..." : "Submit"}
        </button>
        <button 
          onClick={() => navigate("/scan")} 
          className="btn btn-secondary"
        >
          Rescan
        </button>
      </div>
    </div>
  );
}
