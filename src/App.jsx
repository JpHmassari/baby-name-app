import React, { useState } from "react";
import { supabase } from "./lib/supabase";

export default function App() {
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [profileCreated, setProfileCreated] = useState(false);
  const [coupleCode, setCoupleCode] = useState("");
  const [loading, setLoading] = useState(false);

  function generateCoupleCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  async function createProfile() {
    setMessage("");

    if (!name.trim()) {
      setMessage("⚠️ Inserisci il tuo nome");
      return;
    }

    setLoading(true);

    const newCoupleCode = generateCoupleCode();

    const { data, error } = await supabase
      .from("profiles")
      .insert({
        name: name.trim(),
        couple_code: newCoupleCode,
        partner_name: null,
        liked_names: [],
        loved_names: [],
        disliked_names: []
      })
      .select();

    setLoading(false);

    if (error) {
      console.error("SUPABASE ERROR:", error);
      setMessage("❌ Errore Supabase: " + error.message);
      return;
    }

    setProfileCreated(true);
    setCoupleCode(newCoupleCode);
    setMessage("✅ Profilo creato correttamente!");
    console.log("Profilo creato:", data);
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f7f7f7",
        padding: "40px 20px",
        fontFamily: "Arial, sans-serif"
      }}
    >
      <div
        style={{
          maxWidth: "600px",
          margin: "0 auto",
          background: "white",
          borderRadius: "16px",
          padding: "30px",
          boxShadow: "0 10px 30px rgba(0,0,0,0.08)"
        }}
      >
        <h1 style={{ marginTop: 0, marginBottom: "10px" }}>Il Nome Perfetto</h1>
        <p style={{ color: "#666", marginTop: 0 }}>
          Crea il tuo profilo e ottieni il tuo codice coppia.
        </p>

        {!profileCreated && (
          <>
            <label
              style={{
                display: "block",
                marginBottom: "8px",
                fontWeight: "bold"
              }}
            >
              Il tuo nome
            </label>

            <input
              type="text"
              placeholder="Es. Joseph"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{
                width: "100%",
                padding: "12px",
                fontSize: "16px",
                borderRadius: "10px",
                border: "1px solid #ccc",
                marginBottom: "16px"
              }}
            />

            <button
              onClick={createProfile}
              disabled={loading}
              style={{
                padding: "12px 18px",
                fontSize: "16px",
                borderRadius: "10px",
                border: "none",
                background: loading ? "#999" : "#111",
                color: "white",
                cursor: loading ? "not-allowed" : "pointer"
              }}
            >
              {loading ? "Creazione..." : "Crea profilo"}
            </button>
          </>
        )}

        {message && (
          <div
            style={{
              marginTop: "20px",
              padding: "14px",
              borderRadius: "10px",
              background: "#f3f3f3",
              color: "#222"
            }}
          >
            {message}
          </div>
        )}

        {profileCreated && (
          <div
            style={{
              marginTop: "24px",
              padding: "20px",
              borderRadius: "12px",
              background: "#eef6ff",
              border: "1px solid #cfe3ff"
            }}
          >
            <h3 style={{ marginTop: 0 }}>🎉 Profilo creato</h3>
            <p>Il tuo codice coppia è:</p>

            <div
              style={{
                fontSize: "28px",
                fontWeight: "bold",
                letterSpacing: "4px",
                margin: "10px 0 20px 0"
              }}
            >
              {coupleCode}
            </div>

            <button
              onClick={() => navigator.clipboard.writeText(coupleCode)}
              style={{
                padding: "10px 14px",
                borderRadius: "10px",
                border: "1px solid #999",
                background: "white",
                cursor: "pointer"
              }}
            >
              Copia codice
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
