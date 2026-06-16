import React, { useEffect, useState } from "react";import React, { useEffect, uselib/supabase";

export default function App() {
  const [profile, setProfile] = useState(null);
  const [partner, setPartner] = useState(null);
  const [message, setMessage] = useState("Caricamento...");
  const [name, setName] = useState("");

  useEffect(() => {
    setMessage("Inserisci il tuo nome per creare il profilo.");
  }, []);

  async function createProfile() {
    if (!name.trim()) {
      setMessage("Inserisci un nome");
      return;
    }

    const coupleCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    const { data, error } = await supabase
      .from("profiles")
      .insert({
        name: name.trim(),
        couple_code: coupleCode
      })
      .select()
      .single();

    if (error) {
      console.error("SUPABASE ERROR:", error);
      setMessage("Errore Supabase: " + error.message);
      return;
    }

    setProfile(data);
    setMessage("✅ Profilo creato! Codice: " + coupleCode);
  }

  return (
    <div style={{ padding: 20, fontFamily: "Arial, sans-serif" }}>
      <h1>Il Nome Perfetto</h1>

      <input
        placeholder="Il tuo nome"
        value={name}
        onChange={(e) => setName(e.target.value)}
        style={{ padding: 10, marginRight: 10 }}
      />

      <button onClick={createProfile}>Crea profilo</button>

      <p>{message}</p>

      {profile && (
        <div style={{ marginTop: 20 }}>
          <strong>Profilo creato:</strong>
          <div>Nome: {profile.name}</div>
          <div>Codice coppia: {profile.couple_code}</div>
        </div>
      )}
    </div>
  );
}
