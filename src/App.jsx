import React, { useState } from "react";
import { supabase } from "./lib/supabase";


const NAMES = [
  "Sofia",
  "Emma",
  "Giulia",
  "Aurora",
  "Alice",
  "Luca",
  "Leonardo",
  "Matteo",
  "Tommaso",
  "Francesco"
];

export default function App() {
  const [name, setName] = useState("");
  const [profile, setProfile] = useState(null);
  const [index, setIndex] = useState(0);
  const [message, setMessage] = useState("");

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
      console.error(error);
      setMessage("Errore Supabase: " + error.message);
    } else {
      setProfile(data);
      setMessage("✅ Profilo creato! Codice: " + coupleCode);
    }
  }

  async function vote(type) {
    const currentName = NAMES[index];

    await supabase.from("votes").insert({
      profile_id: profile.id,
      baby_name: currentName,
      vote_type: type
    });

    if (index + 1 < NAMES.length) {
      setIndex(index + 1);
    } else {
      setMessage("✅ Hai finito i nomi!");
    }
  }

  if (!profile) {
    return (
      <div style={{ padding: 20 }}>
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

  return (
    <div style={{ padding: 20 }}>
      <h1>Scegli il nome</h1>

      <h2>{NAMES[index]}</h2>

      <button onClick={() => vote("yes")} style={{ marginRight: 10 }}>
        ❤️ Mi piace
      </button>

      <button onClick={() => vote("no")}>
        ❌ No
      </button>

      <p>{message}</p>
    </div>
  );
}
