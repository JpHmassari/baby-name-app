import React, { useState } from "react";
import { supabase } from "./lib/supabase";

export default function App() {
  const [name, setName] = useState("");
  const [joinName, setJoinName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [message, setMessage] = useState("");
  const [mode, setMode] = useState("create");

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
      console.error("SUPABASE ERROR:", error);
      setMessage("Errore Supabase: " + error.message);
    } else {
      setMessage("✅ Profilo creato! Il tuo codice coppia è: " + coupleCode);
    }
  }

  async function joinProfile() {
    if (!joinName || !joinCode) {
      setMessage("Inserisci nome e codice coppia");
      return;
    }

    const cleanCode = joinCode.toUpperCase();

    const { data: existing, error: findError } = await supabase
      .from("profiles")
      .select("*")
      .eq("couple_code", cleanCode)
      .limit(1);

    if (findError) {
      console.error(findError);
      setMessage("Errore Supabase: " + findError.message);
      return;
    }

    if (!existing || existing.length === 0) {
      setMessage("Codice coppia non trovato");
      return;
    }

    const partner = existing[0];

    const { error: insertError } = await supabase.from("profiles").insert({
      name: joinName,
      couple_code: cleanCode,
      partner_name: partner.name
    });

    if (insertError) {
      console.error(insertError);
      setMessage("Errore Supabase: " + insertError.message);
      return;
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ partner_name: joinName })
      .eq("id", partner.id);

    if (updateError) {
      console.error(updateError);
      setMessage("Profilo creato, ma non sono riuscito ad aggiornare il partner");
      return;
    }

    setMessage("✅ Collegamento completato! Ora siete una coppia nell'app.");
  }

  return (
    <div style={{ padding: 20, fontFamily: "Arial, sans-serif", maxWidth: 700 }}>
      <h1>Il Nome Perfetto</h1>

      <div style={{ marginBottom: 20 }}>
        <button onClick={() => setMode("create")} style={{ marginRight: 10 }}>
          Crea profilo
        </button>
        <button onClick={() => setMode("join")}>
          Unisciti con codice
        </button>
      </div>

      {mode === "create" && (
        <div>
          <h2>Crea il tuo profilo</h2>
          <input
            placeholder="Il tuo nome"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ padding: 10, marginRight: 10 }}
          />
          <button onClick={createProfile}>Crea profilo</button>
        </div>
      )}

      {mode === "join" && (
        <div>
          <h2>Collegati al partner</h2>
          <input
            placeholder="Il tuo nome"
            value={joinName}
            onChange={(e) => setJoinName(e.target.value)}
            style={{ padding: 10, marginRight: 10, marginBottom: 10 }}
          />
          <br />
          <input
            placeholder="Codice coppia"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
            style={{ padding: 10, marginRight: 10 }}
          />
          <button onClick={joinProfile}>Unisciti</button>
        </div>
      )}

      <p style={{ marginTop: 20 }}>{message}</p>
    </div>
  );
}
