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

  // ✅ Google Form import states (NEW)
  const [importSheetId, setImportSheetId] = useState("");
  const [importRow, setImportRow] = useState(2);
  const [importBusy, setImportBusy] = useState(false);
  const [importMsg, setImportMsg] = useState("");

  // ✅ NEW: Pending submissions (Admin)
  const [pendingSubs, setPendingSubs] = useState([]);
  const [pendingBusy, setPendingBusy] = useState(false);
  const [pendingMsg, setPendingMsg] = useState("");

  // ✅ EVENTS (Phase 1)
  const [events, setEvents] = useState([]);
  const [eventsBusy, setEventsBusy] = useState(false);
  const [eventsMsg, setEventsMsg] = useState("");

  const authHeader = useMemo(
    () => ({ headers: { Authorization: `Bearer ${token}` } }),
    [token]
  );

  // ✅ Events loader (NEW)
  const fetchEvents = async (cityValue, qValue) => {
    setEventsBusy(true);
    setEventsMsg("");
    try {
      const url =
        `${API}/api/events?city=${encodeURIComponent(
          ((cityValue || "").toLowerCase() || "").trim()
        )}` + (qValue ? `&q=${encodeURIComponent(qValue)}` : "");

      const response = await axios.get(url);
      const data = response.data;
      if (Array.isArray(data)) {
        setEvents(data);
      }else {
        setEvents([]);
      }
      
    } catch (err) {
      setEvents([]);
      setEventsMsg(err?.response?.data?.message || "Events load failed");
    } finally {
      setEventsBusy(false);
    }
  };

  // ✅ Booking function (NEW)
  const bookTicket = async (eventId) => {
    try {
      if (!token) {
        alert("Please login first");
        navigate("/login");
        return;
      }

      const response = await axios.post(
        `${API}/api/tickets/book`,
        { eventId },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      alert("✅ Booked! Ticket added to Orders.");
      navigate("/orders");
    } catch (err) {
      alert(err?.response?.data?.message || "Booking failed");
    }
  };

  // ✅ Google Sheet Import function (NEW)
  const fetchFromSheet = async () => {
    try {
      setImportBusy(true);
      setImportMsg("");

      const sheetId = importSheetId.trim();
      const rowNumber = Number(importRow);

      if (!sheetId || !rowNumber || rowNumber < 2) {
        setImportMsg("Enter valid Sheet ID and Row (>=2)");
        setImportBusy(false);
        return;
      }

      const res = await axios.post(
        `${API}/api/import/google-sheet`,
        { sheetId, rowNumber },
        authHeader
      );

      const d = res.data || {};
      if (d.city) setSelectedCity(d.city);

      // Auto fill admin form
      setName(d.name || "");
      setCategory(d.category || "");
      setAddress(d.address || "");
      setHighlight(d.highlight || "");
      setWhy(d.why || "");

      setTagsInput((d.tags || []).join(", "));
      setActivitiesInput((d.activities || []).join(", "));

      setUrlImages(d.images || []);

      setImportMsg("✅ Imported successfully. Now click Curate.");
    } catch (err) {
      setImportMsg(
        err?.response?.data?.error ||
          err?.response?.data?.message ||
          err?.message ||
          "❌ Import failed"
      );
    } finally {
      setImportBusy(false);
    }
  };

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
    <span
      key={text}
      style={{
        display: "inline-block",
        padding: "4px 10px",
        borderRadius: 999,
        border: "1px solid #e6e6e6",
        background: "#fafafa",
        fontSize: 12,
        marginRight: 6,
        marginTop: 6,
      }}
    >
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

  // ✅ NEW: Admin - fetch pending submissions
  const fetchPendingSubmissions = async () => {
    try {
      setPendingBusy(true);
      setPendingMsg("");
      const res = await axios.get(
        `${API}/api/submissions?status=pending`,
        authHeader
      );
      setPendingSubs(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setPendingSubs([]);
      setPendingMsg(
        err?.response?.data?.message || "Failed to load pending submissions"
      );
    } finally {
      setPendingBusy(false);
    }
  };

  useEffect(() => {
    // ✅ restore immediately so back keeps results
    restoreDashState();
    fetchProfile();
    fetchFavorites();
    // eslint-disable-next-line
  }, []);

  // ✅ When user becomes admin, load pending submissions
  useEffect(() => {
    if (user?.isAdmin) fetchPendingSubmissions();
    // eslint-disable-next-line
  }, [user?.isAdmin]);

  // ✅ Call events whenever city or q changes (NEW)
  useEffect(() => {
    fetchEvents(selectedCity, q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCity, q]);

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

    // Clear results only AFTER we know we will search
    setResults([]);
    setGoogleResults([]);

    const detectedCity = detectCityFromQuery(raw);
    const cityToUse = detectedCity || selectedCity;

    if (
      detectedCity &&
      normalizeCity(detectedCity) !== normalizeCity(selectedCity)
    ) {
      setSelectedCity(detectedCity);
    }

    const keyword = stripCityFromQuery(raw, detectedCity || cityToUse);
    const keywordSafe = keyword || "";
    setQ(keywordSafe);

    // Mongo curated
    try {
      const mongoRes = await axios.get(
        `${API}/api/search?city=${encodeURIComponent(
          normalizeCity(cityToUse)
        )}&q=${encodeURIComponent(keywordSafe)}`,
        authHeader
      );
      const list = mongoRes.data || [];
      setResults(list);
    } catch (err) {
      setMsg(err?.response?.data?.message || "MongoDB search failed");
    }

    // Google
    try {
      const gq = buildGoogleQuery(keywordSafe, cityToUse);
      const googleRes = await axios.get(
        `${API}/api/google?q=${encodeURIComponent(gq)}`,
        authHeader
      );
      const glist = googleRes.data || [];
      setGoogleResults(glist);
    } catch (err) {
      setMsg(
        (prev) => prev || err?.response?.data?.message || "Google search failed"
      );
    }

    // ✅ save after search
    setTimeout(() => {
      saveDashState({
        selectedCity: cityToUse,
        q: keywordSafe,
        scrollY: 0,
      });
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
    return (
      (favList || []).find(
        (b) => (b.placeId || "").trim() === (placeId || "").trim()
      ) || null
    );
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

  // ✅ Import Google -> Mongo (NOTE: backend must set city for new Business)
  const importGooglePlace = async (p) => {
    const res = await axios.post(
      `${API}/api/import-google`,
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
        setMsg(
          "Import worked but Mongo _id not returned. Check /api/import response."
        );
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

    const urls = parts.filter(
      (u) => /^https?:\/\/.+/i.test(u) || u.startsWith("/uploads/")
    );
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
      const merged = [
        ...uploadedUrls,
        ...(urlImages || []),
        ...(imageUrl ? [imageUrl.trim()] : []),
      ]
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
        tags: (tagsInput || "")
          .split(",")
          .map((x) => x.trim())
          .filter(Boolean),
        activities: (activitiesInput || "")
          .split(",")
          .map((x) => x.trim())
          .filter(Boolean),
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

  // ✅ NEW: Admin approve / reject actions
  const approveSubmission = async (id) => {
    try {
      setPendingMsg("");
      await axios.post(`${API}/api/submissions/${id}/approve`, {}, authHeader);

      // remove from pending list instantly
      setPendingSubs((prev) => prev.filter((x) => x._id !== id));
      setPendingMsg("✅ Approved");

      if ((q || "").trim()) {
        searchNow(`${q} in ${selectedCity}`);
      }
    } catch (err) {
      setPendingMsg(err?.response?.data?.message || "Approve failed");
    }
  };

  const rejectSubmission = async (id) => {
    try {
      setPendingMsg("");
      await axios.post(`${API}/api/submissions/${id}/reject`, {}, authHeader);
      setPendingSubs((prev) => prev.filter((x) => x._id !== id));
      setPendingMsg("❌ Rejected");
    } catch (err) {
      setPendingMsg(err?.response?.data?.message || "Reject failed");
    }
  };

  const CityChip = ({ c }) => {
    const active = normalizeCity(c) === normalizeCity(selectedCity);
    return (
      <button
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
        style={{
          padding: "8px 12px",
          borderRadius: 999,
          border: `1px solid ${active ? "#111" : "#ddd"}`,
          background: active ? "#111" : "#fff",
          color: active ? "#fff" : "#111",
          cursor: "pointer",
          whiteSpace: "nowrap",
          fontSize: 13,
        }}
      >
        {c}
      </button>
    );
  };

  const previewUrlForLocal = (file) => URL.createObjectURL(file);

  // ✅ wrapper: save dashboard state before leaving
  const openDetails = (path, state = {}) => {
    saveDashState();
    navigate(path, { state });
  };

  const goSubmit = () => {
    saveDashState();
    navigate("/submit");
  };

  return (
    <div style={{ padding: 20, background: "#f6f7fb", minHeight: "100vh" }}>
      <div
        style={{
          maxWidth: 1040,
          margin: "0 auto",
          background: "#fff",
          borderRadius: 16,
          padding: 18,
          boxShadow: "0 6px 18px rgba(0,0,0,0.06)",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <div>
            <h2 style={{ margin: 0 }}>MoodNest</h2>
            {user ? (
              <p style={{ margin: "6px 0", opacity: 0.85 }}>
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

          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            {!user?.isAdmin ? (
              <button
                onClick={goSubmit}
                style={{
                  padding: "8px 12px",
                  borderRadius: 10,
                  border: "1px solid #ddd",
                  background: "#111",
                  color: "#fff",
                  cursor: "pointer",
                  fontWeight: 800,
                }}
              >
                ➕ Submit a Place
              </button>
            ) : null}

            <button
              onClick={() => {
                sessionStorage.removeItem(DASH_KEY);
                localStorage.removeItem("token");
                window.location.href = "/login";
              }}
              style={{
                padding: "8px 12px",
                borderRadius: 10,
                border: "1px solid #ddd",
                background: "#fff",
                cursor: "pointer",
              }}
            >
              Logout
            </button>
          </div>
        </div>

        {msg ? <p style={{ marginTop: 10 }}>{msg}</p> : null}

        <hr style={{ margin: "16px 0" }} />

        {/* Search */}
        <div>
          <h3 style={{ margin: "0 0 10px 0" }}>Quick Mood Search</h3>

          {/* City Selector */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <span style={{ opacity: 0.8, fontSize: 14 }}>Select City:</span>

              <select
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
                style={{
                  padding: "8px 10px",
                  borderRadius: 12,
                  border: "1px solid #ddd",
                  background: "#fff",
                }}
              >
                {CITY_LIST.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              {!user?.isAdmin ? (
                <button
                  onClick={goSubmit}
                  style={{
                    marginLeft: "auto",
                    padding: "8px 12px",
                    borderRadius: 12,
                    border: "1px solid #ddd",
                    background: "#fff",
                    cursor: "pointer",
                    fontWeight: 800,
                  }}
                >
                  Submit Place →
                </button>
              ) : null}
            </div>

            <div
              style={{
                display: "flex",
                gap: 10,
                overflowX: "auto",
                paddingBottom: 6,
                WebkitOverflowScrolling: "touch",
              }}
            >
              {CITY_LIST.map((c) => (
                <CityChip key={c} c={c} />
              ))}
            </div>
          </div>

          {/* Search bar */}
          <div
            style={{
              display: "flex",
              gap: 10,
              alignItems: "center",
              flexWrap: "wrap",
              marginTop: 10,
            }}
          >
            <div
              style={{
                display: "flex",
                gap: 10,
                width: "100%",
                maxWidth: 720,
                marginLeft: "auto",
                marginRight: "auto",
              }}
            >
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onBlur={() => setTimeout(saveDashState, 0)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") searchNow();
                }}
                placeholder={`Search in ${selectedCity}: cafe, gym, pizza... (or type "cafe in delhi")`}
                style={{
                  flex: 1,
                  minWidth: 0,
                  padding: 12,
                  borderRadius: 14,
                  border: "1px solid #ddd",
                  height: 44,
                  fontSize: 15,
                }}
              />

              <button
                onClick={() => searchNow()}
                style={{
                  padding: "0 16px",
                  height: 44,
                  borderRadius: 14,
                  border: "1px solid #ddd",
                  background: "#111",
                  color: "#fff",
                  cursor: "pointer",
                  fontWeight: 800,
                  whiteSpace: "nowrap",
                }}
              >
                Search
              </button>
            </div>
          </div>

          {/* ✅ Mood buttons */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
            {moods.map((m) => (
              <button
                key={m.label}
                onClick={() => {
                  const randomKeyword = m.keywords[Math.floor(Math.random() * m.keywords.length)];
                  const fullQuery = `${randomKeyword} in ${selectedCity}`;
                  setQ(randomKeyword);
                  searchNow(fullQuery);
                }}
                style={{
                  padding: "8px 14px",
                  borderRadius: 999,
                  border: "1px solid #ddd",
                  background: "#fff",
                  cursor: "pointer",
                  fontWeight: 700,
                }}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        <hr style={{ margin: "18px 0" }} />

        {/* ✅ EVENTS SECTION */}
        <div
          style={{
            marginTop: 14,
            background: "#fff",
            borderRadius: 16,
            padding: 14,
            boxShadow: "0 6px 18px rgba(0,0,0,0.06)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 900 }}>🎟️ Upcoming Events in {selectedCity}</div>
              <div style={{ fontSize: 12.5, opacity: 0.75 }}>BookMyShow-style ticketing (Phase 1)</div>
            </div>

            <button
              onClick={() => fetchEvents(selectedCity, q)}
              style={{
                padding: "8px 12px",
                borderRadius: 12,
                border: "1px solid #ddd",
                background: "#fff",
                cursor: "pointer",
                fontWeight: 900,
              }}
            >
              Refresh
            </button>
          </div>

          {eventsMsg ? (
            <div style={{ marginTop: 10, padding: 10, borderRadius: 12, background: "#fff7e6", border: "1px solid #ffe0b2" }}>
              {eventsMsg}
            </div>
          ) : null}

          {eventsBusy ? (
            <div style={{ marginTop: 12, fontSize: 13, opacity: 0.75 }}>Loading events...</div>
          ) : null}

          {!eventsBusy && (!events || events.length === 0) ? (
            <div style={{ marginTop: 12, fontSize: 13, opacity: 0.75 }}>No events found for this city.</div>
          ) : null}

          {!eventsBusy && events?.length ? (
            <div style={{ marginTop: 12, display: "flex", gap: 12, overflowX: "auto", paddingBottom: 6 }}>
              {events.map((ev) => {
                const canBook = !!ev.isCurated && !!ev.hasTickets;
                const isFree = Number(ev.price || 0) <= 0;

                return (
                  <div
                    key={ev._id}
                    style={{
                      minWidth: 260,
                      maxWidth: 260,
                      border: "1px solid #eee",
                      borderRadius: 16,
                      overflow: "hidden",
                      background: "#fff",
                      flex: "0 0 auto",
                    }}
                  >
                    <div
                      style={{
                        height: 130,
                        background: ev.bannerImage
                          ? `url(${ev.bannerImage}) center/cover no-repeat`
                          : "linear-gradient(135deg,#111,#444)",
                      }}
                    />

                    <div style={{ padding: 12 }}>
                      <div style={{ fontWeight: 900, fontSize: 15, lineHeight: 1.2 }}>{ev.title}</div>
                      <div style={{ marginTop: 6, fontSize: 12.5, opacity: 0.8 }}>
                        {ev.category ? `🎭 ${ev.category}` : "🎭 Event"} {ev.venue ? ` • 📍 ${ev.venue}` : ""}
                      </div>

                      <div style={{ marginTop: 6, fontSize: 12.5, opacity: 0.8 }}>
                        🗓️ {ev.startAt ? new Date(ev.startAt).toLocaleString() : "TBA"}
                      </div>

                      <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                        <div style={{ fontWeight: 900 }}>
                          {isFree ? "FREE" : `₹${Number(ev.price || 0)}`}
                        </div>

                        {canBook ? (
                          <button
                            onClick={() => bookTicket(ev._id)}
                            style={{
                              padding: "9px 10px",
                              borderRadius: 12,
                              border: "1px solid #ddd",
                              background: "#111",
                              color: "#fff",
                              cursor: "pointer",
                              fontWeight: 900,
                              fontSize: 12.5,
                            }}
                          >
                            {isFree ? "Get Pass" : "Book Ticket"}
                          </button>
                        ) : (
                          <div style={{ fontSize: 12.5, opacity: 0.7, fontWeight: 800 }}>Info Only</div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>

        <hr style={{ margin: "18px 0" }} />

        {/* Results */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
          {/* Mongo */}
          <div>
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

                const extraLine =
                  (b.why ? `💡 ${b.why}` : "") + (b.highlight ? `\n🔥 ${b.highlight}` : "");

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
          <div>
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

        <hr style={{ margin: "18px 0" }} />

        {/* Favorites */}
        <h3>Saved / Favorites</h3>
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

        {/* ✅ NEW: Admin Pending Submissions */}
        {user?.isAdmin ? (
          <>
            <hr style={{ margin: "18px 0" }} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
              <h3 style={{ margin: 0 }}>Pending Submissions</h3>
              <button
                onClick={fetchPendingSubmissions}
                disabled={pendingBusy}
                style={{
                  padding: "8px 12px",
                  borderRadius: 12,
                  border: "1px solid #ddd",
                  background: "#fff",
                  cursor: pendingBusy ? "not-allowed" : "pointer",
                  fontWeight: 800,
                  opacity: pendingBusy ? 0.7 : 1,
                }}
              >
                {pendingBusy ? "Refreshing..." : "Refresh"}
              </button>
            </div>

            {pendingMsg ? <p style={{ marginTop: 8 }}>{pendingMsg}</p> : null}

            {pendingSubs.length === 0 ? (
              <p style={{ opacity: 0.7, marginTop: 10 }}>No pending submissions.</p>
            ) : (
              <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                {pendingSubs.map((s) => {
                  const img = (Array.isArray(s.images) && s.images[0]) || "";
                  const imgFull = img
                    ? img.startsWith("/uploads/")
                      ? `${API}${img}`
                      : img
                    : "";

                  return (
                    <div
                      key={s._id}
                      style={{
                        border: "1px solid #eee",
                        borderRadius: 16,
                        padding: 12,
                        background: "#fff",
                        boxShadow: "0 6px 18px rgba(0,0,0,0.04)",
                      }}
                    >
                      <div style={{ display: "flex", gap: 12 }}>
                        <div
                          style={{
                            width: 96,
                            height: 72,
                            borderRadius: 12,
                            overflow: "hidden",
                            background: "#f3f3f3",
                            border: "1px solid #eee",
                            flex: "0 0 auto",
                          }}
                        >
                          {imgFull ? (
                            <img
                              src={imgFull}
                              alt=""
                              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                            />
                          ) : null}
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 900, fontSize: 14, marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {s.name || "Untitled"}
                          </div>
                          <div style={{ fontSize: 12.5, opacity: 0.85 }}>
                            <b>City:</b> {s.city || "-"}
                          </div>
                          <div style={{ fontSize: 12.5, opacity: 0.85, marginTop: 2 }}>
                            <b>Category:</b> {s.category || "-"}
                          </div>
                          <div style={{ fontSize: 12.5, opacity: 0.75, marginTop: 2 }}>
                            {s.address || ""}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
                        <button
                          onClick={() => approveSubmission(s._id)}
                          style={{
                            flex: 1,
                            padding: "10px 12px",
                            borderRadius: 12,
                            border: "1px solid #ddd",
                            background: "#111",
                            color: "#fff",
                            cursor: "pointer",
                            fontWeight: 900,
                          }}
                        >
                          ✅ Approve
                        </button>
                        <button
                          onClick={() => rejectSubmission(s._id)}
                          style={{
                            flex: 1,
                            padding: "10px 12px",
                            borderRadius: 12,
                            border: "1px solid #ddd",
                            background: "#fff",
                            cursor: "pointer",
                            fontWeight: 900,
                          }}
                        >
                          ❌ Reject
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        ) : null}

        {/* Admin form */}
        {user?.isAdmin ? (
          <>
            <hr style={{ margin: "18px 0" }} />
            <h3>Add Recommended Place (Only For Admin)</h3>

            <p style={{ marginTop: 0, opacity: 0.8, fontSize: 13 }}>
              City for this curated card: <b>{selectedCity}</b>
            </p>

            <form onSubmit={addBusiness} style={{ maxWidth: 760 }}>
              {/* ✅ Import from Google Form (Sheet) */}
              <div
                style={{
                  padding: 14,
                  borderRadius: 14,
                  border: "1px solid rgba(0,0,0,0.12)",
                  background: "#f7f8ff",
                  marginBottom: 14,
                }}
              >
                <div style={{ fontWeight: 900, marginBottom: 8 }}>Import from Google Form (Sheet)</div>

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <input
                    value={importSheetId}
                    onChange={(e) => setImportSheetId(e.target.value)}
                    placeholder="Paste Sheet ID (between /d/ and /edit)"
                    style={{
                      flex: "1 1 360px",
                      padding: "10px 12px",
                      borderRadius: 12,
                      border: "1px solid #ddd",
                      background: "#fff",
                      outline: "none",
                    }}
                  />

                  <input
                    type="number"
                    min={2}
                    value={importRow}
                    onChange={(e) => setImportRow(e.target.value)}
                    placeholder="Row"
                    style={{
                      width: 120,
                      padding: "10px 12px",
                      borderRadius: 12,
                      border: "1px solid #ddd",
                      background: "#fff",
                      outline: "none",
                    }}
                  />

                  <button
                    type="button"
                    onClick={fetchFromSheet}
                    disabled={importBusy}
                    style={{
                      padding: "10px 14px",
                      borderRadius: 12,
                      border: "none",
                      fontWeight: 900,
                      background: "#111",
                      color: "#fff",
                      cursor: importBusy ? "not-allowed" : "pointer",
                      opacity: importBusy ? 0.7 : 1,
                    }}
                  >
                    {importBusy ? "Fetching..." : "Fetch"}
                  </button>
                </div>

                {importMsg ? <div style={{ marginTop: 10, fontWeight: 700 }}>{importMsg}</div> : null}
              </div>

              {/* Basic */}
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Place name (required)"
                  style={{
                    flex: 1,
                    minWidth: 260,
                    padding: 10,
                    marginBottom: 10,
                    borderRadius: 12,
                    border: "1px solid #ddd",
                  }}
                />

                <select
                  value={emoji}
                  onChange={(e) => setEmoji(e.target.value)}
                  style={{
                    width: 120,
                    padding: 10,
                    marginBottom: 10,
                    borderRadius: 12,
                    border: "1px solid #ddd",
                  }}
                >
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

                <select
                  value={vibe}
                  onChange={(e) => setVibe(e.target.value)}
                  style={{
                    width: 180,
                    padding: 10,
                    marginBottom: 10,
                    borderRadius: 12,
                    border: "1px solid #ddd",
                  }}
                >
                  <option value="Hidden Gems">💎 Hidden Gems</option>
                  <option value="Top Rated">⭐ Top Rated</option>
                  <option value="Trending Now">🔥 Trending Now</option>
                  <option value="Peaceful Spots">🌿 Peaceful Spots</option>
                  <option value="Work Friendly">💻 Work Friendly</option>
                  <option value="Date Spots">❤️ Date Spots</option>
                  <option value="Weekend Fun">🎉 Weekend Fun</option>
                </select>
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <input
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="Category (Cafe/Gym/Restaurant)"
                  style={{
                    flex: 1,
                    minWidth: 220,
                    padding: 10,
                    marginBottom: 10,
                    borderRadius: 12,
                    border: "1px solid #ddd",
                  }}
                />

                <select
                  value={rating}
                  onChange={(e) => setRating(e.target.value)}
                  style={{
                    width: 180,
                    padding: 10,
                    marginBottom: 10,
                    borderRadius: 12,
                    border: "1px solid #ddd",
                  }}
                >
                  <option value="">⭐ Any Rating</option>
                  <option value="4.5">⭐ 4.5+ Best Rated</option>
                  <option value="4.0">⭐ 4.0+ Rising Star</option>
                  <option value="3.5">⭐ 3.5+ Good</option>
                  <option value="3.0">⭐ 3.0+ Average</option>
                </select>

                <select
                  value={priceLevel}
                  onChange={(e) => setPriceLevel(e.target.value)}
                  style={{
                    width: 160,
                    padding: 10,
                    marginBottom: 10,
                    borderRadius: 12,
                    border: "1px solid #ddd",
                  }}
                >
                  <option value="Essential">Essential ⚡</option>
                  <option value="Signature">Signature 🌟</option>
                  <option value="Elite">Elite 👑</option>
                </select>

                <select
                  value={bestTime}
                  onChange={(e) => setBestTime(e.target.value)}
                  style={{
                    width: 170,
                    padding: 10,
                    marginBottom: 10,
                    borderRadius: 12,
                    border: "1px solid #ddd",
                  }}
                >
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
                style={{
                  width: "100%",
                  padding: 10,
                  marginBottom: 10,
                  borderRadius: 12,
                  border: "1px solid #ddd",
                }}
              />

              {/* Multi photo */}
              <div
                style={{
                  border: "1px solid #e9e9e9",
                  borderRadius: 16,
                  padding: 12,
                  marginBottom: 12,
                  background: "#fafafa",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontWeight: 900, marginBottom: 4 }}>Photos (multiple)</div>
                    <div style={{ fontSize: 12.5, opacity: 0.75 }}>Add local photos (upload) + photo URLs.</div>
                  </div>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      padding: "9px 12px",
                      borderRadius: 12,
                      border: "1px solid #ddd",
                      background: "#fff",
                      cursor: "pointer",
                      fontWeight: 700,
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

                  <div style={{ display: "flex", gap: 10, marginTop: 8, flexWrap: "wrap" }}>
                    <button
                      type="button"
                      onClick={() => {
                        const urls = parseUrls(urlInput);
                        setUrlImages(urls);
                        setMsg(urls.length ? `✅ Added ${urls.length} URL images` : "No valid URLs found");
                      }}
                      style={{
                        padding: "9px 12px",
                        borderRadius: 12,
                        border: "1px solid #ddd",
                        background: "#111",
                        color: "#fff",
                        cursor: "pointer",
                        fontWeight: 800,
                      }}
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
                        padding: "9px 12px",
                        borderRadius: 12,
                        border: "1px solid #ddd",
                        background: "#fff",
                        cursor: "pointer",
                        fontWeight: 700,
                      }}
                    >
                      Clear URLs
                    </button>

                    {uploading ? (
                      <span style={{ fontSize: 13, opacity: 0.8, alignSelf: "center" }}>Uploading...</span>
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

              {/* optional old fields */}
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <input
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="(Optional) Single Image URL (old field)"
                  style={{
                    flex: 1,
                    minWidth: 260,
                    padding: 10,
                    marginBottom: 10,
                    borderRadius: 12,
                    border: "1px solid #ddd",
                  }}
                />
                <input
                  value={photoRef}
                  onChange={(e) => setPhotoRef(e.target.value)}
                  placeholder="(Optional) Google photoRef (old field)"
                  style={{
                    flex: 1,
                    minWidth: 260,
                    padding: 10,
                    marginBottom: 10,
                    borderRadius: 12,
                    border: "1px solid #ddd",
                  }}
                />
              </div>

              <input
                value={why}
                onChange={(e) => setWhy(e.target.value)}
                placeholder="Why recommended? (e.g. Calm music + perfect for study)"
                style={{
                  width: "100%",
                  padding: 10,
                  marginBottom: 10,
                  borderRadius: 12,
                  border: "1px solid #ddd",
                }}
              />

              <input
                value={highlight}
                onChange={(e) => setHighlight(e.target.value)}
                placeholder="Highlight / Must try (e.g. Cold coffee, Pasta)"
                style={{
                  width: "100%",
                  padding: 10,
                  marginBottom: 10,
                  borderRadius: 12,
                  border: "1px solid #ddd",
                }}
              />

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <input
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="Tags (comma): Study, Aesthetic, Quiet"
                  style={{
                    flex: 1,
                    minWidth: 260,
                    padding: 10,
                    marginBottom: 10,
                    borderRadius: 12,
                    border: "1px solid #ddd",
                  }}
                />
                <input
                  value={activitiesInput}
                  onChange={(e) => setActivitiesInput(e.target.value)}
                  placeholder="Activities (comma): Open mic, Board games"
                  style={{
                    flex: 1,
                    minWidth: 260,
                    padding: 10,
                    marginBottom: 10,
                    borderRadius: 12,
                    border: "1px solid #ddd",
                  }}
                />
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <input
                  type="checkbox"
                  checked={instagrammable}
                  onChange={(e) => setInstagrammable(e.target.checked)}
                />
                <span style={{ fontSize: 14 }}>📸 Instagrammable</span>
              </div>

              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Location (optional)"
                style={{
                  width: "100%",
                  padding: 10,
                  marginBottom: 10,
                  borderRadius: 12,
                  border: "1px solid #ddd",
                }}
              />

              <button
                type="submit"
                disabled={uploading}
                style={{
                  padding: "10px 14px",
                  borderRadius: 12,
                  border: "1px solid #ddd",
                  background: uploading ? "#666" : "#111",
                  color: "#fff",
                  cursor: uploading ? "not-allowed" : "pointer",
                  fontWeight: 900,
                }}
              >
                {uploading ? "Uploading..." : "Add Curated Place"}
              </button>

              <p style={{ marginTop: 8, fontSize: 12, opacity: 0.7 }}>
                Tip: Add photos using file upload or multiple URLs.
              </p>
            </form>
          </>
        ) : null}
      </div>
    </div>
  );
};

export default Dashboard;