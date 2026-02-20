import React, { useMemo, useState } from "react";
import axios from "axios";

import f1 from "../assets/f1.jpg";
import f2 from "../assets/f2.jpg";
import f3 from "../assets/f3.jpg";
import f4 from "../assets/f4.jpg";
import f5 from "../assets/f5.jpg";

const API = process.env.REACT_APP_API_URL;

const Login = () => {
  const [isRegister, setIsRegister] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

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

    if (!API) {
      setMsg("API URL missing. Add REACT_APP_API_URL in Vercel and redeploy.");
      return;
    }

    if (isRegister && !name.trim()) {
      setMsg("Please enter your full name.");
      return;
    }
    if (!email.trim() || !password.trim()) {
      setMsg("Please enter email and password.");
      return;
    }

    try {
      setBusy(true);

      if (isRegister) {
        const res = await axios.post(`${API}/api/auth/register`, {
          name,
          email,
          password,
        });

        setMsg(res.data?.message || "✅ Registered! Now login.");
        setIsRegister(false);
        setName("");
        setPassword("");
        return;
      }

      const res = await axios.post(`${API}/api/auth/login`, {
        email,
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
      setMsg(err?.response?.data?.message || "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={page} className="mn_login_page">
      {/* HERO (background only here) */}
      <section style={heroSection} className="mn_heroSection">
        <div style={heroOverlay} />
        <div style={heroInner} className="mn_heroInner">
          <div style={heroGrid} className="mn_topGrid">
            {/* Left */}
            <div style={heroLeft} className="mn_heroLeft">
              <div style={heroPill}>✨ MoodNest • Smart Place Recommender</div>

              <h1 style={heroTitle} className="mn_heroTitle">
                Your mood decides the{" "}
                <span style={{ textDecoration: "underline", textUnderlineOffset: 6 }}>
                  destination
                </span>
                .
              </h1>

              <p style={heroDesc} className="mn_heroDesc">
                MoodNest helps you discover nearby places using a mix of{" "}
                <b>curated recommendations</b> and <b>Google live results</b>. Search
                cafes, gyms, restaurants, parks — or tap mood buttons for quick picks.
              </p>

              <div style={chipRow} className="mn_chipRow">
                {["Romantic 👀💕", "Cozy ☕︎🍂˖", "Study 📜", "Nature ⛰️🍃˚", "Budget 💸", "Night ✨🌙"].map(
                  (t) => (
                    <span key={t} style={chip}>
                      {t}
                    </span>
                  )
                )}
              </div>

              <div style={heroMiniNote}>Made for quick place discovery • MERN + Google Places</div>
            </div>

            {/* Right (glass card) */}
            <div style={loginCard} className="mn_loginCard">
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
                <h2 style={{ margin: 0, fontSize: 26 }}>{isRegister ? "Create Account" : "Login"}</h2>
                <span style={tinyHint}>{isRegister ? "New here" : "Welcome back"}</span>
              </div>

              <p style={{ marginTop: 8, opacity: 0.72, fontSize: 14.5 }}>
                {isRegister ? "Register and start exploring." : "Sign in to start exploring ᨒ𓂃☕︎‧˚"}
              </p>

              {msg ? <div style={msgBox}>{msg}</div> : null}

              <form onSubmit={submit} style={{ marginTop: 14 }}>
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

                <button type="submit" style={primaryBtn} disabled={busy}>
                  {busy ? "Please wait..." : isRegister ? "Register" : "Login"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMsg("");
                    setIsRegister((p) => !p);
                  }}
                  style={secondaryBtn}
                  disabled={busy}
                >
                  {isRegister ? "Already have account? Login" : "New user? Create account"}
                </button>

                <div style={tinyNote}>GoogleAuth Soon.</div>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* CLEAN CONTENT AREA (no bg image) */}
      <main style={contentWrap} className="mn_contentWrap">
        {/* ABOUT */}
        <section style={{ marginTop: 28 }}>
          <div style={sectionCard}>
            <h2 style={{ marginTop: 0 }}>About MoodNest</h2>

            <p style={{ marginTop: 8, opacity: 0.86, lineHeight: 1.65 }}>
              MoodNest is a MERN-based web app 🌐 that helps users discover places near them.
              It combines <b>curated recommendations</b> (handpicked by admin) with{" "}
              <b>live Google results</b>. Users can search, explore place details, and save
              favorites for later.
            </p>

            <div style={miniGrid} className="mn_miniGrid">
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

        {/* FOUNDERS */}
        <section style={{ marginTop: 18, marginBottom: 34 }}>
          <div style={sectionCard}>
            <h2 style={{ marginTop: 0 }}>Founders</h2>
            <p style={{ marginTop: 6, opacity: 0.78 }}>Team behind MoodNest.</p>

            <div style={foundersGrid} className="mn_foundersGrid">
              {founders.map((f) => (
                <FounderCard key={f.name} f={f} />
              ))}
            </div>

            <div style={{ marginTop: 14, fontSize: 12, opacity: 0.65 }}>
              <b>© 2026 MoodNest LLC All rights reserved</b>.
            </div>
          </div>
        </section>
      </main>

      {/* RESPONSIVE */}
      <style>{`
        @media (max-width: 980px) {
          .mn_topGrid { grid-template-columns: 1fr !important; }
          .mn_loginCard { margin-top: 14px; }
          .mn_heroLeft { max-width: 100% !important; }
        }
        @media (max-width: 640px) {
          .mn_heroInner { padding: 18px !important; }
          .mn_heroTitle { font-size: 32px !important; line-height: 1.12 !important; }
          .mn_heroDesc { font-size: 14.5px !important; }
          .mn_chipRow span { font-size: 12px !important; padding: 6px 10px !important; }
          .mn_miniGrid { grid-template-columns: 1fr !important; }
          .mn_foundersGrid { grid-template-columns: repeat(2, 1fr) !important; gap: 12px !important; }
          .mn_founderPhotoWrap { height: 220px !important; }
        }
        @media (max-width: 420px) {
          .mn_foundersGrid { grid-template-columns: 1fr !important; }
          .mn_founderPhotoWrap { height: 260px !important; }
        }
      `}</style>
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
        boxShadow: hover ? "0 18px 40px rgba(0,0,0,0.12)" : founderCard.boxShadow,
        border: hover ? "1px solid #e7e7ff" : founderCard.border,
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div style={photoWrapper} className="mn_founderPhotoWrap">
        <img
          src={f.photo}
          alt={f.name}
          style={{
            ...photoStyle,
            transform: hover ? "scale(1.06)" : "scale(1)",
          }}
        />
      </div>

      <div style={{ marginTop: 12 }}>
        <div style={{ fontWeight: 850, fontSize: 15 }}>{f.name}</div>
        <div style={{ fontSize: 13, opacity: 0.72, marginTop: 3 }}>{f.branch}</div>

        <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 12 }}>
          <a href={f.linkedin} target="_blank" rel="noreferrer" style={socialBtn} title="LinkedIn">
            in
          </a>
          <a href={f.instagram} target="_blank" rel="noreferrer" style={socialBtn} title="Instagram">
            ig
          </a>
        </div>
      </div>
    </div>
  );
};

/* ------------------ STYLES ------------------ */

const page = {
  minHeight: "100vh",
  background: "#f6f7fb",
};

const heroSection = {
  position: "relative",
  minHeight: "100vh",
  backgroundImage: `url(${f5})`,
  backgroundSize: "cover",
  backgroundPosition: "center",
  backgroundRepeat: "no-repeat",
};

const heroOverlay = {
  position: "absolute",
  inset: 0,
  background:
    "radial-gradient(900px 500px at 15% 20%, rgba(255,255,255,0.12), transparent), linear-gradient(90deg, rgba(0,0,0,0.70) 0%, rgba(0,0,0,0.35) 45%, rgba(0,0,0,0.25) 100%)",
};

const heroInner = {
  position: "relative",
  padding: 24,
};

const contentWrap = {
  maxWidth: 1150,
  margin: "0 auto",
  padding: "0 24px",
};

const heroGrid = {
  maxWidth: 1150,
  margin: "0 auto",
  display: "grid",
  gridTemplateColumns: "1.15fr 1fr",
  gap: 24,
  alignItems: "center",
  minHeight: "calc(100vh - 48px)",
};

const heroLeft = {
  maxWidth: 640,
  color: "#fff",
};

const heroPill = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  padding: "8px 14px",
  borderRadius: 999,
  border: "1px solid rgba(255,255,255,0.22)",
  background: "rgba(255,255,255,0.10)",
  fontSize: 13,
  backdropFilter: "blur(10px)",
};

const heroTitle = {
  margin: "14px 0 10px",
  fontSize: 52,
  lineHeight: 1.02,
  letterSpacing: "-0.5px",
  textShadow: "0 10px 30px rgba(0,0,0,0.35)",
};

const heroDesc = {
  margin: 0,
  opacity: 0.92,
  fontSize: 16,
  lineHeight: 1.7,
  maxWidth: 580,
  textShadow: "0 10px 28px rgba(0,0,0,0.25)",
};

const heroMiniNote = {
  marginTop: 16,
  fontSize: 12.5,
  opacity: 0.8,
};

const chipRow = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
  marginTop: 18,
};

const chip = {
  padding: "8px 12px",
  borderRadius: 999,
  border: "1px solid rgba(255,255,255,0.22)",
  background: "rgba(255,255,255,0.12)",
  fontSize: 13,
  color: "#fff",
  backdropFilter: "blur(10px)",
};

const loginCard = {
  background: "rgba(255,255,255,0.92)",
  borderRadius: 22,
  padding: 26,
  boxShadow: "0 24px 70px rgba(0,0,0,0.25)",
  border: "1px solid rgba(255,255,255,0.35)",
  backdropFilter: "blur(14px)",
};

const tinyHint = { fontSize: 12, opacity: 0.75 };

const msgBox = {
  marginTop: 10,
  padding: 10,
  borderRadius: 12,
  border: "1px solid rgba(0,0,0,0.08)",
  background: "rgba(0,0,0,0.03)",
  fontSize: 14,
};

const inputStyle = {
  width: "100%",
  padding: 12,
  borderRadius: 12,
  border: "1px solid rgba(0,0,0,0.10)",
  marginTop: 10,
  outline: "none",
  background: "rgba(255,255,255,0.96)",
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
  fontWeight: 800,
};

const secondaryBtn = {
  width: "100%",
  padding: 12,
  borderRadius: 12,
  border: "1px solid rgba(0,0,0,0.10)",
  background: "#fff",
  marginTop: 10,
  cursor: "pointer",
  fontWeight: 800,
};

const tinyNote = { marginTop: 10, fontSize: 12, opacity: 0.7 };

const sectionCard = {
  background: "rgba(255,255,255,0.98)",
  borderRadius: 22,
  padding: 22,
  boxShadow: "0 14px 36px rgba(0,0,0,0.08)",
  border: "1px solid rgba(240,240,240,1)",
};

const miniGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: 12,
  marginTop: 14,
};

const miniCard = {
  border: "1px solid rgba(0,0,0,0.06)",
  borderRadius: 18,
  padding: 14,
  background: "#ffffff",
  boxShadow: "0 10px 22px rgba(0,0,0,0.06)",
};

const miniDesc = { fontSize: 13, opacity: 0.75, marginTop: 4 };

const foundersGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(4, 1fr)",
  gap: 14,
  marginTop: 14,
};

const founderCard = {
  border: "1px solid rgba(0,0,0,0.06)",
  borderRadius: 22,
  padding: 16,
  background: "linear-gradient(145deg, #ffffff, #f3f4f6)",
  boxShadow: "0 12px 26px rgba(0,0,0,0.08)",
  textAlign: "center",
  transition: "all 0.25s ease",
};

const photoWrapper = {
  width: "100%",
  height: 260,
  borderRadius: 18,
  overflow: "hidden",
  border: "1px solid rgba(0,0,0,0.06)",
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
  border: "1px solid rgba(0,0,0,0.10)",
  background: "#fff",
  textDecoration: "none",
  color: "#111",
  fontWeight: 900,
  fontSize: 13,
};

export default Login;