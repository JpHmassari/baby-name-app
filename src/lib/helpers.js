export const LOCAL_PROFILE_KEY = "baby_names_profile_id";

export function generateCoupleCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export function normalizeProfile(row) {
  return {
    id: row.id,
    name: row.name,
    coupleCode: row.couple_code,
    partnerName: row.partner_name,
    liked: row.liked_names || [],
    loved: row.loved_names || [],
    disliked: row.disliked_names || []
  };
}

export const MOCK_NAMES = [
  { name: "Sofia", origin: "greco", meaning: "Sapienza e intelligenza." },
  { name: "Emma", origin: "germanico", meaning: "Universale, completa." },
  { name: "Giulia", origin: "latino", meaning: "Giovane e luminosa." },
  { name: "Bianca", origin: "italiano", meaning: "Chiara, pura, elegante." },
  { name: "Adele", origin: "germanico", meaning: "Nobile e gentile." },
  { name: "Nora", origin: "arabo", meaning: "Luce, splendore." },
  { name: "Mia", origin: "scandinavo", meaning: "Piccola e amata." },
  { name: "Anna", origin: "ebraico", meaning: "Grazia e benevolenza." },
  { name: "Lea", origin: "ebraico", meaning: "Delicata e armoniosa." },
  { name: "Vera", origin: "latino", meaning: "Vera, sincera, autentica." }
];