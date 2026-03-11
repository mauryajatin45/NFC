import { Navigate } from "react-router-dom"; 
import { useAuth } from "@/contexts/AuthContext";

export default function Index() { 
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) return null;
  
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <Navigate to="/login" replace />; 
}