import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

interface OrderItem {
  title: string;
  quantity: number;
}

interface Order {
  id: string;
  name: string;
  items: OrderItem[];
  itemCount: number;
  totalPrice: string;
  currencySymbol: string;
  shippingStatus: string;
  shippingColor: string;
}

export default function SelectOrder() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const API_BASE = import.meta.env.VITE_API_BASE_URL || "https://shopifyapp.terzettoo.com";

  const fetchOrders = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const searchParam = searchTerm ? `?search=${encodeURIComponent(searchTerm)}` : "";
      const response = await fetch(`${API_BASE}/api/orders/fetch${searchParam}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch orders: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setOrders(data.orders || []);
      } else {
        throw new Error(data.error || "Failed to load orders");
      }
    } catch (err: any) {
      console.error("Error fetching orders:", err);
      setError(err.message || "Failed to load orders");
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleSearch = () => {
    fetchOrders();
  };

  const handleRefresh = () => {
    setSearchTerm("");
    setSelectedOrderId(null);
    fetchOrders();
  };

  const handleEnroll = () => {
    if (selectedOrderId) {
      localStorage.setItem("currentOrderId", selectedOrderId);
      navigate("/scan");
    }
  };

  const getPrimaryProduct = (order: Order) => {
    if (order.items.length === 0) return "Unknown Product";
    return order.items[0].title;
  };

  return (
    <div className="select-order-container">
      {/* Header */}
      <div className="select-order-header">
        <h1 className="select-order-title">Select Order</h1>
        <p className="select-order-subtitle">Choose an order to begin NFC enrollment.</p>
      </div>

      {/* Search Section */}
      <div className="search-section">
        <label className="search-label">ORDER ID</label>
        <input
          type="text"
          className="search-input"
          placeholder="Enter order # or tap scan"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
        />
      </div>

      {/* Orders List Section */}
      <div className="orders-section">
        <div className="orders-header">
          <span className="orders-label">READY FOR ENROLLMENT</span>
          <button className="refresh-btn" onClick={handleRefresh} disabled={loading}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="23 4 23 10 17 10" />
              <polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
            Refresh
          </button>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading orders...</p>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="error-state">
            <p>❌ {error}</p>
            <button className="btn-retry" onClick={handleRefresh}>
              Retry
            </button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && orders.length === 0 && (
          <div className="empty-state">
            <p>No orders ready for enrollment</p>
            <button className="btn-retry" onClick={handleRefresh}>
              Refresh
            </button>
          </div>
        )}

        {/* Orders List */}
        {!loading && !error && orders.length > 0 && (
          <div className="orders-list">
            {orders.map((order) => (
              <div
                key={order.id}
                className={`order-card ${selectedOrderId === order.id ? "selected" : ""}`}
                onClick={() => setSelectedOrderId(order.id)}
              >
                <div className="order-card-header">
                  <div className="order-indicator">
                    <div className={`indicator-dot ${selectedOrderId === order.id ? "active" : ""}`} />
                  </div>
                  <div className="order-details">
                    <div className="order-id">{order.name}</div>
                    <div className="order-product">{getPrimaryProduct(order)}</div>
                    <div className="order-meta">
                      {order.itemCount} {order.itemCount === 1 ? "item" : "items"}
                    </div>
                  </div>
                  <div className="order-right">
                    <div className="order-price">
                      {order.currencySymbol}{order.totalPrice}
                    </div>
                    <span className={`shipping-label shipping-${order.shippingColor}`}>
                      {order.shippingStatus}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Enroll Button */}
      <div className="enroll-button-container">
        <button
          className="btn-enroll"
          onClick={handleEnroll}
          disabled={!selectedOrderId || loading}
        >
          Enroll
        </button>
      </div>
    </div>
  );
}
