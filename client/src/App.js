import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

import ProtectedRoute from "./components/ProtectedRoute";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import PlaceDetails from "./pages/PlaceDetails";
import SubmitPlace from "./pages/SubmitPlace";

// ✅ Ticket system pages
import Orders from "./pages/Orders";
import TicketView from "./pages/TicketView";

// ✅ Admin QR Scanner page
import AdminScanTicket from "./pages/AdminScanTicket";

function App() {
  return (
    <Router>
      <Routes>
        {/* Default route */}
        <Route path="/" element={<Navigate to="/login" />} />

        {/* Auth */}
        <Route path="/login" element={<Login />} />

        {/* Dashboard */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        {/* Submit place */}
        <Route
          path="/submit"
          element={
            <ProtectedRoute>
              <SubmitPlace />
            </ProtectedRoute>
          }
        />

        {/* Place details */}
        <Route
          path="/place/:source/:id"
          element={
            <ProtectedRoute>
              <PlaceDetails />
            </ProtectedRoute>
          }
        />

        {/* ✅ Orders page */}
        <Route
          path="/orders"
          element={
            <ProtectedRoute>
              <Orders />
            </ProtectedRoute>
          }
        />

        {/* ✅ Ticket view page */}
        <Route
          path="/ticket/:id"
          element={
            <ProtectedRoute>
              <TicketView />
            </ProtectedRoute>
          }
        />

        {/* ✅ Admin: Scan ticket QR */}
        <Route
          path="/admin/scan-ticket"
          element={
            <ProtectedRoute>
              <AdminScanTicket />
            </ProtectedRoute>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </Router>
  );
}

export default App;