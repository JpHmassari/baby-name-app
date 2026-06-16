import React, { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";

const LOCAL_PROFILE_KEY = "baby_names_profile_id";

export default function App() {
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [profile, setProfile] = useState(null);
  const [partner, setPartner] = useState(null);
  const [joinCode, setJoinCode] = useState("");

  useEffect(() => {
    loadSavedProfile();
  }, []);

  async function loadSavedProfile() {
    const savedId = localStorage.getItem(LOCAL_PROFILE_KEY);
    if (!savedId) return;

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", savedId)
      .single();

    if (!error && data) {
      setProfile(data);
      loadPartner(data);
    }
  }

  async function loadPartner(currentProfile) {
    if (!currentProfile?.couple_code) return;

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("couple_code", currentProfile.couple_code)
      .neq("id", currentProfile.id);

    if (!error && data && data.length > 0) {
      setPartner(data[0]);
    }
  }

  async function createProfile() {
    if (!name) {
      setMessage("Inserisci un nome");
      return;
    }

    const coupleCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    const { data, error } = await supabase
      .from("profiles")
      .insert({
        name: name,
        couple_code: coupleCode
      })
      .select()
      .single();

    if (error) {
      console.error("SUPABASE ERROR:", error);
      setMessage("Errore Supabase: " + error.message);
    } else {
      localStorage.setItem(LOCAL_PROFILE_KEY, data.id);
      setProfile(data);
      setMessage("✅ Profilo creato correttamente!");
    }
  }

  async function joinCouple() {
    if (!name || !joinCode) {
      setMessage("Inserisci nome e codice coppia");
      return;
    }

    const cleanCode = joinCode.toUpperCase();

    const { data: existingProfiles, error: findError } = await supabase
      .from("profiles")
      .select("*")
      .eq("couple_code", cleanCode);

    if (findError || !existingProfiles || existingProfiles.length === 0) {
      setMessage("Codice coppia non trovato");
      return;
    }

    const firstProfile = existingProfiles[0];

    const { data, error } = await supabase
      .from("profiles")
      .insert({
        name: name,
        couple_code: cleanCode,
        partner_name: firstProfile.name
      })
      .select()
      .single();

    if (error) {
      console.error("SUPABASE ERROR:", error);
      setMessage("Errore Supabase: " + error.message);
    } else {
      localStorage.setItem(LOCAL_PROFILE_KEY, data.id);
      setProfile(data);
      setPartner(firstProfile);
      setMessage("✅ Coppia collegata!");
    }
  }

  async function resetApp() {
    localStorage.removeItem(LOCAL_PROFILE_KEY);
    setProfile(null);
    setPartner(null);
    setName("");
    setJoinCode("");
    setMessage("");
  }

  if (profile) {
    return (
      <div style={{ padding: 20, fontFamily: "Arial, sans-serif" }}>
        <h1>Il Nome Perfetto</h1>

        <p><strong>Profilo:</strong> {profile.name}</p>
        <p><strong>Codice coppia:</strong> {profile.couple_code}</p>

        {partner ? (
          <p><strong>Partner collegato:</strong> {partner.name}</p>
        ) : (
          <p>Nessun partner collegato ancora</p>
        )}

        <p style={{ color: "green" }}>{message}</p>

        <button onClick={resetApp}>Reset profilo locale</button>
      </div>
    );
  }

  return (
    <div style={{ padding: 20, fontFamily: "Arial, sans-serif" }}>
      <h1>Il Nome Perfetto</h1>

      <div style={{ marginBottom: 30 }}>
        <h3>Crea un nuovo profilo</h3>
        <input
          placeholder="Il tuo nome"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{ padding: 10, marginRight: 10 }}
        />
        <button onClick={createProfile}>Crea profilo</button>
      </div>

      <div style={{ marginBottom: 30 }}>
        <h3>Oppure collegati a una coppia esistente</h3>
        <input
          placeholder="Il tuo nome"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{ padding: 10, marginRight: 10 }}
        />
        <input
          placeholder="Codice coppia"
          value={joinCode}
          onChange={(e) => setJoinCode(e.target.value)}
          style={{ padding: 10, marginRight: 10 }}
        />
        <button onClick={joinCouple}>Collega coppia</button>
      </div>

      <p>{message}</p>
    </div>
  );
}
