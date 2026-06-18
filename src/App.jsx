import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "./lib/supabase";
import { NAMES_DATABASE } from "./data/namesDatabase";

const STORAGE_KEY = "baby_name_app_profile";

const C = {
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

function shuffleArray(items) {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function isPositiveVote(vote) {
  return vote === "yes" || vote === "love";
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
    if (candidate.vibe === meta.vibe) score += meta.weight * 2;
  });

  if (candidate.popularity === "alta") score += 0.25;
  if (candidate.international) score += 0.25;

  return score;
}

function similarityScore(a, b) {
  let score = 0;

  a.styles.forEach((style) => {
    if (b.styles.includes(style)) score += 3;
  });

  a.tags.forEach((tag) => {
    if (b.tags.includes(tag)) score += 2;
  });

  if (a.origin === b.origin) score += 2;
  if (a.length === b.length) score += 1;
  if (a.vibe === b.vibe) score += 2;

  return score;
}

function pageStyle() {
  return {
    minHeight: "100vh",
    background: `linear-gradient(180deg, ${C.bgTop} 0%, ${C.bgBottom} 100%)`,
    padding: 20,
    fontFamily: "Inter, Arial, sans-serif",
    color: C.text,
  };
}

function cardStyle(extra = {}) {
  return {
    background: C.card,
    border: `1px solid ${C.border}`,
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
    border: `1px solid ${C.border}`,
    background: "#fff",
    color: C.text,
    outline: "none",
  };
}

function buttonStyle(kind = "primary") {
  const styles = {
    primary: {
      background: `linear-gradient(135deg, ${C.primary} 0%, ${C.primary2} 100%)`,
      color: "#fff",
      border: "none",
    },
    secondary: {
      background: "#fff",
      color: C.text,
      border: `1px solid ${C.border}`,
    },
    yes: {
      background: C.greenSoft,
      color: C.green,
      border: "1px solid #bbf7d0",
    },
    no: {
      background: C.redSoft,
      color: C.red,
      border: "1px solid #fecaca",
    },
    love: {
      background: C.primarySoft,
      color: C.primary,
      border: "1px solid #e9d5ff",
    },
    warning: {
      background: C.amberSoft,
      color: C.amber,
      border: "1px solid #fde68a",
    },
    activePill: {
      background: C.primarySoft,
      color: C.primary,
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
  if (vote === "love") return badgeStyle(C.primarySoft, C.primary);
  if (vote === "yes") return badgeStyle(C.greenSoft, C.green);
  return badgeStyle(C.redSoft, C.red);
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
  const [exploreVibe, setExploreVibe] = useState("all");
  const [exploreInitial, setExploreInitial] = useState("");
  const [priorityNames, setPriorityNames] = useState([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.id && parsed?.name && parsed?.couple_code) {
          setProfile(parsed);
          setMessage(`Bentornata/o ${parsed.name}! Sei collegata/o alla coppia ${parsed.couple_code}`);
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
      setPriorityNames([]);
    }
  }, [profile]);

  const allRandomNames = useMemo(() => shuffleArray(NAMES_DATABASE.map((item) => item.name)), []);

  const randomRank = useMemo(() => {
    const rank = {};
    allRandomNames.forEach((value, index) => {
      rank[value] = index;
    });
    return rank;
  }, [allRandomNames]);

  const namesMap = useMemo(() => {
    const map = {};
    NAMES_DATABASE.forEach((item) => {
      map[item.name] = item;
    });
    return map;
  }, []);

  const allStyles = useMemo(() => [...new Set(NAMES_DATABASE.flatMap((item) => item.styles))].sort(), []);
  const allOrigins = useMemo(() => [...new Set(NAMES_DATABASE.map((item) => item.origin))].sort(), []);
  const allVibes = useMemo(() => [...new Set(NAMES_DATABASE.map((item) => item.vibe))].sort(), []);

  const favoriteNames = useMemo(
    () => allRandomNames.filter((babyName) => votes[babyName] === "yes" || votes[babyName] === "love"),
    [votes, allRandomNames]
  );

  const matchedNames = useMemo(
    () => allRandomNames.filter((babyName) => isPositiveVote(votes[babyName]) && isPositiveVote(partnerVotes[babyName])),
    [votes, partnerVotes, allRandomNames]
  );

  const filteredNamePool = useMemo(() => {
    const basePool =
      deckFilter === "favorites"
        ? favoriteNames
        : deckFilter === "matches"
        ? matchedNames
        : allRandomNames;

    if (deckFilter === "all" && priorityNames.length > 0) {
      const priorityUnvoted = priorityNames.filter((babyName) => basePool.includes(babyName) && !votes[babyName]);
      const rest = basePool.filter((babyName) => !priorityUnvoted.includes(babyName));
      return [...priorityUnvoted, ...rest];
    }

    return basePool;
  }, [deckFilter, favoriteNames, matchedNames, allRandomNames, priorityNames, votes]);

  const currentIndex = useMemo(
    () => filteredNamePool.findIndex((babyName) => !votes[babyName]),
    [votes, filteredNamePool]
  );
  const currentName = currentIndex >= 0 ? filteredNamePool[currentIndex] : null;
  const currentMeta = currentName ? namesMap[currentName] : null;

  const votedCount = Object.keys(votes).length;
  const totalCount = allRandomNames.length;
  const progress = totalCount ? Math.round((votedCount / totalCount) * 100) : 0;

  const summary = useMemo(() => {
    const values = Object.values(votes);
    return {
      no: values.filter((v) => v === "no").length,
      yes: values.filter((v) => v === "yes").length,
      love: values.filter((v) => v === "love").length,
    };
  }, [votes]);

  const recentVotes = useMemo(
    () => Object.entries(votes).map(([babyName, vote]) => ({ babyName, vote })).reverse().slice(0, 8),
    [votes]
  );

  const likedMeta = useMemo(
    () =>
      allRandomNames
        .filter((babyName) => votes[babyName] === "yes" || votes[babyName] === "love")
        .map((babyName) => ({
          ...namesMap[babyName],
          weight: votes[babyName] === "love" ? 2 : 1,
        })),
    [votes, allRandomNames, namesMap]
  );

  const smartSuggestions = useMemo(() => {
    const initial = exploreInitial.trim().toUpperCase();
    let candidates = NAMES_DATABASE.filter((item) => !votes[item.name]);

    if (exploreStyle !== "all") {
      candidates = candidates.filter((item) => item.styles.includes(exploreStyle));
    }
    if (exploreOrigin !== "all") {
      candidates = candidates.filter((item) => item.origin === exploreOrigin);
    }
    if (exploreVibe !== "all") {
      candidates = candidates.filter((item) => item.vibe === exploreVibe);
    }
    if (initial) {
      candidates = candidates.filter((item) => item.initial === initial);
    }

    return candidates
      .map((item) => ({ ...item, score: scoreCandidate(item, likedMeta) }))
      .sort((a, b) => b.score - a.score || randomRank[a.name] - randomRank[b.name])
      .slice(0, 10);
  }, [votes, exploreStyle, exploreOrigin, exploreVibe, exploreInitial, likedMeta, randomRank]);

  const similarToCurrent = useMemo(() => {
    if (!currentMeta) return [];

    return NAMES_DATABASE
      .filter((item) => item.name !== currentMeta.name && !votes[item.name])
      .map((item) => ({ ...item, score: similarityScore(currentMeta, item) }))
      .sort((a, b) => b.score - a.score || randomRank[a.name] - randomRank[b.name])
      .slice(0, 6);
  }, [currentMeta, votes, randomRank]);

  function pushSuggestionsToDeck() {
    setPriorityNames(smartSuggestions.map((item) => item.name));
    setMessage("I nuovi suggerimenti sono stati messi in cima al deck.");
  }

  function clearPriorityQueue() {
    setPriorityNames([]);
    setMessage("Priorità svuotata: il deck torna all’ordine random standard.");
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
      setPriorityNames([]);
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
      setPriorityNames([]);
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
      setPriorityNames([]);
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
    setPriorityNames([]);
    setName("");
    setJoinCode("");
    setMessage("Profilo scollegato da questo dispositivo");
  }

  return (
    <div style={pageStyle()}>
      <style>{`* { box-sizing: border-box; } .app-shell { max-width: 1200px; margin: 0 auto; } .stats-grid { display: grid; gap: 14px; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); } .content-grid { display: grid; gap: 20px; grid-template-columns: minmax(320px, 1.3fr) minmax(300px, 1fr); align-items: start; } .secondary-grid { display: grid; gap: 20px; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); } .stack-grid { display: grid; gap: 20px; } .auth-grid { display: grid; gap: 18px; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); } .deck-actions { display: grid; gap: 12px; grid-template-columns: repeat(3, minmax(0, 1fr)); } .chip-wrap { display: flex; gap: 8px; flex-wrap: wrap; } .hover-lift { transition: transform 0.2s ease, box-shadow 0.2s ease; } .hover-lift:hover { transform: translateY(-2px); box-shadow: 0 14px 34px rgba(71,56,135,.10); } .message-bar { position: sticky; bottom: 14px; z-index: 20; } .deck-panel { grid-column: 1; } .match-panel { grid-column: 2; } .catalog-panel { grid-column: 2; } .secondary-left { grid-column: 1; } .secondary-right { grid-column: 1 / span 2; } .actions-panel { grid-column: 2; } @media (max-width: 980px) { .content-grid { grid-template-columns: 1fr; } .deck-panel, .match-panel, .catalog-panel, .secondary-left, .secondary-right, .actions-panel { grid-column: auto; } } @media (max-width: 640px) { .deck-actions { grid-template-columns: 1fr; } }`}</style>

      {checkingSession ? (
        <div className="app-shell">
          <h1>Il Nome Perfetto</h1>
          <p style={{ color: C.muted }}>Caricamento profilo...</p>
        </div>
      ) : !profile ? (
        <div className="app-shell" style={{ maxWidth: 780 }}>
          <div className="hover-lift" style={card({ padding: 28, marginBottom: 20, background: `linear-gradient(135deg, ${C.primarySoft} 0%, #ffffff 100%)` })}>
            <div style={badge(C.primarySoft, C.primary)}>✨ V10.2 Random + Clear Priority</div>
            <h1 style={{ fontSize: 38, marginBottom: 10 }}>Il Nome Perfetto</h1>
            <p style={{ color: C.muted, fontSize: 16, lineHeight: 1.6, marginBottom: 0 }}>
              I suggerimenti smart vanno in cima al deck, puoi svuotare la priorità e i nomi non vengono mai mostrati in ordine alfabetico.
            </p>
          </div>

          <div className="auth-grid">
            <div className="hover-lift" style={card()}>
              <h2 style={{ marginTop: 0 }}>Crea nuova coppia</h2>
              <input type="text" placeholder="Il tuo nome" value={name} onChange={(e) => setName(e.target.value)} style={{ ...input, marginBottom: 12 }} />
              <button onClick={createNewCouple} disabled={loading} style={btn("primary")}>{loading ? "Attendi..." : "Crea nuova coppia"}</button>
            </div>
            <div className="hover-lift" style={card()}>
              <h2 style={{ marginTop: 0 }}>Unisciti a una coppia</h2>
              <input type="text" placeholder="Il tuo nome" value={name} onChange={(e) => setName(e.target.value)} style={{ ...input, marginBottom: 12 }} />
              <input type="text" placeholder="Codice coppia esistente" value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())} style={{ ...input, marginBottom: 12 }} />
              <button onClick={joinExistingCouple} disabled={loading} style={btn("secondary")}>{loading ? "Attendi..." : "Unisciti alla coppia"}</button>
            </div>
          </div>

          {message ? <div style={{ ...card({ marginTop: 20, padding: 14 }) }}><span style={{ color: C.muted }}>{message}</span></div> : null}
        </div>
      ) : (
        <div className="app-shell">
          <div className="hover-lift" style={card({ padding: 24, marginBottom: 20, background: `linear-gradient(135deg, #ffffff 0%, ${C.primarySoft} 100%)` })}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
              <div>
                <div style={{ ...badge(C.primarySoft, C.primary), marginBottom: 12 }}>📚 Smart catalog attivo</div>
                <h1 style={{ margin: 0, fontSize: 34 }}>Il Nome Perfetto</h1>
                <p style={{ color: C.muted, marginBottom: 0 }}>Ciao <strong>{profile.name}</strong> — codice coppia <strong>{profile.couple_code}</strong> — catalogo: <strong>{NAMES_DATABASE.length} nomi</strong></p>
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button onClick={refreshMatches} style={btn("secondary")}>Aggiorna match</button>
                <button onClick={logoutProfile} style={btn("secondary")}>Esci</button>
              </div>
            </div>
            <div style={{ marginTop: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, color: C.muted, marginBottom: 8 }}><span>Progresso voti</span><span>{votedCount} / {totalCount} · {progress}%</span></div>
              <div style={{ height: 12, borderRadius: 999, background: "#ede9fe", overflow: "hidden" }}><div style={{ width: `${progress}%`, height: "100%", background: `linear-gradient(90deg, ${C.primary} 0%, ${C.primary2} 100%)` }} /></div>
            </div>
          </div>

          <div className="stats-grid">
            <div className="hover-lift" style={card({ background: C.redSoft, border: "1px solid #fecaca" })}><div style={badge(C.redSoft, C.red)}>👎 No</div><h3 style={{ marginBottom: 0, fontSize: 28 }}>{summary.no}</h3><p style={{ marginBottom: 0, color: C.muted, fontSize: 13 }}>Passati oltre</p></div>
            <div className="hover-lift" style={card({ background: C.greenSoft, border: "1px solid #bbf7d0" })}><div style={badge(C.greenSoft, C.green)}>👍 Sì</div><h3 style={{ marginBottom: 0, fontSize: 28 }}>{summary.yes}</h3><p style={{ marginBottom: 0, color: C.muted, fontSize: 13 }}>Ti piacciono</p></div>
            <div className="hover-lift" style={card({ background: C.primarySoft, border: "1px solid #e9d5ff" })}><div style={badge(C.primarySoft, C.primary)}>💜 Adoro</div><h3 style={{ marginBottom: 0, fontSize: 28 }}>{summary.love}</h3><p style={{ marginBottom: 0, color: C.muted, fontSize: 13 }}>Top assoluti</p></div>
            <div className="hover-lift" style={card({ background: C.blueSoft, border: "1px solid #bfdbfe" })}><div style={badge(C.blueSoft, C.blue)}>🤝 Match</div><h3 style={{ marginBottom: 0, fontSize: 28 }}>{matchedNames.length}</h3><p style={{ marginBottom: 0, color: C.muted, fontSize: 13 }}>In comune col partner</p></div>
          </div>

          <div className="content-grid" style={{ marginTop: 20 }}>
            <div className="deck-panel hover-lift" style={card({ padding: 22, background: "linear-gradient(180deg, #ffffff 0%, #fcfcff 100%)" })}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 14 }}>
                <div>
                  <h2 style={{ margin: 0 }}>Deck con significato</h2>
                  <p style={{ margin: "6px 0 0 0", color: C.muted, fontSize: 14 }}>Con meaning, origin, vibe e categorie visibili. Ordine sempre random, mai alfabetico.</p>
                </div>
                <div className="chip-wrap">
                  <button onClick={() => setDeckFilter("all")} style={btn(deckFilter === "all" ? "activePill" : "secondary")}>Tutti</button>
                  <button onClick={() => setDeckFilter("favorites")} style={btn(deckFilter === "favorites" ? "activePill" : "secondary")}>Solo preferiti</button>
                  <button onClick={() => setDeckFilter("matches")} style={btn(deckFilter === "matches" ? "activePill" : "secondary")}>Solo match</button>
                  {priorityNames.length > 0 ? <button onClick={clearPriorityQueue} style={btn("secondary")}>Svuota priorità</button> : null}
                </div>
              </div>

              {votesLoading ? (
                <p style={{ color: C.muted }}>Caricamento voti...</p>
              ) : currentName && currentMeta ? (
                <div style={{ position: "relative", borderRadius: 30, padding: 24, background: `linear-gradient(135deg, ${C.primary} 0%, ${C.primary2} 56%, ${C.primary3} 100%)`, color: "white", minHeight: 390, display: "flex", flexDirection: "column", justifyContent: "space-between", boxShadow: "0 24px 50px rgba(124,58,237,0.24)", overflow: "hidden" }}>
                  <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at top right, rgba(255,255,255,0.30), transparent 35%)" }} />
                  <div style={{ position: "absolute", right: -40, bottom: -56, width: 180, height: 180, borderRadius: "50%", background: "rgba(255,255,255,0.14)" }} />

                  <div style={{ position: "relative", display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                    <div style={badge("rgba(255,255,255,0.18)", "#fff")}>Nome {currentIndex + 1} di {filteredNamePool.length}</div>
                    <div className="chip-wrap">
                      {priorityNames.includes(currentName) ? <span style={badge("rgba(255,255,255,0.18)", "#fff")}>Suggerito per te</span> : null}
                      <span style={badge("rgba(255,255,255,0.18)", "#fff")}>{currentMeta.origin}</span>
                    </div>
                  </div>

                  <div style={{ position: "relative" }}>
                    <p style={{ opacity: 0.82, marginBottom: 8 }}>Meaning</p>
                    <h2 style={{ fontSize: 48, marginTop: 0, marginBottom: 10 }}>{currentName}</h2>
                    <p style={{ opacity: 0.94, fontSize: 16, lineHeight: 1.6, marginBottom: 14 }}>{currentMeta.meaning}</p>
                    <div className="chip-wrap" style={{ marginBottom: 8 }}>
                      {[...currentMeta.styles.slice(0, 3), currentMeta.vibe].map((label) => (
                        <span key={label} style={badge("rgba(255,255,255,0.18)", "#fff")}>{label}</span>
                      ))}
                    </div>
                  </div>

                  <div className="deck-actions" style={{ position: "relative" }}>
                    <button onClick={() => handleVote("no")} disabled={voteSaving} style={{ ...btn("no"), width: "100%" }}>{voteSaving ? "Salvataggio..." : "👎 No"}</button>
                    <button onClick={() => handleVote("yes")} disabled={voteSaving} style={{ ...btn("yes"), width: "100%" }}>{voteSaving ? "Salvataggio..." : "👍 Sì"}</button>
                    <button onClick={() => handleVote("love")} disabled={voteSaving} style={{ ...btn("love"), width: "100%", background: "#fff", color: C.primary, border: "none" }}>{voteSaving ? "Salvataggio..." : "💜 Adoro"}</button>
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: "center", padding: 30, borderRadius: 24, background: C.slateSoft, border: `1px solid ${C.border}` }}>
                  <h2 style={{ marginBottom: 8 }}>Hai finito il deck 🎉</h2>
                  <p style={{ color: C.muted, marginTop: 0 }}>Usa i suggerimenti smart o esplora nomi simili.</p>
                </div>
              )}
            </div>

            <div className="match-panel hover-lift" style={card({ background: matchedNames.length ? "linear-gradient(180deg, #f0fdf4 0%, #ffffff 100%)" : "#ffffff" })}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                <h2 style={{ margin: 0 }}>Match di coppia</h2>
                {partner ? <div style={badge(C.primarySoft, C.primary)}>Partner: {partner.name}</div> : null}
              </div>

              {matchLoading ? (
                <p style={{ color: C.muted, marginTop: 12 }}>Caricamento match...</p>
              ) : !partner ? (
                <div style={{ marginTop: 12 }}>
                  <p style={{ marginBottom: 8 }}><strong>Nessun partner collegato ancora.</strong></p>
                  <p style={{ color: C.muted, marginTop: 0 }}>Condividi il tuo codice coppia: <strong>{profile.couple_code}</strong></p>
                </div>
              ) : matchedNames.length === 0 ? (
                <p style={{ color: C.muted, marginTop: 12 }}>Per ora nessun match positivo.</p>
              ) : (
                <>
                  <div style={{ marginTop: 12, marginBottom: 14, padding: 16, borderRadius: 18, background: "rgba(34,197,94,0.08)", border: "1px solid #bbf7d0" }}>
                    <p style={{ margin: 0, color: C.muted, fontSize: 14 }}>Compatibilità percepita</p>
                    <h3 style={{ marginTop: 8, marginBottom: 0, fontSize: 34 }}>{Math.min(100, 50 + matchedNames.length * 10)}%</h3>
                  </div>
                  <div className="chip-wrap">
                    {matchedNames.slice(0, 18).map((n) => <span key={n} style={badge(C.greenSoft, C.green)}>🤝 {n}</span>)}
                  </div>
                </>
              )}
            </div>

            <div className="catalog-panel hover-lift" style={card()}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                <h2 style={{ margin: 0 }}>Catalogo smart (gratis)</h2>
                <div style={badge(C.primarySoft, C.primary)}>{smartSuggestions.length} suggerimenti</div>
              </div>
              <p style={{ color: C.muted, marginTop: 10 }}>Filtra il catalogo e scopri nomi coerenti con i tuoi gusti.</p>

              <label style={{ display: "block", marginBottom: 6, color: C.muted, fontSize: 14 }}>Stile</label>
              <select value={exploreStyle} onChange={(e) => setExploreStyle(e.target.value)} style={{ ...input, marginBottom: 12 }}>
                <option value="all">Tutti gli stili</option>
                {allStyles.map((style) => <option key={style} value={style}>{style}</option>)}
              </select>

              <label style={{ display: "block", marginBottom: 6, color: C.muted, fontSize: 14 }}>Origine</label>
              <select value={exploreOrigin} onChange={(e) => setExploreOrigin(e.target.value)} style={{ ...input, marginBottom: 12 }}>
                <option value="all">Tutte le origini</option>
                {allOrigins.map((origin) => <option key={origin} value={origin}>{origin}</option>)}
              </select>

              <label style={{ display: "block", marginBottom: 6, color: C.muted, fontSize: 14 }}>Vibe</label>
              <select value={exploreVibe} onChange={(e) => setExploreVibe(e.target.value)} style={{ ...input, marginBottom: 12 }}>
                <option value="all">Tutti i vibe</option>
                {allVibes.map((vibe) => <option key={vibe} value={vibe}>{vibe}</option>)}
              </select>

              <label style={{ display: "block", marginBottom: 6, color: C.muted, fontSize: 14 }}>Iniziale opzionale</label>
              <input type="text" maxLength={1} placeholder="Es. A" value={exploreInitial} onChange={(e) => setExploreInitial(e.target.value.toUpperCase())} style={{ ...input, marginBottom: 12 }} />

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button onClick={pushSuggestionsToDeck} style={btn("primary")}>Aggiorna suggerimenti</button>
                {priorityNames.length > 0 ? <button onClick={clearPriorityQueue} style={btn("secondary")}>Svuota priorità</button> : null}
              </div>
            </div>

            <div className="secondary-left stack-grid">
              <div className="secondary-grid">
                <div className="hover-lift" style={card()}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}><h3 style={{ marginTop: 0, marginBottom: 0 }}>Suggeriti per te</h3><div style={badge(C.greenSoft, C.green)}>{smartSuggestions.length}</div></div>
                  {smartSuggestions.length === 0 ? <p style={{ color: C.muted }}>Inizia a votare per ricevere suggerimenti personalizzati.</p> : <div style={{ display: "grid", gap: 10, marginTop: 12 }}>{smartSuggestions.slice(0, 5).map((item) => <div key={item.name} style={{ padding: 12, borderRadius: 16, background: C.slateSoft, border: `1px solid ${C.border}` }}><div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}><strong>{item.name}</strong><span style={badge(C.primarySoft, C.primary)}>{item.vibe}</span></div><div style={{ fontSize: 13, color: C.muted, marginTop: 6 }}>{item.meaning}</div></div>)}</div>}
                </div>

                <div className="hover-lift" style={card()}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}><h3 style={{ marginTop: 0, marginBottom: 0 }}>Nomi simili a questo</h3><div style={badge(C.blueSoft, C.blue)}>{similarToCurrent.length}</div></div>
                  {!currentMeta ? <p style={{ color: C.muted }}>Seleziona o raggiungi un nome nel deck.</p> : similarToCurrent.length === 0 ? <p style={{ color: C.muted }}>Nessun nome simile disponibile.</p> : <div className="chip-wrap" style={{ marginTop: 12 }}>{similarToCurrent.map((item) => <span key={item.name} style={badge(C.primarySoft, C.primary)}>{item.name}</span>)}</div>}
                </div>
              </div>
            </div>

            <div className="secondary-right secondary-grid">
              <div className="hover-lift" style={card()}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}><h3 style={{ marginTop: 0, marginBottom: 0 }}>Preferiti</h3><div style={badge(C.greenSoft, C.green)}>{favoriteNames.length}</div></div>
                {favoriteNames.length === 0 ? <p style={{ color: C.muted }}>Ancora nessun preferito.</p> : <div className="chip-wrap" style={{ marginTop: 12 }}>{favoriteNames.slice(0, 18).map((name) => <span key={name} style={badge(votes[name] === "love" ? C.primarySoft : C.greenSoft, votes[name] === "love" ? C.primary : C.green)}>{name}</span>)}</div>}
              </div>

              <div className="hover-lift" style={card()}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}><h3 style={{ marginTop: 0, marginBottom: 0 }}>Ultimi voti</h3><div style={badge(C.blueSoft, C.blue)}>{recentVotes.length}</div></div>
                {recentVotes.length === 0 ? <p style={{ color: C.muted }}>I tuoi ultimi voti appariranno qui.</p> : <div style={{ display: "grid", gap: 10, marginTop: 12 }}>{recentVotes.map((item) => <div key={item.babyName} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 12, borderRadius: 16, background: C.slateSoft, border: `1px solid ${C.border}` }}><span style={{ fontWeight: 600 }}>{item.babyName}</span><span style={voteBadgeStyle(item.vote)}>{item.vote}</span></div>)}</div>}
              </div>
            </div>

            <div className="actions-panel hover-lift" style={card()}>
              <h2 style={{ marginTop: 0 }}>Azioni rapide</h2>
              <div style={{ display: "grid", gap: 10 }}>
                <button onClick={resetMyVotes} disabled={voteSaving} style={btn("warning")}>Azzera i miei voti</button>
                <button onClick={() => { setDeckFilter("all"); setMessage("Filtro deck resettato"); }} style={btn("secondary")}>Reset filtri deck</button>
                {priorityNames.length > 0 ? <button onClick={clearPriorityQueue} style={btn("secondary")}>Svuota priorità</button> : null}
              </div>
              <p style={{ color: C.muted, fontSize: 13, marginTop: 12, marginBottom: 0 }}>Il reset cancella solo i tuoi voti, non quelli del partner.</p>
            </div>
          </div>

          {message ? <div className="message-bar" style={{ ...card({ marginTop: 20, padding: 14 }) }}><span style={{ color: C.muted }}>{message}</span></div> : null}
        </div>
      )}
    </div>
  );
}
