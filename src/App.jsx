import React, { useState } from "react";
import { supabase } from "./lib/supabase";

export default function App() {
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [debug, setDebug] = useState("");

  async function createProfile() {
    setMessage("");
    setDebug("");

    if (!name.trim()) {
      setMessage("Inserisci un nome");
      return;
    }

    const coupleCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    try {
      const { data, error } = await supabase
        .from("profiles")
        .insert({
          name: name.trim(),
          couple_code: coupleCode
        })
        .select();

      if (error) {
        console.error("SUPABASE ERROR:", error);
        setMessage("Errore Supabase");
        setDebug(error.message || JSON.stringify(error));
        return;
      }

      setMessage("✅ Profilo creato! Codice: " + coupleCode);
      setDebug("Insert ok");
      console.log("Insert success:", data);
    } catch (err) {
      console.error("CATCH ERROR:", err);
      setMessage("Errore tecnico");
      setDebug(err.message || String(err));
    }
  }

  return (
    <div style={{ padding: 20, fontFamily: "Arial, sans-serif" }}>
      <h1>Il Nome Perfetto</h1>

      <div style={{ marginBottom: 12 }}>
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

        <button
          onClick={createProfile}
          style={{
            padding: "10px 14px",
            cursor: "pointer"
          }}
        >
          Crea profilo
        </button>
      </div>

      {message && (
