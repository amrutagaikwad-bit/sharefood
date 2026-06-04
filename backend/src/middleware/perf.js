const samples = [];
const MAX = 120;

export function perfMiddleware(req, res, next) {
  const start = Date.now();
  res.on("finish", () => {
    const ms = Date.now() - start;
    samples.push({ ms, path: req.path, method: req.method, status: res.statusCode, at: Date.now() });
    if (samples.length > MAX) samples.shift();
  });
  next();
}

export function getPerfStats() {
  if (!samples.length) return { avgMs: 0, p95Ms: 0, failed: 0, recent: [] };
  const sorted = [...samples].map((s) => s.ms).sort((a, b) => a - b);
  const failed = samples.filter((s) => s.status >= 400).length;
  const p95 = sorted[Math.floor(sorted.length * 0.95)] || 0;
  const avg = Math.round(sorted.reduce((a, b) => a + b, 0) / sorted.length);
  return {
    avgMs: avg,
    p95Ms: p95,
    failed,
    total: samples.length,
    recent: samples.slice(-20).reverse()
  };
}
