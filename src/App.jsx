import React, { useEffect, useState } from "react";import React, { useEffect, useState [profile, setProfile] = useState(null);
  const [partner, setPartner] = useState(null);
  const [message, setMessage] = useState("Caricamento...");

  useEffect(() => {
    loadSavedProfile();
  }, []);

  async function loadSavedProfile() {
    const savedId = localStorage.getItem(LOCAL_PROFILE_KEY);

    if (!savedId) {
      setMessage("Nessun profilo salvato. Crea un profilo o collegati a un codice coppia.");
      return;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", savedId)
      .single();

    if (error || !data) {
      setMessage("Non ho trovato un profilo salvato.");
      return;
    }

    setProfile(data);
    setMessage("Profilo caricato correttamente.");

    const partnerData = await getPartner(data.couple_code, data.id);
    if (partnerData) {
      setPartner(partnerData);
    }
  }

  async function getPartner(coupleCode, myId) {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("couple_code", coupleCode)
      .neq("id", myId)
      .limit(1);

    if (error || !data || data.length === 0) {
      return null;
    }

    return data[0];
  }

  function generateCoupleCode() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  }

  async function createProfile() {
    if (!name.trim()) {
      setMessage("Inserisci il tuo nome.");
      return;
    }

    const coupleCode = generateCoupleCode();

    const { data, error } = await supabase
      .from("profiles")
      .insert({
        name: name.trim(),
        couple_code: coupleCode,
        partner_name: null
      })
      .select()
      .single();

    if (error) {
      console.error("SUPABASE ERROR:", error);
      setMessage("Errore Supabase: " + error.message);
      return;
    }

    localStorage.setItem(LOCAL_PROFILE_KEY, data.id);
    setProfile(data);
    setPartner(null);
    setMessage("✅ Profilo creato correttamente!");
  }

  async function joinCouple() {
    if (!name.trim()) {
      setMessage("Inserisci il tuo nome.");
      return;
    }

    if (!coupleCodeInput.trim()) {
      setMessage("Inserisci un codice coppia.");
      return;
    }

    const code = coupleCodeInput.trim().toUpperCase();

    const { data: existingProfiles, error: lookupError } = await supabase
      .from("profiles")
      .select("*")
      .eq("couple_code", code)
      .limit(1);

    if (lookupError || !existingProfiles || existingProfiles.length === 0) {
      setMessage("Codice coppia non trovato.");
      return;
    }

    const partnerProfile = existingProfiles[0];

    const { data, error } = await supabase
      .from("profiles")
      .insert({
        name: name.trim(),
        couple_code: code,
        partner_name: partnerProfile.name
      })
      .select()
      .single();

    if (error) {
      console.error("SUPABASE ERROR:", error);
      setMessage("Errore Supabase: " + error.message);
      return;
    }

    // aggiorno anche il primo profilo con il nome del partner
    await supabase
      .from("profiles")
      .update({ partner_name: name.trim() })
      .eq("id", partnerProfile.id);

    localStorage.setItem(LOCAL_PROFILE_KEY, data.id);

    setProfile(data);
    setPartner(partnerProfile);
    setMessage("✅ Coppia collegata correttamente!");
  }

  function resetLocalProfile() {
    localStorage.removeItem(LOCAL_PROFILE_KEY);
    setProfile(null);
    setPartner(null);
    setName("");
    setCoupleCodeInput("");
    setMessage("Profilo locale rimosso. Puoi ricominciare.");
  }

  if (!profile) {
    return (
      <div style={{ padding: 24, fontFamily: "Arial, sans-serif", maxWidth: 700 }}>
        <h1>Il Nome Perfetto</h1>
        <p style={{ color: "#555" }}>{message}</p>

        <div style={{ marginBottom: 20 }}>
          <input
            placeholder="Il tuo nome"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ padding: 10, marginRight: 10, width: 220 }}
          />
          <button onClick={createProfile}>Crea profilo</button>
        </div>

        <hr style={{ margin: "24px 0" }} />

        <h3>Hai già un codice coppia?</h3>

        <div>
          <input
            placeholder="Il tuo nome"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ padding: 10, marginRight: 10, width: 220 }}
          />
        </div>

        <div style={{ marginTop: 10 }}>
          <input
            placeholder="Codice coppia"
            value={coupleCodeInput}
            onChange={(e) => setCoupleCodeInput(e.target.value.toUpperCase())}
            style={{ padding: 10, marginRight: 10, width: 220, textTransform: "uppercase" }}
          />
          <button onClick={joinCouple}>Collega partner</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, fontFamily: "Arial, sans-serif", maxWidth: 800 }}>
      <h1>Il Nome Perfetto</h1>
      <p style={{ color: "#555" }}>{message}</p>

      <div
        style={{
          border: "1px solid #ddd",
          borderRadius: 12,
          padding: 16,
          marginTop: 16,
          background: "#fafafa"
        }}
      >
        <h2 style={{ marginTop: 0 }}>Il tuo profilo</h2>
        <p><strong>Nome:</strong> {profile.name}</p>
        <p><strong>Codice coppia:</strong> {profile.couple_code}</p>
        <p><strong>Partner:</strong> {profile.partner_name || "non ancora collegato"}</p>

        <button
          onClick={() => navigator.clipboard.writeText(profile.couple_code)}
          style={{ marginRight: 10 }}
        >
          Copia codice coppia
        </button>

        <button onClick={resetLocalProfile}>Reset profilo locale</button>
      </div>

      <div
        style={{
          border: "1px solid #ddd",
          borderRadius: 12,
          padding: 16,
          marginTop: 16,
          background: "#f5f7ff"
        }}
      >
        <h2 style={{ marginTop: 0 }}>Partner collegato</h2>

        {partner ? (
          <>
            <p><strong>Nome partner:</strong> {partner.name}</p>
            <p><strong>Codice coppia:</strong> {partner.couple_code}</p>
          </>
        ) : (
          <p>Nessun partner trovato con questo codice.</p>
        )}
      </div>

      <div
        style={{
          border: "1px dashed #bbb",
          borderRadius: 12,
          padding: 16,
          marginTop: 16
        }}
      >
        <h3 style={{ marginTop: 0 }}>Prossimo step</h3>
        <p>
          Nel prossimo step aggiungiamo:
        </p>
        <ul>
          <li>nomi di test</li>
          <li>bottoni sì / no / adoro</li>
          <li>salvataggio delle preferenze</li>
        </ul>
      </div>
    </div>
  );
}
import { supabase } from "./lib/supabase";

const LOCAL_PROFILE_KEY = "baby_names_profile_id";

export default function App() {
  const [name, setName] = useState("");
  const [coupleCodeInput, setCoupleCodeInput] = useState("");
