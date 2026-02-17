import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useLocation, useNavigate, useParams } from "react-router-dom";

const API = process.env.REACT_APP_API_URL;

const PlaceDetail = () => {
  const navigate = useNavigate();
  const { id, placeId } = useParams(); // mongo uses :id, google uses :placeId
  const location = useLocation();

  const token = localStorage.getItem("token");

  const authHeader = useMemo(
    () => ({ headers: { Authorization: `Bearer ${token}` } }),
    [token]
  );

  // ---------- helpers ----------
  const googleImg = (ref) => {
    if (!ref) return "";
    return `${API}/api/google/photo?photoRef=${encodeURIComponent(ref)}`;
  };

  const resolveMongoHero = (b) => {
    const imgs = Array.isArray(b?.images) ? b.images.filter(Boolean) : [];
    if (imgs.length > 0) {
      const u = imgs[0];
      if (String(u).startsWith("/uploads/")) return `${API}${u}`;
      return u;
    }
    if (b?.photoRef) return googleImg(b.photoRef);
    if (b?.imageUrl) return b.imageUrl;
    return "";
  };

  // ---------- state from Dashboard (MOST IMPORTANT) ----------
  // Dashboard passes:
  // - Mongo: state.heroUrl
  // - Google: state.heroPhotoRef
  const stateHeroUrl = location?.state?.heroUrl || "";
  const stateHeroPhotoRef = location?.state?.heroPhotoRef || "";
  const stateHeroName = location?.state?.heroName || "";

  // This is the image shown at top (profile photo)
  const [hero, setHero] = useState(
    stateHeroUrl || (stateHeroPhotoRef ? googleImg(stateHeroPhotoRef) : "")
  );

  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [data, setData] = useState(null);

  // Decide which mode we are in
  const mode = useMemo(() => {
    if (id) return "mongo";
    if (placeId) return "google";
    return "unknown";
  }, [id, placeId]);

  // If user opened detail directly (refresh) and state is lost,
  // we still fetch details and set hero from returned data.
  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setMsg("");

      try {
        if (!token) {
          localStorage.removeItem("token");
          window.location.href = "/login";
          return;
        }

        if (mode === "mongo") {
          // ✅ Mongo detail
          const res = await axios.get(`${API}/api/search/${id}`, authHeader);
          const b = res.data;
          setData(b);

          // ✅ If hero was not passed, derive from mongo business
          // ✅ If hero was passed, keep it (so top photo stays EXACT same as clicked)
          setHero((prev) => prev || resolveMongoHero(b));
        } else if (mode === "google") {
          // ✅ Google detail (you must have this endpoint; if yours differs, tell me)
          const res = await axios.get(
            `${API}/api/google/details?placeId=${encodeURIComponent(placeId)}`,
            authHeader
          );
          const p = res.data;
          setData(p);

          // ✅ Prefer hero from Dashboard, else from fetched photoRef
          const fetchedHero = p?.photoRef ? googleImg(p.photoRef) : "";
          setHero((prev) => prev || fetchedHero);
        } else {
          setMsg("Invalid place link.");
        }
      } catch (err) {
        setMsg(err?.response?.data?.message || "Failed to load place details");
      } finally {
        setLoading(false);
      }
    };

    run();
    // eslint-disable-next-line
  }, [mode, id, placeId]);

  // ---------- UI helpers ----------
  const title = useMemo(() => {
    if (data?.name) return data.name;
    if (stateHeroName) return stateHeroName;
    return "Place Details";
  }, [data, stateHeroName]);

  const address = data?.address || data?.location || "";
  const rating = data?.rating ? `⭐ ${data.rating}` : data?.rating === 0 ? "⭐ 0" : "";
  const website = data?.website || "";
  const phone = data?.phone || data?.phoneNumber || "";

  const photos = useMemo(() => {
    // For Mongo: data.images
    if (mode === "mongo") {
      const imgs = Array.isArray(data?.images) ? data.images.filter(Boolean) : [];
      return imgs.map((u) => (String(u).startsWith("/uploads/") ? `${API}${u}` : u));
    }

    // For Google: if your backend returns an array, show it
    if (mode === "google") {
      const arr = Array.isArray(data?.photos) ? data.photos.filter(Boolean) : [];
      // If backend returns photoRefs list, you can convert:
      // if photos are refs: map(ref => googleImg(ref))
      // Here we support both full urls and refs:
      return arr.map((x) => {
        if (!x) return "";
        const s = String(x);
        if (s.startsWith("http")) return s;
        // assume it's a photoRef
        return googleImg(s);
      }).filter(Boolean);
    }

    return [];
  }, [data, mode]);

  return (
    <div style={{ minHeight: "100vh", background: "#f6f7fb", padding: 18 }}>
      <div
        style={{
          maxWidth: 980,
          margin: "0 auto",
          background: "#fff",
          borderRadius: 16,
          overflow: "hidden",
          boxShadow: "0 6px 18px rgba(0,0,0,0.06)",
        }}
      >
        {/* ✅ TOP PROFILE PHOTO (Hero) */}
        <div style={{ position: "relative", width: "100%", height: 320, background: "#eee" }}>
          {hero ? (
            <img
              src={hero}
              alt="place"
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          ) : (
            <div
              style={{
                width: "100%",
                height: "100%",
                display: "grid",
                placeItems: "center",
                fontWeight: 800,
                color: "#777",
              }}
            >
              No photo
            </div>
          )}

          {/* Back button */}
          <button
            onClick={() => navigate(-1)}
            style={{
              position: "absolute",
              top: 14,
              left: 14,
              padding: "10px 12px",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.5)",
              background: "rgba(0,0,0,0.55)",
              color: "#fff",
              cursor: "pointer",
              fontWeight: 900,
            }}
          >
            ← Back
          </button>

          {/* Title overlay */}
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              padding: 16,
              background: "linear-gradient(to top, rgba(0,0,0,0.72), rgba(0,0,0,0))",
              color: "#fff",
            }}
          >
            <div style={{ fontSize: 22, fontWeight: 900, lineHeight: 1.2 }}>{title}</div>
            <div style={{ marginTop: 6, opacity: 0.95, fontSize: 14 }}>
              {address ? address : " "}
              {rating ? <span style={{ marginLeft: 10 }}>{rating}</span> : null}
            </div>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: 18 }}>
          {loading ? (
            <p style={{ margin: 0, opacity: 0.8 }}>Loading details...</p>
          ) : msg ? (
            <p style={{ margin: 0 }}>{msg}</p>
          ) : null}

          {!loading && data ? (
            <>
              {/* quick info */}
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 10 }}>
                {data?.category ? (
                  <span
                    style={{
                      padding: "6px 10px",
                      borderRadius: 999,
                      border: "1px solid #e6e6e6",
                      background: "#fafafa",
                      fontSize: 13,
                      fontWeight: 800,
                    }}
                  >
                    🏷️ {data.category}
                  </span>
                ) : null}

                {data?.vibe ? (
                  <span
                    style={{
                      padding: "6px 10px",
                      borderRadius: 999,
                      border: "1px solid #e6e6e6",
                      background: "#fafafa",
                      fontSize: 13,
                      fontWeight: 800,
                    }}
                  >
                    {data.emoji || "✨"} {data.vibe}
                  </span>
                ) : null}

                {data?.priceLevel ? (
                  <span
                    style={{
                      padding: "6px 10px",
                      borderRadius: 999,
                      border: "1px solid #e6e6e6",
                      background: "#fafafa",
                      fontSize: 13,
                      fontWeight: 800,
                    }}
                  >
                    💸 {data.priceLevel}
                  </span>
                ) : null}

                {data?.bestTime ? (
                  <span
                    style={{
                      padding: "6px 10px",
                      borderRadius: 999,
                      border: "1px solid #e6e6e6",
                      background: "#fafafa",
                      fontSize: 13,
                      fontWeight: 800,
                    }}
                  >
                    ⏰ {data.bestTime}
                  </span>
                ) : null}

                {data?.instagrammable ? (
                  <span
                    style={{
                      padding: "6px 10px",
                      borderRadius: 999,
                      border: "1px solid #e6e6e6",
                      background: "#fafafa",
                      fontSize: 13,
                      fontWeight: 800,
                    }}
                  >
                    📸 Instagrammable
                  </span>
                ) : null}
              </div>

              {/* why/highlight */}
              {(data?.why || data?.highlight) ? (
                <div style={{ marginTop: 16 }}>
                  {data?.why ? (
                    <div style={{ marginBottom: 10, fontSize: 15 }}>
                      <b>💡 Why recommended:</b> {data.why}
                    </div>
                  ) : null}

                  {data?.highlight ? (
                    <div style={{ fontSize: 15 }}>
                      <b>🔥 Highlight:</b> {data.highlight}
                    </div>
                  ) : null}
                </div>
              ) : null}

              {/* tags & activities */}
              {(Array.isArray(data?.tags) && data.tags.length) ||
              (Array.isArray(data?.activities) && data.activities.length) ? (
                <div style={{ marginTop: 16 }}>
                  {Array.isArray(data?.tags) && data.tags.length ? (
                    <div style={{ marginBottom: 10 }}>
                      <b>Tags:</b>{" "}
                      {data.tags.slice(0, 12).map((t) => (
                        <span
                          key={t}
                          style={{
                            display: "inline-block",
                            marginRight: 8,
                            marginTop: 8,
                            padding: "6px 10px",
                            borderRadius: 999,
                            border: "1px solid #e6e6e6",
                            background: "#fafafa",
                            fontSize: 13,
                            fontWeight: 800,
                          }}
                        >
                          #{t}
                        </span>
                      ))}
                    </div>
                  ) : null}

                  {Array.isArray(data?.activities) && data.activities.length ? (
                    <div>
                      <b>Activities:</b>{" "}
                      {data.activities.slice(0, 12).map((a) => (
                        <span
                          key={a}
                          style={{
                            display: "inline-block",
                            marginRight: 8,
                            marginTop: 8,
                            padding: "6px 10px",
                            borderRadius: 999,
                            border: "1px solid #e6e6e6",
                            background: "#fafafa",
                            fontSize: 13,
                            fontWeight: 800,
                          }}
                        >
                          🎯 {a}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}

              {/* Contact */}
              {(phone || website) ? (
                <div style={{ marginTop: 18 }}>
                  <h3 style={{ margin: "0 0 10px 0" }}>Contact</h3>

                  {phone ? (
                    <div style={{ marginBottom: 8 }}>
                      <b>📞 Phone:</b> {phone}
                    </div>
                  ) : null}

                  {website ? (
                    <div>
                      <b>🌐 Website:</b>{" "}
                      <a href={website} target="_blank" rel="noreferrer">
                        {website}
                      </a>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {/* Gallery */}
              {photos.length > 0 ? (
                <div style={{ marginTop: 18 }}>
                  <h3 style={{ margin: "0 0 10px 0" }}>Photos</h3>

                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    {photos.slice(0, 12).map((u, i) => (
                      <img
                        key={u + i}
                        src={u}
                        alt="gallery"
                        style={{
                          width: 150,
                          height: 110,
                          objectFit: "cover",
                          borderRadius: 14,
                          border: "1px solid #eee",
                        }}
                        onClick={() => setHero(u)} // ✅ click gallery to set as profile photo
                      />
                    ))}
                  </div>

                  <p style={{ marginTop: 10, fontSize: 12.5, opacity: 0.75 }}>
                    Tip: Click any photo to make it the top profile photo.
                  </p>
                </div>
              ) : null}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default PlaceDetail;
