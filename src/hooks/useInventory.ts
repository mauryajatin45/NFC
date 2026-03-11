import { useQuery } from "@tanstack/react-query";
import { fetchInventory } from "@/services/api";

export function useInventory() {
  return useQuery({
    queryKey: ["inventory"],
    queryFn: async () => {
      const response = await fetchInventory();
      if (response.error) {
        throw new Error(response.error.message);
      }
      return response.data!;
    },
    staleTime: 60 * 1000, // 1 minute
  });
}
