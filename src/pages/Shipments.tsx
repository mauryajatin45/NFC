import { useState, useMemo } from "react";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { ShipmentCard } from "@/components/ShipmentCard";
import { useShipments } from "@/hooks/useShipments";
import { cn } from "@/lib/utils";
import { Search, SlidersHorizontal, RefreshCw, Loader2, AlertCircle } from "lucide-react";

type SortOption = "oldest" | "newest";
type FilterTab = "all" | "enrolled" | "shipped";

export default function Shipments() {
  const { data: shipments, isLoading, isError, error, refetch, isRefetching } = useShipments();
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [activeTab, setActiveTab] = useState<FilterTab>("all");

  const handleToggle = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const filteredShipments = useMemo(() => {
    if (!shipments) return [];
   
    let filtered = shipments.filter((s) =>
      s.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.orderId.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (activeTab === "enrolled") {
      filtered = filtered.filter((s) => s.status === "enrolled");
    } else if (activeTab === "shipped") {
      filtered = filtered.filter((s) => s.status === "verified" || s.status === "active" || s.status === "in_transit" || s.status === "delivered");
    }
   
    return [...filtered].sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return sortBy === "oldest" ? dateA - dateB : dateB - dateA;
    });
  }, [shipments, searchQuery, sortBy, activeTab]);

  const counts = useMemo(() => {
    if (!shipments) return { all: 0, enrolled: 0, shipped: 0 };
    return {
      all: shipments.length,
      enrolled: shipments.filter(s => s.status === "enrolled").length,
      shipped: shipments.filter(s => s.status !== "enrolled").length,
    };
  }, [shipments]);

  const tabs: { key: FilterTab; label: string; count: number }[] = [
    { key: "all", label: "All", count: counts.all },
    { key: "enrolled", label: "Enrolled", count: counts.enrolled },
    { key: "shipped", label: "Shipped", count: counts.shipped },
  ];

  return (
    <AppLayout>
      <div className="px-4 py-6 max-w-2xl mx-auto">
        <PageHeader title="Shipments" />
        {/* Search bar */}
        <div className="relative mb-4">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by ID, order, or customer"
            className="w-full h-11 pl-10 pr-4 bg-card border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        {/* Sort + Refresh row */}
        <div className="flex items-center justify-between mb-3">
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
        {/* Filter tabs */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1 -mx-4 px-4">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "flex-shrink-0 px-3 py-1.5 text-sm font-medium transition-colors whitespace-nowrap",
                activeTab === tab.key
                  ? "bg-foreground text-background"
                  : "bg-card border border-border text-foreground hover:bg-secondary/50"
              )}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>
        {/* Shipment list */}
        <div className="bg-card border border-border overflow-hidden rounded-2xl">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Loader2 size={24} className="animate-spin mb-2" />
              <p className="text-sm">Loading shipments...</p>
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center justify-center py-16 text-destructive">
              <AlertCircle size={24} className="mb-2" />
              <p className="text-sm">{error?.message || "Failed to load shipments"}</p>
              <button
                type="button"
                onClick={() => refetch()}
                className="mt-2 text-xs underline hover:no-underline"
              >
                Try again
              </button>
            </div>
          ) : filteredShipments.length > 0 ? (
            <div>
              {filteredShipments.map((shipment) => (
                <ShipmentCard
                  key={shipment.id}
                  shipment={shipment}
                  isExpanded={expandedId === shipment.id}
                  onToggle={handleToggle}
                />
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground text-sm py-16">
              No matching shipments found.
            </p>
          )}
        </div>
      </div>
    </AppLayout>
  );
}