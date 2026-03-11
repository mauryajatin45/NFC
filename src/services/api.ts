import type { Order, StickerInventory } from "./api/types";

export * from "./api/types";

export async function requestPasswordReset(_email?: string): Promise<{ error?: { message: string } }> {
  // Mock API call
  return new Promise((resolve) => setTimeout(() => resolve({}), 1000));
}

export async function fetchInventory(): Promise<{ data?: StickerInventory, error?: { message: string } }> {
  // Mock API call
  return new Promise((resolve) => setTimeout(() => resolve({
    data: {
      total: 10000,
      enrolled: 4200,
      available: 5800,
      stickers: []
    }
  }), 500));
}

export async function fetchOrders(): Promise<{ data?: Order[], error?: { message: string } }> {
  // Mock API call
  return new Promise((resolve) => setTimeout(() => resolve({
    data: [
      {
        id: "ORD-001",
        status: "ready",
        customer: { name: "John Doe" },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        items: [{ id: "item-1", sku: "NFC-1", name: "Sticker", value: 10, currency: "USD" }]
      },
      {
        id: "ORD-002",
        status: "pending",
        customer: { name: "Jane Smith" },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        items: [{ id: "item-2", sku: "NFC-2", name: "Sticker", value: 20, currency: "USD" }]
      }
    ]
  }), 500));
}

export async function fetchOrder(id: string): Promise<{ data?: Order, error?: { message: string } }> {
  // Mock API call
  return new Promise((resolve) => setTimeout(() => resolve({
    data: {
      id,
      status: "ready",
      customer: { name: "Mock Customer" },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      items: [{ id: "item-1", sku: "NFC-1", name: "Sticker", value: 10, currency: "USD" }]
    }
  }), 500));
}
