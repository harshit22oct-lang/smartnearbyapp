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

        {/* ✅ NEW: Orders page */}
        <Route
          path="/orders"
          element={
            <ProtectedRoute>
              <Orders />
            </ProtectedRoute>
          }
        />

        {/* ✅ NEW: Ticket view page */}
        <Route
          path="/ticket/:id"
          element={
            <ProtectedRoute>
              <TicketView />
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