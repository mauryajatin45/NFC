import { useQuery } from "@tanstack/react-query";
import { fetchOrders, fetchOrder } from "@/services/api";

export function useOrders() {
  return useQuery({
    queryKey: ["orders"],
    queryFn: async () => {
      const response = await fetchOrders();
      if (response.error) {
        throw new Error(response.error.message);
      }
      return response.data!;
    },
    staleTime: 0,            // always treat data as stale
    refetchOnMount: "always", // refetch every time this hook mounts (page navigation)
    refetchOnWindowFocus: true, // refetch when user returns to the browser tab
  });
}

export function useOrder(orderId: string) {
  return useQuery({
    queryKey: ["orders", orderId],
    queryFn: async () => {
      const response = await fetchOrder(orderId);
      if (response.error) {
        throw new Error(response.error.message);
      }
      return response.data!;
    },
    enabled: !!orderId,
  });
}
