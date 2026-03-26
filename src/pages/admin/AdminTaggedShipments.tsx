import { useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchOrders } from "@/services/api";
import {
  Page,
  IndexTable,
  Tabs,
  Badge,
  Text,
  TextField,
  Button,
  InlineStack,
  BlockStack,
  Spinner,
  Banner
} from "@shopify/polaris";
import type { BadgeProps } from "@shopify/polaris";
import { SearchIcon, RefreshIcon } from "@shopify/polaris-icons";
import { ChevronDown } from "lucide-react";
import OrderExpandedRow from "@/components/admin/OrderExpandedRow";
import OrderDetailView from "@/components/admin/OrderDetailView";

const statusBadgeProps: Record<string, { tone: BadgeProps["tone"]; label: string }> = {
  enrolled: { tone: "warning", label: "Enrolled" },
  active: { tone: "info", label: "Active" },
  verified: { tone: "success", label: "Verified" },
  expired: { tone: undefined, label: "Expired" },
  cooldown: { tone: "attention", label: "Cooldown" },
  pending: { tone: undefined, label: "Pending" },
};

export default function AdminTaggedShipments() {
  const queryClient = useQueryClient();
  const { data: orders, isLoading, error } = useQuery({
    queryKey: ['adminOrders'],
    queryFn: async () => {
      const res = await fetchOrders();
      if (res.error) throw new Error(res.error.message);
      // In NFC PWA we just treat all fetched orders as "eligible" ink orders 
      // or we can add a simple filter if needed. For now assuming all are ink orders.
      return res.data?.map(o => ({ ...o, isEligible: true, date: o.createdAt })) || [];
    }
  });

  const [queryValue, setQueryValue] = useState("");
  const [selected, setSelected] = useState(0);
  const [sortValue, setSortValue] = useState("new");
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

  const counts = {
    all: orders?.length || 0,
    enrolled: orders?.filter(o => o.status === ("enrolled" as any)).length || 0,
    cooldown: orders?.filter(o => o.status === ("cooldown" as any)).length || 0,
    active: orders?.filter(o => o.status === ("active" as any)).length || 0,
    verified: orders?.filter(o => o.status === ("verified" as any)).length || 0,
    expired: orders?.filter(o => o.status === ("expired" as any)).length || 0,
  };

  const tabs = [
    { id: "all", content: `All (${counts.all})`, panelID: "all" },
    { id: "enrolled", content: `Enrolled (${counts.enrolled})`, panelID: "enrolled" },
    { id: "active", content: `Active (${counts.active})`, panelID: "active" },
    { id: "verified", content: `Verified (${counts.verified})`, panelID: "verified" },
    { id: "expired", content: `Expired (${counts.expired})`, panelID: "expired" },
  ];

  const statusFilterKey = tabs[selected]?.id || "all";

  const filteredOrders = (orders || []).filter((order: any) => {
    if (statusFilterKey !== "all" && order.status !== statusFilterKey) return false;
    if (!queryValue) return true;
    const q = queryValue.toLowerCase();
    return (
      order.name?.toLowerCase().includes(q) ||
      order.customer?.name?.toLowerCase().includes(q) ||
      order.customer?.email?.toLowerCase().includes(q)
    );
  });

  const sortedOrders = [...filteredOrders].sort((a: any, b: any) => {
    const da = a.date ? new Date(a.date).getTime() : 0;
    const db = b.date ? new Date(b.date).getTime() : 0;
    if (sortValue === "new") return db - da;
    return da - db;
  });

  const handleRowClick = useCallback((orderId: string) => {
    setExpandedOrder((prev) => (prev === orderId ? null : orderId));
  }, []);

  const handleRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['adminOrders'] });
  }, [queryClient]);

  const resourceName = { singular: "shipment", plural: "shipments" };

  if (selectedOrder) {
    return (
      <Page title={selectedOrder.name || selectedOrder.id} backAction={{ content: 'Shipments', onAction: () => setSelectedOrder(null) }}>
        <OrderDetailView order={{...selectedOrder, orderNumber: selectedOrder.name, customerName: selectedOrder.customer?.name, customerEmail: selectedOrder.customer?.email, customerAddress: selectedOrder.shippingAddress, total: selectedOrder.totalPrice, subtotal: selectedOrder.totalPrice, metafields: selectedOrder.metafields || {}}} onBack={() => setSelectedOrder(null)} />
      </Page>
    );
  }

  const tableRows = sortedOrders.flatMap((order: any, index: number) => {
    const isExpanded = expandedOrder === order.id;
    const badgeConfig = statusBadgeProps[order.status] || { tone: undefined, label: order.status };

    const row = (
      <IndexTable.Row id={order.id} key={order.id} position={index} onClick={() => handleRowClick(order.id)} selected={false}>
        <IndexTable.Cell><Text variant="bodyMd" fontWeight="semibold" as="span">{order.name || order.id}</Text></IndexTable.Cell>
        <IndexTable.Cell>
          <div>
            <Text variant="bodyMd" as="span">{order.customer?.name}</Text><br />
            <Text variant="bodySm" tone="subdued" as="span">{order.customer?.email}</Text>
          </div>
        </IndexTable.Cell>
        <IndexTable.Cell><Text variant="bodyMd" as="span">{new Date(order.createdAt).toLocaleDateString()}</Text></IndexTable.Cell>
        <IndexTable.Cell>
          <Text variant="bodyMd" as="span" alignment="end">
            {parseFloat(order.totalPrice || "0").toLocaleString("en-US", { style: "currency", currency: order.currency || "USD" })}
          </Text>
        </IndexTable.Cell>
        <IndexTable.Cell>
          <Badge tone={badgeConfig.tone}>{badgeConfig.label}</Badge>
        </IndexTable.Cell>
      </IndexTable.Row>
    );

    if (isExpanded) {
      const expandedRow = (
        <tr key={`${order.id}-expanded`}>
          <td colSpan={5} style={{ padding: 0 }}>
            <OrderExpandedRow 
              order={{...order, orderNumber: order.name, customerName: order.customer?.name, customerEmail: order.customer?.email, customerAddress: order.shippingAddress, total: order.totalPrice, subtotal: order.totalPrice, metafields: order.metafields || {}}} 
              onCollapse={() => setExpandedOrder(null)} 
              onViewFull={() => setSelectedOrder(order)} 
            />
          </td>
        </tr>
      );
      return [row, expandedRow];
    }
    return [row];
  });

  return (
    <Page title="Shipments">
      {error && <Banner tone="critical">Failed to load shipments: {(error as Error).message}</Banner>}
      {isLoading ? (
        <div className="flex justify-center p-8"><Spinner size="large" /></div>
      ) : (
        <BlockStack gap="400">
          <TextField
            label=""
            labelHidden
            placeholder="Search by order number, customer, email..."
            value={queryValue}
            onChange={setQueryValue}
            prefix={<SearchIcon />}
            autoComplete="off"
            clearButton
            onClearButtonClick={() => setQueryValue("")}
          />
          <InlineStack align="space-between" blockAlign="center">
            <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", color: "var(--p-color-text-secondary)" }}>
              Sort
              <select value={sortValue} onChange={(e) => setSortValue(e.target.value)} style={{ fontSize: "13px", padding: "4px 28px 4px 8px", border: "1px solid var(--p-color-border)", borderRadius: "6px", background: "var(--p-color-bg-surface)", color: "var(--p-color-text)", appearance: "none", WebkitAppearance: "none", cursor: "pointer" }}>
                <option value="new">Newest</option>
                <option value="old">Oldest</option>
              </select>
            </label>
            <Button icon={RefreshIcon} size="slim" onClick={handleRefresh}>Refresh</Button>
          </InlineStack>

          <Tabs tabs={tabs} selected={selected} onSelect={setSelected}>
            <div className="hidden lg:block">
              <IndexTable resourceName={resourceName} itemCount={sortedOrders.length} headings={[{ title: "Order" }, { title: "Customer" }, { title: "Date" }, { title: "Total", alignment: "end" }, { title: "Status" }]} selectable={false}>
                {tableRows as any}
              </IndexTable>
            </div>
            
            <div className="lg:hidden space-y-2 pt-2">
              {sortedOrders.map((order: any) => {
                const isExpanded = expandedOrder === order.id;
                const badgeConfig = statusBadgeProps[order.status] || { tone: undefined, label: order.status };
                return (
                  <div key={order.id}>
                    <div className={`bg-card border cursor-pointer transition-colors ${isExpanded ? "border-foreground" : "border-border hover:bg-secondary"}`} onClick={() => handleRowClick(order.id)}>
                      <div className={`px-4 py-3 ${isExpanded ? "bg-muted" : ""}`}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-foreground">{order.name}</span>
                            <Badge tone={badgeConfig.tone}>{badgeConfig.label}</Badge>
                          </div>
                          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-foreground">{order.customer?.name}</span>
                          <span className="font-medium text-foreground">{parseFloat(order.totalPrice || "0").toLocaleString("en-US", { style: "currency", currency: order.currency || "USD" })}</span>
                        </div>
                        <time className="text-xs text-muted-foreground">{new Date(order.createdAt).toLocaleDateString()}</time>
                      </div>
                    </div>
                    {isExpanded && (
                      <OrderExpandedRow order={{...order, orderNumber: order.name, customerName: order.customer?.name, customerEmail: order.customer?.email, customerAddress: order.shippingAddress, total: order.totalPrice, subtotal: order.totalPrice, metafields: order.metafields || {}}} onCollapse={() => setExpandedOrder(null)} onViewFull={() => setSelectedOrder(order)} />
                    )}
                  </div>
                );
              })}
            </div>
          </Tabs>
        </BlockStack>
      )}
    </Page>
  );
}
