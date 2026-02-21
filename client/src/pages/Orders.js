import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

export default function Orders() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  // ✅ keep API inside component (same as Dashboard pattern)
  const apiBase = useMemo(() => process.env.REACT_APP_API_URL || "", []);

  const auth = useMemo(() => {
    if (!token) return null;
    return { headers: { Authorization: `Bearer ${token}` } };
  }, [token]);

  const resolveUploadUrl = useMemo(() => {
    return (u) => {
      const s = String(u || "").trim();
      if (!s) return "";
      if (s.startsWith("/uploads/")) return `${apiBase}${s}`;
      return s;
    };
  }, [apiBase]);

  const [me, setMe] = useState(null);

  const [list, setList] = useState([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const load = async () => {
    if (!apiBase) {
      setMsg("API missing. Set REACT_APP_API_URL in Vercel.");
      return;
    }
    if (!auth) {
      navigate("/login");
      return;
    }

    setBusy(true);
    setMsg("");
    try {
      // profile (to know admin)
      try {
        const prof = await axios.get(`${apiBase}/api/auth/profile`, auth);
        setMe(prof.data || null);
      } catch {
        setMe(null);
      }

      const res = await axios.get(`${apiBase}/api/tickets/mine`, auth);
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

  const copyText = async (text) => {
    const s = String(text || "").trim();
    if (!s) return;
    try {
      await navigator.clipboard.writeText(s);
      setMsg("✅ Copied ticket code");
      setTimeout(() => setMsg(""), 1200);
    } catch {
      setMsg("Copy failed. Please copy manually.");
      setTimeout(() => setMsg(""), 1500);
    }
  };

  const statusPill = (status) => {
    const st = String(status || "unused").toLowerCase();
    const ok = st === "validated";
    const bg = ok ? "rgba(45,160,90,0.10)" : "rgba(255,180,0,0.14)";
    const br = ok ? "rgba(45,160,90,0.25)" : "rgba(255,180,0,0.30)";
    const tx = ok ? "Validated ✅" : "Unused";
    return (
      <span
        style={{
          display: "inline-block",
          padding: "4px 10px",
          borderRadius: 999,
          border: `1px solid ${br}`,
          background: bg,
          fontSize: 12,
          fontWeight: 1000,
        }}
      >
        {tx}
      </span>
    );
  };

  return (
    <div style={{ padding: 20, background: "#f6f7fb", minHeight: "100vh" }}>
      <div style={{ maxWidth: 980, margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <div>
            <h2 style={{ margin: 0 }}>🎟️ My Orders</h2>
            <div style={{ marginTop: 6, opacity: 0.75, fontSize: 13 }}>
              Your booked tickets / passes
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {me?.isAdmin ? (
              <button
                onClick={() => navigate("/admin/scan-ticket")}
                style={{
                  padding: "8px 12px",
                  borderRadius: 12,
                  border: "1px solid #ddd",
                  background: "#111",
                  color: "#fff",
                  cursor: "pointer",
                  fontWeight: 900,
                }}
              >
                🎫 Scan Tickets
              </button>
            ) : null}

            <button
              onClick={() => navigate("/dashboard")}
              style={{
                padding: "8px 12px",
                borderRadius: 12,
                border: "1px solid #ddd",
                background: "#fff",
                cursor: "pointer",
                fontWeight: 900,
              }}
            >
              ← Dashboard
            </button>

            <button
              onClick={load}
              disabled={busy}
              style={{
                padding: "8px 12px",
                borderRadius: 12,
                border: "1px solid #ddd",
                background: "#111",
                color: "#fff",
                cursor: busy ? "not-allowed" : "pointer",
                fontWeight: 900,
                opacity: busy ? 0.7 : 1,
              }}
            >
              {busy ? "Loading..." : "Refresh"}
            </button>
          </div>
        </div>

        {msg ? (
          <div
            style={{
              marginTop: 12,
              padding: 10,
              borderRadius: 12,
              background: "#fff7e6",
              border: "1px solid #ffe0b2",
              fontWeight: 900,
            }}
          >
            {msg}
          </div>
        ) : null}

        {busy ? <div style={{ marginTop: 12, opacity: 0.75 }}>Loading...</div> : null}

        {!busy && list.length === 0 ? (
          <div style={{ marginTop: 14, opacity: 0.75 }}>No orders yet.</div>
        ) : null}

        {!busy && list.length ? (
          <div
            style={{
              marginTop: 14,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 12,
            }}
          >
            {list.map((t) => {
              const ev = t.event || {};
              const isFree = Number(t.amount || 0) <= 0;
              const banner = resolveUploadUrl(ev.bannerImage);

              // ✅ QR image (data URL)
              const qrImg = String(t.qrBase64 || "").trim();
              const hasQr = qrImg.startsWith("data:image/");

              // ✅ IMPORTANT: backend validates by ticketId (UUID)
              const ticketCode = String(t.ticketId || "").trim();

              return (
                <div
                  key={t._id}
                  style={{
                    background: "#fff",
                    borderRadius: 16,
                    border: "1px solid #eee",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: 120,
                      background: banner
                        ? `url(${banner}) center/cover no-repeat`
                        : "linear-gradient(135deg,#111,#444)",
                    }}
                  />

                  <div style={{ padding: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                      <div style={{ fontWeight: 900, minWidth: 0 }}>{ev.title || "Event"}</div>
                      {statusPill(t.status)}
                    </div>

                    <div style={{ marginTop: 6, fontSize: 12.5, opacity: 0.8 }}>
                      🗓️ {ev.startAt ? new Date(ev.startAt).toLocaleString() : "TBA"}
                    </div>

                    <div style={{ marginTop: 6, fontSize: 12.5, opacity: 0.8 }}>
                      💳 {isFree ? "FREE" : `₹${Number(t.amount || 0)}`} • Ticket ID:{" "}
                      <b>{ticketCode ? ticketCode.slice(0, 8) : "-"}</b>
                    </div>

                    {/* ✅ tiny QR preview */}
                    {hasQr ? (
                      <div style={{ marginTop: 10, display: "flex", gap: 10, alignItems: "center" }}>
                        <img
                          src={qrImg}
                          alt="QR"
                          style={{
                            width: 82,
                            height: 82,
                            borderRadius: 12,
                            border: "1px solid #eee",
                            background: "#fff",
                          }}
                        />

                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 12.5, opacity: 0.75 }}>
                            Show this QR at entry. If camera scan fails, use “Copy Ticket Code”.
                          </div>

                          <div style={{ display: "flex", gap: 10, marginTop: 8, flexWrap: "wrap" }}>
                            <button
                              onClick={() => navigate(`/ticket/${t._id}`)}
                              style={{
                                padding: "9px 12px",
                                borderRadius: 12,
                                border: "1px solid #ddd",
                                background: "#111",
                                color: "#fff",
                                cursor: "pointer",
                                fontWeight: 900,
                              }}
                            >
                              View Ticket
                            </button>

                            <button
                              onClick={() => copyText(ticketCode)}
                              disabled={!ticketCode}
                              style={{
                                padding: "9px 12px",
                                borderRadius: 12,
                                border: "1px solid #ddd",
                                background: "#fff",
                                cursor: !ticketCode ? "not-allowed" : "pointer",
                                fontWeight: 900,
                                opacity: !ticketCode ? 0.6 : 1,
                              }}
                            >
                              Copy Ticket Code
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => navigate(`/ticket/${t._id}`)}
                        style={{
                          marginTop: 10,
                          width: "100%",
                          padding: "10px 12px",
                          borderRadius: 12,
                          border: "1px solid #ddd",
                          background: "#111",
                          color: "#fff",
                          cursor: "pointer",
                          fontWeight: 900,
                        }}
                      >
                        View Ticket
                      </button>
                    )}
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