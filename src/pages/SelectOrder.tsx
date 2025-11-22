import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function SelectOrder() {
  const [orderId, setOrderId] = useState("");
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (orderId) {
      localStorage.setItem("currentOrderId", orderId);
      navigate("/scan");
    }
  };

  return (
    <div className="card animate-fade-in">
      <div className="text-center">
        <h1 className="header-title">Select Order</h1>
        <p className="header-subtitle">Enter order ID or scan barcode</p>
      </div>

      <form onSubmit={handleSubmit} className="form-group">
        <div>
          <input
            className="input-field"
            type="text"
            placeholder="Order ID / Scan Barcode"
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
            required
          />
        </div>
        <button type="submit" className="btn btn-primary">
          Continue
        </button>
      </form>
    </div>
  );
}
