import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const API = process.env.REACT_APP_API_URL;

const parseCsv = (raw) =>
  String(raw || "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

const parseUrls = (raw) => {
  const txt = String(raw || "");
  const parts = txt
    .split(/[\n,]+/g)
    .map((x) => x.trim())
    .filter(Boolean);

  const urls = parts.filter((u) => /^https?:\/\/.+/i.test(u) || u.startsWith("/uploads/"));
  return Array.from(new Set(urls));
};

export default function SubmitPlace() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const authHeader = useMemo(
    () => ({
      headers: { Authorization: `Bearer ${token}` },
    }),
    [token]
  );

  // basic
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [category, setCategory] = useState("");
  const [address, setAddress] = useState("");
  const [location, setLocation] = useState("");

  // admin-like
  const [emoji, setEmoji] = useState("✨");
  const [vibe, setVibe] = useState("Hidden Gems");
  const [priceLevel, setPriceLevel] = useState("Signature");
  const [bestTime, setBestTime] = useState("Evening");
  const [instagrammable, setInstagrammable] = useState(false);

  const [why, setWhy] = useState("");
  const [highlight, setHighlight] = useState("");
  const [instagram, setInstagram] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [activitiesInput, setActivitiesInput] = useState("");

  // photos
  const fileInputRef = useRef(null);
  const [localFiles, setLocalFiles] = useState([]);
  const [urlInput, setUrlInput] = useState("");
  const [urlImages, setUrlImages] = useState([]);

  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [msg, setMsg] = useState("");

  // ✅ prevent blob-url memory leak
  const previewMap = useRef(new Map());
  useEffect(() => {
    return () => {
      previewMap.current.forEach((url) => URL.revokeObjectURL(url));
      previewMap.current.clear();
    };
  }, []);

  const previewUrlForLocal = (file) => {
    const key = `${file.name}-${file.size}-${file.lastModified}`;
    if (!previewMap.current.has(key)) {
      previewMap.current.set(key, URL.createObjectURL(file));
    }
    return previewMap.current.get(key);
  };

  const onPickFiles = (files) => {
    const list = Array.from(files || []).filter(Boolean);
    if (!list.length) return;

    setLocalFiles((prev) => {
      const next = [...prev];
      list.forEach((f) => {
        const exists = next.some(
          (x) => x.name === f.name && x.size === f.size && x.lastModified === f.lastModified
        );
        if (!exists) next.push(f);
      });
      return next.slice(0, 8); // user limit 8
    });
  };

  const uploadLocalFiles = async () => {
    if (!localFiles.length) return [];

    setUploading(true);
    try {
      const fd = new FormData();
      localFiles.forEach((f) => fd.append("images", f));

      // ✅ do NOT set Content-Type manually (axios sets boundary)
      const res = await axios.post(`${API}/api/upload/user-multi`, fd, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const urls = res.data?.urls || [];
      return Array.isArray(urls) ? urls : [];
    } catch (err) {
      throw new Error(err?.response?.data?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const submitNow = async () => {
    setMsg("");

    if (!token) return setMsg("❌ Please login first");
    if (!name.trim()) return setMsg("❌ Place name required");
    if (!city.trim()) return setMsg("❌ City required");

    if (submitting) return;

    setSubmitting(true);
    try {
      // upload local files first (if any)
      const up = await uploadLocalFiles();

      // ✅ FIX: do not merge uploadedUrls again (up already contains them)
      const merged = [...(up || []), ...(urlImages || [])]
        .map((x) => String(x || "").trim())
        .filter(Boolean);

      if (!merged.length) {
        setMsg("❌ Add at least 1 photo (upload or URL)");
        return;
      }

      await axios.post(
        `${API}/api/submissions`,
        {
          name: name.trim(),
          city: city.trim().toLowerCase(),
          category: category.trim(),
          address: address.trim(),
          location: location.trim(),

          emoji: String(emoji || "✨").trim(),
          vibe: String(vibe || "").trim(),
          priceLevel: String(priceLevel || "").trim(),
          bestTime: String(bestTime || "").trim(),
          instagrammable: !!instagrammable,

          instagram: instagram.trim(),
          tags: parseCsv(tagsInput),
          activities: parseCsv(activitiesInput),
          why: why.trim(),
          highlight: highlight.trim(),

          images: merged,
        },
        authHeader
      );

      alert("✅ Submitted for approval!");

      // ✅ clear form
      setLocalFiles([]);
      setUrlInput("");
      setUrlImages([]);

      setName("");
      setCity("");
      setCategory("");
      setAddress("");
      setLocation("");

      setEmoji("✨");
      setVibe("Hidden Gems");
      setPriceLevel("Signature");
      setBestTime("Evening");
      setInstagrammable(false);

      setWhy("");
      setHighlight("");
      setInstagram("");
      setTagsInput("");
      setActivitiesInput("");

      navigate("/dashboard");
    } catch (err) {
      setMsg(err?.response?.data?.message || err?.message || "Submit failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ padding: 20, background: "#f6f7fb", minHeight: "100vh" }}>
      <div
        style={{
          maxWidth: 860,
          margin: "0 auto",
          background: "#fff",
          borderRadius: 16,
          padding: 18,
          boxShadow: "0 6px 18px rgba(0,0,0,0.06)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
          <div>
            <h2 style={{ margin: 0 }}>Submit a Place</h2>
            <p style={{ margin: "6px 0", opacity: 0.8, fontSize: 13 }}>
              Your submission will go to Admin approval before showing publicly.
            </p>
          </div>

          <button
            onClick={() => navigate("/dashboard")}
            style={{
              padding: "8px 12px",
              borderRadius: 12,
              border: "1px solid #ddd",
              background: "#fff",
              cursor: "pointer",
              fontWeight: 900,
            }}
          >
            ← Back
          </button>
        </div>

        {msg ? (
          <div style={{ marginTop: 10, padding: 10, borderRadius: 12, background: "#fff7e6", border: "1px solid #ffe0b2" }}>
            {msg}
          </div>
        ) : null}

        <hr style={{ margin: "16px 0" }} />

        {/* Basic fields */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Place name (required)"
            style={{ flex: 1, minWidth: 260, padding: 10, borderRadius: 12, border: "1px solid #ddd" }}
          />

          <input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="City (required)"
            style={{ width: 220, padding: 10, borderRadius: 12, border: "1px solid #ddd" }}
          />
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
          <input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Category (Cafe/Gym/Restaurant)"
            style={{ flex: 1, minWidth: 240, padding: 10, borderRadius: 12, border: "1px solid #ddd" }}
          />

          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Location (optional)"
            style={{ flex: 1, minWidth: 240, padding: 10, borderRadius: 12, border: "1px solid #ddd" }}
          />
        </div>

        <input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Full Address"
          style={{ width: "100%", padding: 10, borderRadius: 12, border: "1px solid #ddd", marginTop: 10 }}
        />

        {/* Admin-like selectors */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
          <select value={emoji} onChange={(e) => setEmoji(e.target.value)} style={{ width: 140, padding: 10, borderRadius: 12, border: "1px solid #ddd" }}>
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

          <select value={vibe} onChange={(e) => setVibe(e.target.value)} style={{ width: 200, padding: 10, borderRadius: 12, border: "1px solid #ddd" }}>
            <option value="Hidden Gems">💎 Hidden Gems</option>
            <option value="Top Rated">⭐ Top Rated</option>
            <option value="Trending Now">🔥 Trending Now</option>
            <option value="Peaceful Spots">🌿 Peaceful Spots</option>
            <option value="Work Friendly">💻 Work Friendly</option>
            <option value="Date Spots">❤️ Date Spots</option>
            <option value="Weekend Fun">🎉 Weekend Fun</option>
          </select>

          <select value={priceLevel} onChange={(e) => setPriceLevel(e.target.value)} style={{ width: 170, padding: 10, borderRadius: 12, border: "1px solid #ddd" }}>
            <option value="Essential">Essential ⚡</option>
            <option value="Signature">Signature 🌟</option>
            <option value="Elite">Elite 👑</option>
          </select>

          <select value={bestTime} onChange={(e) => setBestTime(e.target.value)} style={{ width: 170, padding: 10, borderRadius: 12, border: "1px solid #ddd" }}>
            <option value="Morning">🌅 Morning</option>
            <option value="Afternoon">☀️ Afternoon</option>
            <option value="Evening">🌇 Evening</option>
            <option value="Night">🌙 Night</option>
          </select>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10 }}>
          <input type="checkbox" checked={instagrammable} onChange={(e) => setInstagrammable(e.target.checked)} />
          <span style={{ fontSize: 14 }}>📸 Instagrammable</span>
        </div>

        {/* Photos */}
        <hr style={{ margin: "16px 0" }} />

        <div style={{ border: "1px solid #e9e9e9", borderRadius: 16, padding: 12, background: "#fafafa" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <div>
              <div style={{ fontWeight: 900 }}>Photos (multiple)</div>
              <div style={{ fontSize: 12.5, opacity: 0.75 }}>Upload up to 8 images or paste URLs.</div>
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
                fontWeight: 800,
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
              marginTop: 12,
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
                fontWeight: 900,
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
                fontWeight: 800,
              }}
            >
              Clear URLs
            </button>

            {uploading ? <span style={{ fontSize: 13, opacity: 0.8, alignSelf: "center" }}>Uploading...</span> : null}
          </div>

          {localFiles.length > 0 || urlImages.length > 0 ? (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontWeight: 900, marginBottom: 8 }}>
                Preview ({localFiles.length + urlImages.length})
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {localFiles.map((f, idx) => (
                  <div
                    key={`${f.name}-${f.size}-${f.lastModified}-${idx}`}
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
                        fontWeight: 900,
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
                        fontWeight: 900,
                        fontSize: 12,
                      }}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>

              <p style={{ marginTop: 10, fontSize: 12.5, opacity: 0.75 }}>
                Local images will upload when you click Submit.
              </p>
            </div>
          ) : null}
        </div>

        {/* Extra info */}
        <hr style={{ margin: "16px 0" }} />

        <input
          value={instagram}
          onChange={(e) => setInstagram(e.target.value)}
          placeholder="Instagram link (optional)"
          style={{ width: "100%", padding: 10, borderRadius: 12, border: "1px solid #ddd" }}
        />

        <input
          value={why}
          onChange={(e) => setWhy(e.target.value)}
          placeholder="Why recommended? (e.g. Calm music + perfect for study)"
          style={{ width: "100%", padding: 10, borderRadius: 12, border: "1px solid #ddd", marginTop: 10 }}
        />

        <input
          value={highlight}
          onChange={(e) => setHighlight(e.target.value)}
          placeholder="Highlight / Must try (e.g. Cold coffee, Pasta)"
          style={{ width: "100%", padding: 10, borderRadius: 12, border: "1px solid #ddd", marginTop: 10 }}
        />

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
          <input
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            placeholder="Tags (comma): Study, Aesthetic, Quiet"
            style={{ flex: 1, minWidth: 260, padding: 10, borderRadius: 12, border: "1px solid #ddd" }}
          />
          <input
            value={activitiesInput}
            onChange={(e) => setActivitiesInput(e.target.value)}
            placeholder="Activities (comma): Open mic, Board games"
            style={{ flex: 1, minWidth: 260, padding: 10, borderRadius: 12, border: "1px solid #ddd" }}
          />
        </div>

        <button
          onClick={submitNow}
          disabled={uploading || submitting}
          style={{
            width: "100%",
            marginTop: 14,
            padding: "12px 14px",
            borderRadius: 14,
            border: "1px solid #ddd",
            background: uploading || submitting ? "#666" : "#111",
            color: "#fff",
            cursor: uploading || submitting ? "not-allowed" : "pointer",
            fontWeight: 900,
          }}
        >
          {uploading ? "Uploading..." : submitting ? "Submitting..." : "Submit for Approval"}
        </button>
      </div>
    </div>
  );
}