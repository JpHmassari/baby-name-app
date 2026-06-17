import React, { useState } from "react";
import { supabase } from "./lib/supabase";

export default function App() {
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function createProfile() {
    if (!name.trim()) {
      setMessage("Inserisci un nome");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const coupleCode = Math.random()
        .toString(36)
        .substring(2, 8)
        .toUpperCase();

      const { error } = await supabase.from("profiles").insert({
        name: name.trim(),
        couple_code: coupleCode,
      });

      if (error) {
        console.error("SUPABASE ERROR:", error);
        setMessage("Errore Supabase: " + error.message);
      } else {
        setMessage("Profilo creato correttamente! Codice: " + coupleCode);
        setName("");
      }
    } catch (err) {
      console.error("UNEXPECTED ERROR:", err);
      setMessage("Errore inatteso: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: 20, fontFamily: "Arial, sans-serif" }}>
      <h1>Il Nome Perfetto</h1>

      <input
        type="text"
        placeholder="Il tuo nome"
        value={name}
        onChange={(e) => setName(e.target.value)}
        style={{ padding: 10, marginRight: 10 }}
      />

      <button onClick={createProfile} disabled={loading}>
        {loading ? "Creazione..." : "Crea profilo"}
      </button>

      <p>{message}</p>
    </div>
  );
}
