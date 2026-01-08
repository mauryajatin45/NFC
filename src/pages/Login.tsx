import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement real auth
    localStorage.setItem("token", "dummy-token");
    // Auto-set warehouse mode and skip mode selection
    localStorage.setItem("mode", "warehouse");
    navigate("/order/select");
  };

  return (
    <div className="card animate-fade-in" style={{ marginTop: '20px' }}>
      <div className="text-center">
        <h1 className="header-title" style={{ fontFamily: 'Playfair Display', fontSize: '32px', marginBottom: '8px' }}>ink.</h1>
        <h2 className="header-title">Sign In</h2>
        <p className="header-subtitle">Access your account</p>
      </div>
        
        <form onSubmit={handleLogin} className="form-group">
          <div>
            <input
              className="input-field"
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <input
              className="input-field"
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary">
            Log In
          </button>
        </form>
      </div>
  );
}
