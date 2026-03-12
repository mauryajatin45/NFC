import { cn } from "@/lib/utils";
import type { Order } from "@/services/api";

interface OrderCardProps {
  order: Order;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatCurrency(value: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function getStatusConfig(status: Order["status"]) {
  switch (status) {
    case "enrolled":
      return { label: "Verified", bgClass: "bg-emerald-50 text-emerald-600", textClass: "" };
    case "ready":
      return { label: "Ready", bgClass: "bg-blue-50 text-blue-600", textClass: "" };
    case "pending":
      return { label: "Pending", bgClass: "bg-amber-50 text-amber-600", textClass: "" };
    default:
      return { label: status, bgClass: "bg-secondary text-muted-foreground", textClass: "" };
  }
}

export function OrderCard({ order, isSelected, onSelect }: OrderCardProps) {
  const totalValue = order.items.reduce((sum, item) => sum + item.value, 0);
  const currency = order.items[0]?.currency || "USD";
  const statusConfig = getStatusConfig(order.status);

  return (
    <button
      type="button"
      onClick={() => onSelect(order.id)}
      className={cn(
        "w-full flex items-start justify-between px-4 py-3.5 border-b border-border transition-colors text-left",
        isSelected
          ? "bg-secondary/50"
          : "bg-card hover:bg-secondary/30"
      )}
    >
      {/* Left content */}
      <div className="flex-1 min-w-0">
        {/* Order ID + Status badge */}
        <div className="flex items-center gap-2 mb-1">
          <span className="font-heading text-[15px] font-semibold text-foreground">
            {order.name || order.id}
          </span>
          <span className={cn(
            "inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-lg",
            statusConfig.bgClass
          )}>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="flex-shrink-0">
              <circle cx="5" cy="5" r="4" stroke="currentColor" strokeWidth="1.5" fill="none" />
              {order.status === "enrolled" && (
                <path d="M3 5L4.5 6.5L7 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              )}
            </svg>
            {statusConfig.label}
          </span>
        </div>
        
        {/* Customer name */}
        <p className="text-sm text-foreground/80 mb-0.5">
          {order.customer.name}
        </p>
        
        {/* Date */}
        <p className="text-xs text-muted-foreground">
          {formatDate(order.createdAt)}
        </p>
      </div>

      {/* Right content */}
      <div className="flex-shrink-0 pt-0.5">
        <span className="text-[15px] font-medium text-foreground">
          {formatCurrency(totalValue, currency)}
        </span>
      </div>
    </button>
  );
}
