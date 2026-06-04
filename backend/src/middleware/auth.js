import jwt from "jsonwebtoken";
import { prisma } from "../config/prisma.js";
import { getJwtSecret } from "../config/env.js";

export async function authRequired(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ message: "Unauthorized" });

  try {
    const payload = jwt.verify(token, getJwtSecret());
    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user) return res.status(401).json({ message: "Unauthorized" });
    if (user.isBlocked) return res.status(403).json({ message: "Account suspended" });
    if (user.isBanned) return res.status(403).json({ message: "Account banned" });
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }
}

export function authOptional(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return next();

  jwt.verify(token, getJwtSecret(), async (err, payload) => {
    if (err || !payload) return next();
    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (user && !user.isBlocked) req.user = user;
    next();
  });
}

export function roleRequired(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }
    next();
  };
}
