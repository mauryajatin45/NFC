import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { OrderCard } from "@/components/OrderCard";
import { LowInventoryAlert } from "@/components/LowInventoryAlert";
import { cn } from "@/lib/utils";
import { Search, SlidersHorizontal, RefreshCw, Loader2, AlertCircle } from "lucide-react";
import { useOrders } from "@/hooks/useOrders";
import { useInventory } from "@/hooks/useInventory";
import { fetchInventorySettings } from "@/services/api";
import type { Order } from "@/services/api";

type SortOption = "oldest" | "newest";

function sortOrders(orders: Order[], sortBy: SortOption): Order[] {
  return [...orders].sort((a, b) => {
    const dateA = new Date(a.createdAt).getTime();
    const dateB = new Date(b.createdAt).getTime();
    return sortBy === "oldest" ? dateA - dateB : dateB - dateA;
  });
}

export default function SelectOrder() {
  const navigate = useNavigate();
  const { data: orders, isLoading, isError, error, refetch, isRefetching } = useOrders();
  const { data: inventory, isLoading: inventoryLoading } = useInventory();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [inventoryThreshold, setInventoryThreshold] = useState<number>(20);

  // Load configurable threshold from settings
  useEffect(() => {
    fetchInventorySettings().then(({ data }) => {
      if (data?.low_inventory_threshold !== undefined) {
        setInventoryThreshold(data.low_inventory_threshold);
      }
    });
  }, []);

  const handleOrderTap = (id: string) => {
    navigate("/enroll-nfc", { state: { orderId: id } });
  };

  // Only show orders that need enrolling (pending/ready), filtered by search
  const filteredOrders = React.useMemo(() => {
    if (!orders) return [];
    
    return sortOrders(
      orders
        .filter((order) => order.status === "pending" || order.status === "ready")
        .filter((order) =>
          order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
          order.customer.name.toLowerCase().includes(searchQuery.toLowerCase())
        ),
      sortBy
    );
  }, [orders, searchQuery, sortBy]);

  return (
    <AppLayout>
      <div className="px-4 py-6 max-w-2xl mx-auto">
        <PageHeader title="Enroll" />

        {/* Inventory alert — shows warning or blocking modal if low/zero */}
        <LowInventoryAlert
          remaining={inventory?.current_count ?? 0}
          total={100}
          isLoading={inventoryLoading}
          lowThreshold={inventoryThreshold}
        />

        {/* Search bar */}
        <div className="relative mb-4">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by order number or customer name"
            className="w-full h-11 pl-10 pr-4 bg-card border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Create Order button */}
        <button
          type="button"
          onClick={() => navigate("/create-order")}
          className="w-full h-11 mb-4 flex items-center justify-center gap-2 bg-card border border-dashed border-border text-sm text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-colors"
        >
          <span className="text-lg leading-none">+</span>
          <span>Create Order Manually</span>
        </button>

        {/* Sort + Refresh row */}
        <div className="flex items-center justify-between mb-4">
          <button
            type="button"
            onClick={() => setSortBy(sortBy === "newest" ? "oldest" : "newest")}
            className="flex items-center gap-2 px-3 py-2 bg-card border border-border text-sm text-foreground hover:bg-secondary/50 transition-colors"
          >
            <SlidersHorizontal size={14} />
            <span>Sort</span>
          </button>
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isRefetching}
            className="flex items-center justify-center w-10 h-10 bg-card border border-border hover:bg-secondary/50 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={16} className={cn(isRefetching && "animate-spin")} />
          </button>
        </div>

        {/* Order list */}
        <div className="bg-card border border-border overflow-hidden rounded-2xl">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Loader2 size={24} className="animate-spin mb-2" />
              <p className="text-sm">Loading orders...</p>
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center justify-center py-16 text-destructive">
              <AlertCircle size={24} className="mb-2" />
              <p className="text-sm">{error?.message || "Failed to load orders"}</p>
              <button
                type="button"
                onClick={() => refetch()}
                className="mt-2 text-xs underline hover:no-underline"
              >
                Try again
              </button>
            </div>
          ) : filteredOrders.length > 0 ? (
            <div>
              {filteredOrders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  isSelected={false}
                  onSelect={handleOrderTap}
                />
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground text-sm py-16">
              No orders to enroll.
            </p>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
