import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Static authentication logic
    if (email === "testing@gmail.com" && password === "test123") {
      localStorage.setItem("token", "dummy-token");
      // Auto-set warehouse mode and skip mode selection
      localStorage.setItem("mode", "warehouse");
      navigate("/order/select");
    } else {
      alert("Invalid email or password");
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
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="login-field">
            <label className="login-label">PASSWORD</label>
            <div className="password-input-wrapper">
              <input
                className="login-input"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                aria-label="Toggle password visibility"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  {showPassword ? (
                    <>
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </>
                  ) : (
                    <>
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </>
                  )}
                </svg>
              </button>
            </div>
          </div>

          <button type="submit" className="btn-login">
            Enter Warehouse
          </button>
        </form>
      </div>
    </div>
  );
}
