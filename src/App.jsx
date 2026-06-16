import React, { useState } from "react";
import { supabase } from "./lib/supabase";

export default function App() {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");

  async function createProfile() {
    const coupleCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    const { error } = await supabase.from("profiles").insert({
      name: name,
      couple_code: coupleCode
    });

    if (error) {
      setMessage("Errore: " + error.message);
    } else {
      setMessage("✅ Profilo creato! Codice: " + coupleCode);
    }
  }

  async function joinCouple() {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("couple_code", code)
      .limit(1);

    if (error || !data.length) {
      setMessage("❌ Codice non trovato");
      return;
    }

    const { error: insertError } = await supabase.from("profiles").insert({
      name: name,
      couple_code: code,
      partner_name: data[0].name
    });

    if (insertError) {
      setMessage("Errore: " + insertError.message);
    } else {
      setMessage("✅ Collegato a " + data[0].name);
    }
  }

  return (
    <div style={{ padding: 20 }}>
      <h1>Il Nome Perfetto</h1>

      <h3>👤 Crea profilo</h3>
      <input
        placeholder="Il tuo nome"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <br /><br />
      <button onClick={createProfile}>Crea profilo</button>

      <hr />

      <h3>🔗 Collegati al partner</h3>
      <input
        placeholder="Codice coppia"
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
      />
      <br /><br />
      <button onClick={joinCouple}>Unisciti</button>

      <p>{message}</p>
    </div>
  );
}
