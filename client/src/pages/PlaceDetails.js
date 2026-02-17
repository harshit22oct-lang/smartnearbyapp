import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";

const API = process.env.REACT_APP_API_URL;

const clamp = (lines) => ({
  display: "-webkit-box",
  WebkitLineClamp: lines,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
});

const pillStyle = (bg, color, border) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "7px 10px",
  borderRadius: 999,
  fontSize: 12.5,
  fontWeight: 800,
  background: bg,
  color,
  border,
  whiteSpace: "nowrap",
});

const cardStyle = {
  background: "#fff",
  border: "1px solid #eee",
  borderRadius: 18,
  boxShadow: "0 10px 28px rgba(0,0,0,0.06)",
};

const PlaceDetails = () => {
  const { source, id } = useParams(); // "mongo" | "google"
  const navigate = useNavigate();

  const token = localStorage.getItem("token");

  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [data, setData] = useState(null);

  // ✅ viewer modal (USED)
  const [viewerOpen, setViewerOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);

  // ✅ hours accordion (USED)
  const [hoursOpen, setHoursOpen] = useState(false);

  // ✅ guard if env missing
  useEffect(() => {
    if (!API) {
      setMsg("API URL missing. Set REACT_APP_API_URL in Vercel and redeploy.");
      setLoading(false);
    }
  }, []);

  // ✅ redirect if token missing
  useEffect(() => {
    if (!token) navigate("/login", { replace: true });
  }, [token, navigate]);

  const authHeader = useMemo(
    () => ({ headers: { Authorization: `Bearer ${token}` } }),
    [token]
  );

  const googleImg = (ref) => {
    if (!ref || !API) return "";
    return `${API}/api/google/photo?photoRef=${encodeURIComponent(ref)}`;
  };

  const absUpload = (u) => {
    if (!u || !API) return "";
    const s = String(u);
    if (s.startsWith("/uploads/")) return `${API}${s}`;
    return s;
  };

  const fetchDetails = async () => {
    if (!API) return;

    setLoading(true);
    setMsg("");
    setData(null);

    try {
      if (source === "google") {
        const res = await axios.get(
          `${API}/api/google/details?placeId=${encodeURIComponent(id)}`,
          authHeader
        );
        setData({ ...res.data, source: "google" });
      } else {
        const res = await axios.get(`${API}/api/search/${id}`, authHeader);
        setData({ ...res.data, source: "mongo" });
      }
    } catch (err) {
      const status = err?.response?.status;
      const serverMsg = err?.response?.data?.message;
      const details = err?.response?.data?.details;

      if (status === 401 || status === 403) {
        localStorage.removeItem("token");
        setMsg("Session expired. Please login again.");
        navigate("/login", { replace: true });
        return;
      }

      setMsg(
        `Failed to load details | Status: ${status || "?"} | ${
          serverMsg || details || "No message"
        }`
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
    // eslint-disable-next-line
  }, [source, id]);

  // ✅ Photos list
  const photos = useMemo(() => {
    if (!data) return [];

    if (data.source === "google") {
      const list = Array.isArray(data.photos) ? data.photos : [];
      return list
        .map((x) => (x?.photoRef ? googleImg(x.photoRef) : ""))
        .filter(Boolean);
    }

    const imgs = Array.isArray(data.images) ? data.images : [];
    const merged = imgs.map(absUpload).filter(Boolean);

    if (merged.length === 0) {
      if (data.photoRef) merged.push(googleImg(data.photoRef));
      else if (data.imageUrl) merged.push(absUpload(data.imageUrl));
    }
    return merged;
  }, [data]);

  const heroImage = useMemo(() => (photos.length ? photos[0] : ""), [photos]);

  // ✅ Viewer controls (USED)
  const openViewer = (idx) => {
    if (!photos.length) return;
    setActiveIdx(idx);
    setViewerOpen(true);
  };

  const nextPhoto = () => {
    if (!photos.length) return;
    setActiveIdx((p) => (p + 1) % photos.length);
  };

  const prevPhoto = () => {
    if (!photos.length) return;
    setActiveIdx((p) => (p - 1 + photos.length) % photos.length);
  };

  // ✅ Action button (USED)
  const ActionBtn = ({ label, href, onClick, variant = "dark" }) => {
    const base = {
      padding: "11px 14px",
      borderRadius: 14,
      border: "1px solid",
      fontWeight: 900,
      fontSize: 13,
      cursor: "pointer",
      textDecoration: "none",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      minWidth: 130,
    };

    const styles =
      variant === "dark"
        ? { background: "#111", color: "#fff", borderColor: "#111" }
        : { background: "#fff", color: "#111", borderColor: "#e7e7e7" };

    if (href) {
      return (
        <a href={href} target="_blank" rel="noreferrer" style={{ ...base, ...styles }}>
          {label}
        </a>
      );
    }

    return (
      <button onClick={onClick} style={{ ...base, ...styles }}>
        {label}
      </button>
    );
  };

  return (
    <div style={{ background: "#f6f7fb", minHeight: "100vh" }}>
      {/* HERO */}
      <div style={{ position: "relative", overflow: "hidden" }}>
        <div
          style={{
            height: "clamp(260px, 45vh, 520px)",
            position: "relative",
            overflow: "hidden",
            background: heroImage
              ? `url("${heroImage}") center/cover no-repeat`
              : "linear-gradient(135deg,#1b1b1b,#3a3a3a)",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.18) 40%, rgba(0,0,0,0.72) 100%)",
          }}
        />

        {/* TOP BAR */}
        <div
          style={{
            position: "absolute",
            top: 18,
            left: 18,
            right: 18,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
          }}
        >
          <button
            onClick={() => navigate(-1)}
            style={{
              padding: "10px 12px",
              borderRadius: 14,
              border: "1px solid rgba(255,255,255,0.22)",
              background: "rgba(0,0,0,0.35)",
              color: "#fff",
              cursor: "pointer",
              fontWeight: 900,
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
            }}
          >
            ← Back
          </button>

          <span
            style={{
              padding: "8px 12px",
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.22)",
              background: "rgba(0,0,0,0.35)",
              color: "#fff",
              fontWeight: 900,
              fontSize: 12.5,
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
            }}
          >
            {source === "google" ? "Google Place" : "MoodNest Curated"}
          </span>
        </div>

        {/* TITLE AREA */}
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            padding: "18px 18px 20px 18px",
          }}
        >
          <div style={{ maxWidth: 1100, margin: "0 auto" }}>
            {loading ? (
              <div style={{ color: "#fff", opacity: 0.9, fontWeight: 800 }}>Loading...</div>
            ) : msg ? (
              <div
                style={{
                  color: "#fff",
                  background: "rgba(255,80,80,0.20)",
                  border: "1px solid rgba(255,255,255,0.22)",
                  borderRadius: 16,
                  padding: 14,
                  fontWeight: 900,
                }}
              >
                {msg}
              </div>
            ) : data ? (
              <>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
                  <h1
                    style={{
                      margin: 0,
                      color: "#fff",
                      fontSize: 28,
                      lineHeight: "34px",
                      fontWeight: 1000,
                      ...clamp(2),
                    }}
                    title={data.name}
                  >
                    {data.name}
                  </h1>

                  {typeof data.openNow === "boolean" ? (
                    <span
                      style={
                        data.openNow
                          ? pillStyle("rgba(20,190,90,0.20)", "#d8ffe6", "1px solid rgba(255,255,255,0.22)")
                          : pillStyle("rgba(255,80,80,0.20)", "#ffe2e2", "1px solid rgba(255,255,255,0.22)")
                      }
                    >
                      {data.openNow ? "🟢 Open now" : "🔴 Closed"}
                    </span>
                  ) : null}

                  {data.rating ? (
                    <span style={pillStyle("rgba(0,0,0,0.40)", "#fff", "1px solid rgba(255,255,255,0.22)")}>
                      ⭐ {data.rating} {data.totalRatings ? `(${data.totalRatings})` : ""}
                    </span>
                  ) : null}

                  {data?.vibe ? (
                    <span style={pillStyle("rgba(0,0,0,0.40)", "#fff", "1px solid rgba(255,255,255,0.22)")}>
                      {(data.emoji || "✨") + " " + data.vibe}
                    </span>
                  ) : null}
                </div>

                <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 10, color: "#fff" }}>
                  {data.address || data.location ? (
                    <div style={{ opacity: 0.92, fontWeight: 700 }}>📍 {data.address || data.location}</div>
                  ) : null}

                  {photos.length ? (
                    <button
                      onClick={() => openViewer(0)}
                      style={{
                        marginLeft: "auto",
                        padding: "10px 12px",
                        borderRadius: 14,
                        border: "1px solid rgba(255,255,255,0.22)",
                        background: "rgba(0,0,0,0.35)",
                        color: "#fff",
                        cursor: "pointer",
                        fontWeight: 900,
                        backdropFilter: "blur(8px)",
                        WebkitBackdropFilter: "blur(8px)",
                      }}
                    >
                      📸 View photos ({photos.length})
                    </button>
                  ) : null}
                </div>
              </>
            ) : null}
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <div style={{ padding: 18 }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          {!loading && data ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1.15fr 0.85fr",
                gap: 16,
                alignItems: "start",
              }}
            >
              {/* LEFT */}
              <div style={{ display: "grid", gap: 14 }}>
                <div style={{ ...cardStyle, padding: 14 }}>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <ActionBtn
                      label="🗺️ Maps"
                      href={data.googleMapsUrl || data.mapsUrl || ""}
                      variant="dark"
                      onClick={() => alert("Maps not available")}
                    />
                    <ActionBtn
                      label="🌐 Website"
                      href={data.website || ""}
                      variant="light"
                      onClick={() => alert("Website not available")}
                    />
                    <ActionBtn
                      label="📞 Call"
                      href={data.phone ? `tel:${data.phone}` : ""}
                      variant="light"
                      onClick={() => alert("Phone not available")}
                    />
                  </div>

                  {(data.why || data.highlight) ? (
                    <div
                      style={{
                        marginTop: 12,
                        padding: 12,
                        borderRadius: 14,
                        background: "#fafafa",
                        border: "1px solid #eee",
                        whiteSpace: "pre-line",
                      }}
                    >
                      {data.why ? <div style={{ marginBottom: data.highlight ? 8 : 0 }}>💡 {data.why}</div> : null}
                      {data.highlight ? <div>🔥 {data.highlight}</div> : null}
                    </div>
                  ) : null}
                </div>

                {/* PHOTOS GRID */}
                <div style={{ ...cardStyle, padding: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                    <h3 style={{ margin: 0 }}>Photos</h3>
                    {photos.length ? (
                      <button
                        onClick={() => openViewer(0)}
                        style={{
                          padding: "10px 12px",
                          borderRadius: 14,
                          border: "1px solid #e7e7e7",
                          background: "#fff",
                          cursor: "pointer",
                          fontWeight: 900,
                        }}
                      >
                        View all ({photos.length})
                      </button>
                    ) : null}
                  </div>

                  {photos.length ? (
                    <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                      {photos.slice(0, 9).map((src, idx) => (
                        <div
                          key={`${src}-${idx}`}
                          onClick={() => openViewer(idx)}
                          style={{
                            height: 140,
                            borderRadius: 16,
                            overflow: "hidden",
                            border: "1px solid #eee",
                            cursor: "pointer",
                            background: "#f2f2f2",
                            position: "relative",
                          }}
                        >
                          <img
                            src={src}
                            alt="place"
                            loading="lazy"
                            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                          />
                          {idx === 8 && photos.length > 9 ? (
                            <div
                              style={{
                                position: "absolute",
                                inset: 0,
                                background: "rgba(0,0,0,0.45)",
                                display: "grid",
                                placeItems: "center",
                                color: "#fff",
                                fontWeight: 1000,
                                fontSize: 18,
                              }}
                            >
                              +{photos.length - 9} more
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ marginTop: 10, opacity: 0.7 }}>No photos available.</p>
                  )}
                </div>

                {/* HOURS */}
                {Array.isArray(data.weekdayText) && data.weekdayText.length ? (
                  <div style={{ ...cardStyle, padding: 14 }}>
                    <button
                      onClick={() => setHoursOpen((p) => !p)}
                      style={{
                        width: "100%",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "12px 12px",
                        borderRadius: 14,
                        border: "1px solid #eee",
                        background: "#fff",
                        cursor: "pointer",
                        fontWeight: 1000,
                      }}
                    >
                      <span>Opening Hours</span>
                      <span style={{ opacity: 0.7 }}>{hoursOpen ? "▲" : "▼"}</span>
                    </button>

                    {hoursOpen ? (
                      <div
                        style={{
                          marginTop: 10,
                          borderRadius: 14,
                          border: "1px solid #eee",
                          background: "#fafafa",
                          overflow: "hidden",
                        }}
                      >
                        {data.weekdayText.map((t, idx) => (
                          <div
                            key={`${t}-${idx}`}
                            style={{
                              padding: "10px 12px",
                              borderBottom: idx === data.weekdayText.length - 1 ? "none" : "1px solid #eee",
                              fontWeight: 700,
                              color: "#222",
                            }}
                          >
                            {t}
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>

              {/* RIGHT */}
              <div style={{ display: "grid", gap: 14 }}>
                <div style={{ ...cardStyle, padding: 14 }}>
                  <h3 style={{ margin: 0 }}>Details</h3>

                  <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                    {data.category ? (
                      <div style={{ padding: 12, borderRadius: 14, border: "1px solid #eee", background: "#fafafa" }}>
                        <div style={{ fontSize: 12, opacity: 0.7, fontWeight: 900 }}>Category</div>
                        <div style={{ marginTop: 4, fontWeight: 900 }}>{data.category}</div>
                      </div>
                    ) : null}

                    {data.address || data.location ? (
                      <div style={{ padding: 12, borderRadius: 14, border: "1px solid #eee", background: "#fafafa" }}>
                        <div style={{ fontSize: 12, opacity: 0.7, fontWeight: 900 }}>Address</div>
                        <div style={{ marginTop: 4, fontWeight: 800, ...clamp(3) }}>
                          {data.address || data.location}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* VIEWER MODAL */}
      {viewerOpen ? (
        <div
          onClick={() => setViewerOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.82)",
            display: "grid",
            placeItems: "center",
            padding: 16,
            zIndex: 9999,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(980px, 96vw)",
              borderRadius: 18,
              overflow: "hidden",
              border: "1px solid rgba(255,255,255,0.15)",
              background: "#0b0b0b",
            }}
          >
            <div
              style={{
                padding: 12,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                color: "#fff",
                borderBottom: "1px solid rgba(255,255,255,0.12)",
              }}
            >
              <div style={{ fontWeight: 1000, fontSize: 13 }}>
                Photo {activeIdx + 1} / {photos.length}
              </div>
              <button
                onClick={() => setViewerOpen(false)}
                style={{
                  padding: "8px 10px",
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.18)",
                  background: "transparent",
                  color: "#fff",
                  cursor: "pointer",
                  fontWeight: 1000,
                }}
              >
                ✕ Close
              </button>
            </div>

            <div style={{ position: "relative", background: "#000" }}>
              <img
                src={photos[activeIdx]}
                alt="viewer"
                style={{
                  width: "100%",
                  height: "min(72vh, 660px)",
                  objectFit: "contain",
                  display: "block",
                }}
              />

              <button onClick={prevPhoto} style={{ ...navBtnBase, left: 12 }}>
                ‹
              </button>
              <button onClick={nextPhoto} style={{ ...navBtnBase, right: 12 }}>
                ›
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* RESPONSIVE */}
      <style>
        {`
          @media (max-width: 980px) {
            ._pdGrid { grid-template-columns: 1fr !important; }
          }
        `}
      </style>
    </div>
  );
};

const navBtnBase = {
  position: "absolute",
  top: "50%",
  transform: "translateY(-50%)",
  padding: "10px 12px",
  borderRadius: 999,
  border: "1px solid rgba(255,255,255,0.18)",
  background: "rgba(0,0,0,0.35)",
  color: "#fff",
  cursor: "pointer",
  fontWeight: 1000,
};

export default PlaceDetails;
