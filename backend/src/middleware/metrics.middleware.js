import { recordApiTiming } from "../services/metrics.service.js";

export function metricsMiddleware(req, res, next) {
  const start = Date.now();
  res.on("finish", () => {
    if (!req.path.startsWith("/api")) return;
    recordApiTiming({
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      durationMs: Date.now() - start
    });
  });
  next();
}
