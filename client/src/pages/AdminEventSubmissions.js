import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const API = process.env.REACT_APP_API_URL || "";

export default function AdminEventSubmissions() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const authHeader = useMemo(() => ({ headers: { Authorization: `Bearer ${token}` } }), [token]);

  const [list, setList] = useState([]);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const resolveUpload = (u) => (String(u || "").startsWith("/uploads/") ? `${API}${u}` : u);

  const load = useCallback(async () => {
    try {
      setBusy(true);
      setMsg("");
      const res = await axios.get(`${API}/api/event-submissions?status=pending`, authHeader);
      setList(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setMsg(err?.response?.data?.message || "Failed to load submissions");
    } finally {
      setBusy(false);
    }
  }, [authHeader]);

  useEffect(() => {
    load();
  }, [load]);

  const approve = async (id) => {
    try {
      await axios.post(`${API}/api/event-submissions/${id}/approve`, {}, authHeader);
      setList((prev) => prev.filter((x) => x._id !== id));
    } catch (err) {
      alert(err?.response?.data?.message || "Approve failed");
    }
  };

  const reject = async (id) => {
    try {
      await axios.post(`${API}/api/event-submissions/${id}/reject`, {}, authHeader);
      setList((prev) => prev.filter((x) => x._id !== id));
    } catch (err) {
      alert(err?.response?.data?.message || "Reject failed");
    }
  };

  return (
    <div style={{ padding: 20, background: "#f6f7fb", minHeight: "100vh" }}>
      <div style={{ maxWidth: 980, margin: "0 auto", background: "#fff", borderRadius: 16, padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
          <h2 style={{ margin: 0 }}>Pending Event Submissions</h2>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => navigate("/dashboard")}>Back</button>
            <button onClick={load}>{busy ? "Refreshing..." : "Refresh"}</button>
          </div>
        </div>

        {msg ? <div style={{ marginBottom: 10 }}>{msg}</div> : null}
        {!busy && list.length === 0 ? <div>No pending event submissions.</div> : null}

        <div style={{ display: "grid", gap: 12 }}>
          {list.map((s) => {
            const img = (s.bannerImage || (Array.isArray(s.images) && s.images[0]) || "").trim();
            return (
              <div key={s._id} style={{ border: "1px solid #eee", borderRadius: 12, padding: 12 }}>
                <div style={{ display: "flex", gap: 12 }}>
                  <div style={{ width: 120, height: 80, borderRadius: 10, background: img ? `url(${resolveUpload(img)}) center/cover no-repeat` : "#ddd" }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700 }}>{s.title}</div>
                    <div style={{ fontSize: 13, opacity: 0.8 }}>{s.city} • {s.category || "Event"} • {s.venue || "-"}</div>
                    <div style={{ fontSize: 13, opacity: 0.8 }}>{s.startAt ? new Date(s.startAt).toLocaleString() : "-"}</div>
                    <div style={{ marginTop: 6, fontSize: 13 }}>{s.description || ""}</div>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                  <button onClick={() => approve(s._id)} style={{ background: "#111", color: "#fff", padding: "8px 12px" }}>Approve</button>
                  <button onClick={() => reject(s._id)} style={{ padding: "8px 12px" }}>Reject</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
