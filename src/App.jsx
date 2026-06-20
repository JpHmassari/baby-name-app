import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "./lib/supabase";
import { NAMES_DATABASE } from "./data/namesDatabase";

const STORAGE_KEY = "baby_name_app_profile";
const REFRESH_MS = 12000;

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
  overlay: "rgba(15, 23, 42, 0.55)",
};

const SECTION_OPTIONS = [
  { value: "deck", label: "Home · Scelta nome" },
  { value: "matches", label: "Match di coppia" },
  { value: "catalog", label: "Catalogo smart" },
  { value: "suggestions", label: "Suggeriti per te" },
  { value: "similar", label: "Nomi simili" },
  { value: "favorites", label: "Preferiti" },
  { value: "recent", label: "Ultimi voti" },
  { value: "manual", label: "Aggiungi nome manuale" },
  { value: "actions", label: "Azioni rapide" },
];

const MANUAL_VIBES = [
  "classico",
  "moderno",
  "elegante",
  "raffinato",
  "dolce",
  "forte",
  "luminoso",
  "romantico",
  "internazionale",
  "minimal",
];

const ENRICHMENTS = {
  Letizia: {
    origin: "Italiano, dal latino Laetitia",
    meaning:
      'Nome affettivo e augurale, che continua il latino "Laetitia", letteralmente "gioia", "felicità", "allegria".',
    longOrigin:
      "Forma italiana di Laetitia/Letitia. Ha una tradizione classica latina e trasmette un senso di gioia luminosa e beneaugurante.",
  },
  Sofia: {
    origin: "Greco, da Sophia",
    meaning: 'Dal greco "sophia": "sapienza", "saggezza".',
    longOrigin:
      "Nome di origine greca molto diffuso in Europa. È apprezzato per il significato nobile e il suono semplice ma elegante.",
  },
  Aurora: {
    origin: "Latino",
    meaning: 'Dal latino "aurora": "alba".',
    longOrigin:
      "In ambito classico Aurora è la dea romana del mattino. Il nome richiama luce, rinascita e inizio.",
  },
  Vittoria: {
    origin: "Italiano, dal latino Victoria",
    meaning: 'Dal latino "victoria": "vittoria", "trionfo".',
    longOrigin:
      "Forma italiana di Victoria. Ha un profilo forte, classico e molto deciso, ma resta elegante e lineare nel suono.",
  },
  Beatrice: {
    origin: "Italiano, dal latino Beatrix / Viatrix",
    meaning:
      'Tradizionalmente associato a Beatrix nel senso di "beata", "felice"; in origine probabilmente collegato a Viatrix, "viaggiatrice".',
    longOrigin:
      "Nome classico di radice latina, reso famosissimo anche dalla tradizione letteraria italiana. Unisce grazia, luce e profondità.",
  },
  Ginevra: {
    origin: "Italiano, forma di Guinevere",
    meaning:
      'Forma italiana di Guinevere, nome della tradizione arturiana; tradizionalmente collegato a una radice celtica con interpretazioni legate a "bianca" o "chiara".',
    longOrigin:
      "Nome dal fascino letterario e aristocratico, oggi percepito come raffinato, distintivo e molto elegante in italiano.",
  },
};

function titleCase(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function normalizeKey(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function punctuate(value) {
  const text = normalizeText(value);
  if (!text) return "";
  return /[.!?]$/.test(text) ? text : `${text}.`;
}

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
    active: {
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

function buildEntryFromBase(item) {
  const override = ENRICHMENTS[item.name];
  if (override) {
    return {
      ...item,
      origin: override.origin,
      meaning: override.meaning,
      longOrigin: override.longOrigin,
      enrichmentTier: "curated",
    };
  }
  return {
    ...item,
    meaning: punctuate(item.meaning || "Nome del catalogo."),
    longOrigin: item.origin ? `Nome di area ${String(item.origin).toLowerCase()}.` : "Origine non specificata nel catalogo.",
    enrichmentTier: "base",
  };
}

function buildCustomEntry(row) {
  const name = titleCase(row.name);
  const vibe = row.vibe || "personalizzato";
  const lengthValue = name.length <= 5 ? "corto" : name.length <= 8 ? "medio" : "lungo";
  return {
    id: row.id,
    name,
    origin: row.origin || "Personalizzato",
    meaning: punctuate(row.meaning || "Nome aggiunto manualmente dalla coppia."),
    longOrigin: row.origin
      ? `Voce personalizzata salvata per la coppia. Origine indicata: ${row.origin}.`
      : "Voce personalizzata aggiunta manualmente dalla coppia.",
    vibe,
    styles: ["personalizzato", vibe],
    tags: ["aggiunto dalla coppia"],
    length: lengthValue,
    initial: name.charAt(0).toUpperCase(),
    popularity: "custom",
    international: false,
    enrichmentTier: "custom",
    isCustom: true,
  };
}

function scoreCandidate(candidate, likedMeta, dislikedMeta) {
  const reasons = [];
  let score = 0;
  const styleHits = {};
  const tagHits = {};
  const originHits = {};
  const vibeHits = {};

  likedMeta.forEach((meta) => {
    const weight = meta.weight || 1;
    (meta.styles || []).forEach((style) => {
      if ((candidate.styles || []).includes(style)) {
        score += weight * 3;
        styleHits[style] = (styleHits[style] || 0) + weight;
      }
    });
    (meta.tags || []).forEach((tag) => {
      if ((candidate.tags || []).includes(tag)) {
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
    (meta.styles || []).forEach((style) => {
      if ((candidate.styles || []).includes(style)) penalty += meta.penaltyWeight * 1.2;
    });
    (meta.tags || []).forEach((tag) => {
      if ((candidate.tags || []).includes(tag)) penalty += meta.penaltyWeight * 1.1;
    });
    if (candidate.origin === meta.origin) penalty += meta.penaltyWeight * 0.8;
    if (candidate.vibe === meta.vibe) penalty += meta.penaltyWeight * 0.9;
    if (candidate.initial === meta.initial) penalty += 0.4;
    score -= penalty;
  });

  const topStyle = Object.entries(styleHits).sort((a, b) => b[1] - a[1])[0]?.[0];
  const topTag = Object.entries(tagHits).sort((a, b) => b[1] - a[1])[0]?.[0];
  const topOrigin = Object.entries(originHits).sort((a, b) => b[1] - a[1])[0]?.[0];
  const topVibe = Object.entries(vibeHits).sort((a, b) => b[1] - a[1])[0]?.[0];

  if (topStyle) reasons.push(`stile ${topStyle}`);
  if (topVibe) reasons.push(`vibe ${topVibe}`);
  if (topOrigin) reasons.push(`origine ${topOrigin}`);
  if (topTag) reasons.push(`tag ${topTag}`);

  const why = reasons.length ? `Consigliato per ${[...new Set(reasons)].slice(0, 3).join(", ")}.` : "Suggerito in base ai tuoi voti positivi.";
  return { score, why };
}

function similarityScore(a, b) {
  let score = 0;
  const reasons = [];
  (a.styles || []).forEach((style) => {
    if ((b.styles || []).includes(style)) {
      score += 3;
      reasons.push(`stile ${style}`);
    }
  });
  (a.tags || []).forEach((tag) => {
    if ((b.tags || []).includes(tag)) {
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
  if (myVote === "love" && partnerVote === "love") return { tier: "Perfect match", weight: 3, bg: COLORS.primarySoft, color: COLORS.primary };
  if ((myVote === "love" && partnerVote === "yes") || (myVote === "yes" && partnerVote === "love")) {
    return { tier: "Strong match", weight: 2, bg: COLORS.blueSoft, color: COLORS.blue };
  }
  return { tier: "Good match", weight: 1, bg: COLORS.greenSoft, color: COLORS.green };
}

function getMatchReason(meta) {
  const bits = [];
  if (meta?.vibe) bits.push(`vibe ${meta.vibe}`);
  if (meta?.origin) bits.push(`origine ${meta.origin}`);
  if (meta?.styles?.[0]) bits.push(`stile ${meta.styles[0]}`);
  return bits.length ? `Vi unisce ${bits.slice(0, 2).join(" e ")}.` : "Piace a entrambi per sonorità ed energia generale.";
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

  const [customNames, setCustomNames] = useState([]);
  const [customNamesLoading, setCustomNamesLoading] = useState(false);
  const [manualName, setManualName] = useState("");
  const [manualMeaning, setManualMeaning] = useState("");
  const [manualOrigin, setManualOrigin] = useState("");
  const [manualVibe, setManualVibe] = useState("elegante");
  const [manualSaving, setManualSaving] = useState(false);

  const [currentSection, setCurrentSection] = useState("deck");
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
    } catch (error) {
      console.error(error);
    } finally {
      setCheckingSession(false);
    }
  }, []);

  useEffect(() => {
    if (!profile?.id || !profile?.couple_code) {
      setVotes({});
      setPartner(null);
      setPartnerVotes({});
      setCustomNames([]);
      setPriorityNames([]);
      return;
    }
    loadVotes(profile.id);
    loadPartnerAndMatches(profile);
    loadCustomNames(profile.couple_code);
  }, [profile]);

  useEffect(() => {
    if (!profile?.couple_code || !profile?.id) return undefined;
    const timer = setInterval(() => {
      loadCustomNames(profile.couple_code);
      loadPartnerAndMatches(profile);
    }, REFRESH_MS);
    return () => clearInterval(timer);
  }, [profile]);

  const baseEntries = useMemo(() => NAMES_DATABASE.map((item) => buildEntryFromBase(item)), []);
  const customEntries = useMemo(() => customNames.map((row) => buildCustomEntry(row)), [customNames]);

  const mergedDatabase = useMemo(() => {
    const map = new Map();
    baseEntries.forEach((item) => map.set(normalizeKey(item.name), item));
    customEntries.forEach((item) => map.set(normalizeKey(item.name), item));
    return Array.from(map.values());
  }, [baseEntries, customEntries]);

  const namesMap = useMemo(() => Object.fromEntries(mergedDatabase.map((item) => [item.name, item])), [mergedDatabase]);
  const randomNamePool = useMemo(() => shuffleArray(mergedDatabase.map((item) => item.name)), [mergedDatabase]);
  const randomRank = useMemo(() => {
    const rank = {};
    randomNamePool.forEach((item, index) => {
      rank[item] = index;
    });
    return rank;
  }, [randomNamePool]);

  const allStyles = useMemo(() => [...new Set(mergedDatabase.flatMap((item) => item.styles || []))].sort(), [mergedDatabase]);
  const allOrigins = useMemo(() => [...new Set(mergedDatabase.map((item) => item.origin).filter(Boolean))].sort(), [mergedDatabase]);
  const allVibes = useMemo(() => [...new Set(mergedDatabase.map((item) => item.vibe).filter(Boolean))].sort(), [mergedDatabase]);

  const favoriteNames = useMemo(() => randomNamePool.filter((item) => votes[item] === "yes" || votes[item] === "love"), [votes, randomNamePool]);
  const matchedNames = useMemo(() => randomNamePool.filter((item) => isPositiveVote(votes[item]) && isPositiveVote(partnerVotes[item])), [votes, partnerVotes, randomNamePool]);

  const filteredNamePool = useMemo(() => {
    const basePool = deckFilter === "favorites" ? favoriteNames : deckFilter === "matches" ? matchedNames : randomNamePool;
    if (deckFilter === "all" && priorityNames.length > 0) {
      const priorityUnvoted = priorityNames.filter((item) => basePool.includes(item) && !votes[item]);
      const rest = basePool.filter((item) => !priorityUnvoted.includes(item));
      return [...priorityUnvoted, ...rest];
    }
    return basePool;
  }, [deckFilter, favoriteNames, matchedNames, randomNamePool, priorityNames, votes]);

  const currentIndex = useMemo(() => filteredNamePool.findIndex((item) => !votes[item]), [filteredNamePool, votes]);
  const currentName = currentIndex >= 0 ? filteredNamePool[currentIndex] : null;
  const currentMeta = currentName ? namesMap[currentName] : null;

  const votedCount = Object.keys(votes).length;
  const totalCount = randomNamePool.length;
  const progress = totalCount ? Math.round((votedCount / totalCount) * 100) : 0;
  const enhancedCount = mergedDatabase.filter((item) => ["curated", "custom"].includes(item.enrichmentTier)).length;

  const summary = useMemo(() => {
    const values = Object.values(votes);
    return {
      no: values.filter((item) => item === "no").length,
      yes: values.filter((item) => item === "yes").length,
      love: values.filter((item) => item === "love").length,
    };
  }, [votes]);

  const recentVotes = useMemo(() => Object.entries(votes).map(([babyName, vote]) => ({ babyName, vote })).reverse().slice(0, 8), [votes]);

  const likedMeta = useMemo(() => {
    return randomNamePool
      .filter((item) => votes[item] === "yes" || votes[item] === "love")
      .map((item) => ({ ...namesMap[item], weight: votes[item] === "love" ? 2.2 : 1 }));
  }, [votes, randomNamePool, namesMap]);

  const dislikedMeta = useMemo(() => {
    return randomNamePool
      .filter((item) => votes[item] === "no")
      .map((item) => ({ ...namesMap[item], penaltyWeight: 1 }));
  }, [votes, randomNamePool, namesMap]);

  const smartSuggestions = useMemo(() => {
    const initial = exploreInitial.trim().toUpperCase();
    let candidates = mergedDatabase.filter((item) => !votes[item.name]);
    if (exploreStyle !== "all") candidates = candidates.filter((item) => (item.styles || []).includes(exploreStyle));
    if (exploreOrigin !== "all") candidates = candidates.filter((item) => item.origin === exploreOrigin);
    if (exploreVibe !== "all") candidates = candidates.filter((item) => item.vibe === exploreVibe);
    if (initial) candidates = candidates.filter((item) => item.initial === initial);
    return candidates
      .map((item) => {
        const result = scoreCandidate(item, likedMeta, dislikedMeta);
        return { ...item, score: result.score, why: result.why };
      })
      .sort((a, b) => b.score - a.score || randomRank[a.name] - randomRank[b.name])
      .slice(0, 10);
  }, [mergedDatabase, votes, exploreStyle, exploreOrigin, exploreVibe, exploreInitial, likedMeta, dislikedMeta, randomRank]);

  const similarToCurrent = useMemo(() => {
    if (!currentMeta) return [];
    return mergedDatabase
      .filter((item) => item.name !== currentMeta.name && !votes[item.name])
      .map((item) => {
        const result = similarityScore(currentMeta, item);
        return { ...item, score: result.score, why: result.why };
      })
      .sort((a, b) => b.score - a.score || randomRank[a.name] - randomRank[b.name])
      .slice(0, 6);
  }, [currentMeta, mergedDatabase, votes, randomRank]);

  const intelligentMatches = useMemo(() => {
    return matchedNames
      .map((item) => ({
        name: item,
        myVote: votes[item],
        partnerVote: partnerVotes[item],
        meta: namesMap[item],
        ...getMatchTier(votes[item], partnerVotes[item]),
        why: getMatchReason(namesMap[item]),
      }))
      .sort((a, b) => b.weight - a.weight || randomRank[a.name] - randomRank[b.name]);
  }, [matchedNames, votes, partnerVotes, namesMap, randomRank]);

  const detailEntry = selectedName ? namesMap[selectedName] : null;
  const detailSimilar = useMemo(() => {
    if (!detailEntry) return [];
    return mergedDatabase
      .filter((item) => item.name !== detailEntry.name)
      .map((item) => {
        const result = similarityScore(detailEntry, item);
        return { ...item, score: result.score, why: result.why };
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

  function saveProfileLocally(profileData) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profileData));
  }

  function clearSavedProfile() {
    localStorage.removeItem(STORAGE_KEY);
  }

  function generateCoupleCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  function queueSpecificName(nameValue, infoMessage) {
    setPriorityNames((prev) => [nameValue, ...prev.filter((item) => item !== nameValue)]);
    setCurrentSection("deck");
    setDeckFilter("all");
    if (infoMessage) setMessage(infoMessage);
  }

  function clearPriorityQueue() {
    setPriorityNames([]);
    setMessage("Priorità svuotata: il deck torna all’ordine random standard.");
  }

  function pushSuggestionsToDeck() {
    const names = smartSuggestions.map((item) => item.name);
    setPriorityNames(names);
    setCurrentSection("deck");
    setDeckFilter("all");
    setMessage("I nuovi suggerimenti sono stati messi in cima al deck.");
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
    } catch (error) {
      setMessage("Errore inatteso: " + error.message);
    } finally {
      setVotesLoading(false);
    }
  }

  async function loadCustomNames(coupleCode) {
    if (!coupleCode) return;
    setCustomNamesLoading(true);
    try {
      const { data, error } = await supabase
        .from("custom_names")
        .select("id, couple_code, name, meaning, origin, vibe, created_by, created_at")
        .eq("couple_code", coupleCode)
        .order("created_at", { ascending: true });
      if (error) {
        setMessage("Errore caricamento nomi personalizzati: " + error.message);
        return;
      }
      setCustomNames(data || []);
    } catch (error) {
      setMessage("Errore inatteso: " + error.message);
    } finally {
      setCustomNamesLoading(false);
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
    } catch (error) {
      setMessage("Errore inatteso: " + error.message);
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
      setCustomNames([]);
      setPriorityNames([]);
      setCurrentSection("deck");
      setMessage("Profilo creato! Il tuo codice coppia è: " + coupleCode);
      setName("");
      setJoinCode("");
    } catch (error) {
      setMessage("Errore inatteso: " + error.message);
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
      setCustomNames([]);
      setPriorityNames([]);
      setCurrentSection("deck");
      setMessage("Profilo collegato correttamente alla coppia " + normalizedCode);
      setName("");
      setJoinCode("");
    } catch (error) {
      setMessage("Errore inatteso: " + error.message);
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
        .upsert({ profile_id: profile.id, baby_name: currentName, vote: voteType }, { onConflict: "profile_id,baby_name" });
      if (error) {
        setMessage("Errore salvataggio voto: " + error.message);
        return;
      }
      setVotes((prev) => ({ ...prev, [currentName]: voteType }));
    } catch (error) {
      setMessage("Errore inatteso: " + error.message);
    } finally {
      setVoteSaving(false);
    }
  }

  async function saveManualName() {
    if (!profile?.id || !profile?.couple_code) return;
    const cleanName = titleCase(manualName);
    if (!cleanName) {
      setMessage("Inserisci un nome da aggiungere");
      return;
    }
    const existing = mergedDatabase.find((item) => normalizeKey(item.name) === normalizeKey(cleanName));
    if (existing) {
      setMessage("Questo nome esiste già nel catalogo o nella vostra lista personalizzata");
      return;
    }

    setManualSaving(true);
    setMessage("");
    try {
      const payload = {
        couple_code: profile.couple_code,
        name: cleanName,
        meaning: normalizeText(manualMeaning) || "Nome aggiunto manualmente dalla coppia.",
        origin: normalizeText(manualOrigin) || "Personalizzato",
        vibe: manualVibe || "elegante",
        created_by: profile.id,
      };
      const { error } = await supabase.from("custom_names").insert(payload);
      if (error) {
        setMessage("Errore salvataggio nome personalizzato: " + error.message);
        return;
      }
      await loadCustomNames(profile.couple_code);
      queueSpecificName(cleanName, `${cleanName} è stato aggiunto alla coppia e messo in cima al deck.`);
      setManualName("");
      setManualMeaning("");
      setManualOrigin("");
      setManualVibe("elegante");
    } catch (error) {
      setMessage("Errore inatteso: " + error.message);
    } finally {
      setManualSaving(false);
    }
  }

  async function resetMyVotes() {
    if (!profile?.id) return;
    const ok = window.confirm("Vuoi davvero cancellare tutti i tuoi voti? Questa azione non si può annullare.");
    if (!ok) return;
    setVoteSaving(true);
    setMessage("");
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
    } catch (error) {
      setMessage("Errore inatteso: " + error.message);
    } finally {
      setVoteSaving(false);
    }
  }

  async function refreshAllData() {
    if (!profile?.id || !profile?.couple_code) return;
    await Promise.all([
      loadVotes(profile.id),
      loadPartnerAndMatches(profile),
      loadCustomNames(profile.couple_code),
    ]);
    setMessage("Dati sincronizzati");
  }

  function logoutProfile() {
    clearSavedProfile();
    setProfile(null);
    setVotes({});
    setPartner(null);
    setPartnerVotes({});
    setCustomNames([]);
    setPriorityNames([]);
    setCurrentSection("deck");
    setName("");
    setJoinCode("");
    setMessage("Profilo scollegato da questo dispositivo");
  }

  const renderSectionHeader = (title, subtitle, extra = null) => (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 14 }}>
      <div>
        <h2 style={{ margin: 0 }}>{title}</h2>
        {subtitle ? <p style={{ margin: "6px 0 0 0", color: COLORS.muted, fontSize: 14 }}>{subtitle}</p> : null}
      </div>
      {extra}
    </div>
  );

  const renderDeck = () => (
    <div style={cardStyle({ padding: 22, background: "linear-gradient(180deg, #ffffff 0%, #fcfcff 100%)" })}>
      {renderSectionHeader(
        "Scelta del nome",
        "Home pulita con solo il deck principale. La card del nome ha altezza fissa, quindi i pulsanti restano sempre stabili.",
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={() => setDeckFilter("all")} style={buttonStyle(deckFilter === "all" ? "active" : "secondary")}>Tutti</button>
          <button onClick={() => setDeckFilter("favorites")} style={buttonStyle(deckFilter === "favorites" ? "active" : "secondary")}>Solo preferiti</button>
          <button onClick={() => setDeckFilter("matches")} style={buttonStyle(deckFilter === "matches" ? "active" : "secondary")}>Solo match</button>
        </div>
      )}
      {votesLoading ? (
        <p style={{ color: COLORS.muted }}>Caricamento voti...</p>
      ) : currentName && currentMeta ? (
        <div style={{ position: "relative", borderRadius: 30, padding: 24, background: `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.primary2} 56%, ${COLORS.primary3} 100%)`, color: "white", height: 560, display: "flex", flexDirection: "column", justifyContent: "space-between", boxShadow: "0 24px 50px rgba(124,58,237,0.24)", overflow: "hidden" }}>
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at top right, rgba(255,255,255,0.30), transparent 35%)" }} />
          <div style={{ position: "absolute", right: -40, bottom: -56, width: 180, height: 180, borderRadius: "50%", background: "rgba(255,255,255,0.14)" }} />

          <div style={{ position: "relative", display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <div style={badgeStyle("rgba(255,255,255,0.18)", "#fff")}>Nome {currentIndex + 1} di {filteredNamePool.length}</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {priorityNames.includes(currentName) ? <span style={badgeStyle("rgba(255,255,255,0.18)", "#fff")}>Suggerito per te</span> : null}
              <span style={badgeStyle("rgba(255,255,255,0.18)", "#fff")}>{currentMeta.origin}</span>
              <span style={badgeStyle("rgba(255,255,255,0.18)", "#fff")}>{currentMeta.isCustom ? "custom" : currentMeta.enrichmentTier}</span>
            </div>
          </div>

          <div style={{ position: "relative", display: "flex", flexDirection: "column", justifyContent: "center", flex: 1 }}>
            <p style={{ opacity: 0.82, marginBottom: 8 }}>Nome</p>
            <h2 onClick={() => openNameDetail(currentName, currentMeta.isCustom ? "Nome aggiunto manualmente dalla coppia." : "Nome visualizzato nel deck principale.")} style={{ fontSize: 58, lineHeight: 1.05, margin: 0, cursor: "pointer" }}>
              {currentName}
            </h2>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 18 }}>
              {[...(currentMeta.styles || []).slice(0, 3), currentMeta.vibe].filter(Boolean).map((label) => (
                <span key={label} style={badgeStyle("rgba(255,255,255,0.18)", "#fff")}>{label}</span>
              ))}
            </div>
          </div>

          <div style={{ position: "relative" }}>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
              <button onClick={() => openNameDetail(currentName, currentMeta.isCustom ? "Scheda del nome personalizzato." : "Scheda completa del nome selezionato.")} style={{ ...buttonStyle("secondary"), background: "rgba(255,255,255,0.95)", border: "none" }}>
                Apri scheda nome
              </button>
              <button onClick={() => queueSpecificName(currentName, `${currentName} rimesso in cima alla coda di scelta.`)} style={{ ...buttonStyle("secondary"), background: "rgba(255,255,255,0.18)", color: "#fff", border: "1px solid rgba(255,255,255,0.25)" }}>
                Rivedi dopo
              </button>
            </div>
            <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}>
              <button onClick={() => handleVote("no")} disabled={voteSaving} style={{ ...buttonStyle("no"), width: "100%" }}>{voteSaving ? "Salvataggio..." : "👎 No"}</button>
              <button onClick={() => handleVote("yes")} disabled={voteSaving} style={{ ...buttonStyle("yes"), width: "100%" }}>{voteSaving ? "Salvataggio..." : "👍 Sì"}</button>
              <button onClick={() => handleVote("love")} disabled={voteSaving} style={{ ...buttonStyle("love"), width: "100%", background: "#fff", border: "none" }}>{voteSaving ? "Salvataggio..." : "💜 Adoro"}</button>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ textAlign: "center", padding: 30, borderRadius: 24, background: COLORS.slateSoft, border: `1px solid ${COLORS.border}` }}>
          <h2 style={{ marginBottom: 8 }}>Hai finito il deck 🎉</h2>
          <p style={{ color: COLORS.muted, marginTop: 0 }}>Usa il menu in alto a destra per aprire le altre schede o per aggiungere un nome manuale.</p>
        </div>
      )}
    </div>
  );

  const renderMatches = () => (
    <div style={cardStyle({ background: intelligentMatches.length ? "linear-gradient(180deg, #f0fdf4 0%, #ffffff 100%)" : "#ffffff" })}>
      {renderSectionHeader("Match di coppia", "Tutti i match sono in una scheda separata, con tier e contesto più chiari.", partner ? <div style={badgeStyle(COLORS.primarySoft, COLORS.primary)}>Partner: {partner.name}</div> : null)}
      {matchLoading ? <p style={{ color: COLORS.muted }}>Caricamento match...</p> : !partner ? <p style={{ color: COLORS.muted }}>Nessun partner collegato ancora.</p> : intelligentMatches.length === 0 ? <p style={{ color: COLORS.muted }}>Per ora nessun match positivo.</p> : <div style={{ display: "grid", gap: 10 }}>{intelligentMatches.map((item) => <div key={item.name} style={{ ...cardStyle({ padding: 12, background: item.bg }) }}><div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}><strong style={{ cursor: "pointer" }} onClick={() => openNameDetail(item.name, `${item.tier}. ${item.why}`)}>{item.name}</strong><span style={badgeStyle(item.bg, item.color)}>{item.tier}</span></div><div style={{ color: COLORS.muted, fontSize: 13, marginTop: 6 }}>{item.why}</div><div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}><span style={voteBadgeStyle(item.myVote)}>tu: {item.myVote}</span><span style={voteBadgeStyle(item.partnerVote)}>partner: {item.partnerVote}</span></div></div>)}</div>}
    </div>
  );

  const renderCatalog = () => (
    <div style={cardStyle()}>
      {renderSectionHeader("Catalogo smart", "Filtra il catalogo e poi manda in cima al deck i suggerimenti trovati.", <div style={badgeStyle(COLORS.primarySoft, COLORS.primary)}>{smartSuggestions.length} suggerimenti</div>)}
      <label style={{ display: "block", marginBottom: 6, color: COLORS.muted, fontSize: 14 }}>Stile</label>
      <select value={exploreStyle} onChange={(e) => setExploreStyle(e.target.value)} style={{ ...inputStyle, marginBottom: 12 }}><option value="all">Tutti gli stili</option>{allStyles.map((item) => <option key={item} value={item}>{item}</option>)}</select>
      <label style={{ display: "block", marginBottom: 6, color: COLORS.muted, fontSize: 14 }}>Origine</label>
      <select value={exploreOrigin} onChange={(e) => setExploreOrigin(e.target.value)} style={{ ...inputStyle, marginBottom: 12 }}><option value="all">Tutte le origini</option>{allOrigins.map((item) => <option key={item} value={item}>{item}</option>)}</select>
      <label style={{ display: "block", marginBottom: 6, color: COLORS.muted, fontSize: 14 }}>Vibe</label>
      <select value={exploreVibe} onChange={(e) => setExploreVibe(e.target.value)} style={{ ...inputStyle, marginBottom: 12 }}><option value="all">Tutti i vibe</option>{allVibes.map((item) => <option key={item} value={item}>{item}</option>)}</select>
      <label style={{ display: "block", marginBottom: 6, color: COLORS.muted, fontSize: 14 }}>Iniziale opzionale</label>
      <input type="text" maxLength={1} placeholder="Es. A" value={exploreInitial} onChange={(e) => setExploreInitial(e.target.value.toUpperCase())} style={{ ...inputStyle, marginBottom: 12 }} />
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button onClick={pushSuggestionsToDeck} style={buttonStyle("primary")}>Aggiorna suggerimenti</button>
        {priorityNames.length > 0 ? <button onClick={clearPriorityQueue} style={buttonStyle("secondary")}>Svuota priorità</button> : null}
      </div>
    </div>
  );

  const renderSuggestions = () => (
    <div style={cardStyle()}>
      {renderSectionHeader("Suggeriti per te", "Ogni suggerimento spiega perché è coerente con i tuoi voti.", <div style={badgeStyle(COLORS.greenSoft, COLORS.green)}>{smartSuggestions.length}</div>)}
      {smartSuggestions.length === 0 ? <p style={{ color: COLORS.muted }}>Inizia a votare per ricevere suggerimenti personalizzati.</p> : <div style={{ display: "grid", gap: 10 }}>{smartSuggestions.map((item) => <div key={item.name} style={{ ...cardStyle({ padding: 12, background: COLORS.slateSoft }) }}><div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}><strong style={{ cursor: "pointer" }} onClick={() => openNameDetail(item.name, item.why)}>{item.name}</strong><span style={badgeStyle(COLORS.primarySoft, COLORS.primary)}>{item.vibe}</span></div><div style={{ fontSize: 13, color: COLORS.muted, marginTop: 6 }}>{item.why}</div><div style={{ marginTop: 8 }}><button onClick={() => queueSpecificName(item.name, `${item.name} aggiunto in cima al deck.`)} style={buttonStyle("secondary")}>Manda nel deck</button></div></div>)}</div>}
    </div>
  );

  const renderSimilar = () => (
    <div style={cardStyle()}>
      {renderSectionHeader("Nomi simili", "Scheda separata dedicata ai nomi vicini a quello attualmente in valutazione.", <div style={badgeStyle(COLORS.blueSoft, COLORS.blue)}>{similarToCurrent.length}</div>)}
      {!currentMeta ? <p style={{ color: COLORS.muted }}>Seleziona o raggiungi un nome nel deck.</p> : <div style={{ display: "grid", gap: 10 }}>{similarToCurrent.map((item) => <div key={item.name} style={{ ...cardStyle({ padding: 12, background: COLORS.slateSoft }) }}><div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}><strong style={{ cursor: "pointer" }} onClick={() => openNameDetail(item.name, item.why)}>{item.name}</strong><span style={badgeStyle(COLORS.primarySoft, COLORS.primary)}>{item.vibe}</span></div><div style={{ fontSize: 13, color: COLORS.muted, marginTop: 6 }}>{item.why}</div></div>)}</div>}
    </div>
  );

  const renderFavorites = () => (
    <div style={cardStyle()}>
      {renderSectionHeader("Preferiti", "Scheda separata con tutti i tuoi sì e adoro.", <div style={badgeStyle(COLORS.greenSoft, COLORS.green)}>{favoriteNames.length}</div>)}
      {favoriteNames.length === 0 ? <p style={{ color: COLORS.muted }}>Ancora nessun preferito.</p> : <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{favoriteNames.map((item) => <button key={item} onClick={() => openNameDetail(item, votes[item] === "love" ? "Questo nome è nei tuoi top assoluti." : "Questo nome è tra i tuoi preferiti.")} style={{ ...badgeStyle(votes[item] === "love" ? COLORS.primarySoft : COLORS.greenSoft, votes[item] === "love" ? COLORS.primary : COLORS.green), border: "none", cursor: "pointer" }}>{item}</button>)}</div>}
    </div>
  );

  const renderRecent = () => (
    <div style={cardStyle()}>
      {renderSectionHeader("Ultimi voti", "Cronologia compatta degli ultimi voti salvati.", <div style={badgeStyle(COLORS.blueSoft, COLORS.blue)}>{recentVotes.length}</div>)}
      {recentVotes.length === 0 ? <p style={{ color: COLORS.muted }}>I tuoi ultimi voti appariranno qui.</p> : <div style={{ display: "grid", gap: 10 }}>{recentVotes.map((item) => <button key={item.babyName} onClick={() => openNameDetail(item.babyName, `Ultimo voto registrato: ${item.vote}.`)} style={{ ...cardStyle({ padding: 12, background: COLORS.slateSoft, display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }) }}><span style={{ fontWeight: 600 }}>{item.babyName}</span><span style={voteBadgeStyle(item.vote)}>{item.vote}</span></button>)}</div>}
    </div>
  );

  const renderManual = () => (
    <div style={cardStyle()}>
      {renderSectionHeader("Aggiungi nome manuale", "Il nome viene salvato per la coppia e compare automaticamente anche al partner collegato.", <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><span style={badgeStyle(COLORS.primarySoft, COLORS.primary)}>{customNames.length} nomi custom</span><span style={badgeStyle(COLORS.blueSoft, COLORS.blue)}>sync coppia attiva</span></div>)}
      <div style={{ display: "grid", gap: 20, gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
        <div style={cardStyle({ background: COLORS.slateSoft })}>
          <label style={{ display: "block", marginBottom: 6, color: COLORS.muted, fontSize: 14 }}>Nome</label>
          <input type="text" value={manualName} onChange={(e) => setManualName(e.target.value)} placeholder="Es. Bianca" style={{ ...inputStyle, marginBottom: 12 }} />
          <label style={{ display: "block", marginBottom: 6, color: COLORS.muted, fontSize: 14 }}>Origine / provenienza</label>
          <input type="text" value={manualOrigin} onChange={(e) => setManualOrigin(e.target.value)} placeholder="Es. Italiano, dal germanico..." style={{ ...inputStyle, marginBottom: 12 }} />
          <label style={{ display: "block", marginBottom: 6, color: COLORS.muted, fontSize: 14 }}>Vibe</label>
          <select value={manualVibe} onChange={(e) => setManualVibe(e.target.value)} style={{ ...inputStyle, marginBottom: 12 }}>{MANUAL_VIBES.map((item) => <option key={item} value={item}>{item}</option>)}</select>
          <label style={{ display: "block", marginBottom: 6, color: COLORS.muted, fontSize: 14 }}>Significato / nota</label>
          <textarea value={manualMeaning} onChange={(e) => setManualMeaning(e.target.value)} placeholder="Es. Nome luminoso, italiano e senza tempo..." style={{ ...inputStyle, minHeight: 120, resize: "vertical", marginBottom: 12 }} />
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button onClick={saveManualName} disabled={manualSaving} style={buttonStyle("primary")}>{manualSaving ? "Salvataggio..." : "Salva nome"}</button>
            <button onClick={() => { setManualName(""); setManualOrigin(""); setManualMeaning(""); setManualVibe("elegante"); }} style={buttonStyle("secondary")}>Pulisci</button>
          </div>
        </div>
        <div style={cardStyle({ background: COLORS.slateSoft })}>
          <h3 style={{ marginTop: 0 }}>Nomi manuali della coppia</h3>
          {customNamesLoading ? <p style={{ color: COLORS.muted }}>Caricamento nomi personalizzati...</p> : customEntries.length === 0 ? <p style={{ color: COLORS.muted }}>Ancora nessun nome aggiunto manualmente.</p> : <div style={{ display: "grid", gap: 10 }}>{customEntries.map((item) => <div key={item.name} style={{ ...cardStyle({ padding: 12, background: "#fff" }) }}><div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}><strong style={{ cursor: "pointer" }} onClick={() => openNameDetail(item.name, "Nome aggiunto manualmente dalla coppia.")}>{item.name}</strong><span style={badgeStyle(COLORS.amberSoft, COLORS.amber)}>custom</span></div><div style={{ color: COLORS.muted, fontSize: 13, marginTop: 6 }}>{item.origin}</div><div style={{ marginTop: 8 }}><button onClick={() => queueSpecificName(item.name, `${item.name} rimesso in cima al deck.`)} style={buttonStyle("secondary")}>Vai a votarlo</button></div></div>)}</div>}
        </div>
      </div>
    </div>
  );

  const renderActions = () => (
    <div style={cardStyle()}>
      {renderSectionHeader("Azioni rapide", "Scheda dedicata alle utility di sincronizzazione e reset.")}
      <div style={{ display: "grid", gap: 10 }}>
        <button onClick={refreshAllData} style={buttonStyle("secondary")}>Sincronizza dati coppia</button>
        <button onClick={resetMyVotes} disabled={voteSaving} style={buttonStyle("warning")}>Azzera i miei voti</button>
        <button onClick={() => { setDeckFilter("all"); setCurrentSection("deck"); setMessage("Filtro deck resettato"); }} style={buttonStyle("secondary")}>Reset filtri deck</button>
        {priorityNames.length > 0 ? <button onClick={clearPriorityQueue} style={buttonStyle("secondary")}>Svuota priorità</button> : null}
      </div>
      <p style={{ color: COLORS.muted, fontSize: 13, marginTop: 12, marginBottom: 0 }}>Il reset cancella solo i tuoi voti, non quelli del partner. I nomi manuali restano disponibili per tutta la coppia.</p>
    </div>
  );

  function renderCurrentSection() {
    switch (currentSection) {
      case "matches":
        return renderMatches();
      case "catalog":
        return renderCatalog();
      case "suggestions":
        return renderSuggestions();
      case "similar":
        return renderSimilar();
      case "favorites":
        return renderFavorites();
      case "recent":
        return renderRecent();
      case "manual":
        return renderManual();
      case "actions":
        return renderActions();
      case "deck":
      default:
        return renderDeck();
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: `linear-gradient(180deg, ${COLORS.bgTop} 0%, ${COLORS.bgBottom} 100%)`, padding: 20, fontFamily: "Inter, Arial, sans-serif", color: COLORS.text }}>
      <style>{`
        * { box-sizing: border-box; }
        .app-shell { max-width: 1200px; margin: 0 auto; }
        .auth-grid { display: grid; gap: 18px; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); }
        .stats-grid { display: grid; gap: 14px; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); }
        .content-grid { display: grid; gap: 20px; }
        .message-bar { position: sticky; bottom: 14px; z-index: 20; }
        @media (max-width: 640px) {
          .vote-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {selectedName && detailEntry ? (
        <div style={{ position: "fixed", inset: 0, background: COLORS.overlay, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, zIndex: 50 }} onClick={closeNameDetail}>
          <div style={{ ...cardStyle(), maxWidth: 760, width: "100%", maxHeight: "90vh", overflow: "auto" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start", marginBottom: 12 }}>
              <div>
                <div style={badgeStyle(COLORS.primarySoft, COLORS.primary)}>Scheda nome</div>
                <h2 style={{ marginBottom: 8 }}>{detailEntry.name}</h2>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <span style={badgeStyle(COLORS.blueSoft, COLORS.blue)}>{detailEntry.origin}</span>
                  <span style={badgeStyle(COLORS.primarySoft, COLORS.primary)}>{detailEntry.vibe}</span>
                  <span style={badgeStyle(COLORS.greenSoft, COLORS.green)}>{detailEntry.length}</span>
                  <span style={badgeStyle(COLORS.amberSoft, COLORS.amber)}>{detailEntry.isCustom ? "custom" : detailEntry.enrichmentTier}</span>
                </div>
              </div>
              <button onClick={closeNameDetail} style={buttonStyle("secondary")}>Chiudi</button>
            </div>

            {selectedContext ? <div style={{ ...cardStyle({ padding: 12, marginBottom: 14, background: COLORS.slateSoft }) }}><strong>Perché lo vedi qui:</strong><div style={{ color: COLORS.muted, marginTop: 6 }}>{selectedContext}</div></div> : null}
            <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
              <div style={cardStyle({ background: COLORS.slateSoft })}><h3 style={{ marginTop: 0 }}>Significato</h3><p style={{ lineHeight: 1.6, marginBottom: 0 }}>{detailEntry.meaning}</p></div>
              <div style={cardStyle({ background: COLORS.slateSoft })}><h3 style={{ marginTop: 0 }}>Origine</h3><p style={{ lineHeight: 1.6, marginBottom: 0 }}>{detailEntry.longOrigin || detailEntry.origin}</p></div>
            </div>
            <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", marginTop: 16 }}>
              <div style={cardStyle({ background: COLORS.slateSoft })}><h3 style={{ marginTop: 0 }}>Stile e tag</h3><div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{(detailEntry.styles || []).map((item) => <span key={item} style={badgeStyle(COLORS.primarySoft, COLORS.primary)}>{item}</span>)}{(detailEntry.tags || []).map((item) => <span key={item} style={badgeStyle(COLORS.greenSoft, COLORS.green)}>{item}</span>)}</div></div>
              <div style={cardStyle({ background: COLORS.slateSoft })}><h3 style={{ marginTop: 0 }}>Nomi simili</h3><div style={{ display: "grid", gap: 8 }}>{detailSimilar.map((item) => <button key={item.name} onClick={() => openNameDetail(item.name, item.why)} style={{ ...cardStyle({ padding: 12, background: "#fff", cursor: "pointer" }), textAlign: "left" }}><strong>{item.name}</strong><div style={{ color: COLORS.muted, fontSize: 13, marginTop: 4 }}>{item.why}</div></button>)}</div></div>
            </div>
          </div>
        </div>
      ) : null}

      {checkingSession ? (
        <div className="app-shell"><h1>Il Nome Perfetto</h1><p style={{ color: COLORS.muted }}>Caricamento profilo...</p></div>
      ) : !profile ? (
        <div className="app-shell" style={{ maxWidth: 780 }}>
          <div style={cardStyle({ padding: 28, marginBottom: 20, background: `linear-gradient(135deg, ${COLORS.primarySoft} 0%, #ffffff 100%)` })}>
            <div style={badgeStyle(COLORS.primarySoft, COLORS.primary)}>✨ v12 safe build</div>
            <h1 style={{ fontSize: 38, marginBottom: 10 }}>Il Nome Perfetto</h1>
            <p style={{ color: COLORS.muted, fontSize: 16, lineHeight: 1.6, marginBottom: 0 }}>Home pulita con solo la scelta del nome, menu a tendina in alto a destra per le altre schede e nomi manuali condivisi nella coppia.</p>
          </div>
          <div className="auth-grid">
            <div style={cardStyle()}>
              <h2 style={{ marginTop: 0 }}>Crea nuova coppia</h2>
              <input type="text" placeholder="Il tuo nome" value={name} onChange={(e) => setName(e.target.value)} style={{ ...inputStyle, marginBottom: 12 }} />
              <button onClick={createNewCouple} disabled={loading} style={buttonStyle("primary")}>{loading ? "Attendi..." : "Crea nuova coppia"}</button>
            </div>
            <div style={cardStyle()}>
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
          <div style={cardStyle({ padding: 24, marginBottom: 20, background: `linear-gradient(135deg, #ffffff 0%, ${COLORS.primarySoft} 100%)` })}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", alignItems: "flex-start" }}>
              <div>
                <div style={{ ...badgeStyle(COLORS.primarySoft, COLORS.primary), marginBottom: 12 }}>📚 Smart catalog attivo</div>
                <h1 style={{ margin: 0, fontSize: 34 }}>Il Nome Perfetto</h1>
                <p style={{ color: COLORS.muted, marginBottom: 0 }}>Ciao <strong>{profile.name}</strong> — coppia <strong>{profile.couple_code}</strong> — catalogo totale: <strong>{mergedDatabase.length}</strong> nomi — schede curate/custom: <strong>{enhancedCount}</strong></p>
              </div>
              <div style={{ display: "grid", gap: 10, minWidth: 260 }}>
                <select value={currentSection} onChange={(e) => setCurrentSection(e.target.value)} style={inputStyle}>
                  {SECTION_OPTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                </select>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
                  <button onClick={refreshAllData} style={buttonStyle("secondary")}>Sincronizza</button>
                  <button onClick={logoutProfile} style={buttonStyle("secondary")}>Esci</button>
                </div>
              </div>
            </div>
            <div style={{ marginTop: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, color: COLORS.muted, marginBottom: 8 }}><span>Progresso voti</span><span>{votedCount} / {totalCount} · {progress}%</span></div>
              <div style={{ height: 12, borderRadius: 999, background: "#ede9fe", overflow: "hidden" }}><div style={{ width: `${progress}%`, height: "100%", background: `linear-gradient(90deg, ${COLORS.primary} 0%, ${COLORS.primary2} 100%)` }} /></div>
            </div>
          </div>

          <div className="stats-grid" style={{ marginBottom: 20 }}>
            <div style={cardStyle({ background: COLORS.redSoft, border: "1px solid #fecaca" })}><div style={badgeStyle(COLORS.redSoft, COLORS.red)}>👎 No</div><h3 style={{ marginBottom: 0, fontSize: 28 }}>{summary.no}</h3><p style={{ marginBottom: 0, color: COLORS.muted, fontSize: 13 }}>Passati oltre</p></div>
            <div style={cardStyle({ background: COLORS.greenSoft, border: "1px solid #bbf7d0" })}><div style={badgeStyle(COLORS.greenSoft, COLORS.green)}>👍 Sì</div><h3 style={{ marginBottom: 0, fontSize: 28 }}>{summary.yes}</h3><p style={{ marginBottom: 0, color: COLORS.muted, fontSize: 13 }}>Ti piacciono</p></div>
            <div style={cardStyle({ background: COLORS.primarySoft, border: "1px solid #e9d5ff" })}><div style={badgeStyle(COLORS.primarySoft, COLORS.primary)}>💜 Adoro</div><h3 style={{ marginBottom: 0, fontSize: 28 }}>{summary.love}</h3><p style={{ marginBottom: 0, color: COLORS.muted, fontSize: 13 }}>Top assoluti</p></div>
            <div style={cardStyle({ background: COLORS.blueSoft, border: "1px solid #bfdbfe" })}><div style={badgeStyle(COLORS.blueSoft, COLORS.blue)}>🤝 Match</div><h3 style={{ marginBottom: 0, fontSize: 28 }}>{matchedNames.length}</h3><p style={{ marginBottom: 0, color: COLORS.muted, fontSize: 13 }}>In comune col partner</p></div>
          </div>

          <div className="content-grid">
            {renderCurrentSection()}
          </div>

          {message ? <div className="message-bar" style={{ ...cardStyle({ marginTop: 20, padding: 14 }) }}><span style={{ color: COLORS.muted }}>{message}</span></div> : null}
        </div>
      )}
    </div>
  );
}
