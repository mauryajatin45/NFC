import { TrendingUp, TrendingDown, RefreshCw, Loader2, AlertTriangle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { fetchDashboardMetrics } from "@/services/api";

const RevenueThisPeriod = () => {
  const { data: result, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ["dashboard-metrics"],
    queryFn: async () => {
      const res = await fetchDashboardMetrics();
      if (res.error) throw new Error(res.error.message);
      return res.data!;
    },
    staleTime: 60 * 1000,
    retry: 1
  });

  const metrics = result?.currentPeriod || { totalValue: 0, count: 0, aov: 0 };
  const prevMetrics = result?.previousPeriod || { totalValue: 0, count: 0, aov: 0 };
  const trends = result?.trends || { valueProtected: 0, enrolledCount: 0, aov: 0 };

  const isUp = trends.valueProtected >= 0;
  const changePct = Math.abs(trends.valueProtected).toFixed(1);

  return (
    <div
      className="bg-card border border-border rounded-md p-4 sm:p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)] relative"
      role="region"
      aria-label="Total value protected"
    >
      {(isLoading || isRefetching) && (
        <div className="absolute inset-0 bg-background/50 backdrop-blur-[1px] flex items-center justify-center z-10 rounded-md transition-all duration-300">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-foreground">Total Value Protected</h3>
        </div>
        <div className="flex items-center gap-2">
          {isError && (
             <AlertTriangle className="h-4 w-4 text-destructive" />
          )}
          <span className="text-xs text-muted-foreground cursor-pointer hover:underline" onClick={() => refetch()}>
            Last 30 Days
          </span>
        </div>
      </div>

      {/* Total */}
      <div className="mb-1">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-light text-foreground tabular-nums">
            ${metrics.totalValue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </span>
          <span className={`text-xs font-medium flex items-center gap-0.5 ${isUp ? "text-emerald-600" : "text-red-500"}`}>
            {isUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {isUp ? "+" : "-"}{changePct}% vs last period
          </span>
        </div>
      </div>

      <p className="text-xs text-muted-foreground mb-4">
        Retail value of all enrolled shipments
      </p>


      {/* Breakdown */}
      <div className="space-y-2.5 pt-4 border-t border-border">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Enrolled Shipments</span>
          <span className="font-medium text-foreground tabular-nums">{metrics.count.toLocaleString()}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Avg. Order Value</span>
          <span className="font-medium text-foreground tabular-nums">
            ${metrics.aov.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      </div>
    </div>
  );
};

export default RevenueThisPeriod;
