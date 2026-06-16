import React, { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "./lib/supabase";
import { dedupeStrings, generateCoupleCode, normalizeProfile } from "./lib/helpers";

const LOCAL_PROFILE_KEY = "baby_names_profile_id_v2";

export default function App() {
  const [loadingApp, setLoadingApp] = useState(true);
  const [profile, setProfile] = useState(null);
  const [partnerProfile, setPartnerProfile] = useState(null);

  const [setupMode, setSetupMode] = useState("create");
  const [nameInput, setNameInput] = useState("");
  const [coupleCodeInput, setCoupleCodeInput] = useState("");
  const [status, setStatus] = useState("");

  const [keyword, setKeyword] = useState("");
  const [loadingNames, setLoadingNames] = useState(false);
  const [names, setNames] = useState([]);
  const [index, setIndex] = useState(0);
  const [showMeaning, setShowMeaning] = useState(false);

  const [matches, setMatches] = useState([]);
  const [newMatchBanner, setNewMatchBanner] = useState("");

  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startX = useRef(null);

  const current = names[index] || null;

  useEffect(() => {
    bootstrap();
  }, []);

  async function bootstrap() {
    setLoadingApp(true);
    const savedId = localStorage.getItem(LOCAL_PROFILE_KEY);
    if (!savedId) {
      setLoadingApp(false);
      return;
    }

    const myProfile = await loadProfileById(savedId);
    if (myProfile) {
      setProfile(myProfile);
      const partner = await loadPartnerByCode(myProfile.coupleCode, myProfile.id);
      setPartnerProfile(partner);
      setMatches(computeMatches(myProfile, partner));
    }

    setLoadingApp(false);
  }

  async function loadProfileById(id) {
    const { data, error } = await supabase.from("profiles").select("*").eq("id", id).single();
    if (error || !data) return null;
    return normalizeProfile(data);
  }

  async function loadPartnerByCode(coupleCode, myId) {
    if (!coupleCode || !myId) return null;
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("couple_code", coupleCode)
      .neq("id", myId)
      .limit(1);

    if (error || !data || data.length === 0) return null;
    return normalizeProfile(data[0]);
  }

  function computeMatches(myProfile, partner) {
    if (!myProfile || !partner) return [];
    const myChoices = new Set([...(myProfile.liked || []), ...(myProfile.loved || [])]);
    const partnerChoices = new Set([...(partner.liked || []), ...(partner.loved || [])]);
    return Array.from(myChoices).filter((name) => partnerChoices.has(name));
  }

  async function createProfile() {
    setStatus("");
    const cleanName = nameInput.trim();
    if (!cleanName) {
      setStatus("Inserisci il tuo nome");
      return;
    }

    const code = generateCoupleCode();
    const { data, error } = await supabase
      .from("profiles")
      .insert({
        name: cleanName,
        couple_code: code,
        partner_name: null,
        liked_names: [],
        loved_names: [],
        disliked_names: []
      })
      .select()
      .single();

    if (error) {
      setStatus("Errore Supabase: " + error.message);
      return;
    }

    localStorage.setItem(LOCAL_PROFILE_KEY, data.id);
    const normalized = normalizeProfile(data);
    setProfile(normalized);
    setPartnerProfile(null);
    setMatches([]);
    setStatus("✅ Profilo creato. Il tuo codice coppia è: " + code);
  }

  async function joinCouple() {
    setStatus("");
    const cleanName = nameInput.trim();
    const code = coupleCodeInput.trim().toUpperCase();

    if (!cleanName) {
      setStatus("Inserisci il tuo nome");
      return;
    }
    if (code.length !== 6) {
      setStatus("Codice coppia non valido");
      return;
    }

    const { data: existing, error: existingError } = await supabase
      .from("profiles")
      .select("*")
      .eq("couple_code", code)
      .limit(1);

    if (existingError || !existing || existing.length === 0) {
      setStatus("Codice coppia non trovato");
      return;
    }

    const partner = normalizeProfile(existing[0]);

    const { data, error } = await supabase
      .from("profiles")
      .insert({
        name: cleanName,
        couple_code: code,
        partner_name: partner.name,
        liked_names: [],
        loved_names: [],
        disliked_names: []
      })
      .select()
      .single();

    if (error) {
      setStatus("Errore Supabase: " + error.message);
      return;
    }

    await supabase.from("profiles").update({ partner_name: cleanName }).eq("id", partner.id);

    localStorage.setItem(LOCAL_PROFILE_KEY, data.id);
    const normalized = normalizeProfile(data);
    setProfile(normalized);
    setPartnerProfile(partner);
    setMatches([]);
    setStatus("✅ Collegamento partner completato");
  }

  async function refreshPartnerAndMatches(nextProfile = null) {
    const activeProfile = nextProfile || profile;
    if (!activeProfile) return;
    const freshPartner = await loadPartnerByCode(activeProfile.coupleCode, activeProfile.id);
    setPartnerProfile(freshPartner);
    setMatches(computeMatches(activeProfile, freshPartner));
    return freshPartner;
  }

  async function generateNames() {
    if (!profile) return;
    setLoadingNames(true);
    setStatus("");

    try {
      const response = await fetch("/api/generate-names", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keyword,
          myProfile: profile,
          partnerProfile
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.details || data?.error || "Errore generazione nomi");
      }

      setNames(data.names || []);
      setIndex(0);
      setShowMeaning(false);
      setNewMatchBanner("");
    } catch (error) {
      setStatus("Errore AI: " + error.message);
    } finally {
      setLoadingNames(false);
    }
  }

  async function saveVote(voteType) {
    if (!profile || !current) return;

    const liked = new Set(profile.liked || []);
    const loved = new Set(profile.loved || []);
    const disliked = new Set(profile.disliked || []);

    if (voteType === "liked") {
      liked.add(current.name);
      disliked.delete(current.name);
    }
    if (voteType === "loved") {
      liked.add(current.name);
      loved.add(current.name);
      disliked.delete(current.name);
    }
    if (voteType === "disliked") {
      disliked.add(current.name);
      liked.delete(current.name);
      loved.delete(current.name);
    }

    const patch = {
      liked_names: dedupeStrings(Array.from(liked)),
      loved_names: dedupeStrings(Array.from(loved)),
      disliked_names: dedupeStrings(Array.from(disliked))
    };

    const { error } = await supabase.from("profiles").update(patch).eq("id", profile.id);

    if (error) {
      setStatus("Errore salvataggio voto: " + error.message);
      return;
    }

    const updatedProfile = {
      ...profile,
      liked: patch.liked_names,
      loved: patch.loved_names,
      disliked: patch.disliked_names
    };
    setProfile(updatedProfile);

    const freshPartner = await refreshPartnerAndMatches(updatedProfile);
    const automaticMatches = computeMatches(updatedProfile, freshPartner);
    if (voteType !== "disliked" && automaticMatches.includes(current.name)) {
      setNewMatchBanner("💞 Match automatico trovato: " + current.name);
    } else {
      setNewMatchBanner("");
    }

    setShowMeaning(false);
    if (index + 1 < names.length) {
      setIndex(index + 1);
      setDragX(0);
    } else {
      setStatus("✅ Sessione finita. Puoi generare altri nomi o vedere i match.");
      setNames([]);
      setIndex(0);
    }
  }

  function startSwipe(clientX) {
    startX.current = clientX;
    setIsDragging(true);
  }

  function moveSwipe(clientX) {
    if (!isDragging || startX.current === null) return;
    setDragX(clientX - startX.current);
  }

  function endSwipe() {
    if (!isDragging) return;
    setIsDragging(false);
    if (dragX > 80) saveVote("liked");
    else if (dragX < -80) saveVote("disliked");
    else setDragX(0);
    startX.current = null;
  }

  function logoutLocal() {
    localStorage.removeItem(LOCAL_PROFILE_KEY);
    setProfile(null);
    setPartnerProfile(null);
    setNames([]);
    setMatches([]);
    setStatus("");
    setNameInput("");
    setCoupleCodeInput("");
  }

  const totalFavorites = useMemo(() => {
    return (profile?.liked?.length || 0) + (profile?.loved?.length || 0);
  }, [profile]);

  if (loadingApp) {
    return <div className="container"><div className="card"><h1>Caricamento…</h1></div></div>;
  }

  return (
    <div className="container">
      <div className="card">
        <h1>Il Nome Perfetto</h1>
        <p className="subtitle">Versione 2: coppia, match automatici, AI solo femminile</p>

        {!profile && (
          <div className="box">
            <div className="tabs">
              <button className={setupMode === "create" ? "tab active" : "tab"} onClick={() => setSetupMode("create")}>Crea profilo</button>
              <button className={setupMode === "join" ? "tab active" : "tab"} onClick={() => setSetupMode("join")}>Collega partner</button>
            </div>

            <input
              className="input"
              placeholder="Il tuo nome"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
            />

            {setupMode === "join" && (
              <input
                className="input"
                placeholder="Codice coppia"
                value={coupleCodeInput}
                onChange={(e) => setCoupleCodeInput(e.target.value.toUpperCase())}
                maxLength={6}
              />
            )}

            {setupMode === "create" ? (
              <button className="primaryBtn" onClick={createProfile}>Crea profilo</button>
            ) : (
              <button className="primaryBtn" onClick={joinCouple}>Collega partner</button>
            )}
          </div>
        )}

        {profile && (
          <>
            <div className="box">
              <div><strong>Profilo:</strong> {profile.name}</div>
              <div><strong>Codice coppia:</strong> {profile.coupleCode}</div>
              <div><strong>Partner:</strong> {partnerProfile ? partnerProfile.name : "non collegato ancora"}</div>
              <div><strong>Preferiti totali:</strong> {totalFavorites}</div>
              <div><strong>Match automatici:</strong> {matches.length}</div>
              <div className="buttonRow">
                <button className="secondaryBtn" onClick={() => navigator.clipboard.writeText(profile.coupleCode)}>Copia codice</button>
                <button className="secondaryBtn" onClick={() => refreshPartnerAndMatches()}>Aggiorna partner</button>
                <button className="secondaryBtn" onClick={logoutLocal}>Logout locale</button>
              </div>
            </div>

            <div className="box">
              <label className="label">Filtro AI opzionale (es. moderno, elegante, anni 90)</label>
              <input
                className="input"
                placeholder="Scrivi un filtro opzionale"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
              />
              <button className="primaryBtn" onClick={generateNames} disabled={loadingNames}>
                {loadingNames ? "Generazione in corso…" : "Genera 20 nomi femminili con AI"}
              </button>
            </div>

            {newMatchBanner && <div className="matchBanner">{newMatchBanner}</div>}

            {names.length > 0 && current && (
              <div className="nameCard"
                style={{ transform: `translateX(${dragX}px) rotate(${dragX / 15}deg)` }}
                onMouseDown={(e) => startSwipe(e.clientX)}
                onMouseMove={(e) => moveSwipe(e.clientX)}
                onMouseUp={endSwipe}
                onMouseLeave={endSwipe}
                onTouchStart={(e) => startSwipe(e.touches[0].clientX)}
                onTouchMove={(e) => moveSwipe(e.touches[0].clientX)}
                onTouchEnd={endSwipe}
              >
                <div className="smallMuted">{index + 1} / {names.length}</div>
                <div className="origin">{current.origin}</div>
                <h2>{current.name}</h2>
                <button className="secondaryBtn" onClick={() => setShowMeaning(!showMeaning)}>
                  {showMeaning ? "Nascondi significato" : "Mostra significato"}
                </button>
                {showMeaning && <p className="meaning">{current.meaning}</p>}
                <div className="buttonRow center">
                  <button className="dangerBtn" onClick={() => saveVote("disliked")}>No</button>
                  <button className="goldBtn" onClick={() => saveVote("loved")}>Adoro</button>
                  <button className="successBtn" onClick={() => saveVote("liked")}>Sì</button>
                </div>
                <div className="smallMuted">Puoi anche trascinare la card a destra o sinistra</div>
              </div>
            )}

            {matches.length > 0 && (
              <div className="box">
                <h3>Match automatici di coppia</h3>
                <div className="chips">
                  {matches.map((name) => (
                    <span className="chip" key={name}>{name}</span>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {status && <p className="status">{status}</p>}
      </div>
    </div>
  );
}
