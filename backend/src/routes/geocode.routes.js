import express from "express";

const router = express.Router();

router.get("/search", async (req, res) => {
  const { q } = req.query;
  if (!q || String(q).length < 2) {
    return res.status(400).json({ message: "Query must be at least 2 characters" });
  }

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(String(q))}&limit=8&addressdetails=1`;
    const response = await fetch(url, {
      headers: { "User-Agent": "FoodBridge/1.0 (food-donation-platform)" }
    });
    const data = await response.json();

    const results = data.map((item) => ({
      displayName: item.display_name,
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
      city: item.address?.city || item.address?.town || item.address?.village || "",
      state: item.address?.state || "",
      postalCode: item.address?.postcode || ""
    }));

    res.json(results);
  } catch {
    res.status(500).json({ message: "Geocoding search failed" });
  }
});

export default router;
