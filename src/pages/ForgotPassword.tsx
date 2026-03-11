import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InkScreen, InkHeader, InkContent, InkHeading, InkSubheading, InkLabel } from "@/components/InkScreen";
import { Loader2, ArrowLeft, CheckCircle } from "lucide-react";
import { requestPasswordReset } from "@/services/api";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (!email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }
    
    setIsSubmitting(true);
    
    const result = await requestPasswordReset(email);
    
    if (result.error) {
      setError(result.error.message || "Failed to send reset email. Please try again.");
      setIsSubmitting(false);
      return;
    }
    
    setIsSubmitting(false);
    setIsSuccess(true);
  };

  const isValid = email.length > 0;

  if (isSuccess) {
    return (
      <InkScreen>
        <InkHeader />
        
        <InkContent>
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-lg bg-primary/10 flex items-center justify-center mb-6">
              <CheckCircle size={32} className="text-primary" />
            </div>
            <InkHeading>Check Your Email</InkHeading>
            <InkSubheading>
              We've sent password reset instructions to <strong className="text-foreground">{email}</strong>
            </InkSubheading>
            
            <div className="mt-8 space-y-4 w-full">
              <p className="font-sans text-sm text-muted-foreground">
                Didn't receive the email? Check your spam folder or try again.
              </p>
              
              <Button
                variant="outline"
                size="ink"
                onClick={() => {
                  setIsSuccess(false);
                  setEmail("");
                }}
                className="w-full"
              >
                Try Again
              </Button>
              
              <Link to="/login" className="block">
                <Button variant="ghost" size="ink" className="w-full">
                  <ArrowLeft size={18} className="mr-2" />
                  Back to Login
                </Button>
              </Link>
            </div>
          </div>
        </InkContent>
      </InkScreen>
    );
  }

  return (
    <InkScreen>
      <InkHeader />
      
      <InkContent>
        <InkHeading>Reset Password</InkHeading>
        <InkSubheading>
          Enter your email and we'll send you instructions to reset your password.
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

          {error && (
            <p className="font-sans text-sm text-destructive text-center">
              {error}
            </p>
          )}

          <div className="pt-4 space-y-3">
            <Button
              type="submit"
              variant="ink"
              size="ink"
              disabled={!isValid || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={18} className="mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                "Send Reset Link"
              )}
            </Button>
            
            <Link to="/login" className="block">
              <Button type="button" variant="ghost" size="ink" className="w-full">
                <ArrowLeft size={18} className="mr-2" />
                Back to Login
              </Button>
            </Link>
          </div>
        </form>
      </InkContent>
    </InkScreen>
  );
}