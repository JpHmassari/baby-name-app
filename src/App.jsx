import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "./lib/supabase";
import { NAMES_DATABASE } from "./data/namesDatabase";

const STORAGE_KEY = "baby_name_app_profile";
const ENRICH_LIMIT = 100;

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

const TOP_MENU_OPTIONS = [
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

const VIBE_OPTIONS = [
  "classico",
  "moderno",
  "elegante",
  "raffinato",
  "dolce",
  "forte",
  "luminoso",
  "romantico",
  "internazionale",
];

const NAME_ENRICHMENTS = {
  Letizia: {
    origin: "Italiano, dal latino Laetitia",
    meaning:
      'Nome affettivo e augurale, che continua il latino "Laetitia", letteralmente "gioia", "felicità", "allegria".',
    longOrigin:
      "Forma italiana di Letitia/Laetitia. Mantiene una tradizione classica latina e comunica un’idea di serenità gioiosa, luminosa e piena di buon auspicio.",
  },
  Sofia: {
    origin: "Greco, da Sophia",
    meaning:
      'Dal greco "sophia": "sapienza", "saggezza". È un nome classico che unisce profondità intellettuale ed eleganza.',
    longOrigin:
      "Nome di origine greca diffusissimo in Europa. La sua forza sta nella semplicità del suono e in un significato molto nobile, legato alla sapienza.",
  },
  Aurora: {
    origin: "Latino",
    meaning:
      'Dal latino "aurora": "alba". Evoca luce, rinascita, inizio e delicatezza luminosa.',
    longOrigin:
      "Nella cultura romana Aurora è la dea del mattino. Come nome richiama il momento in cui la luce torna e tutto ricomincia.",
  },
  Vittoria: {
    origin: "Italiano, dal latino Victoria",
    meaning:
      'Dal latino "victoria": "vittoria", "trionfo". È un nome deciso, classico e molto forte.',
    longOrigin:
      "Forma italiana di Victoria. Porta con sé un’idea di forza composta, successo e dignità, con un suono italiano autorevole.",
  },
  Beatrice: {
    origin: "Italiano, dal latino Beatrix / Viatrix",
    meaning:
      'Tradizionalmente collegato a Beatrix, con il senso di "beata", "felice"; in origine probabilmente da Viatrix, "viaggiatrice".',
    longOrigin:
      "Nome classico di radice latina, reso celebre anche dalla tradizione letteraria italiana. Unisce grazia, spiritualità e una sfumatura di felicità beneaugurante.",
  },
  Ginevra: {
    origin: "Italiano, forma di Guinevere",
    meaning:
      'Forma italiana di Guinevere, il nome della regina Ginevra del ciclo arturiano; tradizionalmente ricondotto al gallese Gwenhwyfar con interpretazioni come "bianca" o "chiara".',
    longOrigin:
      "Nome dal fascino letterario e rinascimentale, molto elegante in italiano. Oggi è percepito come raffinato, aristocratico e distintivo.",
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

function normalizeNameKey(value) {
  return String(value || "").trim().toLowerCase();
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

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

function normalizeText(value) {
  if (!value) return "";
  return String(value).replace(/\s+/g, " ").trim();
}

function sentencePunctuate(value) {
  const text = normalizeText(value);
  if (!text) return "";
  return /[.!?]$/.test(text) ? text : `${text}.`;
}

function lowerFirst(value) {
  const text = normalizeText(value);
  if (!text) return "";
  return text.charAt(0).toLowerCase() + text.slice(1);
}

function buildGenericMeaning(item) {
  const baseMeaning = sentencePunctuate(item.meaning || "");
  const vibeText = item.vibe
    ? ` Oggi è percepito come un nome ${item.vibe}${item.styles?.[0] ? ` e ${item.styles[0]}` : ""}.`
    : item.styles?.[0]
    ? ` Nel catalogo ha un profilo ${item.styles[0]}.`
    : "";
  return `${baseMeaning}${vibeText}`.trim();
}

function buildGenericOrigin(item) {
  const origin = normalizeText(item.origin);
  const styleText = item.styles?.length
    ? ` Nel catalogo è classificato come ${item.styles.slice(0, 2).join(" / ")}.`
    : "";
  const tagText = item.tags?.length
    ? ` Le associazioni principali sono ${item.tags.slice(0, 2).join(" e ")}.`
    : "";
  if (!origin) return `${styleText}${tagText}`.trim();
  return `Nome di area ${lowerFirst(origin)}.${styleText}${tagText}`.trim();
}

function enrichEntry(item, index) {
  const curated = NAME_ENRICHMENTS[item.name];
  if (curated) {
    return {
      ...item,
      origin: curated.origin || item.origin,
      meaning: curated.meaning || item.meaning,
      longOrigin: curated.longOrigin || item.origin,
      enrichmentTier: "curated",
    };
  }

  if (index < ENRICH_LIMIT) {
    return {
      ...item,
      meaning: buildGenericMeaning(item),
      longOrigin: buildGenericOrigin(item),
      enrichmentTier: "enhanced",
    };
  }

  return {
    ...item,
    longOrigin: item.origin,
    enrichmentTier: "base",
  };
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

const textareaStyle = {
  ...inputStyle,
  minHeight: 110,
  resize: "vertical",
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

function mapCustomNameToEntry(row) {
  const normalizedName = titleCase(row.name);
  const vibe = row.vibe || "personalizzato";
  const lengthCount = normalizedName.length;
  const length = lengthCount <= 5 ? "corto" : lengthCount <= 8 ? "medio" : "lungo";
  return {
    id: row.id,
    name: normalizedName,
    origin: row.origin || "Personalizzato",
    meaning: row.meaning || "Nome aggiunto manualmente dalla coppia.",
    longOrigin: row.origin ? `Voce personalizzata della coppia: ${row.origin}.` : "Voce personalizzata aggiunta manualmente dalla coppia.",
    vibe,
    styles: ["personalizzato", vibe].filter(Boolean),
    tags: ["aggiunto dalla coppia"],
    length,
    initial: normalizedName.charAt(0).toUpperCase(),
    popularity: "custom",
    international: false,
    enrichmentTier: "custom",
    isCustom: true,
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

  const [customNames, setCustomNames] = useState([]);
  const [customNamesLoading, setCustomNamesLoading] = useState(false);
  const [manualName, setManualName] = useState("");
  const [manualMeaning, setManualMeaning] = useState("");
  const [manualOrigin, setManualOrigin] = useState("");
  const [manualVibe, setManualVibe] = useState("elegante");
  const [manualSaving, setManualSaving] = useState(false);

  const [deckFilter, setDeckFilter] = useState("all");
  const [exploreStyle, setExploreStyle] = useState("all");
  const [exploreOrigin, setExploreOrigin] = useState("all");
  const [exploreVibe, setExploreVibe] = useState("all");
  const [exploreInitial, setExploreInitial] = useState("");
  const [priorityNames, setPriorityNames] = useState([]);
  const [currentSection, setCurrentSection] = useState("deck");

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
    if (profile?.id && profile?.couple_code) {
      loadVotes(profile.id);
      loadPartnerAndMatches(profile);
      loadCustomNames(profile.couple_code);
    } else {
      setVotes({});
      setPartner(null);
      setPartnerVotes({});
      setPriorityNames([]);
      setCustomNames([]);
    }
  }, [profile]);

  useEffect(() => {
    if (!profile?.couple_code) return undefined;
    const timer = setInterval(() => {
      loadCustomNames(profile.couple_code);
      loadPartnerAndMatches(profile);
    }, 12000);
    return () => clearInterval(timer);
  }, [profile]);

  const baseDatabase = useMemo(() => NAMES_DATABASE.map((item, index) => enrichEntry(item, index)), []);
  const customEntries = useMemo(() => customNames.map(mapCustomNameToEntry), [customNames]);

  const mergedDatabase = useMemo(() => {
    const map = new Map();
    baseDatabase.forEach((item) => map.set(normalizeNameKey(item.name), item));
    customEntries.forEach((item) => map.set(normalizeNameKey(item.name), item));
    return Array.from(map.values());
  }, [baseDatabase, customEntries]);

  const enhancedCount = useMemo(
    () => mergedDatabase.filter((item) => ["enhanced", "curated", "custom"].includes(item.enrichmentTier)).length,
    [mergedDatabase]
  );

  const randomNamePool = useMemo(() => shuffleArray(mergedDatabase.map((item) => item.name)), [mergedDatabase]);

  const randomRank = useMemo(() => {
    const rank = {};
    randomNamePool.forEach((nameValue, index) => {
      rank[nameValue] = index;
    });
    return rank;
  }, [randomNamePool]);

  const namesMap = useMemo(() => Object.fromEntries(mergedDatabase.map((n) => [n.name, n])), [mergedDatabase]);

  const allStyles = useMemo(() => [...new Set(mergedDatabase.flatMap((n) => n.styles || []))].sort(), [mergedDatabase]);
  const allOrigins = useMemo(() => [...new Set(mergedDatabase.map((n) => n.origin).filter(Boolean))].sort(), [mergedDatabase]);
  const allVibes = useMemo(() => [...new Set(mergedDatabase.map((n) => n.vibe).filter(Boolean))].sort(), [mergedDatabase]);

  const favoriteNames = useMemo(() => randomNamePool.filter((n) => votes[n] === "yes" || votes[n] === "love"), [votes, randomNamePool]);
  const matchedNames = useMemo(() => randomNamePool.filter((n) => isPositiveVote(votes[n]) && isPositiveVote(partnerVotes[n])), [votes, partnerVotes, randomNamePool]);

  const filteredNamePool = useMemo(() => {
    const basePool = deckFilter === "favorites" ? favoriteNames : deckFilter === "matches" ? matchedNames : randomNamePool;
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
  const likedMeta = useMemo(() => randomNamePool.filter((n) => votes[n] === "yes" || votes[n] === "love").map((n) => ({ ...namesMap[n], weight: votes[n] === "love" ? 2.2 : 1 })), [votes, randomNamePool, namesMap]);
  const dislikedMeta = useMemo(() => randomNamePool.filter((n) => votes[n] === "no").map((n) => ({ ...namesMap[n], penaltyWeight: 1 })), [votes, randomNamePool, namesMap]);

  const smartSuggestions = useMemo(() => {
    const initial = exploreInitial.trim().toUpperCase();
    let candidates = mergedDatabase.filter((item) => !votes[item.name]);
    if (exploreStyle !== "all") candidates = candidates.filter((item) => item.styles?.includes(exploreStyle));
    if (exploreOrigin !== "all") candidates = candidates.filter((item) => item.origin === exploreOrigin);
    if (exploreVibe !== "all") candidates = candidates.filter((item) => item.vibe === exploreVibe);
    if (initial) candidates = candidates.filter((item) => item.initial === initial);

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
        return { name: nameValue, myVote, partnerVote, meta, ...tier, why: getMatchReason(meta) };
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
    const names = smartSuggestions.map((item) => item.name);
    setPriorityNames(names);
    setCurrentSection("deck");
    setMessage("I nuovi suggerimenti sono stati messi in cima al deck.");
  }

  function clearPriorityQueue() {
    setPriorityNames([]);
    setMessage("Priorità svuotata: il deck torna all’ordine random standard.");
  }

  function queueSpecificName(nameValue, infoMessage) {
    setPriorityNames((prev) => [nameValue, ...prev.filter((item) => item !== nameValue)]);
    setDeckFilter("all");
    setCurrentSection("deck");
    if (infoMessage) setMessage(infoMessage);
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
    } catch (err) {
      setMessage("Errore inatteso: " + err.message);
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
      const { data, error } = await supabase.from("profiles").insert({ name: name.trim(), couple_code: coupleCode }).select().single();
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
      setCustomNames([]);
      setCurrentSection("deck");
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
      const { data: existingProfiles, error: checkError } = await supabase.from("profiles").select("id, couple_code").eq("couple_code", normalizedCode).limit(1);
      if (checkError) {
        setMessage("Errore controllo codice: " + checkError.message);
        return;
      }
      if (!existingProfiles || existingProfiles.length === 0) {
        setMessage("Codice coppia non trovato");
        return;
      }
      const { data, error } = await supabase.from("profiles").insert({ name: name.trim(), couple_code: normalizedCode }).select().single();
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
      setCustomNames([]);
      setCurrentSection("deck");
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
      const { error } = await supabase.from("votes").upsert({ profile_id: profile.id, baby_name: currentName, vote: voteType }, { onConflict: "profile_id,baby_name" });
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

  async function saveManualName() { {
    if (!profile?.id || !profile?.couple_code) return;
    const cleanName = titleCase(manualName);
    if (!cleanName) {
      setMessage("Inserisci un nome da aggiungere");
      return;
    }
    const duplicate = mergedDatabase.find((item) => normalizeNameKey(item.name) === normalizeNameKey(cleanName));
    if (duplicate) {
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
    } catch (err) {
      setMessage("Errore inatteso: " + err.message);
    } finally {
      setManualSaving(false);
    }
  }

  async function refreshAllData() {
    if (!profile) return;
    await Promise.all([
      loadPartnerAndMatches(profile),
      loadCustomNames(profile.couple_code),
      loadVotes(profile.id),
    ]);
    setMessage("Dati sincronizzati");
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
    setCustomNames([]);
    setPriorityNames([]);
    setName("");
    setJoinCode("");
    setCurrentSection("deck");
    setMessage("Profilo scollegato da questo dispositivo");
  }

  const renderDeckPanel = () => (
    <div className="deck-panel hover-lift" style={cardStyle({ padding: 22, background: "linear-gradient(180deg, #ffffff 0%, #fcfcff 100%)" })}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 14 }}>
        <div>
          <h2 style={{ margin: 0 }}>Scelta del nome</h2>
          <p style={{ margin: "6px 0 0 0", color: COLORS.muted, fontSize: 14 }}>Solo la sezione principale del deck, con layout fisso e pulsanti sempre nella stessa posizione.</p>
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
        <div style={{ position: "relative", borderRadius: 30, padding: 24, background: `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.primary2} 56%, ${COLORS.primary3} 100%)`, color: "white", height: 560, display: "flex", flexDirection: "column", justifyContent: "space-between", boxShadow: "0 24px 50px rgba(124,58,237,0.24)", overflow: "hidden" }}>
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at top right, rgba(255,255,255,0.30), transparent 35%)" }} />
          <div style={{ position: "absolute", right: -40, bottom: -56, width: 180, height: 180, borderRadius: "50%", background: "rgba(255,255,255,0.14)" }} />

          <div style={{ position: "relative", display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <div style={badgeStyle("rgba(255,255,255,0.18)", "#fff")}>Nome {currentIndex + 1} di {filteredNamePool.length}</div>
            <div className="chip-wrap">
              {priorityNames.includes(currentName) ? <span style={badgeStyle("rgba(255,255,255,0.18)", "#fff")}>Suggerito per te</span> : null}
              <span style={badgeStyle("rgba(255,255,255,0.18)", "#fff")}>{currentMeta.origin}</span>
              <span style={badgeStyle("rgba(255,255,255,0.18)", "#fff")}>{currentMeta.isCustom ? "custom" : currentMeta.enrichmentTier}</span>
            </div>
          </div>

          <div style={{ position: "relative", display: "flex", flexDirection: "column", justifyContent: "center", flex: 1, minHeight: 220 }}>
            <p style={{ opacity: 0.82, marginBottom: 8 }}>Nome</p>
            <h2 className="name-link" onClick={() => openNameDetail(currentName, currentMeta.isCustom ? "Nome aggiunto manualmente dalla coppia." : "Nome visualizzato nel deck principale.")} style={{ fontSize: 58, marginTop: 0, marginBottom: 14, lineHeight: 1.05 }}>{currentName}</h2>
            <div className="chip-wrap">
              {[...(currentMeta.styles || []).slice(0, 3), currentMeta.vibe].filter(Boolean).map((label) => (
                <span key={label} style={badgeStyle("rgba(255,255,255,0.18)", "#fff")}>{label}</span>
              ))}
            </div>
          </div>

          <div style={{ position: "relative" }}>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
              <button onClick={() => openNameDetail(currentName, currentMeta.isCustom ? "Scheda del nome personalizzato." : "Scheda completa del nome selezionato.")} style={{ ...buttonStyle("secondary"), background: "rgba(255,255,255,0.95)", border: "none" }}>Apri scheda nome</button>
              <button onClick={() => queueSpecificName(currentName, `${currentName} rimesso in cima alla coda di scelta.`)} style={{ ...buttonStyle("secondary"), background: "rgba(255,255,255,0.18)", color: "#fff", border: "1px solid rgba(255,255,255,0.25)" }}>Rivedi dopo</button>
            </div>
            <div className="deck-actions">
              <button onClick={() => handleVote("no")} disabled={voteSaving} style={{ ...buttonStyle("no"), width: "100%" }}>{voteSaving ? "Salvataggio..." : "👎 No"}</button>
              <button onClick={() => handleVote("yes")} disabled={voteSaving} style={{ ...buttonStyle("yes"), width: "100%" }}>{voteSaving ? "Salvataggio..." : "👍 Sì"}</button>
              <button onClick={() => handleVote("love")} disabled={voteSaving} style={{ ...buttonStyle("love"), width: "100%", background: "#fff", color: COLORS.primary, border: "none" }}>{voteSaving ? "Salvataggio..." : "💜 Adoro"}</button>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ textAlign: "center", padding: 30, borderRadius: 24, background: COLORS.slateSoft, border: `1px solid ${COLORS.border}` }}>
          <h2 style={{ marginBottom: 8 }}>Hai finito il deck 🎉</h2>
          <p style={{ color: COLORS.muted, marginTop: 0 }}>Usa il menu in alto a destra per aprire altre schede o aggiungere un nome manuale.</p>
        </div>
      )}
    </div>
  );

  const renderMatchesPanel = () => (
    <div className="hover-lift" style={cardStyle({ background: intelligentMatches.length ? "linear-gradient(180deg, #f0fdf4 0%, #ffffff 100%)" : "#ffffff" })}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}><h2 style={{ margin: 0 }}>Match di coppia</h2>{partner ? <div style={badgeStyle(COLORS.primarySoft, COLORS.primary)}>Partner: {partner.name}</div> : null}</div>
      {matchLoading ? <p style={{ color: COLORS.muted, marginTop: 12 }}>Caricamento match...</p> : !partner ? <div style={{ marginTop: 12 }}><p style={{ marginBottom: 8 }}><strong>Nessun partner collegato ancora.</strong></p><p style={{ color: COLORS.muted, marginTop: 0 }}>Condividi il tuo codice coppia: <strong>{profile.couple_code}</strong></p></div> : intelligentMatches.length === 0 ? <p style={{ color: COLORS.muted, marginTop: 12 }}>Per ora nessun match positivo.</p> : <><div style={{ marginTop: 12, marginBottom: 14, padding: 16, borderRadius: 18, background: "rgba(34,197,94,0.08)", border: "1px solid #bbf7d0" }}><p style={{ margin: 0, color: COLORS.muted, fontSize: 14 }}>Compatibilità percepita</p><h3 style={{ marginTop: 8, marginBottom: 0, fontSize: 34 }}>{clamp(48 + intelligentMatches.reduce((acc, item) => acc + item.weight * 9, 0), 0, 99)}%</h3></div><div style={{ display: "grid", gap: 10 }}>{intelligentMatches.slice(0, 10).map((item) => <button key={item.name} onClick={() => openNameDetail(item.name, `${item.tier}. ${item.why}`)} style={{ ...cardStyle({ padding: 12, cursor: "pointer", background: item.bg || COLORS.slateSoft, border: `1px solid ${COLORS.border}` }), textAlign: "left" }}><div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}><strong>{item.name}</strong><span style={badgeStyle(item.bg, item.color)}>{item.tier}</span></div><div style={{ color: COLORS.muted, fontSize: 13, marginTop: 6 }}>{item.why}</div><div className="chip-wrap" style={{ marginTop: 8 }}><span style={voteBadgeStyle(item.myVote)}>tu: {item.myVote}</span><span style={voteBadgeStyle(item.partnerVote)}>partner: {item.partnerVote}</span></div></button>)}</div></>}
    </div>
  );

  const renderCatalogPanel = () => (
    <div className="hover-lift" style={cardStyle()}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}><h2 style={{ margin: 0 }}>Catalogo smart</h2><div style={badgeStyle(COLORS.primarySoft, COLORS.primary)}>{smartSuggestions.length} suggerimenti</div></div>
      <p style={{ color: COLORS.muted, marginTop: 10 }}>Filtra il catalogo e aggiorna la coda dei nomi suggeriti.</p>
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
  );

  const renderSuggestionsPanel = () => (
    <div className="hover-lift" style={cardStyle()}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}><h2 style={{ marginTop: 0, marginBottom: 0 }}>Suggeriti per te</h2><div style={badgeStyle(COLORS.greenSoft, COLORS.green)}>{smartSuggestions.length}</div></div>
      {smartSuggestions.length === 0 ? <p style={{ color: COLORS.muted }}>Inizia a votare per ricevere suggerimenti personalizzati.</p> : <div style={{ display: "grid", gap: 10, marginTop: 12 }}>{smartSuggestions.map((item) => <button key={item.name} onClick={() => openNameDetail(item.name, item.why)} style={{ ...cardStyle({ padding: 12, cursor: "pointer", background: COLORS.slateSoft, border: `1px solid ${COLORS.border}` }), textAlign: "left" }}><div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}><strong>{item.name}</strong><span style={badgeStyle(COLORS.primarySoft, COLORS.primary)}>{item.vibe}</span></div><div style={{ fontSize: 13, color: COLORS.muted, marginTop: 6 }}>{item.why}</div><div style={{ marginTop: 8 }}><button onClick={(e) => { e.stopPropagation(); queueSpecificName(item.name, `${item.name} aggiunto in cima al deck.`); }} style={buttonStyle("secondary")}>Manda nel deck</button></div></button>)}</div>}
    </div>
  );

  const renderSimilarPanel = () => (
    <div className="hover-lift" style={cardStyle()}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}><h2 style={{ marginTop: 0, marginBottom: 0 }}>Nomi simili a questo</h2><div style={badgeStyle(COLORS.blueSoft, COLORS.blue)}>{similarToCurrent.length}</div></div>
      {!currentMeta ? <p style={{ color: COLORS.muted }}>Seleziona o raggiungi un nome nel deck.</p> : <div style={{ display: "grid", gap: 10, marginTop: 12 }}>{similarToCurrent.map((item) => <button key={item.name} onClick={() => openNameDetail(item.name, item.why)} style={{ ...cardStyle({ padding: 12, cursor: "pointer", background: COLORS.slateSoft, border: `1px solid ${COLORS.border}` }), textAlign: "left" }}><div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}><strong>{item.name}</strong><span style={badgeStyle(COLORS.primarySoft, COLORS.primary)}>{item.vibe}</span></div><div style={{ fontSize: 13, color: COLORS.muted, marginTop: 6 }}>{item.why}</div></button>)}</div>}
    </div>
  );

  const renderFavoritesPanel = () => (
    <div className="hover-lift" style={cardStyle()}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}><h2 style={{ marginTop: 0, marginBottom: 0 }}>Preferiti</h2><div style={badgeStyle(COLORS.greenSoft, COLORS.green)}>{favoriteNames.length}</div></div>
      {favoriteNames.length === 0 ? <p style={{ color: COLORS.muted }}>Ancora nessun preferito.</p> : <div className="chip-wrap" style={{ marginTop: 12 }}>{favoriteNames.map((nameValue) => <button key={nameValue} onClick={() => openNameDetail(nameValue, votes[nameValue] === "love" ? "Questo nome è nei tuoi top assoluti." : "Questo nome è tra i tuoi preferiti.")} style={{ ...badgeStyle(votes[nameValue] === "love" ? COLORS.primarySoft : COLORS.greenSoft, votes[nameValue] === "love" ? COLORS.primary : COLORS.green), border: "none", cursor: "pointer" }}>{nameValue}</button>)}</div>}
    </div>
  );

  const renderRecentPanel = () => (
    <div className="hover-lift" style={cardStyle()}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}><h2 style={{ marginTop: 0, marginBottom: 0 }}>Ultimi voti</h2><div style={badgeStyle(COLORS.blueSoft, COLORS.blue)}>{recentVotes.length}</div></div>
      {recentVotes.length === 0 ? <p style={{ color: COLORS.muted }}>I tuoi ultimi voti appariranno qui.</p> : <div style={{ display: "grid", gap: 10, marginTop: 12 }}>{recentVotes.map((item) => <button key={item.babyName} onClick={() => openNameDetail(item.babyName, `Ultimo voto registrato: ${item.vote}.`)} style={{ ...cardStyle({ padding: 12, cursor: "pointer", background: COLORS.slateSoft, border: `1px solid ${COLORS.border}` }), display: "flex", justifyContent: "space-between", alignItems: "center" }}><span style={{ fontWeight: 600 }}>{item.babyName}</span><span style={voteBadgeStyle(item.vote)}>{item.vote}</span></button>)}</div>}
    </div>
  );

  const renderManualPanel = () => (
    <div className="hover-lift" style={cardStyle()}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <h2 style={{ margin: 0 }}>Aggiungi nome manuale</h2>
        <div className="chip-wrap">
          <span style={badgeStyle(COLORS.primarySoft, COLORS.primary)}>{customNames.length} nomi custom</span>
          <span style={badgeStyle(COLORS.blueSoft, COLORS.blue)}>sync coppia attiva</span>
        </div>
      </div>
      <p style={{ color: COLORS.muted, marginTop: 10 }}>Il nome viene salvato su Supabase per il vostro <strong>couple_code</strong>, quindi apparirà anche nel deck del partner collegato. Dopo il salvataggio lo metto automaticamente in cima alla tua coda di scelta.</p>
      <div className="secondary-grid">
        <div style={cardStyle({ background: COLORS.slateSoft })}>
          <label style={{ display: "block", marginBottom: 6, color: COLORS.muted, fontSize: 14 }}>Nome</label>
          <input type="text" placeholder="Es. Bianca" value={manualName} onChange={(e) => setManualName(e.target.value)} style={{ ...inputStyle, marginBottom: 12 }} />
          <label style={{ display: "block", marginBottom: 6, color: COLORS.muted, fontSize: 14 }}>Origine / provenienza</label>
          <input type="text" placeholder="Es. Italiano, dal germanico..." value={manualOrigin} onChange={(e) => setManualOrigin(e.target.value)} style={{ ...inputStyle, marginBottom: 12 }} />
          <label style={{ display: "block", marginBottom: 6, color: COLORS.muted, fontSize: 14 }}>Vibe</label>
          <select value={manualVibe} onChange={(e) => setManualVibe(e.target.value)} style={{ ...inputStyle, marginBottom: 12 }}>
            {VIBE_OPTIONS.map((vibe) => <option key={vibe} value={vibe}>{vibe}</option>)}
          </select>
          <label style={{ display: "block", marginBottom: 6, color: COLORS.muted, fontSize: 14 }}>Significato / nota</label>
          <textarea placeholder="Es. Nome di gusto italiano, luminoso e senza tempo..." value={manualMeaning} onChange={(e) => setManualMeaning(e.target.value)} style={textareaStyle} />
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
            <button onClick={saveManualName} disabled={manualSaving} style={buttonStyle("primary")}>{manualSaving ? "Salvataggio..." : "Salva nome"}</button>
            <button onClick={() => { setManualName(""); setManualMeaning(""); setManualOrigin(""); setManualVibe("elegante"); }} style={buttonStyle("secondary")}>Pulisci</button>
          </div>
        </div>
        <div style={cardStyle({ background: COLORS.slateSoft })}>
          <h3 style={{ marginTop: 0 }}>Nomi manuali della coppia</h3>
          {customNamesLoading ? <p style={{ color: COLORS.muted }}>Caricamento nomi personalizzati...</p> : customEntries.length === 0 ? <p style={{ color: COLORS.muted }}>Ancora nessun nome aggiunto manualmente.</p> : <div style={{ display: "grid", gap: 10 }}>{customEntries.map((item) => <button key={item.name} onClick={() => openNameDetail(item.name, "Nome aggiunto manualmente dalla coppia.")} style={{ ...cardStyle({ padding: 12, cursor: "pointer", background: "#fff" }), textAlign: "left" }}><div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}><strong>{item.name}</strong><span style={badgeStyle(COLORS.amberSoft, COLORS.amber)}>custom</span></div><div style={{ color: COLORS.muted, fontSize: 13, marginTop: 6 }}>{item.origin}</div><div style={{ marginTop: 8 }}><button onClick={(e) => { e.stopPropagation(); queueSpecificName(item.name, `${item.name} rimesso in cima al deck.`); }} style={buttonStyle("secondary")}>Vai a votarlo</button></div></button>)}</div>}
        </div>
      </div>
    </div>
  );

  const renderActionsPanel = () => (
    <div className="hover-lift" style={cardStyle()}>
      <h2 style={{ marginTop: 0 }}>Azioni rapide</h2>
      <div style={{ display: "grid", gap: 10 }}>
        <button onClick={refreshAllData} style={buttonStyle("secondary")}>Sincronizza dati coppia</button>
        <button onClick={resetMyVotes} disabled={voteSaving} style={buttonStyle("warning")}>Azzera i miei voti</button>
        <button onClick={() => { setDeckFilter("all"); setMessage("Filtro deck resettato"); setCurrentSection("deck"); }} style={buttonStyle("secondary")}>Reset filtri deck</button>
        {priorityNames.length > 0 ? <button onClick={clearPriorityQueue} style={buttonStyle("secondary")}>Svuota priorità</button> : null}
      </div>
      <p style={{ color: COLORS.muted, fontSize: 13, marginTop: 12, marginBottom: 0 }}>Il reset cancella solo i tuoi voti, non quelli del partner. I nomi manuali restano disponibili per la coppia.</p>
    </div>
  );

  function renderCurrentSection() {
    switch (currentSection) {
      case "matches":
        return renderMatchesPanel();
      case "catalog":
        return renderCatalogPanel();
      case "suggestions":
        return renderSuggestionsPanel();
      case "similar":
        return renderSimilarPanel();
      case "favorites":
        return renderFavoritesPanel();
      case "recent":
        return renderRecentPanel();
      case "manual":
        return renderManualPanel();
      case "actions":
        return renderActionsPanel();
      case "deck":
      default:
        return renderDeckPanel();
    }
  }

  return (
    <div style={pageStyle()}>
      <style>{`*{box-sizing:border-box}.app-shell{max-width:1200px;margin:0 auto}.stats-grid{display:grid;gap:14px;grid-template-columns:repeat(auto-fit,minmax(220px,1fr))}.content-grid{display:grid;gap:20px}.secondary-grid{display:grid;gap:20px;grid-template-columns:repeat(auto-fit,minmax(280px,1fr))}.stack-grid{display:grid;gap:20px}.auth-grid{display:grid;gap:18px;grid-template-columns:repeat(auto-fit,minmax(320px,1fr))}.deck-actions{display:grid;gap:12px;grid-template-columns:repeat(3,minmax(0,1fr))}.chip-wrap{display:flex;gap:8px;flex-wrap:wrap}.hover-lift{transition:transform .2s ease,box-shadow .2s ease}.hover-lift:hover{transform:translateY(-2px);box-shadow:0 14px 34px rgba(71,56,135,.10)}.message-bar{position:sticky;bottom:14px;z-index:20}.name-link{cursor:pointer}.name-link:hover{opacity:.85}.modal-backdrop{position:fixed;inset:0;background:${COLORS.darkOverlay};display:flex;align-items:center;justify-content:center;padding:20px;z-index:50}.modal-card{max-width:760px;width:100%;max-height:90vh;overflow:auto}@media (max-width:980px){.secondary-grid{grid-template-columns:1fr}}@media (max-width:640px){.deck-actions{grid-template-columns:1fr}}`}</style>

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
                  <span style={badgeStyle(COLORS.amberSoft, COLORS.amber)}>{detailEntry.isCustom ? "custom" : detailEntry.enrichmentTier}</span>
                </div>
              </div>
              <button onClick={closeNameDetail} style={buttonStyle("secondary")}>Chiudi</button>
            </div>

            {selectedContext ? <div style={{ ...cardStyle({ padding: 12, marginBottom: 14, background: COLORS.slateSoft }) }}><strong>Perché lo vedi qui:</strong><div style={{ color: COLORS.muted, marginTop: 6 }}>{selectedContext}</div></div> : null}
            <div className="secondary-grid">
              <div style={cardStyle({ background: COLORS.slateSoft })}><h3 style={{ marginTop: 0 }}>Significato</h3><p style={{ marginBottom: 0, lineHeight: 1.6 }}>{detailEntry.meaning}</p></div>
              <div style={cardStyle({ background: COLORS.slateSoft })}><h3 style={{ marginTop: 0 }}>Origine</h3><p style={{ marginBottom: 0, lineHeight: 1.6 }}>{detailEntry.longOrigin || detailEntry.origin}</p></div>
            </div>
            <div className="secondary-grid" style={{ marginTop: 16 }}>
              <div style={cardStyle({ background: COLORS.slateSoft })}><h3 style={{ marginTop: 0 }}>Stile e tag</h3><div className="chip-wrap">{(detailEntry.styles || []).map((style) => <span key={style} style={badgeStyle(COLORS.primarySoft, COLORS.primary)}>{style}</span>)}{(detailEntry.tags || []).map((tag) => <span key={tag} style={badgeStyle(COLORS.greenSoft, COLORS.green)}>{tag}</span>)}</div></div>
              <div style={cardStyle({ background: COLORS.slateSoft })}><h3 style={{ marginTop: 0 }}>Nomi simili</h3><div style={{ display: "grid", gap: 8 }}>{detailSimilar.map((item) => <button key={item.name} onClick={() => openNameDetail(item.name, item.why)} style={{ ...cardStyle({ padding: 12, cursor: "pointer", background: "#fff" }), textAlign: "left" }}><strong>{item.name}</strong><div style={{ color: COLORS.muted, fontSize: 13, marginTop: 4 }}>{item.why}</div></button>)}</div></div>
            </div>
          </div>
        </div>
      ) : null}

      {checkingSession ? (
        <div className="app-shell"><h1>Il Nome Perfetto</h1><p style={{ color: COLORS.muted }}>Caricamento profilo...</p></div>
      ) : !profile ? (
        <div className="app-shell" style={{ maxWidth: 780 }}>
          <div className="hover-lift" style={cardStyle({ padding: 28, marginBottom: 20, background: `linear-gradient(135deg, ${COLORS.primarySoft} 0%, #ffffff 100%)` })}>
            <div style={badgeStyle(COLORS.primarySoft, COLORS.primary)}>✨ v12 UX split + manual names</div>
            <h1 style={{ fontSize: 38, marginBottom: 10 }}>Il Nome Perfetto</h1>
            <p style={{ color: COLORS.muted, fontSize: 16, lineHeight: 1.6, marginBottom: 0 }}>Home page pulita con solo la scelta del nome, menu a tendina in alto a destra per tutte le altre schede e nomi personalizzati condivisi nella coppia.</p>
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
            <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", alignItems: "flex-start" }}>
              <div>
                <div style={{ ...badgeStyle(COLORS.primarySoft, COLORS.primary), marginBottom: 12 }}>📚 Smart catalog attivo</div>
                <h1 style={{ margin: 0, fontSize: 34 }}>Il Nome Perfetto</h1>
                <p style={{ color: COLORS.muted, marginBottom: 0 }}>Ciao <strong>{profile.name}</strong> — coppia <strong>{profile.couple_code}</strong> — catalogo totale: <strong>{mergedDatabase.length}</strong> nomi — personalizzati: <strong>{customNames.length}</strong></p>
              </div>
              <div style={{ display: "grid", gap: 10, minWidth: 250 }}>
                <select value={currentSection} onChange={(e) => setCurrentSection(e.target.value)} style={inputStyle}>
                  {TOP_MENU_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
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

          {currentSection === "deck" ? renderDeckPanel() : <div className="content-grid">{renderCurrentSection()}</div>}

          {message ? <div className="message-bar" style={{ ...cardStyle({ marginTop: 20, padding: 14 }) }}><span style={{ color: COLORS.muted }}>{message}</span></div> : null}
        </div>
      )}
    </div>
  );
}
