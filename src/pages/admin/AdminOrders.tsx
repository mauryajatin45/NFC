import { Page, Layout, Banner, Spinner } from '@shopify/polaris';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import OrdersTable from '@/components/admin/OrdersTable';
import { fetchOrders } from '@/services/api';

export default function AdminOrders() {
  const [searchQuery] = useState("");
  const [sortBy] = useState("new");
  const [statusFilter] = useState("all");

  const { data, isLoading, error } = useQuery({
    queryKey: ['adminOrders'],
    queryFn: async () => {
      const res = await fetchOrders();
      if (res.error) throw new Error(res.error.message);
      return res.data || [];
    }
  });

  return (
    <Page title="Orders">
      <Layout>
        <Layout.Section>
          {error && <Banner tone="critical">Failed to load orders: {(error as Error).message}</Banner>}
          {isLoading ? (
            <div className="flex justify-center p-8"><Spinner /></div>
          ) : (
            <OrdersTable 
              orders={data || []} 
              searchQuery={searchQuery}
              sortBy={sortBy}
              statusFilter={statusFilter}
            />
          )}
        </Layout.Section>
      </Layout>
    </Page>
  );
}
