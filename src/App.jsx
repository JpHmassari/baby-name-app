import React, { useState } from "react";
import { supabase } from "./lib/supabase";

const demoNames = [
  { name: "Sofia", origin: "Greco", meaning: "Saggezza e intelligenza." },
  { name: "Emma", origin: "Germanico", meaning: "Universale, completa." },
  { name: "Giulia", origin: "Latino", meaning: "Giovane, luminosa." },
  { name: "Alice", origin: "Germanico", meaning: "Di nobile stirpe." },
  { name: "Bianca", origin: "Italiano", meaning: "Candida, splendente." }
];

export default function App() {
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [profileCreated, setProfileCreated] = useState(false);
  const [coupleCode, setCoupleCode] = useState("");

  const [started, setStarted] = useState(false);
  const [index, setIndex] = useState(0);

  const [liked, setLiked] = useState([]);
  const [loved, setLoved] = useState([]);
  const [disliked, setDisliked] = useState([]);

  async function createProfile() {
    if (!name.trim()) {
      setMessage("Inserisci un nome");
      return;
    }

    const newCoupleCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    const { error } = await supabase.from("profiles").insert({
      name: name.trim(),
      couple_code: newCoupleCode
    });

    if (error) {
      console.error("SUPABASE ERROR:", error);
      setMessage("Errore Supabase: " + error.message);
      return;
    }

    setCoupleCode(newCoupleCode);
    setProfileCreated(true);
    setMessage("✅ Profilo creato! Codice coppia: " + newCoupleCode);
  }

  function startDemo() {
    setStarted(true);
    setIndex(0);
  }

  function vote(type) {
    const current = demoNames[index];

    if (type === "yes") {
      setLiked((prev) => [...prev, current.name]);
    }

    if (type === "love") {
      setLoved((prev) => [...prev, current.name]);
      setLiked((prev) => [...prev, current.name]);
    }

    if (type === "no") {
      setDisliked((prev) => [...prev, current.name]);
    }

    if (index < demoNames.length - 1) {
      setIndex(index + 1);
    } else {
      setStarted(false);
      setMessage("✨ Hai finito i nomi demo!");
    }
  }

  const currentName = demoNames[index];

  return (
    <div
      style={{
        padding: 24,
        fontFamily: "Arial, sans-serif",
        maxWidth: 700,
        margin: "0 auto"
      }}
    >
      <h1>Il Nome Perfetto</h1>

      {!profileCreated && (
        <div style={{ marginBottom: 24 }}>
          <input
            placeholder="Il tuo nome"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{
              padding: 10,
              marginRight: 10,
              minWidth: 220
            }}
          />
          <button onClick={createProfile}>Crea profilo</button>
        </div>
      )}

      {message && (
        <p style={{ marginBottom: 20 }}>
          {message}
        </p>
      )}

      {profileCreated && !started && (
        <div style={{ marginTop: 20 }}>
          <p>
            <strong>Codice coppia:</strong> {coupleCode}
          </p>

          <p>
            <strong>Mi piace:</strong> {liked.length} |{" "}
            <strong>Adoro:</strong> {loved.length} |{" "}
            <strong>No:</strong> {disliked.length}
          </p>

          <button onClick={startDemo}>Genera nomi demo</button>
        </div>
      )}

      {profileCreated && started && currentName && (
        <div
          style={{
            marginTop: 30,
            border: "1px solid #ddd",
            borderRadius: 16,
            padding: 24,
            textAlign: "center",
            boxShadow: "0 8px 20px rgba(0,0,0,0.08)"
          }}
        >
          <p style={{ color: "#777", marginBottom: 8 }}>
            {index + 1} / {demoNames.length}
          </p>

          <h2 style={{ fontSize: 36, marginBottom: 10 }}>
            {currentName.name}
          </h2>

          <p>
            <strong>Origine:</strong> {currentName.origin}
          </p>

          <p style={{ marginBottom: 24 }}>
            <strong>Significato:</strong> {currentName.meaning}
          </p>

          <div style={{ display: "flex", justifyContent: "center", gap: 12 }}>
            <button onClick={() => vote("no")}>NO</button>
            <button onClick={() => vote("love")}>ADORO</button>
            <button onClick={() => vote("yes")}>SÌ</button>
          </div>
        </div>
      )}
    </div>
  );
}
