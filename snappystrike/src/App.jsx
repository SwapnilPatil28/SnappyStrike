/**
 * SnappyStrike ERP - App.jsx
 * 
 * Main Application Router & Authentication Boundary.
 * Handles the routing structure for both the public-facing digital storefronts
 * and the private, protected routes for the Seller Dashboard and POS terminal.
 */
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "./context/AuthContext";

// Pages
import Home from "./pages/Home";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ProtectedRoute from "./components/ProtectedRoute";

// Seller Pages
import StoreSetup from "./pages/seller/StoreSetup";
import DashboardLayout from "./pages/seller/DashboardLayout";
import DashboardOverview from "./pages/seller/DashboardOverview";
import Inventory from "./pages/seller/Inventory";
import POS from "./pages/seller/POS";
import BillsHistory from "./pages/seller/BillsHistory";
import Settings from "./pages/seller/Settings";
import DigitalStorefront from "./pages/public/DigitalStorefront";
import Wishlist from "./pages/public/Wishlist";

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-background font-sans antialiased text-foreground">
          <Toaster position="top-right" />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/stores/:username" element={<DigitalStorefront />} />
            <Route path="/wishlist" element={<Wishlist />} />
            
            {/* Seller Setup (Independent of Sidebar) */}
            <Route 
              path="/seller/setup" 
              element={
                <ProtectedRoute allowedRoles={["seller"]}>
                  <StoreSetup />
                </ProtectedRoute>
              } 
            />

            {/* Seller Dashboard with Sidebar */}
            <Route 
              path="/seller" 
              element={
                <ProtectedRoute allowedRoles={["seller"]}>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route path="dashboard" element={<DashboardOverview />} />
              <Route path="inventory" element={<Inventory />} />
              <Route path="pos" element={<POS />} />
              <Route path="bills" element={<BillsHistory />} />
              <Route path="settings" element={<Settings />} />
            </Route>

          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
