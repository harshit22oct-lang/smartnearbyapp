import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import PlaceCard from "../components/PlaceCard";

const API = process.env.REACT_APP_API_URL;

// ✅ Dashboard state persistence (so Back doesn't clear search)
const DASH_KEY = "mn_dashboard_state_v1";
const SAVE_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours

const Dashboard = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const [user, setUser] = useState(null);

  // ✅ City list
  const CITY_LIST = useMemo(
    () => [
      "Bhopal",
      "Indore",
      "Bangalore",
      "Delhi",
      "Mumbai",
      "Pune",
      "Hyderabad",
      "Chennai",
      "Kolkata",
      "Ahmedabad",
      "Jaipur",
      "Lucknow",
      "Surat",
      "Nagpur",
      "Patna",
      "Chandigarh",
      "Coimbatore",
      "Visakhapatnam",
      "Vadodara",
      "Ranchi",
    ],
    []
  );

  const [selectedCity, setSelectedCity] = useState("Bhopal");
  const [q, setQ] = useState("");

  const [results, setResults] = useState([]);
  const [googleResults, setGoogleResults] = useState([]);

  const [favIds, setFavIds] = useState([]);
  const [favPlaceIds, setFavPlaceIds] = useState([]);
  const [favList, setFavList] = useState([]);

  // ✅ Admin curated fields
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [address, setAddress] = useState("");
  const [rating, setRating] = useState("");
  const [imageUrl, setImageUrl] = useState(""); // old single
  const [photoRef, setPhotoRef] = useState(""); // old google photoRef
  const [location, setLocation] = useState("");

  const [emoji, setEmoji] = useState("✨");
  const [vibe, setVibe] = useState("Cozy");
  const [priceLevel, setPriceLevel] = useState("₹₹");
  const [bestTime, setBestTime] = useState("Evening");
  const [highlight, setHighlight] = useState("");
  const [why, setWhy] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [activitiesInput, setActivitiesInput] = useState("");
  const [instagrammable, setInstagrammable] = useState(false);

  // ✅ Multi photos
  const fileInputRef = useRef(null);
  const [localFiles, setLocalFiles] = useState([]); // File[]
  const [urlInput, setUrlInput] = useState("");
  const [urlImages, setUrlImages] = useState([]); // string[]
  const [uploading, setUploading] = useState(false);

  const [msg, setMsg] = useState("");

  const authHeader = useMemo(
    () => ({ headers: { Authorization: `Bearer ${token}` } }),
    [token]
  );

  // ----------------
  // Helpers
  // ----------------
  const normalizeCity = (s) => (s || "").trim().toLowerCase();

  const detectCityFromQuery = (raw) => {
    const text = (raw || "").toLowerCase();
    const found = CITY_LIST.find((c) => text.includes(normalizeCity(c)));
    return found || null;
  };

  const stripCityFromQuery = (raw, cityName) => {
    if (!raw) return "";
    if (!cityName) return raw.trim();

    const cityLower = normalizeCity(cityName);
    let t = raw.toLowerCase();
    t = t.replace(new RegExp(`\\bin\\s+${cityLower}\\b`, "gi"), " ");
    t = t.replace(new RegExp(`\\b${cityLower}\\b`, "gi"), " ");
    return t.replace(/\s+/g, " ").trim();
  };

  const buildGoogleQuery = (keyword, cityName) => {
    const k = (keyword || "").trim();
    const c = (cityName || "").trim();
    if (!k && !c) return "";
    if (!k) return c;
    if (!c) return k;
    return `${k} ${c}`;
  };

  // ✅ Smart Mood system
  const moods = useMemo(
    () => [
      {
        label: "Romantic 👀💕",
        keywords: [
          "romantic restaurant",
          "rooftop dining",
          "couple cafe",
          "fine dining",
          "sunset point",
          "candle light dinner",
        ],
      },
      {
        label: "Cozy ☕🍂",
        keywords: [
          "cozy places",
          "coffee shop",
          "book cafe",
          "quiet restaurant",
          "tea house",
          "art cafe",
          "bakery",
        ],
      },
      {
        label: "Alone 🌙",
        keywords: [
          "quiet place",
          "study cafe",
          "library",
          "peaceful park",
          "work cafe",
          "reading cafe",
        ],
      },
      {
        label: "Nature ⛰️🍃",
        keywords: ["park", "lake view", "garden", "nature spot", "sunset point"],
      },
      {
        label: "Budget 💸",
        keywords: [
          "cheap food",
          "budget cafe",
          "street food",
          "affordable restaurant",
          "thali",
        ],
      },
      {
        label: "Date Night 🍽️",
        keywords: [
          "fine dining",
          "romantic dinner",
          "rooftop restaurant",
          "candle light dinner",
          "live music restaurant",
        ],
      },
    ],
    []
  );

  const googleImg = (ref) => {
    if (!ref) return "";
    return `${API}/api/google/photo?photoRef=${encodeURIComponent(ref)}`;
  };

  // ✅ IMPORTANT: show curated gallery first image if exists
  const mongoImg = (b) => {
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

  const chip = (text) => (
    <span key={text} className="mnChip">
      {text}
    </span>
  );

  // ----------------
  // ✅ Save / Restore dashboard results
  // ----------------
  const saveDashState = (override = {}) => {
    try {
      const payload = {
        selectedCity,
        q,
        results,
        googleResults,
        scrollY: window.scrollY,
        ts: Date.now(),
        ...override,
      };
      sessionStorage.setItem(DASH_KEY, JSON.stringify(payload));
    } catch {
      // ignore
    }
  };

  const restoreDashState = () => {
    try {
      const raw = sessionStorage.getItem(DASH_KEY);
      if (!raw) return false;
      const s = JSON.parse(raw);

      if (s?.ts && Date.now() - s.ts > SAVE_TTL_MS) return false;

      setSelectedCity(s.selectedCity || "Bhopal");
      setQ(s.q || "");
      setResults(Array.isArray(s.results) ? s.results : []);
      setGoogleResults(Array.isArray(s.googleResults) ? s.googleResults : []);

      setTimeout(() => window.scrollTo(0, Number(s.scrollY || 0)), 0);
      return true;
    } catch {
      return false;
    }
  };

  // ----------------
  // Data loaders
  // ----------------
  const fetchProfile = async () => {
    try {
      const res = await axios.get(`${API}/api/auth/profile`, authHeader);
      setUser(res.data);
    } catch (err) {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
  };

  const fetchFavorites = async () => {
    try {
      const res = await axios.get(`${API}/api/favorites`, authHeader);
      const list = res.data || [];
      setFavList(list);
      setFavIds(list.map((b) => b._id));
      setFavPlaceIds(list.map((b) => (b.placeId || "").trim()).filter(Boolean));
    } catch (err) {
      setFavList([]);
      setFavIds([]);
      setFavPlaceIds([]);
    }
  };

  useEffect(() => {
    restoreDashState();
    fetchProfile();
    fetchFavorites();
    // eslint-disable-next-line
  }, []);

  // ----------------
  // Search
  // ----------------
  const searchNow = async (overrideRawQuery) => {
    setMsg("");

    const raw = (overrideRawQuery ?? q ?? "").trim();
    if (!raw) {
      setMsg("Type something to search");
      return;
    }

    setResults([]);
    setGoogleResults([]);

    const detectedCity = detectCityFromQuery(raw);
    const cityToUse = detectedCity || selectedCity;

    if (detectedCity && normalizeCity(detectedCity) !== normalizeCity(selectedCity)) {
      setSelectedCity(detectedCity);
    }

    const keyword = stripCityFromQuery(raw, detectedCity || cityToUse);
    const keywordSafe = keyword || "";
    setQ(keywordSafe);

    try {
      const mongoRes = await axios.get(
        `${API}/api/search?city=${encodeURIComponent(normalizeCity(cityToUse))}&q=${encodeURIComponent(
          keywordSafe
        )}`,
        authHeader
      );
      setResults(mongoRes.data || []);
    } catch (err) {
      setMsg(err?.response?.data?.message || "MongoDB search failed");
    }

    try {
      const gq = buildGoogleQuery(keywordSafe, cityToUse);
      const googleRes = await axios.get(`${API}/api/google?q=${encodeURIComponent(gq)}`, authHeader);
      setGoogleResults(googleRes.data || []);
    } catch (err) {
      setMsg((prev) => prev || err?.response?.data?.message || "Google search failed");
    }

    setTimeout(() => {
      saveDashState({ selectedCity: cityToUse, q: keywordSafe, scrollY: 0 });
      window.scrollTo(0, 0);
    }, 0);
  };

  // ----------------
  // Favorites
  // ----------------
  const toggleFavorite = async (businessId) => {
    setMsg("");
    try {
      await axios.post(`${API}/api/favorites/${businessId}`, {}, authHeader);
      await fetchFavorites();
    } catch (err) {
      setMsg(err?.response?.data?.message || "Favorite update failed");
    }
  };

  const isFav = (id) => favIds.includes(id);

  const isGoogleSaved = (placeId) => {
    if (!placeId) return false;
    return favPlaceIds.includes(placeId);
  };

  const findFavoriteBusinessByPlaceId = (placeId) => {
    if (!placeId) return null;
    return (favList || []).find((b) => (b.placeId || "").trim() === (placeId || "").trim()) || null;
  };

  const deleteCurated = async (id) => {
    setMsg("");
    try {
      await axios.delete(`${API}/api/search/${id}`, authHeader);
      setMsg("✅ Deleted successfully");
      setResults((prev) => prev.filter((x) => x._id !== id));
      await fetchFavorites();
      setTimeout(saveDashState, 0);
    } catch (err) {
      setMsg(err?.response?.data?.message || "Delete failed");
    }
  };

  // ✅ Import Google -> Mongo
  const importGooglePlace = async (p) => {
    const res = await axios.post(
      `${API}/api/import`,
      {
        city: normalizeCity(selectedCity),
        placeId: p.placeId,
        name: p.name,
        address: p.address,
        rating: p.rating === "N/A" ? null : Number(p.rating),
        photoRef: p.photoRef || "",
      },
      authHeader
    );
    return res.data?.business || res.data;
  };

  const toggleGoogleSave = async (p) => {
    setMsg("");
    try {
      const already = isGoogleSaved(p.placeId);

      if (already) {
        const favDoc = findFavoriteBusinessByPlaceId(p.placeId);
        if (!favDoc?._id) {
          await fetchFavorites();
          setMsg("⚠️ Could not find saved item id. Refreshed.");
          return;
        }
        await axios.post(`${API}/api/favorites/${favDoc._id}`, {}, authHeader);
        await fetchFavorites();
        setMsg("❌ Removed from favorites");
        setTimeout(saveDashState, 0);
        return;
      }

      const business = await importGooglePlace(p);
      if (!business?._id) {
        setMsg("Import worked but Mongo _id not returned. Check /api/import response.");
        return;
      }

      await axios.post(`${API}/api/favorites/${business._id}`, {}, authHeader);
      await fetchFavorites();
      setMsg("✅ Saved from Google!");
      setTimeout(saveDashState, 0);
    } catch (err) {
      setMsg(err?.response?.data?.message || "Save/Unsave failed");
    }
  };

  // -------------------------
  // Admin photo helpers
  // -------------------------
  const parseUrls = (raw) => {
    const txt = String(raw || "");
    const parts = txt
      .split(/[\n,]+/g)
      .map((x) => x.trim())
      .filter(Boolean);

    const urls = parts.filter((u) => /^https?:\/\/.+/i.test(u) || u.startsWith("/uploads/"));
    return Array.from(new Set(urls));
  };

  const onPickFiles = (files) => {
    const list = Array.from(files || []).filter(Boolean);
    if (!list.length) return;

    setLocalFiles((prev) => {
      const next = [...prev];
      list.forEach((f) => {
        const exists = next.some((x) => x.name === f.name && x.size === f.size);
        if (!exists) next.push(f);
      });
      return next;
    });
  };

  const uploadLocalFiles = async () => {
    if (!localFiles.length) return [];

    setUploading(true);
    try {
      const formData = new FormData();
      localFiles.forEach((f) => formData.append("images", f));

      const res = await axios.post(`${API}/api/upload`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      return res.data?.urls || [];
    } catch (err) {
      throw new Error(err?.response?.data?.message || "Image upload failed");
    } finally {
      setUploading(false);
    }
  };

  const addBusiness = async (e) => {
    e.preventDefault();
    setMsg("");

    if (uploading) {
      setMsg("⏳ Upload in progress, please wait...");
      return;
    }

    try {
      const uploadedUrls = await uploadLocalFiles();
      const merged = [...uploadedUrls, ...(urlImages || []), ...(imageUrl ? [imageUrl.trim()] : [])]
        .map((x) => String(x || "").trim())
        .filter(Boolean);

      const payload = {
        city: normalizeCity(selectedCity),
        name: (name || "").trim(),
        category: (category || "").trim(),
        address: (address || "").trim(),
        location: (location || "").trim(),
        rating: rating === "" ? null : Number(rating),

        imageUrl: (imageUrl || "").trim(),
        photoRef: (photoRef || "").trim(),

        images: merged,

        emoji: (emoji || "✨").trim(),
        vibe: (vibe || "").trim(),
        priceLevel: (priceLevel || "").trim(),
        bestTime: (bestTime || "").trim(),
        highlight: (highlight || "").trim(),
        why: (why || "").trim(),
        tags: (tagsInput || "").split(",").map((x) => x.trim()).filter(Boolean),
        activities: (activitiesInput || "").split(",").map((x) => x.trim()).filter(Boolean),
        instagrammable: !!instagrammable,
      };

      if (!payload.name) {
        setMsg("❌ Place name is required");
        return;
      }

      const res = await axios.post(`${API}/api/search`, payload, authHeader);

      setMsg("✅ Curated place added!");
      setResults((prev) => [res.data, ...prev]);

      // reset
      setName("");
      setCategory("");
      setAddress("");
      setLocation("");
      setRating("");
      setImageUrl("");
      setPhotoRef("");
      setEmoji("✨");
      setVibe("Cozy");
      setPriceLevel("₹₹");
      setBestTime("Evening");
      setHighlight("");
      setWhy("");
      setTagsInput("");
      setActivitiesInput("");
      setInstagrammable(false);
      setLocalFiles([]);
      setUrlInput("");
      setUrlImages([]);

      setTimeout(saveDashState, 0);
    } catch (err) {
      setMsg(err?.message || err?.response?.data?.message || "Add business failed");
    }
  };

  const CityChip = ({ c }) => {
    const active = normalizeCity(c) === normalizeCity(selectedCity);
    return (
      <button
        className={`mnCityChip ${active ? "active" : ""}`}
        onClick={() => {
          setSelectedCity(c);
          setTimeout(() => saveDashState({ selectedCity: c }), 0);

          if ((q || "").trim()) searchNow(q);
          else {
            setResults([]);
            setGoogleResults([]);
            setTimeout(() => saveDashState({ results: [], googleResults: [] }), 0);
          }
        }}
      >
        {c}
      </button>
    );
  };

  const previewUrlForLocal = (file) => URL.createObjectURL(file);

  // ✅ wrapper: save dashboard state before leaving
  const openDetails = (path) => {
    saveDashState();
    navigate(path);
  };

  return (
    <div className="mnWrap">
      <style>{`
        .mnWrap{
          min-height:100vh;
          background:#f6f7fb;
          padding:18px;
        }
        .mnShell{
          max-width:1100px;
          margin:0 auto;
          background:#fff;
          border-radius:18px;
          padding:18px;
          box-shadow:0 10px 28px rgba(0,0,0,0.06);
          border:1px solid rgba(240,240,240,1);
        }
        .mnTop{
          display:flex;
          justify-content:space-between;
          align-items:flex-start;
          gap:12px;
        }
        .mnTitle{ margin:0; font-size:22px; }
        .mnSub{ margin:6px 0 0; opacity:0.85; }
        .mnLogout{
          padding:10px 12px;
          border-radius:12px;
          border:1px solid #e5e7eb;
          background:#fff;
          cursor:pointer;
          font-weight:800;
        }
        .mnMsg{
          margin-top:12px;
          padding:10px 12px;
          border-radius:14px;
          border:1px solid #eee;
          background:#fafafa;
          font-weight:700;
        }
        .mnCard{
          border:1px solid #eee;
          background:#fff;
          border-radius:18px;
          padding:14px;
          box-shadow:0 10px 24px rgba(0,0,0,0.05);
        }
        .mnRow{
          display:flex;
          gap:10px;
          flex-wrap:wrap;
          align-items:center;
        }
        .mnSelect{
          padding:10px 12px;
          border-radius:12px;
          border:1px solid #e5e7eb;
          background:#fff;
          font-weight:700;
        }
        .mnCityBar{
          display:flex;
          gap:10px;
          overflow-x:auto;
          padding:6px 2px 2px;
          -webkit-overflow-scrolling:touch;
        }
        .mnCityChip{
          padding:9px 12px;
          border-radius:999px;
          border:1px solid #ddd;
          background:#fff;
          cursor:pointer;
          white-space:nowrap;
          font-size:13px;
          font-weight:800;
        }
        .mnCityChip.active{
          background:#111;
          color:#fff;
          border-color:#111;
        }
        .mnSearchRow{
          display:flex;
          gap:10px;
          align-items:center;
          margin-top:10px;
        }
        .mnInput{
          flex:1;
          min-width:220px;
          padding:12px 12px;
          border-radius:14px;
          border:1px solid #e5e7eb;
          outline:none;
          font-weight:700;
        }
        .mnBtn{
          padding:12px 14px;
          border-radius:14px;
          border:1px solid #111;
          background:#111;
          color:#fff;
          cursor:pointer;
          font-weight:900;
          white-space:nowrap;
        }
        .mnMoodRow{
          display:flex;
          gap:10px;
          flex-wrap:wrap;
          margin-top:12px;
        }
        .mnMood{
          padding:9px 14px;
          border-radius:999px;
          border:1px solid #e5e7eb;
          background:#fff;
          cursor:pointer;
          font-weight:800;
        }
        .mnGrid{
          display:grid;
          grid-template-columns:1fr 1fr;
          gap:16px;
          margin-top:14px;
        }
        .mnChip{
          display:inline-block;
          padding:5px 10px;
          border-radius:999px;
          border:1px solid #e6e6e6;
          background:#fafafa;
          font-size:12px;
          margin-right:6px;
          margin-top:6px;
        }

        /* ✅ MOBILE FIXES */
        @media (max-width: 820px){
          .mnWrap{ padding:12px; }
          .mnShell{ padding:14px; }
          .mnTop{ flex-direction:column; align-items:stretch; }
          .mnLogout{ width:100%; }
          .mnSearchRow{ flex-direction:column; align-items:stretch; }
          .mnInput{ width:100%; min-width:0; }
          .mnBtn{ width:100%; }
          .mnGrid{ grid-template-columns:1fr; }
        }
      `}</style>

      <div className="mnShell">
        {/* Header */}
        <div className="mnTop">
          <div>
            <h2 className="mnTitle">MoodNest</h2>
            {user ? (
              <p className="mnSub">
                Hey 👋, <b>{user.name || ""}</b>{" "}
                {user.isAdmin ? (
                  <span
                    style={{
                      marginLeft: 8,
                      fontSize: 12,
                      padding: "2px 8px",
                      borderRadius: 999,
                      border: "1px solid #ddd",
                      background: "#fff7e6",
                    }}
                  >
                    Admin ⚡
                  </span>
                ) : null}
              </p>
            ) : null}
          </div>

          <button
            className="mnLogout"
            onClick={() => {
              sessionStorage.removeItem(DASH_KEY);
              localStorage.removeItem("token");
              window.location.href = "/login";
            }}
          >
            Logout
          </button>
        </div>

        {msg ? <div className="mnMsg">{msg}</div> : null}

        {/* Search Card */}
        <div className="mnCard" style={{ marginTop: 14 }}>
          <h3 style={{ margin: 0 }}>Quick Mood Search</h3>

          {/* City Selector */}
          <div style={{ marginTop: 12 }}>
            <div className="mnRow" style={{ marginBottom: 10 }}>
              <span style={{ opacity: 0.85, fontSize: 14, fontWeight: 800 }}>Select City:</span>

              <select
                className="mnSelect"
                value={selectedCity}
                onChange={(e) => {
                  setSelectedCity(e.target.value);
                  setTimeout(() => saveDashState({ selectedCity: e.target.value }), 0);

                  if ((q || "").trim()) searchNow(q);
                  else {
                    setResults([]);
                    setGoogleResults([]);
                    setTimeout(() => saveDashState({ results: [], googleResults: [] }), 0);
                  }
                }}
              >
                {CITY_LIST.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="mnCityBar">
              {CITY_LIST.map((c) => (
                <CityChip key={c} c={c} />
              ))}
            </div>
          </div>

          {/* Search bar */}
          <div className="mnSearchRow">
            <input
              className="mnInput"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onBlur={() => setTimeout(saveDashState, 0)}
              onKeyDown={(e) => {
                if (e.key === "Enter") searchNow();
              }}
              placeholder={`Search in ${selectedCity}: cafe, gym, pizza... (or type "cafe in delhi")`}
            />
            <button className="mnBtn" onClick={() => searchNow()}>
              Search
            </button>
          </div>

          {/* Mood buttons */}
          <div className="mnMoodRow">
            {moods.map((m) => (
              <button
                key={m.label}
                className="mnMood"
                onClick={() => {
                  const randomKeyword = m.keywords[Math.floor(Math.random() * m.keywords.length)];
                  const fullQuery = `${randomKeyword} in ${selectedCity}`;
                  setQ(randomKeyword);
                  searchNow(fullQuery);
                }}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Results */}
        <div className="mnGrid">
          {/* Mongo */}
          <div className="mnCard">
            <h3 style={{ marginTop: 0 }}>MoodNest (Recommended)</h3>

            {results.length === 0 ? (
              <p style={{ opacity: 0.7 }}>No curated results yet.</p>
            ) : (
              results.map((b) => {
                const ratingText = b.rating ? `⭐ ${b.rating}` : "";
                const badge = `${b.emoji || "✨"} ${b.vibe || "Recommended"}`;

                const topInfo = [
                  b.priceLevel ? `💸 ${b.priceLevel}` : "",
                  b.bestTime ? `⏰ ${b.bestTime}` : "",
                  b.instagrammable ? "📸 Instagram" : "",
                ]
                  .filter(Boolean)
                  .join("  •  ");

                const tagChips = (b.tags || []).slice(0, 4).map((t) => chip(`#${t}`));
                const actChips = (b.activities || []).slice(0, 3).map((a) => chip(`🎯 ${a}`));

                const extraLine = (b.why ? `💡 ${b.why}` : "") + (b.highlight ? `\n🔥 ${b.highlight}` : "");

                return (
                  <div key={b._id}>
                    <PlaceCard
                      imageUrl={mongoImg(b)}
                      badgeText={badge}
                      title={b.name}
                      subtitle1={b.address || b.location || "-"}
                      subtitle2={extraLine || (b.category ? `Category: ${b.category}` : "")}
                      rightTop={ratingText || (isFav(b._id) ? "Saved" : "Curated")}
                      buttonText={user?.isAdmin ? "🗑 Delete" : isFav(b._id) ? "Remove" : "Save"}
                      onOpen={() => openDetails(`/place/mongo/${b._id}`)}
                      onAction={(e) => {
                        e?.stopPropagation?.();
                        if (user?.isAdmin) deleteCurated(b._id);
                        else toggleFavorite(b._id);
                      }}
                    />

                    {(tagChips.length > 0 || actChips.length > 0 || topInfo) && (
                      <div style={{ marginTop: 8, marginBottom: 14 }}>
                        {topInfo ? chip(topInfo) : null}
                        {tagChips}
                        {actChips}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Google */}
          <div className="mnCard">
            <h3 style={{ marginTop: 0 }}>Google Places (Live)</h3>

            {googleResults.length === 0 ? (
              <p style={{ opacity: 0.7 }}>No Google results yet.</p>
            ) : (
              googleResults.map((p, idx) => {
                const ratingText = p.rating === "N/A" ? "⭐ N/A" : `⭐ ${p.rating}`;
                const saved = isGoogleSaved(p.placeId);

                return (
                  <div key={p.placeId || idx}>
                    <PlaceCard
                      imageUrl={googleImg(p.photoRef)}
                      badgeText="Google"
                      title={p.name}
                      subtitle1={p.address}
                      subtitle2=""
                      rightTop={saved ? "✅ Saved" : ratingText}
                      buttonText={saved ? "Unsave" : "⭐ Save"}
                      onOpen={() => openDetails(`/place/google/${p.placeId}`)}
                      onAction={(e) => {
                        e?.stopPropagation?.();
                        toggleGoogleSave(p);
                      }}
                    />
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Favorites */}
        <div className="mnCard" style={{ marginTop: 14 }}>
          <h3 style={{ marginTop: 0 }}>Saved / Favorites</h3>
          {favList.length === 0 ? (
            <p style={{ opacity: 0.7 }}>No favorites yet.</p>
          ) : (
            favList.map((b) => (
              <div key={b._id}>
                <PlaceCard
                  imageUrl={mongoImg(b)}
                  badgeText="Saved"
                  title={b.name}
                  subtitle1={b.address || b.location || "-"}
                  subtitle2={b.why ? `💡 ${b.why}` : b.category ? `Category: ${b.category}` : ""}
                  rightTop={b.rating ? `⭐ ${b.rating}` : "Saved"}
                  buttonText={"Remove"}
                  onOpen={() => openDetails(`/place/mongo/${b._id}`)}
                  onAction={(e) => {
                    e?.stopPropagation?.();
                    toggleFavorite(b._id);
                  }}
                />
              </div>
            ))
          )}
        </div>

        {/* Admin form (kept same logic, just wrapped nicely) */}
        {user?.isAdmin ? (
          <div className="mnCard" style={{ marginTop: 14 }}>
            <h3 style={{ marginTop: 0 }}>Add Recommended Place (Only For Admin)</h3>
            <p style={{ marginTop: 0, opacity: 0.8, fontSize: 13 }}>
              City for this curated card: <b>{selectedCity}</b>
            </p>

            <form onSubmit={addBusiness} style={{ maxWidth: 820 }}>
              <div className="mnRow">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Place name (required)"
                  className="mnInput"
                />
                <select className="mnSelect" value={emoji} onChange={(e) => setEmoji(e.target.value)}>
                  <option value="☕">☕ Cozy</option>
                  <option value="🌿">🌿 Nature</option>
                  <option value="🌙">🌙 Night Out</option>
                  <option value="❤️">❤️ Romantic</option>
                  <option value="🎧">🎧 Chill</option>
                  <option value="🍽️">🍽️ Food</option>
                  <option value="🏞️">🏞️ Adventure</option>
                  <option value="🧘">🧘 Relax</option>
                  <option value="🎬">🎬 Entertainment</option>
                  <option value="🛍️">🛍️ Shopping</option>
                  <option value="🏋️">🏋️ Fitness</option>
                  <option value="📸">📸 Explore</option>
                  <option value="✨">✨ Vibes</option>
                </select>

                <select className="mnSelect" value={vibe} onChange={(e) => setVibe(e.target.value)}>
                  <option value="Hidden Gems">💎 Hidden Gems</option>
                  <option value="Top Rated">⭐ Top Rated</option>
                  <option value="Trending Now">🔥 Trending Now</option>
                  <option value="Peaceful Spots">🌿 Peaceful Spots</option>
                  <option value="Work Friendly">💻 Work Friendly</option>
                  <option value="Date Spots">❤️ Date Spots</option>
                  <option value="Weekend Fun">🎉 Weekend Fun</option>
                </select>
              </div>

              <div className="mnRow" style={{ marginTop: 10 }}>
                <input
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="Category (Cafe/Gym/Restaurant)"
                  className="mnInput"
                />

                <select className="mnSelect" value={rating} onChange={(e) => setRating(e.target.value)}>
                  <option value="">⭐ Any Rating</option>
                  <option value="4.5">⭐ 4.5+ Best Rated</option>
                  <option value="4.0">⭐ 4.0+ Rising Star</option>
                  <option value="3.5">⭐ 3.5+ Good</option>
                  <option value="3.0">⭐ 3.0+ Average</option>
                </select>

                <select className="mnSelect" value={priceLevel} onChange={(e) => setPriceLevel(e.target.value)}>
                  <option value="Essential">Essential ⚡</option>
                  <option value="Signature">Signature 🌟</option>
                  <option value="Elite">Elite 👑</option>
                </select>

                <select className="mnSelect" value={bestTime} onChange={(e) => setBestTime(e.target.value)}>
                  <option value="Morning">🌅 Morning Picks</option>
                  <option value="Afternoon">☀️ Day Explorer</option>
                  <option value="Evening">🌇 Evening Vibes</option>
                  <option value="Night">🌙 Nightlife</option>
                </select>
              </div>

              <input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Full Address"
                className="mnInput"
                style={{ marginTop: 10 }}
              />

              {/* Multi photo upload UI remains same (your existing block) */}
              <div
                style={{
                  border: "1px solid #e9e9e9",
                  borderRadius: 16,
                  padding: 12,
                  marginTop: 12,
                  background: "#fafafa",
                }}
              >
                <div className="mnRow" style={{ justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontWeight: 900, marginBottom: 4 }}>Photos (multiple)</div>
                    <div style={{ fontSize: 12.5, opacity: 0.75 }}>
                      Add local photos (upload) + photo URLs.
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      padding: "10px 12px",
                      borderRadius: 12,
                      border: "1px solid #ddd",
                      background: "#fff",
                      cursor: "pointer",
                      fontWeight: 800,
                      width: "fit-content",
                    }}
                  >
                    📁 Choose files
                  </button>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    style={{ display: "none" }}
                    onChange={(e) => {
                      onPickFiles(e.target.files);
                      e.target.value = "";
                    }}
                  />
                </div>

                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onPickFiles(e.dataTransfer.files);
                  }}
                  style={{
                    marginTop: 12,
                    padding: 14,
                    borderRadius: 14,
                    border: "1px dashed #cfcfcf",
                    background: "#fff",
                    textAlign: "center",
                    fontSize: 13,
                    opacity: 0.9,
                  }}
                >
                  Drag & drop images here
                </div>

                <div style={{ marginTop: 12 }}>
                  <textarea
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder={"Paste image URLs (comma or new line)\nExample:\nhttps://...\nhttps://..."}
                    rows={3}
                    style={{
                      width: "100%",
                      padding: 10,
                      borderRadius: 12,
                      border: "1px solid #ddd",
                      resize: "vertical",
                    }}
                  />

                  <div className="mnRow" style={{ marginTop: 8 }}>
                    <button
                      type="button"
                      onClick={() => {
                        const urls = parseUrls(urlInput);
                        setUrlImages(urls);
                        setMsg(urls.length ? `✅ Added ${urls.length} URL images` : "No valid URLs found");
                      }}
                      className="mnBtn"
                      style={{ borderRadius: 12 }}
                    >
                      Add URL Images
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setUrlInput("");
                        setUrlImages([]);
                      }}
                      style={{
                        padding: "12px 14px",
                        borderRadius: 14,
                        border: "1px solid #e5e7eb",
                        background: "#fff",
                        cursor: "pointer",
                        fontWeight: 900,
                      }}
                    >
                      Clear URLs
                    </button>

                    {uploading ? (
                      <span style={{ fontSize: 13, opacity: 0.8, alignSelf: "center" }}>
                        Uploading...
                      </span>
                    ) : null}
                  </div>
                </div>

                {(localFiles.length > 0 || urlImages.length > 0) ? (
                  <div style={{ marginTop: 12 }}>
                    <div style={{ fontWeight: 800, marginBottom: 8 }}>
                      Preview ({localFiles.length + urlImages.length})
                    </div>

                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                      {localFiles.map((f, idx) => (
                        <div
                          key={`${f.name}-${f.size}-${idx}`}
                          style={{
                            width: 120,
                            borderRadius: 14,
                            overflow: "hidden",
                            border: "1px solid #e6e6e6",
                            background: "#fff",
                          }}
                        >
                          <img
                            alt="local"
                            src={previewUrlForLocal(f)}
                            style={{ width: "100%", height: 90, objectFit: "cover", display: "block" }}
                          />
                          <button
                            type="button"
                            onClick={() => setLocalFiles((prev) => prev.filter((_, i) => i !== idx))}
                            style={{
                              width: "100%",
                              padding: "8px 10px",
                              border: "none",
                              borderTop: "1px solid #eee",
                              background: "#fff",
                              cursor: "pointer",
                              fontWeight: 800,
                              fontSize: 12,
                            }}
                          >
                            Remove
                          </button>
                        </div>
                      ))}

                      {urlImages.map((u, idx) => (
                        <div
                          key={`${u}-${idx}`}
                          style={{
                            width: 120,
                            borderRadius: 14,
                            overflow: "hidden",
                            border: "1px solid #e6e6e6",
                            background: "#fff",
                          }}
                        >
                          <img
                            alt="url"
                            src={u.startsWith("/uploads/") ? `${API}${u}` : u}
                            style={{ width: "100%", height: 90, objectFit: "cover", display: "block" }}
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => setUrlImages((prev) => prev.filter((_, i) => i !== idx))}
                            style={{
                              width: "100%",
                              padding: "8px 10px",
                              border: "none",
                              borderTop: "1px solid #eee",
                              background: "#fff",
                              cursor: "pointer",
                              fontWeight: 800,
                              fontSize: 12,
                            }}
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>

                    <p style={{ marginTop: 10, fontSize: 12.5, opacity: 0.75 }}>
                      Local images will upload when you submit the form.
                    </p>
                  </div>
                ) : null}
              </div>

              <div className="mnRow" style={{ marginTop: 10 }}>
                <input
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="(Optional) Single Image URL (old field)"
                  className="mnInput"
                />
                <input
                  value={photoRef}
                  onChange={(e) => setPhotoRef(e.target.value)}
                  placeholder="(Optional) Google photoRef (old field)"
                  className="mnInput"
                />
              </div>

              <input
                value={why}
                onChange={(e) => setWhy(e.target.value)}
                placeholder="Why recommended? (e.g. Calm music + perfect for study)"
                className="mnInput"
                style={{ marginTop: 10 }}
              />

              <input
                value={highlight}
                onChange={(e) => setHighlight(e.target.value)}
                placeholder="Highlight / Must try (e.g. Cold coffee, Pasta)"
                className="mnInput"
                style={{ marginTop: 10 }}
              />

              <div className="mnRow" style={{ marginTop: 10 }}>
                <input
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="Tags (comma): Study, Aesthetic, Quiet"
                  className="mnInput"
                />
                <input
                  value={activitiesInput}
                  onChange={(e) => setActivitiesInput(e.target.value)}
                  placeholder="Activities (comma): Open mic, Board games"
                  className="mnInput"
                />
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10 }}>
                <input
                  type="checkbox"
                  checked={instagrammable}
                  onChange={(e) => setInstagrammable(e.target.checked)}
                />
                <span style={{ fontSize: 14, fontWeight: 800 }}>📸 Instagrammable</span>
              </div>

              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Location (optional)"
                className="mnInput"
                style={{ marginTop: 10 }}
              />

              <button
                type="submit"
                disabled={uploading}
                className="mnBtn"
                style={{
                  marginTop: 10,
                  background: uploading ? "#666" : "#111",
                  borderColor: uploading ? "#666" : "#111",
                  cursor: uploading ? "not-allowed" : "pointer",
                }}
              >
                {uploading ? "Uploading..." : "Add Curated Place"}
              </button>

              <p style={{ marginTop: 8, fontSize: 12, opacity: 0.7 }}>
                Tip: Add photos using file upload or multiple URLs.
              </p>
            </form>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default Dashboard;
