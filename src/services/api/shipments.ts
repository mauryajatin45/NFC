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

const mockShipments: Shipment[] = [
  {
    id: "SHP-001",
    status: "verified",
    customer: { name: "Acme Corp" },
    createdAt: new Date().toISOString(),
    value: 1250.00,
    currency: "USD",
    orderId: "ORD-1234",
    carrier: "UPS",
    trackingNumber: "1Z9999999999999999",
  },
  {
    id: "SHP-002",
    status: "enrolled",
    customer: { name: "Globex Inc" },
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    value: 450.00,
    currency: "USD",
    orderId: "ORD-1235",
  }
];

export async function fetchShipments(): Promise<{ data?: Shipment[], error?: { message: string } }> {
  // Mock API call
  return new Promise((resolve) => setTimeout(() => resolve({
    data: mockShipments
  }), 500));
}
