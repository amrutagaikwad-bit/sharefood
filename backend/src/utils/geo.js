const EARTH_RADIUS_KM = 6371;

export function haversineDistanceKm(lat1, lon1, lat2, lon2) {
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

export function estimateWalk(distanceKm) {
  const paceKmPerHour = 4.8;
  const hours = distanceKm / paceKmPerHour;
  const minutes = Math.max(1, Math.round(hours * 60));
  return {
    walkingDistanceKm: Number(distanceKm.toFixed(2)),
    walkingTimeMinutes: minutes
  };
}

export function enrichWithDistance(donations, lat, lng) {
  return donations
    .map((d) => {
      const distanceKm = haversineDistanceKm(Number(lat), Number(lng), d.latitude, d.longitude);
      return { ...d, distanceKm, ...estimateWalk(distanceKm) };
    })
    .sort((a, b) => a.distanceKm - b.distanceKm);
}

function toRad(value) {
  return (value * Math.PI) / 180;
}
