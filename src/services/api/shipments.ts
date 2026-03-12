export type ShipmentStatus = "verified" | "enrolled" | "active" | "in_transit" | "delivered";

export interface Shipment {
  id: string;
  status: ShipmentStatus;
  customer: {
    name: string;
  };
  createdAt: string;
  value: number;
  currency: string;
  orderId: string;
  carrier?: string;
  trackingNumber?: string;
  shippedAt?: string;
  deliveredAt?: string;
}

export async function fetchShipments(): Promise<{ data?: Shipment[], error?: { message: string } }> {
  try {
    const APP_URL = import.meta.env.VITE_SHOPIFY_APP_URL;
    if (!APP_URL) throw new Error("VITE_SHOPIFY_APP_URL is not configured.");

    const token = localStorage.getItem('token');
    if (!token) throw new Error("Not authenticated");

    // ?mode=shipments returns only enrolled/verified/delivered INK orders
    const response = await fetch(`${APP_URL}/api/orders/fetch?mode=shipments`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(errorData?.error || "Failed to fetch shipments");
    }

    const { orders } = await response.json();

    if (!orders || orders.length === 0) return { data: [] };

    // Map to Shipment UI interface — proxy already filtered to enrolled/verified/delivered
    const mappedShipments: Shipment[] = orders.map((o: any) => ({
      id: String(o.id),
      status: (o.verificationStatus as ShipmentStatus) || "enrolled",
      customer: { name: o.customerName || "Guest" },
      createdAt: o.createdAt,
      value: parseFloat(o.totalPrice) || 0,
      currency: o.currency || "USD",
      orderId: o.name || String(o.id),  // use human-readable order name (#1234)
    }));

    return { data: mappedShipments };
  } catch (error: any) {
    return { error: { message: error.message || "Failed to load shipments" } };
  }
}


export interface DeliveryContext {
  delivery_latitude?: number;
  delivery_longitude?: number;
  carrier?: string;
}

export async function markShipmentDelivered(
  proofId: string,
  context?: DeliveryContext
): Promise<{ data?: any, error?: { message: string } }> {
  try {
    const API_BASE = import.meta.env.VITE_API_BASE_URL || "https://us-central1-inink-c76d3.cloudfunctions.net/api";
    const token = localStorage.getItem('token');
    
    if (!token) {
      throw new Error("Not authenticated");
    }

    // v1.2.0 required body: delivered_at + optional geolocation/carrier
    const body: Record<string, any> = {
      delivered_at: new Date().toISOString()
    };

    if (context?.delivery_latitude !== undefined) body.delivery_latitude = context.delivery_latitude;
    if (context?.delivery_longitude !== undefined) body.delivery_longitude = context.delivery_longitude;
    if (context?.carrier) body.carrier = context.carrier;

    const response = await fetch(`${API_BASE}/proofs/${proofId}/delivered`, {
      method: "PATCH",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(errorData?.error || "Failed to mark as delivered");
    }

    const data = await response.json();
    return { data };
  } catch (error: any) {
    return { error: { message: error.message || "Network error" } };
  }
}
