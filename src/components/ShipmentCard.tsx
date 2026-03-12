import { cn } from "@/lib/utils";
import { ChevronDown, Check, Tag, Zap, Truck, PackageCheck, Loader2 } from "lucide-react";
import type { Shipment, ShipmentStatus } from "@/services/api/shipments";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { markShipmentDelivered } from "@/services/api/shipments";

interface ShipmentCardProps {
  shipment: Shipment;
  isExpanded: boolean;
  onToggle: (id: string) => void;
  onRefetch?: () => void;
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

function getStatusConfig(status: ShipmentStatus) {
  switch (status) {
    case "verified":
      return { 
        label: "Verified", 
        bgClass: "bg-emerald-50 text-emerald-600",
        textClass: "",
        Icon: Check,
      };
    case "enrolled":
      return { 
        label: "Enrolled", 
        bgClass: "bg-secondary text-muted-foreground",
        textClass: "", 
        Icon: Tag,
      };
    case "active":
      return { 
        label: "Active", 
        bgClass: "bg-amber-50 text-amber-600",
        textClass: "", 
        Icon: Zap,
      };
    case "in_transit":
      return { 
        label: "In Transit", 
        bgClass: "bg-blue-50 text-blue-600",
        textClass: "", 
        Icon: Truck,
      };
    case "delivered":
      return { 
        label: "Delivered", 
        bgClass: "bg-emerald-50 text-emerald-600",
        textClass: "", 
        Icon: PackageCheck,
      };
    default:
      return { 
        label: status, 
        bgClass: "bg-secondary text-muted-foreground",
        textClass: "", 
        Icon: Tag,
      };
  }
}

export function ShipmentCard({ shipment, isExpanded, onToggle, onRefetch }: ShipmentCardProps) {
  const statusConfig = getStatusConfig(shipment.status);
  const StatusIcon = statusConfig.Icon;
  const { toast } = useToast();
  const [isMarking, setIsMarking] = useState(false);

  const handleMarkDelivered = async () => {
    setIsMarking(true);
    const { data, error } = await markShipmentDelivered(shipment.id);
    setIsMarking(false);

    if (error || !data) {
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: error?.message || "Could not mark as delivered."
      });
      return;
    }

    toast({
      title: "Success",
      description: "Shipment marked as delivered."
    });

    if (onRefetch) onRefetch();
  };

  return (
    <Collapsible open={isExpanded} onOpenChange={() => onToggle(shipment.id)}>
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className={cn(
            "w-full flex items-start justify-between px-4 py-3.5 border-b border-border transition-colors text-left",
            isExpanded
              ? "bg-secondary/50"
              : "bg-card hover:bg-secondary/30"
          )}
        >
          {/* Left content */}
          <div className="flex-1 min-w-0">
            {/* Shipment ID + Status badge */}
            <div className="flex items-center gap-2 mb-1">
              <span className="font-heading text-[15px] font-semibold text-foreground">
                {shipment.id}
              </span>
              <span className={cn(
                "inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-lg",
                statusConfig.bgClass
              )}>
                <StatusIcon size={10} className="flex-shrink-0" />
                {statusConfig.label}
              </span>
            </div>
            
            {/* Customer name */}
            <p className="text-sm text-foreground/80 mb-0.5">
              {shipment.customer.name}
            </p>
            
            {/* Date */}
            <p className="text-xs text-muted-foreground">
              {formatDate(shipment.createdAt)}
            </p>
          </div>

          {/* Right content */}
          <div className="flex items-center gap-3 flex-shrink-0 pt-0.5">
            <span className="text-[15px] font-medium text-foreground">
              {formatCurrency(shipment.value, shipment.currency)}
            </span>
            <ChevronDown 
              size={16} 
              className={cn(
                "text-muted-foreground transition-transform",
                isExpanded && "rotate-180"
              )} 
            />
          </div>
        </button>
      </CollapsibleTrigger>
      
      <CollapsibleContent>
        <div className="px-4 py-3 bg-secondary/30 border-b border-border text-sm">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-xs text-muted-foreground">Order ID</p>
              <p className="font-medium">{shipment.orderId}</p>
            </div>
            {shipment.carrier && (
              <div>
                <p className="text-xs text-muted-foreground">Carrier</p>
                <p className="font-medium">{shipment.carrier}</p>
              </div>
            )}
            {shipment.trackingNumber && (
              <div className="col-span-2">
                <p className="text-xs text-muted-foreground">Tracking Number</p>
                <p className="font-medium font-mono text-xs">{shipment.trackingNumber}</p>
              </div>
            )}
            {shipment.shippedAt && (
              <div>
                <p className="text-xs text-muted-foreground">Shipped</p>
                <p className="font-medium">{formatDate(shipment.shippedAt)}</p>
              </div>
            )}
            {shipment.deliveredAt && (
              <div>
                <p className="text-xs text-muted-foreground">Delivered</p>
                <p className="font-medium">{formatDate(shipment.deliveredAt)}</p>
              </div>
            )}
          </div>

          {/* Action Row */}
          {(shipment.status === "active" || shipment.status === "in_transit") && (
            <div className="mt-4 pt-3 border-t border-border flex justify-end">
              <Button 
                variant="ink" 
                size="sm" 
                onClick={handleMarkDelivered}
                disabled={isMarking}
                className="gap-2"
              >
                {isMarking ? <Loader2 size={14} className="animate-spin" /> : <PackageCheck size={14} />}
                Mark as Delivered
              </Button>
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
