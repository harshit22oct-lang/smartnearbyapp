import React, { useMemo, useState } from "react";
import axios from "axios";

import f1 from "../assets/f1.jpg";
import f2 from "../assets/f2.jpg";
import f3 from "../assets/f3.jpg";
import f4 from "../assets/f4.jpg";

const API = process.env.REACT_APP_API_URL;

const Login = () => {
  const [isRegister, setIsRegister] = useState(false);

  const [name, setName] = useState(""); // register only
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
      setMsg("API URL missing. Set REACT_APP_API_URL in Vercel and redeploy.");
      return;
    }

    if (!email || !password) {
      setMsg("Please enter email and password.");
      return;
    }

    try {
      setBusy(true);

      if (isRegister) {
        if (!name.trim()) {
          setMsg("Please enter your full name.");
          setBusy(false);
          return;
        }

        const res = await axios.post(`${API}/api/auth/register`, {
          name,
          email,
          password,
        });

        setMsg(res.data?.message || "✅ Registered! Now login.");
        setIsRegister(false);
        setName("");
        setPassword("");
        setBusy(false);
        return;
      }

      const res = await axios.post(`${API}/api/auth/login`, { email, password });
      const token = res.data?.token;

      if (!token) {
        setMsg("Login failed: token not received.");
        setBusy(false);
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
    <div className="mn_login_page">
      <div className="mn_login_container">
        {/* HERO + FORM */}
        <div className="mn_top_grid">
          {/* LEFT HERO */}
          <div className="mn_hero">
            <div className="mn_pill">✨ MoodNest • Smart Place Discovery</div>

            <h1 className="mn_title">
              Your mood decides the <span className="mn_underline">destination</span>.
            </h1>

            <p className="mn_desc">
              MoodNest helps you discover places using a mix of <b>curated recommendations</b> and{" "}
              <b>Google live results</b>. Search cafes, gyms, restaurants, parks — or tap mood buttons for
              quick picks.
            </p>

            <div className="mn_chip_row">
              {["Romantic 💕", "Cozy ☕", "Study 📚", "Nature 🍃", "Budget 💸", "Night ✨"].map((t) => (
                <span key={t} className="mn_chip">
                  {t}
                </span>
              ))}
            </div>

            <div className="mn_note">
              🔮 Future plan: AI-powered day itinerary suggestions based on city + mood + budget.
            </div>
          </div>

          {/* RIGHT FORM */}
          <div className="mn_card">
            <div className="mn_card_header">
              <div>
                <h2 className="mn_card_title">{isRegister ? "Create Account" : "Login"}</h2>
                <div className="mn_card_sub">
                  {isRegister ? "Register and start exploring." : "Welcome back — sign in to continue."}
                </div>
              </div>

              <span className="mn_badge">{isRegister ? "New" : "Secure"}</span>
            </div>

            {msg ? <div className="mn_msg">{msg}</div> : null}

            <form onSubmit={submit} className="mn_form">
              {isRegister ? (
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Full name"
                  className="mn_input"
                />
              ) : null}

              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                className="mn_input"
              />

              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                type="password"
                className="mn_input"
              />

              <button type="submit" className="mn_btn_primary" disabled={busy}>
                {busy ? "Please wait..." : isRegister ? "Register" : "Login"}
              </button>

              <button
                type="button"
                className="mn_btn_secondary"
                onClick={() => {
                  setMsg("");
                  setIsRegister((p) => !p);
                }}
                disabled={busy}
              >
                {isRegister ? "Already have account? Login" : "New user? Create account"}
              </button>

              <div className="mn_small_text">GoogleAuth Soon.</div>
            </form>
          </div>
        </div>

        {/* FOUNDERS */}
        <div className="mn_section">
          <div className="mn_section_card">
            <div className="mn_section_head">
              <h2 className="mn_section_title">Founders</h2>
              <p className="mn_section_desc">Team behind MoodNest.</p>
            </div>

            <div className="mn_founders_grid">
              {founders.map((f) => (
                <FounderCard key={f.name} f={f} />
              ))}
            </div>

            <div className="mn_footer_note">
              <b>© 2026 MoodNest</b> — All rights reserved.
            </div>
          </div>
        </div>
      </div>

      <style>{css}</style>
    </div>
  );
};

const FounderCard = ({ f }) => {
  return (
    <div className="mn_founder_card">
      <div className="mn_photo_wrap">
        <img src={f.photo} alt={f.name} className="mn_photo" />
      </div>

      <div className="mn_founder_name">{f.name}</div>
      <div className="mn_founder_branch">{f.branch}</div>

      <div className="mn_social_row">
        <a href={f.linkedin} target="_blank" rel="noreferrer" className="mn_social">
          in
        </a>
        <a href={f.instagram} target="_blank" rel="noreferrer" className="mn_social">
          ig
        </a>
      </div>
    </div>
  );
};

const css = `
  .mn_login_page{
    min-height:100vh;
    background:
      radial-gradient(1100px 600px at 20% 10%, rgba(17,24,39,0.10), transparent),
      radial-gradient(900px 500px at 90% 20%, rgba(99,102,241,0.12), transparent),
      #f6f7fb;
    padding: 18px;
  }

  .mn_login_container{
    max-width: 1100px;
    margin: 0 auto;
  }

  .mn_top_grid{
    display:grid;
    grid-template-columns: 1.1fr 0.9fr;
    gap: 18px;
    align-items: center;
    min-height: 78vh;
  }

  .mn_pill{
    display:inline-block;
    padding: 6px 12px;
    border-radius: 999px;
    border: 1px solid #e5e7eb;
    background: rgba(255,255,255,0.92);
    font-size: 13px;
    backdrop-filter: blur(8px);
  }

  .mn_title{
    margin: 14px 0 10px;
    font-size: 44px;
    line-height: 1.08;
  }

  .mn_underline{ text-decoration: underline; }

  .mn_desc{
    margin: 0;
    opacity: 0.82;
    font-size: 16px;
    line-height: 1.55;
    max-width: 560px;
  }

  .mn_chip_row{
    display:flex;
    gap: 10px;
    flex-wrap: wrap;
    margin-top: 14px;
  }

  .mn_chip{
    padding: 7px 12px;
    border-radius: 999px;
    border: 1px solid #e5e7eb;
    background: rgba(255,255,255,0.92);
    font-size: 13px;
    backdrop-filter: blur(8px);
  }

  .mn_note{
    margin-top: 14px;
    font-size: 13px;
    opacity: 0.75;
    max-width: 560px;
  }

  .mn_card{
    background: rgba(255,255,255,0.94);
    border-radius: 20px;
    padding: 22px;
    box-shadow: 0 14px 35px rgba(0,0,0,0.10);
    border: 1px solid rgba(229,231,235,0.9);
    backdrop-filter: blur(10px);
  }

  .mn_card_header{
    display:flex;
    align-items:flex-start;
    justify-content:space-between;
    gap: 12px;
  }

  .mn_card_title{ margin:0; }
  .mn_card_sub{ margin-top: 6px; font-size: 13px; opacity: 0.75; }

  .mn_badge{
    padding: 7px 10px;
    border-radius: 999px;
    border: 1px solid #e5e7eb;
    background: #fff;
    font-size: 12px;
    font-weight: 800;
    opacity: 0.9;
  }

  .mn_msg{
    margin-top: 12px;
    padding: 10px 12px;
    border-radius: 14px;
    border: 1px solid #eee;
    background: #fafafa;
    font-size: 14px;
    line-height: 1.35;
  }

  .mn_form{ margin-top: 12px; }

  .mn_input{
    width:100%;
    padding: 12px;
    border-radius: 12px;
    border: 1px solid #e5e7eb;
    margin-top: 10px;
    outline: none;
    background: #fff;
  }

  .mn_btn_primary{
    width:100%;
    padding: 12px;
    border-radius: 12px;
    border: 1px solid #111;
    background: #111;
    color: #fff;
    margin-top: 12px;
    cursor: pointer;
    font-weight: 800;
  }

  .mn_btn_primary:disabled{
    opacity: 0.7;
    cursor: not-allowed;
  }

  .mn_btn_secondary{
    width:100%;
    padding: 12px;
    border-radius: 12px;
    border: 1px solid #e5e7eb;
    background: #fff;
    margin-top: 10px;
    cursor: pointer;
    font-weight: 800;
  }

  .mn_btn_secondary:disabled{
    opacity: 0.7;
    cursor: not-allowed;
  }

  .mn_small_text{ margin-top: 10px; font-size: 12px; opacity: 0.7; text-align:center; }

  .mn_section{ margin-top: 18px; margin-bottom: 28px; }

  .mn_section_card{
    background: rgba(255,255,255,0.95);
    border-radius: 20px;
    padding: 18px;
    box-shadow: 0 12px 30px rgba(0,0,0,0.07);
    border: 1px solid rgba(240,240,240,1);
  }

  .mn_section_head{ display:flex; align-items:baseline; justify-content:space-between; gap: 10px; }
  .mn_section_title{ margin:0; }
  .mn_section_desc{ margin:0; opacity:0.75; }

  .mn_founders_grid{
    margin-top: 14px;
    display:grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
  }

  .mn_founder_card{
    border: 1px solid #eee;
    border-radius: 18px;
    padding: 14px;
    background: linear-gradient(145deg, #ffffff, #f3f4f6);
    box-shadow: 0 10px 22px rgba(0,0,0,0.08);
    text-align:center;
  }

  .mn_photo_wrap{
    width:100%;
    height: 220px;
    border-radius: 16px;
    overflow:hidden;
    border: 1px solid #eee;
    background:#f9fafb;
  }

  .mn_photo{ width:100%; height:100%; object-fit:cover; display:block; }

  .mn_founder_name{ margin-top: 10px; font-weight: 900; }
  .mn_founder_branch{ margin-top: 4px; font-size: 13px; opacity: 0.72; }

  .mn_social_row{ display:flex; justify-content:center; gap: 10px; margin-top: 12px; }

  .mn_social{
    width: 40px; height: 40px;
    display:inline-flex; align-items:center; justify-content:center;
    border-radius: 12px;
    border: 1px solid #e5e7eb;
    background: #f9fafb;
    text-decoration: none;
    color: #111;
    font-weight: 900;
  }

  .mn_footer_note{ margin-top: 12px; font-size: 12px; opacity: 0.7; }

  /* ✅ MOBILE */
  @media (max-width: 980px){
    .mn_top_grid{ grid-template-columns: 1fr; min-height: auto; }
    .mn_title{ font-size: 34px; line-height: 1.1; }
    .mn_desc{ max-width: 100%; }
    .mn_founders_grid{ grid-template-columns: repeat(2, 1fr); }
    .mn_photo_wrap{ height: 200px; }
  }

  @media (max-width: 520px){
    .mn_login_page{ padding: 12px; }
    .mn_title{ font-size: 28px; }
    .mn_card{ padding: 18px; }
    .mn_founders_grid{ grid-template-columns: 1fr; }
    .mn_photo_wrap{ height: 220px; }
  }
`;

export default Login;
