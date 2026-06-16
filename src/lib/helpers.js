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

export function dedupeStrings(items) {
  return Array.from(new Set(items.filter(Boolean)));
}
