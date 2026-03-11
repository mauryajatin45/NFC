import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import LoadingOverlay from "../components/LoadingOverlay";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "https://shopify-app-250065525755.us-central1.run.app";
const MAX_FILES = 10;

export default function CapturePhotos() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [loadingProgress, setLoadingProgress] = useState({ current: 0, total: 0 });
  
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [mediaPreviews, setMediaPreviews] = useState<{url: string; type: string}[]>([]);

  const orderId = localStorage.getItem("currentOrderId");
  const orderName = localStorage.getItem("currentOrderName") || orderId || "ORD-UNKNOWN";
  const nfcUid = localStorage.getItem("nfcUid");
  const gps = JSON.parse(localStorage.getItem("gps") || "{}");
  const orderDetails = JSON.parse(localStorage.getItem("currentOrderDetails") || "null");
  const shippingAddress = localStorage.getItem("currentShippingAddress") || undefined;
  const token = localStorage.getItem("token") || "";

  // Cleanup object URLs to prevent memory leaks when component unmounts
  useEffect(() => {
    return () => {
      mediaPreviews.forEach((preview) => URL.revokeObjectURL(preview.url));
    };
  }, []);

  const compressImage = async (file: File): Promise<File> => {
    // If it's a video, we cannot easily compress it in the browser, so pass it through
    if (file.type.startsWith("video/")) {
      return file;
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let width = img.width;
          let height = img.height;
          const MAX_SIZE = 1280;
          if (width > height && width > MAX_SIZE) { height = (height * MAX_SIZE) / width; width = MAX_SIZE; }
          else if (height > MAX_SIZE) { width = (width * MAX_SIZE) / height; height = MAX_SIZE; }
          canvas.width = width;
          canvas.height = height;
          canvas.getContext("2d")?.drawImage(img, 0, 0, width, height);
          canvas.toBlob(
            (blob) => blob ? resolve(new File([blob], file.name, { type: "image/jpeg", lastModified: Date.now() })) : reject(new Error("Compression failed")),
            "image/jpeg", 0.75
          );
        };
        img.onerror = reject;
      };
      reader.onerror = reject;
    });
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (mediaFiles.length + files.length > MAX_FILES) { 
      alert(`Maximum ${MAX_FILES} attachments allowed`); 
      return; 
    }
    
    try {
      const processed = await Promise.all(files.map(compressImage));
      
      const newFiles = [...mediaFiles, ...processed].slice(0, MAX_FILES);
      setMediaFiles(newFiles);
      
      // Use URL.createObjectURL which is instantaneous and consumes virtually 0 memory
      // compared to reading heavy videos into a base64 string via FileReader.
      const newPreviews = processed.map(file => ({
        url: URL.createObjectURL(file),
        type: file.type
      }));
      setMediaPreviews((prev) => [...prev, ...newPreviews]);
      
      event.target.value = "";
    } catch (err) {
      console.error("Processing error:", err);
      alert("Failed to process media. Please try again.");
    }
  };

  const removeMedia = (index: number) => {
    // Revoke the URL to free memory
    URL.revokeObjectURL(mediaPreviews[index].url);
    
    setMediaFiles((prev) => prev.filter((_, i) => i !== index));
    setMediaPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleContinueToWrite = async () => {
    if (mediaFiles.length === 0) { alert("Please attach at least 1 photo or video"); return; }
    if (!orderId || !nfcUid) { alert("Missing order or NFC tag data. Please restart."); return; }

    setLoading(true);

    try {
      // ── Step 1: Enroll the order with the INK API
      setLoadingMessage("Enrolling order...");
      setLoadingProgress({ current: 1, total: mediaFiles.length + 2 });

      const enrollBody: any = {
        orderId,
        nfcToken: nfcUid,
        nfcUid,
        shippingAddress,
        orderDetails,
      };

      if (gps?.lat && gps?.lng) {
        enrollBody.warehouseLat = gps.lat;
        enrollBody.warehouseLng = gps.lng;
      }

      const enrollRes = await fetch(`${API_BASE}/app/api/warehouse/enroll`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(enrollBody),
      });

      const enrollData = await enrollRes.json();

      if (!enrollRes.ok || !enrollData.success) {
        throw new Error(enrollData.error || "Enrollment failed");
      }

      const proofId = enrollData.proof_id;
      const nfcToken = enrollData.nfcToken;

      localStorage.setItem("proofId", proofId);
      localStorage.setItem("nfcToken", nfcToken);

      // ── Step 2: Upload photos/videos to INK API
      const formData = new FormData();
      formData.append("proof_id", proofId);
      formData.append("source", "warehouse");

      for (let i = 0; i < mediaFiles.length; i++) {
        setLoadingProgress({ current: i + 2, total: mediaFiles.length + 2 });
        setLoadingMessage(`Uploading file ${i + 1} of ${mediaFiles.length}...`);
        formData.append("media", mediaFiles[i]);
      }

      const uploadRes = await fetch(`${API_BASE}/app/api/warehouse/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const uploadData = await uploadRes.json();

      if (!uploadRes.ok || !uploadData.success) {
        throw new Error(uploadData.error || "Media upload failed");
      }

      setLoadingProgress({ current: mediaFiles.length + 2, total: mediaFiles.length + 2 });
      setLoadingMessage("Enrollment complete!");

      setTimeout(() => {
        navigate("/write");
      }, 800);
    } catch (error: any) {
      console.error("Process error:", error);
      alert(`❌ Error: ${error.message || "Operation failed"}`);
      setLoading(false);
    }
  };

  const triggerFileInput = () => document.getElementById("media-input")?.click();

  return (
    <div className="photos-page">
      <LoadingOverlay
        isVisible={loading}
        message={loadingMessage}
        progress={loadingProgress}
        orderName={orderName}
      />

      {/* Hidden File Input */}
      <input
        type="file"
        accept="image/*,video/*"
        capture="environment"
        multiple
        id="media-input"
        style={{ display: "none" }}
        onChange={handleFileSelect}
      />

      {/* Black Header Strip */}
      <div className="header-strip">
        <span className="header-order-id">{orderName}</span>
      </div>

      {/* Cancel Button */}
      <button className="cancel-btn" onClick={() => navigate("/scan")}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M15 18l-6-6 6-6" />
        </svg>
        Cancel
      </button>

      {/* Step Indicator */}
      <div className="step-indicator">
        <div className="step completed" onClick={() => navigate("/scan")} style={{ cursor: "pointer" }}>
          <div className="step-number"></div>
          <div className="step-label">Scan</div>
        </div>
        <svg className="step-arrow" viewBox="0 0 12 12">
          <path d="M4 2L8 6L4 10" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <div className="step active">
          <div className="step-number">2</div>
          <div className="step-label">{mediaFiles.length > 0 ? `${mediaFiles.length}/${MAX_FILES}` : "Media"}</div>
        </div>
        <svg className="step-arrow" viewBox="0 0 12 12">
          <path d="M4 2L8 6L4 10" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <div className="step">
          <div className="step-number">3</div>
          <div className="step-label">Write</div>
        </div>
        <svg className="step-arrow" viewBox="0 0 12 12">
          <path d="M4 2L8 6L4 10" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <div className="step">
          <div className="step-number">4</div>
          <div className="step-label">Done</div>
        </div>
      </div>

      {/* Content */}
      <div className="photos-content" style={{ marginTop: "8px", justifyContent: "flex-start", overflowY: "auto", paddingBottom: "100px" }}>
        <h1 className="photos-title">Capture Media</h1>
        <p className="photos-subtitle">
          {mediaFiles.length > 0 
            ? `${mediaFiles.length} of ${MAX_FILES} attached` 
            : "Tap here to capture photos or videos"}
        </p>

        {/* Dynamic Grid */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", marginTop: "24px" }}>
          {mediaPreviews.map((preview, index) => (
            <div
              key={index}
              className="photo-box filled"
              style={{ width: "calc(50% - 6px)", aspectRatio: "1/1", position: "relative" }}
            >
              {preview.type.startsWith("video/") ? (
                <>
                  <video src={preview.url} className="photo-preview-img" style={{ objectFit: "cover", width: "100%", height: "100%", borderRadius: "12px" }} />
                  <div style={{ position: "absolute", top: "8px", left: "8px", background: "rgba(0,0,0,0.6)", padding: "4px 8px", borderRadius: "12px" }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="white" stroke="white" strokeWidth="2">
                      <polygon points="5 3 19 12 5 21 5 3"></polygon>
                    </svg>
                  </div>
                </>
              ) : (
                <img src={preview.url} alt={`Media ${index + 1}`} className="photo-preview-img" style={{ objectFit: "cover", width: "100%", height: "100%", borderRadius: "12px" }} />
              )}
              
              <div className="photo-checkmark">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <button className="photo-remove-btn" onClick={(e) => { e.stopPropagation(); removeMedia(index); }}>×</button>
            </div>
          ))}

          {mediaFiles.length < MAX_FILES && (
            <div
              className="photo-box next-empty"
              onClick={triggerFileInput}
              style={{ width: "calc(50% - 6px)", aspectRatio: "1/1", border: "2px dashed #e5e7eb", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", background: "#f9fafb" }}
            >
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </div>
          )}
        </div>

        <p className="photo-helper-text" style={{ marginTop: "16px" }}>
          {mediaFiles.length > 0 ? "Tap + to add more" : "Tap the box above to start"}
        </p>

        {mediaFiles.length > 0 && (
          <button className="btn-continue-write" onClick={handleContinueToWrite} style={{ marginTop: "24px" }}>
            Continue to Write
          </button>
        )}
      </div>
    </div>
  );
}
