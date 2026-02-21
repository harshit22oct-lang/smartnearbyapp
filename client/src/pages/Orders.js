import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const API = process.env.REACT_APP_API_URL;

export default function Orders() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const auth = useMemo(
    () => ({ headers: { Authorization: `Bearer ${token}` } }),
    [token]
  );

  const [list, setList] = useState([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const load = async () => {
    setBusy(true);
    setMsg("");
    try {
      const res = await axios.get(`${API}/api/tickets/mine`, auth);
      setList(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setList([]);
      setMsg(err?.response?.data?.message || "Failed to load orders");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (!token) navigate("/login");
    else load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ padding: 20, background: "#f6f7fb", minHeight: "100vh" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <div>
            <h2 style={{ margin: 0 }}>🎟️ My Orders</h2>
            <div style={{ marginTop: 6, opacity: 0.75, fontSize: 13 }}>
              Your booked tickets / passes
            </div>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={() => navigate("/dashboard")}
              style={{ padding: "8px 12px", borderRadius: 12, border: "1px solid #ddd", background: "#fff", cursor: "pointer", fontWeight: 900 }}
            >
              ← Dashboard
            </button>
            <button
              onClick={load}
              style={{ padding: "8px 12px", borderRadius: 12, border: "1px solid #ddd", background: "#111", color: "#fff", cursor: "pointer", fontWeight: 900 }}
            >
              Refresh
            </button>
          </div>
        </div>

        {msg ? (
          <div style={{ marginTop: 12, padding: 10, borderRadius: 12, background: "#fff7e6", border: "1px solid #ffe0b2" }}>
            {msg}
          </div>
        ) : null}

        {busy ? <div style={{ marginTop: 12, opacity: 0.75 }}>Loading...</div> : null}

        {!busy && list.length === 0 ? (
          <div style={{ marginTop: 14, opacity: 0.75 }}>No orders yet.</div>
        ) : null}

        {!busy && list.length ? (
          <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
            {list.map((t) => {
              const ev = t.event || {};
              const isFree = Number(t.amount || 0) <= 0;

              return (
                <div key={t._id} style={{ background: "#fff", borderRadius: 16, border: "1px solid #eee", overflow: "hidden" }}>
                  <div style={{ height: 120, background: ev.bannerImage ? `url(${ev.bannerImage}) center/cover no-repeat` : "linear-gradient(135deg,#111,#444)" }} />
                  <div style={{ padding: 12 }}>
                    <div style={{ fontWeight: 900 }}>{ev.title || "Event"}</div>
                    <div style={{ marginTop: 6, fontSize: 12.5, opacity: 0.8 }}>
                      🗓️ {ev.startAt ? new Date(ev.startAt).toLocaleString() : "TBA"}
                    </div>
                    <div style={{ marginTop: 6, fontSize: 12.5, opacity: 0.8 }}>
                      💳 {isFree ? "FREE" : `₹${Number(t.amount || 0)}`} • ✅ {t.status}
                    </div>

                    <button
                      onClick={() => navigate(`/ticket/${t._id}`)}
                      style={{ marginTop: 10, width: "100%", padding: "10px 12px", borderRadius: 12, border: "1px solid #ddd", background: "#111", color: "#fff", cursor: "pointer", fontWeight: 900 }}
                    >
                      View Ticket
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}