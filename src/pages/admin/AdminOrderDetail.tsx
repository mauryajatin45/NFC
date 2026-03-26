import { Page, Layout, Banner, Spinner } from '@shopify/polaris';
import { useQuery } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import OrderDetailView from '@/components/admin/OrderDetailView';
import { fetchOrder } from '@/services/api';

export default function AdminOrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: order, isLoading, error } = useQuery({
    queryKey: ['adminOrder', id],
    queryFn: async () => {
      if (!id) throw new Error("No ID");
      const res = await fetchOrder(id);
      if (res.error) throw new Error(res.error.message);
      if (!res.data) throw new Error("Order not found");
      return res.data;
    }
  });

  return (
    <Page
      title={order ? `Order ${order.name}` : 'Order Details'}
      backAction={{ content: 'Orders', onAction: () => navigate('/admin/orders') }}
    >
      <Layout>
        <Layout.Section>
          {error && <Banner tone="critical">Failed to load order: {(error as Error).message}</Banner>}
          {isLoading ? (
            <div className="flex justify-center p-8"><Spinner /></div>
          ) : order ? (
            <OrderDetailView order={order as any} onBack={() => navigate('/admin/orders')} />
          ) : null}
        </Layout.Section>
      </Layout>
    </Page>
  );
}
