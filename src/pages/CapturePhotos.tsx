import { useState } from "react";
import { useNavigate } from "react-router-dom";
import LoadingOverlay from "../components/LoadingOverlay";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "https://shopify-app-250065525755.us-central1.run.app";

export default function CapturePhotos() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [loadingProgress, setLoadingProgress] = useState({ current: 0, total: 0 });
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);

  const orderId = localStorage.getItem("currentOrderId");
  const orderName = localStorage.getItem("currentOrderName") || orderId || "ORD-UNKNOWN";
  const nfcUid = localStorage.getItem("nfcUid");
  const gps = JSON.parse(localStorage.getItem("gps") || "{}");
  const orderDetails = JSON.parse(localStorage.getItem("currentOrderDetails") || "null");
  const shippingAddress = localStorage.getItem("currentShippingAddress") || undefined;
  const token = localStorage.getItem("token") || "";

  const compressImage = async (file: File): Promise<File> => {
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
    if (photos.length + files.length > 4) { alert("Maximum 4 photos allowed"); return; }
    try {
      const compressed = await Promise.all(files.map(compressImage));
      const newPhotos = [...photos, ...compressed].slice(0, 4);
      setPhotos(newPhotos);
      compressed.forEach((file) => {
        const reader = new FileReader();
        reader.onloadend = () => setPhotoPreviews((prev) => [...prev, reader.result as string]);
        reader.readAsDataURL(file);
      });
      event.target.value = "";
    } catch (err) {
      console.error("Compression error:", err);
      alert("Failed to process images. Please try again.");
    }
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    setPhotoPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleContinueToWrite = async () => {
    if (photos.length === 0) { alert("Please select at least 1 photo"); return; }
    if (!orderId || !nfcUid) { alert("Missing order or NFC tag data. Please restart."); return; }

    setLoading(true);

    try {
      // ── Step 1: Enroll the order with the INK API ──────────────────────────
      setLoadingMessage("Enrolling order...");
      setLoadingProgress({ current: 1, total: photos.length + 2 });

      const enrollBody: any = {
        orderId,
        nfcToken: nfcUid, // Use NFC hardware UID as the token
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

      // ── Step 2: Upload photos to INK API ─────────────────────────────────
      const formData = new FormData();
      formData.append("proof_id", proofId);
      formData.append("source", "warehouse");

      for (let i = 0; i < photos.length; i++) {
        setLoadingProgress({ current: i + 2, total: photos.length + 2 });
        setLoadingMessage(`Uploading photo ${i + 1} of ${photos.length}...`);
        formData.append("media", photos[i]);
      }

      const uploadRes = await fetch(`${API_BASE}/app/api/warehouse/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const uploadData = await uploadRes.json();

      if (!uploadRes.ok || !uploadData.success) {
        throw new Error(uploadData.error || "Photo upload failed");
      }

      setLoadingProgress({ current: photos.length + 2, total: photos.length + 2 });
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

  const triggerFileInput = () => document.getElementById("photo-input")?.click();

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
        accept="image/*"
        capture="environment"
        multiple
        id="photo-input"
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
          <div className="step-label">{photos.length > 0 ? `${photos.length}/4` : "Photos"}</div>
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
      <div className="photos-content" style={{ marginTop: "8px", justifyContent: "flex-start" }}>
        <h1 className="photos-title">Capture Photos</h1>
        <p className="photos-subtitle">
          {photos.length > 0 ? `${photos.length}/4 captured` : "Tap a box to take a photo."}
        </p>

        {/* Photo Grid - 2x2 */}
        <div className="photo-grid-2x2">
          {[0, 1, 2, 3].map((index) => {
            const hasPhoto = photoPreviews[index];
            const isNextEmpty = !hasPhoto && index === photos.length;
            return (
              <div
                key={index}
                className={`photo-box ${hasPhoto ? "filled" : ""} ${isNextEmpty ? "next-empty" : ""}`}
                onClick={triggerFileInput}
              >
                {hasPhoto ? (
                  <>
                    <img src={photoPreviews[index]} alt={`Photo ${index + 1}`} className="photo-preview-img" />
                    <div className="photo-checkmark">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                    <button className="photo-remove-btn" onClick={(e) => { e.stopPropagation(); removePhoto(index); }}>×</button>
                  </>
                ) : (
                  isNextEmpty && (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                  )
                )}
              </div>
            );
          })}
        </div>

        <p className="photo-helper-text">{photos.length > 0 ? "Tap to add or replace" : "Tap box to add photo"}</p>

        {photos.length > 0 && (
          <button className="btn-continue-write" onClick={handleContinueToWrite}>
            Continue to Write
          </button>
        )}
      </div>
    </div>
  );
}
