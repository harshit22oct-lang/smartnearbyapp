import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import PlaceCard from "../components/PlaceCard";

const DASH_KEY = "mn_dashboard_state_v1";
const SAVE_TTL_MS = 2 * 60 * 60 * 1000;

const clamp = (lines) => ({
  display: "-webkit-box",
  WebkitLineClamp: lines,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
});

const Dashboard = () => {
  const navigate = useNavigate();

  // ✅ IMPORTANT: keep API inside component so hooks deps are valid (fixes Vercel CI ESLint)
  const apiBase = useMemo(() => process.env.REACT_APP_API_URL || "", []);

  const token = useMemo(() => localStorage.getItem("token"), []);
  const isBrowser = typeof window !== "undefined";

  const authHeader = useMemo(() => {
    if (!token) return null;
    return { headers: { Authorization: `Bearer ${token}` } };
  }, [token]);

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

  // ----------------
  // State
  // ----------------
  const [user, setUser] = useState(null);

  const [selectedCity, setSelectedCity] = useState("Bhopal");
  const [q, setQ] = useState("");

  const [results, setResults] = useState([]);
  const [googleResults, setGoogleResults] = useState([]);

  const [favIds, setFavIds] = useState([]);
  const [favPlaceIds, setFavPlaceIds] = useState([]);
  const [favList, setFavList] = useState([]);

  const [msg, setMsg] = useState("");

  // Events
  const [events, setEvents] = useState([]);
  const [eventsBusy, setEventsBusy] = useState(false);
  const [eventsMsg, setEventsMsg] = useState("");

  // Admin: pending submissions list
  const [pendingSubs, setPendingSubs] = useState([]);
  const [pendingBusy, setPendingBusy] = useState(false);
  const [pendingMsg, setPendingMsg] = useState("");

  // Orders / purchase history
  const [orders, setOrders] = useState([]);
  const [ordersBusy, setOrdersBusy] = useState(false);
  const [ordersMsg, setOrdersMsg] = useState("");

  // My submissions
  const [mySubs, setMySubs] = useState([]);
  const [mySubsBusy, setMySubsBusy] = useState(false);
  const [mySubsMsg, setMySubsMsg] = useState("");

  // Profile tabs
  const [profileTab, setProfileTab] = useState("profile"); // profile | activity | orders | submissions

  // Admin curated form
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [address, setAddress] = useState("");
  const [rating, setRating] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [photoRef, setPhotoRef] = useState("");
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

  // Multi photos
  const fileInputRef = useRef(null);
  const [localFiles, setLocalFiles] = useState([]);
  const [urlInput, setUrlInput] = useState("");
  const [urlImages, setUrlImages] = useState([]);
  const [uploading, setUploading] = useState(false);

  // Admin: sheet import
  const [importSheetId, setImportSheetId] = useState("");
  const [importRow, setImportRow] = useState(2);
  const [importBusy, setImportBusy] = useState(false);
  const [importMsg, setImportMsg] = useState("");

  // ✅ Premium profile upload
  const profileInputRef = useRef(null);
  const [profileFile, setProfileFile] = useState(null);
  const [profilePreview, setProfilePreview] = useState("");
  const [profileDragging, setProfileDragging] = useState(false);
  const [profileUploading, setProfileUploading] = useState(false);
  const [profileProgress, setProfileProgress] = useState(0);
  const [profileMsg, setProfileMsg] = useState("");

  // ✅ Admin edit modal (curated + pending)
  const [editOpen, setEditOpen] = useState(false);
  const [editType, setEditType] = useState(""); // "curated" | "pending"
  const [editBusy, setEditBusy] = useState(false);
  const [editMsg, setEditMsg] = useState("");

  const [editId, setEditId] = useState("");
  const [editPayload, setEditPayload] = useState({
    city: "",
    name: "",
    category: "",
    address: "",
    location: "",
    rating: "",
    images: [],
    emoji: "✨",
    vibe: "",
    priceLevel: "",
    bestTime: "",
    instagrammable: false,
    tags: [],
    activities: [],
    why: "",
    highlight: "",
    instagram: "",
  });

  // ----------------
  // Helpers
  // ----------------
  const normalizeCity = useCallback((s) => (s || "").trim().toLowerCase(), []);

  const resolveUploadUrl = useCallback(
    (u) => {
      const s = String(u || "").trim();
      if (!s) return "";
      if (s.startsWith("/uploads/")) return `${apiBase}${s}`;
      return s;
    },
    [apiBase]
  );

  const detectCityFromQuery = useCallback(
    (raw) => {
      const text = (raw || "").toLowerCase();
      const found = CITY_LIST.find((c) => text.includes(normalizeCity(c)));
      return found || null;
    },
    [CITY_LIST, normalizeCity]
  );

  const stripCityFromQuery = useCallback(
    (raw, cityName) => {
      if (!raw) return "";
      if (!cityName) return raw.trim();
      const cityLower = normalizeCity(cityName);
      let t = raw.toLowerCase();
      t = t.replace(new RegExp(`\\bin\\s+${cityLower}\\b`, "gi"), " ");
      t = t.replace(new RegExp(`\\b${cityLower}\\b`, "gi"), " ");
      return t.replace(/\s+/g, " ").trim();
    },
    [normalizeCity]
  );

  const buildGoogleQuery = useCallback((keyword, cityName) => {
    const k = (keyword || "").trim();
    const c = (cityName || "").trim();
    if (!k && !c) return "";
    if (!k) return c;
    if (!c) return k;
    return `${k} ${c}`;
  }, []);

  const googleImg = useCallback(
    (ref) => {
      if (!ref) return "";
      return `${apiBase}/api/google/photo?photoRef=${encodeURIComponent(ref)}`;
    },
    [apiBase]
  );

  const mongoImg = useCallback(
    (b) => {
      const imgs = Array.isArray(b?.images) ? b.images.filter(Boolean) : [];
      if (imgs.length > 0) return resolveUploadUrl(imgs[0]);
      if (b?.photoRef) return googleImg(b.photoRef);
      if (b?.imageUrl) return b.imageUrl;
      return "";
    },
    [googleImg, resolveUploadUrl]
  );

  const chip = useCallback((text) => {
    if (!text) return null;
    return (
      <span
        key={text}
        style={{
          display: "inline-block",
          padding: "4px 10px",
          borderRadius: 999,
          border: "1px solid rgba(0,0,0,0.10)",
          background: "rgba(255,255,255,0.7)",
          fontSize: 12,
          marginRight: 6,
          marginTop: 6,
          backdropFilter: "blur(6px)",
        }}
      >
        {text}
      </span>
    );
  }, []);

  // ----------------
  // Save / Restore
  // ----------------
  const saveDashState = useCallback(
    (override = {}) => {
      if (!isBrowser) return;
      try {
        const payload = {
          selectedCity,
          q,
          results,
          googleResults,
          scrollY: window.scrollY || 0,
          ts: Date.now(),
          ...override,
        };
        sessionStorage.setItem(DASH_KEY, JSON.stringify(payload));
      } catch {}
    },
    [isBrowser, selectedCity, q, results, googleResults]
  );

  const restoreDashState = useCallback(() => {
    if (!isBrowser) return false;
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
  }, [isBrowser]);

  // ----------------
  // Loaders
  // ----------------
  const fetchProfile = useCallback(async () => {
    if (!apiBase) return;
    if (!authHeader) {
      localStorage.removeItem("token");
      if (isBrowser) window.location.href = "/login";
      return;
    }
    try {
      const res = await axios.get(`${apiBase}/api/auth/profile`, authHeader);
      setUser(res.data);
    } catch {
      localStorage.removeItem("token");
      if (isBrowser) window.location.href = "/login";
    }
  }, [apiBase, authHeader, isBrowser]);

  const fetchFavorites = useCallback(async () => {
    if (!apiBase) return;
    if (!authHeader) {
      setFavList([]);
      setFavIds([]);
      setFavPlaceIds([]);
      return;
    }
    try {
      const res = await axios.get(`${apiBase}/api/favorites`, authHeader);
      const list = res.data || [];
      setFavList(list);
      setFavIds(list.map((b) => b._id));
      setFavPlaceIds(list.map((b) => (b.placeId || "").trim()).filter(Boolean));
    } catch {
      setFavList([]);
      setFavIds([]);
      setFavPlaceIds([]);
    }
  }, [apiBase, authHeader]);

  const fetchPendingSubmissions = useCallback(async () => {
    if (!apiBase || !authHeader) return;
    try {
      setPendingBusy(true);
      setPendingMsg("");
      const res = await axios.get(`${apiBase}/api/submissions?status=pending`, authHeader);
      setPendingSubs(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setPendingSubs([]);
      setPendingMsg(err?.response?.data?.message || "Failed to load pending submissions");
    } finally {
      setPendingBusy(false);
    }
  }, [apiBase, authHeader]);

  const fetchOrders = useCallback(async () => {
    if (!apiBase || !authHeader) return;
    try {
      setOrdersBusy(true);
      setOrdersMsg("");
      const res = await axios.get(`${apiBase}/api/tickets/mine`, authHeader);
      setOrders(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setOrders([]);
      setOrdersMsg(err?.response?.data?.message || "Failed to load orders");
    } finally {
      setOrdersBusy(false);
    }
  }, [apiBase, authHeader]);

  const fetchMySubmissions = useCallback(async () => {
    if (!apiBase || !authHeader) return;
    try {
      setMySubsBusy(true);
      setMySubsMsg("");
      const res = await axios.get(`${apiBase}/api/submissions/mine`, authHeader);
      setMySubs(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setMySubs([]);
      setMySubsMsg(err?.response?.data?.message || "Failed to load my submissions");
    } finally {
      setMySubsBusy(false);
    }
  }, [apiBase, authHeader]);

  const fetchEvents = useCallback(
    async (cityValue, qValue) => {
      if (!apiBase) return;
      setEventsBusy(true);
      setEventsMsg("");
      try {
        const cityQ = encodeURIComponent(((cityValue || "").toLowerCase() || "").trim());
        const qq = (qValue || "").trim();
        const url = `${apiBase}/api/events?city=${cityQ}` + (qq ? `&q=${encodeURIComponent(qq)}` : "");
        const response = await axios.get(url);
        const data = response.data;
        setEvents(Array.isArray(data) ? data : []);
      } catch (err) {
        setEvents([]);
        setEventsMsg(err?.response?.data?.message || "Events load failed");
      } finally {
        setEventsBusy(false);
      }
    },
    [apiBase]
  );

  // ----------------
  // Premium Profile Upload
  // ----------------
  const pickProfileFile = useCallback(
    (f) => {
      if (!f) return;

      if (!/^image\/(jpeg|jpg|png|webp|gif)$/i.test(f.type || "")) {
        setProfileMsg("Only image files allowed (jpg, png, webp, gif)");
        return;
      }
      if (f.size > 8 * 1024 * 1024) {
        setProfileMsg("Image must be <= 8MB");
        return;
      }

      setProfileMsg("");
      setProfileFile(f);

      try {
        if (profilePreview) URL.revokeObjectURL(profilePreview);
      } catch {}

      const prev = URL.createObjectURL(f);
      setProfilePreview(prev);
    },
    [profilePreview]
  );

  const clearProfilePick = useCallback(() => {
    try {
      if (profilePreview) URL.revokeObjectURL(profilePreview);
    } catch {}
    setProfilePreview("");
    setProfileFile(null);
    setProfileMsg("");
    setProfileProgress(0);
  }, [profilePreview]);

  const uploadProfileNow = useCallback(async () => {
    if (!apiBase) {
      setProfileMsg("API missing. Set REACT_APP_API_URL in Vercel.");
      return;
    }
    if (!token) {
      alert("Please login first");
      navigate("/login");
      return;
    }
    if (!profileFile) {
      setProfileMsg("Choose an image first");
      return;
    }

    setProfileUploading(true);
    setProfileMsg("");
    setProfileProgress(0);

    try {
      const fd = new FormData();
      fd.append("image", profileFile);

      const res = await axios.post(`${apiBase}/api/upload/profile`, fd, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
        onUploadProgress: (evt) => {
          const total = evt.total || 0;
          const loaded = evt.loaded || 0;
          if (!total) return;
          const pct = Math.max(0, Math.min(100, Math.round((loaded / total) * 100)));
          setProfileProgress(pct);
        },
      });

      const url = res.data?.url || "";
      if (!url) {
        setProfileMsg("Upload done but url not returned.");
        return;
      }

      setUser((prev) => ({ ...(prev || {}), profilePicture: url }));
      setProfileMsg("✅ Profile photo updated");
      clearProfilePick();
    } catch (err) {
      setProfileMsg(err?.response?.data?.message || "Profile upload failed");
    } finally {
      setProfileUploading(false);
      setTimeout(() => setProfileProgress(0), 800);
    }
  }, [apiBase, clearProfilePick, navigate, profileFile, token]);

  const profilePhotoUrl = useMemo(() => {
    const u = user?.profilePicture || "";
    return resolveUploadUrl(u);
  }, [resolveUploadUrl, user?.profilePicture]);

  // ----------------
  // Search
  // ----------------
  const searchNow = useCallback(
    async (overrideRawQuery) => {
      if (!apiBase) {
        setMsg("API URL missing. Set REACT_APP_API_URL in Vercel env.");
        return;
      }
      if (!authHeader) {
        setMsg("Please login again.");
        navigate("/login");
        return;
      }

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
          `${apiBase}/api/search?city=${encodeURIComponent(normalizeCity(cityToUse))}&q=${encodeURIComponent(
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
        const googleRes = await axios.get(`${apiBase}/api/google?q=${encodeURIComponent(gq)}`, authHeader);
        setGoogleResults(googleRes.data || []);
      } catch (err) {
        setMsg((prev) => prev || err?.response?.data?.message || "Google search failed");
      }

      setTimeout(() => {
        saveDashState({ selectedCity: cityToUse, q: keywordSafe, scrollY: 0 });
        if (isBrowser) window.scrollTo(0, 0);
      }, 0);
    },
    [
      apiBase,
      authHeader,
      buildGoogleQuery,
      detectCityFromQuery,
      isBrowser,
      navigate,
      normalizeCity,
      q,
      saveDashState,
      selectedCity,
      stripCityFromQuery,
    ]
  );

  // ----------------
  // Favorites
  // ----------------
  const isFav = useCallback((id) => favIds.includes(id), [favIds]);

  const isGoogleSaved = useCallback(
    (placeId) => {
      if (!placeId) return false;
      return favPlaceIds.includes(placeId);
    },
    [favPlaceIds]
  );

  const findFavoriteBusinessByPlaceId = useCallback(
    (placeId) => {
      if (!placeId) return null;
      return (favList || []).find((b) => (b.placeId || "").trim() === (placeId || "").trim()) || null;
    },
    [favList]
  );

  const toggleFavorite = useCallback(
    async (businessId) => {
      if (!apiBase || !authHeader) return;
      setMsg("");
      try {
        await axios.post(`${apiBase}/api/favorites/${businessId}`, {}, authHeader);
        await fetchFavorites();
        setTimeout(saveDashState, 0);
      } catch (err) {
        setMsg(err?.response?.data?.message || "Favorite update failed");
      }
    },
    [apiBase, authHeader, fetchFavorites, saveDashState]
  );

  const deleteCurated = useCallback(
    async (id) => {
      if (!apiBase || !authHeader) return;
      setMsg("");
      try {
        await axios.delete(`${apiBase}/api/search/${id}`, authHeader);
        setMsg("✅ Deleted successfully");
        setResults((prev) => prev.filter((x) => x._id !== id));
        await fetchFavorites();
        setTimeout(saveDashState, 0);
      } catch (err) {
        setMsg(err?.response?.data?.message || "Delete failed");
      }
    },
    [apiBase, authHeader, fetchFavorites, saveDashState]
  );

  const importGooglePlace = useCallback(
    async (p) => {
      const res = await axios.post(
        `${apiBase}/api/import-google`,
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
    },
    [apiBase, authHeader, normalizeCity, selectedCity]
  );

  const toggleGoogleSave = useCallback(
    async (p) => {
      if (!apiBase || !authHeader) return;
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
          await axios.post(`${apiBase}/api/favorites/${favDoc._id}`, {}, authHeader);
          await fetchFavorites();
          setMsg("❌ Removed from favorites");
          setTimeout(saveDashState, 0);
          return;
        }

        const business = await importGooglePlace(p);
        if (!business?._id) {
          setMsg("Import worked but Mongo _id not returned. Check /api/import-google response.");
          return;
        }

        await axios.post(`${apiBase}/api/favorites/${business._id}`, {}, authHeader);
        await fetchFavorites();
        setMsg("✅ Saved from Google!");
        setTimeout(saveDashState, 0);
      } catch (err) {
        setMsg(err?.response?.data?.message || "Save/Unsave failed");
      }
    },
    [apiBase, authHeader, fetchFavorites, findFavoriteBusinessByPlaceId, importGooglePlace, isGoogleSaved, saveDashState]
  );

  // -------------------------
  // Admin: image helpers
  // -------------------------
  const parseUrls = useCallback((raw) => {
    const txt = String(raw || "");
    const parts = txt
      .split(/[\n,]+/g)
      .map((x) => x.trim())
      .filter(Boolean);

    const urls = parts.filter((u) => /^https?:\/\/.+/i.test(u) || u.startsWith("/uploads/"));
    return Array.from(new Set(urls));
  }, []);

  const onPickFiles = useCallback((files) => {
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
  }, []);

  const uploadLocalFiles = useCallback(async () => {
    if (!apiBase) throw new Error("API URL missing");
    if (!token) throw new Error("No token");
    if (!localFiles.length) return [];

    setUploading(true);
    try {
      const formData = new FormData();
      localFiles.forEach((f) => formData.append("images", f));

      const res = await axios.post(`${apiBase}/api/upload`, formData, {
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
  }, [apiBase, localFiles, token]);

  const addBusiness = useCallback(
    async (e) => {
      e.preventDefault();
      if (!apiBase || !authHeader) return;

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

        const res = await axios.post(`${apiBase}/api/search`, payload, authHeader);
        setMsg("✅ Curated place added!");
        setResults((prev) => [res.data, ...prev]);

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
    },
    [
      apiBase,
      activitiesInput,
      address,
      authHeader,
      category,
      emoji,
      highlight,
      imageUrl,
      instagrammable,
      location,
      name,
      normalizeCity,
      photoRef,
      priceLevel,
      rating,
      saveDashState,
      selectedCity,
      tagsInput,
      uploadLocalFiles,
      uploading,
      urlImages,
      vibe,
      bestTime,
      why,
    ]
  );

  // Admin: approve / reject submissions
  const approveSubmission = useCallback(
    async (id) => {
      if (!apiBase || !authHeader) return;
      try {
        setPendingMsg("");
        await axios.post(`${apiBase}/api/submissions/${id}/approve`, {}, authHeader);
        setPendingSubs((prev) => prev.filter((x) => x._id !== id));
        setPendingMsg("✅ Approved");
        setEditOpen(false);

        if ((q || "").trim()) {
          await searchNow(`${q} in ${selectedCity}`);
        }
      } catch (err) {
        setPendingMsg(err?.response?.data?.message || "Approve failed");
      }
    },
    [apiBase, authHeader, q, searchNow, selectedCity]
  );

  const rejectSubmission = useCallback(
    async (id) => {
      if (!apiBase || !authHeader) return;
      try {
        setPendingMsg("");
        await axios.post(`${apiBase}/api/submissions/${id}/reject`, {}, authHeader);
        setPendingSubs((prev) => prev.filter((x) => x._id !== id));
        setPendingMsg("❌ Rejected");
        setEditOpen(false);
      } catch (err) {
        setPendingMsg(err?.response?.data?.message || "Reject failed");
      }
    },
    [apiBase, authHeader]
  );

  // ✅ Step 5: Ticket booking (PROFILE_REQUIRED)
  const bookTicket = useCallback(
    async (eventId) => {
      try {
        if (!token) {
          alert("Please login first");
          navigate("/login");
          return;
        }

        await axios.post(
          `${apiBase}/api/tickets/book`,
          { eventId },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        alert("✅ Booked! Ticket added to Orders.");
        setProfileTab("orders");
        await fetchOrders();
        window.scrollTo(0, 0);
      } catch (err) {
        if (err?.response?.data?.code === "PROFILE_REQUIRED") {
          alert("Please upload profile picture first");
          navigate("/dashboard");
          setProfileTab("profile");
          window.scrollTo(0, 0);
        } else {
          alert(err?.response?.data?.message || "Booking failed");
        }
      }
    },
    [apiBase, fetchOrders, navigate, token]
  );

  // Navigation helpers
  const openDetails = useCallback(
    (path, state = {}) => {
      saveDashState();
      navigate(path, { state });
    },
    [navigate, saveDashState]
  );

  const goSubmit = useCallback(() => {
    saveDashState();
    navigate("/submit");
  }, [navigate, saveDashState]);

  // ----------------
  // ✅ Admin edit modal helpers
  // ----------------
  const openEditModal = useCallback(
    async (type, id, fallbackObj) => {
      if (!apiBase || !authHeader) return;

      setEditOpen(true);
      setEditType(type);
      setEditId(id);
      setEditBusy(true);
      setEditMsg("");

      try {
        let data = fallbackObj || null;

        if (type === "pending") {
          const res = await axios.get(`${apiBase}/api/submissions/${id}`, authHeader);
          data = res.data;
        }

        const d = data || {};

        setEditPayload({
          city: d.city || "",
          name: d.name || "",
          category: d.category || "",
          address: d.address || "",
          location: d.location || "",
          rating: d.rating === null || d.rating === undefined ? "" : String(d.rating),
          images: Array.isArray(d.images) ? d.images.filter(Boolean) : [],
          emoji: d.emoji || "✨",
          vibe: d.vibe || "",
          priceLevel: d.priceLevel || "",
          bestTime: d.bestTime || "",
          instagrammable: !!d.instagrammable,
          tags: Array.isArray(d.tags) ? d.tags : [],
          activities: Array.isArray(d.activities) ? d.activities : [],
          why: d.why || "",
          highlight: d.highlight || "",
          instagram: d.instagram || "",
        });
      } catch (e) {
        setEditMsg(e?.response?.data?.message || "Failed to load details");
      } finally {
        setEditBusy(false);
      }
    },
    [apiBase, authHeader]
  );

  const closeEditModal = useCallback(() => {
    setEditOpen(false);
    setEditType("");
    setEditId("");
    setEditMsg("");
    setEditBusy(false);
  }, []);

  const saveEdit = useCallback(async () => {
    if (!apiBase || !authHeader) return;
    if (!editId || !editType) return;

    setEditBusy(true);
    setEditMsg("");

    try {
      const payload = {
        ...editPayload,
        rating: editPayload.rating === "" ? null : Number(editPayload.rating),
      };

      if (editType === "pending") {
        const res = await axios.put(`${apiBase}/api/submissions/${editId}`, payload, authHeader);
        const updated = res.data;

        setPendingSubs((prev) => prev.map((x) => (x._id === editId ? updated : x)));
        setEditMsg("✅ Saved (Pending updated)");
        return;
      }

      if (editType === "curated") {
        const res = await axios.put(`${apiBase}/api/search/${editId}`, payload, authHeader);
        const updated = res.data;

        setResults((prev) => prev.map((x) => (x._id === editId ? updated : x)));
        setFavList((prev) => prev.map((x) => (x._id === editId ? updated : x)));
        setEditMsg("✅ Saved (Curated updated)");
        return;
      }
    } catch (e) {
      setEditMsg(e?.response?.data?.message || "Save failed");
    } finally {
      setEditBusy(false);
    }
  }, [apiBase, authHeader, editId, editPayload, editType]);

  // ----------------
  // Moods
  // ----------------
  const moods = useMemo(
    () => [
      {
        label: "Romantic 👀💕",
        keywords: ["romantic restaurant", "rooftop dining", "couple cafe", "fine dining", "sunset point", "candle light dinner"],
      },
      { label: "Cozy ☕🍂", keywords: ["cozy places", "coffee shop", "book cafe", "quiet restaurant", "tea house", "art cafe", "bakery"] },
      { label: "Alone 🌙", keywords: ["quiet place", "study cafe", "library", "peaceful park", "work cafe", "reading cafe"] },
      { label: "Nature ⛰️🍃", keywords: ["park", "lake view", "garden", "nature spot", "sunset point"] },
      { label: "Budget 💸", keywords: ["cheap food", "budget cafe", "street food", "affordable restaurant", "thali"] },
      { label: "Date Night 🍽️", keywords: ["fine dining", "romantic dinner", "rooftop restaurant", "candle light dinner", "live music restaurant"] },
    ],
    []
  );

  // ----------------
  // Effects
  // ----------------
  useEffect(() => {
    restoreDashState();
    fetchProfile();
    fetchFavorites();
    fetchOrders();
    fetchMySubmissions();
  }, [restoreDashState, fetchProfile, fetchFavorites, fetchOrders, fetchMySubmissions]);

  useEffect(() => {
    if (user?.isAdmin) fetchPendingSubmissions();
  }, [user?.isAdmin, fetchPendingSubmissions]);

  useEffect(() => {
    fetchEvents(selectedCity, q);
  }, [fetchEvents, selectedCity, q]);

  // ----------------
  // UI components
  // ----------------
  const CityChip = useCallback(
    ({ c }) => {
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
            border: `1px solid ${active ? "#111" : "rgba(0,0,0,0.14)"}`,
            background: active ? "#111" : "rgba(255,255,255,0.7)",
            color: active ? "#fff" : "#111",
            cursor: "pointer",
            whiteSpace: "nowrap",
            fontSize: 13,
            backdropFilter: "blur(8px)",
          }}
        >
          {c}
        </button>
      );
    },
    [normalizeCity, q, saveDashState, searchNow, selectedCity]
  );

  const previewUrlForLocal = useCallback((file) => URL.createObjectURL(file), []);

  // ----------------
  // Render
  // ----------------
  return (
    <div style={{ padding: 20, background: "linear-gradient(180deg,#f6f7fb,#eef1ff)", minHeight: "100vh" }}>
      <div
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          background: "rgba(255,255,255,0.82)",
          borderRadius: 18,
          padding: 18,
          boxShadow: "0 14px 40px rgba(0,0,0,0.08)",
          border: "1px solid rgba(0,0,0,0.06)",
          backdropFilter: "blur(12px)",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div>
            <h2 style={{ margin: 0 }}>MoodNest</h2>
            {user ? (
              <p style={{ margin: "6px 0", opacity: 0.9 }}>
                Hey 👋, <b>{user.name || ""}</b>{" "}
                {user.isAdmin ? (
                  <span
                    style={{
                      marginLeft: 8,
                      fontSize: 12,
                      padding: "3px 10px",
                      borderRadius: 999,
                      border: "1px solid rgba(0,0,0,0.12)",
                      background: "rgba(255,247,230,0.9)",
                      fontWeight: 900,
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
                onClick={() => {
                  saveDashState();
                  navigate("/submit");
                }}
                style={{
                  padding: "9px 12px",
                  borderRadius: 12,
                  border: "1px solid rgba(0,0,0,0.12)",
                  background: "#111",
                  color: "#fff",
                  cursor: "pointer",
                  fontWeight: 900,
                }}
              >
                ➕ Submit a Place
              </button>
            ) : null}

            <button
              onClick={() => {
                if (isBrowser) sessionStorage.removeItem(DASH_KEY);
                localStorage.removeItem("token");
                if (isBrowser) window.location.href = "/login";
              }}
              style={{
                padding: "9px 12px",
                borderRadius: 12,
                border: "1px solid rgba(0,0,0,0.12)",
                background: "rgba(255,255,255,0.8)",
                cursor: "pointer",
                fontWeight: 900,
              }}
            >
              Logout
            </button>
          </div>
        </div>

        {msg ? <p style={{ marginTop: 10, fontWeight: 800 }}>{msg}</p> : null}

        {/* ✅ Premium Profile Panel with tabs */}
        <div
          style={{
            marginTop: 14,
            borderRadius: 18,
            padding: 14,
            border: "1px solid rgba(0,0,0,0.08)",
            background: "linear-gradient(135deg,rgba(255,255,255,0.9),rgba(245,247,255,0.75))",
            boxShadow: "0 10px 26px rgba(0,0,0,0.06)",
          }}
        >
          <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
            {/* Avatar with ring + overlay */}
            <div style={{ position: "relative", width: 84, height: 84, flex: "0 0 auto" }}>
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  borderRadius: "50%",
                  padding: 3,
                  background: "linear-gradient(135deg,#111,#5b6bff,#ff4d4d)",
                  boxShadow: "0 10px 18px rgba(0,0,0,0.12)",
                }}
              >
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    borderRadius: "50%",
                    background: profilePhotoUrl
                      ? `url(${profilePhotoUrl}) center/cover no-repeat`
                      : "linear-gradient(135deg,#111,#444)",
                    border: "2px solid rgba(255,255,255,0.85)",
                  }}
                />
              </div>

              <button
                type="button"
                onClick={() => profileInputRef.current?.click()}
                title="Change profile photo"
                style={{
                  position: "absolute",
                  right: -2,
                  bottom: -2,
                  width: 34,
                  height: 34,
                  borderRadius: "50%",
                  border: "1px solid rgba(0,0,0,0.14)",
                  background: "rgba(255,255,255,0.95)",
                  cursor: "pointer",
                  fontWeight: 900,
                  boxShadow: "0 8px 14px rgba(0,0,0,0.10)",
                }}
              >
                ✎
              </button>
            </div>

            <div style={{ flex: "1 1 420px", minWidth: 260 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <div style={{ fontWeight: 1000, fontSize: 15 }}>
                  {user?.name || "User"} <span style={{ opacity: 0.6, fontWeight: 800 }}>•</span>{" "}
                  <span style={{ fontWeight: 900, opacity: 0.75 }}>{user?.email || ""}</span>
                </div>

                {!user?.profilePicture ? (
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 900,
                      padding: "4px 10px",
                      borderRadius: 999,
                      border: "1px solid rgba(255,77,77,0.25)",
                      background: "rgba(255,77,77,0.08)",
                    }}
                  >
                    Profile required for booking 🎟️
                  </span>
                ) : (
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 900,
                      padding: "4px 10px",
                      borderRadius: 999,
                      border: "1px solid rgba(45,160,90,0.25)",
                      background: "rgba(45,160,90,0.08)",
                    }}
                  >
                    Verified ✅
                  </span>
                )}

                <span style={{ marginLeft: "auto", fontSize: 12.5, fontWeight: 900, opacity: 0.75 }}>
                  Saved: {favList.length} • Orders: {orders.length} • Submissions: {mySubs.length}
                </span>
              </div>

              {/* Tabs */}
              <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                {[
                  { k: "profile", t: "Profile" },
                  { k: "activity", t: "Activity" },
                  { k: "orders", t: "Orders" },
                  { k: "submissions", t: "My Submissions" },
                ].map((x) => {
                  const active = profileTab === x.k;
                  return (
                    <button
                      key={x.k}
                      onClick={() => setProfileTab(x.k)}
                      style={{
                        padding: "8px 12px",
                        borderRadius: 999,
                        border: `1px solid ${active ? "#111" : "rgba(0,0,0,0.14)"}`,
                        background: active ? "#111" : "rgba(255,255,255,0.7)",
                        color: active ? "#fff" : "#111",
                        cursor: "pointer",
                        fontWeight: 900,
                        fontSize: 13,
                        backdropFilter: "blur(8px)",
                      }}
                    >
                      {x.t}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Tab content */}
          <div style={{ marginTop: 12 }}>
            {/* PROFILE TAB */}
            {profileTab === "profile" ? (
              <div
                onDragEnter={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setProfileDragging(true);
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setProfileDragging(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setProfileDragging(false);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setProfileDragging(false);
                  const f = e.dataTransfer?.files?.[0];
                  pickProfileFile(f);
                }}
                style={{
                  borderRadius: 16,
                  border: `1px dashed ${profileDragging ? "#111" : "rgba(0,0,0,0.18)"}`,
                  background: profileDragging ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.7)",
                  padding: 12,
                }}
              >
                <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                  <div style={{ fontWeight: 1000 }}>Upload Profile Photo</div>
                  <div style={{ fontSize: 12.5, opacity: 0.75 }}>
                    Drag-drop or choose an image. (Max 8MB)
                  </div>

                  <div style={{ marginLeft: "auto", display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <button
                      type="button"
                      onClick={() => profileInputRef.current?.click()}
                      style={{
                        padding: "9px 12px",
                        borderRadius: 12,
                        border: "1px solid rgba(0,0,0,0.14)",
                        background: "rgba(255,255,255,0.85)",
                        cursor: "pointer",
                        fontWeight: 900,
                      }}
                    >
                      Choose
                    </button>

                    <button
                      type="button"
                      onClick={uploadProfileNow}
                      disabled={profileUploading || !profileFile}
                      style={{
                        padding: "9px 12px",
                        borderRadius: 12,
                        border: "1px solid rgba(0,0,0,0.14)",
                        background: profileUploading || !profileFile ? "#777" : "#111",
                        color: "#fff",
                        cursor: profileUploading || !profileFile ? "not-allowed" : "pointer",
                        fontWeight: 1000,
                      }}
                    >
                      {profileUploading ? "Uploading..." : "Upload"}
                    </button>

                    {profileFile ? (
                      <button
                        type="button"
                        onClick={clearProfilePick}
                        style={{
                          padding: "9px 12px",
                          borderRadius: 12,
                          border: "1px solid rgba(0,0,0,0.14)",
                          background: "rgba(255,255,255,0.85)",
                          cursor: "pointer",
                          fontWeight: 900,
                        }}
                      >
                        Clear
                      </button>
                    ) : null}
                  </div>

                  <input
                    ref={profileInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      pickProfileFile(f);
                      e.target.value = "";
                    }}
                  />
                </div>

                {profileProgress > 0 ? (
                  <div style={{ marginTop: 10 }}>
                    <div
                      style={{
                        height: 10,
                        borderRadius: 999,
                        background: "rgba(0,0,0,0.08)",
                        overflow: "hidden",
                        border: "1px solid rgba(0,0,0,0.10)",
                      }}
                    >
                      <div
                        style={{
                          width: `${profileProgress}%`,
                          height: "100%",
                          background: "linear-gradient(90deg,#111,#5b6bff)",
                          transition: "width .15s ease",
                        }}
                      />
                    </div>
                    <div style={{ fontSize: 12.5, fontWeight: 900, marginTop: 6, opacity: 0.85 }}>
                      Uploading… {profileProgress}%
                    </div>
                  </div>
                ) : null}

                {profilePreview ? (
                  <div style={{ marginTop: 12, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                    <div
                      style={{
                        width: 66,
                        height: 66,
                        borderRadius: 16,
                        overflow: "hidden",
                        border: "1px solid rgba(0,0,0,0.10)",
                        background: `url(${profilePreview}) center/cover no-repeat`,
                      }}
                    />
                    <div style={{ fontSize: 12.5, opacity: 0.85 }}>
                      Preview ready. Click <b>Upload</b> to save.
                    </div>
                  </div>
                ) : null}

                {profileMsg ? (
                  <div style={{ marginTop: 10, fontSize: 13, fontWeight: 900 }}>{profileMsg}</div>
                ) : null}
              </div>
            ) : null}

            {/* ACTIVITY TAB */}
            {profileTab === "activity" ? (
              <div
                style={{
                  borderRadius: 16,
                  border: "1px solid rgba(0,0,0,0.08)",
                  background: "rgba(255,255,255,0.7)",
                  padding: 12,
                }}
              >
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {chip(`⭐ Favorites: ${favList.length}`)}
                  {chip(`🎟️ Orders: ${orders.length}`)}
                  {chip(`📝 Submissions: ${mySubs.length}`)}
                  {chip(`🏙️ City: ${selectedCity}`)}
                  {q ? chip(`🔎 Last search: ${q}`) : chip("🔎 Last search: -")}
                </div>

                <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button
                    onClick={() => {
                      setProfileTab("orders");
                      fetchOrders();
                    }}
                    style={{
                      padding: "10px 12px",
                      borderRadius: 12,
                      border: "1px solid rgba(0,0,0,0.12)",
                      background: "#111",
                      color: "#fff",
                      cursor: "pointer",
                      fontWeight: 1000,
                    }}
                  >
                    View Orders
                  </button>

                  <button
                    onClick={() => {
                      setProfileTab("submissions");
                      fetchMySubmissions();
                    }}
                    style={{
                      padding: "10px 12px",
                      borderRadius: 12,
                      border: "1px solid rgba(0,0,0,0.12)",
                      background: "rgba(255,255,255,0.85)",
                      cursor: "pointer",
                      fontWeight: 1000,
                    }}
                  >
                    View My Submissions
                  </button>

                  {!user?.isAdmin ? (
                    <button
                      onClick={() => {
                        saveDashState();
                        navigate("/submit");
                      }}
                      style={{
                        padding: "10px 12px",
                        borderRadius: 12,
                        border: "1px solid rgba(0,0,0,0.12)",
                        background: "rgba(255,255,255,0.85)",
                        cursor: "pointer",
                        fontWeight: 1000,
                      }}
                    >
                      Submit a Place
                    </button>
                  ) : null}
                </div>
              </div>
            ) : null}

            {/* ORDERS TAB */}
            {profileTab === "orders" ? (
              <div
                style={{
                  borderRadius: 16,
                  border: "1px solid rgba(0,0,0,0.08)",
                  background: "rgba(255,255,255,0.7)",
                  padding: 12,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  <div style={{ fontWeight: 1000 }}>🧾 Purchase / Orders History</div>
                  <button
                    onClick={fetchOrders}
                    disabled={ordersBusy}
                    style={{
                      padding: "9px 12px",
                      borderRadius: 12,
                      border: "1px solid rgba(0,0,0,0.12)",
                      background: "rgba(255,255,255,0.85)",
                      cursor: ordersBusy ? "not-allowed" : "pointer",
                      fontWeight: 1000,
                      opacity: ordersBusy ? 0.7 : 1,
                    }}
                  >
                    {ordersBusy ? "Refreshing..." : "Refresh"}
                  </button>
                </div>

                {ordersMsg ? <div style={{ marginTop: 10, fontWeight: 900 }}>{ordersMsg}</div> : null}
                {ordersBusy ? <div style={{ marginTop: 10, opacity: 0.75 }}>Loading orders...</div> : null}

                {!ordersBusy && (!orders || orders.length === 0) ? (
                  <div style={{ marginTop: 10, opacity: 0.75 }}>No orders yet.</div>
                ) : null}

                {!ordersBusy && orders?.length ? (
                  <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    {orders.slice(0, 20).map((t) => (
                      <div
                        key={t._id}
                        style={{
                          borderRadius: 16,
                          border: "1px solid rgba(0,0,0,0.08)",
                          background: "rgba(255,255,255,0.85)",
                          padding: 12,
                        }}
                      >
                        <div style={{ fontWeight: 1000, fontSize: 14 }}>
                          🎫 {t?.event?.title || "Event"}
                        </div>
                        <div style={{ marginTop: 6, fontSize: 12.5, opacity: 0.8 }}>
                          Status: <b>{t.status || "unused"}</b> • Amount: <b>₹{Number(t.amount || 0)}</b>
                        </div>
                        <div style={{ marginTop: 6, fontSize: 12.5, opacity: 0.8 }}>
                          Purchased: {t.createdAt ? new Date(t.createdAt).toLocaleString() : "—"}
                        </div>

                        <button
                          onClick={() => navigate("/orders")}
                          style={{
                            marginTop: 10,
                            padding: "9px 12px",
                            borderRadius: 12,
                            border: "1px solid rgba(0,0,0,0.12)",
                            background: "#111",
                            color: "#fff",
                            cursor: "pointer",
                            fontWeight: 1000,
                            width: "100%",
                          }}
                        >
                          Open Orders Page →
                        </button>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}

            {/* MY SUBMISSIONS TAB */}
            {profileTab === "submissions" ? (
              <div
                style={{
                  borderRadius: 16,
                  border: "1px solid rgba(0,0,0,0.08)",
                  background: "rgba(255,255,255,0.7)",
                  padding: 12,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  <div style={{ fontWeight: 1000 }}>📝 My Submissions</div>
                  <button
                    onClick={fetchMySubmissions}
                    disabled={mySubsBusy}
                    style={{
                      padding: "9px 12px",
                      borderRadius: 12,
                      border: "1px solid rgba(0,0,0,0.12)",
                      background: "rgba(255,255,255,0.85)",
                      cursor: mySubsBusy ? "not-allowed" : "pointer",
                      fontWeight: 1000,
                      opacity: mySubsBusy ? 0.7 : 1,
                    }}
                  >
                    {mySubsBusy ? "Refreshing..." : "Refresh"}
                  </button>
                </div>

                {mySubsMsg ? <div style={{ marginTop: 10, fontWeight: 900 }}>{mySubsMsg}</div> : null}
                {mySubsBusy ? <div style={{ marginTop: 10, opacity: 0.75 }}>Loading submissions...</div> : null}

                {!mySubsBusy && (!mySubs || mySubs.length === 0) ? (
                  <div style={{ marginTop: 10, opacity: 0.75 }}>No submissions yet.</div>
                ) : null}

                {!mySubsBusy && mySubs?.length ? (
                  <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    {mySubs.slice(0, 20).map((s) => {
                      const status = (s.status || "pending").toLowerCase();
                      const img = (Array.isArray(s.images) && s.images[0]) || "";
                      const imgFull = img ? resolveUploadUrl(img) : "";

                      const pillBg =
                        status === "approved"
                          ? "rgba(45,160,90,0.10)"
                          : status === "rejected"
                          ? "rgba(255,77,77,0.10)"
                          : "rgba(255,180,0,0.12)";

                      const pillBr =
                        status === "approved"
                          ? "rgba(45,160,90,0.25)"
                          : status === "rejected"
                          ? "rgba(255,77,77,0.25)"
                          : "rgba(255,180,0,0.25)";

                      return (
                        <div
                          key={s._id}
                          style={{
                            borderRadius: 16,
                            border: "1px solid rgba(0,0,0,0.08)",
                            background: "rgba(255,255,255,0.85)",
                            padding: 12,
                          }}
                        >
                          <div style={{ display: "flex", gap: 12 }}>
                            <div
                              style={{
                                width: 88,
                                height: 70,
                                borderRadius: 14,
                                overflow: "hidden",
                                border: "1px solid rgba(0,0,0,0.10)",
                                background: "linear-gradient(135deg,#111,#444)",
                                flex: "0 0 auto",
                              }}
                            >
                              {imgFull ? (
                                <img src={imgFull} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                              ) : null}
                            </div>

                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontWeight: 1000, ...clamp(1) }}>{s.name || "Untitled"}</div>
                              <div style={{ marginTop: 6, fontSize: 12.5, opacity: 0.8 }}>
                                City: <b>{s.city || "-"}</b>
                              </div>
                              <div style={{ marginTop: 6 }}>
                                <span
                                  style={{
                                    display: "inline-block",
                                    padding: "4px 10px",
                                    borderRadius: 999,
                                    border: `1px solid ${pillBr}`,
                                    background: pillBg,
                                    fontSize: 12,
                                    fontWeight: 1000,
                                    textTransform: "capitalize",
                                  }}
                                >
                                  {status}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div style={{ marginTop: 10, fontSize: 12.5, opacity: 0.8, ...clamp(2) }}>
                            {s.address || s.location || ""}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        <hr style={{ margin: "18px 0", borderColor: "rgba(0,0,0,0.08)" }} />

        {/* Search */}
        <div>
          <h3 style={{ margin: "0 0 10px 0" }}>Quick Mood Search</h3>

          {/* City Selector */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
              <span style={{ opacity: 0.8, fontSize: 14 }}>Select City:</span>

              <select
                value={selectedCity}
                onChange={(e) => {
                  const next = e.target.value;
                  setSelectedCity(next);
                  setTimeout(() => saveDashState({ selectedCity: next }), 0);

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
                  border: "1px solid rgba(0,0,0,0.14)",
                  background: "rgba(255,255,255,0.85)",
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
                    padding: "9px 12px",
                    borderRadius: 12,
                    border: "1px solid rgba(0,0,0,0.14)",
                    background: "rgba(255,255,255,0.85)",
                    cursor: "pointer",
                    fontWeight: 1000,
                  }}
                >
                  Submit Place →
                </button>
              ) : null}
            </div>

            <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 6, WebkitOverflowScrolling: "touch" }}>
              {CITY_LIST.map((c) => (
                <CityChip key={c} c={c} />
              ))}
            </div>
          </div>

          {/* Search bar */}
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginTop: 10 }}>
            <div style={{ display: "flex", gap: 10, width: "100%", maxWidth: 760, marginLeft: "auto", marginRight: "auto" }}>
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
                  border: "1px solid rgba(0,0,0,0.14)",
                  height: 44,
                  fontSize: 15,
                  background: "rgba(255,255,255,0.85)",
                }}
              />

              <button
                onClick={() => searchNow()}
                style={{
                  padding: "0 16px",
                  height: 44,
                  borderRadius: 14,
                  border: "1px solid rgba(0,0,0,0.14)",
                  background: "#111",
                  color: "#fff",
                  cursor: "pointer",
                  fontWeight: 1000,
                  whiteSpace: "nowrap",
                }}
              >
                Search
              </button>
            </div>
          </div>

          {/* Mood buttons */}
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
                  border: "1px solid rgba(0,0,0,0.14)",
                  background: "rgba(255,255,255,0.75)",
                  cursor: "pointer",
                  fontWeight: 900,
                  backdropFilter: "blur(8px)",
                }}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        <hr style={{ margin: "18px 0", borderColor: "rgba(0,0,0,0.08)" }} />

        {/* EVENTS */}
        <div
          style={{
            marginTop: 14,
            background: "rgba(255,255,255,0.85)",
            borderRadius: 18,
            padding: 14,
            boxShadow: "0 10px 26px rgba(0,0,0,0.06)",
            border: "1px solid rgba(0,0,0,0.06)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 1000 }}>🎟️ Upcoming Events in {selectedCity}</div>
              <div style={{ fontSize: 12.5, opacity: 0.75 }}>Booking requires profile photo</div>
            </div>

            <button
              onClick={() => fetchEvents(selectedCity, q)}
              style={{
                padding: "9px 12px",
                borderRadius: 12,
                border: "1px solid rgba(0,0,0,0.14)",
                background: "rgba(255,255,255,0.85)",
                cursor: "pointer",
                fontWeight: 1000,
              }}
            >
              Refresh
            </button>
          </div>

          {eventsMsg ? (
            <div style={{ marginTop: 10, padding: 10, borderRadius: 12, background: "rgba(255,240,210,0.8)", border: "1px solid rgba(255,200,120,0.5)" }}>
              {eventsMsg}
            </div>
          ) : null}

          {eventsBusy ? <div style={{ marginTop: 12, fontSize: 13, opacity: 0.75 }}>Loading events...</div> : null}

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
                      minWidth: 270,
                      maxWidth: 270,
                      border: "1px solid rgba(0,0,0,0.08)",
                      borderRadius: 18,
                      overflow: "hidden",
                      background: "rgba(255,255,255,0.85)",
                      flex: "0 0 auto",
                      boxShadow: "0 10px 26px rgba(0,0,0,0.06)",
                    }}
                  >
                    <div
                      style={{
                        height: 130,
                        background: ev.bannerImage
                          ? `url(${ev.bannerImage}) center/cover no-repeat`
                          : "linear-gradient(135deg,#111,#5b6bff)",
                      }}
                    />

                    <div style={{ padding: 12 }}>
                      <div style={{ fontWeight: 1000, fontSize: 15, lineHeight: 1.2 }}>{ev.title}</div>
                      <div style={{ marginTop: 6, fontSize: 12.5, opacity: 0.8 }}>
                        {ev.category ? `🎭 ${ev.category}` : "🎭 Event"} {ev.venue ? ` • 📍 ${ev.venue}` : ""}
                      </div>

                      <div style={{ marginTop: 6, fontSize: 12.5, opacity: 0.8 }}>
                        🗓️ {ev.startAt ? new Date(ev.startAt).toLocaleString() : "TBA"}
                      </div>

                      <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                        <div style={{ fontWeight: 1000 }}>{isFree ? "FREE" : `₹${Number(ev.price || 0)}`}</div>

                        {canBook ? (
                          <button
                            onClick={() => bookTicket(ev._id)}
                            style={{
                              padding: "9px 10px",
                              borderRadius: 12,
                              border: "1px solid rgba(0,0,0,0.14)",
                              background: "#111",
                              color: "#fff",
                              cursor: "pointer",
                              fontWeight: 1000,
                              fontSize: 12.5,
                            }}
                          >
                            {isFree ? "Get Pass" : "Book Ticket"}
                          </button>
                        ) : (
                          <div style={{ fontSize: 12.5, opacity: 0.7, fontWeight: 900 }}>Info Only</div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>

        <hr style={{ margin: "18px 0", borderColor: "rgba(0,0,0,0.08)" }} />

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
                const extraLine = (b.why ? `💡 ${b.why}` : "") + (b.highlight ? `\n🔥 ${b.highlight}` : "");

                return (
                  <div key={b._id} style={{ marginBottom: 10 }}>
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

                    {/* ✅ Admin: extra edit button */}
                    {user?.isAdmin ? (
                      <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                        <button
                          onClick={() => openEditModal("curated", b._id, b)}
                          style={{
                            flex: 1,
                            padding: "10px 12px",
                            borderRadius: 12,
                            border: "1px solid rgba(0,0,0,0.14)",
                            background: "rgba(255,255,255,0.85)",
                            cursor: "pointer",
                            fontWeight: 1000,
                          }}
                        >
                          ✏️ Edit Curated
                        </button>
                      </div>
                    ) : null}

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

        <hr style={{ margin: "18px 0", borderColor: "rgba(0,0,0,0.08)" }} />

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

        {/* Admin Pending Submissions */}
        {user?.isAdmin ? (
          <>
            <hr style={{ margin: "18px 0", borderColor: "rgba(0,0,0,0.08)" }} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <h3 style={{ margin: 0 }}>Pending Submissions</h3>
              <button
                onClick={fetchPendingSubmissions}
                disabled={pendingBusy}
                style={{
                  padding: "9px 12px",
                  borderRadius: 12,
                  border: "1px solid rgba(0,0,0,0.12)",
                  background: "rgba(255,255,255,0.85)",
                  cursor: pendingBusy ? "not-allowed" : "pointer",
                  fontWeight: 1000,
                  opacity: pendingBusy ? 0.7 : 1,
                }}
              >
                {pendingBusy ? "Refreshing..." : "Refresh"}
              </button>
            </div>

            {pendingMsg ? <p style={{ marginTop: 8, fontWeight: 900 }}>{pendingMsg}</p> : null}

            {pendingSubs.length === 0 ? (
              <p style={{ opacity: 0.7, marginTop: 10 }}>No pending submissions.</p>
            ) : (
              <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                {pendingSubs.map((s) => {
                  const img = (Array.isArray(s.images) && s.images[0]) || "";
                  const imgFull = img ? resolveUploadUrl(img) : "";

                  return (
                    <div
                      key={s._id}
                      style={{
                        border: "1px solid rgba(0,0,0,0.08)",
                        borderRadius: 18,
                        padding: 12,
                        background: "rgba(255,255,255,0.85)",
                        boxShadow: "0 10px 26px rgba(0,0,0,0.06)",
                      }}
                    >
                      <div style={{ display: "flex", gap: 12 }}>
                        <div
                          style={{
                            width: 96,
                            height: 72,
                            borderRadius: 14,
                            overflow: "hidden",
                            background: "linear-gradient(135deg,#111,#444)",
                            border: "1px solid rgba(0,0,0,0.10)",
                            flex: "0 0 auto",
                          }}
                        >
                          {imgFull ? (
                            <img src={imgFull} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          ) : null}
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 1000, fontSize: 14, marginBottom: 4, ...clamp(1) }}>
                            {s.name || "Untitled"}
                          </div>
                          <div style={{ fontSize: 12.5, opacity: 0.85 }}>
                            <b>City:</b> {s.city || "-"}
                          </div>
                          <div style={{ fontSize: 12.5, opacity: 0.85, marginTop: 2 }}>
                            <b>Category:</b> {s.category || "-"}
                          </div>
                          <div style={{ fontSize: 12.5, opacity: 0.75, marginTop: 2, ...clamp(2) }}>
                            {s.address || ""}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
                        <button
                          onClick={() => openEditModal("pending", s._id, s)}
                          style={{
                            flex: 1,
                            padding: "10px 12px",
                            borderRadius: 12,
                            border: "1px solid rgba(0,0,0,0.12)",
                            background: "rgba(255,255,255,0.85)",
                            cursor: "pointer",
                            fontWeight: 1000,
                          }}
                        >
                          👁️ View / Edit
                        </button>

                        <button
                          onClick={() => approveSubmission(s._id)}
                          style={{
                            flex: 1,
                            padding: "10px 12px",
                            borderRadius: 12,
                            border: "1px solid rgba(0,0,0,0.12)",
                            background: "#111",
                            color: "#fff",
                            cursor: "pointer",
                            fontWeight: 1000,
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
                            border: "1px solid rgba(0,0,0,0.12)",
                            background: "rgba(255,255,255,0.85)",
                            cursor: "pointer",
                            fontWeight: 1000,
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

        {/* Admin Add Form (unchanged logic, same as your previous – keep compact) */}
        {user?.isAdmin ? (
          <>
            <hr style={{ margin: "18px 0", borderColor: "rgba(0,0,0,0.08)" }} />
            <h3>Add Recommended Place (Only For Admin)</h3>

            <p style={{ marginTop: 0, opacity: 0.85, fontSize: 13 }}>
              City for this curated card: <b>{selectedCity}</b>
            </p>

            <form onSubmit={addBusiness} style={{ maxWidth: 760 }}>
              {/* Import */}
              <div
                style={{
                  padding: 14,
                  borderRadius: 16,
                  border: "1px solid rgba(0,0,0,0.12)",
                  background: "rgba(245,247,255,0.8)",
                  marginBottom: 14,
                }}
              >
                <div style={{ fontWeight: 1000, marginBottom: 8 }}>Import from Google Form (Sheet)</div>

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <input
                    value={importSheetId}
                    onChange={(e) => setImportSheetId(e.target.value)}
                    placeholder="Paste Sheet ID (between /d/ and /edit)"
                    style={{
                      flex: "1 1 360px",
                      padding: "10px 12px",
                      borderRadius: 12,
                      border: "1px solid rgba(0,0,0,0.14)",
                      background: "rgba(255,255,255,0.85)",
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
                      border: "1px solid rgba(0,0,0,0.14)",
                      background: "rgba(255,255,255,0.85)",
                      outline: "none",
                    }}
                  />

                  <button
                    type="button"
                    onClick={async () => {
                      if (!API || !authHeader) return;
                      try {
                        setImportBusy(true);
                        setImportMsg("");

                        const sheetId = importSheetId.trim();
                        const rowNumber = Number(importRow);

                        if (!sheetId || !rowNumber || rowNumber < 2) {
                          setImportMsg("Enter valid Sheet ID and Row (>=2)");
                          return;
                        }

                        const res = await axios.post(`${apiBase}/api/import/google-sheet`, { sheetId, rowNumber }, authHeader);
                        const d = res.data || {};

                        if (d.city) setSelectedCity(d.city);

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
                        setImportMsg(err?.response?.data?.message || "❌ Import failed");
                      } finally {
                        setImportBusy(false);
                      }
                    }}
                    disabled={importBusy}
                    style={{
                      padding: "10px 14px",
                      borderRadius: 12,
                      border: "none",
                      fontWeight: 1000,
                      background: "#111",
                      color: "#fff",
                      cursor: importBusy ? "not-allowed" : "pointer",
                      opacity: importBusy ? 0.7 : 1,
                    }}
                  >
                    {importBusy ? "Fetching..." : "Fetch"}
                  </button>
                </div>

                {importMsg ? <div style={{ marginTop: 10, fontWeight: 900 }}>{importMsg}</div> : null}
              </div>

              {/* Inputs */}
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
                    border: "1px solid rgba(0,0,0,0.14)",
                    background: "rgba(255,255,255,0.85)",
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
                    border: "1px solid rgba(0,0,0,0.14)",
                    background: "rgba(255,255,255,0.85)",
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
                    border: "1px solid rgba(0,0,0,0.14)",
                    background: "rgba(255,255,255,0.85)",
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
                    border: "1px solid rgba(0,0,0,0.14)",
                    background: "rgba(255,255,255,0.85)",
                  }}
                />

                <input
                  value={rating}
                  onChange={(e) => setRating(e.target.value)}
                  placeholder="Rating (optional)"
                  style={{
                    width: 180,
                    padding: 10,
                    marginBottom: 10,
                    borderRadius: 12,
                    border: "1px solid rgba(0,0,0,0.14)",
                    background: "rgba(255,255,255,0.85)",
                  }}
                />

                <select
                  value={priceLevel}
                  onChange={(e) => setPriceLevel(e.target.value)}
                  style={{
                    width: 160,
                    padding: 10,
                    marginBottom: 10,
                    borderRadius: 12,
                    border: "1px solid rgba(0,0,0,0.14)",
                    background: "rgba(255,255,255,0.85)",
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
                    border: "1px solid rgba(0,0,0,0.14)",
                    background: "rgba(255,255,255,0.85)",
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
                  border: "1px solid rgba(0,0,0,0.14)",
                  background: "rgba(255,255,255,0.85)",
                }}
              />

              {/* Multi photo block (same as your earlier one, kept) */}
              <div
                style={{
                  border: "1px solid rgba(0,0,0,0.10)",
                  borderRadius: 16,
                  padding: 12,
                  marginBottom: 12,
                  background: "rgba(255,255,255,0.65)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontWeight: 1000, marginBottom: 4 }}>Photos (multiple)</div>
                    <div style={{ fontSize: 12.5, opacity: 0.75 }}>Local upload + URL images.</div>
                  </div>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      padding: "9px 12px",
                      borderRadius: 12,
                      border: "1px solid rgba(0,0,0,0.14)",
                      background: "rgba(255,255,255,0.85)",
                      cursor: "pointer",
                      fontWeight: 900,
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
                    border: "1px dashed rgba(0,0,0,0.25)",
                    background: "rgba(255,255,255,0.85)",
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
                      border: "1px solid rgba(0,0,0,0.14)",
                      resize: "vertical",
                      background: "rgba(255,255,255,0.85)",
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
                        border: "1px solid rgba(0,0,0,0.14)",
                        background: "#111",
                        color: "#fff",
                        cursor: "pointer",
                        fontWeight: 1000,
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
                        border: "1px solid rgba(0,0,0,0.14)",
                        background: "rgba(255,255,255,0.85)",
                        cursor: "pointer",
                        fontWeight: 900,
                      }}
                    >
                      Clear URLs
                    </button>

                    {uploading ? <span style={{ fontSize: 13, opacity: 0.8, alignSelf: "center" }}>Uploading...</span> : null}
                  </div>
                </div>

                {(localFiles.length > 0 || urlImages.length > 0) ? (
                  <div style={{ marginTop: 12 }}>
                    <div style={{ fontWeight: 900, marginBottom: 8 }}>Preview ({localFiles.length + urlImages.length})</div>

                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                      {localFiles.map((f, idx) => (
                        <div
                          key={`${f.name}-${f.size}-${idx}`}
                          style={{
                            width: 120,
                            borderRadius: 14,
                            overflow: "hidden",
                            border: "1px solid rgba(0,0,0,0.10)",
                            background: "rgba(255,255,255,0.85)",
                          }}
                        >
                          <img alt="local" src={previewUrlForLocal(f)} style={{ width: "100%", height: 90, objectFit: "cover", display: "block" }} />
                          <button
                            type="button"
                            onClick={() => setLocalFiles((prev) => prev.filter((_, i) => i !== idx))}
                            style={{
                              width: "100%",
                              padding: "8px 10px",
                              border: "none",
                              borderTop: "1px solid rgba(0,0,0,0.08)",
                              background: "rgba(255,255,255,0.85)",
                              cursor: "pointer",
                              fontWeight: 1000,
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
                            border: "1px solid rgba(0,0,0,0.10)",
                            background: "rgba(255,255,255,0.85)",
                          }}
                        >
                          <img
                            alt="url"
                            src={resolveUploadUrl(u)}
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
                              borderTop: "1px solid rgba(0,0,0,0.08)",
                              background: "rgba(255,255,255,0.85)",
                              cursor: "pointer",
                              fontWeight: 1000,
                              fontSize: 12,
                            }}
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>

                    <p style={{ marginTop: 10, fontSize: 12.5, opacity: 0.75 }}>Local images upload when you submit.</p>
                  </div>
                ) : null}
              </div>

              {/* old fields */}
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
                    border: "1px solid rgba(0,0,0,0.14)",
                    background: "rgba(255,255,255,0.85)",
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
                    border: "1px solid rgba(0,0,0,0.14)",
                    background: "rgba(255,255,255,0.85)",
                  }}
                />
              </div>

              <input
                value={why}
                onChange={(e) => setWhy(e.target.value)}
                placeholder="Why recommended?"
                style={{
                  width: "100%",
                  padding: 10,
                  marginBottom: 10,
                  borderRadius: 12,
                  border: "1px solid rgba(0,0,0,0.14)",
                  background: "rgba(255,255,255,0.85)",
                }}
              />

              <input
                value={highlight}
                onChange={(e) => setHighlight(e.target.value)}
                placeholder="Highlight / Must try"
                style={{
                  width: "100%",
                  padding: 10,
                  marginBottom: 10,
                  borderRadius: 12,
                  border: "1px solid rgba(0,0,0,0.14)",
                  background: "rgba(255,255,255,0.85)",
                }}
              />

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <input
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="Tags (comma)"
                  style={{
                    flex: 1,
                    minWidth: 260,
                    padding: 10,
                    marginBottom: 10,
                    borderRadius: 12,
                    border: "1px solid rgba(0,0,0,0.14)",
                    background: "rgba(255,255,255,0.85)",
                  }}
                />
                <input
                  value={activitiesInput}
                  onChange={(e) => setActivitiesInput(e.target.value)}
                  placeholder="Activities (comma)"
                  style={{
                    flex: 1,
                    minWidth: 260,
                    padding: 10,
                    marginBottom: 10,
                    borderRadius: 12,
                    border: "1px solid rgba(0,0,0,0.14)",
                    background: "rgba(255,255,255,0.85)",
                  }}
                />
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <input type="checkbox" checked={instagrammable} onChange={(e) => setInstagrammable(e.target.checked)} />
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
                  border: "1px solid rgba(0,0,0,0.14)",
                  background: "rgba(255,255,255,0.85)",
                }}
              />

              <button
                type="submit"
                disabled={uploading}
                style={{
                  padding: "10px 14px",
                  borderRadius: 12,
                  border: "1px solid rgba(0,0,0,0.14)",
                  background: uploading ? "#666" : "#111",
                  color: "#fff",
                  cursor: uploading ? "not-allowed" : "pointer",
                  fontWeight: 1000,
                }}
              >
                {uploading ? "Uploading..." : "Add Curated Place"}
              </button>
            </form>
          </>
        ) : null}

        {/* ✅ Admin Edit Modal */}
        {editOpen ? (
          <div
            onClick={closeEditModal}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.45)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 16,
              zIndex: 9999,
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                width: "100%",
                maxWidth: 980,
                maxHeight: "86vh",
                overflow: "auto",
                borderRadius: 18,
                background: "rgba(255,255,255,0.92)",
                border: "1px solid rgba(0,0,0,0.10)",
                boxShadow: "0 18px 60px rgba(0,0,0,0.25)",
                backdropFilter: "blur(14px)",
                padding: 14,
              }}
            >
              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <div style={{ fontWeight: 1100, fontSize: 16 }}>
                  {editType === "pending" ? "Pending Submission" : "Curated Place"} • View / Edit
                </div>
                <div style={{ marginLeft: "auto", display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button
                    onClick={saveEdit}
                    disabled={editBusy}
                    style={{
                      padding: "10px 12px",
                      borderRadius: 12,
                      border: "1px solid rgba(0,0,0,0.14)",
                      background: "#111",
                      color: "#fff",
                      cursor: editBusy ? "not-allowed" : "pointer",
                      fontWeight: 1100,
                    }}
                  >
                    {editBusy ? "Saving..." : "Save Changes"}
                  </button>

                  {editType === "pending" ? (
                    <>
                      <button
                        onClick={() => approveSubmission(editId)}
                        style={{
                          padding: "10px 12px",
                          borderRadius: 12,
                          border: "1px solid rgba(0,0,0,0.14)",
                          background: "rgba(255,255,255,0.85)",
                          cursor: "pointer",
                          fontWeight: 1100,
                        }}
                      >
                        ✅ Approve
                      </button>
                      <button
                        onClick={() => rejectSubmission(editId)}
                        style={{
                          padding: "10px 12px",
                          borderRadius: 12,
                          border: "1px solid rgba(0,0,0,0.14)",
                          background: "rgba(255,255,255,0.85)",
                          cursor: "pointer",
                          fontWeight: 1100,
                        }}
                      >
                        ❌ Reject
                      </button>
                    </>
                  ) : null}

                  <button
                    onClick={closeEditModal}
                    style={{
                      padding: "10px 12px",
                      borderRadius: 12,
                      border: "1px solid rgba(0,0,0,0.14)",
                      background: "rgba(255,255,255,0.85)",
                      cursor: "pointer",
                      fontWeight: 1100,
                    }}
                  >
                    Close ✕
                  </button>
                </div>
              </div>

              {editMsg ? <div style={{ marginTop: 10, fontWeight: 1000 }}>{editMsg}</div> : null}
              {editBusy ? <div style={{ marginTop: 10, opacity: 0.8 }}>Loading...</div> : null}

              {/* Images preview */}
              <div style={{ marginTop: 12 }}>
                <div style={{ fontWeight: 1000, marginBottom: 8 }}>Photos</div>
                {!editPayload.images?.length ? (
                  <div style={{ opacity: 0.75 }}>No images</div>
                ) : (
                  <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 6 }}>
                    {editPayload.images.map((u, idx) => (
                      <div
                        key={`${u}-${idx}`}
                        style={{
                          width: 160,
                          height: 110,
                          borderRadius: 16,
                          overflow: "hidden",
                          border: "1px solid rgba(0,0,0,0.10)",
                          background: "rgba(255,255,255,0.85)",
                          flex: "0 0 auto",
                        }}
                      >
                        <img
                          alt="img"
                          src={resolveUploadUrl(u)}
                          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Edit fields */}
              <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <input
                  value={editPayload.city}
                  onChange={(e) => setEditPayload((p) => ({ ...p, city: e.target.value }))}
                  placeholder="City"
                  style={{ padding: 10, borderRadius: 12, border: "1px solid rgba(0,0,0,0.14)", background: "rgba(255,255,255,0.85)" }}
                />
                <input
                  value={editPayload.name}
                  onChange={(e) => setEditPayload((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Name"
                  style={{ padding: 10, borderRadius: 12, border: "1px solid rgba(0,0,0,0.14)", background: "rgba(255,255,255,0.85)" }}
                />
                <input
                  value={editPayload.category}
                  onChange={(e) => setEditPayload((p) => ({ ...p, category: e.target.value }))}
                  placeholder="Category"
                  style={{ padding: 10, borderRadius: 12, border: "1px solid rgba(0,0,0,0.14)", background: "rgba(255,255,255,0.85)" }}
                />
                <input
                  value={editPayload.rating}
                  onChange={(e) => setEditPayload((p) => ({ ...p, rating: e.target.value }))}
                  placeholder="Rating"
                  style={{ padding: 10, borderRadius: 12, border: "1px solid rgba(0,0,0,0.14)", background: "rgba(255,255,255,0.85)" }}
                />
              </div>

              <textarea
                value={editPayload.address}
                onChange={(e) => setEditPayload((p) => ({ ...p, address: e.target.value }))}
                placeholder="Address"
                rows={2}
                style={{ marginTop: 12, width: "100%", padding: 10, borderRadius: 12, border: "1px solid rgba(0,0,0,0.14)", background: "rgba(255,255,255,0.85)" }}
              />

              <textarea
                value={editPayload.location}
                onChange={(e) => setEditPayload((p) => ({ ...p, location: e.target.value }))}
                placeholder="Location"
                rows={2}
                style={{ marginTop: 12, width: "100%", padding: 10, borderRadius: 12, border: "1px solid rgba(0,0,0,0.14)", background: "rgba(255,255,255,0.85)" }}
              />

              <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <input
                  value={editPayload.why}
                  onChange={(e) => setEditPayload((p) => ({ ...p, why: e.target.value }))}
                  placeholder="Why"
                  style={{ padding: 10, borderRadius: 12, border: "1px solid rgba(0,0,0,0.14)", background: "rgba(255,255,255,0.85)" }}
                />
                <input
                  value={editPayload.highlight}
                  onChange={(e) => setEditPayload((p) => ({ ...p, highlight: e.target.value }))}
                  placeholder="Highlight"
                  style={{ padding: 10, borderRadius: 12, border: "1px solid rgba(0,0,0,0.14)", background: "rgba(255,255,255,0.85)" }}
                />
              </div>

              <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 10 }}>
                <input
                  type="checkbox"
                  checked={!!editPayload.instagrammable}
                  onChange={(e) => setEditPayload((p) => ({ ...p, instagrammable: e.target.checked }))}
                />
                <span style={{ fontWeight: 1000 }}>📸 Instagrammable</span>
              </div>

              <div style={{ marginTop: 12, fontSize: 12.5, opacity: 0.75 }}>
                Tip: If you want admin to also add/remove images inside this modal with uploads + URL inputs, tell me — I’ll add it.
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default Dashboard;