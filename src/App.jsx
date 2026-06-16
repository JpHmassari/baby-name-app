import React, { useState } from "react";
import { supabase } from "./lib/supabase";

export default function App() {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [mode, setMode] = useState("create");
  const [message, setMessage] = useState("");

  async function createProfile() {
    if (!name) {
      setMessage("Inserisci un nome");
      return;
    }

    const coupleCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    const { error } = await supabase.from("profiles").insert({
      name: name,
      couple_code: coupleCode
    });

    if (error) {
      console.error(error);
      setMessage("Errore Supabase: " + error.message);
    } else {
      setMessage(`✅ Creato! Codice coppia: ${coupleCode}`);
    }
  }

  async function joinCouple() {
    if (!name || !code) {
      setMessage("Inserisci nome e codice");
      return;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("couple_code", code);

    if (error || data.length === 0) {
      setMessage("Codice non trovato");
      return;
    }

    const { error: insertError } = await supabase.from("profiles").insert({
      name: name,
      couple_code: code
    });

    if (insertError) {
      setMessage("Errore durante il collegamento");
    } else {
      setMessage("✅ Collegato alla coppia!");
    }
  }

  return (
    <div style={{ padding: 20 }}>
      <h1>Il Nome Perfetto</h1>

      <div style={{ marginBottom: 20 }}>
        <button onClick={() => setMode("create")}>Crea profilo</button>
        <button onClick={() => setMode("join")}>Unisciti</button>
      </div>

      <input
        placeholder="Il tuo nome"
        value={name}
        onChange={(e) => setName(e.target.value)}
        style={{ padding: 10, marginRight: 10 }}
      />

      {mode === "join" && (
        <input
          placeholder="Codice coppia"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          style={{ padding: 10, marginRight: 10 }}
        />
      )}

      {mode === "create" ? (
        <button onClick={createProfile}>Crea profilo</button>
      ) : (
        <button onClick={joinCouple}>Unisciti</button>
      )}

      <p>{message}</p>
    </div>
  );
}
