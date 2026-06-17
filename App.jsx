import React, { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";

const STORAGE_KEY = "baby_name_app_profile";

export default function App() {
  const [name, setName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    try {
      const savedProfile = localStorage.getItem(STORAGE_KEY);
      if (savedProfile) {
        const parsedProfile = JSON.parse(savedProfile);
        if (parsedProfile && parsedProfile.id && parsedProfile.name && parsedProfile.couple_code) {
          setProfile(parsedProfile);
          setMessage(
            `Bentornata/o ${parsedProfile.name}! Sei collegata/o alla coppia ${parsedProfile.couple_code}`
          );
        }
      }
    } catch (error) {
      console.error("Errore lettura localStorage:", error);
    } finally {
      setCheckingSession(false);
    }
  }, []);

  function saveProfileLocally(profileData) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profileData));
  }

  function clearSavedProfile() {
    localStorage.removeItem(STORAGE_KEY);
  }

  function generateCoupleCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  async function createNewCouple() {
    if (!name.trim()) {
      setMessage("Inserisci il tuo nome");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const coupleCode = generateCoupleCode();

      const { data, error } = await supabase
        .from("profiles")
        .insert({
          name: name.trim(),
          couple_code: coupleCode,
        })
        .select()
        .single();

      if (error) {
        console.error("SUPABASE ERROR:", error);
        setMessage("Errore Supabase: " + error.message);
        return;
      }

      setProfile(data);
      saveProfileLocally(data);
      setMessage("Profilo creato! Il tuo codice coppia è: " + coupleCode);
      setJoinCode("");
      setName("");
    } catch (err) {
      console.error("UNEXPECTED ERROR:", err);
      setMessage("Errore inatteso: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function joinExistingCouple() {
    if (!name.trim()) {
      setMessage("Inserisci il tuo nome");
      return;
    }

    if (!joinCode.trim()) {
      setMessage("Inserisci un codice coppia");
      return;
    }

    const normalizedCode = joinCode.trim().toUpperCase();

    setLoading(true);
    setMessage("");

    try {
      const { data: existingProfiles, error: checkError } = await supabase
        .from("profiles")
        .select("id, couple_code")
        .eq("couple_code", normalizedCode)
        .limit(1);

      if (checkError) {
        console.error("SUPABASE CHECK ERROR:", checkError);
        setMessage("Errore controllo codice: " + checkError.message);
        return;
      }

      if (!existingProfiles || existingProfiles.length === 0) {
        setMessage("Codice coppia non trovato");
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .insert({
          name: name.trim(),
          couple_code: normalizedCode,
        })
        .select()
        .single();

      if (error) {
        console.error("SUPABASE INSERT ERROR:", error);
        setMessage("Errore Supabase: " + error.message);
        return;
      }

      setProfile(data);
      saveProfileLocally(data);
      setMessage("Profilo collegato correttamente alla coppia " + normalizedCode);
      setName("");
      setJoinCode("");
    } catch (err) {
      console.error("UNEXPECTED ERROR:", err);
      setMessage("Errore inatteso: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  function logoutProfile() {
    clearSavedProfile();
    setProfile(null);
    setName("");
    setJoinCode("");
    setMessage("Profilo scollegato da questo dispositivo");
  }

  if (checkingSession) {
    return (
      <div style={{ padding: 24, fontFamily: "Arial, sans-serif", maxWidth: 560, margin: "0 auto" }}>
        <h1>Il Nome Perfetto</h1>
        <p>Caricamento profilo...</p>
      </div>
    );
  }

  if (profile) {
    return (
      <div style={{ padding: 24, fontFamily: "Arial, sans-serif", maxWidth: 560, margin: "0 auto" }}>
        <h1>Il Nome Perfetto</h1>
        <p>Profilo già attivo su questo dispositivo.</p>

        {message ? <p style={{ marginTop: 20 }}>{message}</p> : null}

        <div
          style={{
            marginTop: 24,
            padding: 16,
            border: "1px solid #ddd",
            borderRadius: 12,
            background: "#fafafa",
          }}
        >
          <h2 style={{ marginTop: 0 }}>Profilo attivo</h2>
          <p><strong>Nome:</strong> {profile.name}</p>
          <p><strong>Codice coppia:</strong> {profile.couple_code}</p>
          <p><strong>ID profilo:</strong> {profile.id}</p>

          <button onClick={logoutProfile} style={{ padding: "10px 14px" }}>
            Esci da questo dispositivo
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, fontFamily: "Arial, sans-serif", maxWidth: 560, margin: "0 auto" }}>
      <h1>Il Nome Perfetto</h1>
      <p>Crea una nuova coppia oppure collegati con un codice esistente.</p>

      <div style={{ marginBottom: 16 }}>
        <input
          type="text"
          placeholder="Il tuo nome"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{ padding: 10, width: "100%", boxSizing: "border-box", marginBottom: 10 }}
        />

        <button
          onClick={createNewCouple}
          disabled={loading}
          style={{ padding: "10px 14px", marginRight: 10 }}
        >
          {loading ? "Attendi..." : "Crea nuova coppia"}
        </button>
      </div>

      <div style={{ borderTop: "1px solid #ddd", paddingTop: 16, marginTop: 16 }}>
        <input
          type="text"
          placeholder="Codice coppia esistente"
          value={joinCode}
          onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
          style={{ padding: 10, width: "100%", boxSizing: "border-box", marginBottom: 10 }}
        />

        <button onClick={joinExistingCouple} disabled={loading} style={{ padding: "10px 14px" }}>
          {loading ? "Attendi..." : "Unisciti alla coppia"}
        </button>
      </div>

      {message ? <p style={{ marginTop: 20 }}>{message}</p> : null}
    </div>
  );
}
