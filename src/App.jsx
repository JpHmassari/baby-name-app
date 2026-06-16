import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "./lib/supabase";
import { LOCAL_PROFILE_KEY, MOCK_NAMES, generateCoupleCode, normalizeProfile } from "./lib/helpers";

export default function App() {
  const [profile, setProfile] = useState(null);
  const [partner, setPartner] = useState(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [joinName, setJoinName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [message, setMessage] = useState("");
  const [view, setView] = useState("home");
  const [index, setIndex] = useState(0);
  const current = MOCK_NAMES[index];

  useEffect(() => {
    restoreProfile();
  }, []);

  async function restoreProfile() {
    const savedId = localStorage.getItem(LOCAL_PROFILE_KEY);
    if (!savedId) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase.from("profiles").select("*").eq("id", savedId).single();
    if (!error && data) {
      const p = normalizeProfile(data);
      setProfile(p);
      await loadPartner(p);
    }
    setLoading(false);
  }

  async function loadPartner(p) {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("couple_code", p.coupleCode)
      .neq("id", p.id)
      .limit(1);

    if (data && data.length > 0) setPartner(normalizeProfile(data[0]));
  }

  async function createProfile() {
    setMessage("");
    if (!name.trim()) {
      setMessage("Inserisci il tuo nome");
      return;
    }

    const coupleCode = generateCoupleCode();
    const { data, error } = await supabase.from("profiles").insert({
      name: name.trim(),
      couple_code: coupleCode,
      liked_names: [],
      loved_names: [],
      disliked_names: []
    }).select().single();

    if (error) {
      console.error(error);
      setMessage("Errore Supabase: " + error.message);
      return;
    }

    localStorage.setItem(LOCAL_PROFILE_KEY, data.id);
    const p = normalizeProfile(data);
    setProfile(p);
    setView("dashboard");
    setMessage("Profilo creato correttamente! Codice coppia: " + p.coupleCode);
  }

  async function joinCouple() {
    setMessage("");
    if (!joinName.trim() || !joinCode.trim()) {
      setMessage("Inserisci nome e codice coppia");
      return;
    }

    const code = joinCode.trim().toUpperCase();
    const { data: existing, error: lookupError } = await supabase
      .from("profiles")
      .select("*")
      .eq("couple_code", code)
      .limit(1);

    if (lookupError || !existing || existing.length === 0) {
      setMessage("Codice coppia non trovato");
      return;
    }

    const partnerRow = existing[0];

    const { data, error } = await supabase.from("profiles").insert({
      name: joinName.trim(),
      couple_code: code,
      partner_name: partnerRow.name,
      liked_names: [],
      loved_names: [],
      disliked_names: []
    }).select().single();

    if (error) {
      console.error(error);
      setMessage("Errore Supabase: " + error.message);
      return;
    }

    await supabase.from("profiles").update({ partner_name: joinName.trim() }).eq("id", partnerRow.id);

    localStorage.setItem(LOCAL_PROFILE_KEY, data.id);
    const p = normalizeProfile(data);
    setProfile(p);
    setPartner(normalizeProfile(partnerRow));
    setView("dashboard");
    setMessage("Collegamento completato con successo!");
  }

  async function vote(voteType) {
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
      liked_names: Array.from(liked),
      loved_names: Array.from(loved),
      disliked_names: Array.from(disliked)
    };

    const { error } = await supabase.from("profiles").update(patch).eq("id", profile.id);
    if (error) {
      console.error(error);
      setMessage("Errore salvataggio voto: " + error.message);
      return;
    }

    const updated = {
      ...profile,
      liked: patch.liked_names,
      loved: patch.loved_names,
      disliked: patch.disliked_names
    };
    setProfile(updated);
    setMessage("Preferenza salvata: " + current.name);

    if (index < MOCK_NAMES.length - 1) setIndex(index + 1);
    else setView("results");
  }

  async function refreshMatches() {
    if (!profile) return;
    await loadPartner(profile);
    setView("results");
  }

  const matches = useMemo(() => {
    if (!profile || !partner) return [];
    const mine = new Set([...(profile.liked || []), ...(profile.loved || [])]);
    const theirs = new Set([...(partner.liked || []), ...(partner.loved || [])]);
    return Array.from(mine).filter((name) => theirs.has(name));
  }, [profile, partner]);

  if (loading) return <div className="container"><h2>Caricamento...</h2></div>;

  if (!profile) {
    return (
      <div className="container">
        <h1>Il Nome Perfetto v3</h1>
        <div className="card">
          <h2>Crea il tuo profilo</h2>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Il tuo nome" />
          <button onClick={createProfile}>Crea profilo</button>
        </div>

        <div className="card">
          <h2>Hai già un codice coppia?</h2>
          <input value={joinName} onChange={(e) => setJoinName(e.target.value)} placeholder="Il tuo nome" />
          <input value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())} placeholder="Codice coppia" maxLength={6} />
          <button onClick={joinCouple}>Unisciti alla coppia</button>
        </div>

        {message && <p className="message">{message}</p>}
      </div>
    );
  }

  if (view === "dashboard") {
    return (
      <div className="container">
        <h1>Il Nome Perfetto v3</h1>
        <div className="card">
          <p><strong>Profilo:</strong> {profile.name}</p>
          <p><strong>Codice coppia:</strong> {profile.coupleCode}</p>
          <p><strong>Partner:</strong> {partner ? partner.name : "non ancora collegato"}</p>
          <p><strong>Like:</strong> {profile.liked.length} · <strong>Adoro:</strong> {profile.loved.length} · <strong>No:</strong> {profile.disliked.length}</p>
          <button onClick={() => navigator.clipboard.writeText(profile.coupleCode)}>Copia codice coppia</button>
          <button onClick={() => { setView("swipe"); setIndex(0); }}>Inizia a scegliere i nomi</button>
          <button onClick={refreshMatches}>Aggiorna risultati di coppia</button>
        </div>
        {message && <p className="message">{message}</p>}
      </div>
    );
  }

  if (view === "swipe") {
    return (
      <div className="container">
        <h1>Il Nome Perfetto v3</h1>
        <div className="card big">
          <p>{index + 1} / {MOCK_NAMES.length}</p>
          <h2>{current.name}</h2>
          <p><strong>Origine:</strong> {current.origin}</p>
          <p>{current.meaning}</p>
          <div className="row">
            <button className="danger" onClick={() => vote("disliked")}>No</button>
            <button className="gold" onClick={() => vote("loved")}>Adoro</button>
            <button className="success" onClick={() => vote("liked")}>Mi piace</button>
          </div>
          <button onClick={() => setView("dashboard")}>Torna alla dashboard</button>
        </div>
        {message && <p className="message">{message}</p>}
      </div>
    );
  }

  return (
    <div className="container">
      <h1>Risultati di coppia</h1>
      <div className="card">
        <p><strong>Tu:</strong> {profile.name}</p>
        <p><strong>Partner:</strong> {partner ? partner.name : "non collegato"}</p>
        <p><strong>I tuoi preferiti:</strong> {[...(profile.liked || []), ...(profile.loved || [])].join(", ") || "nessuno"}</p>
        <p><strong>Match di coppia:</strong> {matches.length ? matches.join(", ") : "ancora nessun match"}</p>
        <button onClick={() => setView("dashboard")}>Torna alla dashboard</button>
      </div>
      {message && <p className="message">{message}</p>}
    </div>
  );
}
