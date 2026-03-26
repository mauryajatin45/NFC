import { useState, Fragment } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { LifecycleBadge, type LifecycleState } from "@/components/ui/lifecycle-badge";
import { ChevronDown, ChevronUp, ExternalLink, Box, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";

import type { Order } from "@/services/api/types";

interface OrdersTableProps {
  orders: Order[];
  searchQuery: string;
  sortBy: string;
  statusFilter: string;
  onViewDetail?: (order: Order) => void;
}

export default function OrdersTable({ orders, searchQuery, sortBy, statusFilter, onViewDetail }: OrdersTableProps) {
  const [expandedOrders, setExpandedOrders] = useState<Record<string, boolean>>({});

  const toggleExpand = (orderId: string) => {
    setExpandedOrders(prev => ({
      ...prev,
      [orderId]: !prev[orderId]
    }));
  };

  // Filter Logic
  const filteredOrders = (orders || []).filter(order => {
    const query = (searchQuery || "").toLowerCase();
    const orderNumber = order.name || "";
    const customerName = order.customer?.name || "";
    const customerEmail = order.customer?.email || "";
    const matchesSearch = 
      orderNumber.toLowerCase().includes(query) || 
      customerName.toLowerCase().includes(query) ||
      customerEmail.toLowerCase().includes(query);
    
    // Status Filter
    if (statusFilter === "all") return matchesSearch;
    // Normalized check
    const normalizedStatus = (order.verificationStatus || order.status || "pending").toLowerCase();
    
    if (statusFilter === "active") return matchesSearch && (normalizedStatus === "pending" || normalizedStatus === "active");
    return matchesSearch && normalizedStatus === statusFilter;
  });

  // Sort Logic
  const sortedOrders = [...filteredOrders].sort((a, b) => {
    if (sortBy === "new") return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    if (sortBy === "old") return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
    return 0;
  });

  return (
    <div className="rounded-md border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">ORDER</TableHead>
            <TableHead>CUSTOMER</TableHead>
            <TableHead>DATE</TableHead>
            <TableHead className="text-right">TOTAL</TableHead>
            <TableHead className="w-[150px]">STATUS</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedOrders.length === 0 ? (
             <TableRow>
              <TableCell colSpan={6} className="h-24 text-center">
                No orders found.
              </TableCell>
            </TableRow>
          ) : (
            sortedOrders.map((order) => {
              const isExpanded = expandedOrders[order.id];
              return (
                <Fragment key={order.id}>
                  <TableRow 
                    key={order.id} 
                    className="cursor-pointer"
                    onClick={() => toggleExpand(order.id)}
                  >
                    <TableCell className="font-medium align-top">{order.name || "\u2014"}</TableCell>
                    <TableCell className="align-top">
                      <div className="flex flex-col">
                        <span className="font-medium">{order.customer?.name || "Guest"}</span>
                        <span className="text-muted-foreground text-xs">{order.customer?.email || "\u2014"}</span>
                      </div>
                    </TableCell>
                    <TableCell className="align-top">{order.createdAt ? new Date(order.createdAt).toLocaleDateString() : "\u2014"}</TableCell>
                    <TableCell className="text-right align-top">{parseFloat(order.totalPrice || "0").toLocaleString('en-US', { style: 'currency', currency: order.currency || "USD" })}</TableCell>
                    <TableCell className="align-top">
                      <LifecycleBadge state={(order.verificationStatus || order.status || "pending") as LifecycleState} />
                    </TableCell>
                    <TableCell className="align-top">
                      {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                    </TableCell>
                  </TableRow>
                  
                  {/* Expanded Row Content */}
                  {isExpanded && (
                    <TableRow className="hover:bg-transparent bg-muted/30">
                      <TableCell colSpan={6} className="p-0 border-t-0">
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-medium">Order Details</h3>
                                <Button variant="outline" size="sm" className="gap-2" onClick={(e) => { e.stopPropagation(); onViewDetail?.(order); }}>
                                    <ExternalLink className="h-4 w-4" />
                                    View Full Record
                                </Button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* Left Column: Customer & Products */}
                                <div className="space-y-6">
                                    <div>
                                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Customer</h4>
                                        <div className="text-sm">
                                            <p className="font-medium">{order.customer?.name || "Guest"}</p>
                                            <p className="text-muted-foreground">{order.customer?.email || ""}</p>
                                            {order.shippingAddress && (
                                                <div className="text-muted-foreground mt-1">
                                                    <p>{order.shippingAddress.line1 || ""}</p>
                                                    {order.shippingAddress.line2 && <p>{order.shippingAddress.line2}</p>}
                                                    <p>{order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zip}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div>
                                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Products</h4>
                                        <div className="space-y-3">
                                            {(order.items || []).map((item, idx) => (
                                                <div key={idx} className="flex justify-between text-sm">
                                                    <div>
                                                        <p className="font-medium">{item.name}</p>
                                                        <p className="text-muted-foreground text-xs">{item.sku} × {item.quantity || 1}</p>
                                                    </div>
                                                    <p className="font-medium">{parseFloat(String(item.value || 0)).toLocaleString('en-US', { style: 'currency', currency: order.currency || "USD" })}</p>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="mt-4 pt-4 border-t border-border/50">
                                            <div className="flex justify-between text-sm mb-1">
                                                <span className="text-muted-foreground">Subtotal</span>
                                                <span>{parseFloat(String((order.items || []).reduce((acc, curr) => acc + (curr.value || 0) * (curr.quantity || 1), 0))).toLocaleString('en-US', { style: 'currency', currency: order.currency || "USD" })}</span>
                                            </div>
                                            <div className="flex justify-between text-sm mb-1">
                                                <span className="text-muted-foreground">Shipping</span>
                                                <span>Calculated at checkout</span>
                                            </div>
                                            <div className="flex justify-between font-medium mt-2">
                                                <span>Total</span>
                                                <span>{parseFloat(order.totalPrice || "0").toLocaleString('en-US', { style: 'currency', currency: order.currency || "USD" })}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Right Column: Events & Warehouse */}
                                <div className="space-y-6">
                                    <div>
                                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Events</h4>
                                        <div className="flex gap-2 mb-4">
                                            {/* Dummy event badges based on status */}
                                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-white border border-border text-xs font-medium text-foreground shadow-sm">
                                                <Box className="h-3 w-3" /> Write
                                            </span>
                                            {order.status === 'verified' && (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-white border border-border text-xs font-medium text-foreground shadow-sm">
                                                    <Smartphone className="h-3 w-3" /> Tap
                                                </span>
                                            )}
                                        </div>
                                        
                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                            <div>
                                                <p className="text-muted-foreground text-xs mb-1">NFC Tag UID</p>
                                                <p className="font-mono text-xs">{(order as any).metafields?.nfc_uid || "—"}</p>
                                            </div>
                                            <div>
                                                <p className="text-muted-foreground text-xs mb-1">Proof ID</p>
                                                <p className="font-mono text-xs">{(order as any).metafields?.proof_reference || "—"}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
