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
            <label className="login-label" htmlFor="password">PASSWORD</label>
            <div className="password-input-wrapper relative">
              <input
                id="password"
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
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </button>
            </div>
          </div>

          <button 
            type="submit" 
            className={`btn-login ${password.length > 0 ? "btn-login-active" : ""}`}
          >
            Enter Warehouse
          </button>
        </form>
      </div>
    </div>
  );
}
