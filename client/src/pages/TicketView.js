import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";

const API = process.env.REACT_APP_API_URL || "";

export default function TicketView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const auth = useMemo(() => {
    if (!token) return null;
    return { headers: { Authorization: `Bearer ${token}` } };
  }, [token]);

  const [t, setT] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [me, setMe] = useState(null);

  const loadMe = useCallback(async () => {
    if (!API || !auth) return;
    try {
      const res = await axios.get(`${API}/api/auth/profile`, auth);
      setMe(res.data || null);
    } catch {
      setMe(null);
    }
  }, [auth]);

  const load = useCallback(async () => {
    if (!API) {
      setMsg("API URL missing. Set REACT_APP_API_URL in Vercel env.");
      setT(null);
      return;
    }
    if (!auth) {
      navigate("/login");
      return;
    }
    if (!id) {
      setMsg("Ticket id missing");
      setT(null);
      return;
    }

    setBusy(true);
    setMsg("");
    try {
      const res = await axios.get(`${API}/api/tickets/${id}`, auth);
      setT(res.data || null);
    } catch (err) {
      setT(null);
      setMsg(err?.response?.data?.message || "Failed to load ticket");
    } finally {
      setBusy(false);
    }
  }, [auth, id, navigate]);

  useEffect(() => {
    load();
    loadMe();
  }, [load, loadMe]);

  const ev = t?.event || {};
  const isFree = Number(t?.amount || 0) <= 0;

  const qrSrc = useMemo(() => {
    const s = t?.qrBase64 || "";
    if (!s) return "";
    if (String(s).startsWith("data:")) return s;
    return `data:image/png;base64,${s}`;
  }, [t?.qrBase64]);

  const status = String(t?.status || "unused").toLowerCase();
  const validated = status === "validated";

  const pill = useMemo(() => {
    const bg = validated ? "rgba(45,160,90,0.12)" : "rgba(255,180,0,0.14)";
    const br = validated ? "rgba(45,160,90,0.28)" : "rgba(255,180,0,0.30)";
    const txt = validated ? "VALIDATED ✅" : "UNUSED ⏳";
    return { bg, br, txt };
  }, [validated]);

  const copyQrToken = useCallback(async () => {
    const code = String(t?.qrToken || "").trim();
    if (!code) {
      alert("QR token not available on this ticket. Rebook or refresh.");
      return;
    }
    try {
      await navigator.clipboard.writeText(code);
      alert("✅ QR token copied. Paste it in Admin Scan page (manual verify).");
    } catch {
      alert("Copy failed. Your browser may block clipboard. Try on HTTPS or modern browser.");
    }
  }, [t?.qrToken]);

  const isAdmin = !!me?.isAdmin;

  return (
    <div style={{ padding: 20, background: "#f6f7fb", minHeight: "100vh" }}>
      <div
        style={{
          maxWidth: 720,
          margin: "0 auto",
          background: "#fff",
          borderRadius: 18,
          border: "1px solid #eee",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: 150,
            background: ev.bannerImage
              ? `url(${ev.bannerImage}) center/cover no-repeat`
              : "linear-gradient(135deg,#111,#444)",
          }}
        />

        <div style={{ padding: 16 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 10,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <div>
              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <h2 style={{ margin: 0 }}>🎟️ Ticket</h2>
                <span
                  style={{
                    padding: "5px 10px",
                    borderRadius: 999,
                    border: `1px solid ${pill.br}`,
                    background: pill.bg,
                    fontWeight: 1000,
                    fontSize: 12,
                  }}
                >
                  {pill.txt}
                </span>
              </div>
              <div style={{ marginTop: 6, opacity: 0.75, fontSize: 13 }}>{ev.title || "Event"}</div>
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {isAdmin ? (
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
                  🎫 Open Scanner
                </button>
              ) : null}

              <button
                onClick={() => navigate("/orders")}
                style={{
                  padding: "8px 12px",
                  borderRadius: 12,
                  border: "1px solid #ddd",
                  background: "#fff",
                  cursor: "pointer",
                  fontWeight: 900,
                }}
              >
                ← Orders
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
                fontWeight: 800,
              }}
            >
              {msg}
            </div>
          ) : null}

          {busy ? <div style={{ marginTop: 12, opacity: 0.75 }}>Loading...</div> : null}

          {t ? (
            <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div style={{ padding: 12, borderRadius: 14, border: "1px solid #eee", background: "#fafafa" }}>
                <div style={{ fontWeight: 900 }}>Event</div>

                <div style={{ marginTop: 6, fontSize: 13, opacity: 0.85 }}>
                  🗓️ {ev.startAt ? new Date(ev.startAt).toLocaleString() : "TBA"}
                </div>

                <div style={{ marginTop: 6, fontSize: 13, opacity: 0.85 }}>
                  📍 {ev.venue || "Venue TBA"}
                </div>

                <div style={{ marginTop: 6, fontSize: 13, opacity: 0.85 }}>
                  💳 {isFree ? "FREE" : `₹${Number(t.amount || 0)}`}
                </div>

                <div style={{ marginTop: 6, fontSize: 13, opacity: 0.85 }}>
                  ✅ Status: <b>{t.status || "unused"}</b>
                </div>

                {validated && (t.scannedAt || t.validatedAt) ? (
                  <div style={{ marginTop: 6, fontSize: 13, opacity: 0.85 }}>
                    🕒 Verified:{" "}
                    {new Date(t.scannedAt || t.validatedAt).toLocaleString()}
                  </div>
                ) : null}
              </div>

              <div style={{ padding: 12, borderRadius: 14, border: "1px solid #eee", background: "#fff" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                  <div style={{ fontWeight: 900 }}>QR Code</div>

                  <button
                    onClick={copyQrToken}
                    style={{
                      padding: "8px 10px",
                      borderRadius: 12,
                      border: "1px solid #ddd",
                      background: "#fff",
                      cursor: "pointer",
                      fontWeight: 900,
                      fontSize: 12.5,
                    }}
                    title="Copy secure QR token for manual verification"
                  >
                    Copy Token
                  </button>
                </div>

                {qrSrc ? (
                  <div style={{ marginTop: 10, display: "grid", placeItems: "center" }}>
                    <img alt="qr" src={qrSrc} style={{ width: 220, height: 220, objectFit: "contain" }} />
                  </div>
                ) : (
                  <div style={{ marginTop: 10, opacity: 0.75 }}>No QR found</div>
                )}

                <div style={{ marginTop: 10, fontSize: 12.5, opacity: 0.7 }}>
                  Ticket ID (display): {t.ticketId || "-"}
                </div>

                <div style={{ marginTop: 6, fontSize: 12.5, opacity: 0.7 }}>
                  QR Token: {t.qrToken ? "Available ✅" : "Missing ⚠️"}
                </div>
              </div>
            </div>
          ) : null}

          <div style={{ marginTop: 14, fontSize: 12.5, opacity: 0.7 }}>
            Note: Admin verification works by scanning the <b>signed QR</b>. Ticket ID is only for display.
          </div>
        </div>
      </div>
    </div>
  );
}