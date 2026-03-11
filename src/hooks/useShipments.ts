import { useQuery } from "@tanstack/react-query";
import { fetchShipments } from "@/services/api/shipments";

export function useShipments() {
  return useQuery({
    queryKey: ["shipments"],
    queryFn: async () => {
      const response = await fetchShipments();
      if (response.error) {
        throw new Error(response.error.message);
      }
      return response.data!;
    },
    staleTime: 30 * 1000,
  });
}
