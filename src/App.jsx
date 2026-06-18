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
  darkOverlay: "rgba(15, 23, 42, 0.55)",
};

const NAME_ENRICHMENTS = {
  Letizia: {
    origin: "Italiano, dal latino Laetitia",
    meaning:
      'Nome affettivo e augurale, che continua il latino "Laetitia", letteralmente "gioia", "felicità", "allegria".',
    longOrigin:
      'Forma italiana di Letitia/Laetitia. Mantiene una tradizione classica latina e comunica un’idea di serenità gioiosa, luminosa e piena di buon auspicio.',
  },
  Sofia: {
    origin: "Greco, da Sophia",
    meaning:
      'Dal greco "sophia": "sapienza", "saggezza". È un nome classico che unisce profondità intellettuale ed eleganza.',
    longOrigin:
      'Nome di origine greca diffusissimo in Europa. La sua forza sta nella semplicità del suono e in un significato molto nobile, legato alla sapienza.',
  },
  Aurora: {
    origin: "Latino",
    meaning:
      'Dal latino "aurora": "alba", "dawn". Evoca luce, rinascita, inizio e delicatezza luminosa.',
    longOrigin:
      'Nella cultura romana Aurora è la dea del mattino. Come nome richiama il momento in cui la luce torna e tutto ricomincia.',
  },
  Vittoria: {
    origin: "Italiano, dal latino Victoria",
    meaning:
      'Dal latino "victoria": "vittoria", "trionfo". È un nome deciso, classico e molto forte.',
    longOrigin:
      'Forma italiana di Victoria. Porta con sé un’idea di forza composta, successo e dignità, con un suono molto italiano e autorevole.',
  },
  Beatrice: {
    origin: "Italiano, dal latino Beatrix / Viatrix",
    meaning:
      'Tradizionalmente collegato a Beatrix, con il senso di "beata", "felice"; in origine probabilmente da Viatrix, "viaggiatrice".',
    longOrigin:
      'Nome classico di radice latina, reso celebre anche dalla tradizione letteraria italiana. Unisce grazia, spiritualità e una sfumatura di felicità beneaugurante.',
  },
  Ginevra: {
    origin: "Italiano, forma di Guinevere",
    meaning:
      'Forma italiana di Guinevere, il nome della regina Ginevra del ciclo arturiano; tradizionalmente ricondotto al gallese Gwenhwyfar, con interpretazioni come "bianca", "chiara" o "phantom/fair one".',
    longOrigin:
      'Nome dal fascino letterario e rinascimentale, molto elegante in italiano. Oggi è percepito come raffinato, aristocratico e distintivo.',
  },
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

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
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
    boxShadow: "0 10px 30px rgba(71,56,135,0.06)",
    ...extra,
  };
}

const inputStyle = {
  padding: 14,
  width: "100%",
  boxSizing: "border-box",
  borderRadius: 14,
  border: `1px solid ${COLORS.border}`,
  background: "#fff",
  color: COLORS.text,
  outline: "none",
};

const BUTTON_STYLES = {
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

function buttonStyle(kind = "primary") {
  return {
    padding: "12px 16px",
    borderRadius: 14,
    fontWeight: 700,
    cursor: "pointer",
    transition: "all 0.2s ease",
    ...BUTTON_STYLES[kind],
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

function scoreCandidateDetailed(candidate, likedMeta, dislikedMeta) {
  const reasons = [];
  let score = 0;

  const styleHits = {};
  const tagHits = {};
  const originHits = {};
  const vibeHits = {};

  likedMeta.forEach((meta) => {
    const weight = meta.weight || 1;
    meta.styles.forEach((style) => {
      if (candidate.styles.includes(style)) {
        score += weight * 3;
        styleHits[style] = (styleHits[style] || 0) + weight;
      }
    });
    meta.tags.forEach((tag) => {
      if (candidate.tags.includes(tag)) {
        score += weight * 2;
        tagHits[tag] = (tagHits[tag] || 0) + weight;
      }
    });
    if (candidate.origin === meta.origin) {
      score += weight * 2;
      originHits[candidate.origin] = (originHits[candidate.origin] || 0) + weight;
    }
    if (candidate.length === meta.length) score += weight;
    if (candidate.initial === meta.initial) score += 0.8;
    if (candidate.vibe === meta.vibe) {
      score += weight * 2;
      vibeHits[candidate.vibe] = (vibeHits[candidate.vibe] || 0) + weight;
    }
  });

  dislikedMeta.forEach((meta) => {
    let penalty = 0;
    meta.styles.forEach((style) => {
      if (candidate.styles.includes(style)) penalty += meta.penaltyWeight * 1.2;
    });
    meta.tags.forEach((tag) => {
      if (candidate.tags.includes(tag)) penalty += meta.penaltyWeight * 1.1;
    });
    if (candidate.origin === meta.origin) penalty += meta.penaltyWeight * 0.8;
    if (candidate.vibe === meta.vibe) penalty += meta.penaltyWeight * 0.9;
    if (candidate.initial === meta.initial) penalty += 0.4;
    score -= penalty;
  });

  if (candidate.popularity === "alta") score += 0.25;
  if (candidate.international) score += 0.25;

  const topStyle = Object.entries(styleHits).sort((a, b) => b[1] - a[1])[0]?.[0];
  const topTag = Object.entries(tagHits).sort((a, b) => b[1] - a[1])[0]?.[0];
  const topOrigin = Object.entries(originHits).sort((a, b) => b[1] - a[1])[0]?.[0];
  const topVibe = Object.entries(vibeHits).sort((a, b) => b[1] - a[1])[0]?.[0];

  if (topStyle) reasons.push(`stile ${topStyle}`);
  if (topVibe && !reasons.includes(`vibe ${topVibe}`)) reasons.push(`vibe ${topVibe}`);
  if (topOrigin) reasons.push(`origine ${topOrigin}`);
  if (topTag) reasons.push(`tag ${topTag}`);

  const uniqueReasons = [...new Set(reasons)].slice(0, 3);

  return {
    score,
    why: uniqueReasons.length
      ? `Consigliato per ${uniqueReasons.join(", ")}.`
      : "Suggerito in base ai tuoi voti positivi.",
  };
}

function similarityScoreDetailed(a, b) {
  let score = 0;
  const reasons = [];

  a.styles.forEach((style) => {
    if (b.styles.includes(style)) {
      score += 3;
      reasons.push(`stile ${style}`);
    }
  });
  a.tags.forEach((tag) => {
    if (b.tags.includes(tag)) {
      score += 2;
      reasons.push(`tag ${tag}`);
    }
  });
  if (a.origin === b.origin) {
    score += 2;
    reasons.push(`origine ${a.origin}`);
  }
  if (a.length === b.length) {
    score += 1;
    reasons.push(`lunghezza ${a.length}`);
  }
  if (a.vibe === b.vibe) {
    score += 2;
    reasons.push(`vibe ${a.vibe}`);
  }

  return {
    score,
    why: reasons.length ? `Simile per ${[...new Set(reasons)].slice(0, 3).join(", ")}.` : "Nome affine per stile generale.",
  };
}

function getMatchTier(myVote, partnerVote) {
  if (myVote === "love" && partnerVote === "love") return { tier: "Perfect match", weight: 3, color: COLORS.primary, bg: COLORS.primarySoft };
  if ((myVote === "love" && partnerVote === "yes") || (myVote === "yes" && partnerVote === "love")) {
    return { tier: "Strong match", weight: 2, color: COLORS.blue, bg: COLORS.blueSoft };
  }
  return { tier: "Good match", weight: 1, color: COLORS.green, bg: COLORS.greenSoft };
}

function getMatchReason(meta) {
  const parts = [];
  if (meta?.vibe) parts.push(`vibe ${meta.vibe}`);
  if (meta?.origin) parts.push(`origine ${meta.origin}`);
  if (meta?.styles?.length) parts.push(`stile ${meta.styles[0]}`);
  return parts.length ? `Vi unisce ${parts.slice(0, 2).join(" e ")}.` : "Vi piace per energia generale e sonorità.";
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

  const [selectedName, setSelectedName] = useState(null);
  const [selectedContext, setSelectedContext] = useState("");

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
    } catch (e) {
      console.error(e);
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

  const mergedDatabase = useMemo(() => {
    return NAMES_DATABASE.map((item) => {
      const override = NAME_ENRICHMENTS[item.name];
      if (!override) return item;
      return {
        ...item,
        origin: override.origin || item.origin,
        meaning: override.meaning || item.meaning,
        longOrigin: override.longOrigin || item.origin,
      };
    });
  }, []);

  const randomNamePool = useMemo(() => shuffleArray(mergedDatabase.map((item) => item.name)), [mergedDatabase]);

  const randomRank = useMemo(() => {
    const rank = {};
    randomNamePool.forEach((nameValue, index) => {
      rank[nameValue] = index;
    });
    return rank;
  }, [randomNamePool]);

  const namesMap = useMemo(() => Object.fromEntries(mergedDatabase.map((n) => [n.name, n])), [mergedDatabase]);

  const allStyles = useMemo(() => [...new Set(mergedDatabase.flatMap((n) => n.styles))].sort(), [mergedDatabase]);
  const allOrigins = useMemo(() => [...new Set(mergedDatabase.map((n) => n.origin))].sort(), [mergedDatabase]);
  const allVibes = useMemo(() => [...new Set(mergedDatabase.map((n) => n.vibe))].sort(), [mergedDatabase]);

  const favoriteNames = useMemo(() => randomNamePool.filter((n) => votes[n] === "yes" || votes[n] === "love"), [votes, randomNamePool]);
  const matchedNames = useMemo(() => randomNamePool.filter((n) => isPositiveVote(votes[n]) && isPositiveVote(partnerVotes[n])), [votes, partnerVotes, randomNamePool]);

  const filteredNamePool = useMemo(() => {
    const basePool =
      deckFilter === "favorites"
        ? favoriteNames
        : deckFilter === "matches"
        ? matchedNames
        : randomNamePool;

    if (deckFilter === "all" && priorityNames.length > 0) {
      const priorityUnvoted = priorityNames.filter((n) => basePool.includes(n) && !votes[n]);
      const rest = basePool.filter((n) => !priorityUnvoted.includes(n));
      return [...priorityUnvoted, ...rest];
    }

    return basePool;
  }, [deckFilter, favoriteNames, matchedNames, randomNamePool, priorityNames, votes]);

  const currentIndex = useMemo(() => filteredNamePool.findIndex((n) => !votes[n]), [votes, filteredNamePool]);
  const currentName = currentIndex >= 0 ? filteredNamePool[currentIndex] : null;
  const currentMeta = currentName ? namesMap[currentName] : null;

  const votedCount = Object.keys(votes).length;
  const totalCount = randomNamePool.length;
  const progress = totalCount ? Math.round((votedCount / totalCount) * 100) : 0;

  const summary = useMemo(() => {
    const v = Object.values(votes);
    return {
      no: v.filter((x) => x === "no").length,
      yes: v.filter((x) => x === "yes").length,
      love: v.filter((x) => x === "love").length,
    };
  }, [votes]);

  const recentVotes = useMemo(() => Object.entries(votes).map(([babyName, vote]) => ({ babyName, vote })).reverse().slice(0, 8), [votes]);

  const likedMeta = useMemo(() => {
    return randomNamePool
      .filter((n) => votes[n] === "yes" || votes[n] === "love")
      .map((n) => ({ ...namesMap[n], weight: votes[n] === "love" ? 2.2 : 1 }));
  }, [votes, randomNamePool, namesMap]);

  const dislikedMeta = useMemo(() => {
    return randomNamePool
      .filter((n) => votes[n] === "no")
      .map((n) => ({ ...namesMap[n], penaltyWeight: 1 }));
  }, [votes, randomNamePool, namesMap]);

  const smartSuggestions = useMemo(() => {
    const initial = exploreInitial.trim().toUpperCase();
    let candidates = mergedDatabase.filter((item) => !votes[item.name]);

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
      .map((item) => {
        const detailed = scoreCandidateDetailed(item, likedMeta, dislikedMeta);
        return { ...item, score: detailed.score, why: detailed.why };
      })
      .sort((a, b) => b.score - a.score || randomRank[a.name] - randomRank[b.name])
      .slice(0, 10);
  }, [votes, exploreStyle, exploreOrigin, exploreVibe, exploreInitial, likedMeta, dislikedMeta, mergedDatabase, randomRank]);

  const similarToCurrent = useMemo(() => {
    if (!currentMeta) return [];
    return mergedDatabase
      .filter((item) => item.name !== currentMeta.name && !votes[item.name])
      .map((item) => {
        const detailed = similarityScoreDetailed(currentMeta, item);
        return { ...item, score: detailed.score, why: detailed.why };
      })
      .sort((a, b) => b.score - a.score || randomRank[a.name] - randomRank[b.name])
      .slice(0, 6);
  }, [currentMeta, votes, mergedDatabase, randomRank]);

  const intelligentMatches = useMemo(() => {
    return matchedNames
      .map((nameValue) => {
        const myVote = votes[nameValue];
        const partnerVote = partnerVotes[nameValue];
        const tier = getMatchTier(myVote, partnerVote);
        const meta = namesMap[nameValue];
        return {
          name: nameValue,
          myVote,
          partnerVote,
          meta,
          ...tier,
          why: getMatchReason(meta),
        };
      })
      .sort((a, b) => b.weight - a.weight || randomRank[a.name] - randomRank[b.name]);
  }, [matchedNames, votes, partnerVotes, namesMap, randomRank]);

  const detailEntry = selectedName ? namesMap[selectedName] : null;
  const detailSimilar = useMemo(() => {
    if (!detailEntry) return [];
    return mergedDatabase
      .filter((item) => item.name !== detailEntry.name)
      .map((item) => {
        const detailed = similarityScoreDetailed(detailEntry, item);
        return { ...item, score: detailed.score, why: detailed.why };
      })
      .sort((a, b) => b.score - a.score || randomRank[a.name] - randomRank[b.name])
      .slice(0, 5);
  }, [detailEntry, mergedDatabase, randomRank]);

  function openNameDetail(nameValue, context = "") {
    setSelectedName(nameValue);
    setSelectedContext(context);
  }

  function closeNameDetail() {
    setSelectedName(null);
    setSelectedContext("");
  }

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
      const mapped = {};
      (data || []).forEach((row) => {
        mapped[row.baby_name] = row.vote;
      });
      setVotes(mapped);
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
      const mapped = {};
      (votesRows || []).forEach((row) => {
        mapped[row.baby_name] = row.vote;
      });
      setPartnerVotes(mapped);
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
      const { error } = await supabase.from("votes").delete().eq("profile_id", profile.id);
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
      <style>{`*{box-sizing:border-box}.app-shell{max-width:1200px;margin:0 auto}.stats-grid{display:grid;gap:14px;grid-template-columns:repeat(auto-fit,minmax(220px,1fr))}.content-grid{display:grid;gap:20px;grid-template-columns:minmax(320px,1.3fr) minmax(300px,1fr);align-items:start}.secondary-grid{display:grid;gap:20px;grid-template-columns:repeat(auto-fit,minmax(280px,1fr))}.stack-grid{display:grid;gap:20px}.auth-grid{display:grid;gap:18px;grid-template-columns:repeat(auto-fit,minmax(320px,1fr))}.deck-actions{display:grid;gap:12px;grid-template-columns:repeat(3,minmax(0,1fr))}.chip-wrap{display:flex;gap:8px;flex-wrap:wrap}.hover-lift{transition:transform .2s ease,box-shadow .2s ease}.hover-lift:hover{transform:translateY(-2px);box-shadow:0 14px 34px rgba(71,56,135,.10)}.message-bar{position:sticky;bottom:14px;z-index:20}.deck-panel{grid-column:1}.match-panel{grid-column:2}.catalog-panel{grid-column:2}.secondary-left{grid-column:1}.secondary-right{grid-column:1 / span 2}.actions-panel{grid-column:2}.name-link{cursor:pointer}.name-link:hover{opacity:.85}.modal-backdrop{position:fixed;inset:0;background:${COLORS.darkOverlay};display:flex;align-items:center;justify-content:center;padding:20px;z-index:50}.modal-card{max-width:760px;width:100%;max-height:90vh;overflow:auto}@media (max-width:980px){.content-grid{grid-template-columns:1fr}.deck-panel,.match-panel,.catalog-panel,.secondary-left,.secondary-right,.actions-panel{grid-column:auto}}@media (max-width:640px){.deck-actions{grid-template-columns:1fr}}`}</style>

      {selectedName && detailEntry ? (
        <div className="modal-backdrop" onClick={closeNameDetail}>
          <div className="modal-card" style={cardStyle()} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start", marginBottom: 12 }}>
              <div>
                <div style={badgeStyle(COLORS.primarySoft, COLORS.primary)}>Scheda nome</div>
                <h2 style={{ marginBottom: 8 }}>{detailEntry.name}</h2>
                <div className="chip-wrap">
                  <span style={badgeStyle(COLORS.blueSoft, COLORS.blue)}>{detailEntry.origin}</span>
                  <span style={badgeStyle(COLORS.primarySoft, COLORS.primary)}>{detailEntry.vibe}</span>
                  <span style={badgeStyle(COLORS.greenSoft, COLORS.green)}>{detailEntry.length}</span>
                </div>
              </div>
              <button onClick={closeNameDetail} style={buttonStyle("secondary")}>Chiudi</button>
            </div>

            {selectedContext ? (
              <div style={{ ...cardStyle({ padding: 12, marginBottom: 14, background: COLORS.slateSoft }) }}>
                <strong>Perché lo vedi qui:</strong>
                <div style={{ color: COLORS.muted, marginTop: 6 }}>{selectedContext}</div>
              </div>
            ) : null}

            <div className="secondary-grid">
              <div style={cardStyle({ background: COLORS.slateSoft })}>
                <h3 style={{ marginTop: 0 }}>Significato</h3>
                <p style={{ marginBottom: 0, lineHeight: 1.6 }}>{detailEntry.meaning}</p>
              </div>
              <div style={cardStyle({ background: COLORS.slateSoft })}>
                <h3 style={{ marginTop: 0 }}>Origine</h3>
                <p style={{ marginBottom: 0, lineHeight: 1.6 }}>{detailEntry.longOrigin || detailEntry.origin}</p>
              </div>
            </div>

            <div className="secondary-grid" style={{ marginTop: 16 }}>
              <div style={cardStyle({ background: COLORS.slateSoft })}>
                <h3 style={{ marginTop: 0 }}>Stile e tag</h3>
                <div className="chip-wrap">
                  {detailEntry.styles.map((style) => <span key={style} style={badgeStyle(COLORS.primarySoft, COLORS.primary)}>{style}</span>)}
                  {detailEntry.tags.map((tag) => <span key={tag} style={badgeStyle(COLORS.greenSoft, COLORS.green)}>{tag}</span>)}
                </div>
              </div>
              <div style={cardStyle({ background: COLORS.slateSoft })}>
                <h3 style={{ marginTop: 0 }}>Nomi simili</h3>
                <div style={{ display: "grid", gap: 8 }}>
                  {detailSimilar.map((item) => (
                    <button key={item.name} onClick={() => openNameDetail(item.name, item.why)} style={{ ...cardStyle({ padding: 12, cursor: "pointer", background: "#fff" }), textAlign: "left" }}>
                      <strong>{item.name}</strong>
                      <div style={{ color: COLORS.muted, fontSize: 13, marginTop: 4 }}>{item.why}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {checkingSession ? (
        <div className="app-shell"><h1>Il Nome Perfetto</h1><p style={{ color: COLORS.muted }}>Caricamento profilo...</p></div>
      ) : !profile ? (
        <div className="app-shell" style={{ maxWidth: 780 }}>
          <div className="hover-lift" style={cardStyle({ padding: 28, marginBottom: 20, background: `linear-gradient(135deg, ${COLORS.primarySoft} 0%, #ffffff 100%)` })}>
            <div style={badgeStyle(COLORS.primarySoft, COLORS.primary)}>✨ v11 Smart Match + Detail</div>
            <h1 style={{ fontSize: 38, marginBottom: 10 }}>Il Nome Perfetto</h1>
            <p style={{ color: COLORS.muted, fontSize: 16, lineHeight: 1.6, marginBottom: 0 }}>Motore suggerimenti più intelligente, scheda nome dettagliata e match di coppia più ricchi.</p>
          </div>
          <div className="auth-grid">
            <div className="hover-lift" style={cardStyle()}>
              <h2 style={{ marginTop: 0 }}>Crea nuova coppia</h2>
              <input type="text" placeholder="Il tuo nome" value={name} onChange={(e) => setName(e.target.value)} style={{ ...inputStyle, marginBottom: 12 }} />
              <button onClick={createNewCouple} disabled={loading} style={buttonStyle("primary")}>{loading ? "Attendi..." : "Crea nuova coppia"}</button>
            </div>
            <div className="hover-lift" style={cardStyle()}>
              <h2 style={{ marginTop: 0 }}>Unisciti a una coppia</h2>
              <input type="text" placeholder="Il tuo nome" value={name} onChange={(e) => setName(e.target.value)} style={{ ...inputStyle, marginBottom: 12 }} />
              <input type="text" placeholder="Codice coppia esistente" value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())} style={{ ...inputStyle, marginBottom: 12 }} />
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
                <div style={{ ...badgeStyle(COLORS.primarySoft, COLORS.primary), marginBottom: 12 }}>📚 Smart catalog attivo</div>
                <h1 style={{ margin: 0, fontSize: 34 }}>Il Nome Perfetto</h1>
                <p style={{ color: COLORS.muted, marginBottom: 0 }}>Ciao <strong>{profile.name}</strong> — codice coppia <strong>{profile.couple_code}</strong> — catalogo: <strong>{mergedDatabase.length} nomi</strong></p>
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button onClick={refreshMatches} style={buttonStyle("secondary")}>Aggiorna match</button>
                <button onClick={logoutProfile} style={buttonStyle("secondary")}>Esci</button>
              </div>
            </div>
            <div style={{ marginTop: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, color: COLORS.muted, marginBottom: 8 }}><span>Progresso voti</span><span>{votedCount} / {totalCount} · {progress}%</span></div>
              <div style={{ height: 12, borderRadius: 999, background: "#ede9fe", overflow: "hidden" }}><div style={{ width: `${progress}%`, height: "100%", background: `linear-gradient(90deg, ${COLORS.primary} 0%, ${COLORS.primary2} 100%)` }} /></div>
            </div>
          </div>

          <div className="stats-grid">
            <div className="hover-lift" style={cardStyle({ background: COLORS.redSoft, border: "1px solid #fecaca" })}><div style={badgeStyle(COLORS.redSoft, COLORS.red)}>👎 No</div><h3 style={{ marginBottom: 0, fontSize: 28 }}>{summary.no}</h3><p style={{ marginBottom: 0, color: COLORS.muted, fontSize: 13 }}>Passati oltre</p></div>
            <div className="hover-lift" style={cardStyle({ background: COLORS.greenSoft, border: "1px solid #bbf7d0" })}><div style={badgeStyle(COLORS.greenSoft, COLORS.green)}>👍 Sì</div><h3 style={{ marginBottom: 0, fontSize: 28 }}>{summary.yes}</h3><p style={{ marginBottom: 0, color: COLORS.muted, fontSize: 13 }}>Ti piacciono</p></div>
            <div className="hover-lift" style={cardStyle({ background: COLORS.primarySoft, border: "1px solid #e9d5ff" })}><div style={badgeStyle(COLORS.primarySoft, COLORS.primary)}>💜 Adoro</div><h3 style={{ marginBottom: 0, fontSize: 28 }}>{summary.love}</h3><p style={{ marginBottom: 0, color: COLORS.muted, fontSize: 13 }}>Top assoluti</p></div>
            <div className="hover-lift" style={cardStyle({ background: COLORS.blueSoft, border: "1px solid #bfdbfe" })}><div style={badgeStyle(COLORS.blueSoft, COLORS.blue)}>🤝 Match</div><h3 style={{ marginBottom: 0, fontSize: 28 }}>{matchedNames.length}</h3><p style={{ marginBottom: 0, color: COLORS.muted, fontSize: 13 }}>In comune col partner</p></div>
          </div>

          <div className="content-grid" style={{ marginTop: 20 }}>
            <div className="deck-panel hover-lift" style={cardStyle({ padding: 22, background: "linear-gradient(180deg, #ffffff 0%, #fcfcff 100%)" })}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 14 }}>
                <div>
                  <h2 style={{ margin: 0 }}>Deck con significato</h2>
                  <p style={{ margin: "6px 0 0 0", color: COLORS.muted, fontSize: 14 }}>Con significato, origine migliorata e accesso rapido alla scheda nome.</p>
                </div>
                <div className="chip-wrap">
                  <button onClick={() => setDeckFilter("all")} style={buttonStyle(deckFilter === "all" ? "activePill" : "secondary")}>Tutti</button>
                  <button onClick={() => setDeckFilter("favorites")} style={buttonStyle(deckFilter === "favorites" ? "activePill" : "secondary")}>Solo preferiti</button>
                  <button onClick={() => setDeckFilter("matches")} style={buttonStyle(deckFilter === "matches" ? "activePill" : "secondary")}>Solo match</button>
                  {priorityNames.length > 0 ? <button onClick={clearPriorityQueue} style={buttonStyle("secondary")}>Svuota priorità</button> : null}
                </div>
              </div>
              {votesLoading ? <p style={{ color: COLORS.muted }}>Caricamento voti...</p> : currentName && currentMeta ? (
                <div style={{ position: "relative", borderRadius: 30, padding: 24, background: `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.primary2} 56%, ${COLORS.primary3} 100%)`, color: "white", minHeight: 420, display: "flex", flexDirection: "column", justifyContent: "space-between", boxShadow: "0 24px 50px rgba(124,58,237,0.24)", overflow: "hidden" }}>
                  <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at top right, rgba(255,255,255,0.30), transparent 35%)" }} />
                  <div style={{ position: "absolute", right: -40, bottom: -56, width: 180, height: 180, borderRadius: "50%", background: "rgba(255,255,255,0.14)" }} />
                  <div style={{ position: "relative", display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                    <div style={badgeStyle("rgba(255,255,255,0.18)", "#fff")}>Nome {currentIndex + 1} di {filteredNamePool.length}</div>
                    <div className="chip-wrap">
                      {priorityNames.includes(currentName) ? <span style={badgeStyle("rgba(255,255,255,0.18)", "#fff")}>Suggerito per te</span> : null}
                      <span style={badgeStyle("rgba(255,255,255,0.18)", "#fff")}>{currentMeta.origin}</span>
                    </div>
                  </div>
                  <div style={{ position: "relative" }}>
                    <p style={{ opacity: 0.82, marginBottom: 8 }}>Meaning</p>
                    <h2 className="name-link" onClick={() => openNameDetail(currentName, priorityNames.includes(currentName) ? "Nome spinto dal motore smart in cima al deck." : "Nome visualizzato nel deck principale.")} style={{ fontSize: 48, marginTop: 0, marginBottom: 10 }}>{currentName}</h2>
                    <p style={{ opacity: 0.94, fontSize: 16, lineHeight: 1.6, marginBottom: 14 }}>{currentMeta.meaning}</p>
                    <div className="chip-wrap" style={{ marginBottom: 8 }}>{[...currentMeta.styles.slice(0, 3), currentMeta.vibe].map((label) => <span key={label} style={badgeStyle("rgba(255,255,255,0.18)", "#fff")}>{label}</span>)}</div>
                    <button onClick={() => openNameDetail(currentName, priorityNames.includes(currentName) ? "Nome attualmente prioritario nel deck." : "Scheda completa del nome selezionato.")} style={{ ...buttonStyle("secondary"), marginTop: 4 }}>Apri scheda nome</button>
                  </div>
                  <div className="deck-actions" style={{ position: "relative" }}>
                    <button onClick={() => handleVote("no")} disabled={voteSaving} style={{ ...buttonStyle("no"), width: "100%" }}>{voteSaving ? "Salvataggio..." : "👎 No"}</button>
                    <button onClick={() => handleVote("yes")} disabled={voteSaving} style={{ ...buttonStyle("yes"), width: "100%" }}>{voteSaving ? "Salvataggio..." : "👍 Sì"}</button>
                    <button onClick={() => handleVote("love")} disabled={voteSaving} style={{ ...buttonStyle("love"), width: "100%", background: "#fff", color: COLORS.primary, border: "none" }}>{voteSaving ? "Salvataggio..." : "💜 Adoro"}</button>
                  </div>
                </div>
              ) : <div style={{ textAlign: "center", padding: 30, borderRadius: 24, background: COLORS.slateSoft, border: `1px solid ${COLORS.border}` }}><h2 style={{ marginBottom: 8 }}>Hai finito il deck 🎉</h2><p style={{ color: COLORS.muted, marginTop: 0 }}>Usa i suggerimenti smart o esplora nomi simili.</p></div>}
            </div>

            <div className="match-panel hover-lift" style={cardStyle({ background: intelligentMatches.length ? "linear-gradient(180deg, #f0fdf4 0%, #ffffff 100%)" : "#ffffff" })}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}><h2 style={{ margin: 0 }}>Match di coppia</h2>{partner ? <div style={badgeStyle(COLORS.primarySoft, COLORS.primary)}>Partner: {partner.name}</div> : null}</div>
              {matchLoading ? <p style={{ color: COLORS.muted, marginTop: 12 }}>Caricamento match...</p> : !partner ? <div style={{ marginTop: 12 }}><p style={{ marginBottom: 8 }}><strong>Nessun partner collegato ancora.</strong></p><p style={{ color: COLORS.muted, marginTop: 0 }}>Condividi il tuo codice coppia: <strong>{profile.couple_code}</strong></p></div> : intelligentMatches.length === 0 ? <p style={{ color: COLORS.muted, marginTop: 12 }}>Per ora nessun match positivo.</p> : <><div style={{ marginTop: 12, marginBottom: 14, padding: 16, borderRadius: 18, background: "rgba(34,197,94,0.08)", border: "1px solid #bbf7d0" }}><p style={{ margin: 0, color: COLORS.muted, fontSize: 14 }}>Compatibilità percepita</p><h3 style={{ marginTop: 8, marginBottom: 0, fontSize: 34 }}>{clamp(48 + intelligentMatches.reduce((acc, item) => acc + item.weight * 9, 0), 0, 99)}%</h3></div><div style={{ display: "grid", gap: 10 }}>{intelligentMatches.slice(0, 6).map((item) => <button key={item.name} onClick={() => openNameDetail(item.name, `${item.tier}. ${item.why}`)} style={{ ...cardStyle({ padding: 12, cursor: "pointer", background: item.bg || COLORS.slateSoft, border: `1px solid ${COLORS.border}` }), textAlign: "left" }}><div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}><strong>{item.name}</strong><span style={badgeStyle(item.bg, item.color)}>{item.tier}</span></div><div style={{ color: COLORS.muted, fontSize: 13, marginTop: 6 }}>{item.why}</div><div className="chip-wrap" style={{ marginTop: 8 }}><span style={voteBadgeStyle(item.myVote)}>tu: {item.myVote}</span><span style={voteBadgeStyle(item.partnerVote)}>partner: {item.partnerVote}</span></div></button>)}</div></>}
            </div>

            <div className="catalog-panel hover-lift" style={cardStyle()}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}><h2 style={{ margin: 0 }}>Catalogo smart (gratis)</h2><div style={badgeStyle(COLORS.primarySoft, COLORS.primary)}>{smartSuggestions.length} suggerimenti</div></div>
              <p style={{ color: COLORS.muted, marginTop: 10 }}>Suggerimenti più intelligenti: pesano di più i love, penalizzano i no e spiegano il perché.</p>
              <label style={{ display: "block", marginBottom: 6, color: COLORS.muted, fontSize: 14 }}>Stile</label>
              <select value={exploreStyle} onChange={(e) => setExploreStyle(e.target.value)} style={{ ...inputStyle, marginBottom: 12 }}><option value="all">Tutti gli stili</option>{allStyles.map((style) => <option key={style} value={style}>{style}</option>)}</select>
              <label style={{ display: "block", marginBottom: 6, color: COLORS.muted, fontSize: 14 }}>Origine</label>
              <select value={exploreOrigin} onChange={(e) => setExploreOrigin(e.target.value)} style={{ ...inputStyle, marginBottom: 12 }}><option value="all">Tutte le origini</option>{allOrigins.map((origin) => <option key={origin} value={origin}>{origin}</option>)}</select>
              <label style={{ display: "block", marginBottom: 6, color: COLORS.muted, fontSize: 14 }}>Vibe</label>
              <select value={exploreVibe} onChange={(e) => setExploreVibe(e.target.value)} style={{ ...inputStyle, marginBottom: 12 }}><option value="all">Tutti i vibe</option>{allVibes.map((vibe) => <option key={vibe} value={vibe}>{vibe}</option>)}</select>
              <label style={{ display: "block", marginBottom: 6, color: COLORS.muted, fontSize: 14 }}>Iniziale opzionale</label>
              <input type="text" maxLength={1} placeholder="Es. A" value={exploreInitial} onChange={(e) => setExploreInitial(e.target.value.toUpperCase())} style={{ ...inputStyle, marginBottom: 12 }} />
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button onClick={pushSuggestionsToDeck} style={buttonStyle("primary")}>Aggiorna suggerimenti</button>
                {priorityNames.length > 0 ? <button onClick={clearPriorityQueue} style={buttonStyle("secondary")}>Svuota priorità</button> : null}
              </div>
            </div>

            <div className="secondary-left stack-grid">
              <div className="secondary-grid">
                <div className="hover-lift" style={cardStyle()}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}><h3 style={{ marginTop: 0, marginBottom: 0 }}>Suggeriti per te</h3><div style={badgeStyle(COLORS.greenSoft, COLORS.green)}>{smartSuggestions.length}</div></div>
                  {smartSuggestions.length === 0 ? <p style={{ color: COLORS.muted }}>Inizia a votare per ricevere suggerimenti personalizzati.</p> : <div style={{ display: "grid", gap: 10, marginTop: 12 }}>{smartSuggestions.slice(0, 5).map((item) => <button key={item.name} onClick={() => openNameDetail(item.name, item.why)} style={{ ...cardStyle({ padding: 12, cursor: "pointer", background: COLORS.slateSoft, border: `1px solid ${COLORS.border}` }), textAlign: "left" }}><div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}><strong>{item.name}</strong><span style={badgeStyle(COLORS.primarySoft, COLORS.primary)}>{item.vibe}</span></div><div style={{ fontSize: 13, color: COLORS.muted, marginTop: 6 }}>{item.why}</div></button>)}</div>}
                </div>
                <div className="hover-lift" style={cardStyle()}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}><h3 style={{ marginTop: 0, marginBottom: 0 }}>Nomi simili a questo</h3><div style={badgeStyle(COLORS.blueSoft, COLORS.blue)}>{similarToCurrent.length}</div></div>
                  {!currentMeta ? <p style={{ color: COLORS.muted }}>Seleziona o raggiungi un nome nel deck.</p> : <div style={{ display: "grid", gap: 10, marginTop: 12 }}>{similarToCurrent.map((item) => <button key={item.name} onClick={() => openNameDetail(item.name, item.why)} style={{ ...cardStyle({ padding: 12, cursor: "pointer", background: COLORS.slateSoft, border: `1px solid ${COLORS.border}` }), textAlign: "left" }}><div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}><strong>{item.name}</strong><span style={badgeStyle(COLORS.primarySoft, COLORS.primary)}>{item.vibe}</span></div><div style={{ fontSize: 13, color: COLORS.muted, marginTop: 6 }}>{item.why}</div></button>)}</div>}
                </div>
              </div>
            </div>

            <div className="secondary-right secondary-grid">
              <div className="hover-lift" style={cardStyle()}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}><h3 style={{ marginTop: 0, marginBottom: 0 }}>Preferiti</h3><div style={badgeStyle(COLORS.greenSoft, COLORS.green)}>{favoriteNames.length}</div></div>
                {favoriteNames.length === 0 ? <p style={{ color: COLORS.muted }}>Ancora nessun preferito.</p> : <div className="chip-wrap" style={{ marginTop: 12 }}>{favoriteNames.slice(0, 18).map((name) => <button key={name} onClick={() => openNameDetail(name, votes[name] === "love" ? "Questo nome è nei tuoi top assoluti." : "Questo nome è tra i tuoi preferiti.")} style={{ ...badgeStyle(votes[name] === "love" ? COLORS.primarySoft : COLORS.greenSoft, votes[name] === "love" ? COLORS.primary : COLORS.green), border: "none", cursor: "pointer" }}>{name}</button>)}</div>}
              </div>
              <div className="hover-lift" style={cardStyle()}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}><h3 style={{ marginTop: 0, marginBottom: 0 }}>Ultimi voti</h3><div style={badgeStyle(COLORS.blueSoft, COLORS.blue)}>{recentVotes.length}</div></div>
                {recentVotes.length === 0 ? <p style={{ color: COLORS.muted }}>I tuoi ultimi voti appariranno qui.</p> : <div style={{ display: "grid", gap: 10, marginTop: 12 }}>{recentVotes.map((item) => <button key={item.babyName} onClick={() => openNameDetail(item.babyName, `Ultimo voto registrato: ${item.vote}.`)} style={{ ...cardStyle({ padding: 12, cursor: "pointer", background: COLORS.slateSoft, border: `1px solid ${COLORS.border}` }), display: "flex", justifyContent: "space-between", alignItems: "center" }}><span style={{ fontWeight: 600 }}>{item.babyName}</span><span style={voteBadgeStyle(item.vote)}>{item.vote}</span></button>)}</div>}
              </div>
            </div>

            <div className="actions-panel hover-lift" style={cardStyle()}>
              <h2 style={{ marginTop: 0 }}>Azioni rapide</h2>
              <div style={{ display: "grid", gap: 10 }}>
                <button onClick={resetMyVotes} disabled={voteSaving} style={buttonStyle("warning")}>Azzera i miei voti</button>
                <button onClick={() => { setDeckFilter("all"); setMessage("Filtro deck resettato"); }} style={buttonStyle("secondary")}>Reset filtri deck</button>
                {priorityNames.length > 0 ? <button onClick={clearPriorityQueue} style={buttonStyle("secondary")}>Svuota priorità</button> : null}
              </div>
              <p style={{ color: COLORS.muted, fontSize: 13, marginTop: 12, marginBottom: 0 }}>Il reset cancella solo i tuoi voti, non quelli del partner.</p>
            </div>
          </div>

          {message ? <div className="message-bar" style={{ ...cardStyle({ marginTop: 20, padding: 14 }) }}><span style={{ color: COLORS.muted }}>{message}</span></div> : null}
        </div>
      )}
    </div>
  );
}
