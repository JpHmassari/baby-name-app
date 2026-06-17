import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "./lib/supabase";

const STORAGE_KEY = "baby_name_app_profile";

const BABY_NAMES = [
  "Sofia",
  "Aurora",
  "Ginevra",
  "Vittoria",
  "Beatrice",
  "Emma",
  "Alice",
  "Ludovica",
  "Matilde",
  "Camilla",
  "Bianca",
  "Greta",
  "Mia",
  "Anna",
  "Nina",
  "Gaia",
  "Noemi",
  "Viola",
  "Adele",
  "Iris",
];

export default function App() {
  const [name, setName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);

  const [votes, setVotes] = useState({});
  const [votesLoading, setVotesLoading] = useState(false);
  const [voteSaving, setVoteSaving] = useState(false);

  useEffect(() => {
    try {
      const savedProfile = localStorage.getItem(STORAGE_KEY);
      if (savedProfile) {
        const parsedProfile = JSON.parse(savedProfile);

        if (
          parsedProfile &&
          parsedProfile.id &&
          parsedProfile.name &&
          parsedProfile.couple_code
        ) {
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

  useEffect(() => {
    if (profile?.id) {
      loadVotes(profile.id);
    } else {
      setVotes({});
    }
  }, [profile]);

  async function loadVotes(profileId) {
    setVotesLoading(true);

    try {
      const { data, error } = await supabase
        .from("votes")
        .select("baby_name, vote")
        .eq("profile_id", profileId);

      if (error) {
        console.error("SUPABASE LOAD VOTES ERROR:", error);
        setMessage("Errore caricamento voti: " + error.message);
        return;
      }

      const mappedVotes = {};
      (data || []).forEach((row) => {
        mappedVotes[row.baby_name] = row.vote;
      });

      setVotes(mappedVotes);
    } catch (err) {
      console.error("UNEXPECTED LOAD VOTES ERROR:", err);
      setMessage("Errore inatteso: " + err.message);
    } finally {
      setVotesLoading(false);
    }
  }

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
      setVotes({});
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
      setVotes({});
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

  async function handleVote(voteType) {
    if (!profile?.id) return;
    if (!currentName) return;

    setVoteSaving(true);
    setMessage("");

    try {
      const { error } = await supabase
        .from("votes")
        .upsert(
          {
            profile_id: profile.id,
            baby_name: currentName,
            vote: voteType,
          },
          {
            onConflict: "profile_id,baby_name",
          }
        );

      if (error) {
        console.error("SUPABASE SAVE VOTE ERROR:", error);
        setMessage("Errore salvataggio voto: " + error.message);
        return;
      }

      setVotes((prev) => ({
        ...prev,
        [currentName]: voteType,
      }));
    } catch (err) {
      console.error("UNEXPECTED SAVE VOTE ERROR:", err);
      setMessage("Errore inatteso: " + err.message);
    } finally {
      setVoteSaving(false);
    }
  }

  function logoutProfile() {
    clearSavedProfile();
    setProfile(null);
    setVotes({});
    setName("");
    setJoinCode("");
    setMessage("Profilo scollegato da questo dispositivo");
  }

  const currentIndex = useMemo(() => {
    return BABY_NAMES.findIndex((babyName) => !votes[babyName]);
  }, [votes]);

  const currentName = currentIndex >= 0 ? BABY_NAMES[currentIndex] : null;
  const votedCount = Object.keys(votes).length;
  const totalCount = BABY_NAMES.length;

  const summary = useMemo(() => {
    const values = Object.values(votes);

    return {
      no: values.filter((v) => v === "no").length,
      yes: values.filter((v) => v === "yes").length,
      love: values.filter((v) => v === "love").length,
    };
  }, [votes]);

  if (checkingSession) {
    return (
      <div
        style={{
          padding: 24,
          fontFamily: "Arial, sans-serif",
          maxWidth: 700,
          margin: "0 auto",
        }}
      >
        <h1>Il Nome Perfetto</h1>
        <p>Caricamento profilo...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div
        style={{
          padding: 24,
          fontFamily: "Arial, sans-serif",
          maxWidth: 700,
          margin: "0 auto",
        }}
      >
        <h1>Il Nome Perfetto</h1>
        <p>Crea una nuova coppia oppure collegati con un codice esistente.</p>

        <div
          style={{
            padding: 16,
            border: "1px solid #ddd",
            borderRadius: 12,
            marginBottom: 20,
          }}
        >
          <h2 style={{ marginTop: 0 }}>Crea nuova coppia</h2>

          <input
            type="text"
            placeholder="Il tuo nome"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{
              padding: 10,
              width: "100%",
              boxSizing: "border-box",
              marginBottom: 10,
            }}
          />

          <button
            onClick={createNewCouple}
            disabled={loading}
            style={{ padding: "10px 14px" }}
          >
            {loading ? "Attendi..." : "Crea nuova coppia"}
          </button>
        </div>

        <div
          style={{
            padding: 16,
            border: "1px solid #ddd",
            borderRadius: 12,
          }}
        >
          <h2 style={{ marginTop: 0 }}>Unisciti a una coppia</h2>

          <input
            type="text"
            placeholder="Il tuo nome"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{
              padding: 10,
              width: "100%",
              boxSizing: "border-box",
              marginBottom: 10,
            }}
          />

          <input
            type="text"
            placeholder="Codice coppia esistente"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            style={{
              padding: 10,
              width: "100%",
              boxSizing: "border-box",
              marginBottom: 10,
            }}
          />

          <button
            onClick={joinExistingCouple}
            disabled={loading}
            style={{ padding: "10px 14px" }}
          >
            {loading ? "Attendi..." : "Unisciti alla coppia"}
          </button>
        </div>

        {message ? <p style={{ marginTop: 20 }}>{message}</p> : null}
      </div>
    );
  }

  return (
    <div
      style={{
        padding: 24,
        fontFamily: "Arial, sans-serif",
        maxWidth: 700,
        margin: "0 auto",
      }}
    >
      <h1>Il Nome Perfetto</h1>

      <div
        style={{
          padding: 16,
          border: "1px solid #ddd",
          borderRadius: 12,
          background: "#fafafa",
          marginBottom: 20,
        }}
      >
        <h2 style={{ marginTop: 0 }}>Profilo attivo</h2>
        <p>
          <strong>Nome:</strong> {profile.name}
        </p>
        <p>
          <strong>Codice coppia:</strong> {profile.couple_code}
        </p>
        <p>
          <strong>ID profilo:</strong> {profile.id}
        </p>

        <button onClick={logoutProfile} style={{ padding: "10px 14px" }}>
          Esci da questo dispositivo
        </button>
      </div>

      <div
        style={{
          padding: 16,
          border: "1px solid #ddd",
          borderRadius: 12,
          marginBottom: 20,
        }}
      >
        <h2 style={{ marginTop: 0 }}>Riepilogo voti</h2>
        <p>
          <strong>Completati:</strong> {votedCount} / {totalCount}
        </p>
        <p>
          <strong>No:</strong> {summary.no} | <strong>Sì:</strong> {summary.yes} |{" "}
          <strong>Adoro:</strong> {summary.love}
        </p>
      </div>

      {votesLoading ? (
        <p>Caricamento voti...</p>
      ) : currentName ? (
        <div
          style={{
            padding: 24,
            border: "1px solid #ddd",
            borderRadius: 16,
            textAlign: "center",
            background: "#fff",
          }}
        >
          <p style={{ color: "#666", marginBottom: 8 }}>
            Nome {currentIndex + 1} di {totalCount}
          </p>

          <h2 style={{ fontSize: 36, marginTop: 0 }}>{currentName}</h2>

          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: 12,
              flexWrap: "wrap",
              marginTop: 20,
            }}
          >
            <button
              onClick={() => handleVote("no")}
              disabled={voteSaving}
              style={{
                padding: "12px 18px",
                borderRadius: 10,
                border: "1px solid #d1d5db",
                background: "#fee2e2",
                cursor: "pointer",
              }}
            >
              {voteSaving ? "Salvataggio..." : "No"}
            </button>

            <button
              onClick={() => handleVote("yes")}
              disabled={voteSaving}
              style={{
                padding: "12px 18px",
                borderRadius: 10,
                border: "1px solid #d1d5db",
                background: "#dcfce7",
                cursor: "pointer",
              }}
            >
              {voteSaving ? "Salvataggio..." : "Sì"}
            </button>

            <button
              onClick={() => handleVote("love")}
              disabled={voteSaving}
              style={{
                padding: "12px 18px",
                borderRadius: 10,
                border: "1px solid #d1d5db",
                background: "#ede9fe",
                cursor: "pointer",
              }}
            >
              {voteSaving ? "Salvataggio..." : "Adoro"}
            </button>
          </div>
        </div>
      ) : (
        <div
          style={{
            padding: 24,
            border: "1px solid #ddd",
            borderRadius: 16,
            textAlign: "center",
            background: "#f0fdf4",
          }}
        >
          <h2>Hai completato tutti i voti 🎉</h2>
          <p>Nel prossimo step possiamo mostrarti i match con il partner.</p>
        </div>
      )}

      {message ? <p style={{ marginTop: 20 }}>{message}</p> : null}
    </div>
  );
}
