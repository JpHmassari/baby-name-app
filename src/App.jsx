import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "./lib/supabase";
import { NAMES_DATABASE } from "./data/namesDatabase";

const STORAGE_KEY = "baby_name_app_profile";

const COLORS = {
  bgTop: "#f5f3ff",
  bgBottom: "#f8fafc",
  card: "#ffffff",
  text: "#1f2330",
  muted: "#667085",
  border: "#ebe7f5",
  primary: "#7c3aed",
  primary2: "#a855f7",
  primary3: "#ec4899",
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

function pageStyle() {
  return {
    minHeight: "100vh",
    background: `linear-gradient(180deg, ${COLORS.bgTop} 0%, ${COLORS.bgBottom} 100%)`,
    padding: 20,
    fontFamily: "Inter, Arial, sans-serif",
    color: COLORS.text,
  };
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

function voteBadgeStyle(vote) {
  if (vote === "love") return badgeStyle(COLORS.primarySoft, COLORS.primary);
  if (vote === "yes") return badgeStyle(COLORS.greenSoft, COLORS.green);
  return badgeStyle(COLORS.redSoft, COLORS.red);
}

function scoreCandidate(candidate, likedMeta) {
  if (!likedMeta.length) return 0;
  let score = 0;
  likedMeta.forEach((meta) => {
    meta.styles.forEach((style) => {
      if (candidate.styles.includes(style)) score += meta.weight * 3;
    });
    meta.tags.forEach((tag) => {
      if (candidate.tags.includes(tag)) score += meta.weight * 2;
    });
    if (candidate.origin === meta.origin) score += meta.weight * 2;
    if (candidate.length === meta.length) score += meta.weight;
    if (candidate.initial === meta.initial) score += 1;
  });
  if (candidate.popularity === "alta") score += 0.25;
  if (candidate.international) score += 0.25;
  return score;
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

  const [deckFilter, setDeckFilter] = useState("all");

  const [exploreStyle, setExploreStyle] = useState("all");
  const [exploreOrigin, setExploreOrigin] = useState("all");
  const [exploreInitial, setExploreInitial] = useState("");
  const [smartSuggestions, setSmartSuggestions] = useState([]);

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

  const namesMap = useMemo(() => {
    const map = {};
    NAMES_DATABASE.forEach((item) => {
      map[item.name] = item;
    });
    return map;
  }, []);

  const namePool = useMemo(() => NAMES_DATABASE.map((item) => item.name), []);
  const allStyles = useMemo(() => [...new Set(NAMES_DATABASE.flatMap((item) => item.styles))].sort(), []);
  const allOrigins = useMemo(() => [...new Set(NAMES_DATABASE.map((item) => item.origin))].sort(), []);

  const favoriteNames = useMemo(() => {
    return namePool.filter((babyName) => votes[babyName] === "yes" || votes[babyName] === "love");
  }, [votes, namePool]);

  const matchedNames = useMemo(() => {
    return namePool.filter((babyName) => isPositiveVote(votes[babyName]) && isPositiveVote(partnerVotes[babyName]));
  }, [votes, partnerVotes, namePool]);

  const filteredNamePool = useMemo(() => {
    if (deckFilter === "favorites") return favoriteNames;
    if (deckFilter === "matches") return matchedNames;
    return namePool;
  }, [deckFilter, favoriteNames, matchedNames, namePool]);

  const currentIndex = useMemo(() => filteredNamePool.findIndex((babyName) => !votes[babyName]), [votes, filteredNamePool]);
  const currentName = currentIndex >= 0 ? filteredNamePool[currentIndex] : null;
  const currentMeta = currentName ? namesMap[currentName] : null;

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

  const likedMeta = useMemo(() => {
    return namePool
      .filter((babyName) => votes[babyName] === "yes" || votes[babyName] === "love")
      .map((babyName) => ({
        ...namesMap[babyName],
        weight: votes[babyName] === "love" ? 2 : 1,
      }));
  }, [votes, namePool, namesMap]);

  useEffect(() => {
    refreshSmartSuggestions();
  }, [votes, exploreStyle, exploreOrigin, exploreInitial]);

  function refreshSmartSuggestions() {
    const initial = exploreInitial.trim().toUpperCase();
    let candidates = NAMES_DATABASE.filter((item) => !votes[item.name]);

    if (exploreStyle !== "all") {
      candidates = candidates.filter((item) => item.styles.includes(exploreStyle));
    }
    if (exploreOrigin !== "all") {
      candidates = candidates.filter((item) => item.origin === exploreOrigin);
    }
    if (initial) {
      candidates = candidates.filter((item) => item.initial === initial);
    }

    const sorted = [...candidates]
      .map((item) => ({ ...item, score: scoreCandidate(item, likedMeta) }))
      .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
      .slice(0, 10);

    setSmartSuggestions(sorted);
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

  return (
    <div style={pageStyle()}>
      <style>{`
        * { box-sizing: border-box; }
        .app-shell { max-width: 1200px; margin: 0 auto; }
        .stats-grid { display: grid; gap: 14px; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); }
        .main-grid { display: grid; gap: 20px; grid-template-columns: minmax(320px, 1.3fr) minmax(300px, 1fr); align-items: start; }
        .stack-grid { display: grid; gap: 20px; }
        .two-col { display: grid; gap: 20px; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); }
        .auth-grid { display: grid; gap: 18px; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); }
        .deck-actions { display: grid; gap: 12px; grid-template-columns: repeat(3, minmax(0, 1fr)); }
        .chip-wrap { display: flex; gap: 8px; flex-wrap: wrap; }
        .hover-lift { transition: transform 0.2s ease, box-shadow 0.2s ease; }
        .hover-lift:hover { transform: translateY(-2px); box-shadow: 0 14px 34px rgba(71, 56, 135, 0.10); }
        .message-bar { position: sticky; bottom: 14px; z-index: 20; }
        @media (max-width: 980px) {
          .main-grid { grid-template-columns: 1fr; }
        }
        @media (max-width: 640px) {
          .deck-actions { grid-template-columns: 1fr; }
        }
      `}</style>

      {checkingSession ? (
        <div className="app-shell">
          <h1 style={{ color: COLORS.text }}>Il Nome Perfetto</h1>
          <p style={{ color: COLORS.muted }}>Caricamento profilo...</p>
        </div>
      ) : !profile ? (
        <div className="app-shell" style={{ maxWidth: 780 }}>
          <div className="hover-lift" style={cardStyle({ padding: 28, marginBottom: 20, background: `linear-gradient(135deg, ${COLORS.primarySoft} 0%, #ffffff 100%)` })}>
            <div style={badgeStyle(COLORS.primarySoft, COLORS.primary)}>✨ V9 Free Smart Catalog</div>
            <h1 style={{ fontSize: 38, marginBottom: 10 }}>Il Nome Perfetto</h1>
            <p style={{ color: COLORS.muted, fontSize: 16, lineHeight: 1.6, marginBottom: 0 }}>
              500 nomi precaricati con meta-dati, storia stilistica e significato breve. Zero costi AI, ma un catalogo molto più ricco e intelligente.
            </p>
          </div>

          <div className="auth-grid">
            <div className="hover-lift" style={cardStyle()}>
              <h2 style={{ marginTop: 0 }}>Crea nuova coppia</h2>
              <input type="text" placeholder="Il tuo nome" value={name} onChange={(e) => setName(e.target.value)} style={{ ...inputStyle(), marginBottom: 12 }} />
              <button onClick={createNewCouple} disabled={loading} style={buttonStyle("primary")}>{loading ? "Attendi..." : "Crea nuova coppia"}</button>
            </div>
            <div className="hover-lift" style={cardStyle()}>
              <h2 style={{ marginTop: 0 }}>Unisciti a una coppia</h2>
              <input type="text" placeholder="Il tuo nome" value={name} onChange={(e) => setName(e.target.value)} style={{ ...inputStyle(), marginBottom: 12 }} />
              <input type="text" placeholder="Codice coppia esistente" value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())} style={{ ...inputStyle(), marginBottom: 12 }} />
              <button onClick={joinExistingCouple} disabled={loading} style={buttonStyle("secondary")}>{loading ? "Attendi..." : "Unisciti alla coppia"}</button>
            </div>
          </div>

          {message ? <div style={{ ...cardStyle({ marginTop: 20, padding: 14 }) }}><span style={{ color: COLORS.muted }}>{message}</span></div> : null}
        </div>
      ) : (
        <div className="app-shell">
          <div className="hover-lift" style={cardStyle({ padding: 24, marginBottom: 20, background: `linear-gradient(135deg, #ffffff 0%, ${COLORS.primarySoft} 100%)` })}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
              <div>
                <div style={{ ...badgeStyle(COLORS.primarySoft, COLORS.primary), marginBottom: 12 }}>📚 Catalogo smart attivo</div>
                <h1 style={{ margin: 0, fontSize: 34 }}>Il Nome Perfetto</h1>
                <p style={{ color: COLORS.muted, marginBottom: 0 }}>
                  Ciao <strong>{profile.name}</strong> — codice coppia <strong>{profile.couple_code}</strong> — catalogo precaricato: <strong>{NAMES_DATABASE.length} nomi</strong>
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

          <div className="stats-grid">
            <div className="hover-lift" style={cardStyle({ background: COLORS.redSoft, border: "1px solid #fecaca" })}><div style={badgeStyle(COLORS.redSoft, COLORS.red)}>👎 No</div><h3 style={{ marginBottom: 0, fontSize: 28 }}>{summary.no}</h3><p style={{ marginBottom: 0, color: COLORS.muted, fontSize: 13 }}>Passati oltre</p></div>
            <div className="hover-lift" style={cardStyle({ background: COLORS.greenSoft, border: "1px solid #bbf7d0" })}><div style={badgeStyle(COLORS.greenSoft, COLORS.green)}>👍 Sì</div><h3 style={{ marginBottom: 0, fontSize: 28 }}>{summary.yes}</h3><p style={{ marginBottom: 0, color: COLORS.muted, fontSize: 13 }}>Ti piacciono</p></div>
            <div className="hover-lift" style={cardStyle({ background: COLORS.primarySoft, border: "1px solid #e9d5ff" })}><div style={badgeStyle(COLORS.primarySoft, COLORS.primary)}>💜 Adoro</div><h3 style={{ marginBottom: 0, fontSize: 28 }}>{summary.love}</h3><p style={{ marginBottom: 0, color: COLORS.muted, fontSize: 13 }}>Top assoluti</p></div>
            <div className="hover-lift" style={cardStyle({ background: COLORS.blueSoft, border: "1px solid #bfdbfe" })}><div style={badgeStyle(COLORS.blueSoft, COLORS.blue)}>🤝 Match</div><h3 style={{ marginBottom: 0, fontSize: 28 }}>{matchedNames.length}</h3><p style={{ marginBottom: 0, color: COLORS.muted, fontSize: 13 }}>In comune col partner</p></div>
          </div>

          <div className="main-grid" style={{ marginTop: 20 }}>
            <div className="stack-grid">
              <div className="hover-lift" style={cardStyle({ padding: 22, background: "linear-gradient(180deg, #ffffff 0%, #fcfcff 100%)" })}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 14 }}>
                  <div>
                    <h2 style={{ margin: 0 }}>Deck con significato</h2>
                    <p style={{ margin: "6px 0 0 0", color: COLORS.muted, fontSize: 14 }}>Ogni nome mostra significato, origine e categorie. Niente AI esterna, ma un catalogo curato e smart.</p>
                  </div>
                  <div className="chip-wrap">
                    <button onClick={() => setDeckFilter("all")} style={buttonStyle(deckFilter === "all" ? "activePill" : "secondary")}>Tutti</button>
                    <button onClick={() => setDeckFilter("favorites")} style={buttonStyle(deckFilter === "favorites" ? "activePill" : "secondary")}>Solo preferiti</button>
                    <button onClick={() => setDeckFilter("matches")} style={buttonStyle(deckFilter === "matches" ? "activePill" : "secondary")}>Solo match</button>
                  </div>
                </div>

                {votesLoading ? (
                  <p style={{ color: COLORS.muted }}>Caricamento voti...</p>
                ) : currentName && currentMeta ? (
                  <div style={{ position: "relative", borderRadius: 30, padding: 24, background: `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.primary2} 56%, ${COLORS.primary3} 100%)`, color: "white", minHeight: 380, display: "flex", flexDirection: "column", justifyContent: "space-between", boxShadow: "0 24px 50px rgba(124, 58, 237, 0.24)", overflow: "hidden" }}>
                    <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at top right, rgba(255,255,255,0.30), transparent 35%)" }} />
                    <div style={{ position: "absolute", right: -40, bottom: -56, width: 180, height: 180, borderRadius: "50%", background: "rgba(255,255,255,0.14)" }} />

                    <div style={{ position: "relative", display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                      <div style={{ ...badgeStyle("rgba(255,255,255,0.18)", "#fff") }}>Nome {currentIndex + 1} di {filteredNamePool.length}</div>
                      <div style={{ ...badgeStyle("rgba(255,255,255,0.18)", "#fff") }}>{currentMeta.origin}</div>
                    </div>

                    <div style={{ position: "relative" }}>
                      <p style={{ opacity: 0.82, marginBottom: 8 }}>Meaning</p>
                      <h2 style={{ fontSize: 48, marginTop: 0, marginBottom: 10 }}>{currentName}</h2>
                      <p style={{ opacity: 0.94, fontSize: 16, lineHeight: 1.6, marginBottom: 14 }}>{currentMeta.meaning}</p>
                      <div className="chip-wrap" style={{ marginBottom: 8 }}>
                        {currentMeta.styles.slice(0, 4).map((style) => (
                          <span key={style} style={{ ...badgeStyle("rgba(255,255,255,0.18)", "#fff") }}>{style}</span>
                        ))}
                      </div>
                      <div className="chip-wrap">
                        {currentMeta.tags.slice(0, 4).map((tag) => (
                          <span key={tag} style={{ ...badgeStyle("rgba(255,255,255,0.12)", "#fff") }}>{tag}</span>
                        ))}
                      </div>
                    </div>

                    <div className="deck-actions" style={{ position: "relative" }}>
                      <button onClick={() => handleVote("no")} disabled={voteSaving} style={{ ...buttonStyle("no"), width: "100%" }}>{voteSaving ? "Salvataggio..." : "👎 No"}</button>
                      <button onClick={() => handleVote("yes")} disabled={voteSaving} style={{ ...buttonStyle("yes"), width: "100%" }}>{voteSaving ? "Salvataggio..." : "👍 Sì"}</button>
                      <button onClick={() => handleVote("love")} disabled={voteSaving} style={{ ...buttonStyle("love"), width: "100%", background: "#fff", color: COLORS.primary, border: "none" }}>{voteSaving ? "Salvataggio..." : "💜 Adoro"}</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ textAlign: "center", padding: 30, borderRadius: 24, background: COLORS.slateSoft, border: `1px solid ${COLORS.border}` }}>
                    <h2 style={{ marginBottom: 8 }}>Hai finito il deck 🎉</h2>
                    <p style={{ color: COLORS.muted, marginTop: 0 }}>Puoi usare i suggerimenti smart, rivedere i preferiti o controllare i match col partner.</p>
                  </div>
                )}
              </div>

              <div className="two-col">
                <div className="hover-lift" style={cardStyle()}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                    <h3 style={{ marginTop: 0, marginBottom: 0 }}>Preferiti</h3>
                    <div style={badgeStyle(COLORS.greenSoft, COLORS.green)}>{favoriteNames.length}</div>
                  </div>
                  {favoriteNames.length === 0 ? (
                    <p style={{ color: COLORS.muted }}>Ancora nessun preferito. Inizia a votare 👍 o 💜.</p>
                  ) : (
                    <div className="chip-wrap" style={{ marginTop: 12 }}>
                      {favoriteNames.slice(0, 18).map((babyName) => (
                        <span key={babyName} style={badgeStyle(votes[babyName] === "love" ? COLORS.primarySoft : COLORS.greenSoft, votes[babyName] === "love" ? COLORS.primary : COLORS.green)}>{babyName}</span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="hover-lift" style={cardStyle()}>
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
                          <span style={voteBadgeStyle(item.vote)}>{item.vote}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="stack-grid">
              <div className="hover-lift" style={cardStyle({ background: matchedNames.length ? "linear-gradient(180deg, #f0fdf4 0%, #ffffff 100%)" : "#ffffff" })}>
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
                    <div className="chip-wrap">
                      {matchedNames.slice(0, 18).map((babyName) => (
                        <span key={babyName} style={badgeStyle(COLORS.greenSoft, COLORS.green)}>🤝 {babyName}</span>
                      ))}
                    </div>
                  </>
                )}
              </div>

              <div className="hover-lift" style={cardStyle()}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                  <h2 style={{ margin: 0 }}>Catalogo smart (gratis)</h2>
                  <div style={badgeStyle(COLORS.primarySoft, COLORS.primary)}>{smartSuggestions.length} suggerimenti</div>
                </div>
                <p style={{ color: COLORS.muted, marginTop: 10 }}>Usa filtri e gusto personale per scoprire 10 nomi consigliati dal catalogo precaricato.</p>

                <label style={{ display: "block", marginBottom: 6, color: COLORS.muted, fontSize: 14 }}>Stile</label>
                <select value={exploreStyle} onChange={(e) => setExploreStyle(e.target.value)} style={{ ...inputStyle(), marginBottom: 12 }}>
                  <option value="all">Tutti gli stili</option>
                  {allStyles.map((style) => <option key={style} value={style}>{style}</option>)}
                </select>

                <label style={{ display: "block", marginBottom: 6, color: COLORS.muted, fontSize: 14 }}>Origine</label>
                <select value={exploreOrigin} onChange={(e) => setExploreOrigin(e.target.value)} style={{ ...inputStyle(), marginBottom: 12 }}>
                  <option value="all">Tutte le origini</option>
                  {allOrigins.map((origin) => <option key={origin} value={origin}>{origin}</option>)}
                </select>

                <label style={{ display: "block", marginBottom: 6, color: COLORS.muted, fontSize: 14 }}>Iniziale opzionale</label>
                <input type="text" maxLength={1} placeholder="Es. A" value={exploreInitial} onChange={(e) => setExploreInitial(e.target.value.toUpperCase())} style={{ ...inputStyle(), marginBottom: 12 }} />

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
                  <button onClick={refreshSmartSuggestions} style={buttonStyle("primary")}>Aggiorna suggerimenti</button>
                </div>

                {smartSuggestions.length === 0 ? (
                  <p style={{ color: COLORS.muted, marginBottom: 0 }}>Nessun risultato con questi filtri.</p>
                ) : (
                  <div style={{ display: "grid", gap: 10 }}>
                    {smartSuggestions.map((item) => (
                      <div key={item.name} style={{ padding: 12, borderRadius: 16, background: COLORS.slateSoft, border: `1px solid ${COLORS.border}` }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 6 }}>
                          <strong>{item.name}</strong>
                          <span style={badgeStyle(COLORS.primarySoft, COLORS.primary)}>{item.origin}</span>
                        </div>
                        <div style={{ color: COLORS.muted, fontSize: 13, lineHeight: 1.45 }}>{item.meaning}</div>
                        <div className="chip-wrap" style={{ marginTop: 8 }}>
                          {item.styles.slice(0, 3).map((style) => <span key={style} style={badgeStyle(COLORS.greenSoft, COLORS.green)}>{style}</span>)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="hover-lift" style={cardStyle()}>
                <h2 style={{ marginTop: 0 }}>Azioni rapide</h2>
                <div style={{ display: "grid", gap: 10 }}>
                  <button onClick={resetMyVotes} disabled={voteSaving} style={buttonStyle("warning")}>Azzera i miei voti</button>
                  <button onClick={() => { setDeckFilter("all"); setMessage("Filtro deck resettato"); }} style={buttonStyle("secondary")}>Reset filtri deck</button>
                </div>
                <p style={{ color: COLORS.muted, fontSize: 13, marginTop: 12, marginBottom: 0 }}>“Azzera i miei voti” cancella solo i tuoi voti dal database, non quelli del partner.</p>
              </div>
            </div>
          </div>

          {message ? <div className="message-bar" style={{ ...cardStyle({ marginTop: 20, padding: 14 }) }}><span style={{ color: COLORS.muted }}>{message}</span></div> : null}
        </div>
      )}
    </div>
  );
}
