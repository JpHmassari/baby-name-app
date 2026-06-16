export default async function handler(req, res) {
  res.status(200).json({
    names: [
      { name: "Sofia", origin: "greco", meaning: "sapienza" },
      { name: "Emma", origin: "tedesco", meaning: "universale" }
    ]
  });
}