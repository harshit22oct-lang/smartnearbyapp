import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import { Html5Qrcode } from "html5-qrcode";
import { useNavigate } from "react-router-dom";

const API = process.env.REACT_APP_API_URL || "";

export default function AdminScanTicket() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [last, setLast] = useState(null);
  const [manual, setManual] = useState("");

  const scannerRef = useRef(null);
  const qrRef = useRef(null);

  const stopScanner = async () => {
    try {
      if (qrRef.current) {
        await qrRef.current.stop();
        await qrRef.current.clear();
        qrRef.current = null;
      }
    } catch {}
  };

  const validateCode = async (code) => {
    const c = String(code || "").trim();
    if (!c || busy) return;

    if (!API) {
      setMsg("API missing. Set REACT_APP_API_URL in Vercel.");
      return;
    }
    if (!token) {
      navigate("/login");
      return;
    }

    setBusy(true);
    setMsg("Verifying...");
    setLast(null);

    try {
      // ✅ Correct endpoint for your backend (secure QR token)
      const res = await axios.post(
        `${API}/api/tickets/validate`,
        { code: c },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setLast({ ok: true, data: res.data });
      setMsg(res.data?.message || "Verified ✅");
    } catch (e) {
      const m = e?.response?.data?.message || "Verification failed";
      setLast({ ok: false, error: m, data: e?.response?.data || null });
      setMsg(m);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    const start = async () => {
      setMsg("");
      if (!scannerRef.current) return;

      await stopScanner();

      try {
        const qr = new Html5Qrcode(scannerRef.current.id);
        qrRef.current = qr;

        await qr.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 260, height: 260 } },
          (decodedText) => {
            stopScanner();
            validateCode(decodedText);
          },
          () => {}
        );
      } catch {
        setMsg("Camera permission blocked or no camera found. Use manual paste.");
      }
    };

    start();
    return () => {
      stopScanner();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ticket = last?.data?.ticket;
  const ev = ticket?.event || {};
  const u = ticket?.user || {};

  return (
    <div style={{ padding: 18, maxWidth: 980, margin: "0 auto" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <h2 style={{ margin: 0 }}>Admin • Scan Ticket</h2>
        <button onClick={() => navigate("/dashboard")} style={btn()}>
          Back
        </button>
      </div>

      <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div style={card()}>
          <div style={{ fontWeight: 800, marginBottom: 10 }}>Camera Scanner</div>
          <div
            id="mn-qr-reader"
            ref={scannerRef}
            style={{
              width: "100%",
              minHeight: 320,
              borderRadius: 14,
              overflow: "hidden",
              border: "1px solid rgba(255,255,255,0.10)",
              background: "rgba(255,255,255,0.04)",
            }}
          />
          <div style={{ marginTop: 10, opacity: 0.85, fontSize: 13 }}>
            Tip: Must be on <b>HTTPS</b> for camera on mobile.
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
            <button
              onClick={() => {
                setMsg("");
                setLast(null);
                stopScanner();
                setTimeout(() => window.location.reload(), 100);
              }}
              style={btn()}
            >
              Restart Scanner
            </button>
          </div>
        </div>

        <div style={card()}>
          <div style={{ fontWeight: 800, marginBottom: 10 }}>Manual Verify</div>
          <textarea
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            placeholder="Paste QR token here (from Copy QR Token)..."
            style={{
              width: "100%",
              minHeight: 170,
              borderRadius: 12,
              padding: 12,
              border: "1px solid rgba(255,255,255,0.14)",
              background: "rgba(0,0,0,0.25)",
              color: "#fff",
              outline: "none",
            }}
          />
          <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
            <button disabled={busy} onClick={() => validateCode(manual)} style={btnPrimary(busy)}>
              {busy ? "Checking..." : "Verify"}
            </button>
            <button
              onClick={() => {
                setManual("");
                setMsg("");
                setLast(null);
              }}
              style={btn()}
            >
              Clear
            </button>
          </div>

          {msg ? (
            <div style={{ marginTop: 12, padding: 12, borderRadius: 12, ...statusBox(last?.ok) }}>{msg}</div>
          ) : null}

          {ticket ? (
            <div style={{ marginTop: 12, borderTop: "1px solid rgba(255,255,255,0.10)", paddingTop: 12 }}>
              <div style={{ fontWeight: 900, fontSize: 14, marginBottom: 6 }}>Ticket Details</div>

              <div style={row()}>
                <span style={k()}>Ticket ID</span>
                <span style={v()}>{ticket.ticketId || "-"}</span>
              </div>

              <div style={row()}>
                <span style={k()}>Status</span>
                <span style={v()}>{ticket.status || "-"}</span>
              </div>

              <div style={row()}>
                <span style={k()}>Event</span>
                <span style={v()}>{ev.title || "-"}</span>
              </div>

              <div style={row()}>
                <span style={k()}>City</span>
                <span style={v()}>{ev.city || "-"}</span>
              </div>

              <div style={row()}>
                <span style={k()}>User</span>
                <span style={v()}>
                  {u.name || "-"} {u.email ? `(${u.email})` : ""}
                </span>
              </div>

              <div style={row()}>
                <span style={k()}>Validated At</span>
                <span style={v()}>
                  {(ticket.validatedAt || ticket.scannedAt)
                    ? new Date(ticket.validatedAt || ticket.scannedAt).toLocaleString()
                    : "-"}
                </span>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

const card = () => ({
  borderRadius: 16,
  padding: 14,
  background: "#111",
  border: "1px solid rgba(255,255,255,0.10)",
  color: "#fff",
});

const btn = () => ({
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.16)",
  background: "rgba(255,255,255,0.06)",
  color: "#fff",
  cursor: "pointer",
  fontWeight: 800,
});

const btnPrimary = (busy) => ({
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.16)",
  background: busy ? "rgba(255,255,255,0.08)" : "rgba(80,160,255,0.35)",
  color: "#fff",
  cursor: busy ? "not-allowed" : "pointer",
  fontWeight: 900,
});

const statusBox = (ok) => ({
  border: "1px solid rgba(255,255,255,0.14)",
  background: ok ? "rgba(0,200,120,0.18)" : "rgba(255,80,80,0.16)",
});

const row = () => ({
  display: "flex",
  justifyContent: "space-between",
  gap: 10,
  padding: "6px 0",
  borderBottom: "1px solid rgba(255,255,255,0.06)",
});

const k = () => ({ opacity: 0.75, fontWeight: 800 });
const v = () => ({ fontWeight: 900 });