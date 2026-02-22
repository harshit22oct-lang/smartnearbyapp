import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";

const API = process.env.REACT_APP_API_URL || "";

export default function EventDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const authHeader = useMemo(() => ({ headers: { Authorization: `Bearer ${token}` } }), [token]);

  const [ev, setEv] = useState(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(true);

  const resolveUpload = (u) => {
    const s = String(u || "").trim();
    if (!s) return "";
    if (s.startsWith("/uploads/")) return `${API}${s}`;
    return s;
  };

  useEffect(() => {
    const load = async () => {
      try {
        setBusy(true);
        const res = await axios.get(`${API}/api/events/${id}`);
        setEv(res.data || null);
      } catch (err) {
        setMsg(err?.response?.data?.message || "Failed to load event");
      } finally {
        setBusy(false);
      }
    };

    if (!API) {
      setMsg("API URL missing. Set REACT_APP_API_URL");
      setBusy(false);
      return;
    }

    load();
  }, [id]);

  const images = useMemo(() => {
    const list = Array.isArray(ev?.images) ? ev.images.filter(Boolean) : [];
    if (ev?.bannerImage) list.unshift(ev.bannerImage);
    return Array.from(new Set(list.map(resolveUpload).filter(Boolean)));
  }, [ev]);

  const bookNow = async () => {
    try {
      await axios.post(`${API}/api/tickets/book`, { eventId: ev._id }, authHeader);
      alert("Booked. Check Orders.");
      navigate("/orders");
    } catch (err) {
      const code = err?.response?.data?.code;
      if (code === "PROFILE_REQUIRED") {
        alert("Upload profile picture first.");
        navigate("/dashboard");
        return;
      }
      alert(err?.response?.data?.message || "Booking failed");
    }
  };

  if (busy) return <div style={{ padding: 20 }}>Loading...</div>;
  if (!ev) return <div style={{ padding: 20 }}>{msg || "Event not found"}</div>;

  const canBook = !!ev.isCurated && !!ev.hasTickets;
  const fee = Number(ev.price || 0);

  return (
    <div style={{ padding: 20, background: "#f6f7fb", minHeight: "100vh" }}>
      <div style={{ maxWidth: 980, margin: "0 auto", background: "#fff", borderRadius: 16, overflow: "hidden" }}>
        <div
          style={{
            height: 280,
            background: images[0]
              ? `url(${images[0]}) center/cover no-repeat`
              : "linear-gradient(135deg,#111,#5b6bff)",
          }}
        />

        <div style={{ padding: 16 }}>
          <button onClick={() => navigate(-1)} style={{ marginBottom: 10 }}>
            Back
          </button>

          <h1 style={{ margin: "0 0 8px" }}>{ev.title}</h1>

          <div style={{ opacity: 0.8, marginBottom: 12 }}>
            {ev.category || "Event"} | {ev.city}
            {ev.venue ? ` | ${ev.venue}` : ""}
          </div>

          <div style={{ marginBottom: 8 }}>
            Start: {ev.startAt ? new Date(ev.startAt).toLocaleString() : "-"}
          </div>

          {ev.endAt ? (
            <div style={{ marginBottom: 8 }}>End: {new Date(ev.endAt).toLocaleString()}</div>
          ) : null}

          <div style={{ marginBottom: 8 }}>Entry Fee: {fee <= 0 ? "FREE" : `INR ${fee}`}</div>

          {ev.address ? <div style={{ marginBottom: 8 }}>Address: {ev.address}</div> : null}

          {ev.description ? <p style={{ whiteSpace: "pre-line" }}>{ev.description}</p> : null}

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
            {ev.website ? (
              <a href={ev.website} target="_blank" rel="noreferrer">
                Website
              </a>
            ) : null}
            {ev.instagram ? (
              <a href={ev.instagram} target="_blank" rel="noreferrer">
                Instagram
              </a>
            ) : null}
          </div>

          {images.length > 1 ? (
            <div
              style={{
                marginTop: 14,
                display: "grid",
                gridTemplateColumns: "repeat(3,1fr)",
                gap: 8,
              }}
            >
              {images.slice(1).map((u, i) => (
                <img
                  key={`${u}-${i}`}
                  src={u}
                  alt="event"
                  style={{ width: "100%", height: 120, objectFit: "cover", borderRadius: 10 }}
                />
              ))}
            </div>
          ) : null}

          <div style={{ marginTop: 14 }}>
            {canBook ? (
              <button
                onClick={bookNow}
                style={{ padding: "10px 14px", background: "#111", color: "#fff", borderRadius: 10 }}
              >
                {fee <= 0 ? "Get Pass" : "Book Ticket"}
              </button>
            ) : (
              <span style={{ opacity: 0.7 }}>Info only</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}