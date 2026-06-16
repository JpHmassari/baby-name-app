import React, { useState } from "react";import React, { useState } from "react <div style={{ padding: 20, fontFamily: "Arial, sans-serif" }}>
      <h1>Il Nome Perfetto</h1>

      <input
        placeholder="Il tuo nome"
        value={name}
        onChange={(e) => setName(e.target.value)}
        style={{ padding: 10, marginRight: 10 }}
      />

      <button onClick={createProfile}>Crea profilo</button>

      <p>{message}</p>
    </div>
  );
}
``
import { supabase } from "./lib/supabase";

export default function App() {
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");

  async function createProfile() {
    if (!name.trim()) {
      setMessage("Inserisci un nome");
      return;
    }

    const coupleCode = Math.random().toString(36).substring(2, 8).toUpperCase();

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
  }

  return (
