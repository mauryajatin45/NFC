import { useState } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "https://shopify-app-250065525755.us-central1.run.app";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE}/app/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Invalid email or password");
        return;
      }

      // Store auth data
      localStorage.setItem("token", data.token);
      localStorage.setItem("userId", data.userId);
      localStorage.setItem("userName", data.name);
      localStorage.setItem("userEmail", data.email);
      localStorage.setItem("mode", "warehouse");

      navigate("/order/select");
    } catch (err) {
      console.error("Login error:", err);
      setError("Unable to connect. Please check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-header">
          <h1 className="login-title">Warehouse Access</h1>
          <p className="login-subtitle">Login to enroll packages</p>
        </div>
        
        <form onSubmit={handleLogin} className="login-form">
          <div className="login-field">
            <label className="login-label">WORK EMAIL</label>
            <input
              className="login-input"
              type="email"
              placeholder="operator@warehouse.com"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(""); }}
              required
              disabled={isLoading}
            />
          </div>

          <div className="login-field">
            <label className="login-label" htmlFor="password">PASSWORD</label>
            <div className="password-input-wrapper relative">
              <input
                id="password"
                className="login-input"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(""); }}
                required
                disabled={isLoading}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                aria-label="Toggle password visibility"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </button>
            </div>
          </div>

          {error && (
            <p style={{ color: "#ef4444", fontSize: "14px", textAlign: "center", marginTop: "-4px" }}>{error}</p>
          )}

          <button 
            type="submit" 
            className={`btn-login ${password.length > 0 && !isLoading ? "btn-login-active" : ""}`}
            disabled={isLoading}
          >
            {isLoading ? "Verifying…" : "Enter Warehouse"}
          </button>
        </form>
      </div>
    </div>
  );
}
