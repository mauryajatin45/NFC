import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function ConsumerRecord() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white text-black">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-200 sticky top-0 bg-white z-10">
        <button
          onClick={() => navigate(-1)}
          className="p-1 rounded-full hover:bg-gray-100 transition-colors"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <span className="text-lg font-semibold tracking-tight">ink.</span>
      </div>

      <div className="max-w-lg mx-auto px-4 py-8 space-y-6">
        {/* Verification badge */}
        <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-2xl">
          <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
          </div>
          <div>
            <p className="font-semibold text-green-800">Authentic Product</p>
            <p className="text-sm text-green-700">Verified directly from the brand</p>
          </div>
        </div>

        {/* Delivery Record */}
        <div className="space-y-3">
          <h2 className="text-xl font-bold">Complete Delivery Record</h2>

          <div className="border border-gray-200 rounded-2xl divide-y divide-gray-100">
            <div className="px-4 py-3 flex justify-between items-center">
              <span className="text-sm text-gray-500">NFC Tag ID</span>
              <span className="text-sm font-mono font-medium text-gray-800">{id || "—"}</span>
            </div>
            <div className="px-4 py-3 flex justify-between items-center">
              <span className="text-sm text-gray-500">Verified</span>
              <span className="text-sm font-medium text-gray-800">
                {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </span>
            </div>
            <div className="px-4 py-3 flex justify-between items-center">
              <span className="text-sm text-gray-500">Status</span>
              <span className="inline-flex items-center gap-1 text-sm font-medium text-green-700">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                Verified
              </span>
            </div>
          </div>
        </div>

        {/* Placeholder for media / photos */}
        <div className="border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center">
          <p className="text-sm text-gray-400">Package photos &amp; media will appear here</p>
        </div>
      </div>
    </div>
  );
}
