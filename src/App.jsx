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

function isPositiveVote(vote) {
  return vote === "yes" || vote === "love";
}

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

  const [partner, setPartner] = useState(null);
  const [partnerVotes, setPartnerVotes] = useState({});
  const [matchLoading, setMatchLoading] = useState(false);

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
      loadPartnerAndMatches(profile);
    } else {
      setVotes({});
      setPartner(null);
      setPartnerVotes({});
    }
  }, [profile]);

  function saveProfileLocally(profileData) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profileData));
  }

  function clearSavedProfile() {
    localStorage.removeItem(STORAGE_KEY);
  }

  function generateCoupleCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }

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

  async function loadPartnerAndMatches(currentProfile) {
    if (!currentProfile?.id || !currentProfile?.couple_code) return;

    setMatchLoading(true);

    try {
      const { data: partnerRows, error: partnerError } = await supabase
        .from("profiles")
        .select("id, name, couple_code")
        .eq("couple_code", currentProfile.couple_code)
        .neq("id", currentProfile.id)
        .order("created_at", { ascending: true })
        .limit(1);

      if (partnerError) {
        console.error("SUPABASE LOAD PARTNER ERROR:", partnerError);
        setMessage("Errore caricamento partner: " + partnerError.message);
        return;
      }

      const foundPartner = partnerRows && partnerRows.length > 0 ? partnerRows[0] : null;
      setPartner(foundPartner);

      if (!foundPartner) {
        setPartnerVotes({});
        return;
      }

      const { data: votesRows, error: votesError } = await supabase
        .from("votes")
        .select("baby_name, vote")
        .eq("profile_id", foundPartner.id);

      if (votesError) {
        console.error("SUPABASE LOAD PARTNER VOTES ERROR:", votesError);
        setMessage("Errore caricamento voti partner: " + votesError.message);
        return;
      }

      const mappedVotes = {};
      (votesRows || []).forEach((row) => {
        mappedVotes[row.baby_name] = row.vote;
      });

      setPartnerVotes(mappedVotes);
    } catch (err) {
      console.error("UNEXPECTED LOAD PARTNER ERROR:", err);
      setMessage("Errore inatteso: " + err.message);
    } finally {
      setMatchLoading(false);
    }
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
      setPartner(null);
      setPartnerVotes({});
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
      setPartner(null);
      setPartnerVotes({});
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
    if (!profile?.id || !currentName) return;

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

  async function refreshMatches() {
    if (!profile) return;
    await loadPartnerAndMatches(profile);
  }

  function logoutProfile() {
    clearSavedProfile();
    setProfile(null);
    setVotes({});
    setPartner(null);
    setPartnerVotes({});
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

  const matches = useMemo(() => {
    return BABY_NAMES.filter((babyName) => {
      return isPositiveVote(votes[babyName]) && isPositiveVote(partnerVotes[babyName]);
    });
  }, [votes, partnerVotes]);

  if (checkingSession) {
    return (
      <div style={{ padding: 24, fontFamily: "Arial, sans-serif", maxWidth: 760, margin: "0 auto" }}>
        <h1>Il Nome Perfetto</h1>
        <p>Caricamento profilo...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div style={{ padding: 24, fontFamily: "Arial, sans-serif", maxWidth: 760, margin: "0 auto" }}>
        <h1>Il Nome Perfetto</h1>
        <p>Crea una nuova coppia oppure collegati con un codice esistente.</p>

        <div style={{ padding: 16, border: "1px solid #ddd", borderRadius: 12, marginBottom: 20 }}>
          <h2 style={{ marginTop: 0 }}>Crea nuova coppia</h2>
          <input
            type="text"
            placeholder="Il tuo nome"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ padding: 10, width: "100%", boxSizing: "border-box", marginBottom: 10 }}
          />

          <button onClick={createNewCouple} disabled={loading} style={{ padding: "10px 14px" }}>
            {loading ? "Attendi..." : "Crea nuova coppia"}
          </button>
        </div>

        <div style={{ padding: 16, border: "1px solid #ddd", borderRadius: 12 }}>
          <h2 style={{ marginTop: 0 }}>Unisciti a una coppia</h2>
          <input
            type="text"
            placeholder="Il tuo nome"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ padding: 10, width: "100%", boxSizing: "border-box", marginBottom: 10 }}
          />
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

  return (
    <div style={{ padding: 24, fontFamily: "Arial, sans-serif", maxWidth: 760, margin: "0 auto" }}>
      <h1>Il Nome Perfetto</h1>

      <div style={{ padding: 16, border: "1px solid #ddd", borderRadius: 12, background: "#fafafa", marginBottom: 20 }}>
        <h2 style={{ marginTop: 0 }}>Profilo attivo</h2>
        <p><strong>Nome:</strong> {profile.name}</p>
        <p><strong>Codice coppia:</strong> {profile.couple_code}</p>
        <p><strong>ID profilo:</strong> {profile.id}</p>
        <button onClick={logoutProfile} style={{ padding: "10px 14px" }}>
          Esci da questo dispositivo
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 20, alignItems: "start" }}>
        <div>
          <div style={{ padding: 16, border: "1px solid #ddd", borderRadius: 12, marginBottom: 20 }}>
            <h2 style={{ marginTop: 0 }}>Riepilogo voti</h2>
            <p><strong>Completati:</strong> {votedCount} / {totalCount}</p>
            <p>
              <strong>No:</strong> {summary.no} | <strong>Sì:</strong> {summary.yes} | <strong>Adoro:</strong> {summary.love}
            </p>
          </div>

          {votesLoading ? (
            <p>Caricamento voti...</p>
          ) : currentName ? (
            <div style={{ padding: 24, border: "1px solid #ddd", borderRadius: 16, textAlign: "center", background: "#fff" }}>
              <p style={{ color: "#666", marginBottom: 8 }}>Nome {currentIndex + 1} di {totalCount}</p>
              <h2 style={{ fontSize: 36, marginTop: 0 }}>{currentName}</h2>

              <div style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap", marginTop: 20 }}>
                <button
                  onClick={() => handleVote("no")}
                  disabled={voteSaving}
                  style={{ padding: "12px 18px", borderRadius: 10, border: "1px solid #d1d5db", background: "#fee2e2", cursor: "pointer" }}
                >
                  {voteSaving ? "Salvataggio..." : "No"}
                </button>

                <button
                  onClick={() => handleVote("yes")}
                  disabled={voteSaving}
                  style={{ padding: "12px 18px", borderRadius: 10, border: "1px solid #d1d5db", background: "#dcfce7", cursor: "pointer" }}
                >
                  {voteSaving ? "Salvataggio..." : "Sì"}
                </button>

                <button
                  onClick={() => handleVote("love")}
                  disabled={voteSaving}
                  style={{ padding: "12px 18px", borderRadius: 10, border: "1px solid #d1d5db", background: "#ede9fe", cursor: "pointer" }}
                >
                  {voteSaving ? "Salvataggio..." : "Adoro"}
                </button>
              </div>
            </div>
          ) : (
            <div style={{ padding: 24, border: "1px solid #ddd", borderRadius: 16, textAlign: "center", background: "#f0fdf4" }}>
              <h2>Hai completato tutti i voti 🎉</h2>
              <p>Adesso puoi controllare i match con il partner.</p>
            </div>
          )}
        </div>

        <div>
          <div style={{ padding: 16, border: "1px solid #ddd", borderRadius: 12, marginBottom: 20, background: "#fafafa" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
              <h2 style={{ marginTop: 0, marginBottom: 0 }}>Match coppia</h2>
              <button onClick={refreshMatches} style={{ padding: "8px 12px" }}>
                Aggiorna match
              </button>
            </div>

            {matchLoading ? (
              <p style={{ marginTop: 16 }}>Caricamento match...</p>
            ) : !partner ? (
              <div style={{ marginTop: 16 }}>
                <p><strong>Nessun partner collegato ancora.</strong></p>
                <p>Condividi il tuo codice coppia: <strong>{profile.couple_code}</strong></p>
              </div>
            ) : (
              <div style={{ marginTop: 16 }}>
                <p><strong>Partner collegato:</strong> {partner.name}</p>
                <p><strong>Voti partner caricati:</strong> {Object.keys(partnerVotes).length}</p>
                <p><strong>Match trovati:</strong> {matches.length}</p>
              </div>
            )}
          </div>

          <div style={{ padding: 16, border: "1px solid #ddd", borderRadius: 12, background: matches.length ? "#f0fdf4" : "#fff" }}>
            <h3 style={{ marginTop: 0 }}>Nomi in match</h3>

            {!partner ? (
              <p>Appena il partner si collega e vota, qui vedrai i match automatici.</p>
            ) : matches.length === 0 ? (
              <p>Nessun match positivo per ora.</p>
            ) : (
              <ul style={{ paddingLeft: 20, marginBottom: 0 }}>
                {matches.map((babyName) => (
                  <li key={babyName} style={{ marginBottom: 8 }}>
                    <strong>{babyName}</strong>
                    <div style={{ fontSize: 14, color: "#555" }}>
                      Tu: {votes[babyName]} | Partner: {partnerVotes[babyName]}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {message ? <p style={{ marginTop: 20 }}>{message}</p> : null}
    </div>
  );
}
