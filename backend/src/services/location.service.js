/** In-memory live GPS positions per booking room */
const locations = new Map();

function key(bookingId, userId) {
  return `${bookingId}:${userId}`;
}

export function updateLocation(bookingId, data) {
  const entry = {
    userId: Number(data.userId),
    role: data.role,
    name: data.name || "",
    latitude: Number(data.latitude),
    longitude: Number(data.longitude),
    timestamp: data.timestamp || Date.now()
  };
  locations.set(key(bookingId, data.userId), entry);
  return entry;
}

export function getBookingLocations(bookingId) {
  const prefix = `${bookingId}:`;
  return Array.from(locations.entries())
    .filter(([k]) => k.startsWith(prefix))
    .map(([, v]) => v);
}

export function removeLocation(bookingId, userId) {
  locations.delete(key(bookingId, userId));
}

export function clearBookingLocations(bookingId) {
  const prefix = `${bookingId}:`;
  for (const k of locations.keys()) {
    if (k.startsWith(prefix)) locations.delete(k);
  }
}
