import React, { useMemo, useState } from "react";
import axios from "axios";

import f1 from "../assets/f1.jpg";
import f2 from "../assets/f2.jpg";
import f3 from "../assets/f3.jpg";
import f4 from "../assets/f4.jpg";

const Login = () => {
  const [isRegister, setIsRegister] = useState(false);

  const [name, setName] = useState(""); // register only
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [msg, setMsg] = useState("");

  // ✅ LIVE API from Vercel env (CRA)
  const API = process.env.REACT_APP_API_URL;

  const founders = useMemo(
    () => [
      {
        name: "Harshit Kumar",
        branch: "CSE(Core) • BTech",
        photo: f1,
        linkedin: "https://www.linkedin.com/in/harshit-kumar-a7b82b292/",
        instagram: "https://instagram.com/your-link-1",
      },
      {
        name: "Shreya Raj",
        branch: "CSE(HealthInfo) • BTech",
        photo: f2,
        linkedin: "https://linkedin.com/in/your-link-2",
        instagram: "https://instagram.com/your-link-2",
      },
      {
        name: "Neha Saraf",
        branch: "CSE(EdTech) • BTech",
        photo: f3,
        linkedin: "https://linkedin.com/in/your-link-3",
        instagram: "https://instagram.com/your-link-3",
      },
      {
        name: "Nancy Khandelwal",
        branch: "CSE(AI&ML) • BTech",
        photo: f4,
        linkedin: "https://linkedin.com/in/your-link-4",
        instagram: "https://instagram.com/your-link-4",
      },
    ],
    []
  );

  const submit = async (e) => {
    e.preventDefault();
    setMsg("");

    // ✅ If env var missing (common on Vercel if not set to Production or not redeployed)
    if (!API) {
      setMsg(
        "API URL missing. Add REACT_APP_API_URL in Vercel (Production) and redeploy."
      );
      return;
    }

    try {
      const cleanName = name.trim();
      const cleanEmail = email.trim();

      if (isRegister) {
        const res = await axios.post(`${API}/api/auth/register`, {
          name: cleanName,
          email: cleanEmail,
          password,
        });

        setMsg(res.data?.message || "✅ Registered! Now login.");
        setIsRegister(false);
        setName("");
        setPassword("");
        return;
      }

      const res = await axios.post(`${API}/api/auth/login`, {
        email: cleanEmail,
        password,
      });

      const token = res.data?.token;
      if (!token) {
        setMsg("Login failed: token not received");
        return;
      }

      localStorage.setItem("token", token);
      window.location.href = "/dashboard";
    } catch (err) {
      setMsg(err?.response?.data?.message || err?.message || "Something went wrong");
    }
  };

  return (
    <div style={pageWrap}>
      <div style={container}>
        {/* TOP: HERO + LOGIN */}
        <div style={topGrid}>
          {/* Left: Branding */}
          <div>
            <div style={pill}>✨ MoodNest • Smart Place Recommender</div>

            <h1 style={heroTitle}>
              Your mood decides the{" "}
              <span style={{ textDecoration: "underline" }}>destination</span>.
            </h1>

            <p style={heroDesc}>
              MoodNest helps you discover nearby places using a mix of{" "}
              <b>curated recommendations</b> and <b>Google live results</b>. Search
              cafes, gyms, restaurants, parks — or tap mood buttons for quick
              picks.
            </p>

            <div style={chipRow}>
              {[
                "Romantic 👀💕",
                "Cozy ☕︎🍂˖",
                "Study 📜",
                "Nature ⛰️🍃˚",
                "Budget 💸",
                "Night ✨🌙",
              ].map((t) => (
                <span key={t} style={chip}>
                  {t}
                </span>
              ))}
            </div>
          </div>

          {/* Right: Login Card */}
          <div style={loginCard}>
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                justifyContent: "space-between",
              }}
            >
              <h2 style={{ margin: 0 }}>{isRegister ? "Create Account" : "Login"}</h2>
              <span style={tinyHint}>{isRegister ? "New here" : "Welcome back"}</span>
            </div>

            <p style={{ marginTop: 6, opacity: 0.75 }}>
              {isRegister
                ? "Register and start exploring."
                : "Sign in to start exploring ᨒ𓂃☕︎‧˚"}
            </p>

            {msg ? <div style={msgBox}>{msg}</div> : null}

            <form onSubmit={submit} style={{ marginTop: 12 }}>
              {isRegister ? (
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Full name"
                  style={inputStyle}
                />
              ) : null}

              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                style={inputStyle}
              />

              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                type="password"
                style={inputStyle}
              />

              <button type="submit" style={primaryBtn}>
                {isRegister ? "Register" : "Login"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setMsg("");
                  setIsRegister((p) => !p);
                }}
                style={secondaryBtn}
              >
                {isRegister ? "Already have account? Login" : "New user? Create account"}
              </button>

              <div style={tinyNote}>GoogleAuth Soon.</div>

              {/* Optional debug (remove later) */}
              {/* <div style={{ marginTop: 8, fontSize: 12, opacity: 0.6 }}>API: {API || "NOT SET"}</div> */}
            </form>
          </div>
        </div>

        {/* ABOUT SECTION */}
        <section style={{ marginTop: 30 }}>
          <div style={sectionCard}>
            <h2 style={{ marginTop: 0 }}>About MoodNest </h2>

            <p style={{ marginTop: 6, opacity: 0.85, lineHeight: 1.6 }}>
              MoodNest is a MERN-based web app 🌐that helps users discover places near them.
              It combines <b>curated recommendations</b> (handpicked by admin) with{" "}
              <b>live Google results</b>. Users can search, explore place details,
              and save favorites for later.
            </p>

            <div style={miniGrid}>
              <div style={miniCard}>
                <div style={{ fontSize: 22 }}>🛡️</div>
                <b>Secure Login</b>
                <div style={miniDesc}>JWT auth + protected routes</div>
              </div>
              <div style={miniCard}>
                <div style={{ fontSize: 22 }}>📍</div>
                <b>Smart Search</b>
                <div style={miniDesc}>Curated + Google live results</div>
              </div>
              <div style={miniCard}>
                <div style={{ fontSize: 22 }}>⭐</div>
                <b>Favorites</b>
                <div style={miniDesc}>Save places you love</div>
              </div>
            </div>
          </div>
        </section>

        {/* FOUNDERS SECTION */}
        <section style={{ marginTop: 18, marginBottom: 30 }}>
          <div style={sectionCard}>
            <h2 style={{ marginTop: 0 }}>Founders</h2>
            <p style={{ marginTop: 6, opacity: 0.8 }}>Team behind MoodNest .</p>

            <div style={foundersGrid}>
              {founders.map((f) => (
                <FounderCard key={f.name} f={f} />
              ))}
            </div>

            <div style={{ marginTop: 12, fontSize: 12, opacity: 0.7 }}>
              <b>© 2026 MoodNest LLC All rights reserved</b>.
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

const FounderCard = ({ f }) => {
  const [hover, setHover] = useState(false);

  return (
    <div
      style={{
        ...founderCard,
        transform: hover ? "translateY(-6px)" : "translateY(0px)",
        boxShadow: hover ? "0 16px 35px rgba(0,0,0,0.12)" : founderCard.boxShadow,
        border: hover ? "1px solid #e7e7ff" : founderCard.border,
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {/* Modern Rectangular Photo */}
      <div style={photoWrapper}>
        <img
          src={f.photo}
          alt={f.name}
          style={{
            ...photoStyle,
            transform: hover ? "scale(1.08)" : "scale(1)",
          }}
        />
      </div>

      <div style={{ marginTop: 12 }}>
        <div style={{ fontWeight: 800, fontSize: 15 }}>{f.name}</div>
        <div style={{ fontSize: 13, opacity: 0.72, marginTop: 3 }}>{f.branch}</div>

        <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 12 }}>
          <a
            href={f.linkedin}
            target="_blank"
            rel="noreferrer"
            style={socialBtn}
            aria-label={`${f.name} LinkedIn`}
            title="LinkedIn"
          >
            in
          </a>
          <a
            href={f.instagram}
            target="_blank"
            rel="noreferrer"
            style={socialBtn}
            aria-label={`${f.name} Instagram`}
            title="Instagram"
          >
            ig
          </a>
        </div>
      </div>
    </div>
  );
};

/* ------------------ STYLES ------------------ */

const pageWrap = {
  minHeight: "100vh",
  background:
    "radial-gradient(1200px 600px at 20% 10%, rgba(17,24,39,0.10), transparent), radial-gradient(900px 500px at 90% 20%, rgba(99,102,241,0.12), transparent), #f6f7fb",
  padding: 24,
};

const container = {
  maxWidth: 1100,
  margin: "0 auto",
};

const topGrid = {
  display: "grid",
  gridTemplateColumns: "1.2fr 1fr",
  gap: 22,
  alignItems: "center",
  minHeight: "80vh",
};

const pill = {
  display: "inline-block",
  padding: "6px 12px",
  borderRadius: 999,
  border: "1px solid #e5e7eb",
  background: "rgba(255,255,255,0.9)",
  fontSize: 13,
  backdropFilter: "blur(6px)",
};

const heroTitle = {
  margin: "14px 0 10px",
  fontSize: 44,
  lineHeight: 1.1,
};

const heroDesc = {
  margin: 0,
  opacity: 0.82,
  fontSize: 16,
  maxWidth: 560,
  lineHeight: 1.55,
};

const chipRow = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
  marginTop: 16,
};

const chip = {
  padding: "7px 12px",
  borderRadius: 999,
  border: "1px solid #e5e7eb",
  background: "rgba(255,255,255,0.9)",
  fontSize: 13,
  backdropFilter: "blur(6px)",
};

const loginCard = {
  background: "rgba(255,255,255,0.92)",
  borderRadius: 20,
  padding: 24,
  boxShadow: "0 14px 35px rgba(0,0,0,0.10)",
  border: "1px solid rgba(229,231,235,0.9)",
  backdropFilter: "blur(10px)",
};

const tinyHint = { fontSize: 12, opacity: 0.65 };

const msgBox = {
  marginTop: 10,
  padding: 10,
  borderRadius: 12,
  border: "1px solid #eee",
  background: "#fafafa",
  fontSize: 14,
};

const inputStyle = {
  width: "100%",
  padding: 12,
  borderRadius: 12,
  border: "1px solid #e5e7eb",
  marginTop: 10,
  outline: "none",
};

const primaryBtn = {
  width: "100%",
  padding: 12,
  borderRadius: 12,
  border: "1px solid #111",
  background: "#111",
  color: "#fff",
  marginTop: 12,
  cursor: "pointer",
  fontWeight: 700,
};

const secondaryBtn = {
  width: "100%",
  padding: 12,
  borderRadius: 12,
  border: "1px solid #e5e7eb",
  background: "#fff",
  marginTop: 10,
  cursor: "pointer",
  fontWeight: 700,
};

const tinyNote = { marginTop: 10, fontSize: 12, opacity: 0.7 };

const sectionCard = {
  background: "rgba(255,255,255,0.95)",
  borderRadius: 20,
  padding: 20,
  boxShadow: "0 12px 30px rgba(0,0,0,0.07)",
  border: "1px solid rgba(240,240,240,1)",
  backdropFilter: "blur(8px)",
};

const miniGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: 12,
  marginTop: 14,
};

const miniCard = {
  border: "1px solid #eee",
  borderRadius: 16,
  padding: 14,
  background: "#ffffff",
  boxShadow: "0 8px 18px rgba(0,0,0,0.05)",
};

const miniDesc = { fontSize: 13, opacity: 0.75, marginTop: 4 };

const foundersGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(4, 1fr)",
  gap: 14,
  marginTop: 14,
};

const founderCard = {
  border: "1px solid #eee",
  borderRadius: 20,
  padding: 16,
  background: "linear-gradient(145deg, #ffffff, #f3f4f6)",
  boxShadow: "0 10px 22px rgba(0,0,0,0.08)",
  textAlign: "center",
  transition: "all 0.25s ease",
  fontFamily: "'Outfit', sans-serif",
};

const photoWrapper = {
  width: "100%",
  height: 260,
  borderRadius: 16,
  overflow: "hidden",
  border: "1px solid #eee",
  background: "#f9fafb",
};

const photoStyle = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
  transition: "transform 0.4s ease",
};

const socialBtn = {
  width: 40,
  height: 40,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 12,
  border: "1px solid #e5e7eb",
  background: "#f9fafb",
  textDecoration: "none",
  color: "#111",
  fontWeight: 800,
  fontSize: 13,
  transition: "all 0.2s ease",
};

export default Login;
