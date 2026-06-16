import React, { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";

export default function App() {
  const [profile, setProfile] = useState(null);
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");

  const [names, setNames] = useState([]);
  const [index, setIndex] = useState(0);

  // ✅ load profile da localStorage
  useEffect(() => {
    const saved = localStorage.getItem("profile");
    if (saved) {
      setProfile(JSON.parse(saved));
    }
  }, []);

  // ✅ salva profile
  function saveProfile(p) {
    localStorage.setItem("profile", JSON.stringify(p));
    setProfile(p);
  }

  // ✅ crea profilo
  async function createProfile() {
    if (!name) return;

    const code = Math.random().toString(36).substring(2, 8).toUpperCase();

    const { data, error } = await supabase
      .from("profiles")
      .insert({ name, couple_code: code })
      .select()
      .single();

    if (error) {
      setMessage(error.message);
    } else {
      saveProfile({
        id: data.id,
        name: data.name,
        coupleCode: data.couple_code,
        liked: [],
        disliked: []
      });
    }
  }

  // ✅ genera nomi (mock per ora)
  function generateNames() {
    setNames([
      "Luca",
      "Matteo",
      "Edoardo",
      "Tommaso",
      "Leonardo",
      "Sofia",
      "Giulia",
      "Emma",
      "Aurora",
      "Alice"
    ]);
    setIndex(0);
  }

  // ✅ salva voto
  async function vote(type) {
    const current = names[index];

    if (!current) return;

    let newProfile = { ...profile };

    if (type === "like") {
      newProfile.liked = [...(profile.liked || []), current];
    }

    if (type === "no") {
      newProfile.disliked = [...(profile.disliked || []), current];
    }

    // ✅ aggiorna DB
    await supabase
      .from("profiles")
      .update({
        liked_names: newProfile.liked,
        disliked_names: newProfile.disliked
      })
      .eq("id", profile.id);

    // ✅ storico voti
    await supabase.from("votes").insert({
      profile_id: profile.id,
      baby_name: current,
      vote_type: type
    });

    saveProfile(newProfile);

    setIndex(index + 1);
  }

  // ✅ collegamento partner (base)
  const [partnerCode, setPartnerCode] = useState("");

  async function connectPartner() {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("couple_code", partnerCode)
      .limit(1);

    if (data.length > 0) {
      alert("✅ Partner trovato: " + data[0].name);
    } else {
      alert("❌ Codice non trovato");
    }
  }

  // ---------------- UI ----------------

  if (!profile) {
    return (
      <div style={{ padding: 20 }}>
        <h1>Il Nome Perfetto</h1>

        <input
          placeholder="Il tuo nome"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <button onClick={createProfile}>Crea profilo</button>

        <p>{message}</p>
      </div>
    );
  }

  return (
    <div style={{ padding: 20 }}>
      <h2>Ciao {profile.name}</h2>
      <p>Codice coppia: {profile.coupleCode}</p>

      {/* partner */}
      <div style={{ marginTop: 20 }}>
        <input
          placeholder="Codice partner"
          value={partnerCode}
          onChange={(e) => setPartnerCode(e.target.value)}
        />
        <button onClick={connectPartner}>Collega partner</button>
      </div>

      {/* genera nomi */}
      <div style={{ marginTop: 20 }}>
        <button onClick={generateNames}>Genera nomi</button>
      </div>

      {/* swipe */}
      {names.length > 0 && index < names.length && (
        <div style={{ marginTop: 20 }}>
          <h1>{names[index]}</h1>

          <button onClick={() => vote("no")}>NO</button>
          <button onClick={() => vote("like")}>SI</button>

          <p>
            {index + 1} / {names.length}
          </p>
        </div>
      )}

      {index >= names.length && <p>Fine lista ✅</p>}
    </div>
  );
}
