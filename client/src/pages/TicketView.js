import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";

const API = process.env.REACT_APP_API_URL;

export default function TicketView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const auth = useMemo(
    () => ({ headers: { Authorization: `Bearer ${token}` } }),
    [token]
  );

  const [t, setT] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const load = async () => {
    setBusy(true);
    setMsg("");
    try {
      const res = await axios.get(`${API}/api/tickets/${id}`, auth);
      setT(res.data);
    } catch (err) {
      setT(null);
      setMsg(err?.response?.data?.message || "Failed to load ticket");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (!token) navigate("/login");
    else load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const ev = t?.event || {};
  const isFree = Number(t?.amount || 0) <= 0;

  return (
    <div style={{ padding: 20, background: "#f6f7fb", minHeight: "100vh" }}>
      <div style={{ maxWidth: 720, margin: "0 auto", background: "#fff", borderRadius: 18, border: "1px solid #eee", overflow: "hidden" }}>
        <div style={{ height: 150, background: ev.bannerImage ? `url(${ev.bannerImage}) center/cover no-repeat` : "linear-gradient(135deg,#111,#444)" }} />

        <div style={{ padding: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <div>
              <h2 style={{ margin: 0 }}>🎟️ Ticket</h2>
              <div style={{ marginTop: 6, opacity: 0.75, fontSize: 13 }}>{ev.title || "Event"}</div>
            </div>

            <button
              onClick={() => navigate("/orders")}
              style={{ padding: "8px 12px", borderRadius: 12, border: "1px solid #ddd", background: "#fff", cursor: "pointer", fontWeight: 900 }}
            >
              ← Orders
            </button>
          </div>

          {msg ? <div style={{ marginTop: 12, padding: 10, borderRadius: 12, background: "#fff7e6", border: "1px solid #ffe0b2" }}>{msg}</div> : null}
          {busy ? <div style={{ marginTop: 12, opacity: 0.75 }}>Loading...</div> : null}

          {t ? (
            <>
              <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div style={{ padding: 12, borderRadius: 14, border: "1px solid #eee", background: "#fafafa" }}>
                  <div style={{ fontWeight: 900 }}>Event</div>
                  <div style={{ marginTop: 6, fontSize: 13, opacity: 0.85 }}>🗓️ {ev.startAt ? new Date(ev.startAt).toLocaleString() : "TBA"}</div>
                  <div style={{ marginTop: 6, fontSize: 13, opacity: 0.85 }}>📍 {ev.venue || "Venue TBA"}</div>
                  <div style={{ marginTop: 6, fontSize: 13, opacity: 0.85 }}>💳 {isFree ? "FREE" : `₹${Number(t.amount || 0)}`}</div>
                  <div style={{ marginTop: 6, fontSize: 13, opacity: 0.85 }}>✅ Status: {t.status}</div>
                </div>

                <div style={{ padding: 12, borderRadius: 14, border: "1px solid #eee", background: "#fff" }}>
                  <div style={{ fontWeight: 900 }}>QR Code</div>
                  {t.qrBase64 ? (
                    <div style={{ marginTop: 10, display: "grid", placeItems: "center" }}>
                      <img alt="qr" src={t.qrBase64} style={{ width: 220, height: 220, objectFit: "contain" }} />
                    </div>
                  ) : (
                    <div style={{ marginTop: 10, opacity: 0.75 }}>No QR found</div>
                  )}
                  <div style={{ marginTop: 10, fontSize: 12.5, opacity: 0.7 }}>Ticket ID: {t.ticketId}</div>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}