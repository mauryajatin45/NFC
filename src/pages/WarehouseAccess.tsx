import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InkScreen, InkHeader, InkContent, InkHeading, InkSubheading, InkLabel } from "@/components/InkScreen";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "https://shopify-app-250065525755.us-central1.run.app";

export default function WarehouseAccess() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (!email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }
    
    if (password.length < 4) {
      setError("Password must be at least 4 characters.");
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const response = await fetch(`${API_BASE}/app/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Invalid email or password");
        setIsSubmitting(false);
        return;
      }

      // Store auth data via Context
      login(data.token, {
          userId: data.userId,
          name: data.name,
          email: data.email
      });

      navigate("/dashboard"); // Redirecting to dashboard immediately after login
    } catch (err) {
      console.error("Login error:", err);
      setError("Unable to connect. Please check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isValid = email.length > 0 && password.length > 0;

  return (
    <InkScreen>
      <InkHeader />
      
      <InkContent>
        <InkHeading>Warehouse Access</InkHeading>
        <InkSubheading>
          Login to enroll packages
        </InkSubheading>

        <form onSubmit={handleSubmit} className="mt-12 space-y-6 w-full">
          <div>
            <InkLabel htmlFor="email">Work Email</InkLabel>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="operator@warehouse.com"
              autoComplete="email"
              autoFocus
              disabled={isSubmitting}
            />
          </div>

          <div>
            <InkLabel htmlFor="password">Password</InkLabel>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                className="pr-10"
                disabled={isSubmitting}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error && (
            <p className="font-sans text-sm text-destructive text-center">
              {error}
            </p>
          )}

          <div className="pt-4">
            <Button
              type="submit"
              variant="ink"
              size="ink"
              disabled={!isValid || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={18} className="mr-2 animate-spin" />
                  Verifying...
                </>
              ) : (
                "Enter Warehouse"
              )}
            </Button>
          </div>
        </form>
      </InkContent>
    </InkScreen>
  );
}