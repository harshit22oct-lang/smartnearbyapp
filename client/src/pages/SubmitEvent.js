import React, { useMemo, useRef, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const API = process.env.REACT_APP_API_URL || "";

const parseCsv = (raw) =>
  String(raw || "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

const parseUrls = (raw) =>
  Array.from(
    new Set(
      String(raw || "")
        .split(/[\n,]+/g)
        .map((x) => x.trim())
        .filter((u) => /^https?:\/\/.+/i.test(u) || u.startsWith("/uploads/"))
    )
  );

export default function SubmitEvent() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const authHeader = useMemo(() => ({ headers: { Authorization: `Bearer ${token}` } }), [token]);

  const [title, setTitle] = useState("");
  const [city, setCity] = useState("");
  const [category, setCategory] = useState("");
  const [venue, setVenue] = useState("");
  const [address, setAddress] = useState("");
  const [description, setDescription] = useState("");
  const [organizer, setOrganizer] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [price, setPrice] = useState("0");
  const [capacity, setCapacity] = useState("200");
  const [website, setWebsite] = useState("");
  const [instagram, setInstagram] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [hasTickets, setHasTickets] = useState(false);

  const fileInputRef = useRef(null);
  const [localFiles, setLocalFiles] = useState([]);
  const [urlInput, setUrlInput] = useState("");
  const [urlImages, setUrlImages] = useState([]);

  const [isAdmin, setIsAdmin] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState("");

  React.useEffect(() => {
    const load = async () => {
      try {
        if (!token || !API) return;
        const res = await axios.get(`${API}/api/auth/profile`, authHeader);
        setIsAdmin(!!res.data?.isAdmin);
      } catch {}
      finally {
        setLoadingProfile(false);
      }
    };
    load();
  }, [authHeader, token]);

  const pickFiles = (files) => {
    const list = Array.from(files || []).filter(Boolean);
    if (!list.length) return;
    setLocalFiles((prev) => [...prev, ...list].slice(0, 8));
  };

  const uploadLocal = async () => {
    if (!localFiles.length) return [];
    const fd = new FormData();
    localFiles.forEach((f) => fd.append("images", f));
    const res = await axios.post(`${API}/api/upload/user-multi`, fd, authHeader);
    return Array.isArray(res.data?.urls) ? res.data.urls : [];
  };

  const submitNow = async (mode) => {
    setMsg("");
    if (!token) return setMsg("Please login first");
    if (!title.trim()) return setMsg("Title is required");
    if (!city.trim()) return setMsg("City is required");
    if (!startAt) return setMsg("Start date-time is required");

    setSubmitting(true);
    try {
      const uploaded = await uploadLocal();
      const images = [...uploaded, ...urlImages].map((x) => String(x || "").trim()).filter(Boolean);

      const payload = {
        title: title.trim(),
        city: city.trim().toLowerCase(),
        category: category.trim(),
        venue: venue.trim(),
        address: address.trim(),
        description: description.trim(),
        organizer: organizer.trim(),
        startAt,
        endAt: endAt || null,
        price: Number(price || 0),
        capacity: Number(capacity || 200),
        website: website.trim(),
        instagram: instagram.trim(),
        contactPhone: contactPhone.trim(),
        contactEmail: contactEmail.trim(),
        tags: parseCsv(tagsInput),
        hasTickets: !!hasTickets,
        images,
        bannerImage: images[0] || "",
      };

      if (mode === "publish" && isAdmin) {
        await axios.post(`${API}/api/events`, { ...payload, isCurated: true }, authHeader);
        alert("Event published");
      } else {
        await axios.post(`${API}/api/event-submissions`, payload, authHeader);
        alert("Event submitted for admin approval");
      }

      navigate("/dashboard");
    } catch (err) {
      setMsg(err?.response?.data?.message || "Submit failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (!API) return <div style={{ padding: 20 }}>Set `REACT_APP_API_URL` first.</div>;
  if (loadingProfile) return <div style={{ padding: 20 }}>Loading...</div>;

  return (
    <div style={{ padding: 20, background: "#f6f7fb", minHeight: "100vh" }}>
      <div style={{ maxWidth: 860, margin: "0 auto", background: "#fff", borderRadius: 16, padding: 18 }}>
        <h2 style={{ marginTop: 0 }}>{isAdmin ? "Create Event" : "Submit Event"}</h2>
        <p style={{ opacity: 0.8, fontSize: 13 }}>
          {isAdmin ? "Admin can publish directly." : "Your event goes to admin approval first."}
        </p>

        {msg ? <div style={{ marginBottom: 12, fontWeight: 700 }}>{msg}</div> : null}

        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" style={{ width: "100%", padding: 10, marginBottom: 10 }} />
        <div style={{ display: "flex", gap: 10 }}>
          <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" style={{ flex: 1, padding: 10, marginBottom: 10 }} />
          <input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Category" style={{ flex: 1, padding: 10, marginBottom: 10 }} />
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <input value={venue} onChange={(e) => setVenue(e.target.value)} placeholder="Venue" style={{ flex: 1, padding: 10, marginBottom: 10 }} />
          <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Address" style={{ flex: 1, padding: 10, marginBottom: 10 }} />
        </div>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" rows={3} style={{ width: "100%", padding: 10, marginBottom: 10 }} />
        <div style={{ display: "flex", gap: 10 }}>
          <input type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} style={{ flex: 1, padding: 10, marginBottom: 10 }} />
          <input type="datetime-local" value={endAt} onChange={(e) => setEndAt(e.target.value)} style={{ flex: 1, padding: 10, marginBottom: 10 }} />
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Entry Fee (0 for free)" style={{ flex: 1, padding: 10, marginBottom: 10 }} />
          <input value={capacity} onChange={(e) => setCapacity(e.target.value)} placeholder="Capacity" style={{ flex: 1, padding: 10, marginBottom: 10 }} />
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <input value={organizer} onChange={(e) => setOrganizer(e.target.value)} placeholder="Organizer" style={{ flex: 1, padding: 10, marginBottom: 10 }} />
          <input value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} placeholder="Tags (comma)" style={{ flex: 1, padding: 10, marginBottom: 10 }} />
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="Website" style={{ flex: 1, padding: 10, marginBottom: 10 }} />
          <input value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="Instagram" style={{ flex: 1, padding: 10, marginBottom: 10 }} />
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="Contact phone" style={{ flex: 1, padding: 10, marginBottom: 10 }} />
          <input value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="Contact email" style={{ flex: 1, padding: 10, marginBottom: 10 }} />
        </div>

        <label style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10 }}>
          <input type="checkbox" checked={hasTickets} onChange={(e) => setHasTickets(e.target.checked)} />
          Tickets available
        </label>

        <div style={{ marginBottom: 10 }}>
          <button onClick={() => fileInputRef.current?.click()} style={{ padding: "8px 12px" }}>Choose Photos</button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            style={{ display: "none" }}
            onChange={(e) => {
              pickFiles(e.target.files);
              e.target.value = "";
            }}
          />
          <div style={{ fontSize: 12, opacity: 0.8, marginTop: 6 }}>{localFiles.length} local files selected</div>
        </div>

        <textarea
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          placeholder="Photo URLs (comma or new line)"
          rows={3}
          style={{ width: "100%", padding: 10, marginBottom: 8 }}
        />
        <button
          onClick={() => setUrlImages(parseUrls(urlInput))}
          type="button"
          style={{ padding: "8px 12px", marginBottom: 12 }}
        >
          Add URL Photos
        </button>

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => navigate("/dashboard")} style={{ padding: "10px 12px" }}>Back</button>
          {!isAdmin ? (
            <button disabled={submitting} onClick={() => submitNow("submit")} style={{ padding: "10px 12px", background: "#111", color: "#fff" }}>
              {submitting ? "Submitting..." : "Submit for Approval"}
            </button>
          ) : (
            <>
              <button disabled={submitting} onClick={() => submitNow("submit")} style={{ padding: "10px 12px" }}>
                Submit for Approval
              </button>
              <button disabled={submitting} onClick={() => submitNow("publish")} style={{ padding: "10px 12px", background: "#111", color: "#fff" }}>
                Publish Directly
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
