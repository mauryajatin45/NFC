// API Types for Platform Backend

export interface MerchantSession {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  merchant: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string;
  };
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface ShippingAddress {
  street: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

export interface Order {
  id: string;
  status: "pending" | "ready" | "enrolled" | "verified" | "shipped";
  customer: {
    name: string;
    email?: string;
    phone?: string;
  };
  shippingAddress?: ShippingAddress;
  items: OrderItem[];
  createdAt: string;
  updatedAt: string;
  source?: "manual" | "shopify";
}

export interface OrderItem {
  id: string;
  sku: string;
  name: string;
  description?: string;
  value: number;
  currency: string;
  imageUrl?: string;
}

export interface Sticker {
  id: string;
  nfcId: string;
  status: "available" | "enrolled" | "verified" | "void";
  assignedOrderId?: string;
  assignedItemId?: string;
  enrolledAt?: string;
}

export interface StickerInventory {
  available: number;
  enrolled: number;
  total: number;
  stickers: Sticker[];
}

export interface Enrollment {
  id: string;
  orderId: string;
  itemId: string;
  stickerId: string;
  status: "pending" | "complete" | "failed";
  photos: string[];
  createdAt: string;
  completedAt?: string;
}

export interface EnrollmentPayload {
  orderId: string;
  itemId: string;
  nfcId: string;
  photos: File[] | string[];
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface ApiResponse<T> {
  data: T | null;
  error: ApiError | null;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetResponse {
  success: boolean;
  message?: string;
}
