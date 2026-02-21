import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const API = process.env.REACT_APP_API_URL;

export default function SubmitPlace() {
  const navigate = useNavigate();

  const token = localStorage.getItem("token");

  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [category, setCategory] = useState("");
  const [address, setAddress] = useState("");

  const [imageFile, setImageFile] = useState(null);
  const [imageUrl, setImageUrl] = useState("");

  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  // ✅ Upload image
  const handleUpload = async () => {
    if (!imageFile) return alert("Choose image first");

    try {
      setBusy(true);

      const fd = new FormData();
      fd.append("image", imageFile);

      const res = await axios.post(
        `${API}/api/upload/user`,
        fd,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      setImageUrl(res.data.url);

      setMsg("✅ Image uploaded");

    } catch (err) {

      setMsg(err?.response?.data?.message || "Upload failed");

    } finally {

      setBusy(false);

    }
  };

  // ✅ Submit place
  const handleSubmit = async () => {

    if (!name || !city)
      return alert("Name and City required");

    if (!imageUrl)
      return alert("Upload image first");

    try {

      setBusy(true);

      await axios.post(
        `${API}/api/submissions`,
        {
          name,
          city,
          category,
          address,
          images: [imageUrl],
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      alert("Submitted for approval ✅");

      navigate("/dashboard");

    } catch (err) {

      setMsg(err?.response?.data?.message || "Submit failed");

    } finally {

      setBusy(false);

    }
  };

  return (
    <div style={styles.page}>

      <div style={styles.card}>

        <h2>Submit a Place</h2>

        <input
          placeholder="Place Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={styles.input}
        />

        <input
          placeholder="City"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          style={styles.input}
        />

        <input
          placeholder="Category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          style={styles.input}
        />

        <input
          placeholder="Address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          style={styles.input}
        />

        <input
          type="file"
          onChange={(e) => setImageFile(e.target.files[0])}
          style={styles.input}
        />

        <button
          onClick={handleUpload}
          disabled={busy}
          style={styles.button}
        >
          Upload Image
        </button>

        {imageUrl && (
          <img
            src={`${API}${imageUrl}`}
            alt=""
            style={styles.preview}
          />
        )}

        <button
          onClick={handleSubmit}
          disabled={busy}
          style={styles.button}
        >
          Submit Place
        </button>

        <p>{msg}</p>

      </div>

    </div>
  );
}

const styles = {

  page: {

    display: "flex",

    justifyContent: "center",

    marginTop: 40,

  },

  card: {

    width: 400,

    padding: 20,

    borderRadius: 10,

    background: "#fff",

    boxShadow: "0 0 10px rgba(0,0,0,0.1)",

  },

  input: {

    width: "100%",

    padding: 10,

    marginBottom: 10,

  },

  button: {

    width: "100%",

    padding: 12,

    marginTop: 5,

    background: "#4CAF50",

    color: "#fff",

    border: "none",

    borderRadius: 6,

  },

  preview: {

    width: "100%",

    marginTop: 10,

  },

};