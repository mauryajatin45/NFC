import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { InkHeading, InkSubheading } from "@/components/InkScreen";
import { cn } from "@/lib/utils";
import { Camera, Check, Wifi, Loader2, AlertTriangle, X, Play, Upload, ChevronLeft } from "lucide-react";
import { Progress } from "@/components/ui/progress";

type EnrollmentStep = "scan" | "photos" | "uploading" | "writeTag" | "complete";
type ScanState = "listening" | "detected" | "done";
type WriteTagState = "waiting" | "writing" | "done" | "error";
type MediaType = "photo" | "video";
type MediaState = {
  url: string;
  file: File;
  status: "pending" | "uploading" | "done";
  type: MediaType;
  duration?: number; // for videos, in seconds
};

export default function EnrollNfc() {
  const location = useLocation();
  const navigate = useNavigate();
  const orderId = location.state?.orderId || "ORD-UNKNOWN";

  const [currentStep, setCurrentStep] = useState<EnrollmentStep>("scan");
  const [scanState, setScanState] = useState<ScanState>("listening");
  const [writeTagState, setWriteTagState] = useState<WriteTagState>("waiting");
  const [media, setMedia] = useState<MediaState[]>([]);
  const [skippedWrite, setSkippedWrite] = useState(false);

  // Upload progress state
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0, status: "" });

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // Auto-listen simulation for initial scan
  useEffect(() => {
    if (currentStep === "scan" && scanState === "listening") {
      const timer = setTimeout(() => {
        setScanState("detected");
        setTimeout(() => {
          setScanState("done");
          setTimeout(() => setCurrentStep("photos"), 600);
        }, 800);
      }, 2500 + Math.random() * 1500);

      return () => clearTimeout(timer);
    }
  }, [currentStep, scanState]);

  // Auto-listen simulation for write tag step
  useEffect(() => {
    if (currentStep === "writeTag" && writeTagState === "waiting") {
      const timer = setTimeout(() => {
        setWriteTagState("writing");
        setTimeout(() => {
          // Simulate 90% success rate
          if (Math.random() > 0.1) {
            setWriteTagState("done");
            setTimeout(() => setCurrentStep("complete"), 600);
          } else {
            setWriteTagState("error");
          }
        }, 1200);
      }, 2000 + Math.random() * 1500);

      return () => clearTimeout(timer);
    }
  }, [currentStep, writeTagState]);

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

  // Continue to Write - start upload process
  const handleContinueToWrite = async () => {
    const pendingMedia = media.filter(m => m.status === "pending");
    const totalToUpload = pendingMedia.length;

    if (totalToUpload === 0) {
      // All media already uploaded, go directly to write
      setWriteTagState("waiting");
      setCurrentStep("writeTag");
      return;
    }

    // Show uploading screen
    setCurrentStep("uploading");
    setUploadProgress({ current: 0, total: totalToUpload, status: "Starting upload..." });

    // Upload media sequentially
    let uploadedCount = 0;
    for (let i = 0; i < media.length; i++) {
      if (media[i].status === "pending") {
        uploadedCount++;
        const itemType = media[i].type === "video" ? "video" : "photo";
        setUploadProgress({
          current: uploadedCount,
          total: totalToUpload,
          status: `Uploading ${itemType} ${uploadedCount} of ${totalToUpload}...`
        });

        // Mark as uploading
        setMedia(prev => {
          const updated = [...prev];
          updated[i] = { ...updated[i], status: "uploading" };
          return updated;
        });

        // Simulate upload delay (videos take longer)
        const delay = media[i].type === "video" ? 1500 + Math.random() * 500 : 800 + Math.random() * 400;
        await new Promise(resolve => setTimeout(resolve, delay));

        // Mark as done
        setMedia(prev => {
          const updated = [...prev];
          updated[i] = { ...updated[i], status: "done" };
          return updated;
        });
      }
    }

    // Complete enrollment
    setUploadProgress({ current: totalToUpload, total: totalToUpload, status: "Completing enrollment..." });
    await new Promise(resolve => setTimeout(resolve, 500));

    // Advance to write step
    setWriteTagState("waiting");
    setCurrentStep("writeTag");
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

  const canProceed = media.length > 0;
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
        accept="image/*,video/*"
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
            <h1 className="font-heading text-lg font-semibold">{orderId}</h1>
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
                  {scanState === "listening" && "Waiting for NFC sticker..."}
                  {scanState === "detected" && "Sticker detected."}
                  {scanState === "done" && "Bound."}
                </InkSubheading>
                <div className="mt-10">
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
        {currentStep === "photos" && canProceed && media.length >= 2 && (
          <div className="pt-6">
            <Button
              type="button"
              variant="ink"
              size="ink"
              onClick={handleContinueToWrite}
              className="w-full max-w-sm mx-auto"
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