import React, { useState } from "react";import React, { useState }")
      .select("*")
      .limit(1);

    if (error) {
      console.error("SUPABASE ERROR:", error);
      setMessage("Errore Supabase: " + error.message);
    } else {
      setMessage("Supabase connesso ✅");
      console.log("Dati ricevuti:", data);
    }
  }

  return (
    <div style={{ padding: 20, fontFamily: "Arial, sans-serif" }}>
      <h1>Test connessione Supabase</h1>
      <button onClick={testSupabase} style={{ padding: 10 }}>
        Testa Supabase
      </button>
      <p style={{ marginTop: 20 }}>{message}</p>
    </div>
  );
}
import { supabase } from "./lib/supabase";

export default function App() {
  const [message, setMessage] = useState("Premi il bottone per testare Supabase");

  async function testSupabase() {
    setMessage("Controllo in corso...");

    const { data, error } = await supabase
