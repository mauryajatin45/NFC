import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useOrders } from "@/hooks/useOrders";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { InkHeading, InkSubheading } from "@/components/InkScreen";
import { cn } from "@/lib/utils";
import { Camera, Check, Wifi, Loader2, AlertTriangle, X, Play, Upload, ChevronLeft } from "lucide-react";
import { Progress } from "@/components/ui/progress";

/**
 * Compresses an image File to at most MAX_DIMENSION px on its longest side,
 * at JPEG_QUALITY quality. Reduces 2-5MB phone photos to ~200-400KB.
 * Videos are returned unchanged.
 */
const MAX_DIMENSION = 1280;
const JPEG_QUALITY = 0.82;

async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file; // skip videos
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const { width, height } = img;
      const scale = Math.min(1, MAX_DIMENSION / Math.max(width, height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(width * scale);
      canvas.height = Math.round(height * scale);
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        if (!blob) { resolve(file); return; }
        const compressed = new File([blob], file.name.replace(/\.\w+$/, ".jpg"), { type: "image/jpeg" });
        console.log(`[compress] ${file.name}: ${(file.size/1024).toFixed(0)}KB → ${(compressed.size/1024).toFixed(0)}KB`);
        resolve(compressed);
      }, "image/jpeg", JPEG_QUALITY);
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });
}

declare global {
  interface Window {
    webkit?: {
      messageHandlers?: {
        nfcBridge?: {
          postMessage: (message: string) => void;
        };
        nfcWriteBridge?: {
          postMessage: (message: string) => void;
        };
      };
    };
    handleIOSScan?: (nfcUid: string) => void;
    handleIOSWriteResult?: (success: boolean, error?: string) => void;
  }
}

type EnrollmentStep = "scan" | "photos" | "uploading" | "writeTag" | "complete";
type ScanState = "listening" | "detected" | "done" | "error";
type WriteTagState = "waiting" | "writing" | "done" | "error";
type MediaType = "photo" | "video";
type MediaState = {
  url: string;
  file: File;
  status: "pending" | "uploading" | "done" | "error";
  type: MediaType;
  duration?: number; // for videos, in seconds
  media_id?: string; // Captured from backend
};

export default function EnrollNfc() {
  const location = useLocation();
  const navigate = useNavigate();
  const orderId = location.state?.orderId || "ORD-UNKNOWN";
  const abortControllerRef = useRef<AbortController | null>(null);

  // Check if running in iOS Wrapper
  const isIOSWrapper = typeof window !== 'undefined' && 
                       window.webkit?.messageHandlers?.nfcBridge !== undefined;

  // Fetch full orders context so we can get customer_email, line_items, shipping_address
  const { data: orders } = useOrders();
  const orderDetails = orders?.find(o => o.id === orderId);

  const [currentStep, setCurrentStep] = useState<EnrollmentStep>("scan");
  const [scanState, setScanState] = useState<ScanState>("listening");
  const [scanError, setScanError] = useState<string | null>(null);
  const [writeTagState, setWriteTagState] = useState<WriteTagState>("waiting");
  const [media, setMedia] = useState<MediaState[]>([]);
  const [skippedWrite, setSkippedWrite] = useState(false);

  // Stores proof_id + nfc_token after successful enrollment
  const [enrollmentResult, setEnrollmentResult] = useState<{ proof_id: string; nfc_token: string; url_to_write: string } | null>(null);

  // Upload progress state
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0, status: "" });

  // GPS location state — required before NFC scan
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);

  const captureGpsLocation = () => {
    if (!navigator.geolocation) {
      setGpsError("Geolocation is not supported on this device.");
      return;
    }
    setGpsLoading(true);
    setGpsError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGpsLoading(false);
      },
      (err) => {
        setGpsLoading(false);
        if (err.code === err.PERMISSION_DENIED) {
          setGpsError("Location access denied. Please allow location in your browser settings and try again.");
        } else {
          setGpsError(`Location error: ${err.message}`);
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // REAL NFC Scan logic
  useEffect(() => {
    // Setup iOS listeners
    if (isIOSWrapper) {
      window.handleIOSScan = (nfcUid: string) => {
        handleTagRead(nfcUid);
      };
    }
    
    if (currentStep === "scan" && scanState === "listening") {
      const startScan = async () => {
        // 1. iOS Native Bridge Path
        if (isIOSWrapper) {
          try {
            window.webkit?.messageHandlers?.nfcBridge?.postMessage("startScan");
          } catch (err) {
            console.error("Failed to call iOS bridge", err);
            setScanState("detected"); // Fallback for testing or simulate error
          }
          return;
        }

        // 2. Android Web NFC Path
        if (!("NDEFReader" in window)) {
          setScanState("error");
          setScanError("NFC is not supported on this browser. You must use Android Chrome or the INK iOS App to scan tags.");
          return;
        }

        try {
          const ndef = new (window as any).NDEFReader();
          abortControllerRef.current = new AbortController();
          await ndef.scan({ signal: abortControllerRef.current.signal });
          
          ndef.onreading = (event: any) => {
            const serialNumber = event.serialNumber;
            abortControllerRef.current?.abort();
            handleTagRead(serialNumber);
          };
        } catch (error: any) {
          if (error.name !== 'AbortError') {
             console.error("Error starting NFC scan", error);
             setScanState("error");
             setScanError(`NFC Error: ${error.message || "Could not start scan. Check device permissions."}`);
          }
        }
      };

      startScan();
    }

    return () => {
      if (window.handleIOSScan) delete window.handleIOSScan;
      abortControllerRef.current?.abort();
    };
  }, [currentStep, scanState, isIOSWrapper]);

  const handleTagRead = (nfcUid: string) => {
    setScanState("detected");
    localStorage.setItem("enrollment_nfcUid", nfcUid); // save for later if needed
    setTimeout(() => {
      setScanState("done");
      setTimeout(() => setCurrentStep("photos"), 600);
    }, 800);
  };

  // REAL API request AND Physical Tag Write Logic
  useEffect(() => {
    if (isIOSWrapper) {
      window.handleIOSWriteResult = (success: boolean, errorMsg?: string) => {
        if (success) {
          setWriteTagState("done");
          setTimeout(() => setCurrentStep("complete"), 600);
        } else {
          setWriteTagState("error");
          console.error("iOS Write failed: ", errorMsg);
        }
      };
    }

    if (currentStep === "writeTag" && writeTagState === "waiting") {
      const doNfcWrite = async () => {
        try {
          setWriteTagState("writing");

          const urlToWrite = enrollmentResult?.url_to_write;
          if (!urlToWrite) throw new Error("No enrollment URL to write");

          // iOS native write
          if (isIOSWrapper) {
            window.webkit?.messageHandlers?.nfcWriteBridge?.postMessage(urlToWrite);
            return;
          }

          if (!("NDEFReader" in window)) {
            console.error("NFC writing not supported on this browser.");
            setWriteTagState("error");
            return;
          }

          const ndef = new (window as any).NDEFReader();
          await ndef.write({ records: [{ recordType: "url", data: urlToWrite }] });

          setWriteTagState("done");
          setTimeout(() => setCurrentStep("complete"), 600);
        } catch (error) {
          console.error("NFC write failed:", error);
          setWriteTagState("error");
        }
      };

      const timer = setTimeout(doNfcWrite, 500);
      return () => clearTimeout(timer);
    }

    return () => {
      if (window.handleIOSWriteResult) delete window.handleIOSWriteResult;
    };
  }, [currentStep, writeTagState, enrollmentResult, isIOSWrapper]);

  // Get video duration helper
  const getVideoDuration = (file: File): Promise<number> => {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        URL.revokeObjectURL(video.src);
        resolve(Math.round(video.duration));
      };
      video.onerror = () => resolve(0);
      video.src = URL.createObjectURL(file);
    });
  };

  // Format duration as MM:SS
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle media selection (photos and videos)
  const handleMediaSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newMedia: MediaState[] = [];

    for (const file of Array.from(files)) {
      const isVideo = file.type.startsWith('video/');
      const url = URL.createObjectURL(file);

      let duration: number | undefined;
      if (isVideo) {
        duration = await getVideoDuration(file);
      }

      newMedia.push({
        url,
        file,
        status: "pending",
        type: isVideo ? "video" : "photo",
        duration
      });
    }

    setMedia(prev => [...prev, ...newMedia]);
    e.target.value = "";
  };

  // Remove a media item
  const handleRemoveMedia = (index: number) => {
    setMedia(prev => {
      const updated = [...prev];
      URL.revokeObjectURL(updated[index].url);
      updated.splice(index, 1);
      return updated;
    });
  };

  // Continue to Write - start ENROLL then UPLOAD then advance to NFC write
  const handleContinueToWrite = async () => {
    const pendingMedia = media.filter(m => m.status === "pending");

    // Show uploading screen
    setCurrentStep("uploading");
    setUploadProgress({ current: 0, total: pendingMedia.length, status: "Enrolling order..." });

    try {
      const WAREHOUSE_PROXY_URL = import.meta.env.VITE_SHOPIFY_APP_URL;
      console.group("📦 [EnrollNfc] handleContinueToWrite START");
      console.log("Proxy URL:", WAREHOUSE_PROXY_URL);
      console.log("Order ID:", orderId);
      console.log("Pending media count:", pendingMedia.length);
      console.log("Media items:", pendingMedia.map(m => ({ name: m.file.name, size: `${(m.file.size/1024).toFixed(1)}KB`, type: m.type })));
      if (!WAREHOUSE_PROXY_URL) throw new Error("Missing VITE_SHOPIFY_APP_URL");
      const token = localStorage.getItem('token');
      console.log("Auth token present:", !!token, "| prefix:", token?.slice(0, 20) + "...");
      if (!token) throw new Error("Not authenticated");

      // ── Step 1: Enroll the order first to get proof_id ──
      const scannedUid = localStorage.getItem("enrollment_nfcUid") || "MOCK-UID";
      const nfcToken = `nfc_${orderId.replace(/\W+/g, '_').toLowerCase()}_${Date.now()}`;
      const urlToWrite = `https://in.ink/${nfcToken}`;

      const enrollPayload = {
        order_id: orderId,
        nfc_token: nfcToken,
        nfc_uid: scannedUid,
        order_number: (orderDetails?.name || orderId).replace(/^#/, ""),
        customer_email: orderDetails?.customer?.email || location.state?.customerEmail || "unknown@example.com",
        customer_phone: orderDetails?.customer?.phone || location.state?.customerPhone,
        shipping_address: orderDetails?.shippingAddress || location.state?.shippingAddress || {
          line1: "Not Provided",
          city: "Unknown",
          country: "US"
        },
        product_details: orderDetails?.items?.map((item: any) => ({
          sku: item.sku || "SKU-UNKNOWN",
          name: item.name || item.title || "Product",
          quantity: item.quantity || 1,
          price: item.value || item.price || 0
        })) || [],
        warehouse_location: gpsCoords || { lat: 40.7128, lng: -74.0060 },
      };

      console.log("🔗 [EnrollNfc] Enroll payload:", { order_id: orderId, nfc_token: nfcToken, nfc_uid: scannedUid, order_number: enrollPayload.order_number, product_details_count: enrollPayload.product_details.length });
      console.log("🚀 [EnrollNfc] POST to:", `${WAREHOUSE_PROXY_URL}/app/api/warehouse/enroll`);
      const enrollStart = Date.now();
      const enrollRes = await fetch(`${WAREHOUSE_PROXY_URL}/app/api/warehouse/enroll`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify(enrollPayload)
      });
      console.log(`⏱️ [EnrollNfc] Enroll response: ${enrollRes.status} in ${Date.now() - enrollStart}ms`);

      if (!enrollRes.ok) {
        const errData = await enrollRes.json().catch(() => null);
        console.error("❌ [EnrollNfc] Enroll failed:", errData);
        throw new Error(errData?.error || "Enrollment failed");
      }

      const enrollData = await enrollRes.json();
      const proofId = enrollData.proof_id;
      console.log("✅ [EnrollNfc] Enrolled! proof_id:", proofId, "| full response:", enrollData);

      // Store enrollment result for the NFC write step
      setEnrollmentResult({ proof_id: proofId, nfc_token: nfcToken, url_to_write: urlToWrite });

      // ── Step 2: Batch-upload all files in ONE request ──
      // IMPORTANT: Alan's API seals the proof after the FIRST upload call.
      // All files MUST be sent in a single multipart FormData request, not separate ones.
      const totalToUpload = pendingMedia.length;
      setUploadProgress({ current: 0, total: totalToUpload, status: "Compressing photos..." });

      console.log(`📷 [EnrollNfc] Compressing ${pendingMedia.length} files in parallel...`);
      const compressedFiles = await Promise.all(
        pendingMedia.map(async (m) => {
          const isVideo = m.type === "video";
          const file = isVideo ? m.file : await compressImage(m.file);
          return { file, isVideo, originalIndex: media.indexOf(m) };
        })
      );
      console.log(`✅ [EnrollNfc] Compression done:`, compressedFiles.map(f => `${(f.file.size/1024).toFixed(0)}KB`));

      // Build ONE FormData with all files
      const batchFormData = new FormData();
      batchFormData.append("proof_id", proofId);
      batchFormData.append("is_first_photo", "true"); // Triggers inventory deduction on backend
      batchFormData.append("timestamp", new Date().toISOString());
      compressedFiles.forEach(({ file, isVideo }, idx) => {
        batchFormData.append("file", file);
        batchFormData.append(`media_type_${idx}`, isVideo ? "delivery_video" : "package_photo");
      });
      // Also set the primary media_type for the first file (Alan's main field)
      const firstIsVideo = compressedFiles[0]?.isVideo ?? false;
      batchFormData.append("media_type", firstIsVideo ? "delivery_video" : "package_photo");

      // Mark all as uploading
      setMedia(prev => {
        const updated = [...prev];
        compressedFiles.forEach(({ originalIndex }) => {
          updated[originalIndex] = { ...updated[originalIndex], status: "uploading" };
        });
        return updated;
      });
      setUploadProgress({ current: 0, total: totalToUpload, status: `Uploading ${totalToUpload} photo${totalToUpload > 1 ? "s" : ""}...` });

      console.log(`🚀 [EnrollNfc] Sending batch upload (${compressedFiles.length} files) to ${WAREHOUSE_PROXY_URL}/app/api/warehouse/upload`);
      const uploadStart = Date.now();
      const uploadRes = await fetch(`${WAREHOUSE_PROXY_URL}/app/api/warehouse/upload`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` },
        body: batchFormData
      });
      console.log(`⏱️ [EnrollNfc] Batch upload response: ${uploadRes.status} in ${Date.now() - uploadStart}ms`);

      if (!uploadRes.ok) {
        const errBody = await uploadRes.json().catch(() => null);
        const serverMsg = errBody?.error || `Upload failed (${uploadRes.status})`;
        console.error(`❌ [EnrollNfc] Batch upload failed:`, serverMsg, errBody);
        throw new Error(serverMsg);
      }

      const uploadResult = await uploadRes.json();
      console.log(`✅ [EnrollNfc] Batch upload success:`, uploadResult);

      // Mark all files as done
      setMedia(prev => {
        const updated = [...prev];
        compressedFiles.forEach(({ originalIndex }) => {
          updated[originalIndex] = { ...updated[originalIndex], status: "done" };
        });
        return updated;
      });
      setUploadProgress({ current: totalToUpload, total: totalToUpload, status: "All media uploaded!" });

      // Done!
      console.log("🏁 [EnrollNfc] All uploads complete! Advancing to writeTag step.");
      console.groupEnd();
      await new Promise(resolve => setTimeout(resolve, 500));

      setWriteTagState("waiting");
      setCurrentStep("writeTag");
    } catch (error: any) {
      console.error("💥 [EnrollNfc] Flow failed:", error.message);
      console.groupEnd();
      // Return to photos step so user can retry
      setCurrentStep("photos");
      alert(`Error: ${error.message || "Upload failed. Please try again."}`);
    }
  };

  // Retry write tag
  const handleRetryWrite = () => {
    setWriteTagState("waiting");
  };

  // Skip write tag with warning
  const handleSkipWrite = () => {
    setSkippedWrite(true);
    setCurrentStep("complete");
  };

  const handleCancel = () => {
    navigate("/select-order");
  };

  const handleScanNext = () => {
    navigate("/select-order");
  };

  // Navigate to a completed step
  const handleStepClick = (step: EnrollmentStep) => {
    const stepStatus = getStepStatus(step);
    if (stepStatus === "done") {
      // Reset relevant state when going back
      if (step === "scan") {
        setScanState("listening");
        setMedia([]);
        setWriteTagState("waiting");
        setSkippedWrite(false);
      }
      if (step === "photos") {
        setWriteTagState("waiting");
        setSkippedWrite(false);
      }
      setCurrentStep(step);
    }
  };

  const getStepStatus = (step: EnrollmentStep) => {
    // Map uploading to photos for display purposes
    const displayStep = currentStep === "uploading" ? "photos" : currentStep;
    const order: EnrollmentStep[] = ["scan", "photos", "writeTag", "complete"];
    const currentIndex = order.indexOf(displayStep);
    const stepIndex = order.indexOf(step);

    if (stepIndex < currentIndex) return "done";
    if (stepIndex === currentIndex) return "active";
    return "pending";
  };


  const uploadProgressPercent = uploadProgress.total > 0
    ? (uploadProgress.current / uploadProgress.total) * 100
    : 0;

  // Count photos and videos for display
  const photoCount = media.filter(m => m.type === "photo").length;
  const videoCount = media.filter(m => m.type === "video").length;
  const mediaCountLabel = () => {
    const parts = [];
    if (photoCount > 0) parts.push(`${photoCount} photo${photoCount !== 1 ? 's' : ''}`);
    if (videoCount > 0) parts.push(`${videoCount} video${videoCount !== 1 ? 's' : ''}`);
    return parts.join(', ') || 'No media';
  };

  return (
    <AppLayout>
      {/* Hidden camera input - opens native camera directly */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleMediaSelect}
        className="hidden"
      />

      {/* Hidden gallery input - opens file picker */}
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        onChange={handleMediaSelect}
        className="hidden"
      />

      <div className="px-4 py-6 max-w-2xl mx-auto">
        {/* Order header with back arrow */}
        {currentStep !== "complete" && currentStep !== "uploading" && (
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={handleCancel}
              className="p-1 -ml-1 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Back to orders"
            >
              <ChevronLeft size={20} />
            </button>
            <h1 className="font-heading text-lg font-semibold">{orderDetails?.name || orderId}</h1>
          </div>
        )}

        {/* Refined Progress Steps - Hide during upload */}
        {currentStep !== "uploading" && (
          <div className="w-full mb-10">
            <div className="flex items-center justify-center gap-1">
              <StepPill
                number={1}
                label="Scan"
                status={getStepStatus("scan")}
                onClick={() => handleStepClick("scan")}
              />
              <StepArrow />
              <StepPill
                number={2}
                label={media.length > 0 && currentStep === "photos" ? `${media.length}` : "Media"}
                status={getStepStatus("photos")}
                onClick={() => handleStepClick("photos")}
              />
              <StepArrow />
              <StepPill
                number={3}
                label="Write"
                status={getStepStatus("writeTag")}
                onClick={() => handleStepClick("writeTag")}
              />
              <StepArrow />
              <StepPill
                number={4}
                label="Done"
                status={getStepStatus("complete")}
                onClick={() => handleStepClick("complete")}
              />
            </div>
          </div>
        )}

        {/* Step Content */}
        <div className="w-full">
          {/* SCAN STEP */}
          {currentStep === "scan" && (
            <div className="bg-card border border-border p-6 animate-fade-in">
              <div className="text-center">
                <InkHeading>Scan Sticker</InkHeading>
                <InkSubheading>
                  {!gpsCoords && "First, enable your location"}
                  {gpsCoords && scanState === "listening" && "Waiting for NFC sticker..."}
                  {gpsCoords && scanState === "detected" && "Sticker detected."}
                  {gpsCoords && scanState === "done" && "Bound."}
                </InkSubheading>
                <div className="mt-10">

                  {/* GPS Capture Gate */}
                  {!gpsCoords ? (
                    <div className="flex flex-col items-center gap-4">
                      <div className="aspect-square max-w-[80px] border border-border bg-secondary/20 flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
                          <circle cx="12" cy="12" r="3" />
                          <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
                        </svg>
                      </div>
                      <p className="font-sans text-xs text-muted-foreground max-w-[220px] text-center">
                        Location is required to confirm where the package was scanned.
                      </p>
                      {gpsError && (
                        <p className="font-sans text-xs text-destructive max-w-[240px] text-center">
                          {gpsError}
                        </p>
                      )}
                      <Button
                        type="button"
                        variant="ink"
                        size="ink"
                        onClick={captureGpsLocation}
                        disabled={gpsLoading}
                      >
                        {gpsLoading ? "Locating..." : "Enable Location"}
                      </Button>
                    </div>
                  ) : (
                    <>
                      <p className="mb-4 font-sans text-xs text-success">
                        ✓ Location captured: {gpsCoords.lat.toFixed(4)}, {gpsCoords.lng.toFixed(4)}
                      </p>
                      <div
                        className={cn(
                          "aspect-square max-w-[100px] mx-auto border flex items-center justify-center transition-all duration-500",
                          scanState === "listening" && "border-border bg-secondary/20",
                          scanState === "detected" && "border-muted-foreground/40 bg-secondary/40 animate-pulse",
                          scanState === "done" && "border-success/50 bg-success/10"
                        )}
                      >
                        {scanState === "done" ? (
                          <Check size={24} className="text-success" strokeWidth={2} />
                        ) : scanState === "error" ? (
                          <AlertTriangle size={24} className="text-destructive" strokeWidth={2} />
                        ) : (
                          <Wifi
                            size={24}
                            className={cn(
                              "text-muted-foreground rotate-45",
                              scanState === "listening" && "animate-pulse"
                            )}
                            strokeWidth={1.5}
                          />
                        )}
                      </div>
                      <p className="mt-4 font-sans text-xs text-muted-foreground">
                        {scanState === "listening" && "Hold sticker near device"}
                        {scanState === "detected" && "Processing..."}
                      </p>
                      {scanState === "error" && (
                         <p className="mt-4 font-sans text-xs text-destructive max-w-[250px] mx-auto">
                           {scanError}
                         </p>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* MEDIA STEP */}
          {currentStep === "photos" && (
            <div className="bg-card border border-border p-6 animate-fade-in">
              <div className="text-center">
                <InkHeading>Capture Media</InkHeading>
                <InkSubheading>
                  {media.length > 0 ? mediaCountLabel() : "Add photos or videos"}
                </InkSubheading>
              </div>

              {/* Media capture section */}
              <div className="mt-8 w-full max-w-[320px] mx-auto">
                {/* Two dedicated buttons side by side */}
                <div className="flex gap-2 mb-4">
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className="flex-1 py-2.5 px-3 border border-foreground text-foreground text-sm font-medium hover:bg-foreground hover:text-background active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                  >
                    <Camera size={15} strokeWidth={2} />
                    <span>Camera</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => galleryInputRef.current?.click()}
                    className="flex-1 py-2.5 px-3 bg-secondary text-foreground text-sm font-medium hover:bg-secondary/80 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                  >
                    <Upload size={15} strokeWidth={2} />
                    <span>Upload</span>
                  </button>
                </div>

                {/* Skip button — full width, muted style matching the screenshot */}
                <button
                  type="button"
                  onClick={handleContinueToWrite}
                  className="w-full mt-2 py-2.5 bg-secondary text-foreground/70 text-sm font-medium hover:bg-secondary/80 active:scale-[0.98] transition-all text-center"
                >
                  Skip, no photos needed
                </button>

                {/* Media Grid - 3 columns, grows vertically */}
                {media.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {media.map((item, index) => (
                      <div
                        key={index}
                        className="aspect-square overflow-hidden relative group border border-border"
                      >
                        {item.type === "video" ? (
                          <>
                            <video
                              src={item.url}
                              className="w-full h-full object-cover"
                              muted
                              playsInline
                            />
                            {/* Play icon overlay */}
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                              <div className="w-7 h-7 bg-foreground/60 flex items-center justify-center backdrop-blur-sm">
                                <Play size={10} className="text-background ml-0.5" fill="currentColor" />
                              </div>
                            </div>
                            {/* Duration badge */}
                            {item.duration !== undefined && (
                              <div className="absolute bottom-1 right-1 bg-foreground/60 text-background text-[9px] px-1 py-0.5 font-mono backdrop-blur-sm">
                                {formatDuration(item.duration)}
                              </div>
                            )}
                          </>
                        ) : (
                          <img
                            src={item.url}
                            alt={`Photo ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        )}
                        {/* Remove button */}
                        <button
                          type="button"
                          onClick={() => handleRemoveMedia(index)}
                          className="absolute top-1 right-1 w-5 h-5 bg-foreground/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-foreground/70 backdrop-blur-sm"
                        >
                          <X size={10} className="text-background" strokeWidth={2.5} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Minimum requirement hint */}
                {media.length > 0 && media.length < 2 && (
                  <p className="text-center text-xs text-muted-foreground mt-4">
                    Add at least 2 items to continue
                  </p>
                )}
              </div>
            </div>
          )}

          {/* UPLOADING STEP */}
          {currentStep === "uploading" && (
            <div className="bg-card border border-border p-6 animate-fade-in">
              <div className="text-center">
                <InkHeading>Processing</InkHeading>
                <InkSubheading>{uploadProgress.status}</InkSubheading>
                <div className="mt-10">
                  <div className="aspect-square max-w-[100px] mx-auto border border-border bg-secondary/20 flex items-center justify-center">
                    <Loader2 size={24} className="text-muted-foreground animate-spin" strokeWidth={1.5} />
                  </div>

                  <div className="mt-6 max-w-[180px] mx-auto">
                    <Progress value={uploadProgressPercent} className="h-1" />
                    <p className="mt-2 font-sans text-xs text-muted-foreground">
                      {uploadProgress.current} of {uploadProgress.total}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* WRITE TAG STEP */}
          {currentStep === "writeTag" && (
            <div className="bg-card border border-border p-6 animate-fade-in">
              <div className="text-center">
                <InkHeading>Write to Sticker</InkHeading>
                <InkSubheading>
                  {writeTagState === "waiting" && "Tap sticker to save photos to tag"}
                  {writeTagState === "writing" && "Writing to sticker..."}
                  {writeTagState === "done" && "Photo data written to tag"}
                  {writeTagState === "error" && "Write failed"}
                </InkSubheading>
                <div className="mt-10">
                  <div
                    className={cn(
                      "aspect-square max-w-[100px] mx-auto border flex items-center justify-center transition-all duration-500",
                      writeTagState === "waiting" && "border-border bg-secondary/20",
                      writeTagState === "writing" && "border-muted-foreground/40 bg-secondary/40 animate-pulse",
                      writeTagState === "done" && "border-success/50 bg-success/10",
                      writeTagState === "error" && "border-destructive/30 bg-destructive/5"
                    )}
                  >
                    {writeTagState === "done" ? (
                      <Check size={24} className="text-success" strokeWidth={2} />
                    ) : writeTagState === "error" ? (
                      <AlertTriangle size={24} className="text-destructive" strokeWidth={1.5} />
                    ) : (
                      <Wifi
                        size={24}
                        className={cn(
                          "text-muted-foreground rotate-45",
                          (writeTagState === "waiting" || writeTagState === "writing") && "animate-pulse"
                        )}
                        strokeWidth={1.5}
                      />
                    )}
                  </div>

                  <p className="mt-4 font-sans text-xs text-muted-foreground">
                    {writeTagState === "waiting" && "Hold sticker near device"}
                    {writeTagState === "writing" && "Writing..."}
                    {writeTagState === "error" && "Could not write to sticker"}
                  </p>

                  {/* Data being written */}
                  {(writeTagState === "waiting" || writeTagState === "writing") && (
                    <div className="mt-6 text-left max-w-[200px] mx-auto bg-secondary/50 p-3">
                      <p className="text-[10px] text-muted-foreground font-mono space-y-1">
                        <span className="block">proof_id: {orderId.replace("ORD-", "PRF-")}</span>
                        <span className="block">media: {media.length}</span>
                        <span className="block">tap_url: verify.app/{orderId.toLowerCase()}</span>
                      </p>
                    </div>
                  )}
                </div>

                {/* Error state actions */}
                {writeTagState === "error" && (
                  <div className="pt-8 space-y-3">
                    <Button
                      type="button"
                      variant="ink"
                      size="ink"
                      onClick={handleRetryWrite}
                    >
                      Retry Write
                    </Button>
                    <Button
                      type="button"
                      variant="ink-outline"
                      size="ink"
                      onClick={handleSkipWrite}
                    >
                      Skip for Now
                    </Button>
                    <p className="text-[11px] text-muted-foreground mt-2">
                      ⚠️ Skipping will leave enrollment incomplete
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* COMPLETE STEP */}
          {currentStep === "complete" && (
            <div className="bg-card border border-border p-6 animate-fade-in">
              <div className="text-center">
                <div className="mb-5">
                  <div className={cn(
                    "w-12 h-12 mx-auto flex items-center justify-center transition-all",
                    skippedWrite
                      ? "border border-muted-foreground/30 bg-secondary/20"
                      : "border border-success/50 bg-success/10"
                  )}>
                    {skippedWrite ? (
                      <AlertTriangle size={20} className="text-muted-foreground" strokeWidth={1.5} />
                    ) : (
                      <Check size={22} className="text-success" strokeWidth={2} />
                    )}
                  </div>
                </div>

                <InkHeading>{skippedWrite ? "Enrollment Incomplete" : "Enroll Complete"}</InkHeading>
                <InkSubheading>
                  {skippedWrite
                    ? `Sticker and ${mediaCountLabel()} saved — tag write skipped`
                    : `Sticker and ${mediaCountLabel()} saved`
                  }
                </InkSubheading>
                {skippedWrite && (
                  <p className="text-[11px] text-destructive/80 mt-3">
                    Customer verification unavailable until tag is written
                  </p>
                )}
                <div className="pt-8 space-y-3">
                  {skippedWrite && (
                    <Button
                      type="button"
                      variant="ink"
                      size="ink"
                      onClick={() => {
                        setSkippedWrite(false);
                        setWriteTagState("waiting");
                        setCurrentStep("writeTag");
                      }}
                    >
                      Write Tag Now
                    </Button>
                  )}
                  {enrollmentResult?.nfc_token && (
                    <Button
                      type="button"
                      variant="ink-outline"
                      size="ink"
                      onClick={() => window.open(`/t/${enrollmentResult.nfc_token}`, '_blank')}
                    >
                      Preview Tap Page
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant={skippedWrite ? "ink-outline" : "ink"}
                    size="ink"
                    onClick={handleScanNext}
                  >
                    Scan Next Package
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Continue button - only in photos step with 2+ items */}
        {currentStep === "photos" && media.length >= 1 && (
          <div className="pt-6 flex justify-center">
            <Button
              type="button"
              variant="ink"
              size="ink"
              onClick={handleContinueToWrite}
              className="w-full block"
            >
              Continue to Write
            </Button>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

function StepPill({
  number,
  label,
  status,
  onClick
}: {
  number: number;
  label: string;
  status: "pending" | "active" | "done";
  onClick?: () => void;
}) {
  const isClickable = status === "done";

  return (
    <button
      type="button"
      onClick={isClickable ? onClick : undefined}
      disabled={!isClickable}
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-sans font-medium transition-all",
        status === "pending" && "text-muted-foreground/50 cursor-default",
        status === "active" && "bg-foreground text-background shadow-sm cursor-default",
        status === "done" && "bg-secondary text-foreground cursor-pointer hover:bg-secondary/80 active:scale-[0.97]"
      )}
    >
      {status === "done" ? (
        <Check size={11} strokeWidth={2.5} />
      ) : (
        <span className="text-[10px] opacity-60">{number}</span>
      )}
      <span className="tracking-wide">{label}</span>
    </button>
  );
}

function StepArrow() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" className="text-muted-foreground/30 flex-shrink-0 mx-0.5">
      <path d="M4 2L8 6L4 10" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}