import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Loader2 } from "lucide-react";

// Lazy load pages for performance (Phase 1 Code Splitting)
const Index = lazy(() => import("./pages/Index"));
const WarehouseAccess = lazy(() => import("./pages/WarehouseAccess"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const SelectOrder = lazy(() => import("./pages/SelectOrder"));
const CreateOrder = lazy(() => import("./pages/CreateOrder"));
const EnrollNfc = lazy(() => import("./pages/EnrollNfc"));
const Settings = lazy(() => import("./pages/Settings"));
const Shipments = lazy(() => import("./pages/Shipments"));
const Help = lazy(() => import("./pages/Help"));
const NotFound = lazy(() => import("./pages/NotFound"));
const ConsumerTap = lazy(() => import("./pages/ConsumerTap"));
const ConsumerRecord = lazy(() => import("./pages/ConsumerRecord"));

// Admin routes
const AdminLayout = lazy(() => import("./components/AdminLayout"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminOrders = lazy(() => import("./pages/admin/AdminOrders"));
const AdminOrderDetail = lazy(() => import("./pages/admin/AdminOrderDetail"));
const AdminTaggedShipments = lazy(() => import("./pages/admin/AdminTaggedShipments"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes global stale time
      retry: 1,
    },
  },
});

const LoadingSpinner = () => (
  <div className="flex h-screen w-screen items-center justify-center bg-background">
    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={<LoadingSpinner />}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<WarehouseAccess />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/select-order"
                element={
                  <ProtectedRoute>
                    <SelectOrder />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/create-order"
                element={
                  <ProtectedRoute>
                    <CreateOrder />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/enroll-nfc"
                element={
                  <ProtectedRoute>
                    <EnrollNfc />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/settings"
                element={
                  <ProtectedRoute>
                    <Settings />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/shipments"
                element={
                  <ProtectedRoute>
                    <Shipments />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/help"
                element={
                  <ProtectedRoute>
                    <Help />
                  </ProtectedRoute>
                }
              />
              <Route path="/admin" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
                <Route path="dashboard" element={<AdminDashboard />} />
                <Route path="orders" element={<AdminOrders />} />
                <Route path="orders/:id" element={<AdminOrderDetail />} />
                <Route path="tagged-shipments" element={<AdminTaggedShipments />} />
                <Route path="settings" element={<AdminSettings />} />
              </Route>
              <Route path="/t/:id" element={<ConsumerTap />} />
              <Route path="/record/:id" element={<ConsumerRecord />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
