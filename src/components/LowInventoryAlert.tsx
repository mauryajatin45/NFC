/**
 * LowInventoryAlert — shared alert banner/modal for sticker reorder prompts.
 * 
 * Thresholds:
 *   critical : remaining ≤ 0   → full-screen modal, cannot dismiss
 *   low      : remaining < 20  → dismissible banner above dashboard content
 *   ok       : remaining ≥ 20  → renders nothing
 *
 * Used in both the Shopify embedded app (test-store1) and the PWA admin (NFC/).
 * The only prop that differs is `reorderUrl` — set to "https://shop.in.ink".
 */

import { useState } from "react";
import { AlertTriangle, X, ShoppingCart, Package } from "lucide-react";

const REORDER_URL = "https://shop.in.ink";

// ── Thresholds ───────────────────────────────────────────────────────────────
const CRITICAL_THRESHOLD = 0;   // ≤ 0  → critical modal
const LOW_THRESHOLD = 20;       // < 20 → warning banner

// ── Types ────────────────────────────────────────────────────────────────────
interface LowInventoryAlertProps {
  remaining: number;
  total: number;
  isLoading?: boolean;
}

// ── Main component ────────────────────────────────────────────────────────────
export function LowInventoryAlert({ remaining, total, isLoading = false }: LowInventoryAlertProps) {
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [modalDismissed, setModalDismissed] = useState(false);

  const isCritical = remaining <= CRITICAL_THRESHOLD;

  if (isLoading || remaining >= LOW_THRESHOLD) return null;
  if (isCritical && modalDismissed) return null;

  const handleReorder = () => window.open(REORDER_URL, "_blank", "noopener");

  // ── Critical modal (out-of-stock or negative) ─────────────────────────────
  if (isCritical) {
    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="inv-critical-title"
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 9999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "rgba(0,0,0,0.55)",
          padding: "16px",
        }}
      >
        <div
          style={{
            background: "#fff",
            borderRadius: "16px",
            maxWidth: "420px",
            width: "100%",
            padding: "32px 28px",
            position: "relative",
            textAlign: "center",
            boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
          }}
        >
          {/* Close button */}
          <button
            onClick={() => setModalDismissed(true)}
            aria-label="Close alert"
            style={{ position: "absolute", top: "14px", right: "14px", background: "none", border: "none", cursor: "pointer", color: "#999", fontSize: "20px", lineHeight: 1, padding: "4px 6px" }}
          >
            ✕
          </button>
          {/* Icon */}
          <div
            style={{
              width: "64px",
              height: "64px",
              borderRadius: "50%",
              background: "#FEF2F2",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 20px",
            }}
          >
            <Package size={28} color="#EF4444" />
          </div>

          {/* Title */}
          <h2
            id="inv-critical-title"
            style={{ fontSize: "20px", fontWeight: 700, color: "#111", marginBottom: "10px" }}
          >
            Out of NFC Stickers
          </h2>
          <p style={{ fontSize: "14px", color: "#666", marginBottom: "6px" }}>
            Your inventory has reached{" "}
            <strong style={{ color: "#EF4444" }}>{remaining} / {total}</strong>.
          </p>
          <p style={{ fontSize: "14px", color: "#666", marginBottom: "28px" }}>
            Enrolling new shipments is blocked until you reorder. Place an order now to keep your
            warehouse running.
          </p>

          {/* CTA */}
          <button
            onClick={handleReorder}
            style={{
              width: "100%",
              padding: "14px",
              background: "#111",
              color: "#fff",
              border: "none",
              borderRadius: "10px",
              fontSize: "15px",
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              marginBottom: "12px",
            }}
          >
            <ShoppingCart size={17} />
            Reorder Stickers at shop.in.ink
          </button>
          <p style={{ fontSize: "12px", color: "#999" }}>
            Opens <strong>shop.in.ink</strong> in a new tab
          </p>
        </div>
      </div>
    );
  }

  // ── Warning banner (low stock) ────────────────────────────────────────────
  if (bannerDismissed) return null;

  return (
    <div
      role="alert"
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        padding: "12px 16px",
        background: "#FFFBEB",
        border: "1px solid #FCD34D",
        borderRadius: "10px",
        marginBottom: "16px",
      }}
    >
      <AlertTriangle size={18} color="#D97706" style={{ flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: "13px", fontWeight: 600, color: "#92400E", margin: 0 }}>
          Low sticker inventory — {remaining} / {total} remaining
        </p>
        <p style={{ fontSize: "12px", color: "#B45309", margin: "2px 0 0" }}>
          Reorder soon to avoid shipment delays.{" "}
          <button
            onClick={handleReorder}
            style={{
              background: "none",
              border: "none",
              color: "#B45309",
              fontWeight: 700,
              cursor: "pointer",
              textDecoration: "underline",
              padding: 0,
              fontSize: "12px",
            }}
          >
            Order at shop.in.ink →
          </button>
        </p>
      </div>
      <button
        onClick={() => setBannerDismissed(true)}
        aria-label="Dismiss"
        style={{ background: "none", border: "none", cursor: "pointer", padding: "2px", color: "#B45309" }}
      >
        <X size={16} />
      </button>
    </div>
  );
}

// Re-export thresholds so NFCTagInventory components can use the same values
export { LOW_THRESHOLD, CRITICAL_THRESHOLD };
