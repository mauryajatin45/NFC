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
    navigate("/home");
  };

  return (
    <div className="card animate-fade-in">
      <div className="text-center">
        <h1 className="header-title">Ink Warehouse</h1>
        <p className="header-subtitle">Sign in to manage orders</p>
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
