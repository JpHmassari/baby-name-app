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
  bgTop: "#f5f3ff",
  bgBottom: "#f8fafc",
  card: "#ffffff",
  text: "#1f2330",
  muted: "#667085",
  border: "#ebe7f5",
  primary: "#7c3aed",
  primary2: "#a855f7",
  primarySoft: "#f3e8ff",
  green: "#15803d",
  greenSoft: "#dcfce7",
  red: "#dc2626",
  redSoft: "#fee2e2",
  blue: "#2563eb",
  blueSoft: "#dbeafe",
  amber: "#d97706",
  amberSoft: "#fef3c7",
  slateSoft: "#f8fafc",
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
    borderRadius: 24,
    padding: 18,
    boxShadow: "0 10px 30px rgba(71, 56, 135, 0.06)",
    ...extra,
  };
}

function inputStyle() {
  return {
    padding: 14,
    width: "100%",
    boxSizing: "border-box",
    borderRadius: 14,
    border: `1px solid ${COLORS.border}`,
    background: "#fff",
    color: COLORS.text,
    outline: "none",
  };
}

function buttonStyle(kind = "primary") {
  const styles = {
    primary: {
      background: `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.primary2} 100%)`,
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
      border: "1px solid #bbf7d0",
    },
    no: {
      background: COLORS.redSoft,
      color: COLORS.red,
      border: "1px solid #fecaca",
    },
    love: {
      background: COLORS.primarySoft,
      color: COLORS.primary,
      border: "1px solid #e9d5ff",
    },
    warning: {
      background: COLORS.amberSoft,
      color: COLORS.amber,
      border: "1px solid #fde68a",
    },
    activePill: {
      background: COLORS.primarySoft,
      color: COLORS.primary,
      border: "1px solid #ddd6fe",
    },
  };

  return {
    padding: "12px 16px",
    borderRadius: 14,
    fontWeight: 700,
    cursor: "pointer",
    transition: "all 0.2s ease",
    ...styles[kind],
  };
}

function badgeStyle(bg, color) {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "7px 11px",
    borderRadius: 999,
    background: bg,
    color,
    fontWeight: 700,
    fontSize: 13,
    whiteSpace: "nowrap",
  };
}

function statBoxStyle(bg, border) {
  return {
    ...cardStyle(),
    background: bg,
    border: `1px solid ${border}`,
    padding: 16,
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

  const [deckFilter, setDeckFilter] = useState("all");

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

  const shortlist = useMemo(() => {
    const loved = [];
    const liked = [];

    namePool.forEach((babyName) => {
      if (votes[babyName] === "love") loved.push(babyName);
      else if (votes[babyName] === "yes") liked.push(babyName);
    });

    return [...loved, ...liked].slice(0, 5);
  }, [votes, namePool]);

  const filteredNamePool = useMemo(() => {
    if (deckFilter === "favorites") return favoriteNames;
    if (deckFilter === "matches") return matchedNames;
    return namePool;
  }, [deckFilter, favoriteNames, matchedNames, namePool]);

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
      const { data, error } = await supabase
        .from("votes")
        .select("baby_name, vote")
        .eq("profile_id", profileId);

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
      const { error } = await supabase
        .from("votes")
        .delete()
        .eq("profile_id", profile.id);

      if (error) {
        setMessage("Errore reset voti: " + error.message);
        return;
      }

      setVotes({});
      setDeckFilter("all");
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
    return (
      <div style={{ minHeight: "100vh", background: `linear-gradient(180deg, ${COLORS.bgTop} 0%, ${COLORS.bgBottom} 100%)`, padding: 24, fontFamily: "Inter, Arial, sans-serif" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto" }}>
          <h1 style={{ color: COLORS.text }}>Il Nome Perfetto</h1>
          <p style={{ color: COLORS.muted }}>Caricamento profilo...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div style={{ minHeight: "100vh", background: `linear-gradient(180deg, ${COLORS.bgTop} 0%, ${COLORS.bgBottom} 100%)`, padding: 24, fontFamily: "Inter, Arial, sans-serif", color: COLORS.text }}>
        <div style={{ maxWidth: 780, margin: "0 auto" }}>
          <div style={cardStyle({ padding: 28, marginBottom: 20, background: `linear-gradient(135deg, ${COLORS.primarySoft} 0%, #ffffff 100%)` })}>
            <div style={badgeStyle(COLORS.primarySoft, COLORS.primary)}>✨ V8 Balanced</div>
            <h1 style={{ fontSize: 38, marginBottom: 10 }}>Il Nome Perfetto</h1>
            <p style={{ color: COLORS.muted, fontSize: 16, lineHeight: 1.6 }}>
              Stessa logica stabile di v7, ma con un’esperienza più premium: deck più bello, shortlist elegante, metriche migliori e layout più fluido.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 18 }}>
            <div style={cardStyle()}>
              <h2 style={{ marginTop: 0 }}>Crea nuova coppia</h2>
              <input type="text" placeholder="Il tuo nome" value={name} onChange={(e) => setName(e.target.value)} style={{ ...inputStyle(), marginBottom: 12 }} />
              <button onClick={createNewCouple} disabled={loading} style={buttonStyle("primary")}>
                {loading ? "Attendi..." : "Crea nuova coppia"}
              </button>
            </div>

            <div style={cardStyle()}>
              <h2 style={{ marginTop: 0 }}>Unisciti a una coppia</h2>
              <input type="text" placeholder="Il tuo nome" value={name} onChange={(e) => setName(e.target.value)} style={{ ...inputStyle(), marginBottom: 12 }} />
              <input type="text" placeholder="Codice coppia esistente" value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())} style={{ ...inputStyle(), marginBottom: 12 }} />
              <button onClick={joinExistingCouple} disabled={loading} style={buttonStyle("secondary")}>
                {loading ? "Attendi..." : "Unisciti alla coppia"}
              </button>
            </div>
          </div>

          {message ? (
            <div style={{ ...cardStyle({ marginTop: 20, padding: 14 }) }}>
              <span style={{ color: COLORS.muted }}>{message}</span>
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: `linear-gradient(180deg, ${COLORS.bgTop} 0%, ${COLORS.bgBottom} 100%)`, padding: 20, fontFamily: "Inter, Arial, sans-serif", color: COLORS.text }}>
      <div style={{ maxWidth: 1180, margin: "0 auto" }}>
        <div style={cardStyle({ padding: 24, marginBottom: 20, background: `linear-gradient(135deg, #ffffff 0%, ${COLORS.primarySoft} 100%)` })}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
            <div>
              <div style={{ ...badgeStyle(COLORS.primarySoft, COLORS.primary), marginBottom: 12 }}>💜 Profilo attivo</div>
              <h1 style={{ margin: 0, fontSize: 34 }}>Il Nome Perfetto</h1>
              <p style={{ color: COLORS.muted, marginBottom: 0 }}>
                Ciao <strong>{profile.name}</strong> — codice coppia <strong>{profile.couple_code}</strong>
              </p>
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
              <div style={{ width: `${progress}%`, height: "100%", background: `linear-gradient(90deg, ${COLORS.primary} 0%, ${COLORS.primary2} 100%)` }} />
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14, marginBottom: 20 }}>
          <div style={statBoxStyle(COLORS.redSoft, "#fecaca")}>
            <div style={badgeStyle(COLORS.redSoft, COLORS.red)}>👎 No</div>
            <h3 style={{ marginBottom: 0, fontSize: 28 }}>{summary.no}</h3>
            <p style={{ marginBottom: 0, color: COLORS.muted, fontSize: 13 }}>Passati oltre</p>
          </div>
          <div style={statBoxStyle(COLORS.greenSoft, "#bbf7d0")}>
            <div style={badgeStyle(COLORS.greenSoft, COLORS.green)}>👍 Sì</div>
            <h3 style={{ marginBottom: 0, fontSize: 28 }}>{summary.yes}</h3>
            <p style={{ marginBottom: 0, color: COLORS.muted, fontSize: 13 }}>Ti piacciono</p>
          </div>
          <div style={statBoxStyle(COLORS.primarySoft, "#e9d5ff")}>
            <div style={badgeStyle(COLORS.primarySoft, COLORS.primary)}>💜 Adoro</div>
            <h3 style={{ marginBottom: 0, fontSize: 28 }}>{summary.love}</h3>
            <p style={{ marginBottom: 0, color: COLORS.muted, fontSize: 13 }}>Top assoluti</p>
          </div>
          <div style={statBoxStyle(COLORS.blueSoft, "#bfdbfe")}>
            <div style={badgeStyle(COLORS.blueSoft, COLORS.blue)}>🤝 Match</div>
            <h3 style={{ marginBottom: 0, fontSize: 28 }}>{matchedNames.length}</h3>
            <p style={{ marginBottom: 0, color: COLORS.muted, fontSize: 13 }}>In comune col partner</p>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "minmax(320px, 1.3fr) minmax(280px, 1fr)", gap: 20, alignItems: "start" }}>
          <div style={{ display: "grid", gap: 20 }}>
            <div style={cardStyle({ padding: 22, background: "linear-gradient(180deg, #ffffff 0%, #fcfcff 100%)" })}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 14 }}>
                <div>
                  <h2 style={{ margin: 0 }}>Deck di voto</h2>
                  <p style={{ margin: "6px 0 0 0", color: COLORS.muted, fontSize: 14 }}>Focus sul nome + filtri rapidi per deck personalizzato.</p>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button onClick={() => setDeckFilter("all")} style={buttonStyle(deckFilter === "all" ? "activePill" : "secondary")}>Tutti</button>
                  <button onClick={() => setDeckFilter("favorites")} style={buttonStyle(deckFilter === "favorites" ? "activePill" : "secondary")}>Solo preferiti</button>
                  <button onClick={() => setDeckFilter("matches")} style={buttonStyle(deckFilter === "matches" ? "activePill" : "secondary")}>Solo match</button>
                </div>
              </div>

              {votesLoading ? (
                <p style={{ color: COLORS.muted }}>Caricamento voti...</p>
              ) : currentName ? (
                <div style={{ position: "relative", borderRadius: 30, padding: 24, background: `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.primary2} 100%)`, color: "white", minHeight: 340, display: "flex", flexDirection: "column", justifyContent: "space-between", boxShadow: "0 18px 40px rgba(124, 58, 237, 0.22)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                    <div style={{ ...badgeStyle("rgba(255,255,255,0.18)", "#fff") }}>Nome {currentIndex + 1} di {filteredNamePool.length}</div>
                    <div style={{ ...badgeStyle("rgba(255,255,255,0.18)", "#fff") }}>{deckFilter === "all" ? "Deck completo" : deckFilter === "favorites" ? "Preferiti" : "Match"}</div>
                  </div>

                  <div>
                    <p style={{ opacity: 0.8, marginBottom: 8 }}>Mood del nome</p>
                    <h2 style={{ fontSize: 44, marginTop: 0, marginBottom: 10 }}>{currentName}</h2>
                    <p style={{ opacity: 0.85, marginBottom: 0 }}>Scegli il tuo feeling: passa oltre, ti piace o lo ami davvero.</p>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12 }}>
                    <button onClick={() => handleVote("no")} disabled={voteSaving} style={{ ...buttonStyle("no"), width: "100%" }}>{voteSaving ? "Salvataggio..." : "👎 No"}</button>
                    <button onClick={() => handleVote("yes")} disabled={voteSaving} style={{ ...buttonStyle("yes"), width: "100%" }}>{voteSaving ? "Salvataggio..." : "👍 Sì"}</button>
                    <button onClick={() => handleVote("love")} disabled={voteSaving} style={{ ...buttonStyle("love"), width: "100%", background: "#fff", color: COLORS.primary, border: "none" }}>{voteSaving ? "Salvataggio..." : "💜 Adoro"}</button>
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: "center", padding: 30, borderRadius: 24, background: COLORS.slateSoft, border: `1px solid ${COLORS.border}` }}>
                  <h2 style={{ marginBottom: 8 }}>Hai finito il deck 🎉</h2>
                  <p style={{ color: COLORS.muted, marginTop: 0 }}>Puoi generare nuovi nomi, guardare la shortlist o controllare i match col partner.</p>
                </div>
              )}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
              <div style={cardStyle()}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                  <h3 style={{ marginTop: 0, marginBottom: 0 }}>Shortlist</h3>
                  <div style={badgeStyle(COLORS.primarySoft, COLORS.primary)}>{shortlist.length}</div>
                </div>
                {shortlist.length === 0 ? (
                  <p style={{ color: COLORS.muted }}>Quando voterai Sì / Adoro, i migliori nomi appariranno qui.</p>
                ) : (
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
                    {shortlist.map((babyName, idx) => (
                      <span key={babyName} style={badgeStyle(votes[babyName] === "love" ? COLORS.primarySoft : COLORS.greenSoft, votes[babyName] === "love" ? COLORS.primary : COLORS.green)}>
                        #{idx + 1} {babyName}
                      </span>
                    ))}
                  </div>
                )}
                <p style={{ color: COLORS.muted, fontSize: 13, marginTop: 14, marginBottom: 0 }}>La shortlist mette prima i “love”, poi i “yes”.</p>
              </div>

              <div style={cardStyle()}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                  <h3 style={{ marginTop: 0, marginBottom: 0 }}>Ultimi voti</h3>
                  <div style={badgeStyle(COLORS.blueSoft, COLORS.blue)}>{recentVotes.length}</div>
                </div>
                {recentVotes.length === 0 ? (
                  <p style={{ color: COLORS.muted }}>I tuoi ultimi voti appariranno qui.</p>
                ) : (
                  <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
                    {recentVotes.map((item) => (
                      <div key={item.babyName} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 12, borderRadius: 16, background: COLORS.slateSoft, border: `1px solid ${COLORS.border}` }}>
                        <span style={{ fontWeight: 600 }}>{item.babyName}</span>
                        <span style={badgeStyle(item.vote === "love" ? COLORS.primarySoft : item.vote === "yes" ? COLORS.greenSoft : COLORS.redSoft, item.vote === "love" ? COLORS.primary : item.vote === "yes" ? COLORS.green : COLORS.red)}>{item.vote}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gap: 20 }}>
            <div style={cardStyle({ background: matchedNames.length ? "linear-gradient(180deg, #f0fdf4 0%, #ffffff 100%)" : "#ffffff" })}>
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
                <>
                  <div style={{ marginTop: 12, marginBottom: 14, padding: 16, borderRadius: 18, background: "rgba(34,197,94,0.08)", border: "1px solid #bbf7d0" }}>
                    <p style={{ margin: 0, color: COLORS.muted, fontSize: 14 }}>Compatibilità percepita</p>
                    <h3 style={{ marginTop: 8, marginBottom: 0, fontSize: 34 }}>{Math.min(100, 50 + matchedNames.length * 10)}%</h3>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {matchedNames.map((babyName) => (
                      <span key={babyName} style={badgeStyle(COLORS.greenSoft, COLORS.green)}>🤝 {babyName}</span>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div style={cardStyle()}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                <h2 style={{ margin: 0 }}>Generatore nomi</h2>
                <div style={badgeStyle(COLORS.primarySoft, COLORS.primary)}>{generatedNames.length} extra</div>
              </div>
              <p style={{ color: COLORS.muted, marginTop: 10 }}>Genera nuovi nomi femminili e aggiungili subito al deck.</p>

              <label style={{ display: "block", marginBottom: 6, color: COLORS.muted, fontSize: 14 }}>Stile</label>
              <select value={generatorStyle} onChange={(e) => setGeneratorStyle(e.target.value)} style={{ ...inputStyle(), marginBottom: 12 }}>
                <option value="classici">Classici</option>
                <option value="moderni">Moderni</option>
                <option value="internazionali">Internazionali</option>
                <option value="eleganti">Eleganti</option>
                <option value="corti">Corti</option>
              </select>

              <label style={{ display: "block", marginBottom: 6, color: COLORS.muted, fontSize: 14 }}>Iniziale opzionale</label>
              <input type="text" placeholder="Es. A" value={startsWith} onChange={(e) => setStartsWith(e.target.value)} style={{ ...inputStyle(), marginBottom: 12 }} />

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
                <button onClick={handleGenerateNames} disabled={generatorLoading} style={buttonStyle("primary")}>
                  {generatorLoading ? "Generazione..." : "Genera 10 nomi"}
                </button>
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
                <button onClick={() => { setDeckFilter("all"); setMessage("Filtro deck resettato"); }} style={buttonStyle("secondary")}>Reset filtri deck</button>
              </div>
              <p style={{ color: COLORS.muted, fontSize: 13, marginTop: 12, marginBottom: 0 }}>
                “Azzera i miei voti” cancella solo i tuoi voti dal database, non quelli del partner.
              </p>
            </div>
          </div>
        </div>

        {message ? (
          <div style={{ ...cardStyle({ marginTop: 20, padding: 14 }) }}>
            <span style={{ color: COLORS.muted }}>{message}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
