const MAX_SAMPLES = 500;
const apiTimings = [];
const trafficByDay = {};

export function recordApiTiming({ method, path, statusCode, durationMs }) {
  apiTimings.push({
    method,
    path,
    statusCode,
    durationMs,
    at: Date.now()
  });
  if (apiTimings.length > MAX_SAMPLES) apiTimings.shift();

  const day = new Date().toISOString().slice(0, 10);
  if (!trafficByDay[day]) trafficByDay[day] = { requests: 0, errors: 0, totalMs: 0 };
  trafficByDay[day].requests += 1;
  trafficByDay[day].totalMs += durationMs;
  if (statusCode >= 400) trafficByDay[day].errors += 1;
}

export function getMetricsSummary() {
  const recent = apiTimings.slice(-100);
  const avgMs = recent.length ? Math.round(recent.reduce((s, r) => s + r.durationMs, 0) / recent.length) : 0;
  const errorRate = recent.length
    ? Math.round((recent.filter((r) => r.statusCode >= 400).length / recent.length) * 100)
    : 0;

  const traffic = Object.entries(trafficByDay)
    .map(([date, v]) => ({
      date,
      requests: v.requests,
      errors: v.errors,
      avgMs: v.requests ? Math.round(v.totalMs / v.requests) : 0
    }))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-90);

  return { avgResponseMs: avgMs, errorRatePercent: errorRate, recentSamples: recent.length, traffic };
}
