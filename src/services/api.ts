import type { Order, StickerInventory } from "./api/types";

export * from "./api/types";
import type { LoginCredentials, AuthSession, AuthValidateResponse, AdminUserCreatePayload, MerchantUser } from "./api/types";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "https://us-central1-inink-c76d3.cloudfunctions.net/api";

export async function authLogin(credentials: LoginCredentials): Promise<{ data?: AuthSession, error?: { message: string } }> {
  try {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(credentials),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(errorData?.error || "Login failed");
    }

    const data = await response.json();
    return { data };
  } catch (error: any) {
    return { error: { message: error.message || "Unable to connect" } };
  }
}

export async function authValidate(token: string): Promise<{ data?: AuthValidateResponse, error?: { message: string } }> {
  try {
    const response = await fetch(`${API_BASE}/auth/validate`, {
      method: "GET",
      headers: { 
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
    });

    if (!response.ok) {
       // Return valid: false instead of throwing if it's just a 401
       if (response.status === 401) {
         return { data: { valid: false } };
       }
       throw new Error("Validation failed");
    }

    const data = await response.json();
    return { data };
  } catch (error: any) {
    return { error: { message: error.message || "Validation failed" } };
  }
}

export async function adminCreateUser(payload: AdminUserCreatePayload): Promise<{ data?: MerchantUser, error?: { message: string } }> {
  try {
    const adminSecret = import.meta.env.VITE_INK_ADMIN_SECRET;
    
    if (!adminSecret) {
      throw new Error("Admin secret is not configured in the environment.");
    }
    
    const response = await fetch(`${API_BASE}/admin/users`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "X-Admin-Secret": adminSecret
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(errorData?.error || "Failed to create user");
    }

    const data = await response.json();
    return { data };
  } catch (error: any) {
    return { error: { message: error.message || "Unable to connect" } };
  }
}

export async function fetchUsers(merchantId: string): Promise<{ data?: MerchantUser[], error?: { message: string } }> {
  try {
    const adminSecret = import.meta.env.VITE_INK_ADMIN_SECRET;
    if (!adminSecret) throw new Error("Admin secret is not configured.");

    const response = await fetch(`${API_BASE}/admin/users?merchant_id=${encodeURIComponent(merchantId)}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "X-Admin-Secret": adminSecret,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(errorData?.error || "Failed to fetch users");
    }

    const raw = await response.json();
    // API may return { users: [...] } or a plain array
    const users: MerchantUser[] = Array.isArray(raw) ? raw : (raw.users ?? []);
    return { data: users };
  } catch (error: any) {
    return { error: { message: error.message || "Unable to fetch users" } };
  }
}

export async function deleteUser(userId: string): Promise<{ error?: { message: string } }> {
  try {
    const adminSecret = import.meta.env.VITE_INK_ADMIN_SECRET;
    if (!adminSecret) throw new Error("Admin secret is not configured.");

    const response = await fetch(`${API_BASE}/admin/users/${encodeURIComponent(userId)}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        "X-Admin-Secret": adminSecret,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(errorData?.error || "Failed to delete user");
    }

    return {};
  } catch (error: any) {
    return { error: { message: error.message || "Unable to delete user" } };
  }
}

export async function requestPasswordReset(_email?: string): Promise<{ error?: { message: string } }> {
  // Mock API call
  return new Promise((resolve) => setTimeout(() => resolve({}), 1000));
}

export async function fetchInventory(): Promise<{ data?: StickerInventory, error?: { message: string } }> {
  try {
    const token = localStorage.getItem('token');
    
    if (!token) {
      throw new Error("Not authenticated");
    }

    // Use the Shopify proxy which handles merchant API key lookup internally
    const PROXY_URL = import.meta.env.VITE_SHOPIFY_APP_URL || "https://shopify-app-250065525755.us-central1.run.app";

    const response = await fetch(`${PROXY_URL}/app/api/warehouse/inventory`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(errorData?.error || "Failed to fetch inventory");
    }

    const raw = await response.json();

    // Map API response fields to our internal StickerInventory type
    const data: StickerInventory = {
      current_count: raw.current_balance ?? raw.current_count ?? 0,
      recent_transactions: (raw.history ?? raw.recent_transactions ?? []).map((t: any) => ({
        timestamp: t.created_at || t.timestamp,
        delta: t.quantity_change ?? t.delta,
        reason: t.order_id || t.reason || t.transaction_type || "unknown",
        balance_after: t.balance_after ?? t.new_balance,
      })),
    };

    return { data };
  } catch (error: any) {
    return { error: { message: error.message || "Unable to connect to inventory service" } };
  }
}

export async function fetchOrders(): Promise<{ data?: Order[], error?: { message: string } }> {
  try {
    const APP_URL = import.meta.env.VITE_SHOPIFY_APP_URL;
    if (!APP_URL) throw new Error("VITE_SHOPIFY_APP_URL is not configured.");

    const token = localStorage.getItem('token');
    if (!token) throw new Error("Not authenticated");

    const response = await fetch(`${APP_URL}/api/orders/fetch`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(errorData?.error || "Failed to fetch orders");
    }

    const { orders } = await response.json();

    // Map the Shopify payload to the UI Order interface
    const mappedOrders: Order[] = orders.map((o: any) => ({
      id: String(o.id),
      name: o.name,
      status: (o.verificationStatus as any) || "pending",
      customer: { 
        name: o.customerName || "Guest", 
        email: o.customerEmail || "",
        phone: o.customerPhone || ""
      },
      shippingAddress: o.shippingAddress || undefined,
      createdAt: o.createdAt,
      updatedAt: o.createdAt,
      totalPrice: o.totalPrice,
      currency: o.currency,
      currencySymbol: o.currencySymbol,
      shippingStatus: o.shippingStatus,
      shippingColor: o.shippingColor,
      verificationStatus: o.verificationStatus,
      metafields: o.metafields || {},
      items: o.items.map((i: any, idx: number) => ({
        id: `item-${idx}`,
        sku: i.sku || `SKU-${idx}`,
        name: i.title,
        quantity: i.quantity,
        value: i.price || 0,
        currency: o.currency || "USD" 
      }))
    }));

    return { data: mappedOrders };
  } catch (error: any) {
    return { error: { message: error.message || "Failed to load orders" } };
  }
}

export async function fetchOrder(id: string): Promise<{ data?: Order, error?: { message: string } }> {
  // Since we only have a list endpoint right now, we can just fetch all and find the one.
  // In a real scenario, you'd add /api/orders/fetch?id=xxx to the server.
  const { data, error } = await fetchOrders();
  if (error) return { error };
  
  const order = data?.find(o => o.id === id);
  if (!order) {
    return { error: { message: "Order not found" } };
  }
  
  return { data: order };
}

