import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const cardStyle = {
  borderRadius: 16,
  border: "1px solid rgba(0,0,0,0.10)",
  background: "rgba(255,255,255,0.88)",
  boxShadow: "0 10px 26px rgba(0,0,0,0.08)",
  padding: 12,
};

const badgeStyle = {
  display: "inline-block",
  padding: "4px 10px",
  borderRadius: 999,
  border: "1px solid rgba(0,0,0,0.12)",
  background: "rgba(255,255,255,0.85)",
  fontSize: 12,
  fontWeight: 900,
};

export default function AdminContentManager() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const apiBase = useMemo(() => process.env.REACT_APP_API_URL || "", []);
  const auth = useMemo(() => {
    if (!token) return null;
    return { headers: { Authorization: `Bearer ${token}` } };
  }, [token]);

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [actBusyKey, setActBusyKey] = useState("");

  const [type, setType] = useState("all");
  const [q, setQ] = useState("");
  const [city, setCity] = useState("");

  const [places, setPlaces] = useState([]);
  const [events, setEvents] = useState([]);

  const resolveUploadUrl = useCallback(
    (u) => {
      const s = String(u || "").trim();
      if (!s) return "";
      if (s.startsWith("/uploads/")) return `${apiBase}${s}`;
      return s;
    },
    [apiBase]
  );

  const normalizeCity = (v) => String(v || "").trim().toLowerCase();

  const ensureAdmin = useCallback(async () => {
    if (!apiBase) {
      setMsg("API URL missing. Set REACT_APP_API_URL in environment.");
      return false;
    }
    if (!auth) {
      navigate("/login");
      return false;
    }
    try {
      const prof = await axios.get(`${apiBase}/api/auth/profile`, auth);
      if (!prof?.data?.isAdmin) {
        navigate("/dashboard");
        return false;
      }
      return true;
    } catch {
      localStorage.removeItem("token");
      navigate("/login");
      return false;
    }
  }, [apiBase, auth, navigate]);

  const load = useCallback(async () => {
    const ok = await ensureAdmin();
    if (!ok) return;

    setBusy(true);
    setMsg("");
    try {
      const params = new URLSearchParams();
      params.set("type", type);
      if (q.trim()) params.set("q", q.trim());
      if (city.trim()) params.set("city", normalizeCity(city));
      params.set("limit", "300");

      const res = await axios.get(`${apiBase}/api/admin/content?${params.toString()}`, auth);
      setPlaces(Array.isArray(res?.data?.places) ? res.data.places : []);
      setEvents(Array.isArray(res?.data?.events) ? res.data.events : []);
    } catch (err) {
      setPlaces([]);
      setEvents([]);
      setMsg(err?.response?.data?.message || "Failed to load content");
    } finally {
      setBusy(false);
    }
  }, [apiBase, auth, city, ensureAdmin, q, type]);

  useEffect(() => {
    load();
  }, [load]);

  const items = useMemo(() => {
    const placeItems = (places || []).map((p) => ({
      kind: "place",
      _id: p._id,
      title: p.name || "Untitled Place",
      subtitle: p.address || p.category || "",
      city: p.city || "",
      category: p.category || "",
      image: resolveUploadUrl((Array.isArray(p.images) && p.images[0]) || p.imageUrl || ""),
      isPublished: p.isPublished !== false,
      createdAt: p.createdAt,
      source: p.source || "",
    }));

    const eventItems = (events || []).map((e) => ({
      kind: "event",
      _id: e._id,
      title: e.title || "Untitled Event",
      subtitle: e.venue || e.address || "",
      city: e.city || "",
      category: e.category || "",
      image: resolveUploadUrl(e.bannerImage || ""),
      isPublished: e.isPublished !== false,
      createdAt: e.createdAt,
      source: "event",
    }));

    return [...placeItems, ...eventItems].sort((a, b) => {
      const da = new Date(a.createdAt || 0).getTime();
      const db = new Date(b.createdAt || 0).getTime();
      return db - da;
    });
  }, [events, places, resolveUploadUrl]);

  const togglePublish = useCallback(
    async (item) => {
      if (!apiBase || !auth || !item?._id) return;

      const willUnpublish = item.isPublished;
      const action = willUnpublish ? "unpublish" : "republish";
      const label = willUnpublish ? "unpublish" : "republish";
      const ok = window.confirm(`Do you want to ${label} this ${item.kind}?`);
      if (!ok) return;

      const key = `${item.kind}:${item._id}`;
      setActBusyKey(key);
      setMsg("");

      try {
        await axios.post(`${apiBase}/api/admin/content/${item.kind}/${item._id}/${action}`, {}, auth);

        if (item.kind === "place") {
          setPlaces((prev) =>
            prev.map((x) =>
              String(x._id) === String(item._id)
                ? {
                    ...x,
                    isPublished: !willUnpublish,
                    unpublishedAt: willUnpublish ? new Date().toISOString() : null,
                  }
                : x
            )
          );
        } else {
          setEvents((prev) =>
            prev.map((x) =>
              String(x._id) === String(item._id)
                ? {
                    ...x,
                    isPublished: !willUnpublish,
                    unpublishedAt: willUnpublish ? new Date().toISOString() : null,
                  }
                : x
            )
          );
        }

        setMsg(willUnpublish ? "Content unpublished" : "Content republished");
      } catch (err) {
        setMsg(err?.response?.data?.message || "Action failed");
      } finally {
        setActBusyKey("");
      }
    },
    [apiBase, auth]
  );

  return (
    <div style={{ minHeight: "100vh", background: "#f6f7fb", padding: 18 }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <div>
            <h2 style={{ margin: 0 }}>Admin Content Manager</h2>
            <div style={{ marginTop: 6, opacity: 0.75, fontSize: 13 }}>
              Search, unpublish, and republish places/events.
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              onClick={() => navigate("/dashboard")}
              style={{
                padding: "9px 12px",
                borderRadius: 12,
                border: "1px solid rgba(0,0,0,0.14)",
                background: "rgba(255,255,255,0.9)",
                cursor: "pointer",
                fontWeight: 900,
              }}
            >
              Back to Dashboard
            </button>
            <button
              onClick={load}
              disabled={busy}
              style={{
                padding: "9px 12px",
                borderRadius: 12,
                border: "1px solid rgba(0,0,0,0.14)",
                background: "#111",
                color: "#fff",
                cursor: busy ? "not-allowed" : "pointer",
                fontWeight: 900,
                opacity: busy ? 0.75 : 1,
              }}
            >
              {busy ? "Loading..." : "Refresh"}
            </button>
          </div>
        </div>

        <div style={{ ...cardStyle, marginTop: 12 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 10,
              alignItems: "center",
            }}
          >
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") load();
              }}
              placeholder="Search by name/title/category/venue/address"
              style={{
                padding: "10px 12px",
                borderRadius: 12,
                border: "1px solid rgba(0,0,0,0.14)",
                background: "rgba(255,255,255,0.92)",
                minWidth: 0,
              }}
            />

            <input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") load();
              }}
              placeholder="City (optional)"
              style={{
                padding: "10px 12px",
                borderRadius: 12,
                border: "1px solid rgba(0,0,0,0.14)",
                background: "rgba(255,255,255,0.92)",
                minWidth: 0,
              }}
            />

            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              style={{
                padding: "10px 12px",
                borderRadius: 12,
                border: "1px solid rgba(0,0,0,0.14)",
                background: "rgba(255,255,255,0.92)",
              }}
            >
              <option value="all">All</option>
              <option value="places">Places</option>
              <option value="events">Events</option>
            </select>

            <button
              onClick={load}
              disabled={busy}
              style={{
                padding: "10px 14px",
                borderRadius: 12,
                border: "1px solid rgba(0,0,0,0.14)",
                background: "#111",
                color: "#fff",
                cursor: busy ? "not-allowed" : "pointer",
                fontWeight: 900,
                whiteSpace: "nowrap",
                opacity: busy ? 0.75 : 1,
              }}
            >
              Search
            </button>
          </div>

          <div style={{ marginTop: 10, fontSize: 13, opacity: 0.8 }}>
            Total: <b>{items.length}</b> | Places: <b>{places.length}</b> | Events: <b>{events.length}</b>
          </div>
        </div>

        {msg ? (
          <div
            style={{
              marginTop: 12,
              ...cardStyle,
              fontWeight: 900,
              background: "rgba(255,247,230,0.95)",
              border: "1px solid rgba(255,180,0,0.35)",
            }}
          >
            {msg}
          </div>
        ) : null}

        {busy ? <div style={{ marginTop: 12, opacity: 0.75 }}>Loading content...</div> : null}
        {!busy && items.length === 0 ? <div style={{ marginTop: 12, opacity: 0.75 }}>No content found.</div> : null}

        {!busy && items.length ? (
          <div
            style={{
              marginTop: 12,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
              gap: 12,
            }}
          >
            {items.map((item) => {
              const key = `${item.kind}:${item._id}`;
              const actionBusy = actBusyKey === key;
              const isPublished = item.isPublished;

              return (
                <div
                  key={key}
                  style={{
                    ...cardStyle,
                    position: "relative",
                    opacity: isPublished ? 1 : 0.72,
                    filter: isPublished ? "none" : "grayscale(0.25) blur(0.45px)",
                  }}
                >
                  {!isPublished ? (
                    <div
                      style={{
                        position: "absolute",
                        top: 10,
                        right: 10,
                        ...badgeStyle,
                        background: "rgba(255,77,77,0.12)",
                        border: "1px solid rgba(255,77,77,0.35)",
                      }}
                    >
                      Unpublished
                    </div>
                  ) : null}

                  <div style={{ height: 132, borderRadius: 12, overflow: "hidden", border: "1px solid rgba(0,0,0,0.10)" }}>
                    <div
                      style={{
                        width: "100%",
                        height: "100%",
                        background: item.image
                          ? `url(${item.image}) center/cover no-repeat`
                          : item.kind === "event"
                          ? "linear-gradient(135deg,#111,#4b6cff)"
                          : "linear-gradient(135deg,#111,#4a8f67)",
                      }}
                    />
                  </div>

                  <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <span style={badgeStyle}>{item.kind === "event" ? "Event" : "Place"}</span>
                    <span style={badgeStyle}>City: {item.city || "-"}</span>
                    {item.category ? <span style={badgeStyle}>{item.category}</span> : null}
                    {!isPublished ? (
                      <span style={{ ...badgeStyle, background: "rgba(255,255,255,0.95)" }}>Republish available</span>
                    ) : null}
                  </div>

                  <div style={{ marginTop: 10, fontWeight: 1000, fontSize: 15 }}>{item.title}</div>
                  <div style={{ marginTop: 6, opacity: 0.78, fontSize: 13 }}>{item.subtitle || "-"}</div>

                  <div style={{ marginTop: 8, opacity: 0.72, fontSize: 12.5 }}>
                    Source: <b>{item.source || "-"}</b>
                  </div>

                  <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <button
                      onClick={() => togglePublish(item)}
                      disabled={actionBusy}
                      style={{
                        flex: "1 1 150px",
                        padding: "10px 12px",
                        borderRadius: 12,
                        border: "1px solid rgba(0,0,0,0.14)",
                        background: isPublished ? "rgba(255,77,77,0.10)" : "#111",
                        color: isPublished ? "#b30000" : "#fff",
                        cursor: actionBusy ? "not-allowed" : "pointer",
                        fontWeight: 1000,
                        opacity: actionBusy ? 0.72 : 1,
                      }}
                    >
                      {actionBusy ? "Updating..." : isPublished ? "Unpublish" : "Republish"}
                    </button>

                    {item.isPublished ? (
                      <button
                        onClick={() => navigate(item.kind === "event" ? `/event/${item._id}` : `/place/mongo/${item._id}`)}
                        style={{
                          flex: "1 1 130px",
                          padding: "10px 12px",
                          borderRadius: 12,
                          border: "1px solid rgba(0,0,0,0.14)",
                          background: "rgba(255,255,255,0.9)",
                          cursor: "pointer",
                          fontWeight: 1000,
                        }}
                      >
                        Open
                      </button>
                    ) : null}
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
