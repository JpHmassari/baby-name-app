import React, { useMemo, useState } from "react";

const SAMPLE_NAMES = [
  { name: "Sofia", origin: "greco", meaning: "Saggezza e chiarezza interiore." },
  { name: "Emma", origin: "germanico", meaning: "Universale, completa, armoniosa." },
  { name: "Alice", origin: "germanico", meaning: "Nobile e luminosa." },
  { name: "Ginevra", origin: "celtico", meaning: "Spirito chiaro e delicato." },
  { name: "Bianca", origin: "italiano", meaning: "Purezza, semplicità, luce." },
  { name: "Adele", origin: "germanico", meaning: "Nobile, elegante, essenziale." },
  { name: "Vittoria", origin: "latino", meaning: "Forza e slancio positivo." },
  { name: "Nina", origin: "varie", meaning: "Breve, dolce, moderna." },
  { name: "Mia", origin: "scandinavo", meaning: "Essenziale e affettuosa." },
  { name: "Elena", origin: "greco", meaning: "Splendore, luce, grazia." }
];

export default function App() {
  const [name, setName] = useState("");
  const [profileCreated, setProfileCreated] = useState(false);
  const [coupleCode, setCoupleCode] = useState("");
  const [step, setStep] = useState("profile"); // profile | swipe | results
  const [names, setNames] = useState([]);
  const [index, setIndex] = useState(0);
  const [liked, setLiked] = useState([]);
  const [loved, setLoved] = useState([]);
  const [disliked, setDisliked] = useState([]);
  const [showMeaning, setShowMeaning] = useState(false);
  const [message, setMessage] = useState("");

  const current = names[index];

  function generateCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  function createProfile() {
    if (!name.trim()) {
      setMessage("Inserisci il tuo nome");
      return;
    }

    const code = generateCode();
    setCoupleCode(code);
    setProfileCreated(true);
    setMessage(`✅ Profilo creato! Codice coppia: ${code}`);
  }

  function startNames() {
    setNames(SAMPLE_NAMES);
    setIndex(0);
    setLiked([]);
    setLoved([]);
    setDisliked([]);
    setShowMeaning(false);
    setStep("swipe");
  }

  function vote(type) {
    if (!current) return;

    if (type === "yes") {
      setLiked((prev) => [...prev, current]);
    }
    if (type === "love") {
      setLoved((prev) => [...prev, current]);
      setLiked((prev) => [...prev, current]);
    }
    if (type === "no") {
      setDisliked((prev) => [...prev, current]);
    }

    setShowMeaning(false);

    if (index + 1 >= names.length) {
      setStep("results");
    } else {
      setIndex((prev) => prev + 1);
    }
  }

  const cleanLiked = useMemo(() => {
    const lovedNames = new Set(loved.map((n) => n.name));
    return liked.filter((n) => !lovedNames.has(n.name));
  }, [liked, loved]);

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>Il Nome Perfetto</h1>
        <p style={styles.subtitle}>Versione v3 — profilo + swipe + sì / no / adoro</p>

        {step === "profile" && (
          <div>
            <div style={styles.section}>
              <label style={styles.label}>Il tuo nome</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Es. Joseph"
                style={styles.input}
              />
              <button onClick={createProfile} style={styles.primaryButton}>
                Crea profilo
              </button>
              {message && <p style={styles.message}>{message}</p>}
            </div>

            {profileCreated && (
              <div style={styles.section}>
                <div style={styles.codeBox}>
                  <div style={styles.codeLabel}>Codice coppia</div>
                  <div style={styles.codeValue}>{coupleCode}</div>
                </div>
                <button onClick={startNames} style={styles.secondaryButton}>
                  Inizia a vedere i nomi
                </button>
              </div>
            )}
          </div>
        )}

        {step === "swipe" && current && (
          <div>
            <div style={styles.progressText}>
              Nome {index + 1} di {names.length}
            </div>

            <div style={styles.nameCard}>
              <div style={styles.origin}>{current.origin}</div>
              <div style={styles.name}>{current.name}</div>

              <button
                onClick={() => setShowMeaning((prev) => !prev)}
                style={styles.smallButton}
              >
                {showMeaning ? "Nascondi significato" : "Mostra significato"}
              </button>

              {showMeaning && <p style={styles.meaning}>{current.meaning}</p>}
            </div>

            <div style={styles.actions}>
              <button onClick={() => vote("no")} style={styles.noButton}>No</button>
              <button onClick={() => vote("love")} style={styles.loveButton}>Adoro</button>
              <button onClick={() => vote("yes")} style={styles.yesButton}>Sì</button>
            </div>
          </div>
        )}

        {step === "results" && (
          <div>
            <h2 style={styles.resultsTitle}>Risultati</h2>

            <div style={styles.resultSection}>
              <h3>★ Adoro</h3>
              <div style={styles.tagsWrap}>
                {loved.length ? loved.map((n) => <span key={n.name} style={styles.goldTag}>{n.name}</span>) : <span style={styles.muted}>Nessuno</span>}
              </div>
            </div>

            <div style={styles.resultSection}>
              <h3>❤ Mi piace</h3>
              <div style={styles.tagsWrap}>
                {cleanLiked.length ? cleanLiked.map((n) => <span key={n.name} style={styles.tag}>{n.name}</span>) : <span style={styles.muted}>Nessuno</span>}
              </div>
            </div>

            <div style={styles.resultSection}>
              <h3>✕ No</h3>
              <div style={styles.tagsWrap}>
                {disliked.length ? disliked.map((n) => <span key={n.name} style={styles.grayTag}>{n.name}</span>) : <span style={styles.muted}>Nessuno</span>}
              </div>
            </div>

            <button onClick={() => setStep("profile")} style={styles.secondaryButton}>
              Torna all'inizio
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(180deg, #f7f7fb 0%, #ececf6 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    fontFamily: "Arial, sans-serif"
  },
  card: {
    width: "100%",
    maxWidth: 640,
    background: "white",
    borderRadius: 20,
    padding: 24,
    boxShadow: "0 12px 40px rgba(0,0,0,0.08)"
  },
  title: { margin: 0, fontSize: 42 },
  subtitle: { color: "#666", marginTop: 8, marginBottom: 24 },
  section: { marginBottom: 20 },
  label: { display: "block", marginBottom: 8, fontWeight: 700 },
  input: {
    width: "100%",
    padding: 14,
    borderRadius: 12,
    border: "1px solid #ddd",
    fontSize: 16,
    marginBottom: 12
  },
  primaryButton: {
    background: "#111827",
    color: "white",
    border: "none",
    borderRadius: 12,
    padding: "12px 18px",
    cursor: "pointer",
    fontSize: 16
  },
  secondaryButton: {
    background: "#f06b8a",
    color: "white",
    border: "none",
    borderRadius: 12,
    padding: "12px 18px",
    cursor: "pointer",
    fontSize: 16,
    marginTop: 12
  },
  smallButton: {
    background: "transparent",
    border: "1px solid #f06b8a",
    color: "#f06b8a",
    borderRadius: 999,
    padding: "8px 12px",
    cursor: "pointer"
  },
  codeBox: {
    background: "#faf5f7",
    border: "1px solid #f3d4dd",
    borderRadius: 16,
    padding: 16
  },
  codeLabel: { color: "#666", fontSize: 14, marginBottom: 6 },
  codeValue: { fontSize: 28, fontWeight: 800, letterSpacing: 4 },
  message: { marginTop: 12, fontWeight: 700 },
  progressText: { color: "#666", marginBottom: 10 },
  nameCard: {
    background: "#fff7fa",
    border: "1px solid #f3d4dd",
    borderRadius: 20,
    padding: 24,
    textAlign: "center",
    marginBottom: 20
  },
  origin: { color: "#a04d66", textTransform: "uppercase", fontSize: 12, letterSpacing: 2 },
  name: { fontSize: 44, fontWeight: 800, margin: "10px 0 18px 0" },
  meaning: { color: "#444", lineHeight: 1.6, marginTop: 14 },
  actions: { display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" },
  noButton: {
    background: "#fee2e2",
    color: "#991b1b",
    border: "1px solid #fecaca",
    borderRadius: 12,
    padding: "12px 18px",
    cursor: "pointer",
    fontSize: 16
  },
  yesButton: {
    background: "#dcfce7",
    color: "#166534",
    border: "1px solid #bbf7d0",
    borderRadius: 12,
    padding: "12px 18px",
    cursor: "pointer",
    fontSize: 16
  },
  loveButton: {
    background: "#fef3c7",
    color: "#92400e",
    border: "1px solid #fde68a",
    borderRadius: 12,
    padding: "12px 18px",
    cursor: "pointer",
    fontSize: 16
  },
  resultsTitle: { marginTop: 0 },
  resultSection: { marginBottom: 18 },
  tagsWrap: { display: "flex", flexWrap: "wrap", gap: 8 },
  tag: {
    background: "#ffe4ec",
    border: "1px solid #ffc0d2",
    padding: "8px 12px",
    borderRadius: 999
  },
  goldTag: {
    background: "#fff3c4",
    border: "1px solid #ffe08a",
    padding: "8px 12px",
    borderRadius: 999
  },
  grayTag: {
    background: "#f3f4f6",
    border: "1px solid #e5e7eb",
    padding: "8px 12px",
    borderRadius: 999
  },
  muted: { color: "#777" }
};
