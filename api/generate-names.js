export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { keyword = "", myProfile = null, partnerProfile = null } = req.body || {};

    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(500).json({ error: "Manca ANTHROPIC_API_KEY su Vercel" });
    }

    let tasteNote = "";
    if (myProfile && ((myProfile.liked?.length || 0) > 0 || (myProfile.disliked?.length || 0) > 0)) {
      tasteNote += `\n\nPROFILO UTENTE (${myProfile.name}): graditi ${((myProfile.liked || []).slice(-20).join(", ")) || "nessuno"}. Non graditi ${((myProfile.disliked || []).slice(-20).join(", ")) || "nessuno"}.`;
    }
    if (partnerProfile && ((partnerProfile.liked?.length || 0) > 0 || (partnerProfile.disliked?.length || 0) > 0)) {
      tasteNote += `\n\nPROFILO PARTNER (${partnerProfile.name}): graditi ${((partnerProfile.liked || []).slice(-20).join(", ")) || "nessuno"}. Non graditi ${((partnerProfile.disliked || []).slice(-20).join(", ")) || "nessuno"}. Bilancia i gusti di entrambi.`;
    }

    const seenNames = [
      ...(myProfile?.liked || []),
      ...(myProfile?.loved || []),
      ...(myProfile?.disliked || []),
      ...(partnerProfile?.liked || []),
      ...(partnerProfile?.loved || []),
      ...(partnerProfile?.disliked || [])
    ];

    const exclusionNote = seenNames.length
      ? `\n\nNon riproporre questi nomi già visti: ${Array.from(new Set(seenNames)).join(", ")}.`
      : "";

    const keywordNote = keyword?.trim()
      ? `Filtro creativo aggiuntivo: "${keyword}".`
      : "";

    const prompt = `Genera esattamente 20 nomi femminili reali per una bambina. ${keywordNote}${tasteNote}${exclusionNote}

Rispondi SOLO con un array JSON valido, senza testo aggiuntivo, senza markdown.
Formato:
[{"name":"Nome","origin":"origine","meaning":"Significato breve in italiano, 1 frase."}]`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1200,
        messages: [{ role: "user", content: prompt }]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ error: "Anthropic request failed", details: errorText });
    }

    const data = await response.json();
    const text = (data.content || []).map((block) => block.text || "").join("").trim();
    const clean = text.replace(/```json|```/g, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(clean);
    } catch {
      return res.status(500).json({ error: "Il modello non ha restituito JSON valido", details: text });
    }

    if (!Array.isArray(parsed)) {
      return res.status(500).json({ error: "Formato risposta non valido" });
    }

    return res.status(200).json({ names: parsed });
  } catch (error) {
    return res.status(500).json({ error: "Server error", details: error?.message || "Unknown error" });
  }
}
