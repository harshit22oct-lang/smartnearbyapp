import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";

const API = process.env.REACT_APP_API_URL;

const FALLBACK_HERO =
  "https://images.unsplash.com/photo-1521017432531-fbd92d768814?auto=format&fit=crop&w=1400&q=70";

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
  const { source, id } = useParams();
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [data, setData] = useState(null);

  const [viewerOpen, setViewerOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const [hoursOpen, setHoursOpen] = useState(false);

  const [heroSrc, setHeroSrc] = useState(FALLBACK_HERO);

  useEffect(() => {
    if (!API) {
      setMsg("API URL missing. Set REACT_APP_API_URL in Vercel and redeploy.");
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!token) navigate("/login", { replace: true });
  }, [token, navigate]);

  const authHeader = useMemo(
    () => ({ headers: { Authorization: `Bearer ${token}` } }),
    [token]
  );

  // Your backend proxy should NOT require auth for images, otherwise they won't load
  const googleImg = (ref, maxWidth = 1400) => {
    if (!ref || !API) return "";
    return `${API}/api/google/photo?photoRef=${encodeURIComponent(
      ref
    )}&maxWidth=${encodeURIComponent(maxWidth)}`;
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

        // Support common wrappers: {result}, {place}, or direct
        const payload = res.data?.result || res.data?.place || res.data;
        setData({ ...payload, source: "google" });
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

  // ✅ Super-robust photo extraction (works even if backend returns photoUrl like dashboard)
  const photos = useMemo(() => {
    if (!data) return [];

    // GOOGLE
    if (data.source === "google") {
      // Sometimes backend directly returns a ready URL used on dashboard
      const directHero =
        data.photoUrl || data.heroImage || data.imageUrl || data.coverUrl;

      // Photos list may be in different places
      const list =
        (Array.isArray(data.photos) && data.photos) ||
        (Array.isArray(data?.result?.photos) && data.result.photos) ||
        (Array.isArray(data?.place?.photos) && data.place.photos) ||
        [];

      const normalized = list
        .map((p) => {
          if (!p) return "";

          // If it's already a string URL
          if (typeof p === "string") return p;

          // backend might give { url: "..." }
          if (p.url && typeof p.url === "string") return p.url;

          // common reference keys
          const ref =
            p.photoRef ||
            p.photo_reference ||
            p.reference ||
            p.name || // new Places API often uses name like "places/.../photos/..."
            p.photoReference;

          return ref ? googleImg(ref) : "";
        })
        .filter(Boolean);

      // Add directHero first if exists
      const all = [
        ...(directHero ? [directHero] : []),
        ...normalized,
      ].filter(Boolean);

      // Last-resort single ref keys
      if (all.length === 0) {
        if (data.photoRef) return [googleImg(data.photoRef)];
        if (data.photo_reference) return [googleImg(data.photo_reference)];
      }

      // Remove duplicates
      return Array.from(new Set(all));
    }

    // MONGO / CURATED
    const imgs = Array.isArray(data.images) ? data.images : [];
    const merged = imgs.map(absUpload).filter(Boolean);

    if (merged.length === 0) {
      if (data.photoRef) merged.push(googleImg(data.photoRef));
      else if (data.imageUrl) merged.push(absUpload(data.imageUrl));
    }

    return Array.from(new Set(merged));
  }, [data]);

  // ✅ Hero src now truly follows photos + has onError fallback
  useEffect(() => {
    if (photos.length) setHeroSrc(photos[0]);
    else setHeroSrc(FALLBACK_HERO);
  }, [photos]);

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
      flex: "1 1 auto",
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

  const mapsUrl = data?.googleMapsUrl || data?.mapsUrl || "";

  return (
    <div style={{ background: "#f6f7fb", minHeight: "100vh" }}>
      {/* HERO */}
      <div style={{ position: "relative", overflow: "hidden" }}>
        <div style={{ height: "clamp(220px, 40vh, 520px)", position: "relative" }}>
          {/* ✅ real img so we can onError fallback */}
          <img
            src={heroSrc}
            alt="hero"
            className="_pdHeroImg"
            onError={() => setHeroSrc(FALLBACK_HERO)}
          />
          <div className="_pdHeroOverlay" />
        </div>

        {/* TOP BAR */}
        <div className="_pdTopBar">
          <button className="_pdTopBtn" onClick={() => navigate(-1)}>
            ← Back
          </button>

          <span className="_pdSourceBadge">
            {source === "google" ? "Google Place" : "MoodNest Curated"}
          </span>
        </div>

        {/* TITLE AREA */}
        <div className="_pdHeroTextWrap">
          <div style={{ maxWidth: 1100, margin: "0 auto" }}>
            {loading ? (
              <div style={{ color: "#fff", opacity: 0.9, fontWeight: 800 }}>Loading...</div>
            ) : msg ? (
              <div className="_pdErrorBox">{msg}</div>
            ) : data ? (
              <>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
                  <h1 className="_pdTitle" title={data.name}>
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

                <div className="_pdMetaRow">
                  {data.address || data.location ? (
                    <div className="_pdAddress">📍 {data.address || data.location}</div>
                  ) : null}

                  {photos.length ? (
                    <button className="_pdPhotosBtn" onClick={() => openViewer(0)}>
                      📸 Photos ({photos.length})
                    </button>
                  ) : null}
                </div>
              </>
            ) : null}
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <div className="_pdContainer">
        <div className="_pdGrid">
          {/* LEFT */}
          <div style={{ display: "grid", gap: 14 }}>
            <div style={{ ...cardStyle, padding: 14 }}>
              <div className="_pdActionRow">
                <ActionBtn label="🗺️ Maps" href={mapsUrl} variant="dark" onClick={() => alert("Maps not available")} />
                <ActionBtn label="🌐 Website" href={data?.website || ""} variant="light" onClick={() => alert("Website not available")} />
                <ActionBtn label="📞 Call" href={data?.phone ? `tel:${data.phone}` : ""} variant="light" onClick={() => alert("Phone not available")} />
              </div>

              {(data?.why || data?.highlight) ? (
                <div className="_pdWhyBox">
                  {data?.why ? <div style={{ marginBottom: data?.highlight ? 8 : 0 }}>💡 {data.why}</div> : null}
                  {data?.highlight ? <div>🔥 {data.highlight}</div> : null}
                </div>
              ) : null}
            </div>

            {/* PHOTOS */}
            <div style={{ ...cardStyle, padding: 14 }}>
              <div className="_pdSectionHeader">
                <h3 style={{ margin: 0 }}>Photos</h3>
                {photos.length ? (
                  <button className="_pdSmallBtn" onClick={() => openViewer(0)}>
                    View all
                  </button>
                ) : null}
              </div>

              {photos.length ? (
                <div className="_pdGallery">
                  {photos.slice(0, 9).map((src, idx) => (
                    <div key={`${src}-${idx}`} className="_pdThumb" onClick={() => openViewer(idx)}>
                      <img src={src} alt="place" loading="lazy" className="_pdThumbImg" />
                      {idx === 8 && photos.length > 9 ? (
                        <div className="_pdMoreOverlay">+{photos.length - 9} more</div>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ marginTop: 10, opacity: 0.7 }}>No photos available.</p>
              )}
            </div>

            {/* HOURS */}
            {Array.isArray(data?.weekdayText) && data.weekdayText.length ? (
              <div style={{ ...cardStyle, padding: 14 }}>
                <button className="_pdAccordionBtn" onClick={() => setHoursOpen((p) => !p)}>
                  <span>Opening Hours</span>
                  <span style={{ opacity: 0.7 }}>{hoursOpen ? "▲" : "▼"}</span>
                </button>

                {hoursOpen ? (
                  <div className="_pdHoursBox">
                    {data.weekdayText.map((t, idx) => (
                      <div key={`${t}-${idx}`} className="_pdHourRow">
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
                {data?.category ? (
                  <div className="_pdInfoBox">
                    <div className="_pdInfoLabel">Category</div>
                    <div className="_pdInfoValue">{data.category}</div>
                  </div>
                ) : null}

                {data?.address || data?.location ? (
                  <div className="_pdInfoBox">
                    <div className="_pdInfoLabel">Address</div>
                    <div className="_pdInfoValue" style={clamp(3)}>
                      {data.address || data.location}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MOBILE STICKY BAR */}
      {!loading && data ? (
        <div className="_pdStickyBar">
          <button className="_pdStickyBtn" onClick={() => navigate(-1)}>
            ← Back
          </button>
          {photos.length ? (
            <button className="_pdStickyBtnDark" onClick={() => openViewer(0)}>
              📸 Photos
            </button>
          ) : (
            <button className="_pdStickyBtnDark" disabled style={{ opacity: 0.6 }}>
              📸 Photos
            </button>
          )}
          <a className="_pdStickyBtnDark" href={mapsUrl || "#"} target="_blank" rel="noreferrer">
            🗺️ Maps
          </a>
        </div>
      ) : null}

      {/* VIEWER MODAL */}
      {viewerOpen ? (
        <div className="_pdModal" onClick={() => setViewerOpen(false)}>
          <div className="_pdModalInner" onClick={(e) => e.stopPropagation()}>
            <div className="_pdModalTop">
              <div style={{ fontWeight: 1000, fontSize: 13 }}>
                Photo {activeIdx + 1} / {photos.length}
              </div>
              <button className="_pdModalClose" onClick={() => setViewerOpen(false)}>
                ✕
              </button>
            </div>

            <div className="_pdModalImgWrap">
              <img src={photos[activeIdx]} alt="viewer" className="_pdModalImg" />
              <button className="_pdNavBtn" style={{ left: 12 }} onClick={prevPhoto}>
                ‹
              </button>
              <button className="_pdNavBtn" style={{ right: 12 }} onClick={nextPhoto}>
                ›
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <style>{css}</style>
    </div>
  );
};

const css = `
  ._pdHeroImg{
    position:absolute; inset:0;
    width:100%; height:100%;
    object-fit:cover;
    display:block;
    background:#111;
  }
  ._pdHeroOverlay{
    position:absolute; inset:0;
    background:linear-gradient(180deg, rgba(0,0,0,0.50) 0%, rgba(0,0,0,0.18) 45%, rgba(0,0,0,0.78) 100%);
  }

  ._pdTopBar{
    position:absolute; top:14px; left:14px; right:14px;
    display:flex; justify-content:space-between; align-items:center; gap:10px;
    z-index:2;
  }
  ._pdTopBtn{
    padding:10px 12px; border-radius:14px;
    border:1px solid rgba(255,255,255,0.22);
    background:rgba(0,0,0,0.35);
    color:#fff; cursor:pointer; font-weight:900;
    backdrop-filter: blur(8px);
  }
  ._pdSourceBadge{
    padding:8px 12px; border-radius:999px;
    border:1px solid rgba(255,255,255,0.22);
    background:rgba(0,0,0,0.35);
    color:#fff; font-weight:900; font-size:12.5px;
    backdrop-filter: blur(8px);
    white-space:nowrap;
  }
  ._pdHeroTextWrap{
    position:absolute; left:0; right:0; bottom:0;
    padding:16px 16px 18px;
    z-index:2;
  }
  ._pdTitle{
    margin:0; color:#fff;
    font-size:28px; line-height:34px;
    font-weight:1000;
    display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;
  }
  ._pdMetaRow{
    margin-top:10px;
    display:flex; flex-wrap:wrap; gap:10px;
    align-items:center;
    color:#fff;
  }
  ._pdAddress{
    opacity:0.92; font-weight:700;
    flex: 1 1 260px;
    display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;
  }
  ._pdPhotosBtn{
    margin-left:auto;
    padding:10px 12px; border-radius:14px;
    border:1px solid rgba(255,255,255,0.22);
    background:rgba(0,0,0,0.35);
    color:#fff; cursor:pointer; font-weight:900;
    backdrop-filter: blur(8px);
    white-space:nowrap;
  }
  ._pdErrorBox{
    color:#fff; background:rgba(255,80,80,0.20);
    border:1px solid rgba(255,255,255,0.22);
    border-radius:16px; padding:14px; font-weight:900;
  }

  ._pdContainer{ padding:16px; }
  ._pdGrid{
    max-width:1100px; margin:0 auto;
    display:grid; grid-template-columns:1.15fr 0.85fr;
    gap:16px; align-items:start;
  }

  ._pdActionRow{ display:flex; gap:10px; flex-wrap:wrap; }

  ._pdWhyBox{
    margin-top:12px; padding:12px; border-radius:14px;
    background:#fafafa; border:1px solid #eee;
    white-space:pre-line;
  }

  ._pdSectionHeader{
    display:flex; justify-content:space-between; align-items:center; gap:10px;
  }
  ._pdSmallBtn{
    padding:10px 12px; border-radius:14px; border:1px solid #e7e7e7;
    background:#fff; cursor:pointer; font-weight:900;
  }

  ._pdGallery{
    margin-top:12px;
    display:grid; grid-template-columns:repeat(3, 1fr);
    gap:10px;
  }
  ._pdThumb{
    height:140px; border-radius:16px; overflow:hidden;
    border:1px solid #eee; cursor:pointer;
    background:#f2f2f2; position:relative;
  }
  ._pdThumbImg{ width:100%; height:100%; object-fit:cover; display:block; }
  ._pdMoreOverlay{
    position:absolute; inset:0;
    background:rgba(0,0,0,0.45);
    display:grid; place-items:center;
    color:#fff; font-weight:1000; font-size:18px;
  }

  ._pdAccordionBtn{
    width:100%;
    display:flex; justify-content:space-between; align-items:center;
    padding:12px 12px;
    border-radius:14px; border:1px solid #eee;
    background:#fff; cursor:pointer; font-weight:1000;
  }
  ._pdHoursBox{
    margin-top:10px; border-radius:14px;
    border:1px solid #eee; background:#fafafa; overflow:hidden;
  }
  ._pdHourRow{
    padding:10px 12px;
    border-bottom:1px solid #eee;
    font-weight:700; color:#222;
  }
  ._pdHourRow:last-child{ border-bottom:none; }

  ._pdInfoBox{
    padding:12px; border-radius:14px; border:1px solid #eee; background:#fafafa;
  }
  ._pdInfoLabel{ font-size:12px; opacity:0.7; font-weight:900; }
  ._pdInfoValue{ margin-top:4px; font-weight:900; }

  ._pdStickyBar{ display:none; }

  ._pdModal{
    position:fixed; inset:0;
    background:rgba(0,0,0,0.82);
    display:grid; place-items:center;
    padding:16px; z-index:9999;
  }
  ._pdModalInner{
    width:min(980px, 96vw);
    border-radius:18px; overflow:hidden;
    border:1px solid rgba(255,255,255,0.15);
    background:#0b0b0b;
  }
  ._pdModalTop{
    padding:12px;
    display:flex; justify-content:space-between; align-items:center;
    color:#fff; border-bottom:1px solid rgba(255,255,255,0.12);
  }
  ._pdModalClose{
    padding:8px 10px; border-radius:12px;
    border:1px solid rgba(255,255,255,0.18);
    background:transparent; color:#fff; cursor:pointer;
    font-weight:1000;
  }
  ._pdModalImgWrap{ position:relative; background:#000; }
  ._pdModalImg{
    width:100%;
    height:min(72vh, 660px);
    object-fit:contain; display:block;
  }
  ._pdNavBtn{
    position:absolute; top:50%;
    transform:translateY(-50%);
    padding:10px 12px; border-radius:999px;
    border:1px solid rgba(255,255,255,0.18);
    background:rgba(0,0,0,0.35);
    color:#fff; cursor:pointer; font-weight:1000;
  }

  @media (max-width: 980px){
    ._pdGrid{ grid-template-columns: 1fr; }
    ._pdGallery{ grid-template-columns: repeat(2, 1fr); }
  }

  @media (max-width: 640px){
    ._pdContainer{ padding:12px; padding-bottom: 88px; }
    ._pdTitle{ font-size:22px; line-height:28px; }
    ._pdTopBar{ top:12px; left:12px; right:12px; }
    ._pdHeroTextWrap{ padding:12px 12px 14px; }
    ._pdPhotosBtn{ width:100%; margin-left:0; justify-self:stretch; }
    ._pdMetaRow{ gap:8px; }
    ._pdActionRow{ flex-direction:column; }
    ._pdGallery{ grid-template-columns: repeat(2, 1fr); }
    ._pdThumb{ height:120px; }
    ._pdStickyBar{
      display:flex;
      position:fixed; left:12px; right:12px; bottom:12px;
      gap:10px; z-index:999;
      background:rgba(255,255,255,0.86);
      border:1px solid #eee;
      box-shadow:0 12px 28px rgba(0,0,0,0.12);
      border-radius:18px;
      padding:10px;
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
    }
    ._pdStickyBtn{
      flex:1; padding:12px 12px; border-radius:14px;
      border:1px solid #e7e7e7;
      font-weight:1000; cursor:pointer; background:#fff;
    }
    ._pdStickyBtnDark{
      flex:1; padding:12px 12px; border-radius:14px;
      border:1px solid #111;
      font-weight:1000; cursor:pointer;
      background:#111; color:#fff;
      text-decoration:none; text-align:center;
      display:flex; align-items:center; justify-content:center;
    }
  }
`;

export default PlaceDetails;
