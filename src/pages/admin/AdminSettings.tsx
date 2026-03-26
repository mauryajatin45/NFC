import { useQuery } from "@tanstack/react-query";
import { Spinner, Banner } from "@shopify/polaris";
import Settings from "@/components/admin/settings/Settings";

// We mock the API call since the standalone PWA doesn't have a specific settings endpoint yet.
// In a real application, we would fetch from /api/merchant/settings
const mockFetchSettings = async () => {
    return {
        shopName: "Admin User",
        shopDomain: "warehouse-pwa",
        contactEmail: "admin@warehouse.local",
        installedDate: new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date()),
        inventoryData: {
            current: "0",
            usedThisPeriod: "0"
        }
    };
};

export default function AdminSettings() {
    const { data: initialData, isLoading, error } = useQuery({
        queryKey: ['adminSettings'],
        queryFn: mockFetchSettings
    });

    if (isLoading) {
        return <div className="flex justify-center p-8"><Spinner size="large" /></div>;
    }

    if (error) {
        return <Banner tone="critical">Failed to load settings: {(error as Error).message}</Banner>;
    }

    return <Settings initialData={initialData} />;
}
