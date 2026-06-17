import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "./lib/supabase";

const STORAGE_KEY = "baby_name_app_profile";
const GENERATED_NAMES_KEY = "baby_name_app_generated_names";

const DEFAULT_BABY_NAMES = [
  "Sofia", "Aurora", "Ginevra", "Vittoria", "Beatrice", "Emma", "Alice", "Ludovica", "Matilde", "Camilla",
  "Bianca", "Greta", "Mia", "Anna", "Nina", "Gaia", "Noemi", "Viola", "Adele", "Iris",
];

const STYLE_POOLS = {
  classici: ["Francesca", "Chiara", "Caterina", "Elisabetta", "Eleonora", "Maria", "Lucia", "Anna", "Marta", "Teresa", "Beatrice", "Alessandra", "Vittoria", "Irene", "Serena", "Silvia", "Valentina", "Giulia", "Paola", "Claudia"],
  moderni: ["Nina", "Mia", "Greta", "Zoe", "Asia", "Adele", "Noemi", "Emma", "Gaia", "Viola", "Chloe", "Nicole", "Ginevra", "Sole", "Nora", "Marta", "Iris", "Elettra", "Luna", "Maya"],
  internazionali: ["Olivia", "Emily", "Sophia", "Amelia", "Isabel", "Charlotte", "Eva", "Mila", "Elena", "Victoria", "Nora", "Julia", "Ariana", "Alice", "Emma", "Sofia", "Lily", "Chloe", "Maya", "Lea"],
  eleganti: ["Ginevra", "Vittoria", "Ludovica", "Beatrice", "Bianca", "Cecilia", "Ottavia", "Arianna", "Diana", "Anita", "Costanza", "Leonora", "Angelica", "Lavinia", "Adelaide", "Matilde", "Camilla", "Viola", "Irene", "Carlotta"],
  corti: ["Mia", "Eva", "Ada", "Iris", "Nina", "Gaia", "Anna", "Noa", "Lia", "Tea", "Mila", "Lea", "Zoe", "Ava", "Luna", "Emma", "Nora", "Asia", "Maya", "Viola"],
};

const COLORS = {
  bg: "#f8f7ff",
  card: "#ffffff",
  text: "#1f2430",
  muted: "#667085",
  border: "#e8e6f2",
  primary: "#7c3aed",
  primarySoft: "#f3e8ff",
  green: "#16a34a",
  greenSoft: "#dcfce7",
  red: "#dc2626",
  redSoft: "#fee2e2",
  amber: "#f59e0b",
  amberSoft: "#fef3c7",
  blueSoft: "#dbeafe",
};

function isPositiveVote(vote) {
  return vote === "yes" || vote === "love";
}

function uniqueArray(items) {
  return Array.from(new Set(items));
}

function generateNamesByStyle(style, count, startsWith, excludes) {
  const pool = STYLE_POOLS[style] || [];
  const cleanedStartsWith = startsWith.trim().toLowerCase();

  let filtered = pool.filter((name) => !excludes.includes(name));

  if (cleanedStartsWith) {
    filtered = filtered.filter((name) => name.toLowerCase().startsWith(cleanedStartsWith));
  }

  const shuffled = [...filtered].sort(() => Math.random() - 0.5);

  if (shuffled.length >= count) {
    return shuffled.slice(0, count);
  }

  const fallbackPool = uniqueArray(Object.values(STYLE_POOLS).flat())
    .filter((name) => !excludes.includes(name))
    .filter((name) => !cleanedStartsWith || name.toLowerCase().startsWith(cleanedStartsWith))
    .sort(() => Math.random() - 0.5);

  return uniqueArray([...shuffled, ...fallbackPool]).slice(0, count);
}

function cardStyle(extra = {}) {
  return {
    background: COLORS.card,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 22,
    padding: 18,
    boxShadow: "0 10px 30px rgba(66, 48, 125, 0.06)",
    ...extra,
  };
}

function buttonStyle(kind = "primary") {
  const map = {
    primary: {
      background: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
      color: "#fff",
      border: "none",
    },
    secondary: {
      background: "#fff",
      color: COLORS.text,
      border: `1px solid ${COLORS.border}`,
    },
    yes: {
      background: COLORS.greenSoft,
      color: COLORS.green,
      border: `1px solid #bbf7d0`,
    },
    no: {
      background: COLORS.redSoft,
      color: COLORS.red,
      border: `1px solid #fecaca`,
    },
    love: {
      background: COLORS.primarySoft,
      color: COLORS.primary,
      border: `1px solid #dfccfb`,
    },
    warning: {
      background: COLORS.amberSoft,
      color: COLORS.amber,
      border: `1px solid #fde68a`,
    },
  };

  return {
    padding: "12px 16px",
    borderRadius: 14,
    fontWeight: 700,
    cursor: "pointer",
    transition: "all 0.2s ease",
    ...map[kind],
  };
}

function badgeStyle(bg, color) {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "6px 10px",
    borderRadius: 999,
    background: bg,
    color,
    fontWeight: 700,
    fontSize: 13,
  };
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

  const [generatedNames, setGeneratedNames] = useState([]);
  const [generatorStyle, setGeneratorStyle] = useState("moderni");
  const [startsWith, setStartsWith] = useState("");
  const [generatorLoading, setGeneratorLoading] = useState(false);
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);
  const [showOnlyMatches, setShowOnlyMatches] = useState(false);

  useEffect(() => {
    try {
      const savedProfile = localStorage.getItem(STORAGE_KEY);
      if (savedProfile) {
        const parsedProfile = JSON.parse(savedProfile);
        if (parsedProfile?.id && parsedProfile?.name && parsedProfile?.couple_code) {
          setProfile(parsedProfile);
          setMessage(`Bentornata/o ${parsedProfile.name}! Sei collegata/o alla coppia ${parsedProfile.couple_code}`);
        }
      }

      const savedGeneratedNames = localStorage.getItem(GENERATED_NAMES_KEY);
      if (savedGeneratedNames) {
        const parsedNames = JSON.parse(savedGeneratedNames);
        if (Array.isArray(parsedNames)) {
          setGeneratedNames(parsedNames);
        }
      }
    } catch (error) {
      console.error("Errore lettura localStorage:", error);
    } finally {
      setCheckingSession(false);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(GENERATED_NAMES_KEY, JSON.stringify(generatedNames));
  }, [generatedNames]);

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

  const namePool = useMemo(() => uniqueArray([...DEFAULT_BABY_NAMES, ...generatedNames]), [generatedNames]);

  const favoriteNames = useMemo(() => {
    return namePool.filter((babyName) => votes[babyName] === "yes" || votes[babyName] === "love");
  }, [votes, namePool]);

  const matchedNames = useMemo(() => {
    return namePool.filter((babyName) => isPositiveVote(votes[babyName]) && isPositiveVote(partnerVotes[babyName]));
  }, [votes, partnerVotes, namePool]);

  const filteredNamePool = useMemo(() => {
    let pool = namePool;
    if (showOnlyFavorites) {
      pool = pool.filter((babyName) => votes[babyName] === "yes" || votes[babyName] === "love");
    } else if (showOnlyMatches) {
      pool = pool.filter((babyName) => isPositiveVote(votes[babyName]) && isPositiveVote(partnerVotes[babyName]));
    }
    return pool;
  }, [namePool, votes, partnerVotes, showOnlyFavorites, showOnlyMatches]);

  const currentIndex = useMemo(() => filteredNamePool.findIndex((babyName) => !votes[babyName]), [votes, filteredNamePool]);
  const currentName = currentIndex >= 0 ? filteredNamePool[currentIndex] : null;
  const votedCount = Object.keys(votes).length;
  const totalCount = namePool.length;
  const progress = totalCount ? Math.round((votedCount / totalCount) * 100) : 0;

  const summary = useMemo(() => {
    const values = Object.values(votes);
    return {
      no: values.filter((v) => v === "no").length,
      yes: values.filter((v) => v === "yes").length,
      love: values.filter((v) => v === "love").length,
    };
  }, [votes]);

  const recentVotes = useMemo(() => {
    return Object.entries(votes)
      .map(([babyName, vote]) => ({ babyName, vote }))
      .reverse()
      .slice(0, 8);
  }, [votes]);

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
      const { data, error } = await supabase.from("votes").select("baby_name, vote").eq("profile_id", profileId);
      if (error) {
        setMessage("Errore caricamento voti: " + error.message);
        return;
      }
      const mappedVotes = {};
      (data || []).forEach((row) => {
        mappedVotes[row.baby_name] = row.vote;
      });
      setVotes(mappedVotes);
    } catch (err) {
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
        setMessage("Errore caricamento voti partner: " + votesError.message);
        return;
      }

      const mappedVotes = {};
      (votesRows || []).forEach((row) => {
        mappedVotes[row.baby_name] = row.vote;
      });
      setPartnerVotes(mappedVotes);
    } catch (err) {
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
        .insert({ name: name.trim(), couple_code: coupleCode })
        .select()
        .single();
      if (error) {
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
        setMessage("Errore controllo codice: " + checkError.message);
        return;
      }

      if (!existingProfiles || existingProfiles.length === 0) {
        setMessage("Codice coppia non trovato");
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .insert({ name: name.trim(), couple_code: normalizedCode })
        .select()
        .single();

      if (error) {
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
          { profile_id: profile.id, baby_name: currentName, vote: voteType },
          { onConflict: "profile_id,baby_name" }
        );

      if (error) {
        setMessage("Errore salvataggio voto: " + error.message);
        return;
      }

      setVotes((prev) => ({ ...prev, [currentName]: voteType }));
    } catch (err) {
      setMessage("Errore inatteso: " + err.message);
    } finally {
      setVoteSaving(false);
    }
  }

  async function refreshMatches() {
    if (!profile) return;
    await loadPartnerAndMatches(profile);
  }

  function handleGenerateNames() {
    setGeneratorLoading(true);
    setMessage("");
    try {
      const newNames = generateNamesByStyle(
        generatorStyle,
        10,
        startsWith,
        uniqueArray([...DEFAULT_BABY_NAMES, ...generatedNames])
      );

      if (newNames.length === 0) {
        setMessage("Nessun nome trovato con questi filtri. Prova a cambiare iniziale o stile.");
        return;
      }

      setGeneratedNames((prev) => uniqueArray([...prev, ...newNames]));
      setMessage(`Generati ${newNames.length} nuovi nomi (${generatorStyle}).`);
    } finally {
      setGeneratorLoading(false);
    }
  }

  function clearGeneratedNames() {
    setGeneratedNames([]);
    localStorage.removeItem(GENERATED_NAMES_KEY);
    setMessage("Nomi generati rimossi dal dispositivo");
  }

  async function resetMyVotes() {
    if (!profile?.id) return;
    const confirmed = window.confirm("Vuoi davvero cancellare tutti i tuoi voti? Questa azione non si può annullare.");
    if (!confirmed) return;

    setMessage("");
    setVoteSaving(true);
    try {
      const { error } = await supabase.from("votes").delete().eq("profile_id", profile.id);
      if (error) {
        setMessage("Errore reset voti: " + error.message);
        return;
      }

      setVotes({});
      setMessage("Tutti i tuoi voti sono stati azzerati");
    } catch (err) {
      setMessage("Errore inatteso: " + err.message);
    } finally {
      setVoteSaving(false);
    }
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

  if (checkingSession) {
    return <div style={{ minHeight: "100vh", background: COLORS.bg, padding: 24, fontFamily: "Inter, Arial, sans-serif" }}><div style={{ maxWidth: 1100, margin: "0 auto" }}><h1 style={{ color: COLORS.text }}>Il Nome Perfetto</h1><p style={{ color: COLORS.muted }}>Caricamento profilo...</p></div></div>;
  }

  if (!profile) {
    return (
      <div style={{ minHeight: "100vh", background: "linear-gradient(180deg, #faf5ff 0%, #f8fafc 100%)", padding: 24, fontFamily: "Inter, Arial, sans-serif", color: COLORS.text }}>
        <div style={{ maxWidth: 760, margin: "0 auto" }}>
          <div style={{ ...cardStyle({ padding: 24, marginBottom: 20, background: "linear-gradient(135deg, #ede9fe 0%, #ffffff 100%)" }) }}>
            <div style={badgeStyle(COLORS.primarySoft, COLORS.primary)}>✨ Baby Name App</div>
            <h1 style={{ fontSize: 36, marginBottom: 10 }}>Il Nome Perfetto</h1>
            <p style={{ color: COLORS.muted, fontSize: 16, lineHeight: 1.5 }}>Crea la tua coppia, vota i nomi, genera nuove idee e scopri i match insieme al partner.</p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 18 }}>
            <div style={cardStyle()}>
              <h2 style={{ marginTop: 0 }}>Crea nuova coppia</h2>
              <input type="text" placeholder="Il tuo nome" value={name} onChange={(e) => setName(e.target.value)} style={{ padding: 14, width: "100%", boxSizing: "border-box", marginBottom: 12, borderRadius: 14, border: `1px solid ${COLORS.border}` }} />
              <button onClick={createNewCouple} disabled={loading} style={buttonStyle("primary")}>{loading ? "Attendi..." : "Crea nuova coppia"}</button>
            </div>

            <div style={cardStyle()}>
              <h2 style={{ marginTop: 0 }}>Unisciti a una coppia</h2>
              <input type="text" placeholder="Il tuo nome" value={name} onChange={(e) => setName(e.target.value)} style={{ padding: 14, width: "100%", boxSizing: "border-box", marginBottom: 12, borderRadius: 14, border: `1px solid ${COLORS.border}` }} />
              <input type="text" placeholder="Codice coppia esistente" value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())} style={{ padding: 14, width: "100%", boxSizing: "border-box", marginBottom: 12, borderRadius: 14, border: `1px solid ${COLORS.border}` }} />
              <button onClick={joinExistingCouple} disabled={loading} style={buttonStyle("secondary")}>{loading ? "Attendi..." : "Unisciti alla coppia"}</button>
            </div>
          </div>

          {message ? <div style={{ ...cardStyle({ marginTop: 20, padding: 14, background: "#fff" }) }}><span style={{ color: COLORS.muted }}>{message}</span></div> : null}
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(180deg, #f8f7ff 0%, #f8fafc 100%)", padding: 20, fontFamily: "Inter, Arial, sans-serif", color: COLORS.text }}>
      <div style={{ maxWidth: 1180, margin: "0 auto" }}>
        <div style={{ ...cardStyle({ padding: 24, marginBottom: 20, background: "linear-gradient(135deg, #ffffff 0%, #f3e8ff 100%)" }) }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
            <div>
              <div style={{ ...badgeStyle(COLORS.primarySoft, COLORS.primary), marginBottom: 12 }}>💜 Profilo attivo</div>
              <h1 style={{ margin: 0, fontSize: 34 }}>Il Nome Perfetto</h1>
              <p style={{ color: COLORS.muted, marginBottom: 0 }}>Ciao <strong>{profile.name}</strong> — codice coppia <strong>{profile.couple_code}</strong></p>
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button onClick={refreshMatches} style={buttonStyle("secondary")}>Aggiorna match</button>
              <button onClick={logoutProfile} style={buttonStyle("secondary")}>Esci</button>
            </div>
          </div>

          <div style={{ marginTop: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, color: COLORS.muted, marginBottom: 8 }}>
              <span>Progresso voti</span>
              <span>{votedCount} / {totalCount} · {progress}%</span>
            </div>
            <div style={{ height: 12, borderRadius: 999, background: "#ede9fe", overflow: "hidden" }}>
              <div style={{ width: `${progress}%`, height: "100%", background: "linear-gradient(90deg, #8b5cf6 0%, #c084fc 100%)" }} />
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14, marginBottom: 20 }}>
          <div style={cardStyle()}><div style={badgeStyle(COLORS.redSoft, COLORS.red)}>👎 No</div><h3 style={{ marginBottom: 0 }}>{summary.no}</h3></div>
          <div style={cardStyle()}><div style={badgeStyle(COLORS.greenSoft, COLORS.green)}>👍 Sì</div><h3 style={{ marginBottom: 0 }}>{summary.yes}</h3></div>
          <div style={cardStyle()}><div style={badgeStyle(COLORS.primarySoft, COLORS.primary)}>💜 Adoro</div><h3 style={{ marginBottom: 0 }}>{summary.love}</h3></div>
          <div style={cardStyle()}><div style={badgeStyle(COLORS.blueSoft, "#1d4ed8")}>🤝 Match</div><h3 style={{ marginBottom: 0 }}>{matchedNames.length}</h3></div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "minmax(320px, 1.3fr) minmax(280px, 1fr)", gap: 20, alignItems: "start" }}>
          <div style={{ display: "grid", gap: 20 }}>
            <div style={cardStyle({ background: "linear-gradient(180deg, #ffffff 0%, #fcfcff 100%)" })}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 14 }}>
                <h2 style={{ margin: 0 }}>Area voto</h2>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button onClick={() => { setShowOnlyFavorites(false); setShowOnlyMatches(false); }} style={buttonStyle(showOnlyFavorites || showOnlyMatches ? "secondary" : "primary")}>Tutti</button>
                  <button onClick={() => { setShowOnlyFavorites(true); setShowOnlyMatches(false); }} style={buttonStyle(showOnlyFavorites ? "primary" : "secondary")}>Solo preferiti</button>
                  <button onClick={() => { setShowOnlyFavorites(false); setShowOnlyMatches(true); }} style={buttonStyle(showOnlyMatches ? "primary" : "secondary")}>Solo match</button>
                </div>
              </div>

              {votesLoading ? (
                <p style={{ color: COLORS.muted }}>Caricamento voti...</p>
              ) : currentName ? (
                <div style={{ textAlign: "center", padding: "8px 0 4px" }}>
                  <div style={badgeStyle(COLORS.primarySoft, COLORS.primary)}>Nome {currentIndex + 1} di {filteredNamePool.length}</div>
                  <h2 style={{ fontSize: 42, marginTop: 18, marginBottom: 12 }}>{currentName}</h2>
                  <p style={{ color: COLORS.muted, marginTop: 0 }}>Scegli il tuo feeling: passa oltre, ti piace o lo ami davvero.</p>
                  <div style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap", marginTop: 10 }}>
                    <button onClick={() => handleVote("no")} disabled={voteSaving} style={buttonStyle("no")}>{voteSaving ? "Salvataggio..." : "👎 No"}</button>
                    <button onClick={() => handleVote("yes")} disabled={voteSaving} style={buttonStyle("yes")}>{voteSaving ? "Salvataggio..." : "👍 Sì"}</button>
                    <button onClick={() => handleVote("love")} disabled={voteSaving} style={buttonStyle("love")}>{voteSaving ? "Salvataggio..." : "💜 Adoro"}</button>
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: "center", padding: "8px 0 4px" }}>
                  <h2 style={{ marginBottom: 8 }}>Hai finito il deck 🎉</h2>
                  <p style={{ color: COLORS.muted }}>Puoi generare nuovi nomi, vedere i tuoi preferiti o controllare i match della coppia.</p>
                </div>
              )}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
              <div style={cardStyle()}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                  <h3 style={{ marginTop: 0, marginBottom: 0 }}>Preferiti</h3>
                  <div style={badgeStyle(COLORS.greenSoft, COLORS.green)}>{favoriteNames.length}</div>
                </div>
                {favoriteNames.length === 0 ? (
                  <p style={{ color: COLORS.muted }}>Ancora nessun preferito. Inizia a votare 👍 o 💜.</p>
                ) : (
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
                    {favoriteNames.map((babyName) => (
                      <span key={babyName} style={badgeStyle(votes[babyName] === "love" ? COLORS.primarySoft : COLORS.greenSoft, votes[babyName] === "love" ? COLORS.primary : COLORS.green)}>{babyName}</span>
                    ))}
                  </div>
                )}
              </div>

              <div style={cardStyle()}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                  <h3 style={{ marginTop: 0, marginBottom: 0 }}>Ultimi voti</h3>
                  <div style={badgeStyle(COLORS.blueSoft, "#1d4ed8")}>{recentVotes.length}</div>
                </div>
                {recentVotes.length === 0 ? (
                  <p style={{ color: COLORS.muted }}>I tuoi ultimi voti appariranno qui.</p>
                ) : (
                  <ul style={{ listStyle: "none", paddingLeft: 0, margin: "12px 0 0 0" }}>
                    {recentVotes.map((item) => (
                      <li key={item.babyName} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${COLORS.border}` }}>
                        <span>{item.babyName}</span>
                        <strong style={{ color: item.vote === "love" ? COLORS.primary : item.vote === "yes" ? COLORS.green : COLORS.red }}>{item.vote}</strong>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gap: 20 }}>
            <div style={cardStyle({ background: matchLoading ? "#fff" : matchedNames.length ? "linear-gradient(180deg, #f0fdf4 0%, #ffffff 100%)" : "#ffffff" })}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                <h2 style={{ margin: 0 }}>Match di coppia</h2>
                {partner ? <div style={badgeStyle(COLORS.primarySoft, COLORS.primary)}>Partner: {partner.name}</div> : null}
              </div>
              {matchLoading ? (
                <p style={{ color: COLORS.muted, marginTop: 12 }}>Caricamento match...</p>
              ) : !partner ? (
                <div style={{ marginTop: 12 }}>
                  <p style={{ marginBottom: 8 }}><strong>Nessun partner collegato ancora.</strong></p>
                  <p style={{ color: COLORS.muted, marginTop: 0 }}>Condividi il tuo codice coppia: <strong>{profile.couple_code}</strong></p>
                </div>
              ) : matchedNames.length === 0 ? (
                <p style={{ color: COLORS.muted, marginTop: 12 }}>Per ora nessun match positivo. Appena il partner vota, clicca “Aggiorna match”.</p>
              ) : (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
                  {matchedNames.map((babyName) => (
                    <span key={babyName} style={badgeStyle(COLORS.greenSoft, COLORS.green)}>🤝 {babyName}</span>
                  ))}
                </div>
              )}
            </div>

            <div style={cardStyle()}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                <h2 style={{ margin: 0 }}>Generatore nomi</h2>
                <div style={badgeStyle(COLORS.primarySoft, COLORS.primary)}>{generatedNames.length} extra</div>
              </div>
              <p style={{ color: COLORS.muted, marginTop: 10 }}>Crea un nuovo blocco di nomi femminili e aggiungilo subito all’esperienza di voto.</p>

              <label style={{ display: "block", fontSize: 14, color: COLORS.muted, marginBottom: 6 }}>Stile</label>
              <select value={generatorStyle} onChange={(e) => setGeneratorStyle(e.target.value)} style={{ padding: 14, width: "100%", boxSizing: "border-box", marginBottom: 12, borderRadius: 14, border: `1px solid ${COLORS.border}` }}>
                <option value="classici">Classici</option>
                <option value="moderni">Moderni</option>
                <option value="internazionali">Internazionali</option>
                <option value="eleganti">Eleganti</option>
                <option value="corti">Corti</option>
              </select>

              <label style={{ display: "block", fontSize: 14, color: COLORS.muted, marginBottom: 6 }}>Iniziale opzionale</label>
              <input type="text" placeholder="Es. A" value={startsWith} onChange={(e) => setStartsWith(e.target.value)} style={{ padding: 14, width: "100%", boxSizing: "border-box", marginBottom: 12, borderRadius: 14, border: `1px solid ${COLORS.border}` }} />

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
                <button onClick={handleGenerateNames} disabled={generatorLoading} style={buttonStyle("primary")}>{generatorLoading ? "Generazione..." : "Genera 10 nomi"}</button>
                <button onClick={clearGeneratedNames} style={buttonStyle("secondary")}>Reset nomi extra</button>
              </div>

              {generatedNames.length === 0 ? (
                <p style={{ color: COLORS.muted, marginBottom: 0 }}>Nessun nome extra generato per ora.</p>
              ) : (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {generatedNames.slice(-18).map((babyName) => (
                    <span key={babyName} style={badgeStyle(COLORS.primarySoft, COLORS.primary)}>{babyName}</span>
                  ))}
                </div>
              )}
            </div>

            <div style={cardStyle()}>
              <h2 style={{ marginTop: 0 }}>Azioni rapide</h2>
              <div style={{ display: "grid", gap: 10 }}>
                <button onClick={resetMyVotes} disabled={voteSaving} style={buttonStyle("warning")}>Azzera i miei voti</button>
                <button onClick={() => { setShowOnlyFavorites(false); setShowOnlyMatches(false); setMessage("Filtro deck resettato"); }} style={buttonStyle("secondary")}>Reset filtri deck</button>
              </div>
              <p style={{ color: COLORS.muted, fontSize: 13, marginTop: 12, marginBottom: 0 }}>“Azzera i miei voti” cancella i tuoi voti dal database, ma non tocca quelli del partner.</p>
            </div>
          </div>
        </div>

        {message ? (
          <div style={{ ...cardStyle({ marginTop: 20, padding: 14, background: "#fff" }) }}>
            <span style={{ color: COLORS.muted }}>{message}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
