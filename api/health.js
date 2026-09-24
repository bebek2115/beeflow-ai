export default function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  return res.status(200).json({
    ok: true,
    service: "BeeFlow API",
    version: "0.1.0",
    message: "BeeFlow backend działa 🚀"
  });
}
