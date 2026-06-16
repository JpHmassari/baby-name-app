import React, { useEffect, useState } from "react";import React, { useEffectnesso ✅");
        }
      } catch (err) {
        console.error("ERRORE GENERALE:", err);
        setStatus("Errore generale: " + err.message);
      }
    }

    testSupabase();
  }, []);

  return (
    <div style={{ padding: 20, fontFamily: "Arial, sans-serif" }}>
      <h1>Il Nome Perfetto — v2</h1>
      <p>{status}</p>
    </div>
  );
}
``
import { supabase } from "./lib/supabase";

export default function App() {
  const [status, setStatus] = useState("Controllo connessione a Supabase...");

  useEffect(() => {
    async function testSupabase() {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .limit(1);

        if (error) {
          console.error("SUPABASE ERROR:", error);
          setStatus("Errore Supabase: " + error.message);
        } else {
          console.log("SUPABASE OK:", data);
