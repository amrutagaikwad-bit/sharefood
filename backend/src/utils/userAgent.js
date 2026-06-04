export function parseUserAgent(ua = "") {
  const s = String(ua);
  let browser = "Unknown";
  if (s.includes("Chrome")) browser = "Chrome";
  else if (s.includes("Firefox")) browser = "Firefox";
  else if (s.includes("Safari")) browser = "Safari";
  else if (s.includes("Edge")) browser = "Edge";

  let device = "Desktop";
  if (/mobile|android|iphone/i.test(s)) device = "Mobile";
  else if (/ipad|tablet/i.test(s)) device = "Tablet";

  return { browser, device };
}
