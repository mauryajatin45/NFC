import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { useInventory } from "@/hooks/useInventory";
import { useOrders } from "@/hooks/useOrders";
import { Loader2, Package, Nfc, CheckCircle, Clock, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { GlobalVerificationMap } from "@/components/GlobalVerificationMap";

export default function Dashboard() {
  const { data: inventory, isLoading: inventoryLoading } = useInventory();
  const { data: orders, isLoading: ordersLoading } = useOrders();

  const readyOrders = orders?.filter((o: any) => o.status === "ready").length || 0;
  const enrolledOrders = orders?.filter((o: any) => o.status === "enrolled").length || 0;
  const pendingOrders = orders?.filter((o: any) => o.status === "pending").length || 0;

  return (
    <AppLayout>
      <div className="px-4 py-6 max-w-2xl mx-auto">
        <PageHeader title="Dashboard" />

        {/* Global Verification Map in white card */}
        <div className="bg-card border border-border rounded-2xl p-5 mb-4">
          <GlobalVerificationMap />
        </div>

        {/* Stats in white card */}
        <div className="bg-card border border-border rounded-2xl p-5 mb-4">
          <div className="grid grid-cols-2 gap-4">
            {inventoryLoading ? (
              <div className="col-span-2 flex items-center justify-center py-12">
                <Loader2 className="animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <div>
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-xs text-muted-foreground uppercase tracking-wider">Available Tags</span>
                    <Nfc size={16} className="text-muted-foreground" strokeWidth={1.5} />
                  </div>
                  <p className="font-heading text-3xl font-normal">{inventory?.current_count?.toLocaleString() || "—"}</p>
                  <p className="text-xs text-muted-foreground mt-1">stickers remaining</p>
                </div>
                <div>
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-xs text-muted-foreground uppercase tracking-wider">Recent Activity</span>
                    <CheckCircle size={16} className="text-muted-foreground" strokeWidth={1.5} />
                  </div>
                  <p className="font-heading text-3xl font-normal">{inventory?.recent_transactions?.length || 0}</p>
                  <p className="text-xs text-muted-foreground mt-1">transactions</p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Orders Summary in white card */}
        <div className="bg-card border border-border rounded-2xl p-5 mb-4">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs text-muted-foreground uppercase tracking-wider">Orders</span>
            <Link to="/select-order" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              View all →
            </Link>
          </div>
          {ordersLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center">
                    <CheckCircle size={16} className="text-success" />
                  </div>
                  <span className="text-sm">Ready to enroll</span>
                </div>
                <span className="font-mono text-sm">{readyOrders}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
                    <Package size={16} className="text-muted-foreground" />
                  </div>
                  <span className="text-sm">Enrolled</span>
                </div>
                <span className="font-mono text-sm">{enrolledOrders}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
                    <Clock size={16} className="text-muted-foreground" />
                  </div>
                  <span className="text-sm">Pending</span>
                </div>
                <span className="font-mono text-sm">{pendingOrders}</span>
              </div>
            </div>
          )}
        </div>

        {/* Integration Health in white card */}
        <div className="bg-card border border-border rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Zap size={16} className="text-muted-foreground" />
              <span className="text-xs text-muted-foreground uppercase tracking-wider">Integration Health</span>
            </div>
            <span className="text-xs font-medium px-2 py-1 rounded-lg bg-success/10 text-success">
              92% Health
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">API Call Volume</span>
            <span className="font-mono">1.2M total</span>
          </div>
          <div className="mt-3 h-12 bg-secondary/50 rounded-lg flex items-end px-1 gap-0.5">
            {[40, 55, 70, 65, 80, 75, 60, 85, 90, 70, 55, 45].map((h, i) => (
              <div 
                key={i} 
                className="flex-1 bg-foreground/20 rounded-t-sm transition-all hover:bg-foreground/40"
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-center">Last 7 days</p>
        </div>
      </div>
    </AppLayout>
  );
}