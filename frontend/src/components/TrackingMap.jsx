import { useEffect, useMemo } from "react";
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import { estimateEtaMinutes, formatDistance, haversineKm } from "../utils/geo";

const donorIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const receiverIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const pickupIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

function FitBounds({ points }) {
  const map = useMap();
  useEffect(() => {
    const valid = points.filter((p) => p?.[0] && p?.[1]);
    if (valid.length === 0) return;
    if (valid.length === 1) {
      map.setView(valid[0], 15, { animate: true });
      return;
    }
    map.fitBounds(L.latLngBounds(valid), { padding: [48, 48], animate: true, maxZoom: 16 });
  }, [points, map]);
  return null;
}

export default function TrackingMap({
  myPosition,
  peers = [],
  pickupLocation,
  myRole,
  myName
}) {
  const donorPeer = peers.find((p) => p.role === "DONOR");
  const receiverPeer = peers.find((p) => p.role === "RECEIVER");

  const donorPos = myRole === "DONOR" && myPosition
    ? [myPosition.lat, myPosition.lng]
    : donorPeer
      ? [donorPeer.lat, donorPeer.lng]
      : null;

  const receiverPos = myRole === "RECEIVER" && myPosition
    ? [myPosition.lat, myPosition.lng]
    : receiverPeer
      ? [receiverPeer.lat, receiverPeer.lng]
      : null;

  const pickupPos = pickupLocation ? [pickupLocation.lat, pickupLocation.lng] : null;

  const routeLine = useMemo(() => {
    if (receiverPos && pickupPos) return [receiverPos, pickupPos];
    if (donorPos && receiverPos) return [donorPos, receiverPos];
    return [];
  }, [donorPos, receiverPos, pickupPos]);

  const distanceKm = receiverPos && pickupPos
    ? haversineKm(receiverPos[0], receiverPos[1], pickupPos[0], pickupPos[1])
    : donorPos && receiverPos
      ? haversineKm(donorPos[0], donorPos[1], receiverPos[0], receiverPos[1])
      : 0;

  const etaMin = estimateEtaMinutes(distanceKm);

  const allPoints = [donorPos, receiverPos, pickupPos].filter(Boolean);
  const center = allPoints[0] || [20.5937, 78.9629];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-4 rounded-xl bg-white/80 p-3 text-sm shadow dark:bg-slate-800/80">
        <div>
          <span className="text-slate-500">Distance remaining</span>
          <p className="text-lg font-bold text-primary">{formatDistance(distanceKm)}</p>
        </div>
        <div>
          <span className="text-slate-500">Est. arrival</span>
          <p className="text-lg font-bold text-primary">{etaMin ? `~${etaMin} min` : "—"}</p>
        </div>
        <div>
          <span className="text-slate-500">You</span>
          <p className="font-medium">{myName} ({myRole})</p>
        </div>
      </div>

      <MapContainer center={center} zoom={14} className="h-[420px] w-full rounded-2xl shadow-lg">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds points={allPoints} />

        {donorPos && (
          <Marker position={donorPos} icon={donorIcon}>
            <Popup>Donor {donorPeer?.name ? `— ${donorPeer.name}` : ""}</Popup>
          </Marker>
        )}
        {receiverPos && (
          <Marker position={receiverPos} icon={receiverIcon}>
            <Popup>Receiver {receiverPeer?.name ? `— ${receiverPeer.name}` : ""}</Popup>
          </Marker>
        )}
        {pickupPos && (
          <Marker position={pickupPos} icon={pickupIcon}>
            <Popup>Pickup location</Popup>
          </Marker>
        )}
        {routeLine.length === 2 && (
          <Polyline positions={routeLine} pathOptions={{ color: "#2E7D32", weight: 4, dashArray: "8 8" }} />
        )}
      </MapContainer>
    </div>
  );
}
