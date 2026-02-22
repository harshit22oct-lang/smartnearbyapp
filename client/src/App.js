import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

import ProtectedRoute from "./components/ProtectedRoute";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import PlaceDetails from "./pages/PlaceDetails";
import SubmitPlace from "./pages/SubmitPlace";

import Orders from "./pages/Orders";
import TicketView from "./pages/TicketView";
import AdminScanTicket from "./pages/AdminScanTicket";

import SubmitEvent from "./pages/SubmitEvent";
import EventDetails from "./pages/EventDetails";
import AdminEventSubmissions from "./pages/AdminEventSubmissions";
import AdminContentManager from "./pages/AdminContentManager";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/login" element={<Login />} />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/submit"
          element={
            <ProtectedRoute>
              <SubmitPlace />
            </ProtectedRoute>
          }
        />

        <Route
          path="/submit-event"
          element={
            <ProtectedRoute>
              <SubmitEvent />
            </ProtectedRoute>
          }
        />

        <Route
          path="/event/:id"
          element={
            <ProtectedRoute>
              <EventDetails />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/event-submissions"
          element={
            <ProtectedRoute>
              <AdminEventSubmissions />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/content-manager"
          element={
            <ProtectedRoute>
              <AdminContentManager />
            </ProtectedRoute>
          }
        />

        <Route
          path="/place/:source/:id"
          element={
            <ProtectedRoute>
              <PlaceDetails />
            </ProtectedRoute>
          }
        />

        <Route
          path="/orders"
          element={
            <ProtectedRoute>
              <Orders />
            </ProtectedRoute>
          }
        />

        <Route
          path="/ticket/:id"
          element={
            <ProtectedRoute>
              <TicketView />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/scan-ticket"
          element={
            <ProtectedRoute>
              <AdminScanTicket />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </Router>
  );
}

export default App;
