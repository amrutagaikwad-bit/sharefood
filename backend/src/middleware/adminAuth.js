/** ADMIN and SUPER_ADMIN may access enterprise control panel APIs */
export function adminRequired(req, res, next) {
  if (!req.user || !["ADMIN", "SUPER_ADMIN"].includes(req.user.role)) {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
}

export function superAdminRequired(req, res, next) {
  if (!req.user || req.user.role !== "SUPER_ADMIN") {
    return res.status(403).json({ message: "Super Admin access required" });
  }
  next();
}
