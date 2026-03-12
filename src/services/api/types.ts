// API Types for INK Backend v1.3.0

export interface MerchantUser {
  user_id: string;
  merchant_id: string;
  name: string;
  email: string;
  role?: string;
  created_at?: string;
}

export interface AuthSession {
  token: string;
  user: MerchantUser;
}

export interface AuthValidateResponse {
  valid: boolean;
  shop_id?: string;
  user_id?: string;
  email?: string;
  role?: string;
}

export interface AdminUserCreatePayload {
  merchant_id: string;
  name: string;
  email: string;
  password?: string; // Add if creating, optional on return
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface ShippingAddress {
  line1?: string;      // same as address1
  line2?: string;      // same as address2
  street?: string;     // deprecated legacy field
  city: string;
  state: string;
  zip: string;
  country: string;
  phone?: string;
}

export interface Order {
  id: string;
  name?: string;                        // human readable e.g. "#1008"
  status: "pending" | "ready" | "enrolled" | "verified" | "shipped" | "delivered";
  verificationStatus?: string;          // raw ink metafield value
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
  // Shopify display fields
  totalPrice?: string;
  currency?: string;
  currencySymbol?: string;
  shippingStatus?: string;
  shippingColor?: string;
}

export interface OrderItem {
  id: string;
  sku: string;
  name: string;
  quantity?: number;
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

export interface StickerInventoryLedger {
  id: string;
  shop_id: string;
  timestamp: string;
  delta: number;
  reason: string;
  balance_after: number;
  metadata?: Record<string, any>;
}

export interface StickerInventory {
  current_count: number;
  recent_transactions: StickerInventoryLedger[];
}

// Keeping local legacy interface backward compatible if needed
export interface LegacyStickerInventory {
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
